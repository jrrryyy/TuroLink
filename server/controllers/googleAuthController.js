const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Challenge = require('../models/AuthChallenge');
const bcrypt = require('bcryptjs');
const { random, hash, cookie, cookieOptions, startSession } = require('../services/authSecurity');
const { publicUser } = require('./accountController');
const { createAccount } = require('./authController');
const { loadValidators } = require('../config/validators');
async function challenge(res, kind, data) {
  const token = random();
  await Challenge.create({ tokenHash: hash(token), kind, data, expiresAt: new Date(Date.now() + 600000) });
  res.cookie(`turolink_${kind}`, token, { ...cookieOptions(), maxAge: 600000 });
  return token;
}
async function findChallenge(req, kind, consume = false) {
  const token = cookie(req, `turolink_${kind}`);
  if (!token) return null;
  const query = { tokenHash: hash(token), kind, expiresAt: { $gt: new Date() } };
  return consume ? Challenge.findOneAndDelete(query) : Challenge.findOne(query);
}
async function config(req, res) {
  if (!process.env.GOOGLE_CLIENT_ID) return res.json({ enabled: false });
  const nonce = await challenge(res, 'google_nonce', {});
  res.json({ enabled: true, clientId: process.env.GOOGLE_CLIENT_ID, nonce });
}
async function authenticate(req, res) {
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ message: 'Google sign-in is not configured yet.' });
  const pending = await findChallenge(req, 'google_nonce', true);
  if (!pending) return res.status(401).json({ message: 'Google sign-in expired. Reload and try again.' });
  let identity;
  try {
    if (typeof req.body.credential !== 'string' || req.body.credential.length > 10000) throw new Error();
    const ticket = await new OAuth2Client().verifyIdToken({ idToken: req.body.credential, audience: process.env.GOOGLE_CLIENT_ID });
    identity = ticket.getPayload();
    if (!identity?.sub || !identity.email || identity.email_verified !== true || typeof identity.nonce !== 'string' || hash(identity.nonce) !== pending.tokenHash) throw new Error();
  } catch { return res.status(401).json({ message: 'Google authentication failed. Reload and try again.' }); }
  const user = await User.findOne({ googleSub: identity.sub });
  if (user) {
    if (!user.emailVerifiedAt) return res.status(403).json({ code: 'EMAIL_UNVERIFIED', email: user.email, message: 'Verify your TuroLink email before signing in.' });
    await startSession(req, res, user);
    return res.json({ user: publicUser(user) });
  }
  const email = identity.email.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    await challenge(res, 'google_profile', { sub: identity.sub, email, name: existing.name, existingId: String(existing._id) });
    return res.json({ needsProfile: true, linkRequired: true });
  }
  await challenge(res, 'google_profile', { sub: identity.sub, email, name: identity.name || '' });
  res.json({ needsProfile: true });
}
async function profile(req, res) {
  const pending = await findChallenge(req, 'google_profile');
  if (!pending) return res.status(401).json({ message: 'Google sign-in expired. Please start again.' });
  res.json({ name: pending.data.name, email: pending.data.email, linkRequired: Boolean(pending.data.existingId) });
}
async function complete(req, res) {
  const pending = await findChallenge(req, 'google_profile');
  if (!pending) return res.status(401).json({ message: 'Google sign-in expired. Please start again.' });
  if (pending.data.existingId) {
    const user = await User.findById(pending.data.existingId);
    if (typeof req.body.password !== 'string' || !user?.password || !await bcrypt.compare(req.body.password, user.password)) return res.status(401).json({ message: 'Enter your existing TuroLink password to link this account.' });
    if (!user.emailVerifiedAt) return res.status(403).json({ code: 'EMAIL_UNVERIFIED', email: user.email, message: 'Verify your existing account before linking Google.' });
    if (!await findChallenge(req, 'google_profile', true)) return res.status(409).json({ message: 'This request was already used. Start Google sign-in again.' });
    const linked = await User.findOneAndUpdate({ _id: user._id, password: user.password, $or: [{ googleSub: { $exists: false } }, { googleSub: pending.data.sub }] }, { $set: { googleSub: pending.data.sub } }, { returnDocument: 'after' });
    if (!linked) return res.status(409).json({ message: 'Account changed. Please sign in again.' });
    await startSession(req, res, linked);
    return res.json({ user: publicUser(linked) });
  }
  const { validateRegistration } = await loadValidators();
  const role = req.body.role === 'teacher' ? 'teacher' : 'student';
  const placeholder = random();
  const errors = validateRegistration({ ...req.body, email: pending.data.email, password: placeholder, confirmPassword: placeholder }, { teacher: role === 'teacher' });
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });
  // The unique email/google indexes also prevent concurrent profile submissions.
  await createAccount(req, res, role, pending.data);
  if ([201, 202].includes(res.statusCode)) { await Challenge.deleteOne({ _id: pending._id }); }
}
module.exports = { config, authenticate, profile, complete };
