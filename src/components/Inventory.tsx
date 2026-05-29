import { useState, FormEvent } from "react";
import { Plus, Search, Table, Grid, RotateCcw, PenTool, Check, AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import { Product } from "../types";
import { INITIAL_CATEGORIES } from "../data";

interface InventoryProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
  onUpdateFullProductList: (updatedProducts: Product[]) => void;
  onDeleteProduct: (productId: string) => void;
}

export default function Inventory({ products, onAddProduct, onUpdateFullProductList, onDeleteProduct }: InventoryProps) {
  // New product form states
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stock, setStock] = useState("");
  const [barcode, setBarcode] = useState("");
  const [category, setCategory] = useState(INITIAL_CATEGORIES[0]);
  const [itbisRate, setItbisRate] = useState<0 | 8 | 16 | 18>(0);
  const [minStock, setMinStock] = useState("5");

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  // Quick edit stock state
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [quickStockValue, setQuickStockValue] = useState("");
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  const triggerBarcodeGen = () => {
    // Generates a proper Dominican retail format EAN-13 simulator code
    const generated = "746" + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    setBarcode(generated);
  };

  const handleCreateProductSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price || !stock || !barcode.trim()) return;

    // Check if barcode already exists
    if (products.some((p) => p.barcode === barcode.trim())) {
      alert("Error: Este código de barras ya está registrado en otro producto.");
      return;
    }

    const priceNum = parseFloat(price);
    const costPriceNum = parseFloat(costPrice) || 0;

    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      name: name.trim(),
      price: priceNum,
      costPrice: costPriceNum,
      stock: parseInt(stock, 10),
      barcode: barcode.trim(),
      category,
      itbisRate,
      minStock: parseInt(minStock, 10) || 5
    };

    onAddProduct(newProduct);
    
    // Reset form
    setName("");
    setPrice("");
    setCostPrice("");
    setStock("");
    setBarcode("");
    setCategory(INITIAL_CATEGORIES[0]);
    setItbisRate(0);
    setMinStock("5");
    setShowForm(false);
  };

  const startQuickEditStock = (product: Product) => {
    setEditingProductId(product.id);
    setQuickStockValue(product.stock.toString());
  };

  const saveQuickStock = (productId: string) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        return {
          ...p,
          stock: parseInt(quickStockValue, 10) || 0
        };
      }
      return p;
    });
    onUpdateFullProductList(updated);
    setEditingProductId(null);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.barcode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "Todos" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalInventoryCost = products.reduce((acc, p) => acc + (p.stock * (p.costPrice || 0)), 0);
  const totalInventoryValue = products.reduce((acc, p) => acc + (p.stock * p.price), 0);
  const estProfit = totalInventoryValue - totalInventoryCost;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Banner stats and actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-extrabold text-slate-800">Catálogo de Inventario</h2>
          <p className="text-xs text-slate-500">Maneja stock, costos de compra, precios de venta, alertas y tasas dominicanas (ITBIS).</p>
        </div>

        <button
          id="btn-toggle-product-form"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Cerrar Formulario" : "Ingresar Nuevo Producto"}
        </button>
      </div>

      {/* Evaluation summary dashboard widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
          <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Inversión en Inventario (Costo total)</div>
          <div className="text-base font-extrabold text-slate-750 font-mono mt-0.5">RD$ {totalInventoryCost.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <span className="text-[9px] text-slate-400">Sumatoria de stock x precio de costo</span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
          <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Valor Estimado de Venta</div>
          <div className="text-base font-extrabold text-emerald-700 font-mono mt-0.5">RD$ {totalInventoryValue.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <span className="text-[9px] text-emerald-600">Sumatoria de stock x precio de venta</span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
          <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Ganancia Potencial Estimada</div>
          <div className="text-base font-extrabold text-blue-700 font-mono mt-0.5">RD$ {estProfit.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <span className="text-[9px] text-blue-600">Diferencia neta proyectada</span>
        </div>
      </div>

      {/* Creation form trigger slide */}
      {showForm && (
        <form 
          id="add-product-form"
          onSubmit={handleCreateProductSubmit}
          className="bg-slate-50 border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <div className="col-span-full border-b border-slate-200 pb-2 mb-1">
            <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Detalles del Nuevo Producto</h3>
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1">Nombre Comercial del Producto (Ej. Refresco Cola)</label>
            <input
              id="new-product-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Arroz Selecto La Garza (10 Lb)"
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Categoría</label>
            <select
              id="new-product-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {INITIAL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Código de Barras (Manual o generar)</label>
            <div className="flex gap-2">
              <input
                id="new-product-barcode"
                type="text"
                required
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="746XXXXXXXXXX"
                className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
              <button
                id="btn-generate-barcode"
                type="button"
                onClick={triggerBarcodeGen}
                className="px-2.5 py-2 bg-slate-800 text-slate-100 hover:bg-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                title="Generar código de barras"
              >
                Generar
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Costo de Compra (RD$ / DOP)</label>
            <input
              id="new-product-costprice"
              type="number"
              step="0.01"
              required
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="0.00"
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Precio de Venta (RD$ / DOP)</label>
            <input
              id="new-product-price"
              type="number"
              step="0.01"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Stock de Inicio (Cantidad física)</label>
            <input
              id="new-product-stock"
              type="number"
              required
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="0"
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Stock Mínimo (Alerta de aviso)</label>
            <input
              id="new-product-minstock"
              type="number"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              placeholder="5"
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">ITBIS Aplicable en R.D.</label>
            <select
              id="new-product-itbis"
              value={itbisRate}
              onChange={(e) => setItbisRate(Number(e.target.value) as any)}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
            >
              <option value="0">0% (Comida Básica / Exento)</option>
              <option value="8">8% (Tasa Reducida)</option>
              <option value="16">16% (Tasa Especial)</option>
              <option value="18">18% (ITBIS General Estándar)</option>
            </select>
          </div>

          <div className="col-span-full md:col-start-4 text-right pt-3 border-t border-slate-200/50">
            <button
              id="btn-submit-new-product"
              type="submit"
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Registrar Producto en Sistema
            </button>
          </div>
        </form>
      )}

      {/* Live catalog cataloger filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Controls block */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="w-full md:w-80 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              id="search-inventory-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o código..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 max-w-full">
            <button
              id="cat-inv-todos"
              onClick={() => setSelectedCategory("Todos")}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition shrink-0 ${
                selectedCategory === "Todos"
                  ? "bg-slate-800 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Todos
            </button>
            {INITIAL_CATEGORIES.map((cat) => (
              <button
                id={`cat-inv-${cat.replace(/\s+/g, '-').toLowerCase()}`}
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition shrink-0 ${
                  selectedCategory === cat
                    ? "bg-slate-800 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold">Código Barras</th>
                <th className="py-3 px-4 font-bold">Nombre del Producto</th>
                <th className="py-3 px-4 font-bold">Categoría</th>
                <th className="py-3 px-4 font-bold text-right">Costo RD$</th>
                <th className="py-3 px-4 font-bold text-right">Venta RD$</th>
                <th className="py-3 px-4 font-bold">ITBIS</th>
                <th className="py-3 px-4 font-bold text-center">Defensa (Min)</th>
                <th className="py-3 px-4 font-bold text-center">Stock Físico</th>
                <th className="py-3 px-4 font-bold text-right">Operaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700 bg-white">
              {filteredProducts.map((p) => {
                const isUnderStock = p.stock <= (p.minStock || 5);
                const isOutOfStock = p.stock <= 0;
                const evaluatedCost = p.costPrice || 0;
                
                return (
                  <tr 
                    id={`inv-row-${p.barcode}`}
                    key={p.id} 
                    className={`hover:bg-slate-50/50 transition duration-100 ${
                      isOutOfStock ? "bg-red-50/20" : isUnderStock ? "bg-amber-50/25" : ""
                    }`}
                  >
                    <td className="py-2.5 px-4 font-mono select-all text-slate-600 font-bold">
                      {p.barcode}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-800">{p.name}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono text-[10px]">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-500 font-semibold">
                      RD${evaluatedCost.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-emerald-700 font-mono">
                      RD${p.price.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                        p.itbisRate > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {p.itbisRate > 0 ? `ITBIS ${p.itbisRate}%` : "EXENTO"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono text-slate-400 font-bold">
                      {p.minStock || 5}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {editingProductId === p.id ? (
                        <div className="flex justify-center items-center gap-1.5">
                          <input
                            id={`quick-stock-edit-${p.id}`}
                            type="number"
                            value={quickStockValue}
                            onChange={(e) => setQuickStockValue(e.target.value)}
                            className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold bg-slate-100 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <button
                            id={`save-quick-stock-${p.id}`}
                            onClick={() => saveQuickStock(p.id)}
                            className="p-1 bg-emerald-600 text-white hover:bg-emerald-500 rounded transition cursor-pointer"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-center items-center gap-2">
                          <span className={`font-mono font-bold ${
                            isOutOfStock 
                              ? "text-red-650 bg-red-100 px-2 py-0.5 rounded" 
                              : isUnderStock 
                                ? "text-amber-600 bg-amber-100 px-2 py-0.5 rounded" 
                                : "text-slate-700"
                          }`}>
                            {p.stock}
                          </span>
                          {isUnderStock && (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" title="Bajo Stock de Alerta" />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {editingProductId === p.id ? (
                        <button
                          id={`cancel-quick-edit-${p.id}`}
                          onClick={() => setEditingProductId(null)}
                          className="text-xs text-slate-500 hover:underline cursor-pointer"
                        >
                          Cancelar
                        </button>
                      ) : deletingProductId === p.id ? (
                        <div className="inline-flex items-center gap-2 bg-red-50 p-1 px-2 rounded-lg border border-red-200 animate-fade-in">
                          <span className="text-[10px] font-extrabold text-red-700 uppercase tracking-tighter">¿Eliminar?</span>
                          <button
                            id={`btn-confirm-delete-${p.id}`}
                            onClick={() => {
                              onDeleteProduct(p.id);
                              setDeletingProductId(null);
                            }}
                            className="p-0.5 px-2 bg-red-650 hover:bg-red-700 text-white font-black text-[9px] rounded uppercase cursor-pointer transition select-none"
                          >
                            Sí
                          </button>
                          <button
                            id={`btn-cancel-delete-${p.id}`}
                            onClick={() => setDeletingProductId(null)}
                            className="p-0.5 px-2 bg-slate-200 hover:bg-slate-300 text-slate-705 font-bold text-[9px] rounded uppercase cursor-pointer transition select-none"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center">
                          <button
                            id={`edit-stock-${p.id}`}
                            onClick={() => {
                              setDeletingProductId(null);
                              startQuickEditStock(p);
                            }}
                            className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-500 font-bold hover:underline cursor-pointer"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Surtir Stock
                          </button>

                          <button
                            id={`delete-product-${p.id}`}
                            onClick={() => {
                              setEditingProductId(null);
                              setDeletingProductId(p.id);
                            }}
                            title="Eliminar del inventario"
                            className="inline-flex items-center gap-1 text-xs text-red-650 hover:text-red-500 font-bold hover:underline cursor-pointer ml-3.5"
                          >
                            <Trash2 className="h-3 w-3" />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Ningún producto encontrado con las descripciones especificadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
