const { publicUser } = require('./accountController');
const User = require('../models/User');
const TeacherProfile = require('../models/TeacherProfile');
const Session = require('../models/AuthSession');
const bcrypt = require('bcryptjs');
const { cookie, hash, cookieOptions, startSession } = require('../services/authSecurity');
const { sendVerification, assertMailConfigured } = require('../services/verificationEmail');
const { sendPasswordReset } = require('../services/passwordResetEmail');
const { loadValidators } = require('../config/validators');

const { uploadFile } = require('../services/cloudStorage');

async function createAccount(req, res, role = 'student', google) {
  let user;
  let profileComplete = false;
  try {
    assertMailConfigured();
    const { normalizeEmail, normalizePhone } = await loadValidators();
    const email = normalizeEmail(google?.email || req.body.email);
    const phone = normalizePhone(req.body.phone);
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.emailVerifiedAt) {
        return res.status(409).json({
          code: 'ALREADY_VERIFIED',
          message: 'Your account is already verified. Please log in.',
          errors: { email: 'Your account is already verified. Please log in.' }
        });
      }
      return res.status(409).json({
        message: 'This email already has an account. Sign in or resend verification.',
        errors: { email: 'This email already has an account.' }
      });
    }
    if (await User.exists({ phone })) return res.status(409).json({ message: 'This mobile number is already registered.', errors: { phone: 'Use a different mobile number.' } });
    user = await User.create({ name: req.body.name.trim(), email, phone, role, ...(google ? { googleSub: google.sub } : { password: await bcrypt.hash(req.body.password, 12) }) });
    let verificationDocument = '';
    if (role === 'teacher' && req.file) {
      const uploadResult = await uploadFile(req.file.buffer, {
        folder: 'documents',
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        resourceType: req.file.mimetype?.startsWith('image/') ? 'image' : 'raw',
      });
      verificationDocument = uploadResult.url;
    }
    if (role === 'teacher') await TeacherProfile.create({ user: user._id, degreeTitle: req.body.degreeTitle, subjectToTeach: req.body.subjectToTeach, teachingBio: req.body.teachingBio, verificationDocument, subjects: [{ name: req.body.subjectToTeach }] });
    profileComplete = true;
    await sendVerification(user, req);
    return res.status(201).json({ verificationRequired: true, email, expiresAt: Date.now() + 180000, expiresIn: 180, message: 'Check your email to activate your account. The link expires in 3 minutes.' });
  } catch (error) {
    if (user && !profileComplete) { await TeacherProfile.deleteOne({ user: user._id }); await User.deleteOne({ _id: user._id }); }
    if (user && profileComplete && error.status === 503) return res.status(202).json({ verificationRequired: true, emailDeliveryFailed: true, email: user.email, message: error.message });
    if (error.code === 11000) {
      const field = error.keyPattern?.phoneKey || error.keyPattern?.phone ? 'phone' : 'email';
      const message = field === 'phone' ? 'This mobile number is already registered.' : 'This email already has an account. Sign in or resend verification.';
      return res.status(409).json({ message, errors: { [field]: message } });
    }
    return res.status(error.status || 500).json({ verificationRequired: Boolean(user && profileComplete), message: error.status ? error.message : 'Unable to create your account. Please try again.' });
  }
}
const register = (req, res) => createAccount(req, res);
async function login(req, res) {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user?.password || !await bcrypt.compare(req.body.password, user.password)) return res.status(401).json({ message: 'Invalid email or password.' });
    if (!user.emailVerifiedAt) return res.status(403).json({ code: 'EMAIL_UNVERIFIED', message: 'Verify your email before signing in. Request a verification link below.' });
    await startSession(req, res, user, Boolean(req.body.rememberMe));
    res.json({ user: publicUser(user) });
  } catch { res.status(500).json({ message: 'Unable to sign in. Please try again.' }); }
}
async function verifyEmail(req, res) {
  const token = req.body.token;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ message: 'This verification link is invalid.' });
  const tokenHash = hash(token);
  const expiredUser = await User.findOne({
    verificationHash: tokenHash,
    emailVerifiedAt: null,
    verificationExpiresAt: { $lte: new Date() },
  });
  if (expiredUser) {
    return res.status(400).json({
      code: 'TOKEN_EXPIRED',
      message: 'This verification link has expired (links are valid for 3 minutes). Please request a new verification email.',
    });
  }
  const user = await User.findOneAndUpdate({ verificationHash: tokenHash, verificationExpiresAt: { $gt: new Date() }, emailVerifiedAt: null }, { $set: { emailVerifiedAt: new Date() }, $unset: { verificationHash: 1, verificationExpiresAt: 1, verificationSentAt: 1 } });
  if (!user) {
    return res.status(400).json({
      code: 'ALREADY_VERIFIED',
      message: 'Your account is already verified. Please log in.',
    });
  }
  res.json({ message: 'Email verified. You can now sign in.' });
}
async function resend(req, res) {
  const { normalizeEmail } = await loadValidators();
  try {
    assertMailConfigured();
    const user = await User.findOne({ email: normalizeEmail(req.body.email), emailVerifiedAt: null });
    if (user) await sendVerification(user, req);
    res.json({
      message: 'If this email has an unverified account, a link has been sent. Check spam too. Please wait 60 seconds before requesting another.',
      expiresAt: Date.now() + 180000,
      expiresIn: 180,
    });
  } catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to send verification email.' }); }
}
async function logout(req, res) {
  const token = cookie(req, 'turolink_session');
  if (token) await Session.deleteOne({ tokenHash: hash(token) });
  res.clearCookie('turolink_session', cookieOptions());
  res.json({ message: 'Signed out.' });
}
const getMe = (req, res) => res.json(publicUser(req.user));

async function forgotPassword(req, res) {
  const { normalizeEmail } = await loadValidators();
  try {
    const email = normalizeEmail(req.body.email || '');
    if (!email) return res.status(400).json({ message: 'Email address is required.' });
    const user = await User.findOne({ email });
    if (user && user.emailVerifiedAt) {
      await sendPasswordReset(user, req);
    }
    res.json({
      message: 'If an account exists with this email, a password reset link has been sent. Check spam too. The link expires in 1 hour.',
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to send password reset email. Please try again.' });
  }
}

async function resetPassword(req, res) {
  const { token, password, confirmPassword } = req.body || {};
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    return res.status(400).json({ message: 'This password reset link is invalid or malformed.' });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match.' });
  }

  try {
    const user = await User.findOne({
      resetPasswordHash: hash(token),
      resetPasswordExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'This password reset link has expired or has already been used. Please request a new one.' });
    }

    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordHash = undefined;
    user.resetPasswordExpiresAt = undefined;
    user.resetPasswordSentAt = undefined;
    await user.save();

    // Revoke all existing sessions for security
    await Session.deleteMany({ user: user._id });

    res.json({ message: 'Your password has been reset successfully. You can now log in with your new password.' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Unable to reset your password. Please try again.' });
  }
}

module.exports = { register, createAccount, login, getMe, verifyEmail, resend, logout, forgotPassword, resetPassword };
