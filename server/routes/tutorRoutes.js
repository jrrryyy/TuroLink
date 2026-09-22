const router = require('express').Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/authMiddleware');
const Profile = require('../models/TeacherProfile');
const Slot = require('../models/TutorSlot');
const Booking = require('../models/Booking');

router.use(protect);
const role = (expected) => (req, res, next) => req.user.role === expected ? next() : res.status(403).json({ message: `${expected} access only.` });
const validId = (id) => mongoose.isObjectIdOrHexString(id);
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const run = (fn) => async (req, res) => {
  try { await fn(req, res); }
  catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'This time is already reserved. Choose another slot.' });
    if (!error.status) console.error('Tutor API:', error.name);
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to complete the request. Please try again.' });
  }
};
const stats = async (teacher) => {
  const [result] = await Booking.aggregate([
    { $match: { teacher: new mongoose.Types.ObjectId(String(teacher)), 'review.rating': { $exists: true } } },
    { $group: { _id: null, averageRating: { $avg: '$review.rating' }, totalRatings: { $sum: 1 } } },
  ]);
  return { averageRating: result?.averageRating || 0, totalRatings: result?.totalRatings || 0 };
};
async function publicProfile(profile) {
  return {
    id: profile.user._id, name: profile.user.name, profilePicture: profile.user.profilePicture || '',
    bio: profile.user.bio || profile.teachingBio, subject: profile.subjectToTeach,
    hourlyRate: profile.hourlyRate, ...await stats(profile.user._id),
  };
}

router.get('/availability', role('teacher'), run(async (req, res) => {
  const profile = await Profile.findOne({ user: req.user._id });
  if (!profile) throw fail('Teacher profile not found.', 404);
  res.json({ hourlyRate: profile.hourlyRate, slots: await Slot.find({ teacher: req.user._id, start: { $gt: new Date() } }).sort({ start: 1 }).lean() });
}));
router.put('/availability/rate', role('teacher'), run(async (req, res) => {
  const rate = req.body.hourlyRate;
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate < 1 || rate > 100000 || Math.abs(rate * 100 - Math.round(rate * 100)) > .00001) throw fail('Enter a rate between ₱1 and ₱100,000, with at most two decimals.');
  const profile = await Profile.findOneAndUpdate({ user: req.user._id }, { $set: { hourlyRate: rate } });
  if (!profile) throw fail('Teacher profile not found.', 404);
  res.json({ message: 'Hourly rate saved.' });
}));
router.post('/availability', role('teacher'), run(async (req, res) => {
  const start = new Date(req.body.start);
  if (!req.body.start || !Number.isFinite(start.getTime()) || start <= new Date() || start > new Date(Date.now() + 366 * 86400000) || start.getUTCMinutes() || start.getUTCSeconds() || start.getUTCMilliseconds()) throw fail('Choose a future time on the hour within the next year.');
  const profile = await Profile.findOne({ user: req.user._id });
  if (!profile?.hourlyRate) throw fail('Set your hourly rate first.');
  res.status(201).json(await Slot.create({ teacher: req.user._id, start }));
}));
router.delete('/availability/:id', role('teacher'), run(async (req, res) => {
  if (!validId(req.params.id)) throw fail('Invalid slot.');
  const removed = await Slot.findOneAndDelete({ _id: req.params.id, teacher: req.user._id, booked: false });
  if (!removed) throw fail('This slot is booked or unavailable and cannot be removed.', 409);
  res.json({ message: 'Slot removed.' });
}));
router.get('/bookings', run(async (req, res) => {
  const field = req.user.role === 'teacher' ? 'teacher' : 'student';
  res.json(await Booking.find({ [field]: req.user._id }).populate('teacher student', 'name profilePicture').sort({ start: 1 }).lean());
}));
router.post('/bookings', role('student'), run(async (req, res) => {
  if (!validId(req.body.slotId)) throw fail('Select an available time.');
  let booking;
  await mongoose.connection.transaction(async (session) => {
    const slot = await Slot.findOneAndUpdate({ _id: req.body.slotId, booked: false, start: { $gt: new Date() } }, { $set: { booked: true } }, { returnDocument: 'after', session });
    if (!slot) throw fail('This slot is no longer available. Choose another time.', 409);
    const profile = await Profile.findOne({ user: slot.teacher }).session(session).populate('user', 'role');
    if (!profile?.hourlyRate || profile.user?.role !== 'teacher') throw fail('This teacher is not accepting bookings.', 409);
    if (req.body.expectedPrice !== profile.hourlyRate) throw fail('The rate has changed. Reload the teacher profile before booking.', 409);
    [booking] = await Booking.create([{
      teacher: slot.teacher, student: req.user._id, slot: slot._id,
      start: slot.start, end: new Date(slot.start.getTime() + 3600000), subject: profile.subjectToTeach, price: profile.hourlyRate,
    }], { session });
  });
  res.status(201).json({ message: 'Session booked successfully.', booking });
}));
router.post('/bookings/:id/review', role('student'), run(async (req, res) => {
  if (!validId(req.params.id)) throw fail('Invalid booking.');
  const { rating, text } = req.body;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || typeof text !== 'string' || !text.trim() || text.trim().length > 1000) throw fail('Choose 1–5 stars and write a review of 1–1,000 characters.');
  const booking = await Booking.findOneAndUpdate({ _id: req.params.id, student: req.user._id, end: { $lte: new Date() }, 'review.rating': { $exists: false } }, { $set: { review: { rating, text: text.trim(), createdAt: new Date() } } }, { returnDocument: 'after' });
  if (!booking) throw fail('Only your completed, unreviewed bookings can be rated.', 409);
  // Directory ratings are calculated from reviews, avoiding stale cached totals.
  res.status(201).json({ message: 'Thank you! Your review is saved.' });
}));
router.get('/', role('student'), run(async (req, res) => {
  const profiles = await Profile.find().populate('user', 'name role bio profilePicture').lean();
  const tutors = await Promise.all(profiles.filter((p) => p.user?.role === 'teacher').map(async (p) => ({
    ...await publicProfile(p), slots: await Slot.find({ teacher: p.user._id, booked: false, start: { $gt: new Date() } }).select('start').sort({ start: 1 }).lean(),
  })));
  res.json(tutors);
}));
router.get('/:id', role('student'), run(async (req, res) => {
  if (!validId(req.params.id)) throw fail('Teacher not found.', 404);
  const profile = await Profile.findOne({ user: req.params.id }).populate('user', 'name role bio profilePicture').lean();
  if (!profile || profile.user?.role !== 'teacher') throw fail('Teacher not found.', 404);
  const reviews = await Booking.find({ teacher: req.params.id, 'review.rating': { $exists: true } }).populate('student', 'name').sort({ 'review.createdAt': -1 }).limit(50).lean();
  res.json({ ...await publicProfile(profile),
    slots: await Slot.find({ teacher: req.params.id, booked: false, start: { $gt: new Date() } }).select('start').sort({ start: 1 }).lean(),
    reviews: reviews.map((b) => ({ id: b._id, name: b.student?.name?.split(' ')[0] || 'Student', ...b.review })),
  });
}));
module.exports = router;
