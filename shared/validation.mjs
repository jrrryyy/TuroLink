export const text = (value) => typeof value === 'string' ? value.trim() : '';
const accepted = (value) => value === true || value === 'true';
export const normalizeEmail = (value) => text(value).toLowerCase();
export const normalizePhone = (value) => text(value).replace(/[\s()-]/g, '').replace(/^\+63/, '0');
const emailValid = (value) => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const documentError = (file) => !file ? '' : file.size > 5 * 1024 * 1024 ? 'Upload a file of 5 MB or smaller.' : !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type || file.mimetype) ? 'Use a PDF, JPG, or PNG file.' : '';

export function validateLogin(input = {}) {
  const errors = {};
  if (!emailValid(normalizeEmail(input.email))) errors.email = 'Enter a valid email address.';
  if (typeof input.password !== 'string' || !input.password) errors.password = 'Enter your password.';
  return errors;
}

export function validateRegistration(input = {}, { teacher = false, accountOnly = false, file } = {}) {
  const errors = validateLogin(input);
  const name = text(input.name);
  if (!name || name.length > 100 || !/^[\p{L}\p{M} .’'\-]+$/u.test(name) || !/\p{L}/u.test(name)) errors.name = 'Enter your name using letters, spaces, apostrophes, periods, or hyphens (up to 100 characters).';
  if (!/^09\d{9}$/.test(normalizePhone(input.phone))) errors.phone = 'Enter a Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX.';
  if (typeof input.password !== 'string' || input.password.length < 6) errors.password = 'Use at least 6 characters.';
  else if (new TextEncoder().encode(input.password).length > 72) errors.password = 'Use a password of 72 UTF-8 bytes or fewer.';
  if (typeof input.confirmPassword !== 'string' || !input.confirmPassword) errors.confirmPassword = 'Confirm your password.';
  else if (input.password !== input.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  if (accountOnly) return errors;
  if (!accepted(input.terms)) errors.terms = 'Accept the Terms and Conditions to continue.';
  if (teacher) {
    for (const [field, label, limit] of [['degreeTitle', 'degree title', 200], ['subjectToTeach', 'subject to teach', 200], ['teachingBio', 'teaching bio', 2000]]) {
      if (!text(input[field]) || text(input[field]).length > limit) errors[field] = `Enter your ${label} (up to ${limit} characters).`;
    }
    if (!accepted(input.verificationConsent)) errors.verificationConsent = 'Confirm that your submitted information is valid.';
    const uploadError = documentError(file);
    if (uploadError) errors.verificationDocument = uploadError;
  }
  return errors;
}

export function validateSubject(input = {}, { partial = false } = {}) {
  const errors = {};
  for (const [field, label, limit] of [['code', 'subject code', 30], ['title', 'subject title', 200], ['description', 'description', 5000]]) {
    if (partial && input[field] === undefined) continue;
    if ((field !== 'description' && !text(input[field])) || (input[field] !== undefined && typeof input[field] !== 'string') || text(input[field]).length > limit) errors[field] = `Enter ${field === 'description' ? 'a' : 'a nonempty'} ${label} of up to ${limit} characters.`;
  }
  return errors;
}

export function validateAnnouncement(input = {}, file) {
  const errors = {};
  if (!text(input.content) && !text(input.link) && !file) errors.content = 'Add announcement text, a file, or a link.';
  if ((input.content !== undefined && typeof input.content !== 'string') || text(input.content).length > 20000) errors.content = 'Use up to 20,000 characters for announcement text.';
  if (input.link !== undefined && typeof input.link !== 'string') errors.link = 'Enter an http or https link.';
  else if (text(input.link)) {
    try { if (!['http:', 'https:'].includes(new URL(text(input.link)).protocol)) throw new Error(); }
    catch { errors.link = 'Enter a valid http or https link.'; }
  }
  if (input.scheduledAt) {
    const date = new Date(input.scheduledAt);
    if (!Number.isFinite(date.getTime()) || date <= new Date()) errors.scheduledAt = 'Choose a future posting date and time.';
  }
  return errors;
}

export function validateProfile(input = {}) {
  const errors = {};
  const name = text(input.name);
  if (!name || name.length > 100 || !/^[\p{L}\p{M} .?'\-]+$/u.test(name) || !/\p{L}/u.test(name)) errors.name = 'Enter a valid name of up to 100 characters.';
  if (input.bio !== undefined && (typeof input.bio !== 'string' || input.bio.length > 2000)) errors.bio = 'Use up to 2,000 characters.';
  if (!['', 'male', 'female', 'other', 'prefer-not-to-say'].includes(input.sex || '')) errors.sex = 'Choose a valid option.';
  if (input.currentPassword || input.newPassword || input.confirmPassword) {
    if (typeof input.currentPassword !== 'string' || !input.currentPassword) errors.currentPassword = 'Enter your current password.';
    if (typeof input.newPassword !== 'string' || input.newPassword.length < 6) errors.newPassword = 'Use at least 6 characters.';
    else if (new TextEncoder().encode(input.newPassword).length > 72) errors.newPassword = 'Use no more than 72 UTF-8 bytes.';
    if (!input.confirmPassword || input.newPassword !== input.confirmPassword) errors.confirmPassword = 'Confirm your new password exactly.';
    if (input.newPassword && input.newPassword === input.currentPassword) errors.newPassword = 'Choose a different password.';
  }
  return errors;
}
