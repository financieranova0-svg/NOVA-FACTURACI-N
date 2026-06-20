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
}

export interface CartItem {
  product: Product;
  quantity: number;
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

export type NcfType = "B01" | "B02" | "NINGUNO"; // B01 = Fiscal Credit, B02 = Final Consumer

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
  status: "active" | "suspended";
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
