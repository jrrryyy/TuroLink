const Booking = require('../models/Booking');
const { upcomingBookings } = require('../services/bookingSummary');
const getDashboardData = async (req, res) => {
  try {
    const user = req.user;

    const now = new Date();
    const local = new Date(+now + 8 * 3600000);
    const months = Array.from({ length: 6 }, (_, i) => new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - 5 + i, 1)));
    const totals = await Booking.aggregate([
      { $match: { student: user._id, status: 'confirmed', end: { $lte: now, $gte: new Date(+months[0] - 8 * 3600000) } } },
      { $group: { _id: { $dateToString: { date: '$end', format: '%Y-%m', timezone: 'Asia/Manila' } }, hours: { $sum: { $divide: [{ $subtract: ['$end', '$start'] }, 3600000] } } } }
    ]);
    const sessionHours = months.map(month => ({ month: month.toLocaleDateString('en', { month: 'short', timeZone: 'UTC' }), hours: Math.round((totals.find(row => row._id === month.toISOString().slice(0, 7))?.hours || 0) * 10) / 10 }));
    res.json({
      student: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },

      enrolledCourses: user.enrolledCourses,

      sessionHours,

      upcomingClasses: await upcomingBookings(user._id, 'student'),
    });
  } catch (error) {
    console.error("Dashboard error:", error);

    res.status(500).json({
      message: "Unable to load dashboard.",
    });
  }
};

module.exports = {
  getDashboardData,
};
