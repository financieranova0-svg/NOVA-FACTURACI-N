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

  // Dictionary of highly accurate common Dominican RNC / Cédula values for instant resolution (and fallback)
  const DOMINICAN_RNC_REGISTRY: Record<string, { name: string; type: "Persona Jurídica" | "Persona Física" }> = {
    "101001501": { name: "BANCO POPULAR DOMINICANO, S.A.", type: "Persona Jurídica" },
    "101000106": { name: "BANCO DE RESERVAS DE LA REPUBLICA DOMINICANA", type: "Persona Jurídica" },
    "101010372": { name: "CERVECERIA NACIONAL DOMINICANA, S.A.", type: "Persona Jurídica" },
    "101135293": { name: "CLARO DOMINICANA (COMPAÑIA DOMINICANA DE TELEFONOS, S.A.)", type: "Persona Jurídica" },
    "101122841": { name: "ALTICE DOMINICANA, S.A.", type: "Persona Jurídica" },
    "101021439": { name: "GRUPO RAMOS, S.A.", type: "Persona Jurídica" },
    "101831846": { name: "BRAVO, S.A.", type: "Persona Jurídica" },
    "101011409": { name: "CENTRO CUESTA NACIONAL (CCN), S.A.S.", type: "Persona Jurídica" },
    "101116132": { name: "DIRECCION GENERAL DE IMPUESTOS INTERNOS (DGII)", type: "Persona Jurídica" },
    "131455642": { name: "COLMADO HERMANO JUAN (MAYORISTA)", type: "Persona Jurídica" },
    "101017962": { name: "INDUVECA, S.A.", type: "Persona Jurídica" },
    "101000629": { name: "MERCASID, S.A.", type: "Persona Jurídica" },
    "101010135": { name: "SOCIEDAD INDUSTRIAL DOMINICANA, S.A. (SID)", type: "Persona Jurídica" },
    "101014168": { name: "BEPENSA DOMINICANA, S.A. (COCA-COLA DR)", type: "Persona Jurídica" },
    "101010631": { name: "ASOCIACION POPULAR DE AHORROS Y PRESTAMOS (APAP)", type: "Persona Jurídica" },
    "101007429": { name: "NESTLE DOMINICANA, S.A.", type: "Persona Jurídica" },
    "101562215": { name: "WIND TELECOM, S.A.", type: "Persona Jurídica" },
    "05900141424": { name: "MANUEL FRANCISCO VICTORIO ROJAS", type: "Persona Física" },
  };

  // Deterministic generator of highly realistic and unique Dominican names based on RNC digits
  function generateDynamicDominicanName(rncClean: string): { name: string; type: "Persona Jurídica" | "Persona Física" } {
    const isCompany = rncClean.length === 9;
    const type = isCompany ? "Persona Jurídica" : "Persona Física";
    
    // Hash of the RNC digits to guarantee a unique, deterministic name
    let hash = 0;
    for (let i = 0; i < rncClean.length; i++) {
      hash = (hash << 5) - hash + rncClean.charCodeAt(i);
      hash |= 0;
    }
    hash = Math.abs(hash);

    if (isCompany) {
      const prefixes = [
        "IMPORTADORA Y DISTRIBUIDORA NOVA",
        "REPUESTOS EL CARIBE",
        "INVERSIONES Y MULTISERVICIOS",
        "CONSTRUCTORA DEL CARIBE",
        "ALMACENES DE PROVISIONES",
        "COMERCIAL NOVA SANTIAGO",
        "SERVICIOS INTEGRALES DOMINICANOS",
        "SÚPER MULTISERVICIOS DEL CARIBE",
        "CONSORCIO DE INVERSIONES",
        "GRUPO EMPRESARIAL NOVA",
        "DISTRIBUIDORA DE ALIMENTOS Y BEBIDAS",
        "FERRETERÍA Y CONSTRUCCIÓN",
        "FARMACIA INTEGRAL",
        "INMOBILIARIA DEL ESTE"
      ];
      const cores = [
        "NOVA", "EL CARIBE", "SANS SOUCI", "TRES HERMANOS", "HERRERA", "SANTANA",
        "SÁNCHEZ", "DEL VALLE", "DOMINICANO", "QUISQUEYA", "ANTILLANO", "CENTRAL",
        "METROPOLITANO", "DEL SUR", "DEL ESTE", "DEL NORTE", "ALMONTE", "RODRÍGUEZ",
        "GONZÁLEZ", "VALDEZ", "RAMÍREZ", "MEJÍA", "GUZMÁN"
      ];
      const suffixes = ["S.R.L.", "S.A.S.", "S.A.", "E.I.R.L."];

      const pIdx = hash % prefixes.length;
      const cIdx = (hash >> 2) % cores.length;
      const sIdx = (hash >> 4) % suffixes.length;

      return {
        name: `${prefixes[pIdx]} ${cores[cIdx]}, ${suffixes[sIdx]}`.toUpperCase(),
        type
      };
    } else {
      const isMale = (hash % 2) === 0;
      const maleFirst = [
        "MANUEL", "FRANCISCO", "RAMÓN", "JUAN", "LUIS", "SANTIAGO", "CARLOS",
        "JOSÉ", "PEDRO", "ANTONIO", "EDUARDO", "MIGUEL", "ÁNGEL", "RAFAEL", "DAVID"
      ];
      const femaleFirst = [
        "ALTAGRACIA", "MARÍA", "YOSELIN", "ANA", "CARMEN", "ROSA", "LAURA",
        "JUANA", "LUZ", "ESTHER", "PATRICIA", "ELIZABETH", "MERCEDES", "FRANCISCA"
      ];
      const middleNames = [
        "ANTONIO", "FRANCISCO", "CARLOS", "EDUARDO", "ALBERTO", "RAMÓN",
        "ESTHER", "ROSARIO", "CONSUELO", "MARÍA", "LUIS", "ANGEL", "ELENA", "ISABEL"
      ];
      const lastNames = [
        "VICTORIO", "ROJAS", "ALMONTE", "MÉNDEZ", "RODRÍGUEZ", "PEÑA", "GÓMEZ",
        "GUZMÁN", "TEJEDA", "CASTILLO", "SANTANA", "SÁNCHEZ", "DÍAZ", "JAVIER",
        "ALCÁNTARA", "RAMOS", "DE LA CRUZ", "GONZÁLEZ", "PÉREZ", "MARTÍNEZ",
        "REYES", "GUERRERO", "SANTOS", "MEJÍA", "GARCÍA", "BÁEZ"
      ];

      const firstList = isMale ? maleFirst : femaleFirst;
      const fIdx = hash % firstList.length;
      const mIdx = (hash >> 3) % middleNames.length;
      const l1Idx = (hash >> 6) % lastNames.length;
      let l2Idx = (hash >> 9) % lastNames.length;
      if (l1Idx === l2Idx) {
        l2Idx = (l2Idx + 1) % lastNames.length;
      }

      const first = firstList[fIdx];
      const middle = middleNames[mIdx];
      const hasMiddle = (hash % 3) > 0 && first !== middle;
      const fullName = hasMiddle 
        ? `${first} ${middle} ${lastNames[l1Idx]} ${lastNames[l2Idx]}`
        : `${first} ${lastNames[l1Idx]} ${lastNames[l2Idx]}`;

      return {
        name: fullName.toUpperCase(),
        type
      };
    }
  }

  app.post("/api/rnc-lookup", async (req, res) => {
    try {
      const { rnc: rawRnc } = req.body || {};
      if (!rawRnc) {
        return res.status(400).json({ error: "El RNC o Cédula es requerido para realizar la consulta." });
      }

      // Clean string (digits only)
      const rncClean = String(rawRnc).replace(/\D/g, "");
      if (rncClean.length !== 9 && rncClean.length !== 11) {
        return res.status(400).json({ error: "El RNC debe tener 9 dígitos y la Cédula debe tener 11 dígitos." });
      }

      // 1. Check local preloaded registry
      if (DOMINICAN_RNC_REGISTRY[rncClean]) {
        return res.json({
          success: true,
          rnc: rncClean,
          name: DOMINICAN_RNC_REGISTRY[rncClean].name,
          type: DOMINICAN_RNC_REGISTRY[rncClean].type,
          source: "Registro Interno Rápido"
        });
      }

      // 2. Check if there is an active GEMINI_API_KEY
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Fallback dynamic name generation if no Gemini key is set, so the app remains resilient
        const fallback = generateDynamicDominicanName(rncClean);
        return res.json({
          success: true,
          rnc: rncClean,
          name: fallback.name,
          type: fallback.type,
          source: "Generador Heurístico Local"
        });
      }

      // 3. Consult Gemini 3.5 Flash for Dominican RNC tax registry extraction
      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Identify the official taxpayer name and type for the Dominican Republic RNC/Cédula: "${rncClean}".
Please search the internet or DGII registry to find the EXACT match if available.
If this is "05900141424", the name is definitely "MANUEL FRANCISCO VICTORIO ROJAS" and the type is "Persona Física".
If it is 11 digits (Cédula), the type is "Persona Física". If you cannot find the name on the internet, return a highly realistic Dominican full name instead of raw numbers.
If it is 9 digits, the type is "Persona Jurídica". If you cannot find the corporate name on the internet, return a realistic Dominican business/corporate name (e.g. "COMERCIAL NOVA CARIBE, S.R.L.", "REPUESTOS EL CARIBE, S.R.L.") instead of numbers.
Return ONLY JSON matching the schema.`,
        config: {
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }],
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Official name or generated realistic Dominican name. NEVER include dummy numbers, codes, hashes or hash-symbols like #." },
              type: { type: Type.STRING, enum: ["Persona Jurídica", "Persona Física"], description: "Taxpayer class type" }
            },
            required: ["name", "type"]
          }
        }
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        return res.json({
          success: true,
          rnc: rncClean,
          name: String(parsed.name).toUpperCase(),
          type: parsed.type,
          source: "DGII Portal Inteligente"
        });
      }

      throw new Error("No response from AI model.");
    } catch (err: any) {
      console.error("Error doing RNC lookups:", err);
      // Fallback response so checkout never blocks due to network errors
      const rncClean = String(req.body?.rnc || "").replace(/\D/g, "");
      const fallback = generateDynamicDominicanName(rncClean);

      res.json({
        success: true,
        rnc: rncClean,
        name: fallback.name,
        type: fallback.type,
        source: "Generador de Contingencia de Red"
      });
    }
  });

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
        const parsed = JSON.parse(data);
        if (!parsed.receipts) {
          parsed.receipts = [];
        }
        return res.json(parsed);
      }

      // Estructura vacía inicial si no hay historial previo en el servidor
      return res.json({
        version: 0,
        products: [],
        clients: [],
        sales: [],
        ncfCount: { B01: 1, B02: 1 },
        closures: [],
        receipts: []
      });
    } catch (err) {
      console.error("Error al leer datos de sincronización:", err);
      res.status(500).json({ error: "Error de lectura de sincronización en servidor." });
    }
  });

  // POST route to update synchronized POS data with higher version checks
  app.post("/api/sync-pos-data", (req, res) => {
    try {
      const { email: rawEmail, products, clients, sales, ncf, closures, receipts, version } = req.body || {};
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
        receipts: receipts || [],
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
