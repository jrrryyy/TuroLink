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

const multer = require('multer');
const { updateAccount } = require('../controllers/accountController');
const pictureUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });
router.put('/me', protect, (req, res, next) => pictureUpload.single('profilePicture')(req, res, (error) => {
  if (error) return res.status(400).json({ message: 'Unable to upload photo.', errors: { profilePicture: error.code === 'LIMIT_FILE_SIZE' ? 'Choose an image of 2 MB or smaller.' : 'Upload one JPG, PNG, or WebP image.' } });
  next();
}), updateAccount);
module.exports = router;