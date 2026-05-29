import { Product, Client } from "./types";

export const INITIAL_CATEGORIES = [
  "Abarrotes",
  "Bebidas",
  "Lácteos y Embutidos",
  "Fruver",
  "Carnes y Pollo",
  "Limpieza y Cuidado",
  "Otros"
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    name: "Arroz Premium Campo (Llb)",
    price: 36.00,
    costPrice: 25.00,
    stock: 250,
    barcode: "7460111166661",
    category: "Abarrotes",
    itbisRate: 0, // Exempt from ITBIS
    minStock: 30
  },
  {
    id: "prod-2",
    name: "Aceite Crisol Dorado 16oz Envasado",
    price: 110.00,
    costPrice: 80.00,
    stock: 45,
    barcode: "7460111122222",
    category: "Abarrotes",
    itbisRate: 18, // Standard DR ITBIS
    minStock: 10
  },
  {
    id: "prod-3",
    name: "Salami Súper Especial Induveca (Lb)",
    price: 145.00,
    costPrice: 105.00,
    stock: 60,
    barcode: "7460111133333",
    category: "Lácteos y Embutidos",
    itbisRate: 18,
    minStock: 8
  },
  {
    id: "prod-4",
    name: "Refresco Coca-Cola 2 Litros",
    price: 95.00,
    costPrice: 68.00,
    stock: 80,
    barcode: "7460012014168", // Genuine Coca Cola barcode or similar
    category: "Bebidas",
    itbisRate: 18,
    minStock: 15
  },
  {
    id: "prod-5",
    name: "Cerveza Presidente Grande 650ml",
    price: 230.00,
    costPrice: 170.00,
    stock: 120,
    barcode: "7460111155555",
    category: "Bebidas",
    itbisRate: 18,
    minStock: 24
  },
  {
    id: "prod-6",
    name: "Leche Milex Líquida Entera 1L",
    price: 85.00,
    costPrice: 60.00,
    stock: 50,
    barcode: "7460111177777",
    category: "Lácteos y Embutidos",
    itbisRate: 0, // Exempt
    minStock: 12
  },
  {
    id: "prod-7",
    name: "Pan de Agua Delicioso (Unidad)",
    price: 10.00,
    costPrice: 7.00,
    stock: 150,
    barcode: "7460111188888",
    category: "Abarrotes",
    itbisRate: 0, // Exempt
    minStock: 20
  },
  {
    id: "prod-8",
    name: "Huevos Criollos Sanut (Docena)",
    price: 120.00,
    costPrice: 85.00,
    stock: 40,
    barcode: "7460111199999",
    category: "Otros",
    itbisRate: 0, // Exempt
    minStock: 5
  },
  {
    id: "prod-9",
    name: "Habichuelas Rojas La Famosa 15oz",
    price: 65.00,
    costPrice: 45.00,
    stock: 90,
    barcode: "7460010022301",
    category: "Abarrotes",
    itbisRate: 0, // Exempt
    minStock: 15
  },
  {
    id: "prod-10",
    name: "Sardinas Paco Fish Salsa de Tomate 15oz",
    price: 90.00,
    costPrice: 63.00,
    stock: 35,
    barcode: "7460111120202",
    category: "Abarrotes",
    itbisRate: 0, // Exempt
    minStock: 8
  },
  {
    id: "prod-11",
    name: "Plátano Verde Barahonero (Unidad)",
    price: 25.00,
    costPrice: 15.00,
    stock: 300,
    barcode: "0000000011111", // Short convenient code
    category: "Fruver",
    itbisRate: 0,
    minStock: 50
  },
  {
    id: "prod-12",
    name: "Pollo Fresco Cibao (Libra)",
    price: 85.00,
    costPrice: 58.00,
    stock: 120,
    barcode: "0000000011222",
    category: "Carnes y Pollo",
    itbisRate: 0,
    minStock: 20
  },
  {
    id: "prod-13",
    name: "Detergente Más Cloro Ace 900g",
    price: 175.00,
    costPrice: 125.00,
    stock: 25,
    barcode: "7460111130303",
    category: "Limpieza y Cuidado",
    itbisRate: 18,
    minStock: 5
  },
  {
    id: "prod-14",
    name: "Jabón Multiuso Hispano",
    price: 45.00,
    costPrice: 30.00,
    stock: 110,
    barcode: "7460111140404",
    category: "Limpieza y Cuidado",
    itbisRate: 18,
    minStock: 10
  }
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: "cli-generico",
    name: "Cliente Contado (Genérico)",
    phone: "N/A",
    creditLimit: 0,
    currentDebt: 0
  },
  {
    id: "cli-1",
    name: "Doña Mercedes Santos",
    phone: "809-555-1234",
    creditLimit: 5000,
    currentDebt: 1250 // Has un "fiado" balance
  },
  {
    id: "cli-2",
    name: "Don Pedrito Méndez",
    phone: "829-333-5678",
    creditLimit: 8000,
    currentDebt: 3400
  },
  {
    id: "cli-3",
    name: "Colmado Hermano Juan (Mayorista)",
    phone: "849-555-4321",
    rnc: "131455642", // DR style RNC (9 digits)
    creditLimit: 25000,
    currentDebt: 0
  },
  {
    id: "cli-4",
    name: "María Altagracia Pérez",
    phone: "809-444-9876",
    creditLimit: 3000,
    currentDebt: 450
  }
];

// NCF Sequences Generator logic
// Electronic billing (Comprobante Fiscal Electrónico) in DR usually starts with 'E' or 'B'
// Standard paper/electronic invoice series start with:
// B01: Crédito Fiscal (business expense deductibles)
// B02: Consumo (standard retail customers)
export function generateNcfCode(type: "B01" | "B02", currentCount: number): string {
  const paddedCount = String(currentCount).padStart(8, "0");
  return `${type}${paddedCount}`;
}
