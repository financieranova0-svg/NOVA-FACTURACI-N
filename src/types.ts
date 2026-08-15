export interface Product {
  id: string;
  name: string;
  price: number;
  costPrice: number; // Cost of purchase (buying cost)
  stock: number;
  barcode: string;
  category: string;
  itbisRate: 0 | 18 | 16 | 8; // DR ITBIS rates (0 for exempt, 18 for standard, 16, 8)
  minStock?: number;
  financingPrice?: number; // Optional financing price
}

export interface CartItem {
  product: Product;
  quantity: number;
  customPrice?: number; // Optional modified unit price (rebaja / descuento por ítem)
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  rnc?: string; // For invoices with fiscal credit
  creditLimit: number;
  currentDebt: number; // For "fiado" / accounts receivable
}

export type PaymentMethod = "Efectivo" | "Tarjeta" | "Transferencia" | "Crédito" | "Fiado";

export type NcfType = "B01" | "B02" | "E31" | "E32" | "NINGUNO"; // B01 = Fiscal Credit, B02 = Final Consumer, E31 = Electronic Fiscal Credit, E32 = Electronic Consumer

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  itbis: number;
  total: number;
  client?: Client;
  paymentMethod: PaymentMethod;
  ncfType: NcfType;
  ncfCode?: string; // E.g., B0200000123
  receivedAmount?: number;
  changeAmount?: number;
  note?: string;
  serviceFeeAmount?: number;
  serviceFeeDescription?: string;
  isServiceFeeReal?: boolean;
  // e-CF (Electronic Invoicing DGII) fields
  ecfType?: "E31" | "E32" | "E33" | "E34" | "E41" | "E43" | "E44" | "E45";
  ecfCode?: string; // e.g. E310000000001
  ecfStatus?: "Sin Enviar" | "Aceptado" | "Rechazado" | "Aceptado con Observaciones";
  ecfResponseCode?: string;
  ecfResponseMsg?: string;
  ecfSignedXml?: string;
  ecfAcuseRecibo?: string;
  ecfSentDate?: string;
}

export interface PaymentRecord {
  id: string;
  clientId: string;
  date: string;
  amount: number;
  note?: string;
}

export interface DailyClosure {
  id: string;
  date: string;
  totalSales: number;
  totalProfit: number;
  salesCount: number;
  soldItemsSummary: string;
}

export interface AppUser {
  email: string;
  phone?: string;
  bypassPhone: boolean;
  createdAt: string;
  expiresAt: string; // ISO date string or "forever"
  status: "active" | "suspended" | "expired";
  lastLoginAt?: string;
  businessName?: string;
}

export interface CustomReceipt {
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
  businessName?: string;
  
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
  status?: "Activo" | "Finalizado";
  productId?: string;
  financedItems?: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    productId?: string;
  }[];
}
