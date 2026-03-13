import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Transaction } from "@/data/financeData";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (t: Omit<Transaction, "id">) => void;
}

const categories = ["Alimentação", "Moradia", "Transporte", "Lazer", "Saúde", "Educação", "Renda", "Outro"];

export function AddTransactionModal({ open, onClose, onAdd }: Props) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"revenue" | "expense">("expense");
  const [category, setCategory] = useState("Alimentação");
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amount) return;
    setSaving(true);
    setTimeout(() => {
      onAdd({
        description: desc,
        category,
        amount: parseFloat(amount),
        type,
        date: new Date().toISOString().slice(0, 10),
      });
      setDesc("");
      setAmount("");
      setType("expense");
      setCategory("Alimentação");
      setSaving(false);
    }, 400);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative bg-card rounded-xl p-6 w-full max-w-md mx-4 card-shadow"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-lg font-semibold tracking-tight text-foreground mb-4">Nova Transação</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Descrição</label>
                <input
                  autoFocus
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-muted rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-card"
                  placeholder="Ex: Supermercado"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-muted rounded-lg px-3 py-2 text-sm text-foreground tabular-nums outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-card"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Tipo</label>
                  <div className="flex gap-1 bg-muted rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setType("expense")}
                      className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${
                        type === "expense" ? "bg-card text-foreground card-shadow" : "text-muted-foreground"
                      }`}
                    >
                      Despesa
                    </button>
                    <button
                      type="button"
                      onClick={() => setType("revenue")}
                      className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${
                        type === "revenue" ? "bg-card text-foreground card-shadow" : "text-muted-foreground"
                      }`}
                    >
                      Receita
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-muted rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-card"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-10 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-accent transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !desc || !amount}
                  className="flex-1 h-10 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                >
                  {saving ? (
                    <span className="inline-block h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    "Salvar"
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
