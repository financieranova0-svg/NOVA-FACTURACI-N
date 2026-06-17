import React, { useState, useEffect, useRef } from "react";
import { 
  Barcode, 
  Camera, 
  Search, 
  User, 
  Plus, 
  Minus, 
  Trash2, 
  Coins, 
  CreditCard, 
  Printer, 
  Sparkles, 
  Check, 
  AlertCircle, 
  ShoppingCart, 
  ChevronRight,
  FileText,
  Smartphone,
  RotateCcw,
  X
} from "lucide-react";
import { Product, Client, CartItem, PaymentMethod, NcfType, Sale } from "../types";
import { INITIAL_CATEGORIES, generateNcfCode } from "../data";
import ScannerCamera from "./ScannerCamera";
import { getBusinessConfig, generateInvoicePDF } from "../utils/pdfGenerator";
import { useMemo } from "react";

interface POSProps {
  products: Product[];
  clients: Client[];
  onAddSale: (sale: Sale) => void;
  onUpdateStock: (productId: string, quantityToDeduct: number) => void;
  onUpdateClientDebt: (clientId: string, debtToAdd: number) => void;
  currentNcfCounts: { B01: number; B02: number };
}

export default function POS({ 
  products, 
  clients, 
  onAddSale, 
  onUpdateStock, 
  onUpdateClientDebt,
  currentNcfCounts
}: POSProps) {
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Selected state
  const [selectedClientState, setSelectedClientState] = useState<Client | undefined>(undefined);
  const [customClientName, setCustomClientName] = useState("");
  const selectedClient = selectedClientState || {
    id: "cli-generico",
    name: "Cliente Contado Genérico",
    currentDebt: 0,
    creditLimit: 0,
    rnc: ""
  };
  const setSelectedClient = (client: Client) => {
    setSelectedClientState(client);
  };
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Efectivo");
  const [ncfType, setNcfType] = useState<NcfType>("NINGUNO");
  
  // Scanner and Search inputs
  const [barcodeInput, setBarcodeInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  
  // Cash checkout state
  const [receivedAmount, setReceivedAmount] = useState<string>("");
  const [changeAmount, setChangeAmount] = useState<number | null>(null);
  const [companyRnc, setCompanyRnc] = useState(""); // If client chooses B01

  // Scanner status and modal
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [continuousFocus, setContinuousFocus] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Invoice print modal state
  const [printedInvoice, setPrintedInvoice] = useState<Sale | null>(null);

  // Load dynamic configs inside POS.tsx
  const [bName, setBName] = useState("NOVA FACTURACIÓN S.R.L");
  const [bRnc, setBRnc] = useState("1-01-23456-7");
  const [bPhone, setBPhone] = useState("809-555-0101");
  const [bAddress, setBAddress] = useState("Av. Winston Churchill, Santiago, RD");
  const [bLogo, setBLogo] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Read logged user email from localStorage
  const loggedUserEmail = useMemo(() => {
    try {
      const userStr = localStorage.getItem("nova_facturacion_current_user");
      if (userStr) {
        return JSON.parse(userStr)?.email || "guest";
      }
    } catch (e) {
      console.error(e);
    }
    return "guest";
  }, []);

  // Sync brand configurations
  useEffect(() => {
    const config = getBusinessConfig(loggedUserEmail);
    setBName(config.name);
    setBRnc(config.rnc);
    setBPhone(config.phone);
    setBAddress(config.address);
    setBLogo(config.logo);
  }, [loggedUserEmail, printedInvoice]);

  const handleConfigSave = (nameVal: string, rncVal: string, phoneVal: string, addrVal: string, logoVal: string) => {
    setBName(nameVal);
    setBRnc(rncVal);
    setBPhone(phoneVal);
    setBAddress(addrVal);
    setBLogo(logoVal);
    const freshConfig = { name: nameVal, rnc: rncVal, phone: phoneVal, address: addrVal, logo: logoVal };
    localStorage.setItem(`nova_business_config_${loggedUserEmail}`, JSON.stringify(freshConfig));
  };
  
  // Focus ref for USB barcode reader
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Keep focus on the barcode input if continuous focus is enabled
  useEffect(() => {
    if (continuousFocus && !isCameraActive && !printedInvoice) {
      const timer = setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [continuousFocus, isCameraActive, printedInvoice]);

  // Global keyboard shortcut: F2 focuses scanner input, F4 clears cart
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        triggerAlert("success", "Foco puesto en el lector de códigos.");
      }
      if (e.key === "F4") {
        e.preventDefault();
        if (confirm("¿Estás seguro de que quieres vaciar el carrito actual?")) {
          clearCart();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart]);

  const triggerAlert = (type: "success" | "error", text: string) => {
    setAlertMessage({ type, text });
    setTimeout(() => {
      setAlertMessage(null);
    }, 4000);
  };

  const handleBarcodeSubmit = (barcode: string) => {
    const cleanCode = barcode.trim();
    if (!cleanCode) return;

    // Search for product
    const product = products.find((p) => p.barcode === cleanCode);
    if (product) {
      addToCart(product);
      setBarcodeInput("");
      triggerAlert("success", `Agregado: ${product.name}`);
    } else {
      triggerAlert("error", `Código de barras "${cleanCode}" no registrado.`);
      setBarcodeInput("");
    }
  };

  // Keyboard USB Scanner Handler (Rapid action simulated by Enter key)
  const handleBarcodeKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBarcodeSubmit(barcodeInput);
    }
  };

  const addToCart = (product: Product) => {
    // Dismiss mobile soft keyboards/focus when manually choosing/clicking a product card
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    if (product.stock <= 0) {
      triggerAlert("error", `¡Sin Stock! "${product.name}" no tiene existencias disponibles.`);
      return;
    }

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.product.id === product.id);
      
      if (existingIndex > -1) {
        const item = prevCart[existingIndex];
        // Check stock boundary
        if (item.quantity + 1 > product.stock) {
          triggerAlert("error", `Límite de stock alcanzado para "${product.name}". Disp: ${product.stock}`);
          return prevCart;
        }
        const updatedCart = [...prevCart];
        updatedCart[existingIndex] = {
          ...item,
          quantity: item.quantity + 1,
        };
        return updatedCart;
      } else {
        return [...prevCart, { product, quantity: 1 }];
      }
    });

    // Reset change calculation
    setChangeAmount(null);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            
            // Check stock limits
            if (newQty > item.product.stock) {
              triggerAlert("error", `Máximo stock disponible: ${item.product.stock}`);
              return item;
            }
            
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
    setChangeAmount(null);
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
    triggerAlert("success", "Producto removido de la orden.");
    setChangeAmount(null);
  };

  const clearCart = () => {
    setCart([]);
    setReceivedAmount("");
    setChangeAmount(null);
    setCustomClientName("");
  };

  // Computations
  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  
  // ITBIS Breakdown based on product rates
  // DR standard rates: 18%, 16%, 0%
  // Formula: ITBIS = Subtotal_affected * (TaxRate / 100) or ITBIS inclusive depending on pricing.
  // In Dominican retail POS, the price is generally printed as ITBIS inclusive, but here we can treat the price as standard subtotal + tax, or write it beautifully. Let's compute it tax-exclusive, showing standard pricing with tax added, or calculate tax contained. 
  // Let's do tax-contained or tax added? Tax-added is standard for business (Crédito Fiscal), retail is usually tax-inclusive. Let's make it tax-added and show full clarity. It makes calculation extremely clean!
  const itbis = cart.reduce((acc, item) => {
    const rate = item.product.itbisRate;
    const itemSubtotal = item.product.price * item.quantity;
    return acc + (itemSubtotal * (rate / 100));
  }, 0);

  const total = subtotal + itbis;

  // Auto-calculate change when cash is received
  useEffect(() => {
    const parsed = parseFloat(receivedAmount);
    if (!isNaN(parsed) && parsed >= total) {
      setChangeAmount(parsed - total);
    } else {
      setChangeAmount(null);
    }
  }, [receivedAmount, total]);

  // Adjust defaults when client changes
  useEffect(() => {
    if (selectedClient.id !== "cli-generico") {
      // Default to "Consumo" (B02) but allow "Crédito Fiscal" (B01)
      if (selectedClient.rnc) {
        setNcfType("B01");
        setCompanyRnc(selectedClient.rnc);
      } else {
        setNcfType("B02");
      }
    } else {
      setNcfType("NINGUNO");
      if (paymentMethod === "Fiado" || paymentMethod === "Crédito") {
        setPaymentMethod("Efectivo");
      }
    }
  }, [selectedClient]);

  // Handle final invoice submission
  const handleCheckoutSubmit = (shouldPrint = true) => {
    if (cart.length === 0) {
      triggerAlert("error", "El carrito de ventas está vacío.");
      return;
    }

    // Debt bounds checking for credit/fiado checkout
    const isCreditPayment = paymentMethod === "Fiado" || paymentMethod === "Crédito";
    if (isCreditPayment) {
      if (selectedClient.id === "cli-generico") {
        triggerAlert("error", "No se puede fiar al Cliente Contado Genérico. Elige un cliente registrado.");
        return;
      }
      
      const potentialDebt = selectedClient.currentDebt + total;
      if (potentialDebt > selectedClient.creditLimit) {
        triggerAlert("error", `Límite de crédito excedido para ${selectedClient.name}. Máx: RD$${selectedClient.creditLimit}, Deuda actual: RD$${selectedClient.currentDebt}`);
        return;
      }
    }

    // Cash check
    if (paymentMethod === "Efectivo") {
      const cash = parseFloat(receivedAmount);
      if (isNaN(cash) || cash < total) {
        triggerAlert("error", `Monto recibido insuficiente. Se requiere al menos RD$${total.toFixed(2)}`);
        return;
      }
    }

    // Generate NCF details
    let ncfCode: string | undefined;
    if (ncfType !== "NINGUNO") {
      // Use standard sequence count for simulation
      const sequence = ncfType === "B01" ? currentNcfCounts.B01 : currentNcfCounts.B02;
      ncfCode = generateNcfCode(ncfType, sequence);
    }

    const nextInvoiceId = `FAC-${Date.now().toString().slice(-6)}`;
    const newSale: Sale = {
      id: nextInvoiceId,
      invoiceNumber: nextInvoiceId,
      date: new Date().toISOString(),
      items: [...cart],
      subtotal,
      itbis,
      total,
      client: selectedClient.id !== "cli-generico"
        ? selectedClient
        : {
            id: "cli-generico",
            name: customClientName.trim() || "Cliente Contado Genérico",
            phone: "N/A",
            creditLimit: 0,
            currentDebt: 0
          },
      paymentMethod,
      ncfType,
      ncfCode,
      receivedAmount: paymentMethod === "Efectivo" ? parseFloat(receivedAmount) : undefined,
      changeAmount: paymentMethod === "Efectivo" && changeAmount !== null ? changeAmount : undefined
    };

    // Trigger state callbacks
    onAddSale(newSale);

    // Deduct stock for all items
    cart.forEach((item) => {
      onUpdateStock(item.product.id, item.quantity);
    });

    // Update client debt ledger if "fiao"
    if (isCreditPayment) {
      onUpdateClientDebt(selectedClient.id, total);
    }

    // Success state
    if (shouldPrint) {
      setPrintedInvoice(newSale); // Triggers Print Receipt modal automatically
    } else {
      setPrintedInvoice(null);
    }
    clearCart();
    triggerAlert("success", "¡Factura electrónica emitida exitosamente!");
  };

  // Filtered products list for manual item grid
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.barcode.includes(searchQuery);
    const matchesCategory = selectedCategory === "Todos" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleViewPdf = () => {
    try {
      if (!printedInvoice) return;
      const configObj = { name: bName, rnc: bRnc, phone: bPhone, address: bAddress, logo: bLogo };
      const blob = generateInvoicePDF(printedInvoice, configObj, "thermal");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (e) {
      console.error("PDF Open Exception", e);
    }
  };

  const handleShareWhatsappPdf = () => {
    try {
      if (!printedInvoice) return;
      const configObj = { name: bName, rnc: bRnc, phone: bPhone, address: bAddress, logo: bLogo };
      const blob = generateInvoicePDF(printedInvoice, configObj, "thermal");
      
      const file = new File([blob], `Factura-${printedInvoice.invoiceNumber}.pdf`, { type: "application/pdf" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: `Factura ${printedInvoice.invoiceNumber}`,
          text: `Comparto mi factura de compra de ${configObj.name}`
        }).catch((err) => {
          console.error("error sharing file", err);
          triggerWhatsappTextFallback(configObj, blob);
        });
      } else {
        triggerWhatsappTextFallback(configObj, blob);
      }
    } catch (e) {
      console.error("PDF Share Exception", e);
    }
  };

  const triggerWhatsappTextFallback = (configObj: any, blob?: Blob) => {
    if (blob && printedInvoice) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Factura-${printedInvoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    if (!printedInvoice) return;
    const messageText = `*🧾 FACTURA ELECTRÓNICA - ${configObj.name.toUpperCase()}* \n\n` +
                        `*Factura:* ${printedInvoice.invoiceNumber}\n` +
                        `*NCF DGII:* ${printedInvoice.ncfCode || "N/A (Detalle al Contado)"}\n` +
                        `*Fecha:* ${new Date(printedInvoice.date).toLocaleDateString()}\n` +
                        `*Cliente:* ${printedInvoice.client ? printedInvoice.client.name : "Genérico Contado"}\n` +
                        `-----------------------------------\n` +
                        printedInvoice.items.map((i) => `• ${i.quantity}x ${i.product.name} = RD$ ${(i.product.price * i.quantity).toFixed(0)}`).join("\n") +
                        `\n-----------------------------------\n` +
                        `*TOTAL GENERAL CONTADO:* RD$ ${printedInvoice.total.toFixed(0)}\n\n` +
                        `※ Factura oficial en formato PDF generada con éxito y guardada en sus documentos. ¡Agradecemos su compra!`;
    
    const targetUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;
    window.open(targetUrl, "_blank");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full animate-fade-in">
      {/* LEFT COLUMN: Fast Product Grid & Scanners (7 Columns) */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        {/* Rapid Scan Header Controls */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="w-full md:w-auto flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Barcode className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Lector de Códigos</h2>
              <p className="text-[11px] text-slate-500">Escané directo con USB o Cámara</p>
            </div>
          </div>

          <div className="w-full md:flex-1 max-w-sm relative">
            <input
              id="barcode-scanner-input"
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeKeyPress}
              placeholder="Haz clic aquí & Escanea el código [F2]"
              className="w-full pr-10 pl-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 font-mono"
            />
            <span className="absolute right-3 top-2 text-[10px] bg-slate-200/80 text-slate-600 px-1 rounded select-none font-bold">F2</span>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <button
              id="activate-camera"
              onClick={() => setIsCameraActive(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition shadow-xs w-full cursor-pointer"
            >
              <Camera className="h-4 w-4" />
              Cámara Celular
            </button>

            <button
              id="toggle-continuous-focus"
              onClick={() => setContinuousFocus(!continuousFocus)}
              title="Mantiene enfocado automáticamente el lector para escaneado ininterrumpido"
              className={`p-2 rounded-lg border text-xs transition ${
                continuousFocus 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-600" 
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {continuousFocus ? "Auto-Foco encendido" : "Auto-Foco apagado"}
            </button>
          </div>
        </div>

        {/* Product Selection Catalog & Search */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-[350px]">
          {/* Grid Search and category slider */}
          <div className="flex flex-col md:flex-row gap-3 mb-4 items-center justify-between">
            <div className="w-full md:w-64 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="search-pos-product"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por Nombre / Código..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800"
              />
            </div>

            {/* Categories scrollable container */}
            <div className="w-full md:flex-1 flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
              <button
                id="cat-todos"
                onClick={() => setSelectedCategory("Todos")}
                className={`px-3 py-1 text-xs rounded-full font-medium shrink-0 transition-all ${
                  selectedCategory === "Todos"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Todos
              </button>
              {INITIAL_CATEGORIES.map((cat) => (
                <button
                  id={`cat-select-${cat.replace(/\s+/g, '-').toLowerCase()}`}
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-xs rounded-full font-medium shrink-0 transition-all ${
                    selectedCategory === cat
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Interactive Area */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 overflow-y-auto max-h-[420px] pr-1 flex-1">
            {filteredProducts.map((p) => {
              const isLowStock = p.stock <= (p.minStock || 5);
              const isOutOfStock = p.stock <= 0;
              return (
                <div
                  id={`pos-product-card-${p.barcode}`}
                  key={p.id}
                  onClick={() => !isOutOfStock && addToCart(p)}
                  className={`group relative p-3 rounded-xl border text-left cursor-pointer transition duration-150 flex flex-col justify-between h-28 ${
                    isOutOfStock 
                      ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed" 
                      : "bg-white border-slate-200 hover:border-emerald-500 hover:shadow-xs group-hover:scale-[1.02]"
                  }`}
                >
                  {/* Category Pill Tag */}
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-tight">{p.category}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                      p.itbisRate > 0 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                    }`}>
                      {p.itbisRate > 0 ? `ITBIS ${p.itbisRate}%` : "EXENTO"}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug font-sans group-hover:text-emerald-700">
                    {p.name}
                  </h4>

                  {/* Pricing and stock info */}
                  <div className="flex items-end justify-between mt-1">
                    <div>
                      <p className="text-xs text-slate-400 font-mono">P. Unidad</p>
                      <span className="text-sm font-extrabold text-emerald-600 font-mono">
                        RD${p.price.toFixed(2)}
                      </span>
                    </div>

                    {/* Stock tracker badge */}
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">Stock</p>
                      <span className={`text-xs font-bold font-mono ${
                        isOutOfStock 
                          ? "text-red-500" 
                          : isLowStock 
                            ? "text-amber-500" 
                            : "text-slate-600"
                      }`}>
                        {p.stock}
                      </span>
                    </div>
                  </div>

                  {/* Barcode small badge on hover */}
                  <span className="absolute bottom-1 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] text-slate-400 font-mono">
                    {p.barcode}
                  </span>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
                <AlertCircle className="h-8 w-8 text-slate-300 mb-2" />
                <h4 className="text-slate-500 text-xs font-bold">No se encontraron productos</h4>
                <p className="text-slate-400 text-[11px] max-w-xs mt-1">
                  Intenta buscando otra palabra o usa la pestaña de inventariado para crear uno nuevo.
                </p>
              </div>
            )}
          </div>
          
          {/* Quick instructions bar */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>💡 Haz clic en cualquier tarjeta de arriba para ingresarla de inmediato</span>
            <span>Atajos: <b className="text-slate-600 font-mono">F2</b> Foco Escáner | <b className="text-slate-600 font-mono">F4</b> Limpiar</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Cart, NCF Selector & Checkout Ledger (5 Columns) */}
      <div className="lg:col-span-5 flex flex-col space-y-4">
        {/* Expandable Business Metadata Settings Modal Trigger */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200/80 shadow-xs overflow-hidden">
          <button
            id="btn-toggle-business-settings"
            onClick={() => setIsSettingsOpen(true)}
            className="w-full px-4 py-3.5 hover:from-emerald-100 hover:to-teal-100 flex items-center justify-between font-bold text-xs text-emerald-800 tracking-tight cursor-pointer transition-all duration-150"
          >
            <span className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-sm">
                <Camera className="h-4 w-4" />
              </span>
              ⚙️ EDITAR ENCABEZADO DE FACTURA (CAMBIAR DIRECCIÓN/LOGOS)
            </span>
            <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-3 py-1 rounded-md shadow-xs uppercase tracking-wider">
              EDITAR AQUÍ
            </span>
          </button>
        </div>

        {/* Core Cart */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full min-h-[500px]">
          {/* Cart Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-800">Orden de Venta</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">
                {cart.reduce((s, i) => s + i.quantity, 0)} Artículos
              </span>
              {cart.length > 0 && (
                <button
                  id="clear-pos-cart"
                  onClick={clearCart}
                  title="Vaciar orden de venta"
                  className="p-1 rounded text-red-500 hover:bg-red-50 hover:text-red-700 transition"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Cart List Items scroll container */}
          <div className="flex-1 overflow-y-auto max-h-[280px] p-2 space-y-1.5 scrollbar-thin">
            {cart.map((item) => (
              <div
                id={`cart-item-${item.product.barcode}`}
                key={item.product.id}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/40 transition"
              >
                {/* Title and pricing block */}
                <div className="flex-1 min-w-0 pr-1.5">
                  <h5 className="text-xs font-semibold text-slate-800 truncate" title={item.product.name}>
                    {item.product.name}
                  </h5>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                    <span className="font-mono">RD${item.product.price.toFixed(2)} c/u</span>
                    <span>•</span>
                    <span className={`px-1 py-0.1 font-semibold rounded text-[8px] ${
                      item.product.itbisRate > 0 ? "bg-amber-100/50 text-amber-700" : "bg-emerald-100/50 text-emerald-700"
                    }`}>
                      {item.product.itbisRate > 0 ? `ITB ${item.product.itbisRate}%` : "EXENTO"}
                    </span>
                  </div>
                </div>

                {/* Counter and actions container */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shadow-xs shrink-0">
                    <button
                      id={`dec-qty-${item.product.barcode}`}
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="p-1 px-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition active:scale-95"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-2.5 text-xs font-bold text-slate-800 font-mono select-none">
                      {item.quantity}
                    </span>
                    <button
                      id={`inc-qty-${item.product.barcode}`}
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="p-1 px-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition active:scale-95"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Individual subtotal */}
                  <span className="w-16 text-right font-extrabold text-xs text-slate-800 font-mono">
                    RD${(item.product.price * item.quantity).toFixed(0)}
                  </span>

                  {/* Remove bin */}
                  <button
                    id={`remove-item-${item.product.barcode}`}
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1 text-slate-300 hover:text-red-500 rounded transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="h-44 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <ShoppingCart className="h-10 w-10 text-slate-200 stroke-1 mb-2 animate-bounce" />
                <h5 className="font-medium text-xs text-slate-500">Orden vacía</h5>
                <p className="text-[10px] text-slate-400 max-w-xs mt-1">
                  Escanear código de barras o selecciona un producto en la izquierda para facturar.
                </p>
              </div>
            )}
          </div>

          {/* DR Electronic Invoicing / NCF Configuration */}
          <div className="px-4 py-2 border-t border-b border-slate-100 bg-slate-50/40 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Comprobante de Pago (NCF)
              </label>
              <select
                id="select-ncf-type"
                value={ncfType}
                onChange={(e) => setNcfType(e.target.value as NcfType)}
                className="w-full text-xs bg-white border border-slate-200 rounded px-1.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="NINGUNO">Ninguno (Ticket básico)</option>
                <option value="B02">Consumo Fijo (B02)</option>
                <option value="B01">Crédito Fiscal (B01)</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Comercio RNC (B01)
              </label>
              <input
                id="ncf-rnc-input"
                type="text"
                disabled={ncfType !== "B01"}
                value={companyRnc}
                onChange={(e) => setCompanyRnc(e.target.value)}
                placeholder="RNC o Cédula Cliente"
                className="w-full text-xs bg-white border border-slate-200 rounded px-1.5 py-1 text-slate-700 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Client & Credit Selection */}
          <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/15">
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                <User className="h-3 w-3 text-slate-400" />
                Cliente Responsable
              </label>
              {selectedClient.id !== "cli-generico" && (
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                  Tiene Crédito Disp.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                id="select-pos-client"
                value={selectedClient.id}
                onChange={(e) => {
                  if (e.target.value === "cli-generico") {
                    setSelectedClientState(undefined);
                    setCustomClientName("");
                  } else {
                    const targetClient = clients.find(c => c.id === e.target.value);
                    if (targetClient) setSelectedClient(targetClient);
                  }
                }}
                className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              >
                <option value="cli-generico">Cliente Contado (Genérico)</option>
                {clients.filter(c => c.id !== "cli-generico").map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.currentDebt > 0 ? `(Debe: RD$${c.currentDebt})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {selectedClient.id === "cli-generico" && (
              <div className="mt-2 text-xs">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Nombre del Cliente para Factura (Opcional)
                </label>
                <input
                  id="input-custom-client-name"
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  value={customClientName}
                  onChange={(e) => setCustomClientName(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                />
              </div>
            )}

            {/* If a credit-approved client is selected, show their ledger summary */}
            {selectedClient.id !== "cli-generico" && (
              <div className="mt-2 grid grid-cols-3 bg-emerald-50/40 p-2 rounded-lg border border-emerald-100/50 text-[10px]">
                <div>
                  <span className="text-slate-500 block">Límite Crédito</span>
                  <span className="font-extrabold text-slate-700">RD${selectedClient.creditLimit}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Deuda Fiada</span>
                  <span className="font-extrabold text-red-500">RD${selectedClient.currentDebt}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Crédito Libre</span>
                  <span className="font-extrabold text-emerald-700">
                    RD${selectedClient.creditLimit - selectedClient.currentDebt}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Pricing Math Board */}
          <div className="p-4 bg-slate-50/50 space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between items-center">
              <span>Subtotal</span>
              <span className="font-bold text-slate-800 font-mono">RD${subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center text-slate-500">
              <span className="flex items-center gap-1">
                ITBIS DR (ITBIS Facturado)
              </span>
              <span className="font-bold font-mono">RD${itbis.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-slate-900">
              <span className="font-extrabold text-sm uppercase tracking-tight">Gran Total</span>
              <span className="font-black text-xl text-emerald-600 font-mono animate-pulse">
                RD${total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Method / Fast Cash Controls */}
          <div className="p-4 bg-slate-950 border-t border-slate-900 rounded-b-xl space-y-3 shrink-0">
            <div>
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Método de Liquidación
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  id="pay-cash"
                  onClick={() => setPaymentMethod("Efectivo")}
                  className={`py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    paymentMethod === "Efectivo"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
                  }`}
                >
                  <Coins className="h-3.5 w-3.5" />
                  Efectivo
                </button>

                <button
                  id="pay-card"
                  onClick={() => setPaymentMethod("Tarjeta")}
                  className={`py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    paymentMethod === "Tarjeta"
                      ? "bg-sky-600 text-white shadow-xs"
                      : "bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Tarjeta
                </button>

                <button
                  id="pay-transfer"
                  onClick={() => setPaymentMethod("Transferencia")}
                  className={`py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    paymentMethod === "Transferencia"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Transf.
                </button>

                <button
                  id="pay-fiado"
                  disabled={selectedClient.id === "cli-generico"}
                  onClick={() => setPaymentMethod("Fiado")}
                  className={`py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                    paymentMethod === "Fiado"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
                  }`}
                  title={selectedClient.id === "cli-generico" ? "Debes elegir un cliente válido para fiar" : "Regitrar venta en cuentas por cobrar / fiao"}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Fiar (Fiado)
                </button>
              </div>
            </div>

            {/* Interactive Cash Drawer input */}
            {paymentMethod === "Efectivo" && (
              <div className="grid grid-cols-2 gap-2.5 items-center bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <div>
                  <label className="block text-[9px] font-semibold text-slate-400 mb-1">
                    Efectivo Recibido (RD$)
                  </label>
                  <input
                    id="cash-received-input"
                    type="number"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    placeholder="E.g. 500"
                    className="w-full px-2.5 py-1 text-sm bg-slate-955 border border-slate-700 rounded-md focus:outline-none focus:border-emerald-500 text-white font-mono"
                  />
                </div>

                <div className="text-right">
                  <span className="block text-[9px] text-slate-400 mb-1">
                    Cambio de Vuelta
                  </span>
                  <span className={`text-base font-black font-mono block ${
                    changeAmount !== null && changeAmount >= 0 
                      ? "text-emerald-400" 
                      : "text-slate-400"
                  }`}>
                    {changeAmount !== null ? `RD$${changeAmount.toFixed(2)}` : "- -"}
                  </span>
                </div>
              </div>
            )}

            {/* Submit checkout buttons */}
            <div className="space-y-2 mt-3.5">
              <button
                id="submit-pos-checkout-print"
                disabled={cart.length === 0}
                onClick={() => handleCheckoutSubmit(true)}
                className={`w-full py-3 rounded-lg text-xs font-black tracking-wide uppercase transition flex items-center justify-center gap-2 cursor-pointer ${
                  cart.length === 0
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
                    : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:shadow-md active:translate-y-px duration-150"
                }`}
              >
                <Printer className="h-4.5 w-4.5 stroke-2 text-slate-900" />
                Liquidar factura electrónica e imprimir tamaño botonera
              </button>

              <button
                id="submit-pos-checkout-silent"
                disabled={cart.length === 0}
                onClick={() => handleCheckoutSubmit(false)}
                className={`w-full py-2.5 rounded-lg text-xs font-bold tracking-wide uppercase border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  cart.length === 0
                    ? "bg-slate-800/40 text-slate-650 border-transparent cursor-not-allowed"
                    : "bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200"
                }`}
              >
                <Check className="h-4 w-4 stroke-2 text-emerald-500" />
                Liquidar factura electrónica
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating System-Wide Alerts info toast */}
      {alertMessage && (
        <div className={`fixed bottom-4 right-4 z-40 px-4 py-3 rounded-xl border shadow-lg flex items-center gap-2.5 transition animate-slide-up ${
          alertMessage.type === "success" 
            ? "bg-emerald-900 border-emerald-700 text-emerald-100" 
            : "bg-red-955 border-red-800 text-red-100"
        }`}>
          {alertMessage.type === "success" ? (
            <Check className="h-4 w-4 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-400" />
          )}
          <span className="text-xs font-semibold">{alertMessage.text}</span>
        </div>
      )}

      {/* Embedded Camera Scanning Overlay Module */}
      {isCameraActive && (
        <ScannerCamera
          onScan={(scannedBarcode) => handleBarcodeSubmit(scannedBarcode)}
          onClose={() => setIsCameraActive(false)}
        />
      )}

      {/* Printable Receipt Modal Interface */}
      {printedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden p-5 flex flex-col items-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-2">
              <Check className="h-6 w-6 stroke-3" />
            </div>

            <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-tight text-center mb-0.5">
              ¡Facturado Correctamente!
            </h3>
            <p className="text-[11px] text-slate-400 text-center mb-3">
              Ticket ID: {printedInvoice.invoiceNumber}
            </p>

            {/* Thermal ticket style preview container using the pos-receipt-document ID for printing */}
            <div id="pos-receipt-document" className="w-full bg-slate-50 border border-slate-200 p-4.5 rounded-lg font-mono text-slate-705 text-[10px] space-y-1.5 shadow-xs leading-tight max-h-[350px] overflow-y-auto">
              
              {bLogo && (
                <div className="flex justify-center pb-2.5">
                  <img src={bLogo} referrerPolicy="no-referrer" alt="Logo" className="h-10 w-auto object-contain" />
                </div>
              )}

              <div className="text-center font-bold uppercase text-slate-800 tracking-tight">
                *** {bName.toUpperCase()} ***
              </div>
              <div className="text-center text-[9px] text-slate-505 leading-normal">
                {bAddress.toUpperCase()}<br/>
                Tel: {bPhone} | RNC: {bRnc}<br/>
                CF ELECTRÓNICO (DGII)<br/>
                ----------------------------------------
              </div>

              <div className="border-t border-dashed border-slate-300 pt-1 flex justify-between">
                <span>Fecha:</span>
                <span>{new Date(printedInvoice.date).toLocaleDateString()} {new Date(printedInvoice.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>

              <div className="flex justify-between">
                <span>Factura #:</span>
                <span className="font-bold">{printedInvoice.invoiceNumber}</span>
              </div>

              {printedInvoice.ncfCode && (
                <div className="flex justify-between bg-amber-100/40 p-1 rounded font-bold">
                  <span>NCF Comprobante:</span>
                  <span>{printedInvoice.ncfCode}</span>
                </div>
              )}

              {printedInvoice.client && (
                <div className="p-1 border border-slate-200 rounded text-[9px] mt-1 space-y-0.5">
                  <span className="block font-bold">Cliente: {printedInvoice.client.name}</span>
                  {printedInvoice.client.phone && <span className="block">Tel: {printedInvoice.client.phone}</span>}
                </div>
              )}

              <div className="border-t border-dashed border-slate-300 pt-1 font-bold">
                PROD. DETALLE
              </div>

              <div className="space-y-1">
                {printedInvoice.items.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-[9px]">
                    <span className="truncate max-w-[170px]">
                      {item.quantity}x {item.product.name}
                    </span>
                    <span>RD${(item.product.price * item.quantity).toFixed(0)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-300 pt-1 space-y-0.5 text-right font-semibold">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>RD${printedInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>ITBIS (18.0%):</span>
                  <span>RD${printedInvoice.itbis.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold text-slate-800">
                  <span>TOTAL RD$:</span>
                  <span>RD${printedInvoice.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-1 flex justify-between uppercase font-bold text-slate-800 text-[9px]">
                <span>Pago: {printedInvoice.paymentMethod}</span>
                {printedInvoice.receivedAmount !== undefined && (
                  <span>Recibido: RD${printedInvoice.receivedAmount}</span>
                )}
              </div>

              {printedInvoice.changeAmount !== undefined && (
                <div className="flex justify-between text-[9px] font-bold">
                  <span>Devuelto (Cambio):</span>
                  <span>RD${printedInvoice.changeAmount.toFixed(0)}</span>
                </div>
              )}

              <div className="text-center text-[8px] text-slate-400 pt-2 border-t border-dashed border-slate-200 uppercase tracking-widest">
                ¡Gracias por su compra!<br/>
                Facturación certificada por DGII
              </div>
            </div>

            {/* Print, View PDF and WhatsApp Actions Suite */}
            <div className="flex flex-col gap-1.5 w-full mt-4">
              <button
                id="btn-pos-receipt-whatsapp"
                onClick={handleShareWhatsappPdf}
                className="flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-505 text-white rounded-lg font-bold text-xs transition cursor-pointer"
              >
                <Smartphone className="h-4 w-4" />
                Compartir WhatsApp (PDF)
              </button>

              <div className="grid grid-cols-2 gap-1.5 w-full">
                <button
                  id="btn-pos-receipt-pdf"
                  onClick={handleViewPdf}
                  className="flex items-center justify-center gap-1 py-1.5 bg-slate-100 text-slate-705 hover:bg-slate-200 rounded-lg font-bold text-[10px] transition cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Ver Factura PDF
                </button>

                <button
                  id="execute-receipt-print"
                  onClick={() => {
                    try {
                      const printElement = document.getElementById("pos-receipt-document");
                      if (!printElement) return;

                      // Open a popup window for printing to bypass standard sandbox print constraints
                      const printWindow = window.open("", "_blank", "width=400,height=600");
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>Imprimir Tíquet - Nova Facturación</title>
                              <style>
                                @page {
                                  size: 80mm auto;
                                  margin: 0;
                                }
                                body {
                                  margin: 0;
                                  padding: 4mm;
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
                            <body class="p-4 bg-white text-black font-mono">
                              <div id="print-content" class="w-full text-xs p-0 m-0 bg-white"></div>
                            </body>
                          </html>
                        `);

                        // Clone and copy all styles from the parent document to get clean layout & font stylings
                        document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
                          printWindow.document.head.appendChild(node.cloneNode(true));
                        });

                        // Set the contents to print
                        const contentDiv = printWindow.document.getElementById("print-content");
                        if (contentDiv) {
                          contentDiv.innerHTML = printElement.innerHTML;
                        }

                        printWindow.document.close();

                        // Fire native printing safely
                        setTimeout(() => {
                          printWindow.focus();
                          printWindow.print();
                          printWindow.close();
                        }, 500);
                      } else {
                        // Fallback to inline printing if popup is strict blocked
                        window.print();
                      }
                    } catch (e) {
                      console.error("Popup print exception fallback", e);
                      window.print();
                    }
                  }}
                  className="flex items-center justify-center gap-1 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-bold text-[10px] transition cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir Tíquet
                </button>
              </div>

              <button
                id="dismiss-print-modal"
                onClick={() => {
                  setPrintedInvoice(null);
                  const oldPrint = document.getElementById("print-section");
                  if (oldPrint) oldPrint.remove();
                  const oldStyle = document.getElementById("dynamic-page-style");
                  if (oldStyle) oldStyle.remove();
                }}
                className="py-1.5 border border-slate-300 text-slate-705 bg-white hover:bg-slate-100 rounded-lg font-bold text-xs transition cursor-pointer text-center mt-1 w-full"
              >
                Cerrar Ventana
              </button>
            </div>
            <p className="text-[9px] text-slate-400 mt-2.5 text-center">
              * El sistema genera facturas oficiales en formato PDF y las enlaza directamente con los dispositivos.
            </p>
          </div>
        </div>
      )}

      {/* Settings Modal (Configuración de Factura) - Keeps it fully visible, scrollable and responsive anywhere */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden p-6 flex flex-col animate-scale-up my-8">
            <div className="flex justify-between items-center pb-3 border-b border-rose-100 mb-4">
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Camera className="h-4 w-4" />
                </span>
                ⚙️ Ajustar Datos del Negocio y Dirección
              </h3>
              <button
                id="btn-close-settings-modal"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
              {/* Logo Selection Section */}
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-1">
                <label className="relative flex items-center justify-center w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-white cursor-pointer overflow-hidden transition group shrink-0 shadow-sm">
                  {bLogo ? (
                    <img src={bLogo} referrerPolicy="no-referrer" alt="Logo de Factura" className="w-[90%] h-[90%] object-contain" />
                  ) : (
                    <Camera className="h-6 w-6 text-slate-400 group-hover:text-emerald-500" />
                  )}
                  <input
                    id="input-logo-file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const base64Str = event.target?.result as string;
                          setBLogo(base64Str);
                          handleConfigSave(bName, bRnc, bPhone, bAddress, base64Str);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                </label>
                <div className="flex-1">
                  <span className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-0.5">Logo o Foto Comercial</span>
                  <span className="text-[10px] text-slate-500 block font-normal leading-relaxed">
                    Sube tu logotipo para colocarlo en la cabecera de las facturas (JPG o PNG).
                  </span>
                </div>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Nombre Comercial de la Empresa</label>
                  <input
                    id="setting-business-name"
                    type="text"
                    value={bName}
                    onChange={(e) => {
                      setBName(e.target.value);
                      handleConfigSave(e.target.value, bRnc, bPhone, bAddress, bLogo);
                    }}
                    placeholder="E.g. Colmado Esterlin"
                    className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-905 font-bold shadow-xs transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">RNC o Cédula</label>
                     <input
                       id="setting-business-rnc"
                       type="text"
                       value={bRnc}
                       onChange={(e) => {
                         setBRnc(e.target.value);
                         handleConfigSave(bName, e.target.value, bPhone, bAddress, bLogo);
                       }}
                       placeholder="1-01-23456-7"
                       className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-905 font-bold shadow-xs transition"
                     />
                   </div>

                   <div>
                     <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Teléfono Fijo / Móvil</label>
                     <input
                       id="setting-business-phone"
                       type="text"
                       value={bPhone}
                       onChange={(e) => {
                         setBPhone(e.target.value);
                         handleConfigSave(bName, bRnc, e.target.value, bAddress, bLogo);
                       }}
                       placeholder="8092949355"
                       className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-905 font-bold shadow-xs transition"
                     />
                   </div>
                 </div>

                 <div>
                   <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Dirección Física de Facturación</label>
                   <textarea
                     id="setting-business-address"
                     rows={3}
                     value={bAddress}
                     onChange={(e) => {
                       setBAddress(e.target.value);
                       handleConfigSave(bName, bRnc, bPhone, e.target.value, bLogo);
                     }}
                     placeholder="Av. Winston Churchill, Santiago, RD"
                     className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-905 font-bold shadow-xs resize-none transition"
                   />
                 </div>
               </div>
             </div>

             <div className="flex gap-2 justify-end pt-3 mt-4 border-t border-slate-100">
               <button
                 id="btn-save-settings-modal"
                 onClick={() => setIsSettingsOpen(false)}
                 className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-sm transition tracking-wider uppercase text-center cursor-pointer"
               >
                 Guardar y Cerrar
               </button>
             </div>
           </div>
         </div>
       )}
    </div>
  );
}
