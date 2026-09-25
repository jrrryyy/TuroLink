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
  for (const [route, module] of [['courses', 'course'], ['auth', 'auth'], ['teacher', 'teacher'], ['subjects', 'subject'], ['tutors', 'tutor'], ['student', 'student'], ['student-subjects', 'studentSubject'], ['notifications', 'notification']]) app.use(`/api/${route}`, require(`../routes/${module}Routes`));
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = require(path.join(process.env.TEMP, 'turolink-browser-check/node_modules/playwright'));
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
  await browserCookie(context, student);
  const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await context.route('**/api/**', async route => { try { const url = new URL(route.request().url()); const response = await route.fetch({ url: origin + url.pathname + url.search }); await route.fulfill({ response }); } catch (e) { if (!/closed|disposed|already handled/.test(e.message)) throw e; } });

  await page.goto('http://localhost:5173/dashboard');
  await page.getByRole('heading', {name:'Welcome Back, Roven!'}).waitFor();
  await page.locator('.student-course-row').first().waitFor();
  assert.equal(await page.locator('.student-course-row').count(),2);
  await page.screenshot({path:path.join(process.env.TEMP,'student-modern-dashboard.png'),fullPage:true});
  await page.getByRole('button',{name:'Session Details',exact:true}).click();
  await page.getByRole('dialog').waitFor();
  await page.getByRole('button',{name:'Close session details'}).click();
  await page.locator('.student-course-row').filter({hasText:'Mathematics'}).click();
  await page.getByRole('button',{name:'Open sidebar'}).click();
  assert.equal(await page.getByRole('button',{name:'My Subjects',exact:true}).getAttribute('aria-current'),'page');
  await page.getByRole('button',{name:'Close sidebar',exact:true}).first().click();
  await page.getByRole('button',{name:'0 Comments'}).click();
  await page.getByLabel('Your comment').fill('Looking forward to our lesson.');
  await page.getByRole('button',{name:'Post Comment'}).click();
  await page.getByText('Looking forward to our lesson.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'0 Likes'}).click();
  await page.getByRole('button',{name:'1 Like',exact:true}).waitFor();
  await page.getByRole('button',{name:'Materials',exact:true}).click();
  await page.getByText('Your first learning module',{exact:false}).waitFor();
  await page.goto('http://localhost:5173/student/settings');
  await page.getByRole('textbox',{name:'Search subjects',exact:true}).fill('Database');
  await page.getByRole('textbox',{name:'Search subjects',exact:true}).press('Enter');
  await page.locator('.subject-feed-card').first().waitFor();
  assert.equal(await page.locator('.subject-feed-card').count(),1);
  await page.getByText('Advanced Database',{exact:true}).waitFor();
  await page.goto('http://localhost:5173/dashboard');
  await page.getByRole('switch',{name:'Toggle dark mode'}).click();
  await page.locator('.student-layout.dark-dashboard-layout').waitFor();
  await page.locator('.student-course-row').first().waitFor();
  await page.waitForTimeout(350);
  assert.equal(await page.locator('.dashboard-layout-content').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(23, 34, 29)');
  await page.screenshot({path:path.join(process.env.TEMP,'student-modern-dark.png'),fullPage:true});
  for(const route of ['dashboard','student/my-subjects','student/find-tutors','student/tutors/'+teacher.id,'student/schedules','student/rate-tutors','student/settings']){
    await page.setViewportSize({width:390,height:844});
    await page.goto('http://localhost:5173/'+route);
    await page.locator('.student-layout.dark-dashboard-layout').waitFor();
    await page.waitForTimeout(450);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile overflow: '+route);
  }
  await page.goto('http://localhost:5173/dashboard');
  await page.locator('.student-course-row').first().waitFor();
  await page.screenshot({path:path.join(process.env.TEMP,'student-modern-mobile.png'),fullPage:true});
  assert.deepEqual(errors, []);
  await context.unrouteAll({ behavior: 'ignoreErrors' }); await context.close();
  console.log('PASS: student dashboard, direct subject links, active sidebar, comments, likes, materials, header search, persistent dark mode, and seven mobile pages.');
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close(); if (server) await new Promise(resolve => server.close(resolve));
  if (mongoose.connection.readyState === 1) {
    const ids = users.map(u => u._id); await cleanup(users); await Booking.deleteMany({ teacher: { $in: ids } }); await Subject.deleteMany({ teacherId: { $in: ids } }); await Profile.deleteMany({ user: { $in: ids } }); await User.deleteMany({ _id: { $in: ids } }); await mongoose.disconnect();
  }
});
