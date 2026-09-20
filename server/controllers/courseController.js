const Course = require("../models/Course");

// ============================================
// GET STUDENT COURSES
// GET /api/courses/my-courses
// ============================================
const getMyCourses = async (req, res) => {
  try {
    const courses = await Course.find({
      studentId: req.user._id,
    }).sort({ createdAt: -1 });

    res.status(200).json(courses);
  } catch (error) {
    console.error("Get courses error:", error);

    res.status(500).json({
      message: "Failed to load courses.",
    });
  }
};


// ============================================
// ENROLL / ADD COURSE
// POST /api/courses/enroll
// ============================================
const enrollCourse = async (req, res) => {
  try {
    const {
      title,
      instructorName,
      instructorAvatar,
      upcomingTopic,
      description,
    } = req.body;

    if (!title || !instructorName) {
      return res.status(400).json({
        message:
          "Course title and instructor name are required.",
      });
    }

    const course = await Course.create({
      title,
      instructorName,
      instructorAvatar: instructorAvatar || "",
      upcomingTopic:
        upcomingTopic || "No upcoming topic",
      description: description || "",
      studentId: req.user._id,
    });

    res.status(201).json(course);
  } catch (error) {
    console.error("Enroll course error:", error);

    res.status(500).json({
      message: "Failed to enroll course.",
    });
  }
};


// ============================================
// UPDATE COURSE
// PUT /api/courses/:id
// ============================================
const updateCourse = async (req, res) => {
  try {
    const course = await Course.findOne({
      _id: req.params.id,
      studentId: req.user._id,
    });

    if (!course) {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    const allowedFields = [
      "title",
      "instructorName",
      "instructorAvatar",
      "upcomingTopic",
      "description",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        course[field] = req.body[field];
      }
    });

    const updatedCourse = await course.save();

    res.status(200).json(updatedCourse);
  } catch (error) {
    console.error("Update course error:", error);

    res.status(500).json({
      message: "Failed to update course.",
    });
  }
};


module.exports = {
  getMyCourses,
  enrollCourse,
  updateCourse,
};