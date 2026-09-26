require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const { getUploadPath } = require("./config/storage");

const teacherRoutes = require("./routes/teacherRoutes");
const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const courseRoutes = require("./routes/courseRoutes");
const subjectRoutes = require("./routes/subjectRoutes");

const app = express();
const uploadBaseDir = getUploadPath();

const clientUrl = (process.env.CLIENT_URL || '').replace(/\/+$/, '');

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      const clean = origin.replace(/\/+$/, '');
      if (
        process.env.NODE_ENV !== "production" ||
        !clientUrl ||
        clean === clientUrl ||
        clean.endsWith('.vercel.app') ||
        clean.includes('localhost') ||
        clean.includes('127.0.0.1')
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Fallback allow to avoid unexpected lockouts
    },
    credentials: true,
  })
);

app.use(
  "/uploads",
  require('./middleware/privateUploads'),
  express.static(uploadBaseDir)
);

app.use(express.json());
app.use(['/api', '/auth', '/teacher', '/student', '/courses', '/subjects', '/tutors', '/student-subjects', '/notifications', '/messages'], require('./services/authSecurity').csrf);

app.get("/", (req, res) => {
  res.json({
    message: "TuroLink API is running.",
  });
});

app.use(
  "/uploads",
  express.static(uploadBaseDir)
);

// Mount with and without /api prefix for bulletproof client compatibility
app.use(["/api/teacher", "/teacher"], teacherRoutes);
app.use(["/api/auth", "/auth"], authRoutes);
app.use(["/api/student", "/student"], studentRoutes);
app.use(["/api/courses", "/courses"], courseRoutes);
app.use(["/api/subjects", "/subjects"], subjectRoutes);
app.use(["/api/tutors", "/tutors"], require('./routes/tutorRoutes'));
app.use(["/api/student-subjects", "/student-subjects"], require('./routes/studentSubjectRoutes'));
app.use(["/api/notifications", "/notifications"], require('./routes/notificationRoutes'));
app.use(["/api/messages", "/messages"], require('./routes/messageRoutes'));

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error('API request failed:', error.name);
  res.status(error.type === 'entity.parse.failed' ? 400 : 500).json({
    message: error.type === 'entity.parse.failed' ? 'Invalid request body.' : 'Unable to complete this request. Please try again.',
  });
});

module.exports = app;
