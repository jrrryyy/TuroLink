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
  getTeacherSubjects
);


// ============================================
// CREATE SUBJECT
// ============================================

router.post(
  "/",
  protect,
  createSubject
);


// ============================================
// GET SUBJECT
// ============================================

router.get(
  "/:id",
  protect,
  getSubject
);


// ============================================
// UPDATE SUBJECT
// ============================================

router.put(
  "/:id",
  protect,
  updateSubject
);


// ============================================
// DELETE SUBJECT
// ============================================

router.delete(
  "/:id",
  protect,
  deleteSubject
);


// ============================================
// CREATE ANNOUNCEMENT
// ============================================

router.post(
  "/:id/announcements",
  protect,
  announcementUpload.single(
    "attachment"
  ),
  createAnnouncement
);


// ============================================
// DELETE ANNOUNCEMENT
// ============================================

router.delete(
  "/:id/announcements/:announcementId",
  protect,
  deleteAnnouncement
);


// IMPORTANT:
// module.exports MUST be last.

module.exports = router;