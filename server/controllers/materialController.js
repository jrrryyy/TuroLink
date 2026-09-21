const Subject = require('../models/Subject');
const mongoose = require('mongoose');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const storageDirectory = path.resolve(__dirname, '../storage/materials');
const allowedTypes = new Set([
  'application/pdf', 'text/plain', 'image/jpeg', 'image/png', 'image/webp',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
const badRequest = (message, field) => Object.assign(new Error(message), { status: 400, ...(field ? { errors: { [field]: message } } : {}) });

// Also called before reads, so scheduled posts appear even after a server restart.
async function publishDueMaterials() {
  const now = new Date();
  await Subject.updateMany(
    { materials: { $elemMatch: { status: 'scheduled', scheduledAt: { $lte: now } } } },
    { $set: { 'materials.$[item].status': 'posted', 'materials.$[item].postedAt': now } },
    { arrayFilters: [{ 'item.status': 'scheduled', 'item.scheduledAt': { $lte: now } }] }
  );
}

async function ownedSubject(req) {
  if (!mongoose.isValidObjectId(req.params.id)) throw badRequest('Invalid subject.');
  const subject = await Subject.findOne({ _id: req.params.id, teacherId: req.user._id });
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

function validatedFields(body) {
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
  return { title, type: body.type, instructions, points, dueAt, scheduledAt, link, status: body.status, postedAt: body.status === 'posted' ? new Date() : null };
}

async function removeFile(key) {
  if (!key || path.basename(key) !== key) return;
  await fs.unlink(path.join(storageDirectory, key)).catch((error) => {
    if (error.code !== 'ENOENT') console.error('Unable to clean up classwork attachment:', error.code);
  });
}

const handler = (fn) => async (req, res) => {
  try { await fn(req, res); }
  catch (error) {
    if (!error.status) console.error('Classwork request failed:', error.name);
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to save or load classwork. Please try again.', ...(error.errors ? { errors: error.errors } : {}) });
  }
};

const listMaterials = handler(async (req, res) => {
  // Check access before performing any work.
  await ownedSubject(req);
  await publishDueMaterials();
  const subject = await ownedSubject(req);
  res.json(subject.materials);
});

const saveMaterial = handler(async (req, res) => {
  const subject = await ownedSubject(req);
  const existing = req.params.materialId ? materialById(subject, req.params.materialId) : null;
  if (existing?.status === 'archived') throw badRequest('Restore archived classwork before editing.');
  const fields = validatedFields(req.body);
  let newKey;
  const oldKey = existing?.attachmentKey;
  try {
    if (req.file) {
      if (!allowedTypes.has(req.file.mimetype)) throw badRequest('Unsupported file type. Use a document, PDF, text file, or image.');
      await fs.mkdir(storageDirectory, { recursive: true });
      newKey = randomUUID();
      await fs.writeFile(path.join(storageDirectory, newKey), req.file.buffer);
      Object.assign(fields, { attachmentKey: newKey, attachmentName: req.file.originalname, attachmentType: req.file.mimetype, attachmentSize: req.file.size, fileUrl: '' });
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
  const subject = await ownedSubject(req);
  const material = materialById(subject, req.params.materialId);
  if (req.body.action === 'archive' && material.status !== 'archived') material.status = 'archived';
  else if (req.body.action === 'restore' && material.status === 'archived') {
    material.status = 'draft'; material.scheduledAt = null; material.postedAt = null;
  } else throw badRequest('Invalid classwork action.');
  await subject.save();
  res.json(material);
});

const deleteMaterial = handler(async (req, res) => {
  const subject = await ownedSubject(req);
  const material = materialById(subject, req.params.materialId);
  const key = material.attachmentKey;
  subject.materials.pull(material._id);
  await subject.save();
  await removeFile(key);
  res.json({ message: 'Classwork deleted successfully.' });
});

const downloadAttachment = handler(async (req, res) => {
  const subject = await ownedSubject(req);
  const material = materialById(subject, req.params.materialId);
  if (!material.attachmentKey || path.basename(material.attachmentKey) !== material.attachmentKey) throw Object.assign(new Error('Attachment not found.'), { status: 404 });
  const file = path.join(storageDirectory, material.attachmentKey);
  try { await fs.access(file); } catch { throw Object.assign(new Error('Attachment not found.'), { status: 404 }); }
  res.download(file, material.attachmentName);
});

module.exports = { listMaterials, saveMaterial, changeMaterialStatus, deleteMaterial, downloadAttachment, publishDueMaterials };
