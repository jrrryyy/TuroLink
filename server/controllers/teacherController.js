const TeacherProfile = require('../models/TeacherProfile');
const { upcomingBookings } = require('../services/bookingSummary');
const Booking = require('../models/Booking');
const registerTeacher = (req, res) => require('./authController').createAccount(req, res, 'teacher');

const getTeacherDashboard = async (req, res) => {
  try {
    if (req.user.role !== "teacher" && req.user.role !== "admin") {
      return res.status(403).json({
        message: "Teacher access only.",
      });
    }

    let teacherProfile =
      await TeacherProfile.findOne({
        user: req.user._id,
      });

    if (!teacherProfile && req.user.role === "admin") {
      teacherProfile = await TeacherProfile.create({
        user: req.user._id,
        degreeTitle: "Administrator",
        subjectToTeach: "All Subjects",
        teachingBio: "Platform Administrator with instructor access privileges.",
        isVerified: true,
      });
    } else if (!teacherProfile) {
      return res.status(404).json({
        message: "Teacher profile not found.",
      });
    }

    const [rating] = await Booking.aggregate([
      { $match: { teacher: req.user._id, 'review.rating': { $exists: true } } },
      { $group: { _id: null, average: { $avg: '$review.rating' }, count: { $sum: 1 } } },
    ]);
    const subjects = await require('../models/Subject').find({ teacherId: req.user._id }).select('enrolledStudents').lean();
    const manilaNow = new Date(Date.now() + 8 * 3600000);
    const weekStart = new Date(Date.UTC(manilaNow.getUTCFullYear(), manilaNow.getUTCMonth(), manilaNow.getUTCDate() - (manilaNow.getUTCDay() + 6) % 7) - 8 * 3600000);
    const completed = await Booking.find({ teacher: req.user._id, status: 'confirmed', start: { $gte: weekStart }, end: { $lte: new Date() } }).select('start end').lean();

    const allCompleted = await Booking.find({
      teacher: req.user._id,
      status: 'confirmed',
      end: { $lte: new Date() },
    }).populate('student', 'name').sort({ start: -1 }).lean();

    // 7-day daily trend
    const dailyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const label = d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' });
      const dayName = d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short' });
      const dayStart = new Date(new Date(d).setHours(0, 0, 0, 0));
      const dayEnd = new Date(new Date(d).setHours(23, 59, 59, 999));
      const daySessions = allCompleted.filter(b => b.start >= dayStart && b.start <= dayEnd);
      dailyTrend.push({
        label,
        dayName,
        count: daySessions.length,
        hours: Math.round(daySessions.reduce((h, b) => h + (b.end - b.start) / 3600000, 0) * 10) / 10,
      });
    }

    // 6-month monthly trend
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthLabel = d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short' });
      const year = d.getFullYear();
      const monthStart = new Date(year, d.getMonth(), 1);
      const monthEnd = new Date(year, d.getMonth() + 1, 0, 23, 59, 59, 999);
      const monthSessions = allCompleted.filter(b => b.start >= monthStart && b.start <= monthEnd);
      monthlyTrend.push({
        label: monthLabel,
        count: monthSessions.length,
        hours: Math.round(monthSessions.reduce((h, b) => h + (b.end - b.start) / 3600000, 0) * 10) / 10,
      });
    }

    // Breakdown by subject
    const subjectMap = {};
    for (const b of allCompleted) {
      const subj = b.subject || 'General Tutoring';
      if (!subjectMap[subj]) subjectMap[subj] = { subject: subj, count: 0, hours: 0 };
      subjectMap[subj].count += 1;
      subjectMap[subj].hours = Math.round((subjectMap[subj].hours + (b.end - b.start) / 3600000) * 10) / 10;
    }
    const bySubject = Object.values(subjectMap).sort((a, b) => b.count - a.count);

    // Recent completed sessions
    const recentCompleted = allCompleted.slice(0, 6).map((b) => ({
      _id: b._id,
      studentName: b.student?.name || 'Student',
      subject: b.subject,
      time: b.start.toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short', hour12: true }) + ' (Manila)',
      hours: Math.round(((b.end - b.start) / 3600000) * 10) / 10,
      rating: b.review?.rating || null,
      reviewText: b.review?.text || '',
    }));

    const totalCompletedHours = Math.round(allCompleted.reduce((h, b) => h + (b.end - b.start) / 3600000, 0) * 10) / 10;
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
          new Set(subjects.flatMap(subject => subject.enrolledStudents.map(String))).size,

        weeklyHours:
          Math.round(completed.reduce((hours, session) => hours + (session.end - session.start) / 3600000, 0) * 10) / 10,

        activeSubjects:
          subjects.length,

        averageRating:
          rating?.average || 0,

        totalRatings:
          rating?.count || 0,
      },

      subjects: teacherProfile.subjects,

      schedules: [...await upcomingBookings(req.user._id, 'teacher'), ...teacherProfile.schedules],

      requests: (await Booking.find({ teacher: req.user._id, status: 'pending' }).populate('student', 'name').sort({ start: 1 }).lean()).map((request) => ({
        _id: request._id, studentName: request.student?.name || 'Student', subject: request.subject,
        time: request.start.toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short', hour12: true }) + ' (Manila)', status: 'pending',
      })),

      messages: teacherProfile.messages,

      completedAnalytics: {
        totalCompleted: allCompleted.length,
        totalHours: totalCompletedHours,
        thisWeekCount: completed.length,
        thisWeekHours: Math.round(completed.reduce((hours, session) => hours + (session.end - session.start) / 3600000, 0) * 10) / 10,
        dailyTrend,
        monthlyTrend,
        bySubject,
        recentCompleted,
      },
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
