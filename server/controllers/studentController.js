const { upcomingBookings } = require('../services/bookingSummary');
const getDashboardData = async (req, res) => {
  try {
    const user = req.user;

    res.json({
      student: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },

      enrolledCourses: user.enrolledCourses,

      sessionHours: user.sessionHours,

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
