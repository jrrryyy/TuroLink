const multer =
  require("multer");

const path =
  require("path");

const fs =
  require("fs");


const { getUploadPath } = require("../config/storage");

// ============================================
// UPLOAD DIRECTORY
// ============================================

const uploadDirectory = getUploadPath("announcements");



// ============================================
// STORAGE
// ============================================

const storage = multer.memoryStorage();


// ============================================
// ALLOWED FILE TYPES
// ============================================

const fileFilter = (
  req,
  file,
  cb
) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
    "image/jpeg",
    "image/jpg",
    "image/pjpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/svg+xml",
    "application/zip",
    "application/x-zip-compressed",
  ];

  if (
    allowedTypes.includes(
      file.mimetype
    )
  ) {
    cb(
      null,
      true
    );
  } else {
    cb(
      new Error(
        "Unsupported file type."
      ),
      false
    );
  }
};


// ============================================
// MULTER
// ============================================

const announcementUpload =
  multer({
    storage,

    fileFilter,

    limits: {
      // 10 MB
      fileSize:
        10 * 1024 * 1024,
    },
  });


module.exports =
  announcementUpload;