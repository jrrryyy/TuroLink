const app = require("../app");
const connectDB = require("../config/db");

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (err) {
    console.error("Database connection failure in serverless function:", err);
    return res.status(500).json({ message: "Database connection failed." });
  }

  return app(req, res);
};
