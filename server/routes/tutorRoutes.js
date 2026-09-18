const express = require("express");

const {
  getTutors,
  getTutorById,
} = require("../controllers/tutorController");

const router = express.Router();

router.get("/", getTutors);
router.get("/:id", getTutorById);

module.exports = router;