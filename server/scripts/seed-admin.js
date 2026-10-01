require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');

async function seedAdmin() {
  await connectDB();
  console.log('Connected to MongoDB.');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@turolink.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';
  const adminPhone = '09123456789';

  let admin = await User.findOne({ email: adminEmail });

  if (admin) {
    admin.role = 'admin';
    admin.emailVerifiedAt = admin.emailVerifiedAt || new Date();
    admin.password = await bcrypt.hash(adminPassword, 12);
    if (!admin.phone) admin.phone = adminPhone;
    await admin.save();
    console.log(`Updated existing user (${adminEmail}) to role: admin with updated password.`);
  } else {
    admin = await User.create({
      name: 'TuroLink Administrator',
      email: adminEmail,
      phone: adminPhone,
      role: 'admin',
      password: await bcrypt.hash(adminPassword, 12),
      emailVerifiedAt: new Date(),
      bio: 'Platform super administrator with dual Student and Teacher access privileges.',
    });
    console.log(`Created new admin user: ${adminEmail}`);
  }

  console.log('----------------------------------------------------');
  console.log('Admin Account Ready:');
  console.log(`Email:    ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
  console.log(`Role:     ${admin.role}`);
  console.log('----------------------------------------------------');

  await mongoose.disconnect();
}

seedAdmin().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
