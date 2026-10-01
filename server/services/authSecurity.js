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

async function startSession(req, res, user, rememberMe = false) {
  const old = cookie(req, 'turolink_session');
  if (old) await Session.deleteOne({ tokenHash: hash(old) });
  const token = random();
  const duration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  await Session.create({ tokenHash: hash(token), user: user._id, expiresAt: new Date(Date.now() + duration) });
  res.cookie('turolink_session', token, { ...cookieOptions(), maxAge: duration });
}

function isAllowedOrigin(rawOrigin) {
  if (!rawOrigin || typeof rawOrigin !== 'string') return false;
  try {
    const parsed = new URL(rawOrigin);
    const origin = parsed.origin;
    const clientUrl = (process.env.CLIENT_URL || '').trim().replace(/\/+$/, '');
    const allowed = (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map(o => o.trim().replace(/\/+$/, ''))
      .filter(Boolean);

    if (clientUrl && origin === clientUrl) return true;
    if (allowed.includes(origin)) return true;
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') return true;
    if (parsed.hostname === 'vercel.app' || parsed.hostname.endsWith('.vercel.app')) return true;

    return false;
  } catch {
    const clean = rawOrigin.trim().replace(/\/+$/, '');
    const clientUrl = (process.env.CLIENT_URL || '').trim().replace(/\/+$/, '');
    return Boolean(clientUrl && clean === clientUrl) || clean.includes('localhost') || clean.includes('127.0.0.1');
  }
}

function getClientUrl(req) {
  if (req && typeof req.get === 'function') {
    const origin = req.get('Origin');
    if (origin && isAllowedOrigin(origin)) {
      try {
        return new URL(origin).origin;
      } catch {
        return origin.trim().replace(/\/+$/, '');
      }
    }
    const referer = req.get('Referer');
    if (referer) {
      try {
        const refUrl = new URL(referer);
        if (isAllowedOrigin(refUrl.origin)) {
          return refUrl.origin;
        }
      } catch {}
    }
  }
  return (process.env.CLIENT_URL || 'http://localhost:5173').trim().replace(/\/+$/, '');
}

function csrf(req, res, next) {
  res.set('Cache-Control', 'no-store');
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const origin = req.get('Origin');
  if (!origin) return next();

  if (!isAllowedOrigin(origin) || req.get('X-TuroLink-Request') !== '1') {
    return res.status(403).json({ message: 'Request origin could not be verified. Reload the page and try again.' });
  }
  next();
}

const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Too many attempts. Please try again in 15 minutes.' } });
module.exports = { hash, random, cookie, cookieOptions, startSession, csrf, authLimit, isAllowedOrigin, getClientUrl };
