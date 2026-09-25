const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const controller = require('../controllers/studentSubjectController');
router.use(protect, (req, res, next) => req.user.role === 'student' ? next() : res.status(403).json({ message: 'Student access only.' }));
router.get('/', controller.list);
router.get('/:id', controller.detail);
router.put('/:id/announcements/:announcementId/like', controller.like);
router.post('/:id/announcements/:announcementId/comments', controller.comment);
router.get('/:id/announcements/:announcementId/attachment', controller.attachment);
router.get('/:id/materials/:materialId/attachment', controller.attachment);

const multer = require('multer');
const submissions = require('../controllers/submissionController');
const submissionUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
});
const uploadSubmission = (req, res, next) => submissionUpload.single('file')(req, res, (error) => {
  if (error) return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'Work attachments must be 15 MB or smaller.' : 'Unable to upload file.' });
  next();
});

router.post('/:id/materials/:materialId/submission', uploadSubmission, submissions.submitWork);
router.delete('/:id/materials/:materialId/submission', submissions.unsubmitWork);
router.get('/:id/materials/:materialId/submission/attachment', submissions.downloadStudentAttachment);

module.exports = router;
