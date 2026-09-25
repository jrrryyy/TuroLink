// Integration check for student work turn-in and teacher grading.
require('dotenv').config({ quiet: true });
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const express = require('express');
const { token } = require('./test-session');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Submission = require('../models/Submission');

async function testSubmissions() {
  assert(process.env.MONGO_URI, 'Configure MONGO_URI and JWT_SECRET.');
  let server;
  const users = [];

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'turolink_integration_checks',
      serverSelectionTimeoutMS: 8000,
    });

    const teacher = await User.create({
      emailVerifiedAt: new Date(),
      name: 'Professor Smith',
      email: new mongoose.Types.ObjectId() + '@example.invalid',
      phone: '09' + require('crypto').randomInt(1000000000).toString().padStart(9, '0'),
      password: 'password123',
      role: 'teacher',
    });
    users.push(teacher);

    const student1 = await User.create({
      emailVerifiedAt: new Date(),
      name: 'Alice Learner',
      email: new mongoose.Types.ObjectId() + '@example.invalid',
      phone: '09' + require('crypto').randomInt(1000000000).toString().padStart(9, '0'),
      password: 'password123',
      role: 'student',
    });
    users.push(student1);

    const student2 = await User.create({
      emailVerifiedAt: new Date(),
      name: 'Bob Slacker',
      email: new mongoose.Types.ObjectId() + '@example.invalid',
      phone: '09' + require('crypto').randomInt(1000000000).toString().padStart(9, '0'),
      password: 'password123',
      role: 'student',
    });
    users.push(student2);

    const subject = await Subject.create({
      teacherId: teacher._id,
      code: 'CS 101',
      title: 'Intro to Computer Science',
      enrolledStudents: [student1._id, student2._id],
      materials: [
        {
          title: 'Assignment 1: Algorithms',
          type: 'assignment',
          points: 100,
          dueAt: new Date(Date.now() + 86400000), // Due tomorrow (On time)
          status: 'posted',
          postedAt: new Date(),
        },
        {
          title: 'Assignment 2: Past Due',
          type: 'assignment',
          points: 50,
          dueAt: new Date(Date.now() - 3600000), // Due 1 hour ago (Late)
          status: 'posted',
          postedAt: new Date(Date.now() - 7200000),
        },
      ],
    });

    const mat1Id = subject.materials[0]._id;
    const mat2Id = subject.materials[1]._id;

    const app = express();
    app.use(express.json());
    app.use('/api/subjects', require('../routes/subjectRoutes'));
    app.use('/api/student-subjects', require('../routes/studentSubjectRoutes'));

    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;

    const call = async (url, method = 'GET', body, user = teacher) => {
      const isMultipart = body instanceof FormData;
      const headers = {};
      if (user) headers.Cookie = 'turolink_session=' + (await token(user));
      if (!isMultipart) headers['Content-Type'] = 'application/json';

      const response = await fetch(origin + url, {
        method,
        headers,
        body: body ? (isMultipart ? body : JSON.stringify(body)) : undefined,
      });

      let json = null;
      try {
        json = await response.json();
      } catch {
        // may be binary or empty
      }
      return { status: response.status, body: json, rawResponse: response };
    };

    console.log('1. Checking student detail embeds submission correctly...');
    const detailBefore = await call(`/api/student-subjects/${subject._id}`, 'GET', null, student1);
    assert.equal(detailBefore.status, 200);
    assert.equal(detailBefore.body.materials[0].submission, null);

    console.log('2. Student turning in on-time assignment with file attachment and note...');
    const form1 = new FormData();
    form1.append('text', 'Here is my homework.');
    form1.append('file', new Blob(['My homework algorithm solution'], { type: 'text/plain' }), 'homework.txt');

    const submitRes1 = await call(
      `/api/student-subjects/${subject._id}/materials/${mat1Id}/submission`,
      'POST',
      form1,
      student1
    );
    assert.equal(submitRes1.status, 201);
    assert.equal(submitRes1.body.status, 'submitted');
    assert.equal(submitRes1.body.isLate, false);
    assert.equal(submitRes1.body.attachmentName, 'homework.txt');
    assert.equal(submitRes1.body.text, 'Here is my homework.');

    console.log('3. Verifying student can download their own attachment...');
    const dlStudentRes = await fetch(
      `${origin}/api/student-subjects/${subject._id}/materials/${mat1Id}/submission/attachment`,
      {
        headers: { Cookie: 'turolink_session=' + (await token(student1)) },
      }
    );
    assert.equal(dlStudentRes.status, 200);
    assert.equal(await dlStudentRes.text(), 'My homework algorithm solution');

    console.log('4. Student turning in late assignment...');
    const form2 = new FormData();
    form2.append('text', 'Sorry for the delay.');
    form2.append('file', new Blob(['Late solution'], { type: 'text/plain' }), 'late.txt');

    const submitRes2 = await call(
      `/api/student-subjects/${subject._id}/materials/${mat2Id}/submission`,
      'POST',
      form2,
      student1
    );
    assert.equal(submitRes2.status, 201);
    assert.equal(submitRes2.body.isLate, true); // Marked late!

    console.log('5. Teacher viewing submissions for Assignment 1...');
    const teacherListRes = await call(
      `/api/subjects/${subject._id}/materials/${mat1Id}/submissions`,
      'GET',
      null,
      teacher
    );
    assert.equal(teacherListRes.status, 200);
    assert.equal(teacherListRes.body.counts.total, 2);
    assert.equal(teacherListRes.body.counts.turnedIn, 1);
    assert.equal(teacherListRes.body.counts.assigned, 1); // Student 2 not turned in yet

    const aliceSub = teacherListRes.body.submissions.find((s) => s.student.name === 'Alice Learner');
    assert(aliceSub);
    assert.equal(aliceSub.status, 'submitted');
    assert.equal(aliceSub.isLate, false);
    assert.equal(aliceSub.attachmentName, 'homework.txt');

    console.log('6. Teacher downloading student attachment...');
    const dlTeacherRes = await fetch(
      `${origin}/api/subjects/${subject._id}/materials/${mat1Id}/submissions/${aliceSub._id}/attachment`,
      {
        headers: { Cookie: 'turolink_session=' + (await token(teacher)) },
      }
    );
    assert.equal(dlTeacherRes.status, 200);
    assert.equal(await dlTeacherRes.text(), 'My homework algorithm solution');

    console.log('7. Teacher grading student submission...');
    const gradeRes = await call(
      `/api/subjects/${subject._id}/materials/${mat1Id}/submissions/${aliceSub._id}/grade`,
      'POST',
      { grade: 98, feedback: 'Excellent algorithm complexity analysis!' },
      teacher
    );
    assert.equal(gradeRes.status, 200);
    assert.equal(gradeRes.body.status, 'graded');
    assert.equal(gradeRes.body.grade, 98);
    assert.equal(gradeRes.body.feedback, 'Excellent algorithm complexity analysis!');

    console.log('8. Verifying student view shows graded state and remarks...');
    const detailAfter = await call(`/api/student-subjects/${subject._id}`, 'GET', null, student1);
    assert.equal(detailAfter.status, 200);
    const mat1After = detailAfter.body.materials.find((m) => m._id === String(mat1Id));
    assert(mat1After.submission);
    assert.equal(mat1After.submission.status, 'graded');
    assert.equal(mat1After.submission.grade, 98);
    assert.equal(mat1After.submission.feedback, 'Excellent algorithm complexity analysis!');

    console.log('9. Verifying unsubmit is blocked when already graded...');
    const unsubmitBlocked = await call(
      `/api/student-subjects/${subject._id}/materials/${mat1Id}/submission`,
      'DELETE',
      null,
      student1
    );
    assert.equal(unsubmitBlocked.status, 400);

    console.log('10. Verifying unsubmit is allowed when not graded...');
    const unsubmitAllowed = await call(
      `/api/student-subjects/${subject._id}/materials/${mat2Id}/submission`,
      'DELETE',
      null,
      student1
    );
    assert.equal(unsubmitAllowed.status, 200);

    const detailAfterUnsubmit = await call(`/api/student-subjects/${subject._id}`, 'GET', null, student1);
    const mat2After = detailAfterUnsubmit.body.materials.find((m) => m._id === String(mat2Id));
    assert.equal(mat2After.submission, null);

    console.log('✅ ALL SUBMISSION AND GRADING TESTS PASSED SUCCESSFULLY!');
  } finally {
    if (server) server.close();
    for (const u of users) {
      await User.deleteOne({ _id: u._id }).catch(() => {});
    }
    await Subject.deleteMany({ code: 'CS 101' }).catch(() => {});
    await Submission.deleteMany({}).catch(() => {});
    await mongoose.disconnect().catch(() => {});
  }
}

testSubmissions()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
