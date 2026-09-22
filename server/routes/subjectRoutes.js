const { validation, uploadValidation } = require("../middleware/validationMiddleware");
const { requireTeacher } = require("../middleware/teacherMiddleware");
const express =
  require("express");

const {
  getTeacherSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject,
  createAnnouncement,
  deleteAnnouncement,
} = require(
  "../controllers/subjectController"
);

const {
  protect,
} = require(
  "../middleware/authMiddleware"
);

const announcementUpload =
  require(
    "../middleware/announcementUploadMiddleware"
  );


const router =
  express.Router();


// ============================================
// TEACHER SUBJECTS
// ============================================

router.get(
  "/my-subjects",
  protect,
  requireTeacher,
  getTeacherSubjects
);


// ============================================
// CREATE SUBJECT
// ============================================

router.post(
  "/",
  protect,
  requireTeacher,
  validation("subject"),
  createSubject
);


// ============================================
// GET SUBJECT
// ============================================

router.get(
  "/:id",
  protect,
  requireTeacher,
  getSubject
);


// ============================================
// UPDATE SUBJECT
// ============================================

router.put(
  "/:id",
  protect,
  requireTeacher,
  validation("subject"),
  updateSubject
);


// ============================================
// DELETE SUBJECT
// ============================================

router.delete(
  "/:id",
  protect,
  requireTeacher,
  deleteSubject
);


// ============================================
// CREATE ANNOUNCEMENT
// ============================================

router.post(
  "/:id/announcements",
  protect,
  requireTeacher,
  uploadValidation(announcementUpload.single("attachment"), "attachment"),
  validation("announcement"),
  createAnnouncement
);


// ============================================
// DELETE ANNOUNCEMENT
// ============================================

router.delete(
  "/:id/announcements/:announcementId",
  protect,
  requireTeacher,
  deleteAnnouncement
);


// IMPORTANT:
// module.exports MUST be last.

const multer = require('multer');
const materials = require('../controllers/materialController');
const materialUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
const uploadMaterial = (req, res, next) => materialUpload.single('attachment')(req, res, (error) => {
  if (error) return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'Attachments must be 10 MB or smaller.' : 'Unable to upload attachment.' });
  next();
});
router.get('/:id/materials', protect, requireTeacher, materials.listMaterials);
router.post('/:id/materials', protect, requireTeacher, uploadMaterial, materials.saveMaterial);
router.put('/:id/materials/:materialId', protect, requireTeacher, uploadMaterial, materials.saveMaterial);
router.patch('/:id/materials/:materialId', protect, requireTeacher, materials.changeMaterialStatus);
router.delete('/:id/materials/:materialId', protect, requireTeacher, materials.deleteMaterial);
router.get('/:id/materials/:materialId/attachment', protect, requireTeacher, materials.downloadAttachment);
router.get('/:id/announcements/:announcementId/attachment', protect, requireTeacher, require('../controllers/studentSubjectController').attachment);
module.exports = router;
