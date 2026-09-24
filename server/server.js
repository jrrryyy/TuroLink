require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

const teacherRoutes = require("./routes/teacherRoutes");
const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const courseRoutes = require("./routes/courseRoutes");
const subjectRoutes = require("./routes/subjectRoutes");

const app = express();
const path = require("path");


app.use(
  cors({
    origin: process.env.NODE_ENV === "production"
      ? (process.env.CLIENT_URL || "http://localhost:5173")
      : [process.env.CLIENT_URL, "http://localhost:5173", "http://127.0.0.1:5173"].filter(Boolean),
    credentials: true,
  })
);

app.use(
  "/uploads",
  require('./middleware/privateUploads'),
  express.static(path.join(__dirname, "uploads"))
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
  express.static(
    path.join(
      __dirname,
      "uploads"
    )
  )
);
app.use("/api/teacher", teacherRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/subjects",subjectRoutes);
app.use('/api/tutors', require('./routes/tutorRoutes'));
app.use('/api/student-subjects', require('./routes/studentSubjectRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error('API request failed:', error.name);
  res.status(error.type === 'entity.parse.failed' ? 400 : 500).json({ message: error.type === 'entity.parse.failed' ? 'Invalid request body.' : 'Unable to complete this request. Please try again.' });
});


const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  await Promise.all(['User', 'AuthSession', 'AuthChallenge', 'Notification'].map(name => require(`./models/${name}`).init()));
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
start().catch(error => { console.error('Unable to initialize authentication:', error.name); process.exitCode = 1; });
// Publish scheduled classwork every 30 seconds; reads also catch up after downtime.
const { publishDueMaterials } = require('./controllers/materialController');
const materialPublisher = setInterval(() => {
  if (require('mongoose').connection.readyState === 1) {
    publishDueMaterials().catch((error) => console.error('Classwork scheduler:', error.name));
  }
}, 30000);
materialPublisher.unref();
