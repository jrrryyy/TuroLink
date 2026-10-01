require('dotenv').config();
const assert = require('node:assert/strict');
const connectDB = require('../config/db');
const User = require('../models/User');
const Session = require('../models/AuthSession');
const app = require('../app');
const http = require('http');
const bcrypt = require('bcryptjs');

// Mock nodemailer
const sentEmails = [];
require('nodemailer').createTransport = () => ({
  sendMail: async (mail) => {
    sentEmails.push(mail);
  },
});

async function testPasswordReset() {
  await connectDB();
  console.log('Testing Remember Me and Password Reset functionalities...');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const request = async (path, options = {}) => {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-TuroLink-Request': '1',
        Origin: process.env.CLIENT_URL || 'http://localhost:5173',
        ...(options.headers || {}),
      },
    });
    const setCookie = res.headers.get('set-cookie');
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, data, setCookie, headers: res.headers };
  };

  // 1. Create a dedicated test user
  const testEmail = `reset-test-${Date.now()}@example.invalid`;
  const initialPassword = 'InitialSecret123!';
  const newPassword = 'BrandNewSecret456!';

  const user = await User.create({
    name: 'Reset Test User',
    email: testEmail,
    phone: '09' + require('crypto').randomInt(1000000000).toString().padStart(9, '0'),
    password: await bcrypt.hash(initialPassword, 12),
    emailVerifiedAt: new Date(),
    role: 'student',
  });

  console.log(`✔ Created verified test user: ${testEmail}`);

  // 2. Test Remember Me in Login
  console.log('2. Testing Login with rememberMe = true (30-day session)...');
  const loginRememberRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      password: initialPassword,
      rememberMe: true,
    }),
  });

  assert.equal(loginRememberRes.status, 200);
  assert.ok(loginRememberRes.setCookie, 'Should set session cookie');
  assert.ok(loginRememberRes.setCookie.includes('Max-Age=2592000'), 'Max-Age should be 30 days (2592000s)');
  console.log('✔ Session correctly configured with 30-day lifetime when rememberMe is true.');

  console.log('3. Testing Login with rememberMe = false (7-day session)...');
  const loginStandardRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      password: initialPassword,
      rememberMe: false,
    }),
  });

  assert.equal(loginStandardRes.status, 200);
  assert.ok(loginStandardRes.setCookie.includes('Max-Age=604800'), 'Max-Age should be 7 days (604800s)');
  console.log('✔ Session correctly configured with standard lifetime when rememberMe is false.');

  // 4. Test Forgot Password Request
  console.log('4. Testing /auth/forgot-password...');
  sentEmails.length = 0;
  const forgotRes = await request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: testEmail }),
  });

  assert.equal(forgotRes.status, 200);
  assert.ok(forgotRes.data.message.includes('password reset link has been sent'));
  assert.equal(sentEmails.length, 1, 'Should dispatch 1 password reset email');
  assert.equal(sentEmails[0].to, testEmail);

  const resetMatch = sentEmails[0].text.match(/token=([a-f0-9]{64})/);
  assert.ok(resetMatch, 'Email should contain a 64-character reset token');
  const resetToken = resetMatch[1];
  console.log('✔ Forgot password email successfully generated with secure token.');

  // Verify DB state
  const userAfterForgot = await User.findById(user._id).select('+resetPasswordHash +resetPasswordExpiresAt');
  assert.ok(userAfterForgot.resetPasswordHash, 'User should have resetPasswordHash');
  assert.ok(userAfterForgot.resetPasswordExpiresAt > new Date(), 'Expiry should be in the future');

  // 5. Test Invalid Token Rejection
  console.log('5. Testing Reset Password with invalid token...');
  const badResetRes = await request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      token: '0000000000000000000000000000000000000000000000000000000000000000',
      password: newPassword,
      confirmPassword: newPassword,
    }),
  });
  assert.equal(badResetRes.status, 400);
  console.log('✔ Invalid token correctly rejected with 400 Bad Request.');

  // 6. Test Password Mismatch Rejection
  console.log('6. Testing Reset Password with password mismatch...');
  const mismatchRes = await request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      token: resetToken,
      password: newPassword,
      confirmPassword: 'DifferentPassword!',
    }),
  });
  assert.equal(mismatchRes.status, 400);
  assert.ok(mismatchRes.data.message.includes('do not match'));
  console.log('✔ Password mismatch correctly rejected with 400 Bad Request.');

  // 7. Test Successful Password Reset
  console.log('7. Testing successful password reset...');
  const goodResetRes = await request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      token: resetToken,
      password: newPassword,
      confirmPassword: newPassword,
    }),
  });
  assert.equal(goodResetRes.status, 200);
  assert.ok(goodResetRes.data.message.includes('successfully'));

  // Verify DB wiped reset fields
  const userAfterReset = await User.findById(user._id).select('+resetPasswordHash');
  assert.equal(userAfterReset.resetPasswordHash, undefined, 'resetPasswordHash should be cleared');
  console.log('✔ Password successfully reset and tokens wiped from database.');

  // 8. Test Old Password Rejected
  console.log('8. Testing Login with old password (must fail)...');
  const oldLoginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      password: initialPassword,
    }),
  });
  assert.equal(oldLoginRes.status, 401);
  console.log('✔ Old password correctly rejected.');

  // 9. Test New Password Succeeded
  console.log('9. Testing Login with new password (must succeed)...');
  const newLoginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      password: newPassword,
    }),
  });
  assert.equal(newLoginRes.status, 200);
  assert.equal(newLoginRes.data.user.email, testEmail);
  console.log('✔ New password login succeeded.');

  // Clean up test user
  await Session.deleteMany({ user: user._id });
  await User.findByIdAndDelete(user._id);

  server.close();
  console.log('----------------------------------------------------');
  console.log('ALL REMEMBER ME & PASSWORD RESET TESTS PASSED!');
  console.log('----------------------------------------------------');
  process.exit(0);
}

testPasswordReset().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
