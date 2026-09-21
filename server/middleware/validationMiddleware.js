const fs = require('node:fs/promises');
const validators = import('../../shared/validation.mjs');

const validation = (task) => async (req, res, next) => {
  try {
    if (task === "teacher" && req.file?.path) res.on("finish", () => {
      if (res.statusCode >= 400) fs.unlink(req.file.path).catch(() => {});
    });
    const rules = await validators;
    const body = req.body || {};
    let errors;
    if (task === 'login') errors = rules.validateLogin(body);
    else if (task === 'student' || task === 'teacher') errors = rules.validateRegistration(body, { teacher: task === 'teacher', file: req.file });
    else if (task === 'announcement') errors = rules.validateAnnouncement(body, req.file);
    else errors = rules.validateSubject(body, { partial: req.method === 'PUT' });
    if (Object.keys(errors).length) {
      if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });
    }
    if (['login', 'student', 'teacher'].includes(task)) {
      body.email = rules.normalizeEmail(body.email);
      if (task !== 'login') {
        body.name = rules.text(body.name); body.phone = rules.normalizePhone(body.phone);
        for (const field of ['degreeTitle', 'subjectToTeach', 'teachingBio']) if (field in body) body[field] = rules.text(body[field]);
      }
    }
    req.body = body;
    next();
  } catch (error) { next(error); }
};

const uploadValidation = (middleware, field) => (req, res, next) => middleware(req, res, (error) => {
  if (!error) return next();
  const message = error.code === 'LIMIT_FILE_SIZE' ? `File is too large (${field === 'verificationDocument' ? '5' : '10'} MB maximum).` : 'Unsupported file or upload format.';
  res.status(400).json({ message, errors: { [field]: message } });
});
module.exports = { validation, uploadValidation };
