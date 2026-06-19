import { useState, useEffect, FormEvent } from "react";
import { 
  Receipt, 
  FileText, 
  Printer, 
  Send, 
  Search, 
  Trash2, 
  Plus, 
  Check, 
  Sparkles, 
  ChevronRight, 
  Calendar, 
  User, 
  DollarSign, 
  Layers, 
  RotateCcw,
  FileCheck,
  CheckCircle,
  HelpCircle,
  Clock,
  Briefcase,
  Camera
} from "lucide-react";
import { Client, Product, AppUser } from "../types";
import { getBusinessConfig, BusinessConfig } from "../utils/pdfGenerator";
import { jsPDF } from "jspdf";

interface ReceiptsProps {
  currentUser: AppUser | null;
  clients: Client[];
  products: Product[];
}

interface CustomReceipt {
  id: string;
  type: "cuota" | "completo" | "inicio";
  receiptNumber: string;
  date: string;
  
  // Base fields
  clientName: string;
  clientCedula: string;
  vendedor: string;
  phone: string;
  phone2: string;
  rnc: string;
  direccion: string;
  
  // Product info
  productDescription: string;
  productQty: number;
  totalAmount: number;
  hasItbis: boolean;
  
  // Type 1: Cuota / Abono specific
  invoiceNumber: string;
  abonoCuotas: number;
  totalPagado: number;
  totalRestante: number;
  proximoPagoMonto: number;
  proximoPagoFecha: string;
  cuotasPagadas: string; // e.g. "1/7"
  cuotasAtrasadas: number;
  
  // Type 3: Inicio de Financiamiento specific
  montoInicial: number;
  cantidadCuotas: number;
  frecuenciaPago: "Semanal" | "Mensual" | "Anual";
  montoPorCuota: number;
  fiadorNombre: string;
  fiadorCedula: string;
  garantia: string;
}

