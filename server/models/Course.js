const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    instructorName: {
      type: String,
      required: true,
      trim: true,
    },

    instructorAvatar: {
      type: String,
      default: "",
    },

    upcomingTopic: {
      type: String,
      default: "No upcoming topic",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Course", courseSchema);