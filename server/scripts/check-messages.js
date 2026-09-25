require('dotenv').config({ quiet: true });
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const express = require('express');

const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Subject = require('../models/Subject');
const { token, cleanup } = require('./test-session');

const users = [];
let server;

async function main() {
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: 'turolink_integration_checks',
    serverSelectionTimeoutMS: 10000,
  });

  await Promise.all([User.init(), Conversation.init(), Message.init()]);

  // Create test teacher, test student, and third-party outsider
  for (const role of ['teacher', 'student', 'student']) {
    users.push(
      await User.create({
        name: `Message Test ${role} ${Date.now()}`,
        role,
        emailVerifiedAt: new Date(),
        email: `${new mongoose.Types.ObjectId()}@example.invalid`,
        phone: '09' + require('crypto').randomInt(1000000000).toString().padStart(9, '0'),
        password: 'unused-test-hash',
      })
    );
  }

  const [teacher, student, outsider] = users;

  // Create subject where student is enrolled with teacher
  const subject = await Subject.create({
    code: 'MSG101',
    title: 'Messaging Fundamentals',
    teacherId: teacher._id,
    enrolledStudents: [student._id],
  });

  const app = express();
  app.use(express.json());
  app.use('/api', require('../services/authSecurity').csrf);
  app.use('/api/messages', require('../routes/messageRoutes'));

  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;

  const call = async (user, url, method = 'GET', body) => {
    const response = await fetch(origin + '/api' + url, {
      method,
      headers: {
        Origin: 'http://localhost:5173',
        'X-TuroLink-Request': '1',
        'Content-Type': 'application/json',
        ...(user ? { Cookie: 'turolink_session=' + (await token(user)) } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json() };
  };

  // 1. Unauthenticated access should be denied
  assert.equal((await call(null, '/messages/conversations')).status, 401);

  // 2. Student checks contacts - teacher should be listed
  const studentContacts = await call(student, '/messages/contacts');
  assert.equal(studentContacts.status, 200);
  assert(studentContacts.data.some((c) => c._id === teacher._id.toString()));

  // 3. Teacher checks contacts - student should be listed
  const teacherContacts = await call(teacher, '/messages/contacts');
  assert.equal(teacherContacts.status, 200);
  assert(teacherContacts.data.some((c) => c._id === student._id.toString()));

  // 4. Student creates/opens conversation with teacher
  const convRes = await call(student, '/messages/conversations', 'POST', {
    recipientId: teacher._id.toString(),
  });
  assert.equal(convRes.status, 200);
  const conversationId = convRes.data._id;
  assert(conversationId);
  assert.equal(convRes.data.otherParticipant._id, teacher._id.toString());

  // 5. Student sends a message to teacher
  const sendRes = await call(student, `/messages/conversations/${conversationId}`, 'POST', {
    text: 'Hello teacher! I have a question about MSG101.',
  });
  assert.equal(sendRes.status, 201);
  assert.equal(sendRes.data.text, 'Hello teacher! I have a question about MSG101.');

  // 6. Teacher checks conversations list - should have 1 unread message
  const teacherConvs = await call(teacher, '/messages/conversations');
  assert.equal(teacherConvs.status, 200);
  const teacherConv = teacherConvs.data.find((c) => c._id === conversationId);
  assert(teacherConv);
  assert.equal(teacherConv.unreadCount, 1);
  assert.equal(teacherConv.lastMessage, 'Hello teacher! I have a question about MSG101.');

  // 7. Outsider tries to access conversation - should be 403 Forbidden
  const outsiderCheck = await call(outsider, `/messages/conversations/${conversationId}`);
  assert.equal(outsiderCheck.status, 403);

  // 8. Teacher opens conversation - message is marked as read, unread count resets
  const teacherDetail = await call(teacher, `/messages/conversations/${conversationId}`);
  assert.equal(teacherDetail.status, 200);
  assert.equal(teacherDetail.data.messages.length, 1);

  const teacherConvsAfterRead = await call(teacher, '/messages/conversations');
  const teacherConvAfterRead = teacherConvsAfterRead.data.find((c) => c._id === conversationId);
  assert.equal(teacherConvAfterRead.unreadCount, 0);

  // 9. Teacher replies to student
  const replyRes = await call(teacher, `/messages/conversations/${conversationId}`, 'POST', {
    text: 'Hi! Happy to help, what is your question?',
  });
  assert.equal(replyRes.status, 201);

  // 10. Student opens conversation and sees both messages
  const studentDetail = await call(student, `/messages/conversations/${conversationId}`);
  assert.equal(studentDetail.status, 200);
  assert.equal(studentDetail.data.messages.length, 2);

  // Cleanup
  await Message.deleteMany({ conversationId });
  await Conversation.deleteOne({ _id: conversationId });
  await Subject.deleteOne({ _id: subject._id });

  console.log('PASS: Messages integration tests passed (conversations, chat history, unread counts, access control, contacts).');
}

main()
  .catch((e) => {
    console.error('Messages check failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server) await new Promise((r) => server.close(r));
    await cleanup(users);
    await mongoose.disconnect();
  });
