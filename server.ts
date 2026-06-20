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
        if (needsPhone) {
          if (!phone) {
            return res.status(400).json({ error: "Se requiere un número de celular para activar tu licencia de prueba." });
          }

          // Verificar que el celular no esté repetido
          const isPhoneTaken = currentUsers.some((u: any) => {
            if (!u.phone) return false;
            const norm = String(u.phone).trim().replace(/\D/g, "");
            return norm === phone;
          });

          if (isPhoneTaken) {
            return res.status(400).json({ error: "Este número de celular ya está registrado. Use otro correo y celular para registrar una cuenta nueva." });
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
        // El usuario ya existe, iniciar sesión
        if (needsPhone) {
          if (!phone) {
            return res.status(400).json({ error: "Ingrese su celular registrado para iniciar sesión." });
          }

          // El celular debe coincidir exactamente con el celular registrado
          const existingPhoneNorm = user.phone ? String(user.phone).trim().replace(/\D/g, "") : "";
          if (existingPhoneNorm && existingPhoneNorm !== phone) {
            return res.status(400).json({ error: "El número de celular ingresado no coincide con el registrado para esta cuenta." });
          }

          if (!existingPhoneNorm) {
            // Si estaba vacío, asociarlo asegurándose de que es único
            const isPhoneTaken = currentUsers.some((u: any) => {
              if (String(u.email).toLowerCase() === email) return false;
              if (!u.phone) return false;
              const norm = String(u.phone).trim().replace(/\D/g, "");
              return norm === phone;
            });

            if (isPhoneTaken) {
              return res.status(400).json({ error: "Este número de celular ya está registrado en otra cuenta activa." });
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

      if (isAdmin) {
        // El administrador tiene autoridad absoluta de reemplazo (para poder borrar, suspender, etc. de inmediato)
        const systemAdmins = [
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
          }
        ];

        const finalUsers: any[] = [];

        // Asegurar que los administradores del sistema siempre existan en el listado y no sean removidos por error
        systemAdmins.forEach(admin => {
          const incomingAdmin = incomingUsers.find((u: any) => u && u.email && u.email.toLowerCase() === admin.email);
          if (incomingAdmin) {
            finalUsers.push({
              ...admin,
              ...incomingAdmin,
              expiresAt: "forever",
              status: "active"
            });
          } else {
            finalUsers.push(admin);
          }
        });

        // Mutar y agregar el resto de usuarios entrantes
        incomingUsers.forEach((u: any) => {
          if (!u || !u.email) return;
          const emailLower = u.email.toLowerCase();
          const isSysAdmin = emailLower === "financieranova0@gmail.com" || emailLower === "christheriault880@gmail.com";
          if (!isSysAdmin) {
            finalUsers.push({
              email: u.email.toLowerCase().trim(),
              phone: u.phone ? String(u.phone).trim().replace(/\D/g, "") : undefined,
              bypassPhone: u.bypassPhone || false,
              createdAt: u.createdAt || new Date().toISOString(),
              expiresAt: u.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              status: u.status || "active"
            });
          }
        });

        writeUsers(finalUsers);
        return res.json({ success: true, users: finalUsers });
      }

      // No es admin, aplicar merge tradicional limitado
      const mergedMap = new Map<string, any>();
      for (const u of currentUsers) {
        if (u && u.email) {
          mergedMap.set(String(u.email).toLowerCase(), { ...u });
        }
      }

      for (const incoming of incomingUsers) {
        if (!incoming || !incoming.email) continue;
        const key = String(incoming.email).toLowerCase();

        if (!mergedMap.has(key)) {
          mergedMap.set(key, {
            email: incoming.email,
            phone: incoming.phone ? String(incoming.phone).trim().replace(/\D/g, "") : undefined,
            bypassPhone: incoming.bypassPhone || false,
            createdAt: incoming.createdAt || new Date().toISOString(),
            expiresAt: incoming.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: incoming.status || "active"
          });
        } else {
          const existing = mergedMap.get(key);
          mergedMap.set(key, {
            ...incoming,
            phone: incoming.phone ? String(incoming.phone).trim().replace(/\D/g, "") : existing.phone,
            status: existing.status,
            expiresAt: existing.expiresAt,
            bypassPhone: existing.bypassPhone
          });
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

  // Helper inside server to resolve the master operating email for shared accounts (Owner-Employee)
  function getOperatingEmailServer(email: string): string {
    const clean = String(email || "").trim().toLowerCase();
    if (clean === "marialuzgonzalez1234568@gmail.com") {
      return "luisrodriguezgon22@gmail.com";
    }
    return clean;
  }

  // GET route to fetch the latest synchronized POS data
  app.get("/api/sync-pos-data", (req, res) => {
    try {
      const rawEmail = req.query.email;
      if (!rawEmail) {
        return res.status(400).json({ error: "El correo es requerido para sincronización." });
      }
      const email = getOperatingEmailServer(String(rawEmail));
      const syncFile = path.resolve(process.cwd(), `sync_pos_${email}.json`);

      if (fs.existsSync(syncFile)) {
        const data = fs.readFileSync(syncFile, "utf-8");
        return res.json(JSON.parse(data));
      }

      // Estructura vacía inicial si no hay historial previo en el servidor
      return res.json({
        version: 0,
        products: [],
        clients: [],
        sales: [],
        ncfCount: { B01: 1, B02: 1 },
        closures: []
      });
    } catch (err) {
      console.error("Error al leer datos de sincronización:", err);
      res.status(500).json({ error: "Error de lectura de sincronización en servidor." });
    }
  });

  // POST route to update synchronized POS data with higher version checks
  app.post("/api/sync-pos-data", (req, res) => {
    try {
      const { email: rawEmail, products, clients, sales, ncf, closures, version } = req.body || {};
      if (!rawEmail) {
        return res.status(400).json({ error: "El correo es requerido para sincronizar." });
      }
      const email = getOperatingEmailServer(String(rawEmail));
      const syncFile = path.resolve(process.cwd(), `sync_pos_${email}.json`);

      const payload = {
        email,
        products: products || [],
        clients: clients || [],
        sales: sales || [],
        ncfCount: ncf || { B01: 1, B02: 1 },
        closures: closures || [],
        version: version || 1,
        lastUpdated: new Date().toISOString()
      };

      fs.writeFileSync(syncFile, JSON.stringify(payload, null, 2), "utf-8");
      res.json({ success: true, version: payload.version });
    } catch (err) {
      console.error("Error al guardar datos de sincronización:", err);
      res.status(500).json({ error: "Error al escribir sincronización en servidor." });
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
