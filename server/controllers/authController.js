const { publicUser } = require('./accountController');
const User = require('../models/User');
const TeacherProfile = require('../models/TeacherProfile');
const Session = require('../models/AuthSession');
const bcrypt = require('bcryptjs');
const { cookie, hash, cookieOptions, startSession } = require('../services/authSecurity');
const { sendVerification, assertMailConfigured } = require('../services/verificationEmail');
async function createAccount(req, res, role = 'student', google) {
  let user;
  let profileComplete = false;
  try {
    assertMailConfigured();
    const { normalizeEmail, normalizePhone } = await import('../../shared/validation.mjs');
    const email = normalizeEmail(google?.email || req.body.email);
    const phone = normalizePhone(req.body.phone);
    if (await User.exists({ email })) return res.status(409).json({ message: 'This email already has an account. Sign in or resend verification.', errors: { email: 'This email already has an account.' } });
    if (await User.exists({ phone })) return res.status(409).json({ message: 'This mobile number is already registered.', errors: { phone: 'Use a different mobile number.' } });
    user = await User.create({ name: req.body.name.trim(), email, phone, role, ...(google ? { googleSub: google.sub } : { password: await bcrypt.hash(req.body.password, 12) }) });
    if (role === 'teacher') await TeacherProfile.create({ user: user._id, degreeTitle: req.body.degreeTitle, subjectToTeach: req.body.subjectToTeach, teachingBio: req.body.teachingBio, verificationDocument: req.file ? `/uploads/${req.file.filename}` : '', subjects: [{ name: req.body.subjectToTeach }] });
    profileComplete = true;
    await sendVerification(user);
    return res.status(201).json({ verificationRequired: true, email, message: 'Check your email to activate your account. The link expires in 1 hour.' });
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
    await startSession(req, res, user);
    res.json({ user: publicUser(user) });
  } catch { res.status(500).json({ message: 'Unable to sign in. Please try again.' }); }
}
async function verifyEmail(req, res) {
  const token = req.body.token;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ message: 'This verification link is invalid.' });
  const user = await User.findOneAndUpdate({ verificationHash: hash(token), verificationExpiresAt: { $gt: new Date() }, emailVerifiedAt: null }, { $set: { emailVerifiedAt: new Date() }, $unset: { verificationHash: 1, verificationExpiresAt: 1, verificationSentAt: 1 } });
  if (!user) return res.status(400).json({ message: 'This link has expired or has already been used. Sign in if verified, or request a new link.' });
  res.json({ message: 'Email verified. You can now sign in.' });
}
async function resend(req, res) {
  const { normalizeEmail } = await import('../../shared/validation.mjs');
  try {
    assertMailConfigured();
    const user = await User.findOne({ email: normalizeEmail(req.body.email), emailVerifiedAt: null });
    if (user) await sendVerification(user);
    res.json({ message: 'If this email has an unverified account, a link has been sent. Check spam too. Please wait 60 seconds before requesting another.' });
  } catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to send verification email.' }); }
}
async function logout(req, res) {
  const token = cookie(req, 'turolink_session');
  if (token) await Session.deleteOne({ tokenHash: hash(token) });
  res.clearCookie('turolink_session', cookieOptions());
  res.json({ message: 'Signed out.' });
}
const getMe = (req, res) => res.json(publicUser(req.user));
module.exports = { register, createAccount, login, getMe, verifyEmail, resend, logout };
