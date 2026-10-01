const nodemailer = require('nodemailer');
const User = require('../models/User');
const { random, hash, getClientUrl } = require('./authSecurity');
const { assertMailConfigured } = require('./verificationEmail');

async function sendPasswordReset(user, req) {
  assertMailConfigured();
  const token = random();
  const updated = await User.findOneAndUpdate(
    {
      _id: user._id,
      $or: [
        { resetPasswordSentAt: null },
        { resetPasswordSentAt: { $lt: new Date(Date.now() - 60000) } },
      ],
    },
    {
      $set: {
        resetPasswordHash: hash(token),
        resetPasswordExpiresAt: new Date(Date.now() + 3600000), // 1 hour
        resetPasswordSentAt: new Date(),
      },
    }
  );
  if (!updated) return null;

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } } : {}) || {},
  });

  const baseUrl = getClientUrl(req);
  const link = `${baseUrl}/reset-password#token=${token}`;

  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM,
      to: user.email,
      subject: 'Reset your TuroLink password',
      text: `We received a request to reset your TuroLink account password.\n\nClick the link below to set a new password (expires in 1 hour):\n${link}\n\nIf you did not request this password reset, please ignore this email. Your account remains secure.`,
    });
    return token;
  } catch (err) {
    await User.updateOne(
      { _id: user._id, resetPasswordHash: hash(token) },
      { $unset: { resetPasswordHash: 1, resetPasswordExpiresAt: 1, resetPasswordSentAt: 1 } }
    );
    const error = new Error('We could not send your password reset email. Please try again later.');
    error.status = 503;
    throw error;
  }
}

module.exports = { sendPasswordReset };
