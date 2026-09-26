const crypto = require('node:crypto');
const Session = require('../models/AuthSession');
const { rateLimit } = require('express-rate-limit');
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const random = () => crypto.randomBytes(32).toString('hex');

const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/',
});

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

  const origin = req.get('Origin');
  if (!origin) return next();

  const cleanOrigin = origin.replace(/\/+$/, '');
  const cleanClient = (process.env.CLIENT_URL || '').replace(/\/+$/, '');

  const isAllowed =
    !isProduction ||
    cleanOrigin === cleanClient ||
    cleanOrigin.endsWith('.vercel.app') ||
    cleanOrigin.includes('localhost') ||
    cleanOrigin.includes('127.0.0.1');

  if (!isAllowed || req.get('X-TuroLink-Request') !== '1') {
    return res.status(403).json({ message: 'Request origin could not be verified. Reload the page and try again.' });
  }
  next();
}

const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Too many attempts. Please try again in 15 minutes.' } });
module.exports = { hash, random, cookie, cookieOptions, startSession, csrf, authLimit };
