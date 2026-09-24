require('dotenv').config({ quiet: true });
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const express = require('express');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Notification = require('../models/Notification');
const Booking = require('../models/Booking');
const { token, browserCookie, cleanup } = require('./test-session');
const { publishDueMaterials } = require('../controllers/materialController');
const users = []; let server, browser;
async function main() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'turolink_integration_checks', serverSelectionTimeoutMS: 10000 });
  await Promise.all([User.init(), Notification.init(), Booking.init()]);
  for (const role of ['teacher', 'student', 'student']) users.push(await User.create({ name: 'Notification Test', role, emailVerifiedAt: new Date(), email: `${new mongoose.Types.ObjectId()}@example.invalid`, phone: '09' + require('crypto').randomInt(1000000000).toString().padStart(9, '0'), password: 'unused-test-hash' }));
  const [teacher, student, outsider] = users;
  const subject = await Subject.create({ code: 'NTF', title: 'Notification Subject', teacherId: teacher._id, enrolledStudents: [student._id], announcements: [{ content: 'Published announcement' }, { content: 'Scheduled announcement', status: 'scheduled', scheduledAt: new Date(Date.now() + 86400000), postedAt: null }], materials: [{ title: 'Private draft', status: 'draft' }, { title: 'Published material', status: 'posted' }, { title: 'Scheduled material', status: 'scheduled', scheduledAt: new Date(Date.now() + 86400000) }] });
  assert.equal(await Notification.countDocuments({ recipient: student._id }), 2);
  assert.equal(await Notification.countDocuments({ recipient: outsider._id }), 0);
  await require('../services/notifications').flushSubject(subject);
  assert.equal(await Notification.countDocuments({ recipient: student._id }), 2);
  await Subject.updateOne({ _id: subject._id }, { $set: { 'announcements.1.scheduledAt': new Date(Date.now() - 1000), 'materials.2.scheduledAt': new Date(Date.now() - 1000) } });
  await publishDueMaterials(); await publishDueMaterials();
  assert.equal(await Notification.countDocuments({ recipient: student._id }), 4);
  const app = express(); app.use(express.json()); app.use('/api', require('../services/authSecurity').csrf);
  app.use('/api/notifications', require('../routes/notificationRoutes')); app.use('/api/auth', require('../routes/authRoutes')); app.use('/api/tutors', require('../routes/tutorRoutes')); app.use('/api/student-subjects', require('../routes/studentSubjectRoutes')); app.use('/api/student', require('../routes/studentRoutes'));
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const call = async (user, url, method = 'GET', body) => {
    const response = await fetch(origin + '/api' + url, { method, headers: { Origin: 'http://localhost:5173', 'X-TuroLink-Request': '1', 'Content-Type': 'application/json', ...(user ? { Cookie: 'turolink_session=' + await token(user) } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json() };
  };
  assert.equal((await call(null, '/notifications')).status, 401);
  assert.equal((await call(teacher, '/notifications')).status, 403);
  assert.equal((await call(outsider, '/notifications')).data.unreadCount, 0);
  const list = await call(student, '/notifications'); assert.equal(list.data.unreadCount, 4);
  assert(!list.data.items.some(n => n.message === 'Private draft'));
  assert.equal((await call(outsider, `/notifications/${list.data.items[0]._id}/read`, 'PATCH')).status, 404);
  assert.equal((await call(student, `/notifications/${list.data.items[0]._id}/read`, 'PATCH')).status, 200);
  assert.equal((await call(student, '/notifications')).data.unreadCount, 3);
  await call(student, '/notifications/read-all', 'PATCH'); assert.equal((await call(student, '/notifications')).data.unreadCount, 0);
  await Subject.updateOne({ _id: subject._id }, { $set: { 'materials.1.status': 'archived' } });
  assert.equal((await call(student, '/notifications')).data.items.length, 3);
  await Subject.updateOne({ _id: subject._id }, { $pull: { enrolledStudents: student._id } });
  assert.equal((await call(student, '/notifications')).data.items.length, 0);
  await Subject.updateOne({ _id: subject._id }, { $addToSet: { enrolledStudents: student._id } });
  for (const [i, action] of ['accept', 'decline'].entries()) {
    const start = new Date(Date.now() + (i + 2) * 86400000);
    const booking = await Booking.create({ teacher: teacher._id, student: student._id, slot: new mongoose.Types.ObjectId(), start, end: new Date(+start + 3600000), subject: 'Notification Subject', subjectId: subject._id, price: 50, status: 'pending' });
    assert.equal((await call(teacher, `/tutors/requests/${booking._id}`, 'PATCH', { action })).status, 200);
    assert.equal((await call(teacher, `/tutors/requests/${booking._id}`, 'PATCH', { action })).status, 409);
    assert.equal(await Notification.countDocuments({ recipient: student._id, eventKey: `request:${booking._id}:${action}` }), 1);
  }
  console.log('PASS: published-only content, scheduled delivery, deduplication, recipient privacy, archived/unenrolled filtering, read persistence and transactional accept/decline alerts.');
  if (process.argv.includes('--browser')) {
    const { chromium } = require(require('path').join(process.env.TEMP, 'turolink-browser-check/node_modules/playwright'));
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext(); await browserCookie(context, student);
    await context.addInitScript(() => {
      window.permissionRequests = 0;
      window.browserAlerts = [];
      window.Notification = class { constructor(title) { window.browserAlerts.push(title); } static permission = 'default'; static requestPermission() { window.permissionRequests++; this.permission = 'denied'; return Promise.resolve('denied'); } };
    });
    const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/**', async route => { try { const response = await route.fetch({ url: origin + new URL(route.request().url()).pathname }); await route.fulfill({ response }); } catch (e) { if (!/closed|disposed|already handled/.test(e.message)) throw e; } });
    await page.goto('http://localhost:5173/student/my-subjects');
    await page.getByRole('button', { name: /Notifications, 2 unread/ }).waitFor();
    assert.equal(await page.evaluate(() => window.permissionRequests), 0);
    await page.getByRole('button', { name: /Notifications, 2 unread/ }).click();
    await page.getByRole('button', { name: 'Not now', exact: true }).click();
    assert.equal(await page.evaluate(() => window.permissionRequests), 0);
    await page.getByRole('button', { name: 'Enable notifications', exact: true }).click();
    assert.equal(await page.evaluate(() => window.permissionRequests), 1);
    await page.getByRole('status').filter({ hasText: 'Browser alerts are off.' }).waitFor();
    await page.getByRole('button', { name: 'Mark all as read' }).click();
    await page.getByRole('button', { name: 'Notifications', exact: true }).waitFor();
    await page.getByRole('button', { name: /New material.*Scheduled material/ }).click();
    await page.waitForURL(url => url.search.includes('materials'));
    await page.getByRole('heading', { name: 'Scheduled material' }).waitFor();
    await page.getByRole('button', { name: 'Notifications', exact: true }).click();
    await page.evaluate(() => { window.Notification.requestPermission = () => { window.Notification.permission = 'granted'; return Promise.resolve('granted'); }; });
    await page.getByRole('button', { name: 'Enable notifications', exact: true }).click();
    await page.getByRole('button', { name: 'Turn off browser alerts' }).waitFor();
    const update = await Subject.findById(subject._id); update.announcements.push({ content: 'Fresh browser notification' }); await update.save();
    await page.waitForFunction(() => window.browserAlerts.length === 1, null, { timeout: 40000 });
    await page.getByRole('button', { name: 'Turn off browser alerts' }).click();
    await page.getByRole('button', { name: 'Close notifications', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: /Notifications, 1 unread/ }).click();
    const bounds = await page.locator('.notification-panel').boundingBox(); assert(bounds.x >= 0 && bounds.x + bounds.width <= 390);
    await page.keyboard.press('Escape'); assert.equal(await page.locator('.notification-panel').count(), 0);
    assert.deepEqual(errors, []);
    await page.unrouteAll({ behavior: 'ignoreErrors' }); await context.close();
    console.log('PASS: browser bell/count, opt-in only, decline/denied fallback, mark-read, material navigation, mobile panel and Escape.');
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close(); if (server) await new Promise(resolve => server.close(resolve));
  if (mongoose.connection.readyState === 1) {
    const ids = users.map(u => u._id);
    await cleanup(users); await Subject.deleteMany({ teacherId: { $in: ids } }); await Booking.deleteMany({ student: { $in: ids } }); await require('../models/DeclinedRequest').deleteMany({ student: { $in: ids } }); await User.deleteMany({ _id: { $in: ids } }); await mongoose.disconnect();
  }
});
