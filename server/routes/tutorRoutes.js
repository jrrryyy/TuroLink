const router = require('express').Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/authMiddleware');
const Profile = require('../models/TeacherProfile');
const Slot = require('../models/TutorSlot');
const Booking = require('../models/Booking');
const DeclinedRequest = require('../models/DeclinedRequest');
const Subject = require('../models/Subject');

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
  res.json({ hourlyRate: profile.hourlyRate, subjects: await Subject.find({ teacherId: req.user._id }).select('code title').sort({ title: 1 }).lean(), slots: await Slot.find({ teacher: req.user._id, start: { $gt: new Date() } }).populate('subjectId', 'code title').sort({ start: 1 }).lean() });
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
  if (!validId(req.body.subjectId) || !await Subject.exists({ _id: req.body.subjectId, teacherId: req.user._id })) throw fail('Select one of your subjects.');
  res.status(201).json(await Slot.create({ teacher: req.user._id, start, subjectId: req.body.subjectId }));
}));
router.patch('/availability/:id', role('teacher'), run(async (req, res) => {
  if (!validId(req.params.id) || !validId(req.body.subjectId) || !await Subject.exists({ _id: req.body.subjectId, teacherId: req.user._id })) throw fail('Select one of your subjects.');
  const slot = await Slot.findOneAndUpdate({ _id: req.params.id, teacher: req.user._id, booked: false, start: { $gt: new Date() } }, { $set: { subjectId: req.body.subjectId } }, { returnDocument: 'after' });
  if (!slot) throw fail('Only your future, unreserved slots can be updated.', 409);
  res.json({ message: 'Subject assigned.', slot });
}));
router.delete('/availability/:id', role('teacher'), run(async (req, res) => {
  if (!validId(req.params.id)) throw fail('Invalid slot.');
  const removed = await Slot.findOneAndDelete({ _id: req.params.id, teacher: req.user._id, booked: false });
  if (!removed) throw fail('This slot is booked or unavailable and cannot be removed.', 409);
  res.json({ message: 'Slot removed.' });
}));

router.get('/bookings', run(async (req, res) => {
  const field = req.user.role === 'teacher' ? 'teacher' : 'student';
  const [bookings, declined] = await Promise.all([
    Booking.find({ [field]: req.user._id }).populate('teacher student', 'name profilePicture email').lean(),
    DeclinedRequest.find({ [field]: req.user._id }).populate('teacher student', 'name profilePicture email').lean(),
  ]);

  let enrichedBookings = bookings.map((b) => ({ ...b, status: b.status || 'confirmed' }));

  if (req.user.role === 'student') {
    const teacherIds = [...new Set(bookings.map((b) => String(b.teacher?._id || b.teacher)).filter(Boolean))];
    const [profiles, teacherSessionCounts] = await Promise.all([
      Profile.find({ user: { $in: teacherIds } }).lean(),
      Booking.aggregate([
        { $match: { teacher: { $in: teacherIds.map((id) => new mongoose.Types.ObjectId(id)) }, status: 'confirmed', end: { $lte: new Date() } } },
        { $group: { _id: '$teacher', totalCompleted: { $sum: 1 } } },
      ]),
    ]);

    const profileMap = new Map();
    profiles.forEach((p) => profileMap.set(String(p.user), p));
    const countMap = new Map();
    teacherSessionCounts.forEach((c) => countMap.set(String(c._id), c.totalCompleted));

    enrichedBookings = enrichedBookings.map((b) => {
      const teacherId = String(b.teacher?._id || b.teacher);
      const p = profileMap.get(teacherId);
      const completedSessions = countMap.get(teacherId) || 0;
      return {
        ...b,
        teacherProfile: p ? {
          degreeTitle: p.degreeTitle,
          subjectToTeach: p.subjectToTeach,
          teachingBio: p.teachingBio,
          averageRating: p.averageRating || 0,
          totalRatings: p.totalRatings || 0,
          hourlyRate: p.hourlyRate,
          weeklyHours: p.weeklyHours || 0,
          completedSessionsCount: completedSessions,
        } : null,
      };
    });
  }

  res.json([...enrichedBookings, ...declined].sort((a, b) => a.start - b.start));
}));

