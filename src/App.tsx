import { useState, useEffect, useMemo } from "react";
import { 
  Store, 
  ShoppingCart, 
  Layers, 
  Notebook, 
  History, 
  CheckCircle, 
  AlertTriangle,
  Receipt,
  Sparkles,
  RefreshCw,
  Printer,
  X,
  CreditCard,
  Shield,
  FileText,
  Lock,
  LogOut,
  Smartphone,
  Mail,
  UserCheck,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  UserMinus,
  UserPlus
} from "lucide-react";
import { Product, Client, Sale, DailyClosure, AppUser } from "./types";
import { INITIAL_PRODUCTS, INITIAL_CLIENTS } from "./data";
import POS from "./components/POS";
import Inventory from "./components/Inventory";
import Clients from "./components/Clients";
import SalesHistory from "./components/SalesHistory";
import { generateInvoicePDF, getBusinessConfig, BusinessConfig } from "./utils/pdfGenerator";

const DEFAULT_USERS: AppUser[] = [
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

export default function App() {
  // Tabs: pos, inventory, clients, sales, admin, profile
  const [activeTab, setActiveTab] = useState<"pos" | "inventory" | "clients" | "sales" | "admin" | "profile">("pos");

  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [closures, setClosures] = useState<DailyClosure[]>([]);
  
  // Auth users management
  const [users, setUsers] = useState<AppUser[]>([]);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  
  // Sign-in values state
  const [authEmail, setAuthEmail] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  // NCF invoice numbering sequence state
  const [ncfCounts, setNcfCounts] = useState({ B01: 1, B02: 1 });

  // Receipt reprint simulation
  const [reprintSale, setReprintSale] = useState<Sale | null>(null);
  const [reprintFormat, setReprintFormat] = useState<"thermal" | "letter">("thermal");

  const handleCloseReprint = () => {
    setReprintSale(null);
    const oldPrint = document.getElementById("print-section");
    if (oldPrint) oldPrint.remove();
    const oldStyle = document.getElementById("dynamic-page-style");
    if (oldStyle) oldStyle.remove();
  };

  const reprintConfig = useMemo(() => {
    return getBusinessConfig(currentUser?.email || "guest");
  }, [currentUser, reprintSale]);

  // Initialize and load from local persistence (localStorage) per user
  useEffect(() => {
    try {
      // Users control (system level)
      const storedUsers = localStorage.getItem("nova_facturacion_users");
      if (storedUsers) {
        setUsers(JSON.parse(storedUsers));
      } else {
        setUsers(DEFAULT_USERS);
        localStorage.setItem("nova_facturacion_users", JSON.stringify(DEFAULT_USERS));
      }

      // Check login (system level)
      const loggedUser = localStorage.getItem("nova_facturacion_current_user");
      if (loggedUser) {
        setCurrentUser(JSON.parse(loggedUser));
      }
    } catch (e) {
      console.error("No se pudo cargar datos iniciales de login", e);
    }
  }, []);

  // Sync state whenever logged currentUser changes to support Isolation
  useEffect(() => {
    if (!currentUser) {
      setProducts([]);
      setClients([]);
      setSales([]);
      setClosures([]);
      setNcfCounts({ B01: 1, B02: 1 });
      return;
    }

    try {
      const email = currentUser.email;
      const isDemoAdmin = email === "financieranova0@gmail.com" || email === "christheriault880@gmail.com";

      // Products Isolation
      const storedProducts = localStorage.getItem(`factura_pos_products_${email}`);
      if (storedProducts) {
        try {
          const parsed = JSON.parse(storedProducts);
          if (Array.isArray(parsed)) {
            const migrated = parsed.map((p: any) => {
              if (p.costPrice === undefined || p.costPrice === null || isNaN(Number(p.costPrice)) || Number(p.costPrice) < 0) {
                return { ...p, costPrice: 0 };
              }
              return p;
            });
            setProducts(migrated);
            localStorage.setItem(`factura_pos_products_${email}`, JSON.stringify(migrated));
          } else {
            setProducts([]);
          }
        } catch (e) {
          console.error("Error migrating products", e);
          setProducts([]);
        }
      } else {
        const defaultProducts = isDemoAdmin ? INITIAL_PRODUCTS : [];
        setProducts(defaultProducts);
        localStorage.setItem(`factura_pos_products_${email}`, JSON.stringify(defaultProducts));
      }

      // Clients Isolation
      const storedClients = localStorage.getItem(`factura_pos_clients_${email}`);
      if (storedClients) {
        setClients(JSON.parse(storedClients));
      } else {
        const defaultClients = isDemoAdmin ? INITIAL_CLIENTS : [];
        setClients(defaultClients);
        localStorage.setItem(`factura_pos_clients_${email}`, JSON.stringify(defaultClients));
      }

      // Sales Isolation
      const storedSales = localStorage.getItem(`factura_pos_sales_${email}`);
      if (storedSales) {
        try {
          const parsed = JSON.parse(storedSales);
          if (Array.isArray(parsed)) {
            const migrated = parsed.map((sale: any) => {
              const updatedItems = sale.items.map((item: any) => {
                const prod = item.product;
                if (prod.costPrice === undefined || prod.costPrice === null || isNaN(Number(prod.costPrice)) || Number(prod.costPrice) < 0) {
                  return {
                    ...item,
                    product: {
                      ...prod,
                      costPrice: 0
                    }
                  };
                }
                return item;
              });
              return { ...sale, items: updatedItems };
            });
            setSales(migrated);
            localStorage.setItem(`factura_pos_sales_${email}`, JSON.stringify(migrated));
          } else {
            setSales([]);
          }
        } catch (e) {
          console.error("Error migrating sales", e);
          setSales([]);
        }
      } else {
        setSales([]);
        localStorage.setItem(`factura_pos_sales_${email}`, JSON.stringify([]));
      }

      // NCF Sequence Isolation
      const storedNcf = localStorage.getItem(`factura_pos_ncf_${email}`);
      if (storedNcf) {
        setNcfCounts(JSON.parse(storedNcf));
      } else {
        const defaultNcf = { B01: 1, B02: 1 };
        setNcfCounts(defaultNcf);
        localStorage.setItem(`factura_pos_ncf_${email}`, JSON.stringify(defaultNcf));
      }

      // Daily closures Isolation
      const storedClosures = localStorage.getItem(`factura_pos_closures_${email}`);
      if (storedClosures) {
        setClosures(JSON.parse(storedClosures));
      } else {
        setClosures([]);
        localStorage.setItem(`factura_pos_closures_${email}`, JSON.stringify([]));
      }

    } catch (e) {
      console.error("Error al aislar BD para usuario", e);
    }
  }, [currentUser]);

  // Helper sync triggers to localstorage per user-key
  const saveProductsToStorage = (updatedProducts: Product[]) => {
    setProducts(updatedProducts);
    if (currentUser) {
      localStorage.setItem(`factura_pos_products_${currentUser.email}`, JSON.stringify(updatedProducts));
    }
  };

  const saveClientsToStorage = (updatedClients: Client[]) => {
    setClients(updatedClients);
    if (currentUser) {
      localStorage.setItem(`factura_pos_clients_${currentUser.email}`, JSON.stringify(updatedClients));
    }
  };

  const saveSalesToStorage = (updatedSales: Sale[]) => {
    setSales(updatedSales);
    if (currentUser) {
      localStorage.setItem(`factura_pos_sales_${currentUser.email}`, JSON.stringify(updatedSales));
    }
  };

  const saveNcfToStorage = (updatedNcf: typeof ncfCounts) => {
    setNcfCounts(updatedNcf);
    if (currentUser) {
      localStorage.setItem(`factura_pos_ncf_${currentUser.email}`, JSON.stringify(updatedNcf));
    }
  };

  const saveClosuresToStorage = (updatedClosures: DailyClosure[]) => {
    setClosures(updatedClosures);
    if (currentUser) {
      localStorage.setItem(`factura_pos_closures_${currentUser.email}`, JSON.stringify(updatedClosures));
    }
  };

  const saveUsersToStorage = (updatedUsers: AppUser[]) => {
    setUsers(updatedUsers);
    localStorage.setItem("nova_facturacion_users", JSON.stringify(updatedUsers));
    
    // Also synchronize the current logged in user state if they are in the list
    if (currentUser) {
      const freshCurrent = updatedUsers.find((u) => u.email === currentUser.email);
      if (freshCurrent) {
        setCurrentUser(freshCurrent);
        localStorage.setItem("nova_facturacion_current_user", JSON.stringify(freshCurrent));
      }
    }
  };

  // State manipulation triggers passed to subcomponents
  const handleAddProduct = (newProduct: Product) => {
    const updated = [newProduct, ...products];
    saveProductsToStorage(updated);
  };

  const handleUpdateFullProductList = (updatedProducts: Product[]) => {
    saveProductsToStorage(updatedProducts);
  };

  const handleDeleteProduct = (productId: string) => {
    const updated = products.filter((p) => p.id !== productId);
    saveProductsToStorage(updated);
  };

  const handleDeleteClient = (clientId: string) => {
    const updated = clients.filter((c) => c.id !== clientId);
    saveClientsToStorage(updated);
  };

  const handleAddClient = (newClient: Client) => {
    const updated = [...clients, newClient];
    saveClientsToStorage(updated);
  };

  const handleAddSale = (newSale: Sale) => {
    const updated = [newSale, ...sales];
    saveSalesToStorage(updated);

    // If it was custom NCF, step sequence up by 1
    if (newSale.ncfType === "B01") {
      const nextNcf = { ...ncfCounts, B01: ncfCounts.B01 + 1 };
      saveNcfToStorage(nextNcf);
    } else if (newSale.ncfType === "B02") {
      const nextNcf = { ...ncfCounts, B02: ncfCounts.B02 + 1 };
      saveNcfToStorage(nextNcf);
    }
  };

  const handleUpdateStock = (productId: string, quantityToDeduct: number) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        const calculatedStock = p.stock - quantityToDeduct;
        return {
          ...p,
          stock: calculatedStock < 0 ? 0 : calculatedStock
        };
      }
      return p;
    });
    saveProductsToStorage(updated);
  };

  const handleUpdateClientDebt = (clientId: string, debtDelta: number) => {
    const updated = clients.map((c) => {
      if (c.id === clientId) {
        const calculatedDebt = c.currentDebt + debtDelta;
        return {
          ...c,
          currentDebt: calculatedDebt < 0 ? 0 : calculatedDebt
        };
      }
      return c;
    });
    saveClientsToStorage(updated);
  };

  // Safe Refund trigger: Restocking products & refunding fiado limits on cancellantion
  const handleCancelSale = (saleId: string) => {
    const saleToCancel = sales.find((s) => s.id === saleId);
    if (!saleToCancel) return;

    // Refund stock to inventory
    saleToCancel.items.forEach((item) => {
      handleUpdateStock(item.product.id, -item.quantity); // Deduct generic negative = increases stock
    });

    // Refund debt to client if credit
    if (saleToCancel.client && (saleToCancel.paymentMethod === "Fiado" || saleToCancel.paymentMethod === "Crédito")) {
      handleUpdateClientDebt(saleToCancel.client.id, -saleToCancel.total);
    }

    // Filter transaction out of sales journal list
    const updatedSales = sales.filter((s) => s.id !== saleId);
    saveSalesToStorage(updatedSales);
  };

  const handleCloseDay = (closureSummary: { totalSales: number; totalProfit: number; salesCount: number; soldItemsSummary: string }) => {
    const newClosure: DailyClosure = {
      id: "closure-" + Date.now(),
      date: new Date().toISOString(),
      ...closureSummary
    };
    const updatedClosures = [newClosure, ...closures];
    saveClosuresToStorage(updatedClosures);

    // Reset current active sales
    saveSalesToStorage([]);
  };

  const handleDeleteClosure = (closureId: string) => {
    const updated = closures.filter((c) => c.id !== closureId);
    saveClosuresToStorage(updated);
  };

  const handleAuthSubmit = () => {
    const email = authEmail.trim().toLowerCase();
    if (!email) {
      setAuthMessage("Por favor ingresa un correo electrónico válido.");
      return;
    }

    // Check if user exists in database
    let existingUser = users.find((u) => u.email === email);

    if (existingUser) {
      // Check if user requires activation of phone but hasn't entered it
      if (!existingUser.bypassPhone && !existingUser.phone) {
        const phone = authPhone.trim();
        if (!phone) {
          setAuthMessage("Esta cuenta requiere un número de celular para enlace seguro.");
          return;
        }

        // Verify duplicate phone limit (no reuse)
        const phoneRegistered = users.some((u) => u.email !== email && u.phone === phone);
        if (phoneRegistered) {
          setAuthMessage("🚨 Error: Este número telefónico ya está vinculado a otra licencia.");
          return;
        }

        existingUser.phone = phone;
        const updatedUsers = users.map((u) => u.email === email ? existingUser! : u);
        saveUsersToStorage(updatedUsers);
      }
    } else {
      // Create new user account registration on-the-fly!
      const phone = authPhone.trim();
      const isAdminEmail = email === "financieranova0@gmail.com" || email === "christheriault880@gmail.com";
      const needsPhone = !isAdminEmail;
      
      if (needsPhone && !phone) {
        setAuthMessage("Ingresa tu número de celular para activar tu licencia de prueba.");
        return;
      }

      if (needsPhone) {
        // Verify duplicate phone limit (no reuse)
        const phoneRegistered = users.some((u) => u.phone === phone);
        if (phoneRegistered) {
          setAuthMessage("🚨 Error: Este teléfono ya está registrado en otra licencia activa.");
          return;
        }
      }

      existingUser = {
        email,
        phone: needsPhone ? phone : undefined,
        bypassPhone: !needsPhone,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 day trial automatically
        status: "active"
      };

      const updatedUsers = [...users, existingUser];
      saveUsersToStorage(updatedUsers);
    }

    // Check suspension or expiration
    const nowLocal = new Date();
    const isExpired = existingUser.expiresAt !== "forever" && nowLocal > new Date(existingUser.expiresAt);
    
    if (existingUser.status === "suspended" || isExpired) {
      // Keep state logged in but let them know it's locked
      // We will render locked screen
    }

    // Persist login state
    localStorage.setItem("nova_facturacion_current_user", JSON.stringify(existingUser));
    setCurrentUser(existingUser);
    setAuthMessage("");
    setActiveTab("pos");
  };

  const handleLogout = () => {
    localStorage.removeItem("nova_facturacion_current_user");
    setCurrentUser(null);
    setAuthEmail("");
    setAuthPhone("");
    setAuthMessage("");
    setActiveTab("pos");
  };

  // Mock server reset button to start clean
  const handleSystemRestoreDefault = () => {
    if (!currentUser) return;
    const email = currentUser.email;
    const isDemoAdmin = email === "financieranova0@gmail.com" || email === "christheriault880@gmail.com";

    if (confirm("🚨 ¿Deseas restablecer el sistema? Se borrarán las facturas de esta sesión y se recuperará el catálogo correspondiente.")) {
      localStorage.removeItem(`factura_pos_products_${email}`);
      localStorage.removeItem(`factura_pos_clients_${email}`);
      localStorage.removeItem(`factura_pos_sales_${email}`);
      localStorage.removeItem(`factura_pos_ncf_${email}`);
      localStorage.removeItem(`factura_pos_closures_${email}`);
      
      const defaultProducts = isDemoAdmin ? INITIAL_PRODUCTS : [];
      const defaultClients = isDemoAdmin ? INITIAL_CLIENTS : [];

      setProducts(defaultProducts);
      setClients(defaultClients);
      setSales([]);
      setNcfCounts({ B01: 1, B02: 1 });
      setClosures([]);
      
      localStorage.setItem(`factura_pos_products_${email}`, JSON.stringify(defaultProducts));
      localStorage.setItem(`factura_pos_clients_${email}`, JSON.stringify(defaultClients));
      localStorage.setItem(`factura_pos_sales_${email}`, JSON.stringify([]));
      localStorage.setItem(`factura_pos_ncf_${email}`, JSON.stringify({ B01: 1, B02: 1 }));
      localStorage.setItem(`factura_pos_closures_${email}`, JSON.stringify([]));

      setActiveTab("pos");
    }
  };

  // Helper computations for Header alerts
  const lowStockProductsCount = products.filter(p => p.stock <= (p.minStock || 5)).length;

  // Render Login overlay screen if user is not authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Abstract background shapes */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>

        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6.5 relative z-10 shrink-0 select-none">
          <div className="flex flex-col items-center text-center">
            <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 mb-3 animate-bounce">
              <Shield className="h-7 w-7 stroke-[2.5]" />
            </div>
            
            <h1 className="text-xl font-black text-white tracking-tight uppercase flex items-center gap-1.5 font-sans justify-center">
              Nova Facturación
              <span className="text-[9px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.5 rounded uppercase font-sans tracking-widest leading-none">POS v1.2</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 max-w-xs">
              Portal de Autenticación de Licencia Digital para Colmados y Tiendas Rápidas Dominicanas.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {/* Email Field */}
            <div>
              <label id="lbl-auth-email" className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                Correo Electrónico (Google Account)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  id="auth-email-input"
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="ejemplo@gmail.com"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            {/* Phone Field (Only shown if NOT bypass email) */}
            {!(authEmail.trim().toLowerCase() === "financieranova0@gmail.com" || authEmail.trim().toLowerCase() === "christheriault880@gmail.com") && (
              <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 mt-2">
                <label id="lbl-auth-phone" className="block text-[10px] font-black uppercase text-slate-300 tracking-wider mb-1">
                  Número de Celular (WhatsApp)
                </label>
                <p className="text-[10px] text-slate-500 mb-1.5">Requerido para el envío automático de reportes.</p>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-slate-505" />
                  <input
                    id="auth-phone-input"
                    type="tel"
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value)}
                    placeholder="809-555-1212"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>
            )}

            {authMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300 flex items-start gap-1.5 leading-relaxed font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{authMessage}</span>
              </div>
            )}

            <button
              id="btn-auth-signin"
              onClick={handleAuthSubmit}
              className="w-full py-2.5 bg-emerald-555 hover:bg-emerald-500 text-slate-950 font-black text-xs rounded-xl transition shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wide mt-2"
            >
              <UserCheck className="h-4 w-4 stroke-[2.5]" />
              Iniciar Sesión Seguro
            </button>
          </div>

          {/* Tester Helper Tips */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-[10.5px] text-slate-500 space-y-1 bg-slate-950/20 p-3 rounded-lg">
            <span className="font-bold text-slate-400 block mb-0.5">💡 Guía Rápida de Acceso:</span>
            <p>1. Para ingresar como <b>Administrador</b>, pon: <code className="text-emerald-400">financieranova0@gmail.com</code> (omite teléfono).</p>
            <p>2. Para crear un <b>Usuario de Prueba</b>, pon cualquier otro correo y un celular único.</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if current user is Suspended or has Expired in local list state
  const liveUserState = users.find((u) => u.email === currentUser.email) || currentUser;
  const isExpired = liveUserState.expiresAt !== "forever" && new Date() > new Date(liveUserState.expiresAt);
  const isSuspended = liveUserState.status === "suspended";

  // Lock Page if account is expired or suspended
  if (isSuspended || isExpired) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative z-10 shrink-0 text-center">
          <div className="w-14 h-14 bg-rose-500/15 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <Lock className="h-6 w-6 stroke-2" />
          </div>

          <h2 className="text-lg font-black text-white uppercase tracking-tight">Acceso De Licencia Bloqueado</h2>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 my-4 space-y-3 shrink-0 text-left">
            {isSuspended ? (
              <div>
                <p className="leading-relaxed text-sm font-semibold text-rose-400 mb-1.5 uppercase">
                  🚨 Licencia Suspendida
                </p>
                <p className="leading-relaxed">
                  Su licencia para el terminal <code className="text-amber-400 font-mono text-[11px] bg-slate-900 px-1 py-0.5 rounded">{liveUserState.email}</code> ha sido suspendida temporalmente por la administración de <b>Nova Facturación</b>.
                </p>
              </div>
            ) : (
              <div>
                <p className="leading-relaxed text-sm font-semibold text-amber-500 mb-1.5 uppercase">
                  ⏳ Período de Prueba Vencido
                </p>
                <p className="leading-relaxed">
                  Su cuenta ha vencido el <b className="text-rose-450 font-mono">{new Date(liveUserState.expiresAt).toLocaleDateString()}</b>. Por favor, adquiera o extienda su licencia para continuar facturando.
                </p>
              </div>
            )}
            
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Contacto de Soporte Técnico:</span>
              <a 
                id="contact-support-mailto"
                href="mailto:christheriault880@gmail.com?subject=Soporte%20Licencia%20Nova%20Facturacion&body=Hola%20Chris,%20necesito%20asistencia%20con%20mi%20licencia%20de%20Nova%20Facturacion."
                className="inline-flex items-center gap-2 w-full justify-center py-2 px-3 bg-red-500/10 hover:bg-emerald-500/15 border border-red-500/30 hover:border-emerald-500/40 text-rose-400 hover:text-emerald-400 text-[11px] font-black rounded-lg transition uppercase tracking-wide cursor-pointer text-center"
              >
                📬 CONTACTAR A CHRIS (Enviar Email)
              </a>
              <p className="text-[10px] text-slate-500 text-center leading-normal">
                Haz clic en el botón de arriba para abrir tu aplicación de correo y enviar tu solicitud.
              </p>
            </div>
          </div>

          <div className="flex gap-2.5">
            <button
              id="expired-logout-btn"
              onClick={handleLogout}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-705 border border-slate-700 text-white rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
            >
              <LogOut className="h-4 w-4" />
              Cambiar Cuenta o Salir
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Admin tab is allowed if user is authorized email addresses
  const isCurrentUserAdmin = liveUserState.email === "financieranova0@gmail.com" || liveUserState.email === "christheriault880@gmail.com";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* Upper Brand Info and Real Time status bar */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 shrink-0">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Central Logo Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 text-slate-950 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 duration-100 cursor-pointer">
              <Store className="h-4.5 w-4.5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight font-sans uppercase text-white">
                  Nova Facturación
                </h1>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/25 italic">
                  DGII Dominican POS
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400">Compañía de Facturación Profesional • Terminal de: <b>{liveUserState.email}</b></p>
            </div>
          </div>

          {/* Quick Notification Pills & State restore */}
          <div className="flex items-center gap-2 text-xs">
            {lowStockProductsCount > 0 && (
              <div className="flex items-center gap-1 px-2 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-[10px] font-bold">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Stock bajo:</span>
                <b>{lowStockProductsCount}</b>
              </div>
            )}

            <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-[10.5px] text-slate-300 font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {liveUserState.email === "financieranova0@gmail.com" || liveUserState.email === "christheriault880@gmail.com" ? "👑 ADMIN" : "LICENCIA ACTIVA"}
            </div>

            <button
              id="header-logout-btn"
              onClick={handleLogout}
              className="p-1.5 px-2 bg-slate-800 hover:bg-red-500/10 hover:border-red-500/30 text-rose-300 border border-slate-750 rounded-lg transition text-[10.5px] font-bold flex items-center gap-1 cursor-pointer"
              title="Cerrar sesión de nova facturación"
            >
              <LogOut className="h-3.5 w-3.5" />
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Main Tab Bar Navigation (Aesthetic High Contrast Light Selector) */}
      <nav className="bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex gap-1 overflow-x-auto">
          <button
            id="tab-pos"
            onClick={() => setActiveTab("pos")}
            className={`py-3.5 px-4.5 text-xs font-black flex items-center gap-1.5 border-b-2 transition duration-150 shrink-0 uppercase cursor-pointer ${
              activeTab === "pos"
                ? "border-emerald-600 text-emerald-700 font-black"
                : "border-transparent text-slate-500 hover:text-slate-850 hover:border-slate-300"
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            Caja POS Rápida
          </button>

          <button
            id="tab-inventory"
            onClick={() => {
              setActiveTab("inventory");
              setReprintSale(null); // safely dismiss overlay
            }}
            className={`py-3.5 px-4.5 text-xs font-black flex items-center gap-1.5 border-b-2 transition duration-150 shrink-0 uppercase cursor-pointer ${
              activeTab === "inventory"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-850 hover:border-slate-300"
            }`}
          >
            <Layers className="h-4 w-4" />
            Catálogo Inventario
          </button>

          <button
            id="tab-clients"
            onClick={() => {
              setActiveTab("clients");
              setReprintSale(null);
            }}
            className={`py-3.5 px-4.5 text-xs font-black flex items-center gap-1.5 border-b-2 transition duration-150 shrink-0 uppercase cursor-pointer ${
              activeTab === "clients"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-850 hover:border-slate-300"
            }`}
          >
            <Notebook className="h-4 w-4" />
            Cuaderno de Créditos ({clients.filter(c => c.currentDebt > 0).length})
          </button>

          <button
            id="tab-sales"
            onClick={() => {
              setActiveTab("sales");
              setReprintSale(null);
            }}
            className={`py-3.5 px-4.5 text-xs font-black flex items-center gap-1.5 border-b-2 transition duration-150 shrink-0 uppercase cursor-pointer ${
              activeTab === "sales"
                ? "border-emerald-600 text-emerald-700 font-black"
                : "border-transparent text-slate-500 hover:text-slate-850 hover:border-slate-300"
            }`}
          >
            <History className="h-4 w-4" />
            Ventas y Cierre ({sales.length})
          </button>

          <button
            id="tab-profile"
            onClick={() => {
              setActiveTab("profile");
              setReprintSale(null);
            }}
            className={`py-3.5 px-4.5 text-xs font-black flex items-center gap-1.5 border-b-2 transition duration-150 shrink-0 uppercase cursor-pointer ${
              activeTab === "profile"
                ? "border-emerald-600 text-emerald-700 font-black"
                : "border-transparent text-slate-500 hover:text-slate-850 hover:border-slate-300"
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Mi Perfil 👤
          </button>

          {isCurrentUserAdmin && (
            <button
              id="tab-admin"
              onClick={() => {
                setActiveTab("admin");
                setReprintSale(null);
              }}
              className={`py-3.5 px-4.5 text-xs font-black flex items-center gap-1.5 border-b-2 border-emerald-500/10 text-rose-650 shrink-0 uppercase hover:bg-slate-50 cursor-pointer ${
                activeTab === "admin"
                  ? "border-b-2 border-rose-600 text-rose-700 font-extrabold bg-rose-50/10"
                  : "text-rose-600"
              }`}
            >
              <Shield className="h-4 w-4 text-rose-550" />
              Panel Admin 👑
            </button>
          )}
        </div>
      </nav>

      {/* Primary responsive view component space */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 overflow-x-hidden">
        {activeTab === "pos" && (
          <POS
            products={products}
            clients={clients}
            onAddSale={handleAddSale}
            onUpdateStock={handleUpdateStock}
            onUpdateClientDebt={handleUpdateClientDebt}
            currentNcfCounts={ncfCounts}
          />
        )}

        {activeTab === "inventory" && (
          <Inventory
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateFullProductList={handleUpdateFullProductList}
            onDeleteProduct={handleDeleteProduct}
          />
        )}

        {activeTab === "clients" && (
          <Clients
            clients={clients}
            onAddClient={handleAddClient}
            onUpdateClientDebt={handleUpdateClientDebt}
            onDeleteClient={handleDeleteClient}
          />
        )}

        {activeTab === "sales" && (
          <SalesHistory
            sales={sales}
            clients={clients}
            onCancelSale={handleCancelSale}
            onReprintInvoice={(saleToReprint, preferredFormat) => {
              setReprintSale(saleToReprint);
              if (preferredFormat) {
                setReprintFormat(preferredFormat);
              }
            }}
            onCloseDay={handleCloseDay}
            closures={closures}
            onDeleteClosure={handleDeleteClosure}
          />
        )}

        {activeTab === "admin" && isCurrentUserAdmin && (
          <div className="space-y-4 animate-fade-in bg-white p-5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900 uppercase">Panel de Control General de Licencias (Admin Terminal)</h2>
                <p className="text-xs text-slate-500">Administra terminales activas, bypasses de teléfonos de clientes, suspensiones inmediatas, y vencimientos técnicos.</p>
              </div>
              <div className="p-1 px-2.5 bg-rose-50 text-rose-700 border border-rose-100 rounded text-xs font-extrabold">
                Consola Principal
              </div>
            </div>

            {/* Simulated actions add new user on the fly */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-slate-550">Registrar Nuevo Correo Cliente</label>
                <input
                  id="admin-new-email"
                  type="email"
                  placeholder="ejemplo-correo@gmail.com"
                  className="w-full bg-white border border-slate-250 p-1.5 px-2.5 rounded text-xs text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-slate-550">Celular Opcional</label>
                <input
                  id="admin-new-phone"
                  type="tel"
                  placeholder="809-555-0199"
                  className="w-full bg-white border border-slate-250 p-1.5 px-2.5 rounded text-xs text-slate-800"
                />
              </div>

              <div className="space-y-1 flex flex-col justify-end">
                <button
                  id="admin-btn-register"
                  onClick={() => {
                    const elEmail = document.getElementById("admin-new-email") as HTMLInputElement;
                    const elPhone = document.getElementById("admin-new-phone") as HTMLInputElement;
                    const eText = elEmail?.value.trim().toLowerCase();
                    const pText = elPhone?.value.trim();

                    if (!eText) {
                      alert("Por favor ingresa un correo electrónico.");
                      return;
                    }

                    if (users.some((u) => u.email === eText)) {
                      alert("Este correo ya está registrado.");
                      return;
                    }

                    const newUser: AppUser = {
                      email: eText,
                      phone: pText || undefined,
                      bypassPhone: !pText,
                      createdAt: new Date().toISOString(),
                      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                      status: "active"
                    };

                    const updated = [...users, newUser];
                    saveUsersToStorage(updated);
                    alert("¡Cliente registrado correctamente!");
                    elEmail.value = "";
                    elPhone.value = "";
                  }}
                  className="w-full py-1.5.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded transition uppercase cursor-pointer"
                >
                  Registrar Licencia
                </button>
              </div>
            </div>

            {/* Registered users datatable list */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 uppercase text-[10px] text-slate-500 tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 font-bold">Fecha Creado</th>
                    <th className="py-2.5 px-3 font-bold">Correo Electrónico</th>
                    <th className="py-2.5 px-3 font-bold">Teléfono Enlazado (Único)</th>
                    <th className="py-2.5 px-3 font-bold">Bypass Teléfono</th>
                    <th className="py-2.5 px-3 font-bold">Vence El</th>
                    <th className="py-2.5 px-3 font-bold">Estado Actual</th>
                    <th className="py-2.5 px-3 font-bold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.map((u) => {
                    const isSystemAdmin = u.email === "financieranova0@gmail.com" || u.email === "christheriault880@gmail.com";
                    
                    return (
                      <tr id={`user-admin-row-${u.email}`} key={u.email} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-mono text-slate-500">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800">
                          {u.email}
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {u.phone || <span className="text-slate-400 italic">No asignado</span>}
                        </td>
                        <td className="py-3 px-3">
                          <button
                            id={`btn-bypass-${u.email}`}
                            disabled={isSystemAdmin}
                            onClick={() => {
                              const updated = users.map((uItem) => {
                                if (uItem.email === u.email) {
                                  return { ...uItem, bypassPhone: !uItem.bypassPhone };
                                }
                                return uItem;
                              });
                              saveUsersToStorage(updated);
                            }}
                            className={`p-1 px-2 text-[10px] font-bold rounded cursor-pointer ${
                              u.bypassPhone 
                                ? "bg-amber-100 text-amber-700" 
                                : "bg-slate-100 text-slate-550 hover:bg-slate-200"
                            }`}
                          >
                            {u.bypassPhone ? "Sí (Ignorar Celular)" : "No (Exige Celular)"}
                          </button>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {u.expiresAt === "forever" ? (
                            <span className="text-emerald-600 font-bold uppercase text-[10px]">Ilimitada</span>
                          ) : (
                            <span>{new Date(u.expiresAt).toLocaleDateString()}</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {(() => {
                            const isRowExpired = u.expiresAt !== "forever" && new Date() > new Date(u.expiresAt);
                            const isRowSuspended = u.status === "suspended";
                            
                            if (isRowSuspended) {
                              return (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 uppercase animate-pulse">
                                  ⚠️ SUSPENDIDO
                                </span>
                              );
                            } else if (isRowExpired) {
                              return (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                                  ⌛ VENCIDO
                                </span>
                              );
                            } else {
                              return (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                                  🟢 ACTIVO
                                </span>
                              );
                            }
                          })()}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex flex-col sm:flex-row items-center gap-2 justify-center flex-wrap">
                            <div className="flex items-center gap-1 flex-wrap justify-center">
                              {/* Activate / Suspend */}
                              {u.status === "suspended" ? (
                                <button
                                  id={`activate-user-${u.email}`}
                                  disabled={isSystemAdmin}
                                  onClick={() => {
                                    const updated = users.map((uItem) => {
                                      if (uItem.email === u.email) {
                                        return { ...uItem, status: "active" as const };
                                      }
                                      return uItem;
                                    });
                                    saveUsersToStorage(updated);
                                    alert(`¡La cuenta de ${u.email} ha sido ACTIVADA con éxito! Cuenta habilitada para ingresar.`);
                                  }}
                                  className="p-1 px-2.5 bg-emerald-100 hover:bg-emerald-250 text-emerald-800 text-[10px] font-black rounded transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none uppercase"
                                  title="Activar Cuenta"
                                >
                                  🟢 Activar
                                </button>
                              ) : (
                                <button
                                  id={`suspend-user-${u.email}`}
                                  disabled={isSystemAdmin}
                                  onClick={() => {
                                    const updated = users.map((uItem) => {
                                      if (uItem.email === u.email) {
                                        return { ...uItem, status: "suspended" as const };
                                      }
                                      return uItem;
                                    });
                                    saveUsersToStorage(updated);
                                    alert(`🛑 La cuenta de ${u.email} ha sido SUSPENDIDA de inmediato. Verá el aviso de contacto.`);
                                  }}
                                  className="p-1 px-2.5 bg-rose-100 hover:bg-rose-250 text-rose-800 text-[10px] font-black rounded transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none uppercase"
                                  title="Suspender Cuenta"
                                >
                                  🛑 Suspender
                                </button>
                              )}

                              {/* Vencer Ahora */}
                              <button
                                id={`trigger-expire-now-${u.email}`}
                                disabled={isSystemAdmin}
                                onClick={() => {
                                  const updated = users.map((uItem) => {
                                    if (uItem.email === u.email) {
                                      return { 
                                        ...uItem, 
                                        expiresAt: new Date(Date.now() - 60000).toISOString() 
                                      };
                                    }
                                    return uItem;
                                  });
                                  saveUsersToStorage(updated);
                                  alert(`⌛ La cuenta de ${u.email} ha sido configurada como VENCIDA con éxito.`);
                                }}
                                className="p-1 px-2 bg-amber-100 hover:bg-amber-205 text-amber-800 text-[10px] font-black rounded transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none uppercase"
                                title="Vencer inmediatamente"
                              >
                                ⌛ Vencer Ahora
                              </button>

                              {/* +30 Días */}
                              <button
                                id={`extend-30-${u.email}`}
                                disabled={isSystemAdmin}
                                onClick={() => {
                                  const updated = users.map((uItem) => {
                                    if (uItem.email === u.email) {
                                      const base = uItem.expiresAt === "forever" || new Date(uItem.expiresAt) < new Date()
                                        ? Date.now() 
                                        : new Date(uItem.expiresAt).getTime();
                                      return { 
                                        ...uItem, 
                                        expiresAt: new Date(base + 30 * 24 * 60 * 60 * 1000).toISOString(),
                                        status: "active" as const
                                      };
                                    }
                                    return uItem;
                                  });
                                  saveUsersToStorage(updated);
                                  alert(`🔄 Suscripción extendida +30 días para ${u.email} con éxito.`);
                                }}
                                className="p-1 px-2 bg-blue-100 hover:bg-blue-150 text-blue-800 text-[10px] font-black rounded transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none uppercase"
                                title="Extender 30 días"
                              >
                                ➕ 30 Días
                              </button>

                              {/* Set Forever */}
                              <button
                                id={`set-forever-${u.email}`}
                                disabled={isSystemAdmin}
                                onClick={() => {
                                  const updated = users.map((uItem) => {
                                    if (uItem.email === u.email) {
                                      return { ...uItem, expiresAt: "forever", status: "active" as const };
                                    }
                                    return uItem;
                                  });
                                  saveUsersToStorage(updated);
                                  alert("Licencia marcada como ILIMITADA para siempre.");
                                }}
                                className="p-1 px-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded transition cursor-pointer disabled:opacity-30"
                                title="Licencia de por vida"
                              >
                                Ilimitada/Forever
                              </button>
                            </div>

                            {/* Custom exact date picker */}
                            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-0.5 px-1.5 rounded shrink-0">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">📅 EXPIRA EL:</span>
                              <input
                                id={`custom-date-picker-${u.email}`}
                                type="date"
                                disabled={isSystemAdmin}
                                value={u.expiresAt === "forever" ? "" : u.expiresAt.substring(0, 10)}
                                onChange={(e) => {
                                  const selectVal = e.target.value;
                                  if (!selectVal) return;
                                  const parsedDate = new Date(selectVal + "T23:59:59");
                                  const updated = users.map((uItem) => {
                                    if (uItem.email === u.email) {
                                      return {
                                        ...uItem,
                                        expiresAt: parsedDate.toISOString(),
                                        status: "active" as const
                                      };
                                    }
                                    return uItem;
                                  });
                                  saveUsersToStorage(updated);
                                  alert(`📅 Nueva fecha cargada: Licencia vencerá el: ${parsedDate.toLocaleDateString()}`);
                                }}
                                className="p-0.5 text-[10px] border border-slate-300 rounded bg-white text-slate-700 font-mono max-w-[105px] cursor-pointer disabled:opacity-40"
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="space-y-6 animate-fade-in bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-2xl mx-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-150">
                  <UserCheck className="h-6 w-6 stroke-[2]" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Perfil de mi Terminal</h2>
                  <p className="text-xs text-slate-500 font-medium">Datos de tu cuenta autorizada y estado de licencia.</p>
                </div>
              </div>
              <div className="p-1 px-2.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg text-[10px] font-black tracking-wider uppercase">
                {liveUserState.email === "financieranova0@gmail.com" || liveUserState.email === "christheriault880@gmail.com" ? "👑 Administrativa" : "Licencia Activa"}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Correo de Inicio de Sesión</span>
                <span className="text-sm font-extrabold text-slate-800 break-all">{liveUserState.email}</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Teléfono Registrado</span>
                <span className="text-sm font-extrabold text-slate-800">{liveUserState.phone || "No requerido (Bypass)"}</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Suscripción Creada el</span>
                <span className="text-sm font-extrabold text-slate-800 font-mono">
                  {liveUserState.createdAt ? new Date(liveUserState.createdAt).toLocaleString() : "N/A"}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Licencia Vence el</span>
                <span className="text-sm font-extrabold text-slate-800 font-mono">
                  {liveUserState.expiresAt === "forever" ? "Ilimitada (De por vida) ♾️" : new Date(liveUserState.expiresAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4.5 flex gap-3 items-start">
              <Sparkles className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider block">Licencia Verificada y Segura</span>
                <p className="text-xs text-slate-650 leading-relaxed font-sans">
                  Tu terminal está autenticada correctamente en la plataforma de <b>Nova Facturación</b>. Se ha configurado el aislamiento completo de tus datos, por lo que tus productos, clientes y ventas registradas son 100% privadas y seguras.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
              <button
                id="profile-logout-btn"
                onClick={handleLogout}
                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition duration-150 cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider shadow-sm select-none"
              >
                <LogOut className="h-4.5 w-4.5 stroke-[2.5]" />
                Cerrar Sesión Activa (Salir)
              </button>
              
              <button
                id="profile-system-restore-btn"
                onClick={handleSystemRestoreDefault}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl font-extrabold text-xs transition duration-150 cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wide select-none"
                title="Borrador limpieza de caché"
              >
                <RefreshCw className="h-4 w-4" />
                Limpiar Datos de Sesión
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Unified reprint simulated overlay model with Multi-format capability, WhatsApp & PDF formats */}
      {reprintSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden p-5 flex flex-col items-center animate-scale-up my-8">
            <div className="flex justify-between items-center w-full border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                <Receipt className="h-5 w-5 text-emerald-600" />
                Módulo Facturador Inteligente
              </h3>
              <button
                id="btn-reprint-close-upper"
                onClick={handleCloseReprint}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Format toggle tabs within the modal */}
            <div className="flex w-full bg-slate-100 p-1 rounded-lg mb-3 gap-1 shadow-inner border border-slate-150 shrink-0">
              <button
                id="modal-toggle-thermal"
                type="button"
                onClick={() => setReprintFormat("thermal")}
                className={`flex-1 py-1.5 rounded-md text-[10px] font-extrabold uppercase transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                  reprintFormat === "thermal"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-200/60"
                }`}
              >
                <Printer className="h-3.5 w-3.5" />
                Tíquet Botonera (80mm)
              </button>
              <button
                id="modal-toggle-letter"
                type="button"
                onClick={() => setReprintFormat("letter")}
                className={`flex-1 py-1.5 rounded-md text-[10px] font-extrabold uppercase transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                  reprintFormat === "letter"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-200/60"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Papel Carta (8.5x11)
              </button>
            </div>

            {/* Simulated printable box */}
            <div id="reprint-document-container" className="w-full bg-slate-50 border border-slate-200 p-4.5 rounded-lg max-h-[460px] overflow-y-auto font-sans leading-relaxed text-xs">
              
              {reprintFormat === "thermal" ? (
                /* Thermal ticket style preview */
                <div id="print-thermal-layout" className="bg-white p-5 border border-slate-200/50 shadow-xs font-mono text-[10px] space-y-1 text-slate-700 max-w-sm mx-auto leading-tight">
                  {reprintConfig.logo && (
                    <div className="flex justify-center pb-2">
                      <img src={reprintConfig.logo} referrerPolicy="no-referrer" alt="Logo de Factura" className="h-8 w-auto object-contain" />
                    </div>
                  )}
                  <div className="text-center font-black uppercase text-slate-800 tracking-tight text-[11px]">
                    *** {reprintConfig.name.toUpperCase()} ***
                  </div>
                  <div className="text-center text-[8.5px] text-slate-500 leading-normal font-sans">
                    {reprintConfig.address.toUpperCase()}<br/>
                    RNC: {reprintConfig.rnc} • TEL: {reprintConfig.phone}<br/>
                    REGISTRADA EN DGII COMPROBANTES<br/>
                    ----------------------------------------<br/>
                  </div>

                  <div className="flex justify-between">
                    <span>FECHA:</span>
                    <span>{new Date(reprintSale.date).toLocaleString("es-DO")}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>FACTURA #:</span>
                    <span>{reprintSale.invoiceNumber}</span>
                  </div>
                  {reprintSale.ncfCode && (
                    <div className="flex justify-between font-bold bg-amber-50 p-0.5 border border-amber-200/40 text-[9.5px]">
                      <span>COMPROBANTE NCF:</span>
                      <span>{reprintSale.ncfCode}</span>
                    </div>
                  )}
                  {reprintSale.client && (
                    <div className="border border-slate-200 bg-slate-50/50 p-1.5 mt-1 text-[9px]">
                      <span className="block font-bold">CLIENTE: {reprintSale.client.name.toUpperCase()}</span>
                      {reprintSale.client.phone && <span className="block">TEL: {reprintSale.client.phone}</span>}
                    </div>
                  )}
                  <div className="border-t border-dashed border-slate-300 my-1 pt-1 font-bold">
                    ITEMS FACTURADOS
                  </div>
                  <div className="space-y-1">
                    {reprintSale.items.map((item) => (
                      <div key={item.product.id} className="flex justify-between text-[9px]">
                        <span>{item.quantity}x {item.product.name.slice(0, 22)}</span>
                        <span>RD${(item.product.price * item.quantity).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-dashed border-slate-300 my-1.5 pt-1 space-y-0.5 text-right font-bold text-slate-800">
                    <div className="flex justify-between text-slate-500">
                      <span>SUBTOTAL:</span>
                      <span>RD${reprintSale.subtotal.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 font-normal">
                      <span>ITBIS (18%):</span>
                      <span>RD${reprintSale.itbis.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-black text-emerald-800 border-t border-slate-200 pt-0.5 mt-0.5">
                      <span>TOTAL COMPRA:</span>
                      <span>RD${reprintSale.total.toFixed(0)}</span>
                    </div>
                  </div>
                  <div className="border-t border-dashed border-slate-350 pt-1 text-[9px] font-bold">
                    <span>CONDICIÓN: {reprintSale.paymentMethod.toUpperCase()}</span>
                  </div>
                  <div className="text-center text-[7.5px] text-slate-400 pt-3 uppercase tracking-wider">
                    *** GRACIAS POR PREFERIRNOS ***
                  </div>
                </div>
              ) : (
                /* MAQUINILLA PAPER SIZE VIEW (PDF) */
                <div id="print-maquinilla-layout" className="bg-white p-6 border-2 border-slate-400 font-sans text-slate-800 space-y-4 shadow-sm text-xs rounded">
                  <div className="flex justify-between items-start border-b-2 border-slate-200 pb-3">
                    <div className="flex gap-3 items-start">
                      {reprintConfig.logo && (
                        <img src={reprintConfig.logo} referrerPolicy="no-referrer" alt="Logo de Factura" className="h-10 w-auto object-contain bg-white p-0.5 border border-slate-200 rounded" />
                      )}
                      <div>
                        <h4 className="text-sm font-black uppercase text-emerald-700">{reprintConfig.name.toUpperCase()}</h4>
                        <p className="text-[10px] text-slate-500 font-bold leading-normal uppercase">
                          Dirección: {reprintConfig.address.toUpperCase()}<br/>
                          RNC: {reprintConfig.rnc} | Tel: {reprintConfig.phone}<br/>
                          CF ELECTRÓNICO (DGII DOMINICANA)
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded uppercase">Factura de Crédito Fiscal</span>
                      <div className="text-[10px] text-slate-650 mt-1.5 font-mono">
                        <b>No. Factura:</b> {reprintSale.invoiceNumber}<br/>
                        <b>NCF DGII:</b> <b className="text-emerald-700">{reprintSale.ncfCode || "No aplica / Registro"}</b>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-200">
                    <div>
                      <span className="text-[9px] font-bold uppercase text-slate-400 block tracking-tight mb-0.5">Datos Del Adquiriente</span>
                      <b className="text-slate-800 text-[11px] block">{reprintSale.client ? reprintSale.client.name.toUpperCase() : "CLIENTE GENERICO (AL CONTADO)"}</b>
                      {reprintSale.client && (
                        <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                          <p>Celular: {reprintSale.client.phone || "No especificado"}</p>
                          <p>Límite Crédito: RD$ {reprintSale.client.creditLimit?.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold uppercase text-slate-400 block tracking-tight mb-0.5">Detalles del Documento</span>
                      <p className="font-mono text-[10px]"><b>Emisión:</b> {new Date(reprintSale.date).toLocaleDateString()}</p>
                      <p className="font-mono text-[10px]"><b>Forma de Pago:</b> {reprintSale.paymentMethod}</p>
                      <p className="font-mono text-[10px]"><b>Moneda:</b> DOP (Pesos Dominicanos)</p>
                    </div>
                  </div>

                  {/* Table details */}
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200">
                        <th className="py-2 px-3 font-bold">Código Barra</th>
                        <th className="py-2 px-3 font-bold">Descripción Producto</th>
                        <th className="py-2 px-3 font-bold text-center">Cant.</th>
                        <th className="py-2 px-3 font-bold text-right">Precio Unitario</th>
                        <th className="py-2 px-3 font-bold text-right">ITBIS (18%)</th>
                        <th className="py-2 px-3 font-bold text-right">Monto Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {reprintSale.items.map((item) => {
                        const basePrice = item.product.price / 1.18;
                        const lineItbis = item.product.price - basePrice;
                        return (
                          <tr key={item.product.id}>
                            <td className="py-2 px-3 font-mono text-[10px] text-slate-500">{item.product.barcode || "N/A"}</td>
                            <td className="py-2 px-3 font-medium text-slate-900">{item.product.name}</td>
                            <td className="py-2 px-3 text-center font-bold">{item.quantity}</td>
                            <td className="py-2 px-3 text-right font-mono">RD${basePrice.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-mono">RD${(lineItbis * item.quantity).toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold">RD${(item.product.price * item.quantity).toFixed(0)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Totals box */}
                  <div className="flex justify-end pt-2 border-t border-slate-200">
                    <div className="w-64 space-y-1 text-right font-mono text-[11px]">
                      <div className="flex justify-between text-slate-500">
                        <span>Total Neto Gravado:</span>
                        <span>RD$ {reprintSale.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-550">
                        <span>ITBIS Total Liquidado:</span>
                        <span>RD$ {reprintSale.itbis.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-black text-rose-700 bg-rose-50/40 p-1 rounded">
                        <span>Total Factura RD$:</span>
                        <span>RD$ {reprintSale.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-2 gap-4.5 pt-6 text-center text-[9px] text-slate-400">
                    <div className="border-t border-slate-300 pt-3">
                      <p className="font-bold text-slate-600 uppercase">Entregado Conforme / Despacho</p>
                      <p className="mt-1 font-mono">{liveUserState.email}</p>
                    </div>
                    <div className="border-t border-slate-300 pt-3">
                      <p className="font-bold text-slate-600 uppercase">Recibido Conforme / Firma Cliente</p>
                      <p className="mt-1 italic">{reprintSale.client ? reprintSale.client.name : "Cliente Contado"}</p>
                    </div>
                  </div>

                  <div className="text-[9px] text-center text-slate-400 leading-normal bg-slate-50 p-1.5 rounded">
                    “Este documento constituye una copia con certificación digital simulada de la Factura de Crédito Fiscal autorizada por la DGII. Conforme al Art. 5 de la Ley 126-02 sobre Comercio Electrónico.”
                  </div>
                </div>
              )}
            </div>

            {/* Print, WhatsApp, and PDF Actions Suite */}
            <div className="flex flex-col gap-2 w-full mt-4">
              <button
                id="btn-reprint-whatsapp"
                onClick={() => {
                  try {
                    const emailKey = currentUser?.email || "guest";
                    const configObj = getBusinessConfig(emailKey);
                    const blob = generateInvoicePDF(reprintSale, configObj, reprintFormat);
                    const file = new File([blob], `Factura-${reprintSale.invoiceNumber}.pdf`, { type: "application/pdf" });

                    const triggerFallback = (b: Blob) => {
                      const url = URL.createObjectURL(b);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `Factura-${reprintSale.invoiceNumber}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);

                      const messageText = `*🧾 FACTURA ELECTRÓNICA - ${configObj.name.toUpperCase()}* \n\n` +
                                          `*Factura:* ${reprintSale.invoiceNumber}\n` +
                                          `*NCF DGII:* ${reprintSale.ncfCode || "N/A (Consumidor Contado)"}\n` +
                                          `*Fecha:* ${new Date(reprintSale.date).toLocaleDateString()}\n` +
                                          `*Cliente:* ${reprintSale.client ? reprintSale.client.name : "Genérico Contado"}\n` +
                                          `-----------------------------------\n` +
                                          reprintSale.items.map((i) => `• ${i.quantity}x ${i.product.name} = RD$ ${(i.product.price * i.quantity).toFixed(0)}`).join("\n") +
                                          `\n-----------------------------------\n` +
                                          `*TOTAL GENERAL CONTADO:* RD$ ${reprintSale.total.toFixed(0)}\n\n` +
                                          `※ Factura oficial en formato PDF generada con éxito y descargada en sus documentos. ¡Agradecemos su compra!`;
                      
                      const targetUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;
                      window.open(targetUrl, "_blank");
                    };

                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                      navigator.share({
                        files: [file],
                        title: `Factura ${reprintSale.invoiceNumber}`,
                        text: `Comparto factura de ${configObj.name}`
                      }).catch((err) => {
                        console.error(err);
                        triggerFallback(blob);
                      });
                    } else {
                      triggerFallback(blob);
                    }
                  } catch (e) {
                     console.error(e);
                  }
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-900 rounded-lg font-bold text-xs transition cursor-pointer"
              >
                <Smartphone className="h-4 w-4 text-slate-900" />
                Compartir WhatsApp (PDF)
              </button>

              <div className="grid grid-cols-2 gap-2 w-full">
                <button
                  id="btn-reprint-view-pdf"
                  onClick={() => {
                    try {
                      const emailKey = currentUser?.email || "guest";
                      const configObj = getBusinessConfig(emailKey);
                      const blob = generateInvoicePDF(reprintSale, configObj, reprintFormat);
                      const url = URL.createObjectURL(blob);
                      window.open(url, "_blank");
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="flex items-center justify-center gap-1 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-bold text-[10px] transition cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Ver Factura PDF
                </button>

                <button
                  id="execute-reprinted-print"
                  onClick={() => {
                    try {
                      const printElement = document.getElementById("reprint-document-container");
                      if (!printElement) return;

                      // Open popup window specifically configured for current format
                      const printWindow = window.open("", "_blank", "width=800,height=600");
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>Imprimir Factura - Nova Facturación</title>
                              <style>
                                @page {
                                  size: ${reprintFormat === "thermal" ? "80mm auto" : "letter"};
                                  margin: ${reprintFormat === "thermal" ? "0" : "15mm"};
                                }
                                body {
                                  margin: 0;
                                  padding: ${reprintFormat === "thermal" ? "4mm" : "0"};
                                  background: white !important;
                                  color: black !important;
                                  -webkit-print-color-adjust: exact;
                                  print-color-adjust: exact;
                                }
                                @media print {
                                  body { background: white !important; }
                                  .no-print { display: none !important; }
                                }
                              </style>
                            </head>
                            <body class="p-4 bg-white text-black">
                              <div id="print-content"></div>
                            </body>
                          </html>
                        `);

                        // Clone and copy all styles from the current document to get full layout & tailwind styles
                        const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
                        styles.forEach((node) => {
                          printWindow.document.head.appendChild(node.cloneNode(true));
                        });

                        // Inject the contents
                        const container = printWindow.document.getElementById("print-content");
                        if (container) {
                          container.innerHTML = printElement.innerHTML;
                        }

                        printWindow.document.close();

                        // Launch native printing safely
                        setTimeout(() => {
                          printWindow.focus();
                          printWindow.print();
                          printWindow.close();
                        }, 500);
                      } else {
                        window.print();
                      }
                    } catch (e) {
                      console.error("Popup printing error fallback", e);
                      window.print();
                    }
                  }}
                  className="flex items-center justify-center gap-1 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-bold text-[10px] transition cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir Factura
                </button>
              </div>

              <button
                id="dismiss-reprint-modal"
                onClick={handleCloseReprint}
                className="py-1.5 border border-slate-300 text-slate-705 bg-white hover:bg-slate-100 rounded-lg font-bold text-xs transition cursor-pointer text-center mt-1 w-full"
              >
                Cerrar Ventana
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center">Tip: Para guardar como PDF, elija "Guardar como PDF / Microsoft Print to PDF" en la ventana de impresión.</p>
          </div>
        </div>
      )}

      {/* Clean high-contrast footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-[11px] text-slate-400 mt-auto shrink-0 select-none">
        <p>© 2026 Nova Facturación v1.2 PRO • República Dominicana • Panel de Control Protegido de Licencia</p>
      </footer>
    </div>
  );
}
