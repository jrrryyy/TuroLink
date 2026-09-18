const express = require("express");

const {
  createEnrollment,
  getMyEnrollments,
} = require("../controllers/enrollmentController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, createEnrollment);

router.get(
  "/my",
  protect,
  getMyEnrollments
);

module.exports = router;