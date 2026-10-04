require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Session = require('../models/AuthSession');
const crypto = require('crypto');

async function test() {
  await connectDB();
  const subject = await Subject.findOne({ code: /ITE 455/i });
  const teacher = await User.findById(subject.teacherId);
  console.log('Teacher:', teacher.email, 'Subject:', subject._id);

  // Create a temporary session to authenticate with the running server
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  await Session.create({
    user: teacher._id,
    tokenHash: tokenHash,
    expiresAt: new Date(Date.now() + 3600000),
  });

  const cookieHeader = `turolink_session=${rawToken}`;

  // 1. Test GET /api/subjects/:id/materials
  console.log('\n--- 1. Testing GET /api/subjects/:id/materials ---');
  const getRes = await fetch(`http://localhost:5000/api/subjects/${subject._id}/materials`, {
    headers: {
      'Cookie': cookieHeader,
      'X-TuroLink-Request': '1',
    },
  });
  console.log('GET status:', getRes.status);
  const getText = await getRes.text();
  console.log('GET body:', getText.slice(0, 300));

  // 2. Test POST /api/subjects/:id/materials with multipart form-data
  console.log('\n--- 2. Testing POST /api/subjects/:id/materials ---');
  const boundary = '----WebKitFormBoundary' + crypto.randomBytes(8).toString('hex');
  const postData = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="title"',
    '',
    'Test Drawing from Script',
    `--${boundary}`,
    'Content-Disposition: form-data; name="type"',
    '',
    'assignment',
    `--${boundary}`,
    'Content-Disposition: form-data; name="points"',
    '',
    '100',
    `--${boundary}`,
    'Content-Disposition: form-data; name="dueAt"',
    '',
    '',
    `--${boundary}`,
    'Content-Disposition: form-data; name="status"',
    '',
    'posted',
    `--${boundary}`,
    'Content-Disposition: form-data; name="recipientStudents"',
    '',
    '[]',
    `--${boundary}`,
    'Content-Disposition: form-data; name="removeAttachment"',
    '',
    'false',
    `--${boundary}`,
    'Content-Disposition: form-data; name="attachment"; filename="drawing.png"',
    'Content-Type: image/png',
    '',
    'fake PNG binary data',
    `--${boundary}--`,
    '',
  ].join('\r\n');

  const postRes = await fetch(`http://localhost:5000/api/subjects/${subject._id}/materials`, {
    method: 'POST',
    headers: {
      'Cookie': cookieHeader,
      'X-TuroLink-Request': '1',
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: postData,
  });
  console.log('POST status:', postRes.status);
  const postText = await postRes.text();
  console.log('POST body:', postText);

  process.exit(0);
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
