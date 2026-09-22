const mongoose = require('mongoose');
const path = require('node:path');
const fs = require('node:fs/promises');
const Subject = require('../models/Subject');
const { publishDueMaterials } = require('./materialController');
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const handler = (fn) => async (req, res) => {
  try { await fn(req, res); }
  catch (error) { if (!error.status) console.error('Student subjects:', error.name); if (!res.headersSent) res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to load or save subject content. Please try again.' }); }
};
const visible = (item) => item.status === 'posted' || (item.status === 'scheduled' && item.scheduledAt && new Date(item.scheduledAt) <= new Date());
const announcementFilter = (id) => ({ _id: id, $or: [{ status: 'posted' }, { status: 'scheduled', scheduledAt: { $lte: new Date() } }] });
const safeLink = (value) => { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };
function summary(subject) {
  const upcoming = subject.materials.filter((m) => visible(m) && m.dueAt && new Date(m.dueAt) >= new Date()).sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))[0];
  return { _id: subject._id, code: subject.code, title: subject.title, description: subject.description,
    instructorName: subject.teacherId?.name || 'Teacher', instructorAvatar: subject.teacherId?.profilePicture || '',
    upcomingTopic: upcoming?.title || '', enrolledCount: subject.enrolledStudents.length, rating: subject.rating || 0 };
}
const list = handler(async (req, res) => {
  const subjects = await Subject.find({ enrolledStudents: req.user._id }).populate('teacherId', 'name profilePicture').sort({ createdAt: -1 }).lean();
  res.json(subjects.map(summary));
});
async function accessible(req, allowTeacher = false) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) throw fail('Subject not found.', 404);
  const access = allowTeacher && req.user.role === 'teacher' ? { teacherId: req.user._id } : { enrolledStudents: req.user._id };
  const subject = await Subject.findOne({ _id: req.params.id, ...access }).populate('teacherId', 'name profilePicture').populate('announcements.comments.author', 'name profilePicture');
  if (!subject) throw fail('Subject not found or you are not enrolled.', 404);
  return subject;
}
const detail = handler(async (req, res) => {
  await accessible(req);
  await publishDueMaterials();
  const subject = await accessible(req);
  const announcements = subject.announcements.filter(visible).map((a) => ({
    _id: a._id, content: a.content, link: safeLink(a.link), postedAt: a.postedAt || a.scheduledAt || a.createdAt,
    attachmentName: a.attachment ? a.attachmentName || 'Attachment' : '',
    likes: a.likes.length, liked: a.likes.some((id) => id.equals(req.user._id)),
    comments: a.comments.map((c) => ({ _id: c._id, text: c.text, createdAt: c.createdAt, name: c.author?.name || 'Former student', own: String(c.author?._id) === String(req.user._id) })),
  })).sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
  const materials = subject.materials.filter((m) => m.status === 'posted').map((m) => ({
    _id: m._id, title: m.title, type: m.type, instructions: m.instructions, points: m.points,
    dueAt: m.dueAt, postedAt: m.postedAt, link: safeLink(m.link), attachmentName: m.attachmentKey ? m.attachmentName || 'Attachment' : '',
  })).sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
  res.json({ ...summary(subject), announcements, materials });
});
const like = handler(async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id) || !mongoose.isObjectIdOrHexString(req.params.announcementId) || typeof req.body.liked !== 'boolean') throw fail('Invalid like request.');
  const action = req.body.liked ? '$addToSet' : '$pull';
  const result = await Subject.updateOne({ _id: req.params.id, enrolledStudents: req.user._id, announcements: { $elemMatch: announcementFilter(req.params.announcementId) } }, { [action]: { 'announcements.$.likes': req.user._id } });
  if (!result.matchedCount) throw fail('Announcement not available.', 404);
  res.json({ message: req.body.liked ? 'Liked.' : 'Like removed.' });
});
const comment = handler(async (req, res) => {
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  if (!text || text.length > 2000) throw fail('Enter a comment of 1–2,000 characters.');
  if (!mongoose.isObjectIdOrHexString(req.params.id) || !mongoose.isObjectIdOrHexString(req.params.announcementId)) throw fail('Invalid announcement.');
  const result = await Subject.updateOne({ _id: req.params.id, enrolledStudents: req.user._id, announcements: { $elemMatch: announcementFilter(req.params.announcementId) } }, { $push: { 'announcements.$.comments': { author: req.user._id, text } } });
  if (!result.matchedCount) throw fail('Announcement not available.', 404);
  res.status(201).json({ message: 'Comment posted.' });
});
const attachment = handler(async (req, res) => {
  const subject = await accessible(req, true);
  const isMaterial = Boolean(req.params.materialId);
  const itemId = req.params.materialId || req.params.announcementId;
  if (!mongoose.isObjectIdOrHexString(itemId)) throw fail('Attachment not found.', 404);
  const item = (isMaterial ? subject.materials : subject.announcements).id(itemId);
  if (!item || (req.user.role !== 'teacher' && !visible(item))) throw fail('Attachment not found.', 404);
  const key = isMaterial ? item.attachmentKey : (item.attachment || '').replace('/uploads/announcements/', '');
  if (!key || path.basename(key) !== key) throw fail('Attachment not found.', 404);
  const file = path.resolve(__dirname, isMaterial ? '../storage/materials' : '../uploads/announcements', key);
  try { await fs.access(file); } catch { throw fail('Attachment not found.', 404); }
  res.download(file, item.attachmentName || 'Attachment');
});
module.exports = { list, detail, like, comment, attachment };
