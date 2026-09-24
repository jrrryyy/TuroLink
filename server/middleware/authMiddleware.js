const Session = require('../models/AuthSession');
const { cookie, hash } = require('../services/authSecurity');
const protect = async (req, res, next) => {
  try {
    const token = cookie(req, 'turolink_session');
    const session = token && await Session.findOne({ tokenHash: hash(token), expiresAt: { $gt: new Date() } }).populate('user');
    if (!session?.user) return res.status(401).json({ message: 'Please log in again.' });
    if (!session.user.emailVerifiedAt) return res.status(403).json({ code: 'EMAIL_UNVERIFIED', message: 'Verify your email before signing in.' });
    req.user = session.user;
    req.authSession = session;
    next();
  } catch { res.status(503).json({ message: 'Unable to verify your session. Please try again.' }); }
};
const requireStudent = (req, res, next) => req.user.role === 'student' ? next() : res.status(403).json({ message: 'Student access only.' });
module.exports = { protect, requireStudent };
