// Run from server directory: node scripts/check-recipient-visibility.js
require('dotenv').config({ quiet: true });
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const express = require('express');
const { token, cleanup } = require('./test-session');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Submission = require('../models/Submission');
const subjectRoutes = require('../routes/subjectRoutes');
const studentSubjectRoutes = require('../routes/studentSubjectRoutes');

async function main() {
  assert(process.env.MONGO_URI, 'MONGO_URI is required.');
  const users = [];
  let server;

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'turolink_integration_checks',
      serverSelectionTimeoutMS: 10000,
    });

    // 1 Teacher, 2 Students
    const teacher = await User.create({
      emailVerifiedAt: new Date(),
      name: 'Teacher Ashley',
      email: `${new mongoose.Types.ObjectId()}@example.invalid`,
      phone: '09' + require('crypto').randomInt(1000000000).toString().padStart(9, '0'),
      password: 'fixture-password',
      role: 'teacher',
    });
    users.push(teacher);

    const studentA = await User.create({
      emailVerifiedAt: new Date(),
      name: 'Student Alice',
      email: `${new mongoose.Types.ObjectId()}@example.invalid`,
      phone: '09' + require('crypto').randomInt(1000000000).toString().padStart(9, '0'),
      password: 'fixture-password',
      role: 'student',
    });
    users.push(studentA);

    const studentB = await User.create({
      emailVerifiedAt: new Date(),
      name: 'Student Bob',
      email: `${new mongoose.Types.ObjectId()}@example.invalid`,
      phone: '09' + require('crypto').randomInt(1000000000).toString().padStart(9, '0'),
      password: 'fixture-password',
      role: 'student',
    });
    users.push(studentB);

    // Express app setup
    const app = express();
    app.use(express.json());
    app.use('/api/subjects', subjectRoutes);
    app.use('/api/student-subjects', studentSubjectRoutes);

    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;

    const call = async (url, method = 'GET', body, user = teacher) => {
      const response = await fetch(origin + url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(user ? { Cookie: 'turolink_session=' + (await token(user)) } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await response.json().catch(() => null);
      return { status: response.status, body: data };
    };

    // 1. Create a subject with both studentA and studentB enrolled
    const subjectRes = await call('/api/subjects', 'POST', {
      code: 'BIO 101',
      title: 'General Biology',
    }, teacher);
    assert.equal(subjectRes.status, 201);
    const subjectId = subjectRes.body._id;

    // Enroll both students
    await Subject.updateOne(
      { _id: subjectId },
      { $addToSet: { enrolledStudents: { $each: [studentA._id, studentB._id] } } }
    );

    // Verify teacher reads populated enrolledStudents
    const teacherSubject = await call(`/api/subjects/${subjectId}`, 'GET', undefined, teacher);
    assert.equal(teacherSubject.status, 200);
    assert.equal(teacherSubject.body.enrolledStudents.length, 2);
    assert.equal(typeof teacherSubject.body.enrolledStudents[0].name, 'string');

    // -------------------------------------------------------------
    // Test 1: Announcement targeted to Student A ONLY
    // -------------------------------------------------------------
    const annRes = await call(`/api/subjects/${subjectId}/announcements`, 'POST', {
      content: 'Private announcement for Student A only',
      recipientStudents: [studentA._id],
    }, teacher);
    assert.equal(annRes.status, 201);
    const annId = annRes.body.announcement._id;

    // Student A checks subject detail
    const aDetail = await call(`/api/student-subjects/${subjectId}`, 'GET', undefined, studentA);
    assert.equal(aDetail.status, 200);
    assert(aDetail.body.announcements.some((a) => a._id === annId), 'Student A should see the announcement');

    // Student B checks subject detail
    const bDetail = await call(`/api/student-subjects/${subjectId}`, 'GET', undefined, studentB);
    assert.equal(bDetail.status, 200);
    assert(!bDetail.body.announcements.some((a) => a._id === annId), 'Student B must NOT see the announcement');

    // Student B attempts to like the restricted announcement -> 404
    const bLike = await call(`/api/student-subjects/${subjectId}/announcements/${annId}/like`, 'PUT', { liked: true }, studentB);
    assert.equal(bLike.status, 404);

    // Student B attempts to comment on the restricted announcement -> 404
    const bComment = await call(`/api/student-subjects/${subjectId}/announcements/${annId}/comments`, 'POST', { text: 'Sneaking in' }, studentB);
    assert.equal(bComment.status, 404);

    // Student A likes and comments -> should succeed
    const aLike = await call(`/api/student-subjects/${subjectId}/announcements/${annId}/like`, 'PUT', { liked: true }, studentA);
    assert.equal(aLike.status, 200);

    const aComment = await call(`/api/student-subjects/${subjectId}/announcements/${annId}/comments`, 'POST', { text: 'Thank you Teacher!' }, studentA);
    assert.equal(aComment.status, 201);

    // -------------------------------------------------------------
    // Test 2: Material (Assignment) targeted to Student B ONLY
    // -------------------------------------------------------------
    const matRes = await call(`/api/subjects/${subjectId}/materials`, 'POST', {
      title: 'Lab Exercise 1 (Special)',
      instructions: 'Complete special lab assignment.',
      type: 'assignment',
      points: 100,
      status: 'posted',
      recipientStudents: [studentB._id],
    }, teacher);
    assert.equal(matRes.status, 201);
    const matId = matRes.body._id;

    // Student B sees material
    const bDetail2 = await call(`/api/student-subjects/${subjectId}`, 'GET', undefined, studentB);
    assert(bDetail2.body.materials.some((m) => m._id === matId), 'Student B should see the material');

    // Student A does NOT see material
    const aDetail2 = await call(`/api/student-subjects/${subjectId}`, 'GET', undefined, studentA);
    assert(!aDetail2.body.materials.some((m) => m._id === matId), 'Student A must NOT see the material');

    // Student A attempts to submit work to the restricted material -> 403
    const aSubmit = await call(`/api/student-subjects/${subjectId}/materials/${matId}/submission`, 'POST', { text: 'My work' }, studentA);
    assert.equal(aSubmit.status, 403);

    // Student B submits work -> 201
    const bSubmit = await call(`/api/student-subjects/${subjectId}/materials/${matId}/submission`, 'POST', { text: 'Student B completed work' }, studentB);
    assert.equal(bSubmit.status, 201);

    // Teacher checks submissions for this material:
    // Roster should only include Student B (total: 1), not Student A
    const subList = await call(`/api/subjects/${subjectId}/materials/${matId}/submissions`, 'GET', undefined, teacher);
    assert.equal(subList.status, 200);
    assert.equal(subList.body.counts.total, 1, 'Submissions total count must only include targeted students');
    assert.equal(subList.body.submissions.length, 1);
    assert.equal(subList.body.submissions[0].student.name, 'Student Bob');
    assert.equal(subList.body.submissions[0].status, 'submitted');

    // -------------------------------------------------------------
    // Test 3: Announcement and Material for "All Students" ([])
    // -------------------------------------------------------------
    const allAnn = await call(`/api/subjects/${subjectId}/announcements`, 'POST', {
      content: 'General announcement for everyone',
      recipientStudents: [],
    }, teacher);
    assert.equal(allAnn.status, 201);

    const allMat = await call(`/api/subjects/${subjectId}/materials`, 'POST', {
      title: 'Midterm Project',
      instructions: 'Everyone complete this.',
      type: 'assignment',
      points: 100,
      status: 'posted',
      recipientStudents: [],
    }, teacher);
    assert.equal(allMat.status, 201);

    const aDetail3 = await call(`/api/student-subjects/${subjectId}`, 'GET', undefined, studentA);
    const bDetail3 = await call(`/api/student-subjects/${subjectId}`, 'GET', undefined, studentB);

    assert(aDetail3.body.announcements.some((a) => a._id === allAnn.body.announcement._id), 'A sees general announcement');
    assert(bDetail3.body.announcements.some((a) => a._id === allAnn.body.announcement._id), 'B sees general announcement');
    assert(aDetail3.body.materials.some((m) => m._id === allMat.body._id), 'A sees general material');
    assert(bDetail3.body.materials.some((m) => m._id === allMat.body._id), 'B sees general material');

    console.log('PASS: Student-specific visibility for announcements and materials, access control for likes/comments/submissions, and teacher submissions list filtering.');
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (users.length) {
      await Subject.deleteMany({ teacherId: { $in: users.map((u) => u._id) } });
      await Submission.deleteMany({ studentId: { $in: users.map((u) => u._id) } });
      await cleanup(users);
      await User.deleteMany({ _id: { $in: users.map((u) => u._id) } });
    }
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exitCode = 1;
});
