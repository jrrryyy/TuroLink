const mongoose = require('mongoose');
const path = require('node:path');
const fs = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const Subject = require('../models/Subject');
const Submission = require('../models/Submission');
const Notification = require('../models/Notification');

const storageDirectory = path.resolve(__dirname, '../storage/submissions');

const allowedTypes = new Set([
  'application/pdf',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/octet-stream',
]);

const fail = (message, status = 400) => Object.assign(new Error(message), { status });

const handler = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    if (!error.status) console.error('Submission request failed:', error);
    if (!res.headersSent) {
      res.status(error.status || 500).json({
        message: error.status ? error.message : 'Unable to process submission. Please try again.',
      });
    }
  }
};

async function removeFile(key) {
  if (!key || path.basename(key) !== key) return;
  await fs.unlink(path.join(storageDirectory, key)).catch((err) => {
    if (err.code !== 'ENOENT') console.error('Error deleting submission file:', err.code);
  });
}

// ── Student: Submit work ───────────────────────────────────────────────────
const submitWork = handler(async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id) || !mongoose.isObjectIdOrHexString(req.params.materialId)) {
    throw fail('Invalid subject or material.');
  }

  const subject = await Subject.findOne({ _id: req.params.id, enrolledStudents: req.user._id });
  if (!subject) throw fail('Subject not found or you are not enrolled.', 404);

  const material = subject.materials.id(req.params.materialId);
  if (!material || material.status !== 'posted') throw fail('Material not found or not yet posted.', 404);

  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  if (!req.file && !text) {
    throw fail('Please attach a file or enter a note to turn in your work.');
  }

  let newKey = '';
  try {
    if (req.file) {
      if (!allowedTypes.has(req.file.mimetype) && !req.file.originalname.match(/\.(pdf|docx?|pptx?|xlsx?|txt|jpg|jpeg|png|webp|zip|rar|7z)$/i)) {
        throw fail('Unsupported file format. Please attach a document, presentation, sheet, image, or zip archive.');
      }
      await fs.mkdir(storageDirectory, { recursive: true });
      newKey = randomUUID();
      await fs.writeFile(path.join(storageDirectory, newKey), req.file.buffer);
    }

    const now = new Date();
    const isLate = Boolean(material.dueAt && now > new Date(material.dueAt));

    let submission = await Submission.findOne({ materialId: material._id, studentId: req.user._id });
    const oldKey = submission?.attachmentKey;

    if (submission) {
      submission.submittedAt = now;
      submission.isLate = isLate;
      submission.text = text;
      submission.status = 'submitted';
      if (req.file) {
        submission.attachmentKey = newKey;
        submission.attachmentName = req.file.originalname;
        submission.attachmentType = req.file.mimetype;
        submission.attachmentSize = req.file.size;
      }
      await submission.save();
      if (oldKey && req.file) await removeFile(oldKey);
    } else {
      submission = await Submission.create({
        subjectId: subject._id,
        materialId: material._id,
        studentId: req.user._id,
        status: 'submitted',
        submittedAt: now,
        isLate,
        attachmentKey: newKey,
        attachmentName: req.file ? req.file.originalname : '',
        attachmentType: req.file ? req.file.mimetype : '',
        attachmentSize: req.file ? req.file.size : 0,
        text,
      });
    }

    // Notify teacher
    try {
      await Notification.create({
        recipient: subject.teacherId,
        eventKey: `submission:${material._id}:${req.user._id}:${now.getTime()}`,
        kind: 'submission',
        sourceId: material._id,
        title: `Work turned in · ${subject.code}`,
        message: `${req.user.name} turned in ${material.title}${isLate ? ' (Late)' : ' (On time)'}`,
        url: `/teacher/my-subjects?subject=${subject._id}&tab=materials`,
      });
    } catch (notifErr) {
      console.error('Failed to notify teacher of submission:', notifErr.name);
    }

    res.status(201).json(submission);
  } catch (error) {
    if (newKey) await removeFile(newKey);
    throw error;
  }
});

// ── Student: Unsubmit work ─────────────────────────────────────────────────
const unsubmitWork = handler(async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id) || !mongoose.isObjectIdOrHexString(req.params.materialId)) {
    throw fail('Invalid subject or material.');
  }

  const submission = await Submission.findOne({
    subjectId: req.params.id,
    materialId: req.params.materialId,
    studentId: req.user._id,
  });

  if (!submission) throw fail('Submission not found.', 404);
  if (submission.status === 'graded') {
    throw fail('This assignment has already been graded and cannot be unsubmitted.', 400);
  }

  const key = submission.attachmentKey;
  await submission.deleteOne();
  if (key) await removeFile(key);

  res.json({ message: 'Work unsubmitted successfully.' });
});

// ── Student: Download own attachment ───────────────────────────────────────
const downloadStudentAttachment = handler(async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id) || !mongoose.isObjectIdOrHexString(req.params.materialId)) {
    throw fail('Invalid subject or material.');
  }

  const submission = await Submission.findOne({
    subjectId: req.params.id,
    materialId: req.params.materialId,
    studentId: req.user._id,
  });

  if (!submission || !submission.attachmentKey) throw fail('Attachment not found.', 404);
  const file = path.join(storageDirectory, submission.attachmentKey);
  try {
    await fs.access(file);
  } catch {
    throw fail('Attachment file is no longer available.', 404);
  }

  res.download(file, submission.attachmentName || 'Submission');
});

