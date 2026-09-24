const TeacherProfile = require('../models/TeacherProfile');
const { upcomingBookings } = require('../services/bookingSummary');
const Booking = require('../models/Booking');
const registerTeacher = (req, res) => require('./authController').createAccount(req, res, 'teacher');

const getTeacherDashboard = async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({
        message: "Teacher access only.",
      });
    }

    const teacherProfile =
      await TeacherProfile.findOne({
        user: req.user._id,
      });

    if (!teacherProfile) {
      return res.status(404).json({
        message: "Teacher profile not found.",
      });
    }

    const [rating] = await Booking.aggregate([
      { $match: { teacher: req.user._id, 'review.rating': { $exists: true } } },
      { $group: { _id: null, average: { $avg: '$review.rating' }, count: { $sum: 1 } } },
    ]);
    res.json({
      teacher: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
      },

      statistics: {
        activeStudents:
          teacherProfile.activeStudents,

        weeklyHours:
          teacherProfile.weeklyHours,

        activeSubjects:
          teacherProfile.subjects.length,

        averageRating:
          rating?.average || 0,

        totalRatings:
          rating?.count || 0,
      },

      subjects: teacherProfile.subjects,

      schedules: [...await upcomingBookings(req.user._id, 'teacher'), ...teacherProfile.schedules],

      requests: (await Booking.find({ teacher: req.user._id, status: 'pending' }).populate('student', 'name').sort({ start: 1 }).lean()).map((request) => ({
        _id: request._id, studentName: request.student?.name || 'Student', subject: request.subject,
        time: request.start.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) + ' (Manila)', status: 'pending',
      })),

      messages: teacherProfile.messages,
    });
  } catch (error) {
    console.error(
      "Teacher dashboard error:",
      error
    );

    res.status(500).json({
      message:
        "Server error while loading dashboard.",
    });
  }
};

module.exports = {
  registerTeacher,
  getTeacherDashboard,
};
