const crypto = require('node:crypto');
const Session = require('../models/AuthSession');
const { rateLimit } = require('express-rate-limit');
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const random = () => crypto.randomBytes(32).toString('hex');
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
function cookie(req, name) {
  const part = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`));
  return part ? part.slice(name.length + 1) : '';
}
async function startSession(req, res, user) {
  const old = cookie(req, 'turolink_session');
  if (old) await Session.deleteOne({ tokenHash: hash(old) });
  const token = random();
  const duration = 7 * 24 * 60 * 60 * 1000;
  await Session.create({ tokenHash: hash(token), user: user._id, expiresAt: new Date(Date.now() + duration) });
  res.cookie('turolink_session', token, { ...cookieOptions(), maxAge: duration });
}
function csrf(req, res, next) {
  res.set('Cache-Control', 'no-store');
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const allowed = [process.env.CLIENT_URL || 'http://localhost:5173'];
  if (process.env.NODE_ENV !== 'production') allowed.push('http://localhost:5173', 'http://127.0.0.1:5173');
  if (!allowed.includes(req.get('Origin')) || req.get('X-TuroLink-Request') !== '1') return res.status(403).json({ message: 'Request origin could not be verified. Reload the page and try again.' });
  next();
}
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Too many attempts. Please try again in 15 minutes.' } });
module.exports = { hash, random, cookie, cookieOptions, startSession, csrf, authLimit };