// ── Teacher: List submissions for a material ──────────────────────────────
const listMaterialSubmissions = handler(async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id) || !mongoose.isObjectIdOrHexString(req.params.materialId)) {
    throw fail('Invalid subject or material.');
  }

  const subject = await Subject.findOne({ _id: req.params.id, teacherId: req.user._id }).populate(
    'enrolledStudents',
    'name email profilePicture'
  );
  if (!subject) throw fail('Subject not found.', 404);

  const material = subject.materials.id(req.params.materialId);
  if (!material) throw fail('Material not found.', 404);

  const submissions = await Submission.find({
    subjectId: subject._id,
    materialId: material._id,
  }).populate('studentId', 'name email profilePicture');

  const submissionMap = new Map();
  submissions.forEach((s) => {
    if (s.studentId) submissionMap.set(String(s.studentId._id), s);
  });

  const now = new Date();
  const isPastDue = Boolean(material.dueAt && now > new Date(material.dueAt));

  const items = subject.enrolledStudents.map((student) => {
    const s = submissionMap.get(String(student._id));
    if (s) {
      return {
        _id: s._id,
        student: {
          _id: student._id,
          name: student.name,
          email: student.email,
          profilePicture: student.profilePicture,
        },
        status: s.status,
        submittedAt: s.submittedAt,
        isLate: s.isLate,
        attachmentName: s.attachmentName,
        attachmentSize: s.attachmentSize,
        text: s.text,
        grade: s.grade,
        feedback: s.feedback,
        gradedAt: s.gradedAt,
      };
    }

    return {
      _id: null,
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        profilePicture: student.profilePicture,
      },
      status: isPastDue ? 'missing' : 'assigned',
      submittedAt: null,
      isLate: false,
      attachmentName: '',
      attachmentSize: 0,
      text: '',
      grade: null,
      feedback: '',
      gradedAt: null,
    };
  });

  const counts = {
    total: subject.enrolledStudents.length,
    turnedIn: items.filter((i) => i.status === 'submitted' || i.status === 'graded').length,
    graded: items.filter((i) => i.status === 'graded').length,
    assigned: items.filter((i) => i.status === 'assigned').length,
    missing: items.filter((i) => i.status === 'missing').length,
  };

  res.json({
    material: {
      _id: material._id,
      title: material.title,
      type: material.type,
      points: material.points,
      dueAt: material.dueAt,
    },
    counts,
    submissions: items,
  });
});

// ── Teacher: Grade a student submission ────────────────────────────────────
const gradeSubmission = handler(async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id) || !mongoose.isObjectIdOrHexString(req.params.materialId)) {
    throw fail('Invalid subject or material.');
  }

  const subject = await Subject.findOne({ _id: req.params.id, teacherId: req.user._id });
  if (!subject) throw fail('Subject not found.', 404);

  const material = subject.materials.id(req.params.materialId);
  if (!material) throw fail('Material not found.', 404);

  const submission = await Submission.findOne({
    _id: req.params.submissionId,
    subjectId: subject._id,
    materialId: material._id,
  });
  if (!submission) throw fail('Submission not found.', 404);

  const rawGrade = req.body.grade;
  const grade = rawGrade === '' || rawGrade === null || rawGrade === undefined ? null : Number(rawGrade);

  if (grade !== null) {
    if (!Number.isFinite(grade) || grade < 0) {
      throw fail('Grade must be a valid non-negative number.', 400);
    }
    if (material.points != null && grade > material.points) {
      throw fail(`Grade cannot exceed the maximum of ${material.points} points.`, 400);
    }
  }

  const feedback = typeof req.body.feedback === 'string' ? req.body.feedback.trim() : '';

  submission.grade = grade;
  submission.feedback = feedback;
  submission.status = 'graded';
  submission.gradedAt = new Date();
  submission.gradedBy = req.user._id;

  await submission.save();

  // Notify student
  try {
    const scoreText = grade !== null ? (material.points ? `${grade}/${material.points} points` : `${grade} points`) : 'Complete';
    await Notification.create({
      recipient: submission.studentId,
      eventKey: `grade:${submission._id}:${Date.now()}`,
      kind: 'grade',
      sourceId: material._id,
      title: `Work graded · ${subject.code}`,
      message: `Your work for "${material.title}" has been graded: ${scoreText}`,
      url: `/student/my-subjects/${subject._id}?tab=materials#material-${material._id}`,
    });
  } catch (notifErr) {
    console.error('Failed to notify student of grade:', notifErr.name);
  }

  res.json(submission);
});

// ── Teacher: Download a student's attachment ───────────────────────────────
const downloadTeacherAttachment = handler(async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id) || !mongoose.isObjectIdOrHexString(req.params.materialId)) {
    throw fail('Invalid subject or material.');
  }

  const subject = await Subject.findOne({ _id: req.params.id, teacherId: req.user._id });
  if (!subject) throw fail('Subject not found.', 404);

  const submission = await Submission.findOne({
    _id: req.params.submissionId,
    subjectId: subject._id,
    materialId: req.params.materialId,
  });

  if (!submission || !submission.attachmentKey) throw fail('Attachment not found.', 404);
  const file = path.join(storageDirectory, submission.attachmentKey);
  try {
    await fs.access(file);
  } catch {
    throw fail('Attachment file is no longer available.', 404);
  }

  res.download(file, submission.attachmentName || 'Student_Submission');
});

module.exports = {
  submitWork,
  unsubmitWork,
  downloadStudentAttachment,
  listMaterialSubmissions,
  gradeSubmission,
  downloadTeacherAttachment,
};
