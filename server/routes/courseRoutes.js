const express = require("express");

const {
  getMyCourses,
  enrollCourse,
  updateCourse,
} = require("../controllers/courseController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect, require('../middleware/authMiddleware').requireStudent);

router.get("/my-courses", protect, require('../controllers/studentSubjectController').list);

router.post("/enroll", protect, enrollCourse);

router.put("/:id", protect, updateCourse);

module.exports = router;
