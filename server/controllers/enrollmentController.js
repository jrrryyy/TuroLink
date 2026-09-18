const Enrollment = require("../models/Enrollment");

const createEnrollment = async (req, res) => {
  try {
    const { tutor, subject, message } = req.body;

    if (!tutor || !subject) {
      return res.status(400).json({
        message: "Tutor and subject are required.",
      });
    }

    const existing = await Enrollment.findOne({
      student: req.user._id,
      tutor,
      subject,
      status: {
        $in: ["pending", "accepted"],
      },
    });

    if (existing) {
      return res.status(400).json({
        message: "You already applied for this subject.",
      });
    }

    const enrollment = await Enrollment.create({
      student: req.user._id,
      tutor,
      subject,
      message: message || "",
    });

    res.status(201).json({
      message: "Enrollment request sent successfully.",
      enrollment,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getMyEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({
      student: req.user._id,
    })
      .populate({
        path: "tutor",
        populate: {
          path: "user",
          select: "name profilePicture",
        },
      })
      .populate("subject");

    res.json(enrollments);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  createEnrollment,
  getMyEnrollments,
};