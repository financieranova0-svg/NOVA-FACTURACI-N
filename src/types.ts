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
