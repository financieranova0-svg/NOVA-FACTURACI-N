import { useState, FormEvent } from "react";
import { User, Phone, DollarSign, Plus, RotateCcw, ShieldAlert, Sparkles, Check, CheckCircle2, Trash2 } from "lucide-react";
import { Client, PaymentRecord } from "../types";

interface ClientsProps {
  clients: Client[];
  onAddClient: (client: Client) => void;
  onUpdateClientDebt: (clientId: string, debtDelta: number) => void;
  onDeleteClient?: (clientId: string) => void;
}

export default function Clients({ clients, onAddClient, onUpdateClientDebt, onDeleteClient }: ClientsProps) {
  // New Client Form
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [rnc, setRnc] = useState("");
  const [creditLimit, setCreditLimit] = useState("5000");

  // Deletion inline confirm trigger
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

  // Payment to debt modal
  const [payingClientId, setPayingClientId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  
  // Local list of payment records for auditing
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  const handleCreateClientSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newClient: Client = {
      id: `cli-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim() || "S/N",
      rnc: rnc.trim() || undefined,
      creditLimit: parseFloat(creditLimit) || 0,
      currentDebt: 0
    };

    onAddClient(newClient);

    // Reset Form
    setName("");
    setPhone("");
    setRnc("");
    setCreditLimit("5000");
    setShowForm(false);
  };

  const handleDebtPaymentSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!payingClientId || !paymentAmount) return;

    const client = clients.find((c) => c.id === payingClientId);
    if (!client) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Error: Introduce un monto de abono válido mayor que 0.");
      return;
    }

    if (amount > client.currentDebt) {
      alert(`Error: El abono (RD$${amount}) no puede ser mayor que la deuda del cliente (RD$${client.currentDebt}).`);
      return;
    }

    // Deduct debt by providing a negative delta
    onUpdateClientDebt(payingClientId, -amount);

    // Save payment record for listing logs
    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      clientId: payingClientId,
      date: new Date().toISOString(),
      amount,
      note: "Abono directo recibido en caja"
    };

    setPayments((prev) => [newPayment, ...prev]);
    setPaymentAmount("");
    setPayingClientId(null);
  };

  // Exclude client generic for debt tracking
  const activeCreditClients = clients.filter((c) => c.id !== "cli-generico");

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-extrabold text-slate-800">Cuaderno de Crédito y Clientes</h2>
          <p className="text-xs text-slate-500">
            Control de cuentas por cobrar ("Fiado"), abonos en efectivo, límites y comprobantes fiscales (RNC) de sus compradores recurrentes.
          </p>
        </div>

        <button
          id="btn-toggle-client-form"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Cerrar Registro" : "Registrar Nuevo Cliente"}
        </button>
      </div>

      {/* Creation form trigger slide */}
      {showForm && (
        <form 
          id="add-client-form"
          onSubmit={handleCreateClientSubmit}
          className="bg-slate-50 border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <div className="col-span-full border-b border-slate-200 pb-2 mb-1">
            <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Ficha Técnica de Cliente</h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Nombre Completo</label>
            <input
              id="new-client-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Doña Carmen Almonte"
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Número de Celular</label>
            <input
              id="new-client-phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej: 809-555-0199"
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">RNC / Cédula (Factura de Crédito)</label>
            <input
              id="new-client-rnc"
              type="text"
              value={rnc}
              onChange={(e) => setRnc(e.target.value)}
              placeholder="Ej: 131234567"
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Límite de Crédito Fiado (RD$)</label>
            <input
              id="new-client-credit-limit"
              type="number"
              required
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              placeholder="5000"
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            />
          </div>

          <div className="col-span-full text-right pt-3 border-t border-slate-200/50">
            <button
              id="btn-submit-new-client"
              type="submit"
              className="px-6 py-2 bg-slate-900 border border-slate-800 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Dar de Alta Cliente
            </button>
          </div>
        </form>
      )}

      {/* Main Ledger grid list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Active Credit Clients Cards List */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Listado de Créditos Habituales</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activeCreditClients.map((client) => {
              const debtPercent = Math.min((client.currentDebt / client.creditLimit) * 100, 100);
              const isCloseToOverdraft = debtPercent >= 80;
              const hasAvailableCredit = client.creditLimit - client.currentDebt;
              
              return (
                <div 
                  id={`client-card-${client.id}`}
                  key={client.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    {/* Customer overview header */}
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">{client.name}</h4>
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                          <Phone className="h-2.5 w-2.5 text-slate-350" />
                          {client.phone}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {client.rnc && (
                          <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                            RNC: {client.rnc}
                          </span>
                        )}

                        {deletingClientId === client.id ? (
                          <div className="flex items-center gap-1 bg-red-50 border border-red-200 p-1 px-1.5 rounded animate-fade-in text-[9px]">
                            <span className="text-red-700 font-bold">¿Borrar?</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (client.currentDebt > 0) {
                                  alert("Oops: Este cliente posee balance deudor activo. Debe saldar o abonar a RD$0.00 antes de proceder a la eliminación física.");
                                  setDeletingClientId(null);
                                } else {
                                  onDeleteClient?.(client.id);
                                  setDeletingClientId(null);
                                }
                              }}
                              className="px-1.5 py-0.5 bg-red-650 hover:bg-red-700 text-white font-extrabold rounded-md cursor-pointer transition text-[9px]"
                            >
                              Sí
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingClientId(null)}
                              className="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-600 font-extrabold rounded-md cursor-pointer hover:bg-slate-50 transition text-[9px]"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeletingClientId(client.id)}
                            title="Eliminar Cliente"
                            className="p-1 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Fiao Progress Visual Indicator */}
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                        <span>Límite de Fiado</span>
                        <span className="font-mono text-slate-600">RD${client.creditLimit.toFixed(0)}</span>
                      </div>
                      
                      {/* Bar filled according to real current debt */}
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden relative border border-slate-100">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCloseToOverdraft ? "bg-red-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${debtPercent}%` }}
                        ></div>
                      </div>

                      <div className="flex justify-between text-[10px] pt-1">
                        <span className="text-slate-400">Balance Deudor:</span>
                        <span className={`font-mono font-extrabold ${client.currentDebt > 0 ? "text-red-500" : "text-emerald-600"}`}>
                          RD${client.currentDebt.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons inside card */}
                  <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      Disponibilidad: <b className="text-slate-600 font-mono">RD${hasAvailableCredit.toFixed(0)}</b>
                    </span>

                    {client.currentDebt > 0 ? (
                      <button
                        id={`btn-pay-debt-${client.id}`}
                        onClick={() => {
                          setPayingClientId(client.id);
                          setPaymentAmount("");
                        }}
                        className="px-2.5 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-[10.5px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                      >
                        <DollarSign className="h-3 w-3" />
                        Registrar Abono
                      </button>
                    ) : (
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded font-bold inline-flex items-center gap-1 select-none">
                        <Check className="h-3 w-3" />
                        Al día
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {activeCreditClients.length === 0 && (
              <div className="col-span-full bg-slate-50 border border-dashed border-slate-200 rounded-xl py-12 text-center text-slate-400">
                Aún no has registrado clientes fijos. ¡Pulsa Registrar para dar de alta en tu colmado!
              </div>
            )}
          </div>
        </div>

        {/* Audit payment Logs (Installment history) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs self-start">
          <h3 className="text-xs font-extrabold text-slate-450 uppercase tracking-widest mb-3">Historial de Abonos Recibidos</h3>
          
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {payments.map((p) => {
              const payer = clients.find((c) => c.id === p.clientId);
              return (
                <div 
                  id={`payment-log-${p.id}`}
                  key={p.id} 
                  className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 flex items-start gap-2.5"
                >
                  <div className="p-1 bg-emerald-100 text-emerald-700 rounded-full shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-xs truncate max-w-[130px] text-slate-800">
                        {payer?.name || "Desconocido"}
                      </span>
                      <span className="text-[9px] text-emerald-700 font-extrabold font-mono">
                        + RD${p.amount}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      Recibido: {new Date(p.date).toLocaleDateString()} {new Date(p.date).toLocaleTimeString([], {hour: "2-digit", minute:"2-digit"})}
                    </p>
                  </div>
                </div>
              );
            })}

            {payments.length === 0 && (
              <p className="text-[10px] text-slate-400 text-center py-8">
                No se han registrado abonos de deuda en esta sesión todavía.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Credit Settlement input Popup */}
      {payingClientId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <form 
            id="debt-payment-form"
            onSubmit={handleDebtPaymentSubmit}
            className="w-full max-w-sm overflow-hidden bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-4"
          >
            <div>
              <h3 className="font-extrabold text-sm text-slate-850">Abonar a Cuenta</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Cliente: <b className="text-slate-700 font-bold">{clients.find((c) => c.id === payingClientId)?.name}</b>
              </p>
              <span className="inline-block mt-2 bg-red-50 text-red-650 px-2.5 py-0.5 rounded text-[10.5px] font-bold">
                Deuda Pendiente: RD${clients.find((c) => c.id === payingClientId)?.currentDebt}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Monto en Efectivo Abonado (RD$)</label>
              <input
                id="payment-amount-input"
                type="number"
                step="0.01"
                required
                max={clients.find((c) => c.id === payingClientId)?.currentDebt || 0}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Ej. 500"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <button
                id="cancel-debt-payment"
                type="button"
                onClick={() => setPayingClientId(null)}
                className="px-4 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600 transition cursor-pointer"
              >
                Cerrar
              </button>
              
              <button
                id="submit-debt-payment"
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Aplicar Abono Sólido
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
