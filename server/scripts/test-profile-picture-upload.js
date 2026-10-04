require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const User = require('../models/User');
const { updateAccount } = require('../controllers/accountController');
const cloudStorage = require('../services/cloudStorage');

async function run() {
  console.log('--- Testing Profile Picture Upload to Cloud Storage ---');
  await mongoose.connect(process.env.MONGO_URI);

  const testUser = await User.findOne({ email: 'jeba.yulo.up@phinmaed.com' });
  if (!testUser) throw new Error('User not found');

  const oldPicture = testUser.profilePicture;
  console.log('Original profilePicture in DB:', oldPicture);

  // 1x1 valid PNG buffer
  const samplePng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  let responseData = null;
  let responseStatus = 200;
  const fakeReq = {
    user: testUser,
    body: { name: testUser.name, bio: testUser.bio || '', sex: testUser.sex || '' },
    file: {
      buffer: samplePng,
      mimetype: 'image/png',
      originalname: 'avatar.png',
      size: samplePng.length,
    },
  };
  const fakeRes = {
    status(s) { responseStatus = s; return this; },
    json(d) { responseData = d; return this; },
  };

  console.log('\nUploading new profile picture...');
  await updateAccount(fakeReq, fakeRes);
  console.log('Response Status:', responseStatus);
  console.log('New Profile Picture URL:', responseData?.user?.profilePicture);

  if (!responseData?.user?.profilePicture?.startsWith('https://res.cloudinary.com/')) {
    throw new Error('Profile picture was not saved to Cloudinary!');
  }

  // Verify in MongoDB
  const updatedUser = await User.findById(testUser._id).lean();
  console.log('Verified profilePicture in MongoDB Atlas:', updatedUser.profilePicture);

  if (!updatedUser.profilePicture.startsWith('https://res.cloudinary.com/')) {
    throw new Error('MongoDB does not have the Cloudinary URL!');
  }

  console.log('\n--- Profile Picture Successfully Saved to Cloudinary! ---');
  process.exit(0);
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
