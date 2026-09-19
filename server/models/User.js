const mongoose = require("mongoose");

const sessionHourSchema = new mongoose.Schema(
  {
    month: {
      type: String,
      required: true,
    },
    hours: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },

    role: {
    type: String,
    enum: ["student", "teacher"],
    default: "student",
    },

    enrolledCourses: {
      type: [courseSchema],
      default: [
        { name: "Mathematics", progress: 75 },
        { name: "Science", progress: 60 },
        { name: "English", progress: 85 },
      ],
    },

    sessionHours: {
      type: [sessionHourSchema],
      default: [
        { month: "Jan", hours: 4 },
        { month: "Feb", hours: 7 },
        { month: "Mar", hours: 5 },
        { month: "Apr", hours: 9 },
        { month: "May", hours: 6 },
        { month: "Jun", hours: 8 },
      ],
    },

    upcomingClasses: {
      type: [
        {
          subject: String,
          time: String,
          tutor: String,
        },
      ],
      default: [
        {
          subject: "Mathematics",
          time: "10:00 AM - 11:00 AM",
          tutor: "TuroLink Tutor",
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);