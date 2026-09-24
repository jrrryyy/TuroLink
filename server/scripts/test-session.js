// Integration fixtures only: this module is never imported by the application.
const mongoose = require('mongoose');
const Session = require('../models/AuthSession');
const { random, hash } = require('../services/authSecurity');
const sessions = new Map();
async function token(user) {
  if (mongoose.connection.name !== 'turolink_integration_checks') throw new Error('Test sessions require the isolated integration database.');
  const id = String(user._id);
  if (!sessions.has(id)) {
    const value = random();
    await Session.create({ tokenHash: hash(value), user: user._id, expiresAt: new Date(Date.now() + 3600000) });
    sessions.set(id, value);
  }
  return sessions.get(id);
}
async function browserCookie(context, user) {
  await context.addCookies([{ name: 'turolink_session', value: await token(user), url: 'http://localhost:5000', httpOnly: true, sameSite: 'Lax' }]);
}
async function cleanup(users) {
  await Session.deleteMany({ user: { $in: users.map(u => u._id) } });
  await require('../models/Notification').deleteMany({ recipient: { $in: users.map(u => u._id) } });
}
module.exports = { token, browserCookie, cleanup };
