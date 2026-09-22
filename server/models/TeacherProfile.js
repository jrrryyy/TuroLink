const mongoose = require("mongoose");

const teacherProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    degreeTitle: {
      type: String,
      required: true,
      trim: true,
    },

    subjectToTeach: {
      type: String,
      required: true,
      trim: true,
    },

    teachingBio: {
      type: String,
      required: true,
      trim: true,
    },

    verificationDocument: {
      type: String,
      default: "",
    },

    activeStudents: {
      type: Number,
      default: 0,
    },

    weeklyHours: {
      type: Number,
      default: 0,
    },

    hourlyRate: { type: Number, min: 1, max: 100000, default: null },

    averageRating: {
      type: Number,
      default: 0,
    },

    totalRatings: {
      type: Number,
      default: 0,
    },

    subjects: [
      {
        name: String,
      },
    ],

    schedules: [
      {
        subject: String,
        time: String,
        students: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
      },
    ],

    requests: [
      {
        studentName: String,
        subject: String,
        time: String,

        status: {
          type: String,
          enum: ["pending", "accepted", "declined"],
          default: "pending",
        },
      },
    ],

    messages: [
      {
        studentName: String,
        message: String,
        unread: {
          type: Boolean,
          default: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "TeacherProfile",
  teacherProfileSchema
);
