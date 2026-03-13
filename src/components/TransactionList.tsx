import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getTransactions, saveTransactions, deleteTransaction, formatCurrency, type Transaction } from "@/data/financeData";
import { Plus, Loader2, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { AddTransactionModal } from "./AddTransactionModal";

export function TransactionList() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const data = await getTransactions();
      setTxns(data);
      setLoading(false);
    };
    load();
  }, []);

  const sorted = [...txns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleAdd = async (t: Omit<Transaction, "id">) => {
    const saved = await saveTransactions(t);
    if (saved) {
      setTxns((prev) => [{ ...saved, isNew: true }, ...prev]);
      setModalOpen(false);
      window.dispatchEvent(new Event('transactionsChanged'));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deseja realmente excluir esta transação?")) {
      const success = await deleteTransaction(id);
      if (success) {
        setTxns(prev => prev.filter(t => t.id !== id));
        window.dispatchEvent(new Event('transactionsChanged'));
      }
    }
  };

  return (
    <motion.div
      className="rounded-xl p-6 shadow-sm border border-indigo-900/20"
      style={{ backgroundColor: '#0F121E' }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.5 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-white tracking-wide">Transações Recentes</h2>
        <a href="/transacoes" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
          Ver todas &rarr;
        </a>
      </div>

      <div className="space-y-3 mt-4">
        <AnimatePresence>
          {sorted.slice(0, 5).map((t) => (
            <motion.div
              key={t.id}
              className={`flex items-center justify-between p-4 rounded-xl border border-indigo-900/40 bg-[#151928] hover:bg-[#1A1F30] transition-colors ${
                t.isNew ? "animate-flash-green" : ""
              }`}
              initial={t.isNew ? { opacity: 0, y: -8 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-lg flex items-center justify-center ${
                  t.type === "revenue" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                }`}>
                  {t.type === "revenue" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
                <div>
                  <p className="font-semibold text-white/90 text-sm">{t.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.category} &middot; {new Date(t.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className={`font-semibold tabular-nums text-sm ${
                  t.type === "revenue" ? "text-emerald-400" : "text-rose-400"
                }`}>
                  {t.type === "revenue" ? "+ " : "- "}{formatCurrency(t.amount)}
                </span>
                <button 
                  onClick={() => handleDelete(t.id)}
                  className="text-muted-foreground hover:text-rose-400 p-1.5 transition-colors opacity-60 hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {sorted.length === 0 && !loading && (
          <div className="p-8 text-center text-muted-foreground text-sm border border-indigo-900/20 rounded-xl bg-[#151928]">
            Nenhuma transação lançada.
          </div>
        )}
      </div>
    </motion.div>
  );
}
