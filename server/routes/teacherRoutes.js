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
  upload.single("verificationDocument"),
  registerTeacher
);

router.get(
  "/dashboard-data",
  protect,
  requireTeacher,
  getTeacherDashboard
);

module.exports = router;