const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const TeacherProfile = require("../models/TeacherProfile");

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
      return res.status(400).json({
        message:
          "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const teacher = await User.create({
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
          teacherProfile.averageRating,

        totalRatings:
          teacherProfile.totalRatings,
      },

      subjects: teacherProfile.subjects,

      schedules: teacherProfile.schedules,

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