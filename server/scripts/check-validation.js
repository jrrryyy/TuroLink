const assert = require('node:assert/strict');
async function main() {
  const r = await import('../../shared/validation.mjs');
  const account = { name: "Maria Anne O'Neil-Santos", email: 'student@example.invalid', phone: '09123456789', password: 'Cedar!Orbit!Lantern38', confirmPassword: 'Cedar!Orbit!Lantern38', terms: true };
  assert.deepEqual(r.validateRegistration(account), {});
  assert.equal(r.normalizeEmail(' STUDENT@EXAMPLE.INVALID '), account.email);
  assert.equal(r.normalizePhone('+63 912 345 6789'), account.phone);
  assert.deepEqual(r.validateLogin({ email: account.email, password: 'legacy' }), {});
  for (const [field, value] of [['name', '   '], ['email', 'bad'], ['phone', 'abc'], ['password', '123456'], ['confirmPassword', 'other'], ['terms', false]]) assert(r.validateRegistration({ ...account, [field]: value })[field], field);
  assert(r.validateRegistration({ ...account, password: 'é'.repeat(37) }).password);
  const teacher = { ...account, degreeTitle: 'BS Education', subjectToTeach: 'Math', teachingBio: 'Teaching mathematics.', verificationConsent: true };
  assert.deepEqual(r.validateRegistration(teacher, { teacher: true }), {});
  for (const field of ['degreeTitle', 'subjectToTeach', 'teachingBio', 'verificationConsent']) assert(r.validateRegistration({ ...teacher, [field]: '' }, { teacher: true })[field]);
  assert(r.documentError({ type: 'text/plain', size: 5 }));
  assert(r.documentError({ type: 'application/pdf', size: 5 * 1024 * 1024 + 1 }));
  assert.deepEqual(r.validateSubject({ code: 'ITE 314', title: 'Database' }), {});
  assert(r.validateSubject({ code: {}, title: ' ' }).code);
  assert.deepEqual(r.validateAnnouncement({ link: 'https://example.com' }), {});
  assert(r.validateAnnouncement({ scheduledAt: '2000-01-01', content: 'Hi' }).scheduledAt);
  assert(r.validateAnnouncement({ link: 'javascript:alert(1)' }).link);
  assert.deepEqual(r.validateProfile({ name: 'Profile Test', sex: 'female' }), {});
  assert(r.validateProfile({ name: 'Profile Test', currentPassword: 'old', newPassword: '123456', confirmPassword: '123456' }).newPassword);
  console.log('PASS: task-specific registration, teacher, profile, subject, announcement, upload and password validation. Authentication integration: npm run test:auth.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
