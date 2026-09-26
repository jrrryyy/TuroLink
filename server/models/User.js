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

    // Sparse so existing duplicate accounts remain usable until corrected.
    phoneKey: { type: String, unique: true, sparse: true, select: false },

    bio: { type: String, default: '', maxlength: 2000 },
    sex: { type: String, enum: ['', 'male', 'female', 'other', 'prefer-not-to-say'], default: '' },
    profilePicture: { type: String, default: '' },
    password: {
      type: String,
      required: function () { return !this.googleSub; },
      minlength: 6,
    },

    emailVerifiedAt: { type: Date, default: null },
    verificationHash: { type: String, select: false },
    verificationExpiresAt: { type: Date, select: false },
    verificationSentAt: { type: Date, select: false },
    googleSub: { type: String, unique: true, sparse: true },
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
    notificationPreferences: {
      emailNotifications: { type: Boolean, default: true },
      sessionReminders: { type: Boolean, default: true },
      newMessageAlerts: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: false },
    },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  {
    timestamps: true,
  }
);

// Canonical key prevents concurrent registrations from claiming the same number.
userSchema.pre('validate', async function () {
  if (this.isNew || this.isModified('phone')) {
    const { loadValidators } = require("../config/validators");
    const { normalizePhone } = await loadValidators();
    this.phone = normalizePhone(this.phone);
    if (this.phone) this.phoneKey = this.phone;
  }
});

module.exports = mongoose.model("User", userSchema);
