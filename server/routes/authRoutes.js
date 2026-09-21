const { validation } = require("../middleware/validationMiddleware");
const express = require("express");

const {
  register,
  login,
  getMe,
} = require("../controllers/authController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", validation("student"), register);
router.post("/login", validation("login"), login);
router.get("/me", protect, getMe);

module.exports = router;