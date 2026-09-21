require('dotenv').config({ quiet: true });
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const express = require('express');
const User = require('../models/User');
const TeacherProfile = require('../models/TeacherProfile');
const Subject = require('../models/Subject');
const fs = require('node:fs/promises');
const path = require('node:path');

async function main() {
  const rules = await import('../../shared/validation.mjs');
  const tag = new mongoose.Types.ObjectId().toString();
  const emails = ['student', 'teacher', 'browserstudent', 'browserteacher', 'raceone', 'racetwo'].map((role) => `${role}-${tag}@example.invalid`);
  const phones = Array.from({ length: 5 }, () => '09' + require('crypto').randomInt(1000000000).toString().padStart(9, '0'));
  const account = { name: "María Anne O'Neil-Santos", email: emails[0], phone: phones[0], password: ' secret ', confirmPassword: ' secret ', terms: true };
  assert.deepEqual(rules.validateRegistration(account), {});
  assert.deepEqual(rules.validateLogin({ email: account.email, password: 'x' }), {});
  for (const [field, value] of [['name', '   '], ['email', 'bad'], ['phone', 'abc'], ['password', '12345'], ['confirmPassword', 'other'], ['terms', false]]) assert(rules.validateRegistration({ ...account, [field]: value })[field]);
  assert(rules.validateRegistration({ ...account, password: 'é'.repeat(37) }).password);
  assert(rules.documentError({ type: 'text/plain', size: 5 }));
  assert(rules.documentError({ type: 'application/pdf', size: 5 * 1024 * 1024 + 1 }));
  assert.deepEqual(rules.validateSubject({ code: 'ITE 314', title: 'Database' }), {});
  assert(rules.validateSubject({ code: {}, title: ' ' }).code);
  assert.deepEqual(rules.validateAnnouncement({ link: 'https://example.com' }), {});
  assert(rules.validateAnnouncement({ scheduledAt: '2000-01-01', content: 'Hi' }).scheduledAt);
  console.log('PASS: shared validation boundaries and task-specific rules.');
  let server, browser;
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'turolink_integration_checks', serverSelectionTimeoutMS: 8000 });
    await User.init();
    const app = express(); app.use(express.json());
    app.use('/api/auth', require('../routes/authRoutes'));
    app.use('/api/teacher', require('../routes/teacherRoutes'));
    app.use('/api/student', require('../routes/studentRoutes'));
    app.use('/api/courses', require('../routes/courseRoutes'));
    app.use('/api/subjects', require('../routes/subjectRoutes'));
    server = app.listen(0, '127.0.0.1'); await new Promise((resolve) => server.once('listening', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    const call = async (url, data, token, method = 'POST') => {
      const multipart = data instanceof FormData;
      const response = await fetch(origin + '/api' + url, { method, headers: { ...(!multipart ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(data ? { body: multipart ? data : JSON.stringify(data) } : {}) });
      return { status: response.status, data: await response.json() };
    };
    assert.equal((await call('/auth/login', { email: {}, password: [] })).status, 400);
    assert.equal((await call('/auth/register', { ...account, terms: false })).status, 400);
    const student = await call('/auth/register', { ...account, email: ' ' + account.email.toUpperCase() + ' ' });
    assert.equal(student.status, 201); assert.equal(student.data.user.phone, phones[0]);
    assert.equal((await call('/auth/register', account)).status, 409);
    assert.equal((await call('/auth/login', { email: account.email, password: account.password })).status, 200);
    const incorrect = await call('/auth/login', { email: account.email, password: 'secret' });
    const missing = await call('/auth/login', { email: 'missing-' + tag + '@example.invalid', password: 'secret' });
    assert.equal(incorrect.status, 401); assert.deepEqual(incorrect.data, missing.data);
    const teacherData = { ...account, email: emails[1], phone: phones[1], degreeTitle: 'BS Education', subjectToTeach: 'Math', teachingBio: 'Teaching mathematics.', verificationConsent: true };
    const multipart = (body) => { const data = new FormData(); for (const [key, value] of Object.entries(body)) data.append(key, String(value)); return data; };
    assert.equal((await call('/teacher/register', multipart({ ...teacherData, password: '123', confirmPassword: '123' }))).status, 400);
    const rejectedFile = multipart(teacherData); rejectedFile.append('verificationDocument', new Blob(['bad'], { type: 'text/plain' }), 'bad.txt');
    assert.equal((await call('/teacher/register', rejectedFile)).status, 400);
    const teacher = await call('/teacher/register', multipart(teacherData)); assert.equal(teacher.status, 201);
    assert.equal((await call('/teacher/register', multipart(teacherData))).status, 409);
    const duplicatePhone = await call('/auth/register', { ...account, email: emails[4], phone: '+63' + phones[0].slice(1) });
    assert.equal(duplicatePhone.status, 409); assert(duplicatePhone.data.errors.phone);
    const duplicateTeacherPhone = await call('/teacher/register', multipart({ ...teacherData, email: emails[4], phone: phones[0] }));
    assert.equal(duplicateTeacherPhone.status, 409); assert(duplicateTeacherPhone.data.errors.phone);
    const race = await Promise.all([emails[4], emails[5]].map((email) => call('/auth/register', { ...account, email, phone: phones[4] })));
    assert.deepEqual(race.map((result) => result.status).sort(), [201, 409]);
    assert(race.find((result) => result.status === 409).data.errors.phone);
    console.log('PASS: duplicate mobile numbers across roles, normalized +63/09 duplicates, and concurrent signup protection.');
    const token = teacher.data.token;
    assert.equal((await call('/subjects', { code: ' ', title: ' ' }, token)).status, 400);
    const subject = await call('/subjects', { code: 'ITE', title: 'Database' }, token); assert.equal(subject.status, 201);
    const subjectId = subject.data._id;
    assert.equal((await call('/subjects/' + subjectId, { title: [] }, token, 'PUT')).status, 400);
    assert.equal((await call('/subjects/' + subjectId + '/announcements', { link: 'https://example.com' }, token)).status, 201);
    assert.equal((await call('/subjects/' + subjectId + '/announcements', { content: {}, link: {} }, token)).status, 400);
    console.log('PASS: MongoDB registration/login, normalization, password preservation, duplicate emails, teacher requirements/uploads, and subject/announcement API validation.');

    if (process.argv.includes('--browser')) {
      const { chromium } = require(path.join(process.env.TEMP, 'turolink-browser-check/node_modules/playwright'));
      browser = await chromium.launch({ channel: 'msedge', headless: true });
      const page = await browser.newPage(); const errors = []; page.on('pageerror', (error) => errors.push(error.message));
      let registrations = 0;
      await page.route('**/api/**', async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith('/register')) registrations++;
        const response = await route.fetch({ url: origin + url.pathname }); await route.fulfill({ response });
      });
      await page.goto('http://127.0.0.1:5173/register');
      await page.getByRole('button', { name: 'Sign Up', exact: true }).click();
      assert.equal(await page.locator('input[aria-invalid="true"]').count(), 6);
      assert.equal(registrations, 0);
      const fillAccount = async (email) => { for (const [key, value] of Object.entries({ ...account, email, phone: phones[emails.indexOf(email)] })) if (key !== 'terms') await page.locator(`input[name="${key}"]`).fill(value); };
      await fillAccount(emails[2]); await page.locator('input[name="terms"]').check();
      await page.getByRole('button', { name: 'Sign Up', exact: true }).click();
      await page.waitForURL('**/dashboard'); assert.equal(registrations, 1);
      await page.evaluate(() => localStorage.clear());
      await page.goto('http://127.0.0.1:5173/login');
      await page.locator('input[name="email"]').fill(account.email);
      await page.locator('input[name="password"]').fill('wrong');
      await page.getByRole('button', { name: 'Log In', exact: true }).click();
      await page.getByRole('alert').waitFor(); assert.equal(await page.locator('input[name="password"]').inputValue(), 'wrong');
      await page.locator('input[name="password"]').fill(account.password);
      await page.getByRole('button', { name: 'Log In', exact: true }).click(); await page.waitForURL('**/dashboard');
      await page.evaluate(() => localStorage.clear());
      await page.goto('http://127.0.0.1:5173/teacher/register');
      await page.getByRole('button', { name: 'Next', exact: true }).click(); assert.equal(await page.locator('input[aria-invalid="true"]').count(), 5);
      await fillAccount(emails[3]); await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.getByRole('button', { name: 'Sign Up', exact: true }).click();
      await page.locator('#degreeTitle-error').waitFor();
      for (const field of ['degreeTitle', 'subjectToTeach', 'teachingBio']) await page.locator(`[name="${field}"]`).fill(teacherData[field]);
      await page.locator('[name="terms"]').check(); await page.locator('[name="verificationConsent"]').check();
      await page.getByRole('button', { name: 'Sign Up', exact: true }).click();
      await page.waitForURL('**/teacher/dashboard');
      assert.deepEqual(errors, []);
      console.log('PASS: browser inline errors, blocked invalid submissions, retained failed-login input, student signup/login, two-step teacher signup, and no runtime errors.');
    }
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
    if (mongoose.connection.readyState === 1) {
      const users = await User.find({ email: { $in: emails } }); const ids = users.map((user) => user._id);
      const profiles = await TeacherProfile.find({ user: { $in: ids } });
      for (const profile of profiles) if (profile.verificationDocument) await fs.unlink(path.join(__dirname, '..', profile.verificationDocument)).catch(() => {});
      await Subject.deleteMany({ teacherId: { $in: ids } }); await TeacherProfile.deleteMany({ user: { $in: ids } }); await User.deleteMany({ _id: { $in: ids } });
    }
    await mongoose.disconnect();
  }
}
main().catch((error) => { console.error('Validation check failed:', error.name, error.message.replace(/mongodb(?:\+srv)?:\/\/[^\s]+/g, '[database connection]')); process.exitCode = 1; });
