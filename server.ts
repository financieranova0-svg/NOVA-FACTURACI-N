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

  app.post("/api/auth", (req, res) => {
    const { email: rawEmail, phone: rawPhone } = req.body;
    if (!rawEmail) {
      return res.status(400).json({ error: "El correo electrónico es requerido." });
    }

    const email = rawEmail.trim().toLowerCase();
    const phone = rawPhone ? rawPhone.trim() : "";
    const currentUsers = readUsers();

    let user = currentUsers.find((u: any) => u.email && u.email.toLowerCase() === email);

    if (!user) {
      // Registrar un nuevo usuario
      const isAdminEmail = email === "financieranova0@gmail.com" || email === "christheriault880@gmail.com";
      const needsPhone = !isAdminEmail;

      if (needsPhone && !phone) {
        return res.status(400).json({ error: "Se requiere un número de celular para activar la licencia." });
      }

      if (needsPhone) {
        const phoneRegistered = currentUsers.some((u: any) => u.phone === phone);
        if (phoneRegistered) {
          return res.status(400).json({ error: "Este número telefónico ya está registrado en otra licencia activa." });
        }
      }

      user = {
        email,
        phone: needsPhone ? phone : undefined,
        bypassPhone: !needsPhone,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30-day trial automatically
        status: "active"
      };

      currentUsers.push(user);
      writeUsers(currentUsers);
    } else {
      // El usuario ya existe, actualizar teléfono si lo necesita y se proporciona
      if (!user.bypassPhone && !user.phone && phone) {
        // Verificar duplicados de teléfono
        const phoneRegistered = currentUsers.some((u: any) => u.email && u.email.toLowerCase() !== email && u.phone === phone);
        if (phoneRegistered) {
          return res.status(400).json({ error: "Este número de teléfono ya está registrado en otra licencia activa." });
        }
        user.phone = phone;
        writeUsers(currentUsers);
      }
    }

    res.json({ success: true, user, users: currentUsers });
  });

  app.post("/api/users", (req, res) => {
    const { users: incomingUsers, updatedBy } = req.body;
    if (!Array.isArray(incomingUsers)) {
      return res.status(400).json({ error: "Invalid users array format" });
    }

    const currentUsers = readUsers();
    const isAdmin = updatedBy === "financieranova0@gmail.com" || updatedBy === "christheriault880@gmail.com";

    // Use a Map to catalog current users by lowercase email
    const mergedMap = new Map<string, any>();
    for (const u of currentUsers) {
      if (u && u.email) {
        mergedMap.set(u.email.toLowerCase(), { ...u });
      }
    }

    // Safely upsert/merge incoming users
    for (const incoming of incomingUsers) {
      if (!incoming || !incoming.email) continue;
      const key = incoming.email.toLowerCase();

      if (!mergedMap.has(key)) {
        // Brand new registration
        mergedMap.set(key, {
          email: incoming.email,
          phone: incoming.phone,
          bypassPhone: incoming.bypassPhone || false,
          createdAt: incoming.createdAt || new Date().toISOString(),
          expiresAt: incoming.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: incoming.status || "active"
        });
      } else {
        // User already exists
        const existing = mergedMap.get(key);
        if (isAdmin) {
          // Admin can change everything
          mergedMap.set(key, {
            ...existing,
            ...incoming
          });
        } else {
          // Non-admin can only update general fields, NOT license state
          mergedMap.set(key, {
            ...incoming,
            status: existing.status,
            expiresAt: existing.expiresAt,
            bypassPhone: existing.bypassPhone
          });
        }
      }
    }

    const finalUsers = Array.from(mergedMap.values());
    writeUsers(finalUsers);
    res.json({ success: true, users: finalUsers });
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
