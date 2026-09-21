// Run with: node scripts/check-subject-api.js
// Uses a separate database and removes only the test records it creates.
require("dotenv").config({ quiet: true });
const assert = require("node:assert/strict");
// Match the DNS configuration used by config/db.js.
require("dns").setServers(["8.8.8.8", "8.8.4.4"]);
const mongoose = require("mongoose");
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Subject = require("../models/Subject");
const routes = require("../routes/subjectRoutes");

async function main() {
  assert(process.env.MONGO_URI && process.env.JWT_SECRET, "MONGO_URI and JWT_SECRET are required.");
  const users = [];
  let server;
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: "turolink_integration_checks", serverSelectionTimeoutMS: 8000 });
    for (const role of ["teacher", "teacher", "student"]) {
      users.push(await User.create({ name: "API check", email: new mongoose.Types.ObjectId() + "@example.invalid", phone: '09' + require('crypto').randomInt(1000000000).toString().padStart(9, '0'), password: "unused-test-account", role }));
    }
    const app = express(); app.use(express.json()); app.use("/api/subjects", routes);
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const base = "http://127.0.0.1:" + server.address().port + "/api/subjects";
    const call = async (path, method = "GET", user = users[0], body) => {
      const response = await fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(user ? { Authorization: "Bearer " + jwt.sign({ id: user._id }, process.env.JWT_SECRET) } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: response.status, body: await response.json() };
    };
    assert.equal((await call("/my-subjects", "GET", null)).status, 401);
    assert.equal((await call("/", "POST", users[2], { code: "CHECK", title: "Forbidden" })).status, 403);
    const created = await call("/", "POST", users[0], { code: "CHECK", title: "Persistence check" });
    assert.equal(created.status, 201);
    const id = created.body._id;
    assert.equal((await call("/my-subjects")).body.some((subject) => subject._id === id), true);
    assert.equal((await call("/" + id, "PUT", users[1], { title: "Forbidden" })).status, 404);
    assert.equal((await call("/" + id, "PUT", users[0], { title: "Updated subject" })).status, 200);
    assert.equal((await call("/" + id)).body.title, "Updated subject");
    assert.equal((await Subject.findById(id).lean()).title, "Updated subject");
    const announcement = await call("/" + id + "/announcements", "POST", users[0], { content: "Persistence check announcement" });
    assert.equal(announcement.status, 201);
    assert.equal((await call("/" + id)).body.announcements.some((item) => item.content === "Persistence check announcement"), true);
    assert.equal((await call("/" + id, "DELETE", users[1])).status, 404);
    assert.equal((await call("/" + id, "DELETE")).status, 200);
    assert.equal((await call("/" + id)).status, 404);
    console.log("PASS: authenticated reads, create/update/delete, announcement persistence, role restrictions, and teacher ownership.");
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (users.length) {
      await Subject.deleteMany({ teacherId: { $in: users.map((user) => user._id) } });
      await User.deleteMany({ _id: { $in: users.map((user) => user._id) } });
    }
    await mongoose.disconnect();
  }
}
main().catch((error) => { console.error("API check failed:", error.name, error.code || "", error.name === "AssertionError" ? error.message : "Check database connectivity and test database permissions."); process.exitCode = 1; });
