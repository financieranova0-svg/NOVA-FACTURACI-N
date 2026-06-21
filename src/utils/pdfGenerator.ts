import { jsPDF } from "jspdf";
import { Sale, Product, Client, DailyClosure, CustomReceipt } from "../types";

export interface BusinessConfig {
  name: string;
  rnc: string;
  phone: string;
  address: string;
  logo: string; // base64
}

export function getBusinessConfig(userEmail: string): BusinessConfig {
  const stored = localStorage.getItem(`nova_business_config_${userEmail}`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      // ignore
    }
  }
  return {
    name: "NOVA FACTURACIÓN S.R.L",
    rnc: "1-01-23456-7",
    phone: "809-555-0101",
    address: "Av. Winston Churchill, Santiago, RD",
    logo: ""
  };
}

export function generateInvoicePDF(sale: Sale, config: BusinessConfig, format: "thermal" | "letter" = "letter"): Blob {
  let finalFormat: string | [number, number] = "a4";

  if (format === "thermal") {
    let estimatedHeight = 10; // Initial start offset
    estimatedHeight += 5;     // Address spacing
    estimatedHeight += 4;     // RNC/TEL line spacing
    estimatedHeight += 4;     // Line divider line spacing
    estimatedHeight += 5;     // Factura number line spacing
    estimatedHeight += 4;     // Date line spacing
    if (sale.ncfCode) {
      estimatedHeight += 4;
    }
    if (sale.client) {
      estimatedHeight += 4; // Client name line spacing
      if (sale.client.rnc) {
        estimatedHeight += 4; // Client RNC line spacing
      }
    }
    estimatedHeight += 5;     // Line divider spacing
    estimatedHeight += 4;     // Table header line spacing
    estimatedHeight += 3;     // Divider line spacing
    
    // Items list (4.5mm per item)
    estimatedHeight += sale.items.length * 4.5;
    
    estimatedHeight += 5;     // Divider line spacing
    estimatedHeight += 5;     // Subtotal line spacing
    estimatedHeight += 4.5;   // ITBIS line spacing
    estimatedHeight += 5;     // Total line spacing
    estimatedHeight += 6;     // Payment condition line spacing
    estimatedHeight += 8;     // Thank you line spacing
    estimatedHeight += 4;     // DGII certified line spacing
    estimatedHeight += 12;    // Sane bottom padding margin to prevent any cutoff
    
    finalFormat = [80, Math.ceil(estimatedHeight)];
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: finalFormat
  });

  if (format === "thermal") {
    // 80mm compact receipt formatting
    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    
    let y = 10;
    doc.text(`*** ${config.name.toUpperCase()} ***`, 40, y, { align: "center" });
    
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    y += 5;
    doc.text(config.address, 40, y, { align: "center" });
    y += 4;
    doc.text(`RNC: ${config.rnc} | TEL: ${config.phone}`, 40, y, { align: "center" });
    y += 4;
    doc.text("----------------------------------------", 40, y, { align: "center" });

    y += 5;
    doc.setFont("courier", "bold");
    doc.text(`FACTURA: ${sale.invoiceNumber}`, 5, y);
    y += 4;
    doc.setFont("courier", "normal");
    doc.text(`FECHA  : ${new Date(sale.date).toLocaleString("es-DO")}`, 5, y);
    
    if (sale.ncfCode) {
      y += 4;
      doc.setFont("courier", "bold");
      doc.text(`NCF    : ${sale.ncfCode}`, 5, y);
    }

    if (sale.client) {
      y += 4;
      doc.setFont("courier", "normal");
      doc.text(`CLIENTE: ${sale.client.name.substring(0, 25)}`, 5, y);
      if (sale.client.rnc) {
        y += 4;
        doc.text(`RNC CLI: ${sale.client.rnc}`, 5, y);
      }
    }

    y += 5;
    doc.text("----------------------------------------", 40, y, { align: "center" });
    
    y += 4;
    doc.setFont("courier", "bold");
    doc.text("CANT  DESCRIPCIÓN             TOTAL", 5, y);
    y += 3;
    doc.setFont("courier", "normal");
    doc.text("----------------------------------------", 40, y, { align: "center" });

    sale.items.forEach((item) => {
      y += 4.5;
      const desc = item.product.name.substring(0, 18).padEnd(18, " ");
      const qty = String(item.quantity).padStart(3, " ");
      const lineTotal = `RD$${(item.product.price * item.quantity).toFixed(0)}`.padStart(10, " ");
      doc.text(`${qty}x ${desc} ${lineTotal}`, 5, y);
    });

    y += 5;
    doc.text("----------------------------------------", 40, y, { align: "center" });
    
    y += 5;
    doc.setFont("courier", "bold");
    const subtotalText = `RD$${sale.subtotal.toFixed(0)}`.padStart(12, " ");
    doc.text(`SUBTOTAL: ${subtotalText}`, 75, y, { align: "right" });
    
    y += 4.5;
    const itbisText = `RD$${sale.itbis.toFixed(0)}`.padStart(12, " ");
    doc.text(`ITBIS   : ${itbisText}`, 75, y, { align: "right" });
    
    y += 5;
    doc.setFontSize(9);
    const totalText = `RD$${sale.total.toFixed(0)}`.padStart(12, " ");
    doc.text(`TOTAL   : ${totalText}`, 75, y, { align: "right" });

    y += 6;
    doc.setFont("courier", "normal");
    doc.setFontSize(7.5);
    doc.text(`CONDICIÓN: ${sale.paymentMethod.toUpperCase()}`, 5, y);

    if (sale.note) {
      y += 4.5;
      doc.setFont("courier", "bold");
      doc.text("OBSERVACIÓN COMPRA:", 5, y);
      y += 4;
      doc.setFont("courier", "normal");
      doc.text(sale.note.substring(0, 36).toUpperCase(), 5, y);
    }

    y += 8;
    doc.text("*** GRACIAS POR PREFERIRNOS ***", 40, y, { align: "center" });
    y += 4;
    doc.setFontSize(6);
    doc.text("SISTEMA DE FACTURACION CERTIFICADO DGII", 40, y, { align: "center" });

  } else {
    // Full A4 Letter design
    let currentY = 20;

    // Header Panel
    // Logo block
    if (config.logo) {
      try {
        doc.addImage(config.logo, "JPEG", 15, currentY - 5, 24, 24);
      } catch (e) {
        // failed to render logo, ignore
      }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59); // dark slate Blue
    doc.text(config.name.toUpperCase(), config.logo ? 44 : 15, currentY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate 500
    currentY += 5;
    doc.text(`RNC: ${config.rnc} | TEL: ${config.phone}`, config.logo ? 44 : 15, currentY);
    currentY += 4;
    doc.text(config.address, config.logo ? 44 : 15, currentY);

    // Invoice Meta Information at Top Right
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 118, 110); // emerald-700
    doc.text(sale.ncfCode ? "FACTURA DE CRÉDITO FISCAL" : "TICKET DE VENTA DIRECTA", 195, 20, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(`Factura No: ${sale.invoiceNumber}`, 195, 25, { align: "right" });
    doc.text(`Emisión: ${new Date(sale.date).toLocaleDateString("es-DO")}`, 195, 29, { align: "right" });
    if (sale.ncfCode) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 118, 110);
      doc.text(`NCF DGII: ${sale.ncfCode}`, 195, 34, { align: "right" });
    }

    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(15, 42, 195, 42);

    // Client detailed box
    currentY = 48;
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(15, currentY, 180, 22, 2, 2, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // slate-400
    doc.text("DATOS DEL ADQUIRIENTE", 18, currentY + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    const clientName = sale.client ? sale.client.name.toUpperCase() : "CLIENTE GENÉRICO (CONTADO)";
    doc.text(clientName, 18, currentY + 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    if (sale.client) {
      doc.text(`Contacto: ${sale.client.phone || "N/A"}`, 18, currentY + 16);
      if (sale.client.rnc) {
        doc.text(`RNC / Cédula: ${sale.client.rnc}`, 100, currentY + 16);
      }
    } else {
      doc.text("Venta directa al detalle libre de ITBIS crediticio.", 18, currentY + 16);
    }

    doc.setFont("helvetica", "bold");
    doc.text(`METODO: ${sale.paymentMethod.toUpperCase()}`, 190, currentY + 11, { align: "right" });
    doc.text("MONEDA: DOP (RD$)", 190, currentY + 16, { align: "right" });

    // Products table grid
    currentY = 78;
    doc.setFillColor(15, 118, 110); // Emerald header
    doc.rect(15, currentY, 180, 7, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("CÓDIGO", 17, currentY + 5);
    doc.text("DESCRIPCIÓN DEL ARTÍCULO", 45, currentY + 5);
    doc.text("CANT.", 120, currentY + 5, { align: "center" });
    doc.text("P. UNITARIO", 145, currentY + 5, { align: "right" });
    doc.text("ITBIS (18%)", 168, currentY + 5, { align: "right" });
    doc.text("TOTAL RD$", 193, currentY + 5, { align: "right" });

    currentY += 7;
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");

    sale.items.forEach((item, index) => {
      // background alternate lines stripes
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, currentY, 180, 7.5, "F");
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(item.product.barcode || "N/A", 17, currentY + 5);
      
      doc.setFont("helvetica", "bold");
      doc.text(item.product.name, 45, currentY + 5);
      
      doc.setFont("helvetica", "normal");
      doc.text(String(item.quantity), 120, currentY + 5, { align: "center" });
      
      const basePrice = item.product.price / 1.18;
      doc.text(`RD$${item.product.price.toFixed(0)}`, 145, currentY + 5, { align: "right" });
      
      const lineItbis = item.product.price * (item.product.itbisRate / 100) * item.quantity;
      doc.text(`RD$${lineItbis.toFixed(0)}`, 168, currentY + 5, { align: "right" });
      
      doc.setFont("helvetica", "bold");
      const lineTotalVal = item.product.price * item.quantity;
      doc.text(`RD$${lineTotalVal.toFixed(0)}`, 193, currentY + 5, { align: "right" });

      currentY += 7.5;
    });

    // Dividers and totals box
    currentY += 3;
    doc.setDrawColor(226, 232, 240);
    doc.line(15, currentY, 195, currentY);

    currentY += 3;
    // Calculation ledger
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Subtotal Neto Gravado:", 145, currentY + 4, { align: "right" });
    doc.text("ITBIS Líquido Devengado:", 145, currentY + 9, { align: "right" });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(225, 29, 72); // rose-600
    doc.text("Total Facturado DOP (RD$):", 145, currentY + 15, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(`RD$ ${sale.subtotal.toFixed(2)}`, 193, currentY + 4, { align: "right" });
    doc.text(`RD$ ${sale.itbis.toFixed(2)}`, 193, currentY + 9, { align: "right" });
    
    doc.setFontSize(11);
    doc.setTextColor(15, 118, 110); // emerald-700
    doc.text(`RD$ ${sale.total.toFixed(2)}`, 193, currentY + 15, { align: "right" });

    // Conditional info e.g. change info
    if (sale.receivedAmount !== undefined && sale.changeAmount !== undefined) {
      currentY += 16;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Efectivo Recibido: RD$ ${sale.receivedAmount.toFixed(0)} | Devuelto: RD$ ${sale.changeAmount.toFixed(0)}`, 193, currentY, { align: "right" });
    } else {
      currentY += 10;
    }

    if (sale.note) {
      currentY += 6;
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(15, currentY, 180, 10, 1, 1, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`DETALLE / OBSERVACIÓN COMPRADOR: ${sale.note.toUpperCase()}`, 18, currentY + 6.5);
      currentY += 10;
    } else {
      currentY += 4;
    }

    // Terms note
    currentY += 4;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, currentY, 180, 12, 1, 1, "F");
    doc.setFont("helvetica", "oblique");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("Este documento constituye una representacion digital simulada de la Factura de Credito Fiscal certificada conforme a las", 18, currentY + 5);
    doc.text("normas del Comprobante Fiscal Dominicano dictadas por la DGII. Valido exclusivamente para propositos financieros administrativos.", 18, currentY + 9);

    // Signatures
    currentY += 24;
    doc.setDrawColor(203, 213, 225);
    doc.line(20, currentY, 80, currentY);
    doc.line(130, currentY, 190, currentY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("REGISTRADO EN DESPACHO / CAJA", 50, currentY + 4, { align: "center" });
    doc.text("ENTREGADO CONFORME / CLIENTE", 160, currentY + 4, { align: "center" });
  }

  return doc.output("blob");
}


export function generateInventoryCatalogPDF(products: Product[], config: BusinessConfig): Blob {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  
  // Header box
  doc.setFillColor(15, 118, 110); // emerald-700
  doc.rect(15, 15, 186, 26, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(config.name.toUpperCase(), 20, 24);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`RNC: ${config.rnc} | Tel: ${config.phone} | Dirección: ${config.address}`, 20, 29);
  doc.setFont("helvetica", "bold");
  doc.text("REPORTE OFICIAL DE INVENTARIO Y VALORACIÓN DE EXISTENCIAS", 20, 35);
  
  let currentY = 49;
  
  // Meta Info
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha de Emisión: ${new Date().toLocaleString("es-DO")}`, 15, currentY);
  doc.text(`Total de Ítems en Catálogo: ${products.length}`, 120, currentY);
  currentY += 6;
  
  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(15, currentY, 186, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  
  doc.text("Código / Barcode", 17, currentY + 5);
  doc.text("Producto / Descripción", 55, currentY + 5);
  doc.text("Categoría", 115, currentY + 5);
  doc.text("Costo", 145, currentY + 5, { align: "right" });
  doc.text("Precio", 165, currentY + 5, { align: "right" });
  doc.text("Stock", 182, currentY + 5, { align: "right" });
  doc.text("Valor", 198, currentY + 5, { align: "right" });
  
  currentY += 7;
  
  let totalCostValue = 0;
  let totalStockItems = 0;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  
  products.forEach((p) => {
    // Page check
    if (currentY > 255) {
      doc.addPage();
      currentY = 20;
      // Re-draw table header on new page
      doc.setFillColor(241, 245, 249);
      doc.rect(15, currentY, 186, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text("Código / Barcode", 17, currentY + 5);
      doc.text("Producto / Descripción", 55, currentY + 5);
      doc.text("Categoría", 115, currentY + 5);
      doc.text("Costo", 145, currentY + 5, { align: "right" });
      doc.text("Precio", 165, currentY + 5, { align: "right" });
      doc.text("Stock", 182, currentY + 5, { align: "right" });
      doc.text("Valor", 198, currentY + 5, { align: "right" });
      currentY += 7;
    }
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    
    // Draw row divider line
    doc.setDrawColor(241, 245, 249);
    doc.line(15, currentY, 201, currentY);
    
    const itemCost = p.costPrice || 0;
    const itemPrice = p.price || 0;
    const itemStock = p.stock || 0;
    const rowCostValue = itemCost * itemStock;
    
    totalCostValue += rowCostValue;
    totalStockItems += itemStock;
    
    doc.text(p.barcode, 17, currentY + 4.5);
    
    // Truncate name if it's too long
    let nameToPrint = p.name;
    if (nameToPrint.length > 38) {
      nameToPrint = nameToPrint.substring(0, 35) + "...";
    }
    doc.text(nameToPrint.toUpperCase(), 55, currentY + 4.5);
    
    doc.text(p.category.toUpperCase(), 115, currentY + 4.5);
    
    doc.text(`RD$ ${itemCost.toFixed(0)}`, 145, currentY + 4.5, { align: "right" });
    doc.text(`RD$ ${itemPrice.toFixed(0)}`, 165, currentY + 4.5, { align: "right" });
    
    // Low stock warning styling
    if (itemStock <= (p.minStock || 5)) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(225, 29, 72); // Red for low stock
    }
    doc.text(itemStock.toString(), 182, currentY + 4.5, { align: "right" });
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`RD$ ${rowCostValue.toFixed(0)}`, 198, currentY + 4.5, { align: "right" });
    
    currentY += 5.5;
  });
  
  // Total card block at bottom
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }
  
  currentY += 5;
  doc.setFillColor(248, 250, 252);
  doc.rect(15, currentY, 186, 20, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 118, 110);
  doc.text("RESUMEN DE CONTEO Y VALORACIÓN DE INVENTARIO", 20, currentY + 6);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Diferentes Referencias: ${products.length}`, 20, currentY + 13);
  doc.text(`Cantidad de Unidades en Stock: ${totalStockItems} unds.`, 75, currentY + 13);
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(220, 38, 38);
  doc.text(`VALOR TOTAL ACTIVO (AL COSTO): RD$ ${totalCostValue.toLocaleString("es-DO")}`, 130, currentY + 13);
  
  return doc.output("blob");
}

export function generateClientDebtsPDF(clients: Client[], config: BusinessConfig): Blob {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  
  // Header box
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(15, 15, 186, 26, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(config.name.toUpperCase(), 20, 24);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`RNC: ${config.rnc} | Tel: ${config.phone} | Dirección: ${config.address}`, 20, 29);
  doc.setFont("helvetica", "bold");
  doc.text("ESTADO DE DEUDAS, CUADERNO DE CRÉDITO Y CUENTAS POR COBRAR", 20, 35);
  
  let currentY = 49;
  
  // Meta Info
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha de Reporte: ${new Date().toLocaleString("es-DO")}`, 15, currentY);
  doc.text(`Cantidad de Clientes: ${clients.length}`, 120, currentY);
  currentY += 6;
  
  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(15, currentY, 186, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  
  doc.text("Nombre del Cliente", 17, currentY + 5);
  doc.text("Documento / RNC", 75, currentY + 5);
  doc.text("Celular / Contacto", 115, currentY + 5);
  doc.text("Límite de Crédito", 155, currentY + 5, { align: "right" });
  doc.text("Balance Pendiente (Deuda)", 198, currentY + 5, { align: "right" });
  
  currentY += 7;
  
  let totalDebt = 0;
  let totalLimit = 0;
  let clientsWithDebtCount = 0;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  
  clients.forEach((c) => {
    if (currentY > 255) {
      doc.addPage();
      currentY = 20;
      doc.setFillColor(241, 245, 249);
      doc.rect(15, currentY, 186, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text("Nombre del Cliente", 17, currentY + 5);
      doc.text("Documento / RNC", 75, currentY + 5);
      doc.text("Celular / Contacto", 115, currentY + 5);
      doc.text("Límite de Crédito", 155, currentY + 5, { align: "right" });
      doc.text("Balance Pendiente (Deuda)", 198, currentY + 5, { align: "right" });
      currentY += 7;
    }
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    
    // Draw row divider line
    doc.setDrawColor(241, 245, 249);
    doc.line(15, currentY, 201, currentY);
    
    const clientDebt = c.currentDebt || 0;
    const clientLimit = c.creditLimit || 0;
    totalDebt += clientDebt;
    totalLimit += clientLimit;
    if (clientDebt > 0) {
      clientsWithDebtCount++;
    }
    
    doc.text(c.name.toUpperCase(), 17, currentY + 4.5);
    doc.text(c.rnc || "NO REGISTRADO", 75, currentY + 4.5);
    doc.text(c.phone || "SIN TELÉFONO", 115, currentY + 4.5);
    doc.text(`RD$ ${clientLimit.toLocaleString()}`, 155, currentY + 4.5, { align: "right" });
    
    // Highlight debtors with red bold font
    if (clientDebt > 0) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
    }
    doc.text(`RD$ ${clientDebt.toLocaleString()}`, 198, currentY + 4.5, { align: "right" });
    
    currentY += 5.5;
  });
  
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }
  
  currentY += 5;
  doc.setFillColor(248, 250, 252);
  doc.rect(15, currentY, 186, 20, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(79, 70, 229);
  doc.text("RESUMEN GENERAL DE CONTROL CARTERA PENDIENTE", 20, currentY + 6);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Clientes en Deuda Activa: ${clientsWithDebtCount} de ${clients.length}`, 20, currentY + 13);
  doc.text(`Límites de Crédito Totales: RD$ ${totalLimit.toLocaleString("es-DO")}`, 85, currentY + 13);
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(220, 38, 38);
  doc.text(`BALANCE GENERAL POR COBRAR: RD$ ${totalDebt.toLocaleString("es-DO")}`, 140, currentY + 13);
  
  return doc.output("blob");
}

export function generateSalesAndClosuresPDF(sales: Sale[], closures: DailyClosure[], config: BusinessConfig): Blob {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  
  // Header box
  doc.setFillColor(5, 150, 105); // emerald-600
  doc.rect(15, 15, 186, 26, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(config.name.toUpperCase(), 20, 24);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`RNC: ${config.rnc} | Tel: ${config.phone} | Dirección: ${config.address}`, 20, 29);
  doc.setFont("helvetica", "bold");
  doc.text("HISTORIAL GENERAL DE TRANSACCIONES, FACTURACIÓN Y CIERRES DIARIOS", 20, 35);
  
  let currentY = 49;
  
  // Meta Info
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha del Reporte: ${new Date().toLocaleString("es-DO")}`, 15, currentY);
  doc.text(`Ventas Registradas: ${sales.length} | Cierres de Caja: ${closures.length}`, 110, currentY);
  currentY += 8;
  
  // 1. HISTORIC SALES SECTION
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(5, 150, 105);
  doc.text("HISTORIAL DE TRÁFICO DE FACTURACIÓN (DIARIO)", 15, currentY);
  currentY += 4;
  
  // Table Header Sales
  doc.setFillColor(241, 245, 249);
  doc.rect(15, currentY, 186, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  
  doc.text("No. Factura", 17, currentY + 4);
  doc.text("NCF DGII", 40, currentY + 4);
  doc.text("Fecha Emisión", 70, currentY + 4);
  doc.text("Cliente Titular", 100, currentY + 4);
  doc.text("Pago", 145, currentY + 4);
  doc.text("Impuestos (ITBIS)", 170, currentY + 4, { align: "right" });
  doc.text("Monto Total", 198, currentY + 4, { align: "right" });
  
  currentY += 6;
  
  let totalSalesSum = 0;
  let totalItbisSum = 0;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  
  // Cut/Slice to avoid enormous pages, or render with smart check:
  const recentSalesToShow = sales.slice(0, 50); // Show up to 50 most recent sales
  
  recentSalesToShow.forEach((s) => {
    if (currentY > 265) {
      doc.addPage();
      currentY = 20;
      doc.setFillColor(241, 245, 249);
      doc.rect(15, currentY, 186, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text("No. Factura", 17, currentY + 4);
      doc.text("NCF DGII", 40, currentY + 4);
      doc.text("Fecha Emisión", 70, currentY + 4);
      doc.text("Cliente Titular", 100, currentY + 4);
      doc.text("Pago", 145, currentY + 4);
      doc.text("Impuestos (ITBIS)", 170, currentY + 4, { align: "right" });
      doc.text("Monto Total", 198, currentY + 4, { align: "right" });
      currentY += 6;
    }
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    
    // Line divider
    doc.setDrawColor(241, 245, 249);
    doc.line(15, currentY, 201, currentY);
    
    totalSalesSum += s.total;
    totalItbisSum += s.itbis || 0;
    
    doc.text(s.invoiceNumber, 17, currentY + 4.2);
    doc.text(s.ncfCode || "N/A CONTADO", 40, currentY + 4.2);
    doc.text(new Date(s.date).toLocaleString("es-DO", { hour12: false }).substring(0, 16), 70, currentY + 4.2);
    
    const clientName = s.client ? s.client.name.toUpperCase() : "CLIENTE GENERAL";
    doc.text(clientName.length > 22 ? clientName.substring(0, 20) + ".." : clientName, 100, currentY + 4.2);
    
    doc.text(s.paymentMethod.toUpperCase(), 145, currentY + 4.2);
    doc.text(`RD$ ${(s.itbis || 0).toFixed(0)}`, 170, currentY + 4.2, { align: "right" });
    doc.text(`RD$ ${s.total.toFixed(0)}`, 198, currentY + 4.2, { align: "right" });
    
    currentY += 5;
  });
  
  // Skip to closures report
  if (currentY > 210) {
    doc.addPage();
    currentY = 20;
  } else {
    currentY += 10;
  }
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(5, 150, 105);
  doc.text("HISTORIAL DE CIERRES DIARIOS REGISTRADOS", 15, currentY);
  currentY += 4;
  
  // Table Header Closures
  doc.setFillColor(241, 245, 249);
  doc.rect(15, currentY, 186, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  
  doc.text("Código Cierre", 17, currentY + 4);
  doc.text("Fecha Cierre", 50, currentY + 4);
  doc.text("Cant. Ventas", 85, currentY + 4, { align: "right" });
  doc.text("Volumen Facturado RD$", 130, currentY + 4, { align: "right" });
  doc.text("Ganancias Estimadas RD$", 198, currentY + 4, { align: "right" });
  
  currentY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  
  let totalClosuresVolume = 0;
  let totalClosuresProfit = 0;
  
  closures.forEach((c) => {
    if (currentY > 265) {
      doc.addPage();
      currentY = 20;
      doc.setFillColor(241, 245, 249);
      doc.rect(15, currentY, 186, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text("Código Cierre", 17, currentY + 4);
      doc.text("Fecha Cierre", 50, currentY + 4);
      doc.text("Cant. Ventas", 85, currentY + 4, { align: "right" });
      doc.text("Volumen Facturado RD$", 130, currentY + 4, { align: "right" });
      doc.text("Ganancias Estimadas RD$", 198, currentY + 4, { align: "right" });
      currentY += 6;
    }
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    
    // Row divider
    doc.setDrawColor(241, 245, 249);
    doc.line(15, currentY, 201, currentY);
    
    totalClosuresVolume += c.totalSales;
    totalClosuresProfit += c.totalProfit;
    
    doc.text(c.id, 17, currentY + 4.2);
    doc.text(new Date(c.date).toLocaleDateString("es-DO") + " " + new Date(c.date).toLocaleTimeString("es-DO", { hour12: false }).substring(0, 5), 50, currentY + 4.2);
    doc.text(c.salesCount.toString(), 85, currentY + 4.2, { align: "right" });
    doc.text(`RD$ ${c.totalSales.toLocaleString("es-DO")}`, 130, currentY + 4.2, { align: "right" });
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 118, 110);
    doc.text(`RD$ ${c.totalProfit.toLocaleString("es-DO")}`, 198, currentY + 4.2, { align: "right" });
    
    currentY += 5;
  });
  
  if (currentY > 225) {
    doc.addPage();
    currentY = 20;
  }
  
  currentY += 6;
  doc.setFillColor(248, 250, 252);
  doc.rect(15, currentY, 186, 20, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 118, 110);
  doc.text("BENEFICIO ACUMULADO Y REGLAS DE CONTROL FINANCIERO", 20, currentY + 6);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Ventas Totales (Período): RD$ ${totalSalesSum.toLocaleString("es-DO")}`, 20, currentY + 13);
  doc.text(`Impuestos Emitidos: RD$ ${totalItbisSum.toLocaleString("es-DO")}`, 85, currentY + 13);
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(5, 150, 105);
  doc.text(`TOTAL GANANCIA (CIERRES): RD$ ${totalClosuresProfit.toLocaleString("es-DO")}`, 140, currentY + 13);
  
  return doc.output("blob");
}

export function generateReceiptsListPDF(receipts: CustomReceipt[], config: BusinessConfig): Blob {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  
  // Header box
  doc.setFillColor(219, 39, 119); // pink-600
  doc.rect(15, 15, 186, 26, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(config.name.toUpperCase(), 20, 24);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`RNC: ${config.rnc} | Tel: ${config.phone} | Dirección: ${config.address}`, 20, 29);
  doc.setFont("helvetica", "bold");
  doc.text("REPORTE OFICIAL DE COMPROBANTES DE PAGOS, ABONOS Y FINANCIAMIENTOS", 20, 35);
  
  let currentY = 49;
  
  // Meta Info
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha del Reporte: ${new Date().toLocaleString("es-DO")}`, 15, currentY);
  doc.text(`Comprobantes Emitidos: ${receipts.length}`, 120, currentY);
  currentY += 6;
  
  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(15, currentY, 186, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  
  doc.text("No. Recibo", 17, currentY + 5);
  doc.text("Clasificación / Tipo", 42, currentY + 5);
  doc.text("Fecha", 78, currentY + 5);
  doc.text("Cliente Beneficiario", 102, currentY + 5);
  doc.text("Descripción del Producto", 145, currentY + 5);
  doc.text("Monto Recaudado", 198, currentY + 5, { align: "right" });
  
  currentY += 7;
  
  let totalReceiptsSum = 0;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  
  receipts.forEach((r) => {
    if (currentY > 255) {
      doc.addPage();
      currentY = 20;
      doc.setFillColor(241, 245, 249);
      doc.rect(15, currentY, 186, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text("No. Recibo", 17, currentY + 5);
      doc.text("Clasificación / Tipo", 42, currentY + 5);
      doc.text("Fecha", 78, currentY + 5);
      doc.text("Cliente Beneficiario", 102, currentY + 5);
      doc.text("Descripción del Producto", 145, currentY + 5);
      doc.text("Monto Recaudado", 198, currentY + 5, { align: "right" });
      currentY += 7;
    }
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    
    // Draw row divider line
    doc.setDrawColor(241, 245, 249);
    doc.line(15, currentY, 201, currentY);
    
    const amountVal = r.totalAmount || 0;
    totalReceiptsSum += amountVal;
    
    doc.text(r.receiptNumber, 17, currentY + 4.5);
    doc.text((r.type || "Abono").toUpperCase(), 42, currentY + 4.5);
    doc.text(new Date(r.date || Date.now()).toLocaleDateString("es-DO"), 78, currentY + 4.5);
    
    const nameVal = r.clientName ? r.clientName.toUpperCase() : "N/A";
    doc.text(nameVal.length > 18 ? nameVal.substring(0, 16) + ".." : nameVal, 102, currentY + 4.5);
    
    const prodDesc = r.productDescription ? r.productDescription.toUpperCase() : "PAGO GENERAL";
    doc.text(prodDesc.length > 22 ? prodDesc.substring(0, 20) + ".." : prodDesc, 145, currentY + 4.5);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(190, 24, 74);
    doc.text(`RD$ ${amountVal.toLocaleString("es-DO")}`, 198, currentY + 4.5, { align: "right" });
    
    currentY += 5.5;
  });
  
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }
  
  currentY += 5;
  doc.setFillColor(248, 250, 252);
  doc.rect(15, currentY, 186, 20, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(219, 39, 119);
  doc.text("RESUMEN DE FONDOS RECAUDADOS POR COMPROBANTES DE PAGOS", 20, currentY + 6);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Cantidad de Documentos Emitidos: ${receipts.length} recibos.`, 20, currentY + 13);
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(219, 39, 119);
  doc.text(`VALOR TOTAL RECAUDADO MONTO: RD$ ${totalReceiptsSum.toLocaleString("es-DO")}`, 115, currentY + 13);
  
  return doc.output("blob");
}
