const { validation, uploadValidation } = require("../middleware/validationMiddleware");
const { requireTeacher } = require("../middleware/teacherMiddleware");
const express = require("express");

const {
  registerTeacher,
  getTeacherDashboard,
} = require("../controllers/teacherController");

const {
  protect,
} = require("../middleware/authMiddleware");

const upload = require(
  "../middleware/uploadMiddleware"
);

const router = express.Router();

router.post(
  "/register",
  uploadValidation(upload.single("verificationDocument"), "verificationDocument"),
  validation("teacher"),
  registerTeacher
);

router.get(
  "/dashboard-data",
  protect,
  requireTeacher,
  getTeacherDashboard
);

module.exports = router;