router.get('/requests', role('teacher'), run(async (req, res) => {
  res.json(await Booking.find({ teacher: req.user._id, status: 'pending' }).populate('student', 'name profilePicture').sort({ start: 1 }).lean());
}));
router.patch('/requests/:id', role('teacher'), run(async (req, res) => {
  if (!validId(req.params.id) || !['accept', 'decline'].includes(req.body.action)) throw fail('Choose Accept or Decline for a valid request.');
  await mongoose.connection.transaction(async (session) => {
    const request = await Booking.findOne({ _id: req.params.id, teacher: req.user._id, status: 'pending' }).session(session);
    if (!request) throw fail('This request is no longer pending or does not belong to you.', 409);
    if (req.body.action === 'accept') {
      if (request.start <= new Date()) throw fail('This session time has passed. Decline it so the student can choose another time.', 409);
      // Legacy requests without a subject reference remain valid tutoring requests.
      if (request.subjectId) {
        const enrolled = await Subject.updateOne({ _id: request.subjectId, teacherId: req.user._id }, { $addToSet: { enrolledStudents: request.student } }, { session });
        if (!enrolled.matchedCount) throw fail('The requested subject no longer exists. Decline this request and ask the student to choose another subject.', 409);
      }
      await Booking.updateOne({ _id: request._id, status: 'pending' }, { $set: { status: 'confirmed' } }, { session });
    } else {
      await DeclinedRequest.create([{
        _id: request._id, teacher: request.teacher, student: request.student, slot: request.slot,
        start: request.start, end: request.end, subject: request.subject, subjectId: request.subjectId, price: request.price, requestedAt: request.createdAt,
      }], { session });
      await Booking.deleteOne({ _id: request._id }, { session });
      await Slot.updateOne({ _id: request.slot }, { $set: { booked: false } }, { session });
    }
    await require('../models/Notification').create([{
      recipient: request.student, eventKey: `request:${request._id}:${req.body.action}`, kind: 'session',
      title: req.body.action === 'accept' ? 'Tutoring request accepted' : 'Tutoring request declined',
      message: `${req.user.name} ${req.body.action === 'accept' ? 'accepted' : 'declined'} your ${request.subject} session on ${request.start.toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })} (Manila).`,
      url: '/student/schedules',
    }], { session });
  });
  res.json({ message: req.body.action === 'accept' ? 'Request accepted. The session is confirmed.' : 'Request declined. The time slot is available again.' });
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
    if (!slot.subjectId || String(slot.subjectId) !== req.body.subjectId) throw fail('This time slot is not available for the selected subject.', 409);
    const subjects = await Subject.find({ teacherId: slot.teacher }).select('_id title').session(session);
    const selectedSubject = subjects.find((s) => String(s._id) === req.body.subjectId);
    if ((subjects.length || req.body.subjectId) && !selectedSubject) throw fail('Select one of this teacher\'s subjects before sending your request.');
    [booking] = await Booking.create([{
      teacher: slot.teacher, student: req.user._id, slot: slot._id,
      status: 'pending',
      start: slot.start, end: new Date(slot.start.getTime() + 3600000), subject: selectedSubject?.title || profile.subjectToTeach, subjectId: selectedSubject?._id, price: profile.hourlyRate,
    }], { session });
    await require('../models/Notification').create([{
      recipient: slot.teacher, eventKey: `booking:${booking._id}`, kind: 'session',
      title: 'New tutoring request', message: `${req.user.name} requested a ${booking.subject} session on ${slot.start.toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short', hour12: true })} (Manila).`,
      url: '/teacher/requests',
    }], { session });
  });
  res.status(201).json({ message: 'Request sent. Waiting for teacher approval.', booking });
}));

