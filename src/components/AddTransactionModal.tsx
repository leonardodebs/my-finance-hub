import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Transaction } from "@/data/financeData";
import { X, Calendar as CalendarIcon } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (t: Omit<Transaction, "id">) => void;
}

const expenseCategories = [
  "Cartão crédito", 
  "Combustível", 
  "Alimentação", 
  "Supermercado", 
  "Carro",
  "Corte cabelo", 
  "Vivo celulares", 
  "Internet casa", 
  "Compras online", 
  "Estacionamento", 
  "Casa",
  "Vestuário", 
  "Farmácia", 
  "Dividas",
  "Presentes",
  "Viagens",
  "Educação",
  "Lazer",
  "Outros"
];
const revenueCategories = ["Salário", "Freelance", "Investimentos", "Outros"];

export function AddTransactionModal({ open, onClose, onAdd }: Props) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"revenue" | "expense">("expense");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);

  const activeCategories = type === "revenue" ? revenueCategories : expenseCategories;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amount || !category) return;
    setSaving(true);
    setTimeout(() => {
      onAdd({
        description: desc,
        category,
        amount: parseFloat(amount),
        type,
        date,
      });
      setDesc("");
      setAmount("");
      setType("expense");
      setCategory("");
      setDate(new Date().toISOString().slice(0, 10));
      setObs("");
      setSaving(false);
    }, 400);
  };

  const handleTypeChange = (newType: "revenue" | "expense") => {
    setType(newType);
    setCategory("");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            className="relative bg-card dark:bg-[#1E2336] rounded-xl p-6 w-full max-w-md shadow-2xl border border-border dark:border-indigo-900/30"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            
            <h2 className="text-xl font-semibold tracking-tight text-foreground dark:text-white mb-6">Nova Transação</h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => handleTypeChange("expense")}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-all border ${
                    type === "expense" 
                      ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20" 
                      : "bg-transparent text-muted-foreground border-border hover:bg-muted/50"
                  }`}
                >
                  Despesa
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange("revenue")}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-all border ${
                    type === "revenue" 
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20" 
                      : "bg-transparent text-muted-foreground border-border hover:bg-muted/50"
                  }`}
                >
                  Receita
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5 block">Descrição</label>
                <input
                  autoFocus
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-white dark:bg-[#0F121E] border border-gray-200 dark:border-indigo-900/40 rounded-lg px-3 py-2 text-sm text-foreground dark:text-white outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                  placeholder="Ex: Supermercado"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5 block">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-white dark:bg-[#0F121E] border border-gray-200 dark:border-indigo-900/40 rounded-lg px-3 py-2 text-sm text-foreground dark:text-white tabular-nums outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5 block">Data</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-white dark:bg-[#0F121E] border border-gray-200 dark:border-indigo-900/40 rounded-lg pl-3 pr-10 py-2 text-sm text-foreground dark:text-white outline-none focus:ring-2 focus:ring-primary/50 transition-shadow appearance-none"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                      <CalendarIcon className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5 block">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white dark:bg-[#0F121E] border border-gray-200 dark:border-indigo-900/40 rounded-lg px-3 py-2 text-sm text-foreground dark:text-white outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                >
                  <option value="" disabled>Selecione...</option>
                  {activeCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5 block">Observações</label>
                <textarea
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  rows={2}
                  className="w-full bg-white dark:bg-[#0F121E] border border-gray-200 dark:border-indigo-900/40 rounded-lg px-3 py-2 text-sm text-foreground dark:text-white outline-none focus:ring-2 focus:ring-primary/50 transition-shadow resize-none"
                  placeholder="Opcional..."
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving || !desc || !amount}
                  className="w-full h-11 rounded-lg text-sm font-medium bg-[#828B9A] hover:bg-[#6c7582] dark:bg-[#475569] dark:hover:bg-[#334155] text-white transition-all duration-200 disabled:opacity-50"
                >
                  {saving ? (
                    <span className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Salvar Transação"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