export default function Receipts({ currentUser, clients, products }: ReceiptsProps) {
  const userEmail = currentUser?.email || "default";
  
  // Local storage for keeping receipts list
  const [receiptsList, setReceiptsList] = useState<CustomReceipt[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Active receipt editor type
  const [receiptType, setReceiptType] = useState<"cuota" | "completo" | "inicio">("cuota");
  
  // Origin preference
  const [isProductManual, setIsProductManual] = useState(false);

  // Form fields
  const [clientName, setClientName] = useState("");
  const [clientCedula, setClientCedula] = useState("");
  const [vendedor, setVendedor] = useState(currentUser?.email ? currentUser.email.split("@")[0].toUpperCase() : "LUIS");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("829-879-5652");
  const [rnc, setRnc] = useState("RNC EN USO");
  const [direccion, setDireccion] = useState("Av. Respaldo los Mártires esq. Máximo Gómez # 11");
  
  const [productDescription, setProductDescription] = useState("");
  const [productQty, setProductQty] = useState(1);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [hasItbis, setHasItbis] = useState(false);
  
  // Type 1 special:
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [abonoCuotas, setAbonoCuotas] = useState<number>(0);
  const [totalPagado, setTotalPagado] = useState<number>(0);
  const [totalRestante, setTotalRestante] = useState<number>(0);
  const [proximoPagoMonto, setProximoPagoMonto] = useState<number>(0);
  const [proximoPagoFecha, setProximoPagoFecha] = useState("");
  const [cuotasPagadas, setCuotasPagadas] = useState("1/7");
  const [cuotasAtrasadas, setCuotasAtrasadas] = useState<number>(0);
  
  // Type 3 special:
  const [montoInicial, setMontoInicial] = useState<number>(0);
  const [cantidadCuotas, setCantidadCuotas] = useState<number>(8);
  const [frecuenciaPago, setFrecuenciaPago] = useState<"Semanal" | "Mensual" | "Anual">("Mensual");
  const [montoPorCuota, setMontoPorCuota] = useState<number>(0);
  const [fiadorNombre, setFiadorNombre] = useState("");
  const [fiadorCedula, setFiadorCedula] = useState("");
  const [garantia, setGarantia] = useState("2 años de garantía. La garantía no cubre daño eléctrico y por faltar de mantenimiento.");

  const businessConfig = getBusinessConfig(userEmail);
  const [logo, setLogo] = useState(businessConfig.logo || "");

  // Update logo if user config changes
  useEffect(() => {
    const config = getBusinessConfig(userEmail);
    setLogo(config.logo || "");
  }, [userEmail]);

  const handleLogoChange = (base64Str: string) => {
    setLogo(base64Str);
    const currentConfig = getBusinessConfig(userEmail);
    const updatedConfig = { ...currentConfig, logo: base64Str };
    localStorage.setItem(`nova_business_config_${userEmail}`, JSON.stringify(updatedConfig));
    showBannerMessage("🎨 Logotipo del perfil guardado con éxito.");
  };

  // Load receipts from Storage
  useEffect(() => {
    const stored = localStorage.getItem(`factura_pos_custom_receipts_${userEmail}`);
    if (stored) {
      try {
        setReceiptsList(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
  }, [userEmail]);

  // Helper trigger messages safely
  const showBannerMessage = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  // Safe save receipts
  const saveReceiptsToStorage = (updated: CustomReceipt[]) => {
    setReceiptsList(updated);
    localStorage.setItem(`factura_pos_custom_receipts_${userEmail}`, JSON.stringify(updated));
  };

  // Set form helper when choosing existing client
  const handleSelectClient = (clientId: string) => {
    if (!clientId) {
      setClientName("");
      setClientCedula("");
      setPhone("");
      return;
    }
    const found = clients.find(c => c.id === clientId);
    if (found) {
      setClientName(found.name);
      setClientCedula(found.phone !== "N/A" ? found.phone : "");
      setPhone(found.phone !== "N/A" ? found.phone : "");
      if (receiptType === "cuota") {
        setTotalRestante(found.currentDebt || 0);
      }
    }
  };

  // Set product helper
  const handleSelectProduct = (productId: string) => {
    if (!productId) {
      setProductDescription("");
      setTotalAmount(0);
      return;
    }
    const found = products.find(p => p.id === productId);
    if (found) {
      setProductDescription(found.name);
      setTotalAmount(found.price);
      // Auto-calculate logic or assist if type 3
      if (receiptType === "inicio") {
        // Simple suggestion for installment
        const remaining = found.price - montoInicial;
        const suggestion = remaining > 0 ? Math.round(remaining / cantidadCuotas) : 0;
        setMontoPorCuota(suggestion);
      }
    }
  };

  // Auto-fill test demo data for fast use
  const handleAutoFillDemo = () => {
    setIsProductManual(false);
    setVendedor("LUIS RODRIGUEZ");
    setClientName("NALLELY MARIA LOPEZ GUZMAN");
    setClientCedula("001-1866275-8");
    setPhone("829-879-5652");
    setProductDescription("18000BTU KOOL POINT SEER 18");
    setProductQty(1);
    setTotalAmount(43000);
    setHasItbis(false);
    
    // Type 1 fields
    setInvoiceNumber("49632768");
    setAbonoCuotas(0);
    setTotalPagado(4000);
    setTotalRestante(29000);
    setProximoPagoMonto(4000);
    setProximoPagoFecha("2026-07-10");
    setCuotasPagadas("1/7");
    setCuotasAtrasadas(0);
    
    // Type 3 fields
    setMontoInicial(10000);
    setCantidadCuotas(8);
    setFrecuenciaPago("Mensual");
    setMontoPorCuota(4000);
    setFiadorNombre("RAMÓN LOPEZ");
    setFiadorCedula("001-0817354-2");
    setGarantia("2 años de garantía. La garantía no cubre daño eléctrico y por faltar de mantenimiento.");

    showBannerMessage("⚡ Formulario autocompletado con datos de demostración de los recibos");
  };

  // Clear fields helper
  const handleResetForm = () => {
    setClientName("");
    setClientCedula("");
    setPhone("");
    setProductDescription("");
    setProductQty(1);
    setTotalAmount(0);
    setInvoiceNumber("");
    setAbonoCuotas(0);
    setTotalPagado(0);
    setTotalRestante(0);
    setProximoPagoMonto(0);
    setProximoPagoFecha("");
    setCuotasPagadas("1/7");
    setCuotasAtrasadas(0);
    setMontoInicial(0);
    setCantidadCuotas(8);
    setMontoPorCuota(0);
    setFiadorNombre("");
    setFiadorCedula("");
    showBannerMessage("🧹 Formulario restablecido vacío");
  };

  // Live total calculations
  const subtotalSum = hasItbis ? totalAmount / 1.18 : totalAmount;
  const itbisSum = hasItbis ? totalAmount - subtotalSum : 0;

  // Generate / Save Receipt
  const handleGenerateReceipt = (e: FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      alert("Por favor ingresa un nombre de cliente.");
      return;
    }

    const uniqueId = "REC-" + Date.now().toString().slice(-6);
    const receiptNumber = "2ID-" + Math.floor(100000 + Math.random() * 900000);

    const newRec: CustomReceipt = {
      id: uniqueId,
      type: receiptType,
      receiptNumber: invoiceNumber ? invoiceNumber : receiptNumber,
      date: new Date().toISOString(),
      clientName: clientName.trim(),
      clientCedula: clientCedula.trim(),
      vendedor: vendedor.trim() || "SISTEMA",
      phone: phone.trim(),
      phone2: phone2.trim(),
      rnc: rnc.trim(),
      direccion: direccion.trim(),
      productDescription: productDescription.trim() || "SERVICIOS DE FINANCIAMIENTO",
      productQty: productQty,
      totalAmount: totalAmount,
      hasItbis: hasItbis,
      invoiceNumber: invoiceNumber.trim() || receiptNumber,
      abonoCuotas: abonoCuotas,
      totalPagado: totalPagado,
      totalRestante: totalRestante,
      proximoPagoMonto: proximoPagoMonto,
      proximoPagoFecha: proximoPagoFecha,
      cuotasPagadas: cuotasPagadas,
      cuotasAtrasadas: cuotasAtrasadas,
      montoInicial: montoInicial,
      cantidadCuotas: cantidadCuotas,
      frecuenciaPago: frecuenciaPago,
      montoPorCuota: montoPorCuota,
      fiadorNombre: fiadorNombre.trim(),
      fiadorCedula: fiadorCedula.trim(),
      garantia: garantia
    };

    const updated = [newRec, ...receiptsList];
    saveReceiptsToStorage(updated);
    showBannerMessage(`🎉 ¡Recibo de pago ${newRec.id} generado de manera exitosa!`);
  };

  // Deletion
  const handleDeleteReceipt = (id: string) => {
    if (confirm("¿Estás seguro de eliminar este recibo del historial?")) {
      const updated = receiptsList.filter(r => r.id !== id);
      saveReceiptsToStorage(updated);
      showBannerMessage("🗑️ Recibo eliminado del historial local");
    }
  };

  // WhatsApp Sender
  const handleSendWhatsapp = (rec: CustomReceipt) => {
    let text = "";
    if (rec.type === "cuota") {
      text = 
        `*COPIA - TRANSACCIÓN CELEBRADA* \n` +
        `*${businessConfig.name.toUpperCase()}*\n` +
        `-----------------------------------------\n` +
        `*FECHA:* ${new Date(rec.date).toLocaleString()}\n` +
        `*TEL:* ${rec.phone2}\n` +
        `*RNC:* ${rec.rnc}\n` +
        `*COBRADOR:* ${rec.vendedor}\n` +
        `*CLIENTE:* ${rec.clientName.toUpperCase()}\n` +
        `*CÉDULA:* ${rec.clientCedula || "N/A"}\n` +
        `*ID / FACTURA:* ${rec.invoiceNumber}\n` +
        `-----------------------------------------\n` +
        `*Art/Servicio:* ${rec.productDescription}\n` +
        `*ABONO A CUOTAS:* RD$ ${rec.abonoCuotas.toLocaleString()}\n` +
        `*TOTAL PAGADO:* RD$ ${rec.totalPagado.toLocaleString()}\n` +
        `*TOTAL RESTANTE:* RD$ ${rec.totalRestante.toLocaleString()}\n` +
        `-----------------------------------------\n` +
        `*SU PRÓXIMO PAGO SERÁ DE:* RD$ ${rec.proximoPagoMonto.toLocaleString()}\n` +
        `*PARA LA FECHA:* ${rec.proximoPagoFecha ? new Date(rec.proximoPagoFecha).toLocaleDateString() : "Pautado"}\n` +
        `*CUOTAS PAGADAS:* ${rec.cuotasPagadas}\n` +
        `*CUOTAS ATRASADAS:* ${rec.cuotasAtrasadas}\n\n` +
        `※ _No somos responsables de dinero entregado sin factura._ \n` +
        `¡Gracias por tu fidelidad con nosotros!`;
    } else if (rec.type === "completo") {
      text = 
        `*🧾 RECIBO DE PAGO COMPLETO* \n` +
        `*${businessConfig.name.toUpperCase()}* \n` +
        `*Dirección:* ${rec.direccion}\n` +
        `*TEL:* ${rec.phone2}\n\n` +
        `*CLIENTE:* ${rec.clientName.toUpperCase()}\n` +
        `*CÉDULA:* ${rec.clientCedula || "N/A"}\n` +
        `*VENDEDOR:* ${rec.vendedor}\n` +
        `*FECHA:* ${new Date(rec.date).toLocaleDateString()}\n` +
        `-----------------------------------------\n` +
        `Cant: ${rec.productQty} | ${rec.productDescription}\n` +
        `*SUBTOTAL:* RD$ ${(rec.hasItbis ? rec.totalAmount / 1.18 : rec.totalAmount).toLocaleString("es-DO", {minimumFractionDigits: 2})}\n` +
        `*ITBIS:* RD$ ${(rec.hasItbis ? rec.totalAmount - (rec.totalAmount / 1.18) : 0).toLocaleString("es-DO", {minimumFractionDigits: 2})}\n` +
        `*TOTAL CONTADO PAGADO:* RD$ ${rec.totalAmount.toLocaleString("es-DO", {minimumFractionDigits: 2})}\n` +
        `-----------------------------------------\n` +
        `*GARANTÍA:* ${rec.garantia}\n` +
        `¡Gracias por su compra!`;
    } else {
      text = 
        `*📝 INICIO DE FINANCIAMIENTO* \n` +
        `*${businessConfig.name.toUpperCase()}*\n` +
        `*Servicios Múltiples de Finanzas*\n` +
        `-----------------------------------------\n` +
        `*VENDEDOR:* ${rec.vendedor}\n` +
        `*CLIENTE:* ${rec.clientName.toUpperCase()}\n` +
        `*CÉDULA:* ${rec.clientCedula || "N/A"}\n` +
        `*INICIA DEL ART:* RD$ ${rec.montoInicial.toLocaleString("es-DO", {minimumFractionDigits: 2})}\n` +
        `*CANTIDAD CUOTAS:* ${rec.cantidadCuotas}\n` +
        `*MONTO DE CUOTAS:* RD$ ${rec.montoPorCuota.toLocaleString("es-DO", {minimumFractionDigits: 2})} [${rec.frecuenciaPago}]\n` +
        `-----------------------------------------\n` +
        `*Cant:* ${rec.productQty} | ${rec.productDescription}\n` +
        `*TOTAL GENERAL FINANCIADO:* RD$ ${rec.totalAmount.toLocaleString("es-DO", {minimumFractionDigits: 2})}\n` +
        `-----------------------------------------\n` +
        `*Fiador:* ${rec.fiadorNombre || "N/A"} [${rec.fiadorCedula || "-"}]\n` +
        `*Garantía:* ${rec.garantia}\n\n` +
        `_Gracias por confiar en Nova_`;
    }

    try {
      // Determine filename
      const fileName = `Recibo-${rec.receiptNumber || rec.id}.pdf`;
      const blob = handlePrintPDF(rec, false, false);
      const file = new File([blob], fileName, { type: "application/pdf" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: `Recibo ${rec.receiptNumber || rec.id}`,
          text: `Comparto recibo de ${businessConfig.name}`
        }).then(() => {
          showBannerMessage("💬 Recibo PDF compartido directamente.");
        }).catch((err) => {
          console.error("error sharing pdf, falling back", err);
          triggerFallbackWhatsApp(blob, text, fileName);
        });
      } else {
        triggerFallbackWhatsApp(blob, text, fileName);
      }
    } catch (e) {
      console.error("WhatsApp Share Exception", e);
      // Failover to pure web link
      const targetUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(targetUrl, "_blank");
    }
  };

  const triggerFallbackWhatsApp = (blob: Blob, text: string, fileName: string) => {
    // Force download of the PDF file
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Open WhatsApp
    const targetUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(targetUrl, "_blank");
    showBannerMessage("📥 ¡Recibo PDF descargado automáticamente! Se abrió WhatsApp. Ahora puedes arrastrarlo o adjuntarlo directamente.");
  };

  // jsPDF Exporter
  const handlePrintPDF = (rec: CustomReceipt, isThermal: boolean = false, shouldOpen: boolean = true) => {
    let docHeight = 297; // Letter / A4 default
    let docWidth = 210;
    
    if (isThermal) {
      // Tailor thermal spacing size depending on type
      let thermalHeight = 110;
      if (rec.type === "cuota") thermalHeight = 120;
      if (rec.type === "inicio") thermalHeight = 135;
      if (logo) {
        thermalHeight += 18;
      }
      docWidth = 80;
      docHeight = thermalHeight;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: isThermal ? [80, docHeight] : "a4"
    });

    if (isThermal) {
      // THERMAL 80mm FORMAT DESIGN
      doc.setFont("courier", "bold");
      doc.setFontSize(10);
      let y = 8;

      if (logo) {
        try {
          doc.addImage(logo, "PNG", 32.5, y, 15, 15);
          y += 17;
        } catch (e) {
          console.error("Error drawing thermal logo PDF:", e);
        }
      }
      
      doc.text("COPIA CELEBRADA", 40, y, { align: "center" });
      y += 4;
      doc.setFontSize(8);
      doc.text(businessConfig.name.toUpperCase(), 40, y, { align: "center" });
      
      doc.setFont("courier", "normal");
      doc.setFontSize(7.5);
      y += 3.5;
      doc.text(rec.direccion || "Av. Respaldo los Mártires # 11", 40, y, { align: "center" });
      y += 3.5;
      doc.text(`RNC: ${rec.rnc} | TEL: ${rec.phone2}`, 40, y, { align: "center" });
      y += 3.5;
      doc.text("----------------------------------------", 40, y, { align: "center" });

      y += 4;
      doc.setFont("courier", "bold");
      doc.text(`TIPO RECIBO: ${rec.type === "cuota" ? "ABONO CUOTA" : rec.type === "completo" ? "PAGO TOTAL" : "INICIO FINANCIAMIENTO"}`, 5, y);
      
      doc.setFont("courier", "normal");
      y += 3.5;
      doc.text(`RECIBO ID  : ${rec.receiptNumber}`, 5, y);
      y += 3.5;
      doc.text(`FECHA      : ${new Date(rec.date).toLocaleString("es-DO")}`, 5, y);
      y += 3.5;
      doc.text(`COBRADOR   : ${rec.vendedor}`, 5, y);
      y += 3.5;
      doc.text(`CLIENTE    : ${rec.clientName.toUpperCase()}`, 5, y);
      if (rec.clientCedula) {
        y += 3.5;
        doc.text(`CEDULA/RNC : ${rec.clientCedula}`, 5, y);
      }
      y += 3.5;
      doc.text("----------------------------------------", 40, y, { align: "center" });

      // Core numbers depending on receipt sub-format
      if (rec.type === "cuota") {
        y += 4.5;
        doc.setFont("courier", "bold");
        doc.text(`ARTICULO/SERVIC : ${rec.productDescription}`, 5, y);
        y += 4;
        doc.text(`ABONO CUOTAS    : RD$ ${rec.abonoCuotas?.toLocaleString("es-DO")}`, 5, y);
        y += 4;
        doc.text(`TOTAL PAGADO    : RD$ ${rec.totalPagado?.toLocaleString("es-DO")}`, 5, y);
        y += 4;
        doc.text(`TOTAL RESTANTE  : RD$ ${rec.totalRestante?.toLocaleString("es-DO")}`, 5, y);
        y += 4.5;
        doc.text(`CUOTAS PAGADAS  : ${rec.cuotasPagadas}`, 5, y);
        y += 4;
        doc.text(`ATRASADAS       : ${rec.cuotasAtrasadas}`, 5, y);
        y += 4.5;
        doc.setFont("courier", "normal");
        doc.text(`PROXIMA CUOTA   : RD$ ${rec.proximoPagoMonto?.toLocaleString("es-DO")}`, 5, y);
        y += 4;
        const pDate = rec.proximoPagoFecha ? new Date(rec.proximoPagoFecha).toLocaleDateString("es-DO") : "Pautado";
        doc.text(`PROXIMO PAGO    : ${pDate}`, 5, y);
      } else if (rec.type === "completo") {
        y += 4.5;
        doc.setFont("courier", "bold");
        doc.text(`${rec.productQty}x ${rec.productDescription}`, 5, y);
        y += 4;
        doc.setFont("courier", "normal");
        const sub = rec.hasItbis ? rec.totalAmount / 1.18 : rec.totalAmount;
        doc.text(`SUBTOTAL        : RD$ ${sub.toFixed(2)}`, 5, y);
        y += 4;
        doc.text(`ITBIS           : RD$ ${(rec.totalAmount - sub).toFixed(2)}`, 5, y);
        y += 4.5;
        doc.setFont("courier", "bold");
        doc.text(`TOTAL NETO      : RD$ ${rec.totalAmount.toLocaleString("es-DO")}`, 5, y);
      } else {
        y += 4.5;
        doc.setFont("courier", "bold");
        doc.text(`FINANCIADO DE   : ${rec.productDescription}`, 5, y);
        y += 4;
        doc.text(`INICIA DEL ART. : RD$ ${rec.montoInicial?.toLocaleString("es-DO")}`, 5, y);
        y += 4;
        doc.text(`CANTIDAD CUOTAS : ${rec.cantidadCuotas}`, 5, y);
        y += 4;
        doc.text(`VALOR DE CUOTA  : RD$ ${rec.montoPorCuota?.toLocaleString("es-DO")}`, 5, y);
        y += 4;
        doc.text(`FRECUENCIA      : ${rec.frecuenciaPago.toUpperCase()}`, 5, y);
        y += 4.5;
        doc.text(`TOTAL FINANZAS  : RD$ ${rec.totalAmount?.toLocaleString("es-DO")}`, 5, y);
      }

      y += 5.5;
      doc.setFont("courier", "normal");
      doc.setFontSize(6.5);
      doc.text("No somos responsables de dinero entregado", 40, y, { align: "center" });
      y += 3;
      doc.text("sin factura o recibo oficial firmado.", 40, y, { align: "center" });
      y += 4.5;
      doc.setFont("courier", "bold");
      doc.text("--- GRACIAS POR SU COMPRA ---", 40, y, { align: "center" });
      
    } else {
      // ELEGANT LETTER / CONTRACT FORMAT DESIGN (With custom colors, borders, and logo style)
      // Top header band with gradient styling (drawn programmatically)
      doc.setFillColor(235, 252, 245); // light emerald-tinted teal
      doc.rect(0, 0, 210, 36, "F");

      // App brand color bar
      doc.setFillColor(16, 185, 129); // emerald-500
      doc.rect(0, 36, 210, 2, "F");

      // Logo emulation text / Graphic Logo support
      const hasLogo = !!logo;
      if (hasLogo) {
        try {
          doc.addImage(logo, "PNG", 14, 5, 26, 26);
        } catch (e) {
          console.error("Error drawing letter logo PDF:", e);
        }
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(15, 118, 110); // deep teal
      doc.text(businessConfig.name.toUpperCase(), hasLogo ? 44 : 14, 15);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text("SERVICIOS MÚLTIPLES & SOLUCIONES EN FINANZAS", hasLogo ? 44 : 14, 20);
      doc.text(rec.direccion || "Santiago, República Dominicana", hasLogo ? 44 : 14, 25);
      doc.text(`Teléfonos: ${rec.phone2} | RNC: ${rec.rnc}`, hasLogo ? 44 : 14, 30);

      // Receipt classification tag
      doc.setFillColor(16, 185, 129);
      doc.rect(130, 10, 66, 18, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      const titleLabel = rec.type === "cuota" ? "RECIBO ABONO A CUOTA" : rec.type === "completo" ? "PAGO COMPLETO DE FINANZA" : "INICIO DE FINANCIAMIENTO";
      doc.text(titleLabel, 163, 17, { align: "center" });
      doc.setFontSize(8.5);
      doc.text(`NO. FACTURA: ${rec.invoiceNumber || rec.id}`, 163, 23, { align: "center" });

      // Client info block
      let y = 48;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("DATOS DEL CLIENTE Y REGISTRO", 14, y);
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(14, y + 2, 196, y + 2);

      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Nombre del Cliente:  ${rec.clientName.toUpperCase()}`, 14, y);
      doc.text(`Vendedor / Cobrador: ${rec.vendedor}`, 115, y);
      y += 5;
      doc.text(`Cédula de Identidad: ${rec.clientCedula || "No registrada"}`, 14, y);
      doc.text(`Fecha de Emisión:    ${new Date(rec.date).toLocaleString()}`, 115, y);

      // Let's draw details depending on Type
      y += 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("DESGLOSE HISTÓRICO Y FINANCIERO", 14, y);
      doc.line(14, y + 2, 196, y + 2);

      y += 8;
      if (rec.type === "cuota") {
        // Render Image 1 / Thermal copy style parameters in table structure
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, 182, 54, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(15, 118, 110);
        doc.text(`Artículo de Financiación: ${rec.productDescription}`, 18, y + 6);
        doc.setTextColor(51, 65, 85);
        doc.setFont("helvetica", "normal");
        doc.text(`• Abono realizado a cuotas:`, 18, y + 14);
        doc.setFont("helvetica", "bold");
        doc.text(`RD$ ${rec.abonoCuotas?.toLocaleString("es-DO")}`, 85, y + 14);
        
        doc.setFont("helvetica", "normal");
        doc.text(`• Total pagado acumulado:`, 18, y + 21);
        doc.setFont("helvetica", "bold");
        doc.text(`RD$ ${rec.totalPagado?.toLocaleString("es-DO")}`, 85, y + 21);

        doc.setFont("helvetica", "normal");
        doc.text(`• Total balance restante deudor:`, 18, y + 28);
        doc.setFont("helvetica", "bold");
        doc.text(`RD$ ${rec.totalRestante?.toLocaleString("es-DO")}`, 85, y + 28);

        doc.setFont("helvetica", "normal");
        doc.text(`• Cuotas pagadas progresadas:`, 18, y + 35);
        doc.text(`${rec.cuotasPagadas}`, 85, y + 35);

        doc.setFont("helvetica", "normal");
        doc.text(`• Balance de Cuotas Atrasadas:`, 18, y + 42);
        doc.setTextColor(185, 28, 28); // rose red
        doc.text(`${rec.cuotasAtrasadas} cuotas`, 85, y + 42);
        doc.setTextColor(51, 65, 85);

        y += 58;
        // Next payment info card
        doc.setFillColor(236, 253, 245);
        doc.setDrawColor(167, 243, 208);
        doc.rect(14, y, 182, 14, "FD");
        doc.setFont("helvetica", "bold");
        doc.setTextColor(6, 95, 70);
        const nextDt = rec.proximoPagoFecha ? new Date(rec.proximoPagoFecha).toLocaleDateString("es-DO") : "Acordado";
        doc.text(`SU PRÓXIMO PAGO SERÁ DE RD$ ${rec.proximoPagoMonto?.toLocaleString()} EN FECHA ${nextDt}`, 22, y + 9);
        doc.setTextColor(15, 23, 42);
        y += 20;

      } else if (rec.type === "completo") {
        // Image 3 style form for complete transaction
        // Draw elegant catalog table header
        doc.setFillColor(71, 85, 105); // slate-600
        doc.rect(14, y, 182, 7, "F");
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("PRODUCTO / ARTÍCULO", 18, y + 5);
        doc.text("CANTIDAD", 130, y + 5);
        doc.text("TOTAL NETO", 165, y + 5);

        y += 7;
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, 182, 15, "F");
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(rec.productDescription, 18, y + 9);
        doc.text(rec.productQty.toString(), 130, y + 9);
        doc.text(`RD$ ${rec.totalAmount.toLocaleString("es-DO")}`, 165, y + 9);

        // Subtotals block
        y += 18;
        doc.setFont("helvetica", "normal");
        doc.text("Subtotal:", 135, y);
        const sub = rec.hasItbis ? rec.totalAmount / 1.18 : rec.totalAmount;
        doc.text(`RD$ ${sub.toLocaleString("es-DO", {minimumFractionDigits: 2})}`, 165, y);
        y += 5;
        doc.text("ITBIS (18%):", 135, y);
        doc.text(`RD$ ${(rec.totalAmount - sub).toLocaleString("es-DO", {minimumFractionDigits: 2})}`, 165, y);
        y += 6;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 118, 110);
        doc.text("TOTAL PAGADO:", 135, y);
        doc.text(`RD$ ${rec.totalAmount.toLocaleString("es-DO", {minimumFractionDigits: 2})}`, 165, y);
        doc.setTextColor(15, 23, 42);
        y += 12;

      } else {
        // Image 2 style form for initiation of finances
        doc.setFillColor(241, 245, 249);
        doc.rect(14, y, 182, 10, "F");
        doc.setFont("helvetica", "bold");
        doc.text("INICIA DEL ART.", 18, y + 6);
        doc.text("CANTIDAD DE CUOTAS", 70, y + 6);
        doc.text("FRECUENCIA", 125, y + 6);
        doc.text("MONTO DE CUOTAS", 155, y + 6);

        y += 10;
        doc.setFont("helvetica", "normal");
        doc.text(`RD$ ${rec.montoInicial?.toLocaleString("es-DO")}`, 18, y + 7);
        doc.text(`${rec.cantidadCuotas} cuotas`, 70, y + 7);
        doc.text(rec.frecuenciaPago.toUpperCase(), 125, y + 7);
        doc.setFont("helvetica", "bold");
        doc.text(`RD$ ${rec.montoPorCuota?.toLocaleString("es-DO")}`, 155, y + 7);

        y += 15;
        doc.setFillColor(71, 85, 105); // slate-600
        doc.rect(14, y, 182, 7, "F");
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("CANTIDAD", 18, y + 5);
        doc.text("DESCRIPCIÓN DEL ARTÍCULO ADQUIRIDO", 50, y + 5);
        doc.text("TOTAL A FINANCIAR", 150, y + 5);

        y += 7;
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, 182, 14, "F");
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(rec.productQty.toString(), 18, y + 8);
        doc.text(rec.productDescription, 50, y + 8);
        doc.setFont("helvetica", "bold");
        doc.text(`RD$ ${rec.totalAmount.toLocaleString("es-DO")}`, 150, y + 8);

        // Fiador solidario info
        if (rec.fiadorNombre) {
          y += 22;
          doc.setFillColor(254, 242, 242);
          doc.rect(14, y, 182, 12, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(153, 27, 27);
          doc.text(`FIADOR SOLIDARIO RESPONSABLE: ${rec.fiadorNombre.toUpperCase()} | CED: ${rec.fiadorCedula || "No registrada"}`, 18, y + 7);
          doc.setTextColor(15, 23, 42);
        }
        y += 20;
      }

      // Warranties / Warranty Policies
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("POLÍTICAS, REGLAMENTO Y GARANTÍA CELEBRADA", 14, y);
      doc.line(14, y + 1.5, 196, y + 1.5);
      y += 6;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(rec.garantia, 14, y, { maxWidth: 182 });
      y += 10;
      doc.text("No somos responsables de dinero entregado sin recibo de pago oficial registrado en la base de datos.", 14, y);

      // Signatures blocks
      y += 28;
      doc.setDrawColor(148, 163, 184); // slate-400
      
      // Line left
      doc.line(14, y, 64, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("Firma Fiador Solidario", 39, y + 4, { align: "center" });

      // Line center
      doc.line(80, y, 130, y);
      doc.text("Firma del Cliente", 105, y + 4, { align: "center" });

      // Line right
      doc.line(146, y, 196, y);
      doc.text("Firmas Auten. Administrada", 171, y + 4, { align: "center" });
    }

    // Stream PDF or trigger system download print
    const blob = doc.output("blob");
    if (shouldOpen) {
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
      showBannerMessage(`📄 Recibo PDF generado con éxito en formato ${isThermal ? "Térmico (80mm)" : "A4/Carta"}`);
    }
    return blob;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* SUCCESS FLOATING ALERT */}
      {successMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white p-4.5 rounded-2xl border border-slate-700 shadow-2xl flex items-center gap-3 animate-fade-in max-w-sm">
          <div className="p-2 bg-emerald-500 text-slate-900 rounded-lg">
            <Check className="h-4 w-4 stroke-[3]" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">Notificación Nova</h4>
            <p className="text-xs text-slate-300 font-medium leading-tight mt-0.5">{successMsg}</p>
          </div>
        </div>
      )}

      {/* METADATA SUMMARY & BRAND ROW */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-sm shadow-emerald-250">
            <Receipt className="h-6 w-6 stroke-[2]" />
          </div>
          <div>
            <span className="text-[9px] font-extrabold text-emerald-600 block uppercase tracking-wider">MÓDULO DE EMISIÓN DE CARTERAS</span>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Gestión y Emisión de Recibos de Pago</h1>
            <p className="text-xs text-slate-500 font-medium">Genera recibos de abono de cuotas, contratos completos e inicio de financiamiento.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAutoFillDemo}
            className="px-3.5 py-2 text-xs font-bold text-emerald-850 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 rounded-xl transition duration-150 cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Autollenar Demo
          </button>
          
          <button
            onClick={handleResetForm}
            className="px-3.5 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-xl transition duration-150 cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Limpiar Todo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: CREATOR WIZARD FORM (7 Columns) */}
        <form onSubmit={handleGenerateReceipt} className="xl:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          
          {/* TAB SELECTION */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Seleccionar Tipo de Recibo que deseas Generar</label>
            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => setReceiptType("cuota")}
                className={`py-2 px-1 text-[11px] font-black uppercase tracking-tight rounded-xl transition duration-150 cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 text-center select-none ${
                  receiptType === "cuota"
                    ? "bg-white text-slate-900 border border-slate-250 shadow-xs scale-102"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                Abono/Cuota ⏳
              </button>
              
              <button
                type="button"
                onClick={() => setReceiptType("completo")}
                className={`py-2 px-1 text-[11px] font-black uppercase tracking-tight rounded-xl transition duration-150 cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 text-center select-none ${
                  receiptType === "completo"
                    ? "bg-white text-slate-900 border border-slate-250 shadow-xs scale-102"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Pago Completo 🧾
              </button>
              
              <button
                type="button"
                onClick={() => setReceiptType("inicio")}
                className={`py-2 px-1 text-[11px] font-black uppercase tracking-tight rounded-xl transition duration-150 cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 text-center select-none ${
                  receiptType === "inicio"
                    ? "bg-white text-slate-900 border border-slate-250 shadow-xs scale-102"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Briefcase className="h-3.5 w-3.5" />
                Inicio Finanza 📝
              </button>
            </div>
          </div>

          {/* LOGO DE PERFIL / LOGOTIPO DE LA FINANCIERA */}
          <div className="flex items-center gap-4 bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <label className="relative flex items-center justify-center w-14 h-14 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-white cursor-pointer overflow-hidden transition group shrink-0 shadow-sm">
              {logo ? (
                <img src={logo} referrerPolicy="no-referrer" alt="Logotipo" className="w-[90%] h-[90%] object-contain" />
              ) : (
                <Camera className="h-5 w-5 text-slate-400 group-hover:text-emerald-500" />
              )}
              <input
                id="receipts-logo-upload"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const base64Str = event.target?.result as string;
                      handleLogoChange(base64Str);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden"
              />
            </label>
            <div className="flex-1">
              <span className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-0.5">Logo o Foto del Recibo de Pago Nova</span>
              <span className="text-[10px] text-slate-500 block font-normal leading-relaxed">
                Haz clic en el recuadro para subir el logotipo o foto de perfil de tu empresa. Se guardará de forma permanente y saldrá en el encabezado de los recibos impresos.
              </span>
              {logo && (
                <button
                  type="button"
                  onClick={() => handleLogoChange("")}
                  className="text-[9px] font-bold text-rose-600 hover:underline mt-1 block cursor-pointer"
                >
                  ✕ Eliminar Logotipo
                </button>
              )}
            </div>
          </div>

          {/* BASIC INFORMATION SECTION */}
          <div className="border border-slate-200/80 rounded-2xl p-5 bg-slate-50/40 space-y-4 shadow-2xs">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide border-b border-slate-150 pb-2.5 flex items-center gap-1.5 font-sans">
              <User className="h-4 w-4 text-emerald-600" />
              1. Datos del Cliente de la Financiera
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-black text-emerald-700 uppercase tracking-wider mb-0.5">Mis Clientes Registrados</label>
                <p className="text-[10px] text-slate-400 mb-1">Si el cliente ya existe, selecciónalo para llenar sus datos de inmediato:</p>
                <select
                  onChange={(e) => handleSelectClient(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                >
                  <option value="">-- Manual (No registrar / Escribir abajo) --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.phone !== "N/A" ? `(${c.phone})` : ""}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-0.5">Nombre Completo del Cliente *</label>
                <p className="text-[10px] text-slate-400 mb-1">Escribe el nombre del cliente que aparecerá en el recibo impreso:</p>
                <input
                  type="text"
                  required
                  placeholder="Ej: NALLELY MARIA LOPEZ GUZMAN"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-extrabold shadow-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-0.5">No. Cédula del Cliente</label>
                <p className="text-[10px] text-slate-400 mb-1">Identificación oficial para efectos del financiamiento:</p>
                <input
                  type="text"
                  placeholder="Ej: 001-1866275-8"
                  value={clientCedula}
                  onChange={(e) => setClientCedula(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-0.5">Teléfono de Contacto</label>
                <p className="text-[10px] text-slate-400 mb-1">Para enviar recordatorios y notificaciones de cobranza:</p>
                <input
                  type="text"
                  placeholder="Ej: 829-879-5652"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-0.5">Vendedor / Cobrador</label>
                <p className="text-[10px] text-slate-400 mb-1">Agente responsable de recaudar o efectuar este cobro:</p>
                <input
                  type="text"
                  placeholder="Ej: LUIS RODRIGUEZ"
                  value={vendedor}
                  onChange={(e) => setVendedor(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-905 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-black"
                />
              </div>
            </div>
          </div>

          {/* PRODUCT SELECTION SECTION */}
          <div className="border border-slate-200/80 rounded-2xl p-5 bg-slate-50/40 space-y-4 shadow-2xs">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide border-b border-slate-150 pb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-cyan-600" />
                2. Producto / Artículo del Recibo
              </span>
              <span className="bg-cyan-50 text-cyan-700 text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">Origen del Artículo</span>
            </h3>

            {/* SELECTION ORIGIN TOGGER */}
            <div className="grid grid-cols-2 gap-2 bg-slate-200/60 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setIsProductManual(false)}
                className={`py-1.5 text-[11px] font-bold rounded-lg transition-all text-center cursor-pointer ${
                  !isProductManual
                    ? "bg-white text-slate-950 shadow-xs border border-slate-250"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                📦 Usar de Inventario
              </button>
              <button
                type="button"
                onClick={() => setIsProductManual(true)}
                className={`py-1.5 text-[11px] font-bold rounded-lg transition-all text-center cursor-pointer ${
                  isProductManual
                    ? "bg-white text-slate-950 shadow-xs border border-slate-250"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                ✏️ Escribir Producto Nuevo
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {!isProductManual ? (
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-cyan-850 uppercase tracking-wider mb-0.5">Listado de Inventario Registrado</label>
                  <p className="text-[10px] text-slate-400 mb-1">Selecciona uno de los productos que ya diste de alta en la sección de inventariado:</p>
                  <select
                    onChange={(e) => handleSelectProduct(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-extrabold"
                  >
                    <option value="">-- Seleccionar producto de la lista --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Precio: RD$ {p.price.toLocaleString()})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="md:col-span-2">
                  <div className="bg-yellow-50/50 border border-yellow-200/50 rounded-xl p-2.5 text-[10px] text-amber-900 font-medium mb-2.5">
                    💡 <strong>Registro rápido libre:</strong> No necesitas registrarlo antes en el inventario. Escribe abajo los datos y se aplicará directamente a este recibo financiado.
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-750 uppercase tracking-wider mb-0.5">Nombre / Descripción del Artículo *</label>
                <p className="text-[10px] text-slate-400 mb-1">Nombre o modelo del equipo o servicio que ampara el recibo:</p>
                <input
                  type="text"
                  required
                  placeholder="Ej: Aire Acondicionado 12000BTU"
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-extrabold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-750 uppercase tracking-wider mb-0.5">Precio de Venta del Artículo (RD$) *</label>
                <p className="text-[10px] text-slate-400 mb-1">Valor o precio acordado por el cual se hizo el negocio:</p>
                <input
                  type="number"
                  required
                  placeholder="Valor del producto"
                  value={totalAmount || ""}
                  onChange={(e) => {
                    const priceVal = Math.max(0, Number(e.target.value));
                    setTotalAmount(priceVal);
                    
                    // Auto-calculate logic or assist if type 3
                    if (receiptType === "inicio") {
                      const remaining = priceVal - montoInicial;
                      const suggestion = remaining > 0 ? Math.round(remaining / cantidadCuotas) : 0;
                      setMontoPorCuota(suggestion);
                    }
                  }}
                  className="w-full text-xs bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-905 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-black text-cyan-800"
                />
              </div>
            </div>
          </div>

          {/* DYNAMIC SECONDARY BLOCK DEPENDING ON REC TYPE */}
          {receiptType === "cuota" && (
            <div className="border border-blue-200 rounded-2xl p-5 bg-blue-50/20 space-y-4 shadow-sm animate-fade-in">
              <h3 className="text-xs font-black text-blue-900 uppercase tracking-wide border-b border-blue-150 pb-2.5 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-blue-600 animate-pulse" />
                3. Transacción y Control de Deuda (Abono de Cuotas)
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed italic mt-0.5">
                Usa esta sección cuando el cliente esté pagando una cuota de su deuda. Permite actualizar cuánto dinero entregó hoy y calcular la deuda restante automáticamente.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-0.5">No. de Factura / ID Contrato *</label>
                  <p className="text-[10px] text-slate-400 mb-1">Para identificar a qué venta o acuerdo pertenece este abono:</p>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 49632768"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-emerald-800 uppercase tracking-wider mb-0.5">💵 Abono Realizado en esta Transacción *</label>
                  <p className="text-[10px] text-slate-400 mb-1">El monto exacto en efectivo que el cliente te entrega hoy:</p>
                  <input
                    type="number"
                    required
                    placeholder="Abonado hoy"
                    value={abonoCuotas || ""}
                    onChange={(e) => setAbonoCuotas(Number(e.target.value))}
                    className="w-full text-xs bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-extrabold text-emerald-700 bg-emerald-50/30"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-0.5">Deuda Restante del Cliente (RD$)</label>
                  <p className="text-[10px] text-slate-400 mb-1">Cuánto dinero le queda debiendo el cliente a la financiera después de este pago:</p>
                  <input
                    type="number"
                    placeholder="Monto restante restante"
                    value={totalRestante || ""}
                    onChange={(e) => setTotalRestante(Number(e.target.value))}
                    className="w-full text-xs bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 font-black text-rose-700 bg-rose-50/10"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-0.5">Total Pagado Acumulado a la fecha</label>
                  <p className="text-[10px] text-slate-400 mb-1">Suma total acumulada de abonos (incluyendo el de hoy):</p>
                  <input
                    type="number"
                    placeholder="Acumulado"
                    value={totalPagado || ""}
                    onChange={(e) => setTotalPagado(Number(e.target.value))}
                    className="w-full text-xs bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-0.5">Monto de la Próxima Cuota (RD$)</label>
                  <p className="text-[10px] text-slate-400 mb-1">Cuota pactada para el siguiente mes o periodo:</p>
                  <input
                    type="number"
                    placeholder="Ej: 4000"
                    value={proximoPagoMonto || ""}
                    onChange={(e) => setProximoPagoMonto(Number(e.target.value))}
                    className="w-full text-xs bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-0.5">Fecha de Próximo Vencimiento</label>
                  <p className="text-[10px] text-slate-400 mb-1">Cuándo debe volver a pagar el cliente su cuota:</p>
                  <input
                    type="date"
                    value={proximoPagoFecha}
                    onChange={(e) => setProximoPagoFecha(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-0.5">Progresión de Cuotas Pagadas</label>
                  <p className="text-[10px] text-slate-400 mb-1">Escribe la progresión de sus cuotas actuales:</p>
                  <input
                    type="text"
                    placeholder="Ej: 3 de 8, o 1/7"
                    value={cuotasPagadas}
                    onChange={(e) => setCuotasPagadas(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-rose-800 uppercase tracking-wider mb-0.5">Cuotas en Mora o Atrasadas</label>
                  <p className="text-[10px] text-slate-400 mb-1">¿Cuántos periodos de atraso tiene el cliente hoy?:</p>
                  <input
                    type="number"
                    placeholder="0"
                    value={cuotasAtrasadas}
                    onChange={(e) => setCuotasAtrasadas(Number(e.target.value))}
                    className="w-full text-xs bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 font-extrabold text-rose-700 bg-rose-50/10"
                  />
                </div>
              </div>
            </div>
          )}

          {receiptType === "completo" && (
            <div className="border border-emerald-250 rounded-2xl p-5 bg-emerald-50/20 space-y-4 shadow-sm animate-fade-in">
              <h3 className="text-xs font-black text-emerald-900 uppercase tracking-wide border-b border-emerald-150 pb-2.5 flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                3. Detalle de Cobro por Pago Único Completo (Contado)
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed italic mt-0.5">
                Utiliza esta sección si el cliente realiza una compra directa al contado complete el pago hoy del artículo.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-black text-emerald-900 uppercase tracking-wider mb-0.5">Monto Total Recibido (RD$)</label>
                  <p className="text-[10px] text-slate-400 mb-1">Monto de contado recibido hoy día. Se sincroniza con el precio de arriba:</p>
                  <input
                    type="number"
                    required
                    placeholder="Monto de cobro"
                    value={totalAmount || ""}
                    onChange={(e) => setTotalAmount(Number(e.target.value))}
                    className="w-full text-xs bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-905 focus:outline-none focus:ring-2 focus:ring-emerald-550 font-black text-emerald-800 text-sm bg-emerald-50/20"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-705 uppercase tracking-wider mb-0.5">Cantidad Comprada</label>
                  <p className="text-[10px] text-slate-400 mb-1">Número de unidades despachadas de este producto:</p>
                  <input
                    type="number"
                    min="1"
                    value={productQty}
                    onChange={(e) => setProductQty(Math.max(1, Number(e.target.value)))}
                    className="w-full text-xs bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-550 font-bold"
                  />
                </div>

                <div className="flex items-center gap-2 py-4 pl-1 md:col-span-2">
                  <input
                    id="checkbox-has-itbis-comp"
                    type="checkbox"
                    checked={hasItbis}
                    onChange={(e) => setHasItbis(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-350 bg-white text-emerald-600 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="checkbox-has-itbis-comp" className="text-xs text-slate-750 font-bold select-none cursor-pointer">
                    Monto incluye ITBIS dominicano (18% deducible legal)
                  </label>
                </div>
              </div>
            </div>
          )}

          {receiptType === "inicio" && (
            <div className="border border-purple-250 rounded-2xl p-5 bg-purple-50/20 space-y-4 shadow-sm animate-fade-in">
              <h3 className="text-xs font-black text-purple-900 uppercase tracking-wide border-b border-purple-150 pb-2.5 flex items-center gap-1.5">
                <FileCheck className="h-4 w-4 text-purple-650" />
                3. Parámetros de Acuerdo del Nuevo Financiamiento
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed italic mt-0.5">
                Sección inicial cuando registras por primera vez el financiamiento del artículo al cliente, configurando enganche y cuotas.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-0.5">Monto del Inicial o Enganche (RD$)</label>
                  <p className="text-[10px] text-slate-400 mb-1">Pago o depósito que el cliente entregó de entrada para llevarse el artículo:</p>
                  <input
                    type="number"
                    placeholder="Ej: 10000"
                    value={montoInicial || ""}
                    onChange={(e) => {
                      const dep = Number(e.target.value);
                      setMontoInicial(dep);
                      // Auto calculate suggestion for installment value
                      const remaining = totalAmount - dep;
                      const suggestion = remaining > 0 ? Math.round(remaining / cantidadCuotas) : 0;
                      setMontoPorCuota(suggestion);
                    }}
                    className="w-full text-xs bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-extrabold text-purple-700 bg-purple-50/10"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-0.5">Plazo Pactado (Cantidad de Cuotas)</label>
                  <p className="text-[10px] text-slate-400 mb-1">Periodos totales en los que se segmentará el saldo pendiente:</p>
                  <input
                    type="number"
                    placeholder="Ej: 8"
                    value={cantidadCuotas || ""}
                    onChange={(e) => {
                      const installments = Math.max(1, Number(e.target.value));
                      setCantidadCuotas(installments);
                      // Auto calculate suggestion for installment value
                      const remaining = totalAmount - montoInicial;
                      const suggestion = remaining > 0 ? Math.round(remaining / installments) : 0;
                      setMontoPorCuota(suggestion);
                    }}
                    className="w-full text-xs bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-0.5">Frecuencia de Amortización / Cobro</label>
                  <p className="text-[10px] text-slate-400 mb-1">Cada cuánto tiempo el cliente tiene que abonar su cuota:</p>
                  <select
                    value={frecuenciaPago}
                    onChange={(e) => setFrecuenciaPago(e.target.value as any)}
                    className="w-full text-xs bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-extrabold"
                  >
                    <option value="Semanal">Semanalmente (Semanal) 🗓️</option>
                    <option value="Mensual">Mensualmente (Mensual) 📅</option>
                    <option value="Anual">Anualmente (Anual) 💎</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-purple-900 uppercase tracking-wider mb-0.5">Monto de cada Cuota (RD$)</label>
                  <p className="text-[10px] text-slate-400 mb-1">Importe que debe saldar en cada periodo. [Se auto-calcula o puedes forzarlo]:</p>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="Ej: 4000"
                      value={montoPorCuota || ""}
                      onChange={(e) => setMontoPorCuota(Number(e.target.value))}
                      className="w-full text-xs bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-950 focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold pr-16"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const remaining = totalAmount - montoInicial;
                        const suggestion = remaining > 0 ? Math.round(remaining / cantidadCuotas) : 0;
                        setMontoPorCuota(suggestion);
                        showBannerMessage("📐 Cuotas auto-calculadas con éxito");
                      }}
                      className="absolute right-1 top-1 text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold py-1 px-2 rounded-lg cursor-pointer"
                    >
                      Calcular
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-0.5">Términos de Póliza, Garantía y Contrato</label>
                  <p className="text-[10px] text-slate-400 mb-1">Políticas de reclamos que se imprimirán al pie del recibo:</p>
                  <input
                    type="text"
                    value={garantia}
                    onChange={(e) => setGarantia(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  />
                </div>

                <div className="md:col-span-2 border-t border-slate-200/60 pt-3 mt-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-0.5">Nombre del Fiador Solidario</label>
                    <p className="text-[10px] text-slate-400 mb-1">Persona responsable si el deudor principal no efectúa el pago:</p>
                    <input
                      type="text"
                      placeholder="Garante Solidario (Opcional)"
                      value={fiadorNombre}
                      onChange={(e) => setFiadorNombre(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-0.5">No. Cédula del Fiador Solidario</label>
                    <p className="text-[10px] text-slate-400 mb-1">Identificación del garante oficial:</p>
                    <input
                      type="text"
                      placeholder="Identificación (Opcional)"
                      value={fiadorCedula}
                      onChange={(e) => setFiadorCedula(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SYSTEM EMISSION LOGS ACTION BUTTONS */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-black text-xs transition duration-150 shadow-md flex items-center justify-center gap-2 uppercase tracking-widest cursor-pointer select-none"
            >
              <Receipt className="h-4.5 w-4.5 stroke-[2.5]" />
              Registrar y Generar Recibo de Pago Nova
            </button>
          </div>

        </form>

        {/* RIGHT COLUMN: REALTIME INTERACTIVE TICKET & PREVIEWS (5 Columns) */}
        <div className="xl:col-span-5 space-y-5">
          <div className="bg-slate-900 rounded-3xl p-5 text-white border border-slate-800 shadow-2xl relative overflow-hidden">
            
            {/* Background design accents */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <span className="text-[9px] font-black text-emerald-400 tracking-wider bg-emerald-950/60 p-1 px-2.5 rounded-lg uppercase">Previsualización del Recibo</span>
              <span className="text-[9px] text-slate-400 font-sans font-medium">Modo: {receiptType.toUpperCase()}</span>
            </div>

            {/* LIVE TICKET SIMULATOR WITH COMPONENT */}
            <div className="bg-white text-slate-850 p-5 rounded-2xl shadow-inner font-mono max-h-[480px] overflow-y-auto space-y-4 text-[11px] border border-slate-200">
              
              <div className="text-center font-bold flex flex-col items-center justify-center">
                <span className="text-rose-650 text-[14px] font-extrabold tracking-widest block mb-1">COPIA</span>
                {logo && (
                  <img src={logo} referrerPolicy="no-referrer" alt="Logo de Perfil" className="h-10 w-auto object-contain my-1.5 p-0.5 border border-slate-200 rounded-lg bg-white" />
                )}
                <span className="text-[12px] block font-black text-slate-900 uppercase">{businessConfig.name}</span>
                <span className="text-[9px] font-normal leading-tight text-slate-500 block">SERVICIOS DE FINANCIACIÓN CELEBRADA COMPLETA</span>
                <span className="text-[9px] font-normal text-slate-500 block">{direccion}</span>
                <span className="text-[8.5px] font-normal text-slate-500 block">RNC: {rnc} | TEL: {phone2}</span>
                <span className="block mt-1 w-full text-center">=================================</span>
              </div>

              {/* CORE VALUES */}
              <div className="space-y-1 font-mono text-[10.5px]">
                <div><span className="font-extrabold text-slate-500">FECHA:</span> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], {hour: "2-digit", minute:"2-digit"})}</div>
                <div><span className="font-extrabold text-slate-500">TELÉFONO 2:</span> {phone2}</div>
                <div><span className="font-extrabold text-slate-500">COBRADOR:</span> <span className="font-extrabold text-slate-800">{vendedor || "Luis"}</span></div>
                <div><span className="font-extrabold text-slate-500">CLIENTE:</span> <span className="font-extrabold text-slate-900">{clientName.toUpperCase() || "CLIENTE DEMO"}</span></div>
                {clientCedula && <div><span className="font-extrabold text-slate-500">CÉDULA:</span> {clientCedula}</div>}
                <div><span className="font-extrabold text-slate-500">NO. FACTURA:</span> <span className="font-mono text-emerald-700 font-bold">{invoiceNumber || "2ID-49632768"}</span></div>
                <div className="text-center">=================================</div>
              </div>

              {/* PRODUCT INFO BLOCK */}
              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between font-extrabold">
                  <span>DESCRIPCIÓN / ARTÍCUL</span>
                  <span>PRECIO</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>{productQty}x {productDescription || "VALOR SERVICIO DE FINANCIAS"}</span>
                  <span>RD${totalAmount.toLocaleString()}</span>
                </div>
                <div className="text-center">=================================</div>
              </div>

              {/* SPECIFIC TICKET PRINTS BY ACTIONS */}
              {receiptType === "cuota" && (
                <div className="space-y-1 text-slate-800">
                  <div className="flex justify-between"><span className="font-extrabold">*ABONO A CUOTAS:*</span> <span className="font-black">RD$ {abonoCuotas.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="font-extrabold">*TOTAL PAGADO:*</span> <span className="font-black">RD$ {totalPagado.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="font-extrabold">*TOTAL RESTANTE:*</span> <span className="font-black text-rose-650">RD$ {totalRestante.toLocaleString()}</span></div>
                  <div className="mt-2 text-[9.5px] font-sans bg-slate-50 p-2 border border-slate-150 rounded text-slate-600 space-y-0.5 font-bold">
                    <p className="text-emerald-700 uppercase font-black text-[9px]">Próximo Vencimiento Pactado:</p>
                    <p>Monto Próxima Cuota: RD$ {proximoPagoMonto.toLocaleString()}</p>
                    <p>Fecha de Pago: {proximoPagoFecha ? new Date(proximoPagoFecha).toLocaleDateString() : "Pautado"}</p>
                    <p>Cuotas Avanzadas: {cuotasPagadas}</p>
                    <p className={cuotasAtrasadas > 0 ? "text-rose-600 font-black animate-pulse" : ""}>Cuotas en Mora/Atrasadas: {cuotasAtrasadas}</p>
                  </div>
                </div>
              )}

              {receiptType === "completo" && (
                <div className="space-y-1 text-slate-800">
                  <div className="flex justify-between"><span>Subtotal Dedujido:</span> <span>RD$ {subtotalSum.toLocaleString("es-DO", {maximumFractionDigits: 2})}</span></div>
                  <div className="flex justify-between"><span>ITBIS Deducible (18%):</span> <span>RD$ {itbisSum.toLocaleString("es-DO", {maximumFractionDigits: 2})}</span></div>
                  <div className="flex justify-between font-black text-slate-900 border-t border-dashed border-slate-200 pt-1">
                    <span>*TOTAL PAGADO CONTADO:*</span>
                    <span>RD$ {totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {receiptType === "inicio" && (
                <div className="space-y-1 text-slate-800">
                  <div className="flex justify-between font-bold text-sky-700"><span>*INICIA DEL ART:*</span> <span>RD$ {montoInicial.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>*VALOR DE CUOTAS:*</span> <span>RD$ {montoPorCuota.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>*CANTIDAD CUOTAS:*</span> <span className="font-black">{cantidadCuotas} cuotas</span></div>
                  <div className="flex justify-between"><span>*FRECUENCIA:*</span> <span className="font-black text-purple-700">{frecuenciaPago.toUpperCase()}</span></div>
                  <div className="flex justify-between font-black border-t border-dashed border-slate-200 pt-1">
                    <span>*TOTAL DE DEUDA:*</span>
                    <span>RD$ {totalAmount.toLocaleString()}</span>
                  </div>
                  {fiadorNombre && (
                    <div className="bg-slate-50 p-1.5 border border-slate-200 rounded mt-2 text-[9px] font-bold">
                      <p className="text-rose-750">Responsabilidad Fiador Solidario:</p>
                      <p>{fiadorNombre} [ID: {fiadorCedula || "S/R"}]</p>
                    </div>
                  )}
                </div>
              )}

              <div className="text-center pt-2">
                <p className="text-[8px] leading-tight text-slate-500 block italic">No somos responsables de dinero entregado sin factura oficial emitida por el sistema con firma autorizada.</p>
                <span className="block my-1">=================================</span>
                <p className="text-[8px] font-black text-slate-700 block uppercase">Administrado por Nova Facturación</p>
              </div>

            </div>

            {/* INSTANT EXPORT BUTTONS FOR THE WIZARD PREVIEW */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  if (!clientName.trim()) {
                    alert("Favor ingresar datos del cliente antes de descargar");
                    return;
                  }
                  const recTemp: CustomReceipt = {
                    id: "REC-TEMP",
                    type: receiptType,
                    receiptNumber: invoiceNumber ? invoiceNumber : "2ID-49632768",
                    date: new Date().toISOString(),
                    clientName,
                    clientCedula,
                    vendedor,
                    phone,
                    phone2,
                    rnc,
                    direccion,
                    productDescription,
                    productQty,
                    totalAmount,
                    hasItbis,
                    invoiceNumber,
                    abonoCuotas,
                    totalPagado,
                    totalRestante,
                    proximoPagoMonto,
                    proximoPagoFecha,
                    cuotasPagadas,
                    cuotasAtrasadas,
                    montoInicial,
                    cantidadCuotas,
                    frecuenciaPago,
                    montoPorCuota,
                    fiadorNombre,
                    fiadorCedula,
                    garantia
                  };
                  handlePrintPDF(recTemp, false);
                }}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer select-none"
              >
                <Printer className="h-4 w-4" />
                Papel Carta (A4)
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!clientName.trim()) {
                    alert("Favor ingresar datos del cliente antes de descargar");
                    return;
                  }
                  const recTemp: CustomReceipt = {
                    id: "REC-TEMP",
                    type: receiptType,
                    receiptNumber: invoiceNumber ? invoiceNumber : "2ID-49632768",
                    date: new Date().toISOString(),
                    clientName,
                    clientCedula,
                    vendedor,
                    phone,
                    phone2,
                    rnc,
                    direccion,
                    productDescription,
                    productQty,
                    totalAmount,
                    hasItbis,
                    invoiceNumber,
                    abonoCuotas,
                    totalPagado,
                    totalRestante,
                    proximoPagoMonto,
                    proximoPagoFecha,
                    cuotasPagadas,
                    cuotasAtrasadas,
                    montoInicial,
                    cantidadCuotas,
                    frecuenciaPago,
                    montoPorCuota,
                    fiadorNombre,
                    fiadorCedula,
                    garantia
                  };
                  handlePrintPDF(recTemp, true);
                }}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer select-none"
              >
                <Printer className="h-4 w-4" />
                Térmico 80mm
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!clientName.trim()) {
                    alert("Favor ingresar datos del cliente antes de compartir");
                    return;
                  }
                  const recTemp: CustomReceipt = {
                    id: "REC-TEMP",
                    type: receiptType,
                    receiptNumber: invoiceNumber ? invoiceNumber : "2ID-49632768",
                    date: new Date().toISOString(),
                    clientName,
                    clientCedula,
                    vendedor,
                    phone,
                    phone2,
                    rnc,
                    direccion,
                    productDescription,
                    productQty,
                    totalAmount,
                    hasItbis,
                    invoiceNumber,
                    abonoCuotas,
                    totalPagado,
                    totalRestante,
                    proximoPagoMonto,
                    proximoPagoFecha,
                    cuotasPagadas,
                    cuotasAtrasadas,
                    montoInicial,
                    cantidadCuotas,
                    frecuenciaPago,
                    montoPorCuota,
                    fiadorNombre,
                    fiadorCedula,
                    garantia
                  };
                  handleSendWhatsapp(recTemp);
                }}
                className="col-span-2 py-2.5 bg-[#25D366] hover:bg-[#20ba56] text-slate-900 font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer select-none"
              >
                <Send className="h-4 w-4 stroke-[2.5]" />
                Compartir por WhatsApp Directo
              </button>
            </div>
            
          </div>
        </div>

      </div>

      {/* LOWER SECTION: PERSISTENT HISTORICAL REGISTER */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-600" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Historial de Recibos Emitidos ({receiptsList.length})</h2>
          </div>

          {/* SEARCH BAR */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, id o art..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700"
            />
          </div>
        </div>

        {/* LIST RENDER */}
        {receiptsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Receipt className="h-10 w-10 text-slate-300 stroke-[1.5]" />
            <p className="text-xs font-bold uppercase mt-2">Aún no hay recibos guardados</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">Completa el formulario y genera tu primer recibo para persistirlo en el historial de sesiones.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="p-3">Ref/Nº Factura</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Cobrador/Vend.</th>
                  <th className="p-3">Artículo/Descripción</th>
                  <th className="p-3">Monto General</th>
                  <th className="p-3">Fecha Emisión</th>
                  <th className="p-3 text-center">Formato Imprimir / Enviar</th>
                  <th className="p-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-[11px] text-slate-700">
                {receiptsList
                  .filter(r => 
                    r.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    r.productDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    r.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/50 transition">
                      
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {rec.id} <span className="block text-[9px] text-slate-400 font-normal">Fact: {rec.receiptNumber}</span>
                      </td>

                      <td className="p-3">
                        {rec.type === "cuota" && (
                          <span className="p-1 px-2.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[9px] font-black uppercase tracking-wider block w-fit">
                            Abono/Cuota
                          </span>
                        )}
                        {rec.type === "completo" && (
                          <span className="p-1 px-2.5 bg-emerald-50 text-emerald-850 border border-emerald-100 rounded-lg text-[9px] font-black uppercase tracking-wider block w-fit">
                            Pago Completo
                          </span>
                        )}
                        {rec.type === "inicio" && (
                          <span className="p-1 px-2.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-lg text-[9px] font-black uppercase tracking-wider block w-fit">
                            Finanza
                          </span>
                        )}
                      </td>

                      <td className="p-3 font-bold text-slate-800">
                        {rec.clientName.toUpperCase()}
                        {rec.clientCedula && <span className="block text-[9px] text-slate-400 font-normal font-mono">Ced: {rec.clientCedula}</span>}
                      </td>

                      <td className="p-3 font-medium">{rec.vendedor}</td>

                      <td className="p-3 max-w-[150px] truncate" title={rec.productDescription}>
                        {rec.productQty}x {rec.productDescription}
                      </td>

                      <td className="p-3 font-mono font-bold text-emerald-800 text-xs">
                        RD$ {rec.totalAmount.toLocaleString()}
                      </td>

                      <td className="p-3 text-slate-400 font-mono text-[10px]">
                        {new Date(rec.date).toLocaleDateString()}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handlePrintPDF(rec, false)}
                            className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 rounded-lg border border-emerald-150 transition cursor-pointer"
                            title="Descargar PDF en tamaño Carta/A4"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          
                          <button
                            onClick={() => handlePrintPDF(rec, true)}
                            className="p-1.5 bg-slate-150 text-slate-700 hover:bg-slate-200 rounded-lg border border-slate-200 transition cursor-pointer"
                            title="Descargar PDF en tamaño Tickettérmico"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => handleSendWhatsapp(rec)}
                            className="p-1.5 bg-[#e1fbe5] text-[#1dad4b] hover:bg-[#cbf7d2] rounded-lg border border-[#a2f2b1] transition cursor-pointer"
                            title="Enviar por WhatsApp"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDeleteReceipt(rec.id)}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>

                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
