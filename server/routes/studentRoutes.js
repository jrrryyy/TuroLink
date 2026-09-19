const express = require("express");

const {
  getDashboardData,
} = require("../controllers/studentController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/dashboard-data", protect, getDashboardData);

module.exports = router;