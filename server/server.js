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

connectDB();

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
  express.static(path.join(__dirname, "uploads"))
);

app.use(express.json());

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


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// Publish scheduled classwork every 30 seconds; reads also catch up after downtime.
const { publishDueMaterials } = require('./controllers/materialController');
const materialPublisher = setInterval(() => {
  if (require('mongoose').connection.readyState === 1) {
    publishDueMaterials().catch((error) => console.error('Classwork scheduler:', error.name));
  }
}, 30000);
materialPublisher.unref();
