require('dotenv').config();
const assert = require('node:assert/strict');
const connectDB = require('../config/db');
const User = require('../models/User');
const app = require('../app');
const http = require('http');

async function testAdmin() {
  await connectDB();
  console.log('Testing Admin Role and API capabilities...');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const request = async (path, options = {}) => {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-TuroLink-Request': '1',
        ...(options.headers || {}),
      },
    });
    const cookie = res.headers.get('set-cookie');
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, data, cookie, headers: res.headers };
  };

  // 1. Login as Admin
  console.log('1. Testing Admin login...');
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@turolink.com',
      password: 'AdminPass123!',
    }),
  });

  assert.equal(loginRes.status, 200, 'Admin login should succeed');
  assert.equal(loginRes.data.user.role, 'admin', 'User role should be admin');
  const adminCookie = loginRes.cookie ? loginRes.cookie.split(';')[0] : '';
  assert.ok(adminCookie, 'Session cookie should be issued');
  console.log('✔ Admin logged in successfully with role "admin".');

  // 2. Test Admin Stats endpoint
  console.log('2. Testing /api/admin/stats...');
  const statsRes = await request('/api/admin/stats', {
    headers: { Cookie: adminCookie },
  });
  assert.equal(statsRes.status, 200, 'Admin stats should return 200');
  assert.ok(statsRes.data.metrics.totalUsers >= 1, 'Metrics totalUsers should be >= 1');
  assert.ok(statsRes.data.metrics.totalAdmins >= 1, 'Metrics totalAdmins should be >= 1');
  console.log(`✔ Stats retrieved: ${statsRes.data.metrics.totalUsers} users, ${statsRes.data.metrics.totalAdmins} admin(s).`);

  // 3. Test Admin Users endpoint
  console.log('3. Testing /api/admin/users...');
  const usersRes = await request('/api/admin/users?limit=5', {
    headers: { Cookie: adminCookie },
  });
  assert.equal(usersRes.status, 200, 'Users query should return 200');
  assert.ok(Array.isArray(usersRes.data.users), 'Users should be an array');
  console.log(`✔ Users query returned ${usersRes.data.users.length} users.`);

  // 4. Test Admin Teachers endpoint
  console.log('4. Testing /api/admin/teachers...');
  const teachersRes = await request('/api/admin/teachers', {
    headers: { Cookie: adminCookie },
  });
  assert.equal(teachersRes.status, 200, 'Teachers query should return 200');
  console.log(`✔ Teachers query returned ${teachersRes.data.profiles.length} profiles.`);

  // 5. Test Admin Subjects endpoint
  console.log('5. Testing /api/admin/subjects...');
  const subjectsRes = await request('/api/admin/subjects', {
    headers: { Cookie: adminCookie },
  });
  assert.equal(subjectsRes.status, 200, 'Subjects query should return 200');
  console.log(`✔ Subjects query returned ${subjectsRes.data.subjects.length} subjects.`);

  // 6. Test Admin Bookings endpoint
  console.log('6. Testing /api/admin/bookings...');
  const bookingsRes = await request('/api/admin/bookings', {
    headers: { Cookie: adminCookie },
  });
  assert.equal(bookingsRes.status, 200, 'Bookings query should return 200');
  console.log(`✔ Bookings query returned ${bookingsRes.data.bookings.length} bookings.`);

  // 7. Test Dual Role Access: Student Dashboard data with admin cookie
  console.log('7. Testing Dual Access: Admin accessing Student Dashboard data...');
  const studentDataRes = await request('/api/student/dashboard-data', {
    headers: { Cookie: adminCookie },
  });
  assert.equal(studentDataRes.status, 200, 'Admin should be permitted on Student dashboard route');
  console.log('✔ Dual Role: Admin successfully accessed student dashboard endpoint.');

  // 8. Test Dual Role Access: Teacher Dashboard data with admin cookie
  console.log('8. Testing Dual Access: Admin accessing Teacher Dashboard data...');
  const teacherDataRes = await request('/api/teacher/dashboard-data', {
    headers: { Cookie: adminCookie },
  });
  assert.equal(teacherDataRes.status, 200, 'Admin should be permitted on Teacher dashboard route');
  console.log('✔ Dual Role: Admin successfully accessed teacher dashboard endpoint.');

  // 9. Test Security: Non-admin rejection on Admin routes
  console.log('9. Testing Security: Student access to /api/admin/stats must be rejected with 403...');
  // Find or create test student
  let testStudent = await User.findOne({ role: 'student' });
  if (testStudent) {
    testStudent.emailVerifiedAt = new Date();
    testStudent.password = await require('bcryptjs').hash('StudentPass123!', 10);
    await testStudent.save();

    const studentLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: testStudent.email, password: 'StudentPass123!' }),
    });

    if (studentLogin.cookie) {
      const studentCookie = studentLogin.cookie.split(';')[0];
      const deniedRes = await request('/api/admin/stats', {
        headers: { Cookie: studentCookie },
      });
      assert.equal(deniedRes.status, 403, 'Non-admin must receive 403 Forbidden');
      console.log('✔ Security verified: Non-admin received 403 Forbidden on admin endpoint.');
    }
  }

  server.close();
  console.log('----------------------------------------------------');
  console.log('ALL ADMIN INTEGRATION & ROLE TESTS PASSED SUCCESSFULLY!');
  console.log('----------------------------------------------------');
  process.exit(0);
}

testAdmin().catch((err) => {
  console.error('Admin test failed:', err);
  process.exit(1);
});
