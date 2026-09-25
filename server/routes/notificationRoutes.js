const router = require('express').Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/authMiddleware');
const Notification = require('../models/Notification');
const Subject = require('../models/Subject');
router.use(protect);
async function scope(user, role) {
  if (role === 'teacher') {
    const subjects = await Subject.find({ teacherId: user }).select('announcements._id').lean();
    return { recipient: user, $or: [{ kind: { $in: ['session', 'review'] } }, { kind: 'comment', sourceId: { $in: subjects.flatMap(s => s.announcements.map(a => a._id)) } }] };
  }
  const subjects = await Subject.find({ enrolledStudents: user }).select('announcements._id announcements.status materials._id materials.status').lean();
  const keys = subjects.flatMap(s => [...s.announcements.filter(a => a.status === 'posted').map(a => `announcement:${a._id}`), ...s.materials.filter(m => m.status === 'posted').map(m => `material:${m._id}`)]);
  return { recipient: user, $or: [{ kind: 'session' }, { eventKey: { $in: keys } }] };
}
router.get('/', async (req, res) => {
  await require('../controllers/materialController').publishDueMaterials();
  const filter = await scope(req.user._id, req.user.role);
  const [items, unreadCount] = await Promise.all([Notification.find(filter).sort({ createdAt: -1, _id: -1 }).limit(50).select('-recipient -eventKey -__v').lean(), Notification.countDocuments({ ...filter, readAt: null })]);
  res.json({ items, unreadCount });
});
router.patch('/read-all', async (req, res) => {
  await Notification.updateMany({ ...await scope(req.user._id, req.user.role), readAt: null }, { $set: { readAt: new Date() } });
  res.json({ message: 'All notifications marked as read.' });
});
router.patch('/:id/read', async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(404).json({ message: 'Notification not found.' });
  const item = await Notification.findOneAndUpdate({ ...await scope(req.user._id, req.user.role), _id: req.params.id }, { $set: { readAt: new Date() } });
  if (!item) return res.status(404).json({ message: 'Notification not found.' });
  res.json({ message: 'Notification marked as read.' });
});
module.exports = router;
