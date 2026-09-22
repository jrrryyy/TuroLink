const mongoose = require("mongoose");


// ============================================
// ANNOUNCEMENT SCHEMA
// ============================================

const announcementSchema =
  new mongoose.Schema(
    {
      likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      comments: [{
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        text: { type: String, required: true, maxlength: 2000 },
        createdAt: { type: Date, default: Date.now },
      }],
      content: {
        type: String,
        default: "",
        trim: true,
      },

      // Uploaded file URL/path
      attachment: {
        type: String,
        default: "",
      },

      // Original uploaded file name
      attachmentName: {
        type: String,
        default: "",
      },

      // MIME type
      attachmentType: {
        type: String,
        default: "",
      },

      // Optional external link
      link: {
        type: String,
        default: "",
        trim: true,
      },

      status: {
        type: String,
        enum: [
          "posted",
          "scheduled",
        ],
        default: "posted",
      },

      scheduledAt: {
        type: Date,
        default: null,
      },

      postedAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      timestamps: true,
    }
  );


// ============================================
// MATERIAL SCHEMA
// ============================================

const materialSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  type: { type: String, enum: ['assignment', 'quiz'], default: 'assignment' },
  instructions: { type: String, default: '' },
  points: { type: Number, default: null, min: 0, max: 1000 },
  dueAt: { type: Date, default: null },
  status: { type: String, enum: ['draft', 'scheduled', 'posted', 'archived'], default: 'posted' },
  scheduledAt: { type: Date, default: null },
  postedAt: { type: Date, default: null },
  link: { type: String, default: '' },
  fileUrl: { type: String, default: '' },
  attachmentKey: { type: String, default: '' },
  attachmentName: { type: String, default: '' },
  attachmentType: { type: String, default: '' },
  attachmentSize: { type: Number, default: 0 },
}, { timestamps: true });

// ============================================
// SUBJECT SCHEMA
// ============================================

const subjectSchema =
  new mongoose.Schema(
    {
      teacherId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,

        index: true,
      },

      code: {
        type: String,
        required: true,
        trim: true,
      },

      title: {
        type: String,
        required: true,
        trim: true,
      },

      description: {
        type: String,
        default: "",
        trim: true,
      },

      enrolledStudents: [
        {
          type:
            mongoose.Schema.Types
              .ObjectId,

          ref: "User",
        },
      ],

      rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },

      announcements: [
        announcementSchema,
      ],

      materials: [
        materialSchema,
      ],
    },
    {
      timestamps: true,
    }
  );


module.exports =
  mongoose.model(
    "Subject",
    subjectSchema
  );
