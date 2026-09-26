const app = require("../app");
const connectDB = require("../config/db");

module.exports = async (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-TuroLink-Request,x-csrf-token");
  }

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    await connectDB();
  } catch (err) {
    console.error("Database connection failure in serverless function:", err);
    return res.status(500).json({
      message: "Database connection failed. Please ensure MongoDB Atlas Network Access allows 0.0.0.0/0.",
      error: err.message,
    });
  }

  return app(req, res);
};
