require('dotenv').config({ quiet: true });
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const assert = require('node:assert/strict');
const Subject = require('../models/Subject');
const Submission = require('../models/Submission');
const User = require('../models/User');
const { saveMaterial } = require('../controllers/materialController');
const { submitWork } = require('../controllers/submissionController');

async function testLateSubmissionPolicy() {
  console.log('--- Testing Late Submission Policy ---');
  await mongoose.connect(process.env.MONGO_URI);

  // Find a teacher and student
  const teacher = await User.findOne({ role: 'teacher' });
  const student = await User.findOne({ role: 'student' });
  if (!teacher || !student) throw new Error('Teacher or Student not found in DB');

  // Find or create a test subject
  let subject = await Subject.findOne({ teacherId: teacher._id });
  if (!subject) {
    subject = await Subject.create({
      code: 'TEST 101',
      title: 'Automated Test Subject',
      teacherId: teacher._id,
      enrolledStudents: [student._id],
    });
  } else if (!subject.enrolledStudents.some((id) => id.toString() === student._id.toString())) {
    subject.enrolledStudents.push(student._id);
    await subject.save();
  }

  // 1. Create a material with allowLateSubmissions: false and past due date
  console.log('1. Creating material with allowLateSubmissions: false and past due date...');
  const pastDueDate = new Date(Date.now() - 3600 * 1000); // 1 hour ago
  subject.materials.push({
    title: 'Strict Assignment',
    type: 'assignment',
    instructions: 'Turn in before deadline only',
    dueAt: pastDueDate,
    allowLateSubmissions: false,
    status: 'posted',
    postedAt: new Date(Date.now() - 7200 * 1000),
  });
  await subject.save();
  const strictMaterial = subject.materials[subject.materials.length - 1];
  assert.equal(strictMaterial.allowLateSubmissions, false);
  console.log('Strict material created successfully with allowLateSubmissions: false');

  // 2. Test student submission on strict material (should fail with 403)
  console.log('2. Testing student submission on strict material past due date...');
  let errorStatus = null;
  let errorMessage = '';
  const fakeReq1 = {
    params: { id: subject._id.toString(), materialId: strictMaterial._id.toString() },
    user: student,
    body: { text: 'My late attempt' },
  };
  const fakeRes1 = {
    status(s) { errorStatus = s; return this; },
    json(d) { errorMessage = d.message; return this; },
  };

  await submitWork(fakeReq1, fakeRes1);
  console.log(`Response Status: ${errorStatus}, Message: "${errorMessage}"`);
  assert.equal(errorStatus, 403, 'Expected 403 Forbidden for late submission on closed assignment');
  assert(errorMessage.includes('late submissions are closed'), 'Expected error message to mention closed late submissions');
  console.log('PASSED: Late submission was correctly blocked!');

  // 3. Create a material with allowLateSubmissions: true and past due date
  console.log('\n3. Creating material with allowLateSubmissions: true and past due date...');
  subject.materials.push({
    title: 'Flexible Assignment',
    type: 'assignment',
    instructions: 'Late submissions allowed',
    dueAt: pastDueDate,
    allowLateSubmissions: true,
    status: 'posted',
    postedAt: new Date(Date.now() - 7200 * 1000),
  });
  await subject.save();
  const flexibleMaterial = subject.materials[subject.materials.length - 1];
  assert.equal(flexibleMaterial.allowLateSubmissions, true);

  // 4. Test student submission on flexible material (should succeed with isLate: true)
  console.log('4. Testing student submission on flexible material past due date...');
  let successStatus = 200;
  let successData = null;
  const fakeReq2 = {
    params: { id: subject._id.toString(), materialId: flexibleMaterial._id.toString() },
    user: student,
    body: { text: 'My allowed late submission' },
  };
  const fakeRes2 = {
    status(s) { successStatus = s; return this; },
    json(d) { successData = d; return this; },
  };

  await submitWork(fakeReq2, fakeRes2);
  console.log(`Response Status: ${successStatus}, isLate: ${successData?.isLate}`);
  assert.equal(successStatus, 201);
  assert.equal(successData?.isLate, true, 'Expected submission to be flagged as isLate: true');
  console.log('PASSED: Submission succeeded and is correctly marked as isLate: true');

  // Clean up test materials & submission
  console.log('\n5. Cleaning up test data...');
  subject.materials.pull(strictMaterial._id);
  subject.materials.pull(flexibleMaterial._id);
  await subject.save();
  await Submission.deleteMany({ materialId: { $in: [strictMaterial._id, flexibleMaterial._id] } });
  console.log('Cleanup complete!');

  console.log('\n--- ALL LATE SUBMISSION POLICY TESTS PASSED! ---');
  process.exit(0);
}

testLateSubmissionPolicy().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
