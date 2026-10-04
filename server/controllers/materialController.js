const Subject = require('../models/Subject');
const Submission = require('../models/Submission');
const mongoose = require('mongoose');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const { getUploadPath } = require('../config/storage');
const { uploadFile, deleteFile, streamDownload } = require('../services/cloudStorage');

const storageDirectory = path.resolve(__dirname, '../storage/materials');

const allowedTypes = new Set([
  'application/pdf', 'text/plain', 'text/csv',
  'image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/bmp',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/octet-stream',
]);

const allowedExtensions = new Set([
  '.pdf', '.txt', '.csv', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp', '.zip', '.rar',
]);

function isAllowedFile(file) {
  if (!file) return false;
  if (allowedTypes.has(file.mimetype)) return true;
  const ext = path.extname(file.originalname || '').toLowerCase();
  return allowedExtensions.has(ext);
}

const badRequest = (message, field) => Object.assign(new Error(message), { status: 400, ...(field ? { errors: { [field]: message } } : {}) });

// Also called before reads, so scheduled posts appear even after a server restart.
async function publishDueMaterials() {
  const now = new Date();
  const subjects = await Subject.find({ $or: [
    { materials: { $elemMatch: { status: 'scheduled', scheduledAt: { $lte: now } } } },
    { announcements: { $elemMatch: { status: 'scheduled', scheduledAt: { $lte: now } } } },
  ] });
  for (const subject of subjects) {
    for (const item of [...subject.materials, ...subject.announcements]) {
      if (item.status === 'scheduled' && item.scheduledAt && item.scheduledAt <= now) { item.status = 'posted'; item.postedAt = now; }
    }
    try { await subject.save(); } catch (error) { if (error.name !== 'VersionError') throw error; }
  }
  await require('../services/notifications').retryNotifications();
}

async function ownedSubject(req, populate = false) {
  if (!mongoose.isValidObjectId(req.params.id)) throw badRequest('Invalid subject.');
  const query = Subject.findOne({ _id: req.params.id, teacherId: req.user._id });
  if (populate) {
    query.populate('materials.recipientStudents', 'name email profilePicture');
  }
  const subject = await query;
  if (!subject) throw Object.assign(new Error('Subject not found.'), { status: 404 });
  return subject;
}

function materialById(subject, id) {
  const material = subject.materials.id(id);
  if (!material) throw Object.assign(new Error('Classwork not found.'), { status: 404 });
  return material;
}

function dateValue(value, label) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw badRequest(`Invalid ${label}.`, label === 'due date' ? 'dueAt' : 'scheduledAt');
  return date;
}

function validatedFields(body, subject) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title || title.length > 200) throw badRequest('Enter a title of up to 200 characters.', 'title');
  if (!['assignment', 'quiz'].includes(body.type)) throw badRequest('Choose Assignment or Quiz Assignment.');
  if (!['draft', 'posted', 'scheduled'].includes(body.status)) throw badRequest('Invalid classwork status.');
  const instructions = typeof body.instructions === 'string' ? body.instructions.trim() : '';
  if (instructions.length > 20000) throw badRequest('Instructions are too long.', 'instructions');
  const points = body.points === '' || body.points === null || body.points === undefined ? null : Number(body.points);
  if (points !== null && (!Number.isFinite(points) || points < 0 || points > 1000)) throw badRequest('Points must be between 0 and 1000, or Ungraded.', 'points');
  const dueAt = dateValue(body.dueAt, 'due date');
  const scheduledAt = body.status === 'scheduled' ? dateValue(body.scheduledAt, 'scheduled date') : null;
  if (body.status === 'scheduled' && (!scheduledAt || scheduledAt <= new Date())) throw badRequest('Schedule a time in the future.', 'scheduledAt');
  if (scheduledAt && dueAt && dueAt <= scheduledAt) throw badRequest('The due date must be after the scheduled posting time.', 'dueAt');
  let link = typeof body.link === 'string' ? body.link.trim() : '';
  if (link) {
    try {
      const url = new URL(link);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      link = url.toString();
    } catch { throw badRequest('Enter a valid http or https link.', 'link'); }
  }

  let recipientStudents = [];
  if (body.recipientStudents !== undefined && body.recipientStudents !== null) {
    try {
      const raw = typeof body.recipientStudents === 'string'
        ? JSON.parse(body.recipientStudents)
        : body.recipientStudents;
      const list = Array.isArray(raw) ? raw : [raw];
      recipientStudents = list
        .map((id) => String(id?._id || id).trim())
        .filter((id) => id && id !== 'all' && mongoose.isValidObjectId(id));
    } catch {
      recipientStudents = String(body.recipientStudents)
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id && id !== 'all' && mongoose.isValidObjectId(id));
    }
  }

  if (recipientStudents.length > 0 && subject?.enrolledStudents) {
    const enrolledSet = new Set(
      (subject.enrolledStudents || []).map((s) => (s._id ? s._id.toString() : s.toString()))
    );
    recipientStudents = recipientStudents.filter((id) => enrolledSet.has(id));
  }

  return { title, type: body.type, instructions, points, dueAt, scheduledAt, link, recipientStudents, status: body.status, postedAt: body.status === 'posted' ? new Date() : null };
}

async function removeFile(key) {
  if (!key) return;
  if (/^https?:\/\//i.test(key)) {
    await deleteFile(key, { folder: 'materials', resourceType: 'auto' });
    return;
  }
  if (path.basename(key) !== key) return;
  const legacyPath = path.join(storageDirectory, key);
  const uploadsPath = path.join(getUploadPath('materials'), key);
  await fs.unlink(legacyPath).catch(() => {});
  await fs.unlink(uploadsPath).catch(() => {});
}