router.post('/bookings/:id/review', role('student'), run(async (req, res) => {
  if (!validId(req.params.id)) throw fail('Invalid booking.');
  const { rating, text, aspects } = req.body;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw fail('Please select an overall rating of 1 to 5 stars.');
  }
  const reviewText = typeof text === 'string' ? text.trim().slice(0, 1000) : '';

  // Validate optional aspects if provided
  const cleanAspects = {};
  if (aspects && typeof aspects === 'object') {
    ['teachingQuality', 'communication', 'punctuality', 'professionalism'].forEach((key) => {
      const val = Number(aspects[key]);
      if (Number.isInteger(val) && val >= 1 && val <= 5) {
        cleanAspects[key] = val;
      }
    });
  }

  await mongoose.connection.transaction(async (session) => {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, student: req.user._id, status: { $ne: 'pending' } },
      {
        $set: {
          review: {
            rating,
            text: reviewText,
            aspects: Object.keys(cleanAspects).length ? cleanAspects : undefined,
            createdAt: new Date(),
          },
        },
      },
      { returnDocument: 'after', session }
    );
    if (!booking) throw fail('Only your completed, unreviewed bookings can be rated.', 409);

    // Update teacher profile average rating & totalRatings
    const allTeacherReviews = await Booking.find({ teacher: booking.teacher, 'review.rating': { $exists: true } }).session(session);
    const totalRatings = allTeacherReviews.length;
    const averageRating = totalRatings
      ? Math.round((allTeacherReviews.reduce((sum, b) => sum + (b.review?.rating || 0), 0) / totalRatings) * 10) / 10
      : rating;

    await Profile.updateOne(
      { user: booking.teacher },
      { $set: { averageRating, totalRatings } },
      { session }
    );

    await require('../models/Notification').create([{
      recipient: booking.teacher,
      eventKey: `review:${booking._id}`,
      kind: 'review',
      title: 'New student review',
      message: `${req.user.name} rated your ${booking.subject} session ${rating}/5.`,
      url: '/teacher/schedules?tab=past',
    }], { session });
  });

  res.status(201).json({ message: 'Thank you! Your review is saved.' });
}));

router.get('/', role('student'), run(async (req, res) => {
  const profiles = await Profile.find().populate('user', 'name role bio profilePicture').lean();
  const tutors = await Promise.all(profiles.filter((p) => p.user?.role === 'teacher').map(async (p) => ({
    ...await publicProfile(p), slots: await Slot.find({ teacher: p.user._id, booked: false, subjectId: { $in: await Subject.find({ teacherId: p.user._id }).distinct('_id') }, start: { $gt: new Date() } }).select('start subjectId').sort({ start: 1 }).lean(),
  })));
  res.json(tutors);
}));

router.get('/:id', run(async (req, res) => {
  if (!validId(req.params.id)) throw fail('Teacher not found.', 404);
  const profile = await Profile.findOne({ user: req.params.id }).populate('user', 'name role bio profilePicture').lean();
  if (!profile || profile.user?.role !== 'teacher') throw fail('Teacher not found.', 404);
  const reviews = await Booking.find({ teacher: req.params.id, 'review.rating': { $exists: true } }).populate('student', 'name').sort({ 'review.createdAt': -1 }).limit(50).lean();
  res.json({
    ...await publicProfile(profile),
    subjects: await Subject.find({ teacherId: req.params.id }).select('code title').sort({ title: 1 }).lean(),
    slots: await Slot.find({ teacher: req.params.id, booked: false, subjectId: { $in: await Subject.find({ teacherId: req.params.id }).distinct('_id') }, start: { $gt: new Date() } }).select('start subjectId').sort({ start: 1 }).lean(),
    reviews: reviews.map((b) => ({ id: b._id, name: b.student?.name?.split(' ')[0] || 'Student', ...b.review })),
  });
}));

module.exports = router;
