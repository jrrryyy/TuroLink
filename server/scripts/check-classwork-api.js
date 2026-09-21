// Run from server: node scripts/check-classwork-api.js [--browser]
// Uses a separate database and cleans up its own records and attachments.
require('dotenv').config({ quiet: true });
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Subject = require('../models/Subject');
const { protect } = require('../middleware/authMiddleware');
const { publishDueMaterials } = require('../controllers/materialController');

async function main() {
  assert(process.env.MONGO_URI && process.env.JWT_SECRET, 'Configure MONGO_URI and JWT_SECRET.');
  const users = [];
  let server, browser;
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'turolink_integration_checks', serverSelectionTimeoutMS: 8000 });
    for (const role of ['teacher', 'teacher', 'student']) users.push(await User.create({ name: 'Classwork Test Teacher', email: new mongoose.Types.ObjectId() + '@example.invalid', phone: '0000000000', password: 'unused-test-account', role }));
    const app = express(); app.use(express.json());
    app.get('/api/auth/me', protect, (req, res) => res.json(req.user));
    app.use('/api/subjects', require('../routes/subjectRoutes'));
    server = app.listen(0, '127.0.0.1'); await new Promise((resolve) => server.once('listening', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    const token = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    const call = async (url, method = 'GET', body, user = users[0]) => {
      const multipart = body instanceof FormData;
      const response = await fetch(origin + '/api/subjects' + url, { method, headers: { ...(user ? { Authorization: 'Bearer ' + token(user) } : {}), ...(!multipart ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: multipart ? body : JSON.stringify(body) } : {}) });
      return { status: response.status, body: await response.json() };
    };
    const subject = await call('/', 'POST', { code: 'ITE 314', title: 'Advanced Database' });
    assert.equal(subject.status, 201);
    const base = '/' + subject.body._id + '/materials';
    const fields = { title: 'Module 1', instructions: 'Complete the attached module.', type: 'assignment', points: 100, status: 'draft' };
    assert.equal((await call(base, 'GET', undefined, null)).status, 401);
    assert.equal((await call(base, 'POST', fields, users[2])).status, 403);
    assert.equal((await call(base, 'POST', fields, users[1])).status, 404);
    for (const invalid of [{ title: '' }, { points: -1 }, { points: 'bad' }, { link: 'javascript:alert(1)' }, { status: 'scheduled', scheduledAt: '2000-01-01' }, { dueAt: 'invalid' }, { type: 'invalid' }]) assert.equal((await call(base, 'POST', { ...fields, ...invalid })).status, 400);
    const draft = await call(base, 'POST', fields); assert.equal(draft.status, 201);
    const materialUrl = base + '/' + draft.body._id;
    assert.equal((await call(base)).body[0].status, 'draft');
    assert.equal((await call(materialUrl, 'PUT', { ...fields, title: 'Edited draft' })).status, 200);
    assert.equal((await call(base)).body[0].title, 'Edited draft');
    const multipart = new FormData();
    for (const [key, value] of Object.entries({ ...fields, status: 'posted', link: 'https://example.com/module' })) multipart.append(key, String(value));
    multipart.append('attachment', new Blob(['Test classwork attachment'], { type: 'text/plain' }), 'module.txt');
    assert.equal((await call(materialUrl, 'PUT', multipart)).status, 200);
    const attachment = await fetch(origin + '/api/subjects' + materialUrl + '/attachment', { headers: { Authorization: 'Bearer ' + token(users[0]) } });
    assert.equal(attachment.status, 200); assert.equal(await attachment.text(), 'Test classwork attachment');
    assert.equal((await call(materialUrl + '/attachment', 'GET', undefined, users[1])).status, 404);
    assert.equal((await call(materialUrl, 'PATCH', { action: 'archive' })).body.status, 'archived');
    assert.equal((await call(materialUrl, 'PATCH', { action: 'restore' })).body.status, 'draft');
    const scheduled = await call(base, 'POST', { ...fields, type: 'quiz', points: null, status: 'scheduled', scheduledAt: new Date(Date.now() + 3600000).toISOString() });
    assert.equal(scheduled.status, 201); assert.equal(scheduled.body.type, 'quiz'); assert.equal(scheduled.body.points, null);
    await Subject.updateOne({ _id: subject.body._id, 'materials._id': scheduled.body._id }, { $set: { 'materials.$.scheduledAt': new Date(Date.now() - 1000) } });
    await publishDueMaterials();
    assert.equal((await call(base)).body.find((item) => item._id === scheduled.body._id).status, 'posted');
    assert.equal((await call(materialUrl, 'DELETE', undefined, users[1])).status, 404);
    assert.equal((await call(materialUrl, 'DELETE')).status, 200);
    assert.equal((await call(materialUrl, 'DELETE')).status, 404);
    console.log('PASS: MongoDB classwork create/read/edit, draft/post/schedule, scheduled publication, archive/restore/delete, file download, validation, authentication, role and ownership checks.');

    if (process.argv.includes('--browser')) {
      const { chromium } = require(path.join(process.env.TEMP, 'turolink-browser-check/node_modules/playwright'));
      browser = await chromium.launch({ channel: 'msedge', headless: true });
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript((savedToken) => localStorage.setItem('turolinkToken', savedToken), token(users[0]));
      await page.route('**/api/**', async (route) => {
        const url = new URL(route.request().url());
        const response = await route.fetch({ url: origin + url.pathname + url.search });
        await route.fulfill({ response });
      });
      await page.goto('http://127.0.0.1:5173/teacher/my-subjects');
      await page.getByRole('heading', { name: 'ITE 314: Advanced Database' }).click();
      await page.getByRole('button', { name: 'Classwork', exact: true }).click();
      await page.getByText('Create', { exact: true }).click();
      await page.getByRole('button', { name: 'Assignment', exact: true }).click();
      await page.getByLabel('Title', { exact: true }).fill('Browser assignment');
      await page.getByLabel('Instructions', { exact: true }).fill('Complete all activities in the module.');
      await page.getByRole('button', { name: 'Save Draft', exact: true }).click();
      await page.getByRole('status').filter({ hasText: 'saved as a draft' }).waitFor();
      await page.waitForFunction(() => !document.querySelector('.teacher-classwork button:disabled'));
      await page.getByText('Drafts and Archived', { exact: false }).click();
      await page.getByLabel('Actions for Browser assignment').click();
      await page.getByRole('button', { name: 'Edit', exact: true }).click();
      await page.getByRole('button', { name: 'Post', exact: true }).click();
      await page.getByRole('status').filter({ hasText: 'posted successfully' }).waitFor();
      await page.waitForFunction(() => !document.querySelector('.teacher-classwork button:disabled'));
      await page.reload();
      await page.getByRole('heading', { name: 'ITE 314: Advanced Database' }).click();
      await page.getByRole('button', { name: 'Classwork', exact: true }).click();
      await page.getByRole('heading', { name: 'Assignment: Browser assignment' }).waitFor();
      await page.getByLabel('Actions for Browser assignment').click();
      await page.getByRole('button', { name: 'Archive', exact: true }).click();
      await page.getByRole('status').filter({ hasText: 'archived' }).waitFor();
      await page.waitForFunction(() => !document.querySelector('.teacher-classwork button:disabled'));
      await page.getByText('Drafts and Archived', { exact: false }).click();
      await page.getByLabel('Actions for Browser assignment').click();
      await page.getByRole('button', { name: 'Delete', exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
      await page.getByLabel('Actions for Browser assignment').click();
      await page.getByRole('button', { name: 'Delete', exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
      await page.getByRole('status').filter({ hasText: 'deleted' }).waitFor();
      await page.waitForFunction(() => !document.querySelector('.teacher-classwork button:disabled'));
      await page.getByText('Create', { exact: true }).click();
      await page.getByRole('button', { name: 'Quiz Assignment', exact: true }).click();
      await page.getByLabel('Title', { exact: true }).fill('Quiz: MERN Introduction');
      await page.screenshot({ path: path.join(process.env.TEMP, 'teacher-classwork-desktop.png'), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: path.join(process.env.TEMP, 'teacher-classwork-mobile.png'), fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.getByLabel('Points', { exact: true }).selectOption('');
      await page.getByLabel('Schedule posting (optional)').fill(new Date(Date.now() + 7200000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));
      await page.locator('input[type="file"]').setInputFiles({ name: 'quiz.txt', mimeType: 'text/plain', buffer: Buffer.from('Quiz questions for the test') });
      await page.getByRole('button', { name: 'Add link', exact: true }).click();
      await page.getByLabel('Attachment link', { exact: true }).fill('https://example.com/quiz');
      await page.getByRole('button', { name: 'Schedule', exact: true }).click();
      await page.getByRole('status').filter({ hasText: 'scheduled successfully' }).waitFor();
      await page.waitForFunction(() => !document.querySelector('.teacher-classwork button:disabled'));
      const savedQuiz = (await call(base)).body.find((item) => item.title === 'Quiz: MERN Introduction');
      assert.equal(savedQuiz.status, 'scheduled'); assert.equal(savedQuiz.points, null); assert.equal(savedQuiz.attachmentName, 'quiz.txt');
      await page.evaluate(() => localStorage.setItem('turolink-theme', 'dark'));
      await page.reload();
      await page.getByRole('heading', { name: 'ITE 314: Advanced Database' }).click();
      await page.getByRole('button', { name: 'Classwork', exact: true }).click();
      await page.locator('.teacher-subject-dark').waitFor();
      await page.getByText('Drafts and Archived', { exact: false }).click();
      await page.getByRole('heading', { name: 'Quiz Assignment: Quiz: MERN Introduction' }).waitFor();
      assert.deepEqual(errors, []);
      console.log('PASS: real API browser draft/edit/post, refresh persistence, archive, delete confirmation/cancel, quiz scheduling with file/link attachment, dark mode, responsive layout, and no runtime errors.');
    }
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
    if (users.length) {
      const subjects = await Subject.find({ teacherId: { $in: users.map((user) => user._id) } });
      for (const subject of subjects) for (const material of subject.materials) if (material.attachmentKey && path.basename(material.attachmentKey) === material.attachmentKey) await fs.unlink(path.join(__dirname, '../storage/materials', material.attachmentKey)).catch(() => {});
      await Subject.deleteMany({ teacherId: { $in: users.map((user) => user._id) } });
      await User.deleteMany({ _id: { $in: users.map((user) => user._id) } });
    }
    await mongoose.disconnect();
  }
}
main().catch((error) => { console.error('Classwork check failed:', error.name, error.name === 'AssertionError' || error.name === 'TimeoutError' ? error.message : 'Check database/browser connectivity and configuration.'); process.exitCode = 1; });
