const express = require("express");

const {
  getDashboardData,
} = require("../controllers/studentController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/dashboard-data", protect, require('../middleware/authMiddleware').requireStudent, getDashboardData);

module.exports = router;
