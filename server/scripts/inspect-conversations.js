require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

async function test() {
  await connectDB();
  const convs = await Conversation.find({});
  console.log('Conversations count:', convs.length);
  for (const c of convs) {
    const p1 = await User.findById(c.participants[0]);
    const p2 = await User.findById(c.participants[1]);
    console.log(`Conv ${c._id}:`);
    console.log(`  P1: ${c.participants[0]} -> ${p1 ? p1.name + ' (' + p1.email + ')' : 'NULL (DELETED)'}`);
    console.log(`  P2: ${c.participants[1]} -> ${p2 ? p2.name + ' (' + p2.email + ')' : 'NULL (DELETED)'}`);
  }
  process.exit(0);
}

test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
