import { useState } from "react";
import { 
  History, 
  Search, 
  Trash2, 
  Printer, 
  TrendingUp, 
  Coins, 
  CreditCard, 
  Percent, 
  Users, 
  ArrowDownLeft, 
  CheckCircle,
  FileSpreadsheet,
  FileText,
  Calendar,
  Layers,
  Sparkles,
  Send
} from "lucide-react";
import { Sale, Client, DailyClosure } from "../types";
import { getBusinessConfig, generateSalesAndClosuresPDF } from "../utils/pdfGenerator";

interface SalesHistoryProps {
  sales: Sale[];
  clients: Client[];
  onCancelSale: (saleId: string) => void;
  onReprintInvoice: (sale: Sale, preferredFormat?: "thermal" | "letter") => void;
  onCloseDay: (closureSummary: { totalSales: number; totalProfit: number; salesCount: number; soldItemsSummary: string }) => void;
  closures: DailyClosure[];
  onDeleteClosure: (closureId: string) => void;
}

export default function SalesHistory({ 
  sales, 
  clients, 
  onCancelSale, 
  onReprintInvoice,
  onCloseDay,
  closures,
  onDeleteClosure
}: SalesHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("Todos");
  const [showClosureHistory, setShowClosureHistory] = useState(false);

  // Reusable popup/modal state variables to bypass browser confirm/alert limitations
  const [showCloseDayConfirm, setShowCloseDayConfirm] = useState(false);
  const [activeSaleToAnnull, setActiveSaleToAnnull] = useState<Sale | null>(null);
  const [activeClosureIdToDelete, setActiveClosureIdToDelete] = useState<string | null>(null);
  const [customNotification, setCustomNotification] = useState<{ type: "success" | "info" | "error"; text: string } | null>(null);

  const handleDownloadPDF = () => {
    const currentUserStr = localStorage.getItem("nova_facturacion_current_user");
    let email = "";
    if (currentUserStr) {
      try {
        const user = JSON.parse(currentUserStr);
        email = user.email || "";
      } catch (e) {}
    }
    let operatingEmail = email;
    if (operatingEmail === "marialuzgonzalez1234568@gmail.com") {
      operatingEmail = "luisrodriguezgon22@gmail.com";
    }

    const config = getBusinessConfig(operatingEmail);
    const blob = generateSalesAndClosuresPDF(sales, closures, config);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Ventas_Cierre-${config.name.replace(/\s+/g, "_")}-${new Date().toISOString().substring(0, 10)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShareWhatsApp = () => {
    const currentUserStr = localStorage.getItem("nova_facturacion_current_user");
    let email = "";
    if (currentUserStr) {
      try {
        const user = JSON.parse(currentUserStr);
        email = user.email || "";
      } catch (e) {}
    }
    let operatingEmail = email;
    if (operatingEmail === "marialuzgonzalez1234568@gmail.com") {
      operatingEmail = "luisrodriguezgon22@gmail.com";
    }
    const config = getBusinessConfig(operatingEmail);

    const totalSales = sales.reduce((acc, s) => acc + s.total, 0);
    const totalProfitNum = totalNetProfit;
    const textHeader = `*${config.name.toUpperCase()} - REPORTE DE VENTAS Y CAJA*\n`;
    const textMeta = `_Generado: ${new Date().toLocaleDateString("es-DO")}_\n` +
                     `===================================\n`;
    
    const recentLines = sales.slice(0, 15).map(s => {
      const payingUserStr = s.client ? s.client.name.toUpperCase() : "CLIENTE GENERAL";
      return `• Fact: *${s.invoiceNumber}* | ${payingUserStr}\n  Total: *RD$ ${s.total.toFixed(0)}* (${s.paymentMethod.toUpperCase()})`;
    }).join("\n");

    const textFooter = `\n===================================\n` +
                       `*Arqueo total ventas:* RD$ ${totalSales.toLocaleString("es-DO")}/DOP\n` +
                       `*Beneficio neto proyectado:* RD$ ${totalProfitNum.toLocaleString("es-DO")}/DOP\n` +
                       `*Cierres históricos totales:* ${closures.length} días de arqueo\n\n` +
                       `¡Control de Facturación Digital Nova!`;

    const fullMsg = textHeader + textMeta + (recentLines || "• No hay transacciones reportadas hoy.") + textFooter;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(fullMsg)}`, "_blank");
  };

  // Sum calculations
  const totalSalesVolume = sales.reduce((acc, s) => acc + s.total, 0);
  const totalItbisVolume = sales.reduce((acc, s) => acc + s.itbis, 0);
  
  // Cost & Profit calculations
  const totalCostOfSales = sales.reduce((acc, s) => {
    const saleCost = s.items.reduce((itemAcc, item) => {
      const cost = item.product.costPrice || 0;
      return itemAcc + (cost * item.quantity);
    }, 0);
    return acc + saleCost;
  }, 0);

  const totalNetProfit = totalSalesVolume - totalCostOfSales;

  const cashSales = sales.filter((s) => s.paymentMethod === "Efectivo").reduce((acc, s) => acc + s.total, 0);
  const cardSales = sales.filter((s) => s.paymentMethod === "Tarjeta").reduce((acc, s) => acc + s.total, 0);
  const transferSales = sales.filter((s) => s.paymentMethod === "Transferencia").reduce((acc, s) => acc + s.total, 0);
  const fiadoSales = clients.reduce((acc, c) => acc + (c.currentDebt || 0), 0);

  // Filter list
  const filteredSales = sales.filter((s) => {
    const clientName = s.client ? s.client.name.toLowerCase() : "cliente contado";
    const matchesSearch = s.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          clientName.includes(searchQuery.toLowerCase()) ||
                          (s.ncfCode && s.ncfCode.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesMethod = methodFilter === "Todos" || s.paymentMethod === methodFilter;
    return matchesSearch && matchesMethod;
  });

  const handleCloseDayClick = () => {
    setShowCloseDayConfirm(true);
  };

  const executeCloseDay = () => {
    // aggregate sold items
    const summaryMap: { [name: string]: number } = {};
    sales.forEach((s) => {
      s.items.forEach((item) => {
        summaryMap[item.product.name] = (summaryMap[item.product.name] || 0) + item.quantity;
      });
    });

    const soldItemsSummary = Object.entries(summaryMap)
      .map(([name, qty]) => `${qty}x ${name}`)
      .slice(0, 10)
      .join(", ") + (Object.keys(summaryMap).length > 10 ? "..." : "");

    onCloseDay({
      totalSales: totalSalesVolume,
      totalProfit: totalNetProfit,
      salesCount: sales.length,
      soldItemsSummary: soldItemsSummary || "Sin artículos registrados"
    });

    setShowCloseDayConfirm(false);
    setShowClosureHistory(true); // Switch view to closures automatically so they see the result!
    setCustomNotification({
      type: "success",
      text: "¡Día cerrado con éxito! Los datos fueron guardados y la cajaPOS ha sido formateada para mañana."
    });
  };

  const executeAnnullSale = () => {
    if (activeSaleToAnnull) {
      onCancelSale(activeSaleToAnnull.id);
      const invoiceNum = activeSaleToAnnull.invoiceNumber;
      setActiveSaleToAnnull(null);
      setCustomNotification({
        type: "success",
        text: `La factura ${invoiceNum} ha sido anulada con éxito. El stock deducido y saldos de crédito han sido revertidos/devueltos.`
      });
    }
  };

  const executeDeleteClosure = () => {
    if (activeClosureIdToDelete) {
      onDeleteClosure(activeClosureIdToDelete);
      setActiveClosureIdToDelete(null);
      setCustomNotification({
        type: "info",
        text: "El registro de arqueo ha sido eliminado del historial con éxito."
      });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Banner with Cerrar Dia triggers */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900 text-white p-4.5 rounded-xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <History className="h-5 w-5 text-emerald-400" />
            Flujo de Caja y Cierre Técnico
          </h2>
          <p className="text-xs text-slate-400">Mide ingresos brutos, costos incurridos, ITBIS y realiza el arqueo de caja de forma ágil.</p>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            id="btn-sales-pdf"
            onClick={handleDownloadPDF}
            className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold rounded-lg transition cursor-pointer"
            title="Descargar Reporte Completo en PDF"
          >
            <FileText className="h-4 w-4" />
            <span>Ver PDF</span>
          </button>
          
          <button
            id="btn-sales-whatsapp"
            onClick={handleShareWhatsApp}
            className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold rounded-lg transition cursor-pointer"
            title="Enviar Reporte por WhatsApp"
          >
            <Send className="h-4 w-4" />
            <span>WhatsApp</span>
          </button>

          <button
            id="btn-toggle-closure-history"
            onClick={() => setShowClosureHistory(!showClosureHistory)}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg border border-slate-700 transition cursor-pointer"
          >
            <Calendar className="h-4 w-4 text-sky-400" />
            {showClosureHistory ? "Ventas" : "Cierres"}
          </button>

          <button
            id="btn-execute-cerrar-dia"
            onClick={handleCloseDayClick}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-650 hover:bg-rose-550 text-white text-xs font-black rounded-lg transition shadow-lg cursor-pointer animate-pulse"
          >
            <CheckCircle className="h-4 w-4" />
            Cerrar Día (Resetear)
          </button>
        </div>
      </div>

      {!showClosureHistory ? (
        <>
          {/* Top Owner summary stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Metric 1 - Total Ventas */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-tight">Total Involucrado (Ventas)</span>
                <span className="p-1 bg-emerald-50 text-emerald-600 rounded">
                  <TrendingUp className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-2 text-base font-black text-slate-800 font-mono">
                RD${totalSalesVolume.toLocaleString("es-DO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </div>
              <span className="text-[9px] text-slate-400 mt-1">Bruto del día</span>
            </div>

            {/* Metric Costo */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-tight">Costo Mercancía</span>
                <span className="p-1 bg-slate-100 text-slate-600 rounded">
                  <Layers className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-2 text-base font-black text-slate-500 font-mono">
                RD${totalCostOfSales.toLocaleString("es-DO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </div>
              <span className="text-[9px] text-slate-400 mt-1">Precio total compra</span>
            </div>

            {/* Metric Ingreso Neto */}
            <div className="bg-white p-4 rounded-xl border border-emerald-300 shadow-xs flex flex-col justify-between ring-2 ring-emerald-500/5">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-tight flex items-center gap-1 leading-none">
                  Ganancia Neta
                  <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                </span>
                <span className="p-1 bg-emerald-100 text-emerald-700 rounded text-[9px] font-bold">NETO</span>
              </div>
              <div className="mt-2 text-base font-extrabold text-emerald-700 font-mono">
                RD${totalNetProfit.toLocaleString("es-DO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </div>
              <span className="text-[9px] text-emerald-600 mt-1">Ingreso real limpio</span>
            </div>

            {/* Metric ITBIS */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-tight">ITBIS (DGII)</span>
                <span className="p-1 bg-amber-50 text-amber-600 rounded">
                  <Percent className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-2 text-base font-black text-amber-650 font-mono">
                RD${totalItbisVolume.toLocaleString("es-DO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <span className="text-[9px] text-amber-600 font-medium mt-1">Total tributario</span>
            </div>

            {/* Metric Efectivo */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-tight">Caja (Efectivo)</span>
                <span className="p-1 bg-teal-50 text-teal-600 rounded">
                  <Coins className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-2 text-base font-black text-slate-75 *font-mono">
                RD${cashSales.toLocaleString("es-DO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <span className="text-[9px] text-slate-400 mt-1">Monedas/Billetes</span>
            </div>

            {/* Metric Fiar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-tight">Crédito (Fiao)</span>
                <span className="p-1 bg-rose-50 text-rose-605 rounded">
                  <Users className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-2 text-base font-black text-rose-650 font-mono">
                RD${fiadoSales.toLocaleString("es-DO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <span className="text-[9px] text-rose-700 font-bold mt-1 font-sans">Por cobrar</span>
            </div>
          </div>

          {/* Sales register logs */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Search controls row */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="w-full md:w-80 relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  id="search-sales-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar Factura #, Cliente, o Comprobante..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Filtrar Pago:</span>
                <select
                  id="sales-history-method-filter"
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                  className="text-xs bg-white border border-slate-200 rounded px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Todos">Todos los métodos</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta de Crédito/Débito</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Fiado">Fiado (Crédito)</option>
                </select>
              </div>
            </div>

            {/* Sales Table log block */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-bold">Fecha / Hora</th>
                    <th className="py-3 px-4 font-bold">Número Factura</th>
                    <th className="py-3 px-4 font-bold">Comprobante (NCF)</th>
                    <th className="py-3 px-4 font-bold">Cliente</th>
                    <th className="py-3 px-4 font-bold">Tipo Pago</th>
                    <th className="py-3 px-4 font-bold text-right">Subtotal</th>
                    <th className="py-3 px-4 font-bold text-right">ITBIS</th>
                    <th className="py-3 px-4 font-bold text-right">Total RD$</th>
                    <th className="py-3 px-4 font-bold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700 bg-white">
                  {filteredSales.map((sale) => {
                    const isFiadoType = sale.paymentMethod === "Fiado" || sale.paymentMethod === "Crédito";
                    const dateObj = new Date(sale.date);
                    
                    return (
                      <tr id={`sale-row-${sale.id}`} key={sale.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">
                            {dateObj.toLocaleDateString("es-DO")}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {dateObj.toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-650">
                          {sale.invoiceNumber}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {sale.ncfCode ? (
                            <div className="text-stone-800 font-bold bg-amber-50 border border-amber-100/50 px-1.5 py-0.5 rounded text-[10.5px]">
                              {sale.ncfCode}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No fiscal (Tíquet)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {sale.client ? sale.client.name : "Cliente Genérico Contado"}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                            sale.paymentMethod === "Efectivo"
                              ? "bg-teal-50 text-teal-700 border border-teal-200/50"
                              : sale.paymentMethod === "Tarjeta"
                                ? "bg-sky-50 text-sky-750 border border-sky-200/50"
                                : isFiadoType
                                  ? "bg-rose-50 text-rose-755 border border-rose-200/50"
                                  : "bg-indigo-50 text-indigo-700 border border-indigo-200/50"
                          }`}>
                            {sale.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600 font-bold">
                          RD${sale.subtotal.toFixed(0)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500 font-bold">
                          RD${sale.itbis.toFixed(0)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-emerald-700">
                          RD${sale.total.toFixed(0)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex justify-center items-center gap-1.5">
                            <button
                              id={`btn-reprint-thermal-${sale.id}`}
                              onClick={() => onReprintInvoice(sale, "thermal")}
                              title="Imprimir Tíquet Botonera (80mm)"
                              className="p-1 px-2.5 bg-amber-50 hover:bg-amber-100/80 text-amber-800 text-[10px] font-bold rounded flex items-center gap-1 transition cursor-pointer font-sans"
                            >
                              <Printer className="h-3 w-3" />
                              Botonera
                            </button>

                            <button
                              id={`btn-reprint-letter-${sale.id}`}
                              onClick={() => onReprintInvoice(sale, "letter")}
                              title="Imprimir Factura Completa (Carta/A4)"
                              className="p-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded flex items-center gap-1 transition cursor-pointer font-sans"
                            >
                              <FileText className="h-3 w-3" />
                              Grande A4
                            </button>

                            <button
                              id={`btn-cancel-sale-${sale.id}`}
                              onClick={() => {
                                onCancelSale(sale.id);
                                setCustomNotification({
                                  type: "success",
                                  text: `La factura ${sale.invoiceNumber} ha sido anulada con éxito. El stock deducido y saldos de crédito han sido revertidos/devueltos.`
                                });
                              }}
                              title="Anular venta y re-abastecer stock (Devolución)"
                              className="p-1 px-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded transition cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredSales.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        Aún no se registran facturas con estos filtros o datos en el historial.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Daily closures history list */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-extrabold text-xs text-slate-705 uppercase tracking-wider">
            Historial de Cierres de Turno / Diario (Arqueos Cerrados)
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-655 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-bold">Fecha de Cierre</th>
                  <th className="py-3 px-4 font-bold">Ventas Totales</th>
                  <th className="py-3 px-4 font-bold">Ganancia Neta</th>
                  <th className="py-3 px-4 font-bold text-center">Cant. Facturas</th>
                  <th className="py-3 px-4 font-bold">Productos Vendidos (Top)</th>
                  <th className="py-3 px-4 font-bold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700 bg-white">
                {closures.map((closure) => {
                  const dateObj = new Date(closure.date);
                  return (
                    <tr id={`closure-row-${closure.id}`} key={closure.id} className="hover:bg-slate-50/50 transition duration-100">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {dateObj.toLocaleDateString("es-DO")} {dateObj.toLocaleTimeString("es-DO", {hour: "2-digit", minute:"2-digit"})}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        RD$ {closure.totalSales.toLocaleString("es-DO", {minimumFractionDigits: 2})}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600 bg-emerald-50/20">
                        RD$ {closure.totalProfit.toLocaleString("es-DO", {minimumFractionDigits: 2})}
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        {closure.salesCount}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={closure.soldItemsSummary}>
                        {closure.soldItemsSummary}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          id={`btn-delete-closure-${closure.id}`}
                          onClick={() => {
                            onDeleteClosure(closure.id);
                            setCustomNotification({
                              type: "info",
                              text: "El registro de arqueo ha sido eliminado del historial con éxito."
                            });
                          }}
                          className="p-1 px-1.5 hover:bg-red-50 text-red-500 rounded transition cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {closures.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No hay registros de cierres guardados aún. Presiona "Cerrar Día" arriba para archivar el turno actual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODAL DE CONFIRMACIÓN DE CIERRE DE DÍA --- */}
      {showCloseDayConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
            <div className="bg-rose-650 p-4.5 text-white flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <h3 className="font-extrabold text-sm uppercase tracking-wider">Cierre Técnico e Historial de Turno</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                ¿Estás seguro de que deseas <strong className="text-slate-900 uppercase">Cerrar el Turno de Caja</strong> del día de hoy? Esta acción reiniciará los saldos y archivará las transacciones actuales.
              </p>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Facturas Emitidas:</span>
                  <span className="font-bold text-slate-800">{sales.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Total Facturado:</span>
                  <span className="font-extrabold text-slate-950">RD$ {totalSalesVolume.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-emerald-700">
                  <span className="font-sans font-bold">Ganancia Neta Calculada:</span>
                  <span className="font-extrabold">RD$ {totalNetProfit.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="text-[10px] text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200 font-medium flex gap-2">
                <span className="font-bold shrink-0">⚠ NOTA:</span>
                <span>Los datos ingresados se guardarán permanentemente en el historial local y la pantalla principal de ventas iniciará limpia en RD$ 0.00.</span>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2.5 justify-end">
              <button
                id="btn-confirm-closure-modal-no"
                onClick={() => setShowCloseDayConfirm(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition select-none"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-closure-modal-yes"
                onClick={executeCloseDay}
                className="px-5 py-2 bg-rose-650 hover:bg-rose-700 text-white text-xs font-black rounded-lg cursor-pointer transition shadow-sm select-none"
              >
                Sí, Confirmar Cierre Técnico
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE CONFIRMACIÓN ANULAR FACTURA --- */}
      {activeSaleToAnnull && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden animate-scale-in">
            <div className="bg-red-650 p-4.5 text-white flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              <h3 className="font-extrabold text-sm uppercase tracking-wider">¿Anular Factura {activeSaleToAnnull.invoiceNumber}?</h3>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Esta acción es irreversible. Se anulará la factura original de <strong className="text-slate-900">RD$ {activeSaleToAnnull.total.toLocaleString("es-DO")}</strong>.
              </p>
              <p className="text-slate-500 font-bold">
                ✔ El stock deducido se re-abastecerá automáticamente en el inventario.<br />
                ✔ Cualquier deuda asignada a cliente ("Fiado") será revertida.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
              <button
                id="btn-confirm-annull-no"
                onClick={() => setActiveSaleToAnnull(null)}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-705 text-xs font-bold rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-annull-yes"
                onClick={executeAnnullSale}
                className="px-4 py-1.5 bg-red-650 hover:bg-red-755 text-white text-xs font-extrabold rounded-lg cursor-pointer transition"
              >
                Confirmar Anulación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE CONFIRMACIÓN ELIMINAR CIERRE DE ARQUEO --- */}
      {activeClosureIdToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden animate-scale-in">
            <div className="bg-slate-805 p-4 py-3 bg-slate-800 text-white flex items-center gap-2">
              <Trash2 className="h-4.5 w-4.5 text-red-400" />
              <h3 className="font-extrabold text-xs uppercase tracking-wider">Eliminar Arqueo del Historial</h3>
            </div>
            <div className="p-5 text-xs text-slate-600">
              ¿Seguro que deseas eliminar este registro histórico de cierre? No alterará la caja actualmente activa del sistema.
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
              <button
                id="btn-confirm-delete-closure-no"
                onClick={() => setActiveClosureIdToDelete(null)}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-delete-closure-yes"
                onClick={executeDeleteClosure}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-extrabold rounded-lg cursor-pointer transition"
              >
                Sí, Eliminar Registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- NOTIFICACIONES / ALERTAS CUSTOMIZADAS EN REEMPLAZO DE ALERT() --- */}
      {customNotification && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white rounded-xl border border-slate-200 shadow-2xl p-4.5 flex flex-col gap-3 animate-slide-up">
          <div className="flex gap-2.5 items-start">
            <span className={`p-1 rounded-full shrink-0 ${
              customNotification.type === "success" 
                ? "bg-emerald-100 text-emerald-600" 
                : customNotification.type === "error" 
                  ? "bg-red-100 text-red-600" 
                  : "bg-blue-100 text-blue-600"
            }`}>
              <CheckCircle className="h-4 w-4" />
            </span>
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                {customNotification.type === "success" ? "Operación Exitosa" : customNotification.type === "error" ? "Aviso del Sistema" : "Información"}
              </h4>
              <p className="text-xs text-slate-600 leading-normal">{customNotification.text}</p>
            </div>
          </div>
          <div className="text-right">
            <button
              id="btn-dismiss-custom-notif"
              onClick={() => setCustomNotification(null)}
              className="p-1 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] rounded uppercase cursor-pointer transition select-none"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
