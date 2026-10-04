require('dotenv').config();
const connectDB = require('../config/db');
const Subject = require('../models/Subject');
const User = require('../models/User');
const { saveMaterial } = require('../controllers/materialController');

async function test() {
  await connectDB();
  const subject = await Subject.findOne({ code: /ITE 455/i });
  const teacher = await User.findById(subject.teacherId);

  const mockReq = {
    user: teacher,
    params: { id: subject._id.toString() },
    file: {
      buffer: Buffer.from('fake image content png'),
      mimetype: 'image/png',
      originalname: 'test_drawing.png',
      size: 22,
    },
    body: {
      title: 'Drawing with Image',
      type: 'assignment',
      points: '100',
      dueAt: '',
      scheduledAt: '',
      status: 'posted',
      recipientStudents: JSON.stringify([]),
      removeAttachment: 'false',
    },
  };

  let responseData = null;
  let responseStatus = 200;
  const mockRes = {
    status(code) { responseStatus = code; return this; },
    json(data) { responseData = data; return this; },
  };

  console.log('Calling saveMaterial with file...');
  await saveMaterial(mockReq, mockRes);
  console.log('Response status:', responseStatus);
  console.log('Response data:', responseData);
  process.exit(0);
}

test().catch(err => {
  console.error('Test error caught:', err);
  process.exit(1);
});
