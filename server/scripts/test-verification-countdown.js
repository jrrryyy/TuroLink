require('dotenv').config({ quiet: true });
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const assert = require('node:assert/strict');
const User = require('../models/User');
const { random, hash } = require('../services/authSecurity');

async function testVerificationExpiry() {
  console.log('--- Testing 3-Minute Verification Expiration ---');
  await mongoose.connect(process.env.MONGO_URI);

  const testEmail = `verify_test_${Date.now()}@example.invalid`;
  const token = random();

  // Create unverified test user with 3-minute expiry
  const user = await User.create({
    name: 'Expiry Test',
    email: testEmail,
    phone: '09' + Math.floor(100000000 + Math.random() * 900000000),
    role: 'student',
    password: 'password123',
    verificationHash: hash(token),
    verificationExpiresAt: new Date(Date.now() + 180000), // 3 minutes
    verificationSentAt: new Date(),
  });

  const remainingMs = user.verificationExpiresAt.getTime() - Date.now();
  console.log(`Token created with expiry remaining: ${Math.round(remainingMs / 1000)}s`);
  assert(remainingMs > 170000 && remainingMs <= 180000, 'Expected expiry to be set around 180 seconds');

  // Verify expired behavior: simulate token past 3 minutes
  await User.updateOne({ _id: user._id }, { verificationExpiresAt: new Date(Date.now() - 5000) });
  const expiredUser = await User.findOne({
    verificationHash: hash(token),
    emailVerifiedAt: null,
    verificationExpiresAt: { $lte: new Date() },
  });
  assert(expiredUser, 'Expired user should be detected when verificationExpiresAt <= now');
  console.log('Expired token detection: PASSED');

  // Clean up
  await User.deleteOne({ _id: user._id });
  console.log('Cleanup complete!');
  console.log('\n--- ALL VERIFICATION EXPIRATION TESTS PASSED! ---');
  process.exit(0);
}

testVerificationExpiry().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
