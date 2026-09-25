const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
      index: true,
    },
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['submitted', 'graded'],
      default: 'submitted',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    // Attached work file
    attachmentKey: {
      type: String,
      default: '',
    },
    attachmentName: {
      type: String,
      default: '',
    },
    attachmentType: {
      type: String,
      default: '',
    },
    attachmentSize: {
      type: Number,
      default: 0,
    },
    // Optional private student note
    text: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000,
    },
    // Teacher grading
    grade: {
      type: Number,
      default: null,
      min: 0,
      max: 1000,
    },
    feedback: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000,
    },
    gradedAt: {
      type: Date,
      default: null,
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

submissionSchema.index({ materialId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('Submission', submissionSchema);
