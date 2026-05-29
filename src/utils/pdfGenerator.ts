import { jsPDF } from "jspdf";
import { Sale } from "../types";

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
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: format === "thermal" ? [80, 200] : "a4"
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
      currentY += 19;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Efectivo Recibido: RD$ ${sale.receivedAmount.toFixed(0)} | Devuelto: RD$ ${sale.changeAmount.toFixed(0)}`, 193, currentY, { align: "right" });
    }

    // Terms note
    currentY += 12;
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
