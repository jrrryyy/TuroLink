const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const TeacherProfile = require("../models/TeacherProfile");
const { upcomingBookings } = require('../services/bookingSummary');
const Booking = require('../models/Booking');

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    {
      expiresIn:
        process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

// ==========================================
// REGISTER TEACHER
// ==========================================

const registerTeacher = async (req, res) => {
  let createdTeacher;
  try {
    const {
      name,
      email,
      phone,
      password,
      degreeTitle,
      subjectToTeach,
      teachingBio,
    } = req.body;

    if (
      !name ||
      !email ||
      !phone ||
      !password ||
      !degreeTitle ||
      !subjectToTeach ||
      !teachingBio
    ) {
      return res.status(400).json({
        message: "Please complete all required fields.",
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
        errors: { email: "An account with this email already exists." },
      });
    }

    if (await User.exists({ phone })) {
      return res.status(409).json({ message: "This mobile number is already registered.", errors: { phone: "This mobile number is already registered. Use a different number." } });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const teacher = createdTeacher = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      role: "teacher",
    });

    const documentPath = req.file
      ? `/uploads/${req.file.filename}`
      : "";

    const teacherProfile =
      await TeacherProfile.create({
        user: teacher._id,

        degreeTitle,
        subjectToTeach,
        teachingBio,

        verificationDocument: documentPath,

        subjects: [
          {
            name: subjectToTeach,
          },
        ],
      });

    const token = generateToken(teacher._id);

    res.status(201).json({
      message:
        "Teacher account created successfully.",

      token,

      user: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        role: teacher.role,
      },

      teacherProfile,
    });
  } catch (error) {
    if (createdTeacher) {
      await TeacherProfile.deleteOne({ user: createdTeacher._id });
      await User.deleteOne({ _id: createdTeacher._id });
    }
    if (error.code === 11000) {
      const field = error.keyPattern?.phoneKey || error.keyPattern?.phone ? 'phone' : 'email';
      const message = field === 'phone' ? 'This mobile number is already registered. Use a different number.' : 'An account with this email already exists.';
      return res.status(409).json({ message, errors: { [field]: message } });
    }
    console.error(
      "Teacher registration error:",
      error
    );

    res.status(500).json({
      message: "Server error while registering teacher.",
    });
  }
};

// ==========================================
// TEACHER DASHBOARD
// ==========================================

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

      requests: teacherProfile.requests,

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