const handler = (fn) => async (req, res) => {
  try { await fn(req, res); }
  catch (error) {
    console.error('Classwork request failed:', error);
    res.status(error.status || 500).json({
      message: error.status ? error.message : (error.message || 'Unable to save or load classwork. Please try again.'),
      ...(error.errors ? { errors: error.errors } : {})
    });
  }
};

const listMaterials = handler(async (req, res) => {
  // Check access before performing any work.
  await ownedSubject(req);
  await publishDueMaterials();
  const subject = await ownedSubject(req, true);

  const materials = subject.materials || [];
  const materialIds = materials.map((m) => m._id);

  // Fetch all submissions for these materials in this subject
  const submissions = await Submission.find({
    subjectId: subject._id,
    materialId: { $in: materialIds },
  }).select('materialId status grade').lean();

  const subMap = new Map();
  submissions.forEach((s) => {
    const mId = String(s.materialId);
    if (!subMap.has(mId)) {
      subMap.set(mId, { turnedInCount: 0, gradedCount: 0 });
    }
    const stats = subMap.get(mId);
    if (s.status === 'submitted' || s.status === 'graded') {
      stats.turnedInCount += 1;
    }
    if (s.status === 'graded') {
      stats.gradedCount += 1;
    }
  });

  const enrolledCount = (subject.enrolledStudents || []).length;
  const materialsWithStats = materials.map((mat) => {
    const obj = mat.toObject ? mat.toObject() : { ...mat };
    const stats = subMap.get(String(mat._id)) || { turnedInCount: 0, gradedCount: 0 };
    const assignedCount = mat.recipientStudents && mat.recipientStudents.length > 0
      ? mat.recipientStudents.length
      : enrolledCount;

    const turnedIn = stats.turnedInCount;
    const graded = stats.gradedCount;
    const pendingGrading = Math.max(0, turnedIn - graded);
    const isAllGraded = turnedIn > 0 && pendingGrading === 0;
    const isPartiallyGraded = graded > 0 && pendingGrading > 0;
    const needsGrading = pendingGrading > 0;

    obj.submissionStats = {
      totalAssigned: assignedCount,
      turnedIn,
      graded,
      pendingGrading,
      isAllGraded,
      isPartiallyGraded,
      needsGrading,
    };
    return obj;
  });

  res.json(materialsWithStats);
});

const saveMaterial = handler(async (req, res) => {
  const subject = await ownedSubject(req, false);
  const existing = req.params.materialId ? materialById(subject, req.params.materialId) : null;
  if (existing?.status === 'archived') throw badRequest('Restore archived classwork before editing.');
  const fields = validatedFields(req.body, subject);
  let newKey;
  const oldKey = existing?.attachmentKey;
  try {
    if (req.file) {
      if (!isAllowedFile(req.file)) {
        throw badRequest('Unsupported file type. Use a document, PDF, text file, or image.');
      }
      const uploadResult = await uploadFile(req.file.buffer, {
        folder: 'materials',
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        resourceType: 'auto',
      });
      newKey = uploadResult.url;
      Object.assign(fields, {
        attachmentKey: newKey,
        attachmentName: req.file.originalname,
        attachmentType: req.file.mimetype,
        attachmentSize: uploadResult.size || req.file.size,
        fileUrl: uploadResult.url,
      });
    } else if (req.body.removeAttachment === 'true') {
      Object.assign(fields, { attachmentKey: '', attachmentName: '', attachmentType: '', attachmentSize: 0, fileUrl: '' });
    }
    if (existing) existing.set(fields);
    else subject.materials.push(fields);
    await subject.save();
    if (oldKey && (newKey || req.body.removeAttachment === 'true')) await removeFile(oldKey);
    res.status(existing ? 200 : 201).json(existing || subject.materials[subject.materials.length - 1]);
  } catch (error) { if (newKey) await removeFile(newKey); throw error; }
});

const changeMaterialStatus = handler(async (req, res) => {
  const subject = await ownedSubject(req, false);
  const material = materialById(subject, req.params.materialId);
  if (req.body.action === 'archive' && material.status !== 'archived') material.status = 'archived';
  else if (req.body.action === 'restore' && material.status === 'archived') {
    material.status = 'draft'; material.scheduledAt = null; material.postedAt = null;
  } else throw badRequest('Invalid classwork action.');
  await subject.save();
  res.json(material);
});

const deleteMaterial = handler(async (req, res) => {
  const subject = await ownedSubject(req, false);
  const material = materialById(subject, req.params.materialId);
  const key = material.attachmentKey;
  subject.materials.pull(material._id);
  await subject.save();
  await removeFile(key);
  res.json({ message: 'Classwork deleted successfully.' });
});

const downloadAttachment = handler(async (req, res) => {
  const subject = await ownedSubject(req, false);
  const material = materialById(subject, req.params.materialId);
  const targetKey = material.fileUrl || material.attachmentKey;
  if (!targetKey) throw Object.assign(new Error('Attachment not found.'), { status: 404 });

  if (/^https?:\/\//i.test(targetKey)) {
    return streamDownload(targetKey, res, material.attachmentName || 'Material');
  }

  const legacyFile = path.join(storageDirectory, path.basename(targetKey));
  const uploadsFile = path.join(getUploadPath('materials'), path.basename(targetKey));
  const resolved = fsSync.existsSync(legacyFile) ? legacyFile : (fsSync.existsSync(uploadsFile) ? uploadsFile : null);
  if (resolved) {
    return res.download(resolved, material.attachmentName || 'Material');
  }

  return streamDownload(targetKey, res, material.attachmentName || 'Material');
});

module.exports = { listMaterials, saveMaterial, changeMaterialStatus, deleteMaterial, downloadAttachment, publishDueMaterials };
