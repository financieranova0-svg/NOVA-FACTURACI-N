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
    try {
      const { email: rawEmail, phone: rawPhone } = req.body || {};
      if (!rawEmail) {
        return res.status(400).json({ error: "El correo electrónico es requerido." });
      }

      const email = String(rawEmail).trim().toLowerCase();
      const phone = rawPhone ? String(rawPhone).trim().replace(/\D/g, "") : ""; // Normalizar número removiendo guiones o espacios
      const currentUsers = readUsers();

      // Check if user already exists
      let user = currentUsers.find((u: any) => u.email && String(u.email).toLowerCase() === email);

      const isAdminEmail = email === "financieranova0@gmail.com" || email === "christheriault880@gmail.com";
      const needsPhone = !isAdminEmail;

      if (!user) {
        // Registrar un nuevo usuario (primera vez)
        if (needsPhone && !phone) {
          return res.status(400).json({ error: "Se requiere un número de celular para activar tu licencia de prueba." });
        }

        if (needsPhone) {
          // Verificar que ningún usuario tenga ya este teléfono registrado
          const phoneRegistered = currentUsers.some((u: any) => {
            if (!u.phone) return false;
            const pNorm = String(u.phone).trim().replace(/\D/g, "");
            return pNorm === phone;
          });

          if (phoneRegistered) {
            return res.status(400).json({ error: "Este número de celular ya está vinculado a otra licencia activa." });
          }
        }

        user = {
          email,
          phone: needsPhone ? phone : undefined,
          bypassPhone: !needsPhone,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Prueba de 30 días automática
          status: "active"
        };

        currentUsers.push(user);
        writeUsers(currentUsers);
      } else {
        // El usuario ya existe en la base de datos (retorno)
        if (needsPhone) {
          if (!phone) {
            return res.status(400).json({ error: "Ingrese su celular registrado para iniciar sesión." });
          }

          // Si ya tiene un teléfono registrado, el número ingresado debe coincidir
          if (user.phone) {
            const userPhoneNorm = String(user.phone).trim().replace(/\D/g, "");
            if (userPhoneNorm !== phone) {
              return res.status(400).json({ error: "El celular ingresado no coincide con el registrado para esta cuenta." });
            }
          } else {
            // Si por alguna razón no tenía teléfono registrado (ejemplo: admin manual), vincularlo de forma segura
            const phoneRegistered = currentUsers.some((u: any) => {
              if (u.email && String(u.email).toLowerCase() === email) return false;
              if (!u.phone) return false;
              const pNorm = String(u.phone).trim().replace(/\D/g, "");
              return pNorm === phone;
            });

            if (phoneRegistered) {
              return res.status(400).json({ error: "Este número telefónico ya está registrado en otra licencia activa." });
            }
            user.phone = phone;
            writeUsers(currentUsers);
          }
        }
      }

      res.json({ success: true, user, users: currentUsers });
    } catch (err: any) {
      console.error("Critical error in /api/auth:", err);
      res.status(500).json({ error: "Error en el servidor de licencias. Por favor intente más tarde." });
    }
  });

  app.post("/api/users", (req, res) => {
    try {
      const { users: incomingUsers, updatedBy } = req.body || {};
      if (!Array.isArray(incomingUsers)) {
        return res.status(400).json({ error: "Invalid users array format" });
      }

      const currentUsers = readUsers();
      const isAdmin = updatedBy && (
        String(updatedBy).toLowerCase() === "financieranova0@gmail.com" || 
        String(updatedBy).toLowerCase() === "christheriault880@gmail.com"
      );

      // Use a Map to catalog current users by lowercase email
      const mergedMap = new Map<string, any>();
      for (const u of currentUsers) {
        if (u && u.email) {
          mergedMap.set(String(u.email).toLowerCase(), { ...u });
        }
      }

      // Safely upsert/merge incoming users
      for (const incoming of incomingUsers) {
        if (!incoming || !incoming.email) continue;
        const key = String(incoming.email).toLowerCase();

        if (!mergedMap.has(key)) {
          // Brand new registration
          mergedMap.set(key, {
            email: incoming.email,
            phone: incoming.phone ? String(incoming.phone).trim().replace(/\D/g, "") : undefined,
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
              ...incoming,
              phone: incoming.phone ? String(incoming.phone).trim().replace(/\D/g, "") : existing.phone
            });
          } else {
            // Non-admin can only update general fields, NOT license state
            mergedMap.set(key, {
              ...incoming,
              phone: incoming.phone ? String(incoming.phone).trim().replace(/\D/g, "") : existing.phone,
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
    } catch (err: any) {
      console.error("Critical error in /api/users post:", err);
      res.status(500).json({ error: "Error de servidor al guardar licencias." });
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
