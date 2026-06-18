import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const PORT = 3000;
const USERS_FILE = path.resolve(process.cwd(), "users.json");

const DEFAULT_USERS = [
  {
    email: "financieranova0@gmail.com",
    bypassPhone: true,
    createdAt: new Date().toISOString(),
    expiresAt: "forever",
    status: "active"
  },
  {
    email: "christheriault880@gmail.com",
    bypassPhone: true,
    createdAt: new Date().toISOString(),
    expiresAt: "forever",
    status: "active"
  },
  {
    email: "cliente@gmail.com",
    phone: "8095550202",
    bypassPhone: false,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active"
  }
];

// Helper to read users from file
function readUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading users.json:", err);
  }
  // Initialize file with defaults if not exists
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2), "utf-8");
  } catch (err) {
    console.error("Error creating users.json with defaults:", err);
  }
  return DEFAULT_USERS;
}

// Helper to write users to file
function writeUsers(users: any) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing to users.json:", err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" })); // Generous limit for binary upload or large lists
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Routes
  app.get("/api/users", (req, res) => {
    const users = readUsers();
    res.json({ users });
  });

  app.post("/api/users", (req, res) => {
    const { users } = req.body;
    if (Array.isArray(users)) {
      writeUsers(users);
      res.json({ success: true, users });
    } else {
      res.status(400).json({ error: "Invalid users array format" });
    }
  });

  // Vite middleware integration for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production client asset serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Nova Facturación Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
