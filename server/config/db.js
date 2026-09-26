const mongoose = require("mongoose");
const dns = require("dns");

// Force Node.js DNS queries through Google DNS (safe try/catch for serverless sandboxes)
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch {
  // Ignore DNS override errors in serverless/restricted environments
}

let cachedConnection = null;

const connectDB = async () => {
  if (cachedConnection && mongoose.connection.readyState >= 1) {
    return cachedConnection;
  }

  try {
    const connection = await mongoose.connect(
      process.env.MONGO_URI
    );

    cachedConnection = connection;
    console.log(
      `MongoDB connected: ${connection.connection.host}`
    );
    return connection;
  } catch (error) {
    console.error(
      "MongoDB connection error:",
      error.message
    );

    if (!process.env.VERCEL) {
      process.exit(1);
    }
    throw error;
  }
};


module.exports = connectDB;