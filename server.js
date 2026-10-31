
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database
const db = new Database(path.join(__dirname, "utsav.db"));
db.pragma("journal_mode = WAL");

// Create the events table if it does not already exist.
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    location TEXT DEFAULT '',
    category TEXT NOT NULL,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    description TEXT NOT NULL,
    significance TEXT DEFAULT '',
    image TEXT DEFAULT '',
    contributor TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Pending',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Ensure required credentials exist.
if (!process.env.ADMIN_USERNAME ||
    !process.env.ADMIN_PASSWORD ||
    !process.env.JWT_SECRET) {
  console.error(
    "Missing ADMIN_USERNAME, ADMIN_PASSWORD, or JWT_SECRET in server/.env"
  );
  process.exit(1);
}

// Authentication middleware
function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Admin authentication required."
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired login. Please log in again."
    });
  }
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ message: "Utsav Darshan backend is running." });
});

// Admin login
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body || {};

  if (
    username !== process.env.ADMIN_USERNAME ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({
      message: "Incorrect username or password."
    });
  }

  const token = jwt.sign(
    { username, role: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({
    message: "Login successful.",
    token
  });
});

// Public API: only approved festivals
app.get("/api/events", (req, res) => {
  try {
    const events = db.prepare(`
      SELECT *
      FROM events
      WHERE status = 'Approved'
      ORDER BY startDate ASC, id DESC
    `).all();

    res.json(events);
  } catch (error) {
    console.error("Public events error:", error);
    res.status(500).json({
      message: "Could not load festivals."
    });
  }
});

// Submit a festival; new submissions are Pending
app.post("/api/events", (req, res) => {
  try {
    const {
      name,
      city,
      location,
      category,
      startDate,
      endDate,
      description,
      significance,
      image,
      contributor
    } = req.body || {};

    if (
      !name?.trim() ||
      !city?.trim() ||
      !category?.trim() ||
      !startDate ||
      !endDate ||
      !description?.trim()
    ) {
      return res.status(400).json({
        message: "Please fill in all required fields."
      });
    }

    if (endDate < startDate) {
      return res.status(400).json({
        message: "End date cannot be earlier than start date."
      });
    }

    const result = db.prepare(`
      INSERT INTO events (
        name,
        city,
        location,
        category,
        startDate,
        endDate,
        description,
        significance,
        image,
        contributor,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
    `).run(
      name.trim(),
      city.trim(),
      (location || "").trim(),
      category.trim(),
      startDate,
      endDate,
      description.trim(),
      (significance || "").trim(),
      (image || "").trim(),
      (contributor || "").trim()
    );

    res.status(201).json({
      message: "Festival submitted successfully! It is awaiting admin approval.",
      id: result.lastInsertRowid
    });
  } catch (error) {
    console.error("Submit festival error:", error);
    res.status(500).json({
      message: "Could not save festival submission."
    });
  }
});

// Admin API: list all submissions
app.get("/api/admin/events", verifyAdmin, (req, res) => {
  try {
    const events = db.prepare(`
      SELECT *
      FROM events
      ORDER BY
        CASE status
          WHEN 'Pending' THEN 0
          WHEN 'Approved' THEN 1
          WHEN 'Rejected' THEN 2
          ELSE 3
        END,
        id DESC
    `).all();

    res.json(events);
  } catch (error) {
    console.error("Admin events error:", error);
    res.status(500).json({
      message: "Could not load festival submissions."
    });
  }
});

// Helper for changing a festival's status
function setEventStatus(req, res, status) {
  try {
    const result = db.prepare(`
      UPDATE events
      SET status = ?
      WHERE id = ?
    `).run(status, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({
        message: "Festival not found."
      });
    }

    return res.json({
      message: `Festival ${status.toLowerCase()} successfully.`,
      status
    });
  } catch (error) {
    console.error(`Set status to ${status} error:`, error);
    return res.status(500).json({
      message: "Could not update festival status."
    });
  }
}

// Approve
app.patch(
  "/api/admin/events/:id/approve",
  verifyAdmin,
  (req, res) => setEventStatus(req, res, "Approved")
);

// Reject
app.patch(
  "/api/admin/events/:id/reject",
  verifyAdmin,
  (req, res) => setEventStatus(req, res, "Rejected")
);

// Return to Pending
app.patch(
  "/api/admin/events/:id/pending",
  verifyAdmin,
  (req, res) => setEventStatus(req, res, "Pending")
);

// Start server
app.listen(PORT, () => {
  console.log(`Utsav Darshan backend running at http://localhost:${PORT}`);
});
