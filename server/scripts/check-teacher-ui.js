require('dotenv').config({ quiet: true });
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
const assert = require('node:assert/strict');
const path = require('node:path');
const mongoose = require('mongoose');
const express = require('express');
const User = require('../models/User');
const Profile = require('../models/TeacherProfile');
const Subject = require('../models/Subject');
const Booking = require('../models/Booking');
const { browserCookie, cleanup } = require('./test-session');
const users = []; let server, browser;
async function main() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'turolink_integration_checks', serverSelectionTimeoutMS: 10000 });
  for (const [role, name] of [['teacher', 'Ashley Rivera'], ['student', 'Roven Yulo']]) users.push(await User.create({ name, role, emailVerifiedAt: new Date(), email: `${new mongoose.Types.ObjectId()}@example.invalid`, phone: '09' + require('crypto').randomInt(1000000000).toString().padStart(9, '0'), password: 'unused-fixture-password' }));
  const [teacher, student] = users;
  await Profile.create({ user: teacher._id, degreeTitle: 'BS Education', subjectToTeach: 'Mathematics', teachingBio: 'Helping students discover their confidence.', hourlyRate: 450 });
  const subjects = [];
  for (const [code, title] of [['MATH 101', 'Mathematics'], ['ITE 314', 'Advanced Database']]) subjects.push(await Subject.create({ teacherId: teacher._id, code, title, enrolledStudents: [student._id], announcements: [{ content: 'Welcome to our classroom. Your next lesson and materials are ready here.' }], materials: [{ title: 'Your first learning module', status: 'posted', instructions: 'Read the introduction before our next session.', points: 100 }] }));
  for (const [offset, status] of [[2, 'confirmed'], [3, 'pending']]) {
    const start = new Date(Date.now() + offset * 86400000);
    await Booking.create({ teacher: teacher._id, student: student._id, slot: new mongoose.Types.ObjectId(), start, end: new Date(+start + 3600000), subject: 'Mathematics', subjectId: subjects[0]._id, price: 450, status });
  }
  const app = express(); app.use(express.json());
  for (const [route, module] of [['auth', 'auth'], ['teacher', 'teacher'], ['subjects', 'subject'], ['tutors', 'tutor'], ['student', 'student'], ['student-subjects', 'studentSubject'], ['notifications', 'notification']]) app.use(`/api/${route}`, require(`../routes/${module}Routes`));
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = require(path.join(process.env.TEMP, 'turolink-browser-check/node_modules/playwright'));
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
  await browserCookie(context, teacher);
  const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await context.route('**/api/**', async route => { try { const url = new URL(route.request().url()); const response = await route.fetch({ url: origin + url.pathname + url.search }); await route.fulfill({ response }); } catch (e) { if (!/closed|disposed|already handled/.test(e.message)) throw e; } });
  await page.goto('http://localhost:5173/teacher/dashboard');
  await page.getByRole('heading', { name: 'Welcome back, Ashley.' }).waitFor();
  await page.locator('.teacher-metrics article').first().waitFor();
  assert.equal(await page.locator('.teacher-metrics article').nth(0).locator('strong').textContent(), '1');
  assert.equal(await page.locator('.teacher-metrics article').nth(2).locator('strong').textContent(), '2');
  await page.screenshot({ path: path.join(process.env.TEMP, 'teacher-modern-dashboard.png'), fullPage: true });
  await page.getByRole('link', { name: 'Review requests' }).click();
  await page.getByRole('heading', { name: 'Tutoring Requests' }).waitFor();
  await page.getByRole('button', { name: 'Accept', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Request accepted' }).waitFor();
  await page.getByRole('link', { name: 'View schedules and request history' }).click();
  await page.getByRole('heading', { name: 'Schedules', exact: true }).waitFor();
  await page.getByRole('link', { name: 'Manage availability' }).click();
  await page.getByRole('heading', { name: 'Teaching Availability' }).waitFor();
  await page.getByRole('heading', { name: 'Your teaching rate' }).waitFor();
  await page.getByLabel('Hourly rate (PHP)').fill('475');
  await page.getByRole('button', { name: 'Save Rate', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Hourly rate saved' }).waitFor();
  assert.equal((await Profile.findOne({ user: teacher._id })).hourlyRate, 475);
  await page.goto('http://localhost:5173/teacher/my-subjects');
  const subjectButton = page.getByRole('button', { name: 'ITE 314: Advanced Database', exact: true });
  await subjectButton.focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Classwork', exact: true }).click();
  await page.getByRole('heading', { name: 'Assignment: Your first learning module' }).waitFor();
  await page.screenshot({ path: path.join(process.env.TEMP, 'teacher-modern-subject.png'), fullPage: true });
  await page.goto('http://localhost:5173/teacher/dashboard');
  await page.getByRole('switch', { name: 'Toggle dark mode' }).click();
  await page.locator('.teacher-layout.dark-dashboard-layout').waitFor();
  await page.locator('.teacher-metrics article').first().waitFor();
  await page.waitForTimeout(350);
  assert.equal(await page.locator('.dashboard-layout-content').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(23, 34, 29)');
  await page.screenshot({ path: path.join(process.env.TEMP, 'teacher-modern-dark.png'), fullPage: true });
  for (const route of ['dashboard', 'my-subjects', 'requests', 'schedules', 'availability', 'settings']) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`http://localhost:5173/teacher/${route}`);
    await page.locator('.teacher-layout').waitFor();
    await page.waitForTimeout(300);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Mobile overflow: ${route}`);
  }
  await page.screenshot({ path: path.join(process.env.TEMP, 'teacher-modern-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Open sidebar' }).click();
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await page.getByRole('heading', { name: 'Welcome back, Ashley.' }).waitFor();
  assert.deepEqual(errors, []);
  await context.unrouteAll({ behavior: 'ignoreErrors' }); await context.close();
  console.log('PASS: real dashboard counts, request acceptance, rate persistence, keyboard subject navigation, classwork, dark mode, six mobile pages, and sidebar navigation.');
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close(); if (server) await new Promise(resolve => server.close(resolve));
  if (mongoose.connection.readyState === 1) {
    const ids = users.map(u => u._id); await cleanup(users); await Booking.deleteMany({ teacher: { $in: ids } }); await Subject.deleteMany({ teacherId: { $in: ids } }); await Profile.deleteMany({ user: { $in: ids } }); await User.deleteMany({ _id: { $in: ids } }); await mongoose.disconnect();
  }
});
