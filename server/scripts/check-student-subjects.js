require('dotenv').config({ quiet: true });
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const express = require('express');
const { token, browserCookie, cleanup } = require('./test-session');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const User = require('../models/User');
const Profile = require('../models/TeacherProfile');
const Subject = require('../models/Subject');
const Slot = require('../models/TutorSlot');
const Booking = require('../models/Booking');
const Declined = require('../models/DeclinedRequest');
async function main() {
  const users = [], files = []; let server, browser;
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'turolink_integration_checks', serverSelectionTimeoutMS: 8000 });
    await Promise.all([User.init(), Slot.init(), Booking.init()]);
    for (const role of ['teacher', 'teacher', 'student', 'student']) users.push(await User.create({ emailVerifiedAt: new Date(), name: role === 'teacher' ? 'Subject Test Teacher' : 'Subject Test Student', email: new mongoose.Types.ObjectId() + '@example.invalid', phone: '09' + require('crypto').randomInt(1000000000).toString().padStart(9, '0'), role, password: 'unused-test-hash' }));
    const [teacher, otherTeacher, student, outsider] = users;
    await Profile.create({ user: teacher._id, degreeTitle: 'Education', subjectToTeach: 'Database', teachingBio: 'Learning together.', hourlyRate: 500 });
    const materialKey = randomUUID(), announcementKey = randomUUID() + '.txt';
    for (const [folder, key] of [['storage/materials', materialKey], ['uploads/announcements', announcementKey]]) {
      const directory = path.join(__dirname, '..', folder); await fs.mkdir(directory, { recursive: true });
      const file = path.join(directory, key); await fs.writeFile(file, 'Student subject test attachment'); files.push(file);
    }
    const subject = await Subject.create({ teacherId: teacher._id, code: 'ITE314', title: 'Advanced Database',
      announcements: [
        { content: 'Welcome to Advanced Database!', attachment: '/uploads/announcements/' + announcementKey, attachmentName: 'welcome.txt', status: 'posted' },
        { content: 'Future private announcement', status: 'scheduled', scheduledAt: new Date(Date.now() + 86400000) },
        { content: 'Scheduled announcement now available', status: 'scheduled', scheduledAt: new Date(Date.now() - 1000), postedAt: null },
      ],
      materials: [
        { title: 'Module One', instructions: 'Read the introduction.', status: 'posted', type: 'assignment', dueAt: new Date(Date.now() + 86400000), attachmentKey: materialKey, attachmentName: 'module.txt' },
        { title: 'Private draft', status: 'draft', attachmentKey: materialKey },
        { title: 'Archived material', status: 'archived', attachmentKey: materialKey },
        { title: 'Future quiz', status: 'scheduled', scheduledAt: new Date(Date.now() + 86400000), attachmentKey: materialKey },
        { title: 'Scheduled quiz now available', type: 'quiz', status: 'scheduled', scheduledAt: new Date(Date.now() - 1000) },
      ],
    });
    const otherSubject = await Subject.create({ teacherId: otherTeacher._id, code: 'OTHER', title: 'Advanced Database' });
    const app = express(); app.use(express.json());
    app.use('/uploads', require('../middleware/privateUploads'), express.static(path.join(__dirname, '../uploads')));
    app.use('/api/auth', require('../routes/authRoutes'));
    app.use('/api/tutors', require('../routes/tutorRoutes'));
    app.use('/api/subjects', require('../routes/subjectRoutes'));
    app.use('/api/student-subjects', require('../routes/studentSubjectRoutes'));
    app.use('/api/courses', require('../routes/courseRoutes'));
    server = app.listen(0, '127.0.0.1'); await new Promise((resolve) => server.once('listening', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    const call = async (u, endpoint, method = 'GET', body) => {
      const response = await fetch(origin + '/api' + endpoint, { method, headers: { 'Content-Type': 'application/json', ...(u ? { Cookie: 'turolink_session=' + await token(u) } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      const text = await response.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
      return { status: response.status, body: data };
    };
    const detail = '/student-subjects/' + subject.id;
    const announcement = detail + '/announcements/' + subject.announcements[0].id;
    const material = detail + '/materials/' + subject.materials[0].id + '/attachment';
    assert.equal((await call(null, detail)).status, 401);
    assert.equal((await call(teacher, detail)).status, 403);
    assert.equal((await call(student, detail)).status, 404);
    const future = new Date(Math.ceil(Date.now() / 3600000) * 3600000 + 86400000);
    const slot = await Slot.create({ teacher: teacher._id, subjectId: subject.id, start: future });
    assert.equal((await call(student, '/tutors/bookings', 'POST', { slotId: slot.id, expectedPrice: 500 })).status, 409);
    assert.equal((await call(student, '/tutors/bookings', 'POST', { slotId: slot.id, subjectId: otherSubject.id, expectedPrice: 500 })).status, 409);
    const request = await call(student, '/tutors/bookings', 'POST', { slotId: slot.id, subjectId: subject.id, expectedPrice: 500 });
    assert.equal(request.status, 201); assert.equal((await call(student, detail)).status, 404);
    assert.equal((await call(teacher, '/tutors/requests/' + request.body.booking._id, 'PATCH', { action: 'accept' })).status, 200);
    assert.equal((await call(student, '/student-subjects')).body[0]._id, subject.id);
    assert.equal((await call(student, '/courses/my-courses')).body[0]._id, subject.id);
    const loaded = await call(student, detail); assert.equal(loaded.status, 200);
    assert.equal(loaded.body.announcements.length, 2); assert.equal(loaded.body.materials.length, 2);
    assert.equal(loaded.body.enrolledCount, 1); assert.equal(loaded.body.upcomingTopic, 'Module One');
    assert(!JSON.stringify(loaded.body).includes(materialKey)); assert(!('enrolledStudents' in loaded.body));
    assert.equal((await call(outsider, announcement + '/like', 'PUT', { liked: true })).status, 404);
    assert.equal((await call(student, detail + '/announcements/' + subject.announcements[1].id + '/like', 'PUT', { liked: true })).status, 404);
    await Promise.all([1, 2, 3].map(() => call(student, announcement + '/like', 'PUT', { liked: true })));
    assert.equal((await call(student, detail)).body.announcements.find((a) => a._id === subject.announcements[0].id).likes, 1);
    assert.equal((await call(student, announcement + '/like', 'PUT', { liked: false })).status, 200);
    assert.equal((await call(student, announcement + '/comments', 'POST', { text: '   ' })).status, 400);
    assert.equal((await call(student, announcement + '/comments', 'POST', { text: 'a'.repeat(2001) })).status, 400);
    assert.equal((await call(outsider, announcement + '/comments', 'POST', { text: 'Not enrolled' })).status, 404);
    assert.equal((await call(student, announcement + '/comments', 'POST', { text: 'Thanks for the lesson!', author: outsider.id })).status, 201);
    const posted = (await call(student, detail)).body.announcements.find((a) => a._id === subject.announcements[0].id);
    assert.equal(posted.comments[0].own, true); assert.equal(posted.comments[0].text, 'Thanks for the lesson!');
    const differentPost = detail + '/announcements/' + subject.announcements[2].id;
    await call(student, differentPost + '/like', 'PUT', { liked: true });
    await call(student, differentPost + '/comments', 'POST', { text: 'Comment for the scheduled post only.' });
    const exactPost = await Subject.findById(subject._id);
    assert.equal(exactPost.announcements[0].likes.length, 0);
    assert.equal(exactPost.announcements[0].comments.length, 1);
    assert.equal(exactPost.announcements[2].likes.length, 1);
    assert.equal(exactPost.announcements[2].comments[0].text, 'Comment for the scheduled post only.');
    const teacherPost = `/subjects/${subject.id}/announcements/${subject.announcements[2].id}`;
    assert.equal((await call(otherTeacher, teacherPost + '/engagement')).status, 404);
    assert.equal((await call(otherTeacher, teacherPost + '/like', 'PUT', { liked: true })).status, 404);
    assert.equal((await call(otherTeacher, teacherPost + '/comments', 'POST', { text: 'Not my class' })).status, 404);
    assert.equal((await call(student, teacherPost + '/engagement')).status, 403);
    await Promise.all([1, 2].map(() => call(teacher, teacherPost + '/like', 'PUT', { liked: true })));
    assert.equal((await call(teacher, teacherPost + '/engagement')).body.likes, 2);
    await call(teacher, teacherPost + '/like', 'PUT', { liked: false });
    assert.equal((await call(teacher, teacherPost + '/comments', 'POST', { text: 'Teacher reply' })).status, 201);
    assert.equal((await call(teacher, teacherPost + '/comments', 'POST', { text: ' ' })).status, 400);
    assert((await call(student, detail)).body.announcements.find((a) => a._id === subject.announcements[2].id).comments.some((c) => c.text === 'Teacher reply'));
    assert.equal((await call(student, material)).body, 'Student subject test attachment');
    assert.equal((await call(student, announcement + '/attachment')).body, 'Student subject test attachment');
    assert.equal((await call(outsider, material)).status, 404);
    for (const m of subject.materials.slice(1, 4)) assert.equal((await call(student, detail + '/materials/' + m.id + '/attachment')).status, 404);
    assert.equal((await call(otherTeacher, `/subjects/${subject.id}/announcements/${subject.announcements[0].id}/attachment`)).status, 404);
    assert.equal((await call(teacher, `/subjects/${subject.id}/announcements/${subject.announcements[0].id}/attachment`)).status, 200);
    for (const folder of ['announcements', '%61nnouncements']) assert.equal((await fetch(origin + '/uploads/' + folder + '/' + announcementKey)).status, 404);
    assert.equal((await call(student, '/subjects/' + subject.id, 'PUT', { code: 'HACK', title: 'Changed' })).status, 403);
    console.log('PASS: explicit subject selection, teacher acceptance/enrollment, enrollment privacy, published-only content/downloads, scheduled visibility, duplicate likes, comments validation/identity/persistence, teacher downloads.');
    if (process.argv.includes('--browser')) {
      const { chromium } = require(path.join(process.env.TEMP, 'turolink-browser-check/node_modules/playwright'));
      browser = await chromium.launch({ channel: 'msedge', headless: true });
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
      await browserCookie(context, outsider);
      const page = await context.newPage(); const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.route('**/api/**', async (route) => {
        try { const u = new URL(route.request().url()); const response = await route.fetch({ url: origin + u.pathname + u.search }); await route.fulfill({ response }); }
        catch (e) { if (!/closed|disposed|already handled/i.test(e.message)) errors.push(e.name); }
      });
      const browserSlot = await Slot.create({ teacher: teacher._id, subjectId: subject.id, start: new Date(future.getTime() + 3600000) });
      await page.goto('http://localhost:5173/student/tutors/' + teacher.id);
      await page.getByLabel('Session subject').selectOption(subject.id);
      const slotDay = browserSlot.start.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      await page.getByRole('button', { name: slotDay, exact: true }).click();
      await page.getByRole('button', { name: browserSlot.start.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' }), exact: true }).click();
      await page.getByRole('button', { name: 'Send Tutoring Request' }).click();
      await page.getByRole('status').filter({ hasText: 'Request sent!' }).waitFor();
      const browserRequest = await Booking.findOne({ student: outsider._id, slot: browserSlot._id });
      assert.equal(String(browserRequest.subjectId), subject.id);
      assert.equal((await call(teacher, '/tutors/requests/' + browserRequest.id, 'PATCH', { action: 'accept' })).status, 200);
      await page.goto('http://localhost:5173/student/my-subjects');
      await page.getByRole('link', { name: 'View Announcements' }).click();
      await page.getByRole('heading', { name: 'ITE314: Advanced Database' }).waitFor();
      const card = page.locator('.subject-feed-post').filter({ hasText: 'Welcome to Advanced Database!' });
      await card.getByRole('button', { name: '0 Likes', exact: true }).click();
      await card.getByRole('button', { name: '1 Like', exact: true }).waitFor();
      await card.getByRole('button', { name: '1 Comments' }).click();
      await card.getByLabel('Your comment').fill('Saved in the browser.');
      await card.getByRole('button', { name: 'Post Comment' }).click();
      await card.getByText('Saved in the browser.', { exact: true }).waitFor();
      await page.reload(); await card.getByRole('button', { name: '1 Like', exact: true }).waitFor();
      await card.getByRole('button', { name: '2 Comments' }).click();
      await card.getByText('Saved in the browser.', { exact: true }).waitFor();
      const [download] = await Promise.all([page.waitForEvent('download'), card.getByRole('button', { name: 'welcome.txt' }).click()]);
      assert.equal(download.suggestedFilename(), 'welcome.txt'); assert.equal(await download.failure(), null);
      await page.screenshot({ path: path.join(process.env.TEMP, 'student-subject-feed.png'), fullPage: true });
      await page.getByRole('button', { name: 'Materials', exact: true }).click();
      await page.getByRole('heading', { name: 'Module One' }).waitFor();
      assert.equal(await page.getByText('Private draft', { exact: true }).count(), 0);
      const [moduleDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'module.txt' }).click()]);
      assert.equal(await moduleDownload.failure(), null);
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.evaluate(() => localStorage.setItem('turolink-theme', 'dark')); await page.reload();
      await page.getByRole('heading', { name: 'ITE314: Advanced Database' }).waitFor();
      assert.equal(await page.locator('.dark-dashboard-layout').count(), 1);
      await page.getByRole('link', { name: 'Back to My Subjects' }).click();
      await page.getByRole('link', { name: 'View Announcements' }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Edit subject' }).count(), 0);
      assert.deepEqual(errors, []);
      const teacherContext = await browser.newContext();
      await browserCookie(teacherContext, teacher);
      const teacherPage = await teacherContext.newPage();
      teacherPage.on('pageerror', (e) => errors.push(e.message));
      await teacherPage.route('**/api/**', async (route) => {
        try { const u = new URL(route.request().url()); const response = await route.fetch({ url: origin + u.pathname + u.search }); await route.fulfill({ response }); }
        catch (e) { if (!/closed|disposed|already handled/i.test(e.message)) errors.push(e.name); }
      });
      await teacherPage.goto('http://localhost:5173/teacher/my-subjects');
      await teacherPage.locator('.teacher-subject-row').filter({ hasText: 'Advanced Database' }).click();
      const teacherCard = teacherPage.locator('.teacher-announcement-card').filter({ hasText: 'Welcome to Advanced Database!' });
      await teacherCard.getByRole('button', { name: '1 Like', exact: true }).click();
      await teacherCard.getByRole('button', { name: '2 Likes', exact: true }).waitFor();
      await teacherCard.getByRole('button', { name: '2 Comments' }).click();
      await teacherCard.getByText('Saved in the browser.', { exact: true }).waitFor();
      await teacherCard.getByLabel('Your comment').fill('Teacher browser reply.');
      await teacherCard.getByRole('button', { name: 'Post Comment' }).click();
      await teacherCard.getByText('Teacher browser reply.', { exact: true }).waitFor();
      await teacherPage.reload();
      await teacherPage.locator('.teacher-subject-row').filter({ hasText: 'Advanced Database' }).click();
      await teacherCard.getByRole('button', { name: '2 Likes', exact: true }).click();
      await teacherCard.getByRole('button', { name: '1 Like', exact: true }).waitFor();
      await teacherCard.getByRole('button', { name: '3 Comments' }).click();
      await teacherCard.getByText('Teacher browser reply.', { exact: true }).waitFor();
      await page.goto('http://localhost:5173/student/my-subjects/' + subject.id);
      await card.getByRole('button', { name: '3 Comments' }).click();
      await card.getByText('Teacher browser reply.', { exact: true }).waitFor();
      assert.deepEqual(errors, []);
      console.log('PASS: teacher like/unlike, student comments, teacher reply, reload persistence, and shared counts/content across both roles.');
      console.log('PASS: subject cards, announcements/materials, likes/comments/reload, downloads, mobile layout, dark mode, and removal of student subject editing.');
    }
  } finally {
    if (browser) { for (const c of browser.contexts()) for (const p of c.pages()) await p.unrouteAll({ behavior: 'ignoreErrors' }); await browser.close(); }
    if (server) await new Promise((resolve) => server.close(resolve));
    const ids = users.map((u) => u._id);
    await Booking.deleteMany({ teacher: { $in: ids } }); await Declined.deleteMany({ teacher: { $in: ids } }); await Slot.deleteMany({ teacher: { $in: ids } });
    await Subject.deleteMany({ teacherId: { $in: ids } }); await Profile.deleteMany({ user: { $in: ids } }); await cleanup(users); await User.deleteMany({ _id: { $in: ids } });
    for (const file of files) await fs.unlink(file).catch(() => {});
    await mongoose.disconnect();
  }
}
main().catch((e) => { console.error('Student subjects check failed:', e.name, e.message); process.exitCode = 1; });
