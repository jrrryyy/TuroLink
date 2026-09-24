const nodemailer = require('nodemailer');
const User = require('../models/User');
const { random, hash } = require('./authSecurity');
function assertMailConfigured() {
  if (!process.env.SMTP_HOST || !process.env.MAIL_FROM || !process.env.CLIENT_URL) {
    const error = new Error('Email verification is not configured. Please contact the administrator.');
    error.status = 503;
    throw error;
  }
}
async function sendVerification(user) {
  assertMailConfigured();
  const token = random();
  const updated = await User.findOneAndUpdate({ _id: user._id, emailVerifiedAt: null, $or: [{ verificationSentAt: null }, { verificationSentAt: { $lt: new Date(Date.now() - 60000) } }] }, {
    $set: { verificationHash: hash(token), verificationExpiresAt: new Date(Date.now() + 3600000), verificationSentAt: new Date() },
  });
  if (!updated) return;
  const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000, ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } } : {}) });
  const link = `${process.env.CLIENT_URL.replace(/\/$/, '')}/verify-email#token=${token}`;
  try {
    await transport.sendMail({ from: process.env.MAIL_FROM, to: user.email, subject: 'Verify your TuroLink email', text: `Confirm your TuroLink registration using this link (expires in 1 hour):\n${link}\nIf you did not request this account, do not open the link.` });
  } catch {
    await User.updateOne({ _id: user._id, verificationHash: hash(token) }, { $unset: { verificationHash: 1, verificationExpiresAt: 1, verificationSentAt: 1 } });
    const error = new Error('We could not send your verification email. Please use Resend verification email to try again.');
    error.status = 503;
    throw error;
  }
}
module.exports = { sendVerification, assertMailConfigured };
