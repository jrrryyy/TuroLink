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
app.use('/api', require('./services/authSecurity').csrf);

app.get("/", (req, res) => {
  res.json({
    message: "TuroLink API is running.",
  });
});

app.use(
  "/uploads",
  express.static(uploadBaseDir)
);

app.use("/api/teacher", teacherRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/subjects", subjectRoutes);
app.use('/api/tutors', require('./routes/tutorRoutes'));
app.use('/api/student-subjects', require('./routes/studentSubjectRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error('API request failed:', error.name);
  res.status(error.type === 'entity.parse.failed' ? 400 : 500).json({
    message: error.type === 'entity.parse.failed' ? 'Invalid request body.' : 'Unable to complete this request. Please try again.',
  });
});

module.exports = app;
