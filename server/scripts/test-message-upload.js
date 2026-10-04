require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Session = require('../models/AuthSession');
const crypto = require('crypto');

async function test() {
  await connectDB();
  const conv = await Conversation.findById('6ac1dcf31f0f7dc7b7136ab0');
  console.log('Conv:', conv._id);

  const teacher = await User.findById(conv.participants[1]); // Ashley
  console.log('Sender:', teacher.name, teacher.email);

  // Authenticate as teacher
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  await Session.create({
    user: teacher._id,
    tokenHash: tokenHash,
    expiresAt: new Date(Date.now() + 3600000),
  });

  const cookieHeader = `turolink_session=${rawToken}`;

  // Send message with image attachment
  const boundary = '----WebKitFormBoundary' + crypto.randomBytes(8).toString('hex');
  const postData = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="text"',
    '',
    'Here is an image for you!',
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="sample_photo.jpg"',
    'Content-Type: image/jpeg',
    '',
    'fake JPEG data here',
    `--${boundary}--`,
    '',
  ].join('\r\n');

  console.log('Sending message with image to conversation...');
  const res = await fetch(`http://localhost:5000/api/messages/conversations/${conv._id}`, {
    method: 'POST',
    headers: {
      'Cookie': cookieHeader,
      'X-TuroLink-Request': '1',
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: postData,
  });

  console.log('Status:', res.status);
  const data = await res.text();
  console.log('Response body:', data);

  process.exit(0);
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
