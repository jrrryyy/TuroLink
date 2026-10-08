const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const TeacherProfile = require('../models/TeacherProfile');

async function testTeacherVerification() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('Connected to MongoDB Atlas successfully.');

    // 1. Inspect all current teacher profiles
    const allProfiles = await TeacherProfile.find().lean();
    console.log(`Total TeacherProfile records found: ${allProfiles.length}`);

    const userIds = allProfiles.map((p) => p.user);
    const existingUsers = await User.find({ _id: { $in: userIds } }).select('_id name email role').lean();
    const userMap = new Map(existingUsers.map((u) => [String(u._id), u]));

    const orphaned = [];
    const valid = [];
    for (const p of allProfiles) {
      const u = userMap.get(String(p.user));
      if (!u) {
        orphaned.push(p._id);
        console.log(`[ORPHANED] User was deleted: profileId=${p._id}, degreeTitle="${p.degreeTitle}"`);
      } else {
        valid.push({ profileId: p._id, user: u.email, role: u.role, isVerified: p.isVerified });
        console.log(`[VALID] ${u.name} (${u.email}) [role: ${u.role}], isVerified: ${p.isVerified}`);
      }
    }

    // 2. Prune orphaned profiles
    if (orphaned.length > 0) {
      const delResult = await TeacherProfile.deleteMany({ _id: { $in: orphaned } });
      console.log(`Successfully deleted ${delResult.deletedCount} orphaned profiles from database!`);
    } else {
      console.log('No orphaned profiles to delete.');
    }

    // 3. Test saving isVerified on a valid profile
    const teacherUser = existingUsers.find((u) => u.role === 'teacher');
    if (teacherUser) {
      const prof = await TeacherProfile.findOne({ user: teacherUser._id });
      if (prof) {
        console.log(`Testing verification toggle on teacher: ${teacherUser.name} (${teacherUser.email})`);
        const initialStatus = Boolean(prof.isVerified);
        prof.isVerified = true;
        prof.verificationReviewedAt = new Date();
        await prof.save();

        const reloaded = await TeacherProfile.findById(prof._id).lean();
        console.log(`After save - isVerified in DB: ${reloaded.isVerified}`);
        if (reloaded.isVerified === true) {
          console.log('PASS: isVerified successfully persisted to MongoDB!');
        } else {
          console.error('FAIL: isVerified was not saved!');
        }

        // Restore initial status
        prof.isVerified = initialStatus;
        await prof.save();
      }
    }

    await mongoose.disconnect();
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

testTeacherVerification();
