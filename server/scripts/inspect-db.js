require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const Subject = require('../models/Subject');

async function inspect() {
  await connectDB();
  console.log('Connected to DB');

  const users = await User.find({}).select('name email role profilePicture').lean();
  console.log('Found', users.length, 'users:');
  for (const u of users) {
    console.log(`- ${u.name} (${u.email}) [${u.role}]: profilePicture="${u.profilePicture}"`);
  }

  process.exit(0);
}

inspect().catch(err => {
  console.error('Inspect error:', err);
  process.exit(1);
});
