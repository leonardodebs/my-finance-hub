import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getTransactions, saveTransactions, deleteTransaction, formatCurrency, type Transaction } from "@/data/financeData";
import { Plus, Loader2, Trash2 } from "lucide-react";
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
      className="bg-card rounded-xl p-6 card-shadow"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.5 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-muted-foreground">Transações Recentes</h2>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium h-9 px-3 rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all duration-200"
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="pb-3 font-medium">Descrição</th>
              <th className="pb-3 font-medium hidden sm:table-cell">Categoria</th>
              <th className="pb-3 font-medium hidden md:table-cell tabular-nums">Data</th>
              <th className="pb-3 font-medium text-right">Valor</th>
              <th className="pb-3 font-medium text-right w-10"></th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {sorted.map((t) => (
                <motion.tr
                  key={t.id}
                  className={`border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${
                    t.isNew ? "animate-flash-green" : ""
                  }`}
                  initial={t.isNew ? { opacity: 0, y: -8 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <td className="py-3 font-medium text-foreground">{t.description}</td>
                  <td className="py-3 text-muted-foreground hidden sm:table-cell">{t.category}</td>
                  <td className="py-3 text-muted-foreground hidden md:table-cell tabular-nums text-xs">
                    {new Date(t.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </td>
                  <td className={`py-3 text-right tabular-nums font-medium ${
                    t.type === "revenue" ? "text-revenue" : "text-expense"
                  }`}>
                    {t.type === "revenue" ? "+" : "−"}{formatCurrency(t.amount)}
                  </td>
                  <td className="py-3 text-right">
                    <button 
                      onClick={() => handleDelete(t.id)}
                      className="text-muted-foreground hover:text-expense p-1 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <AddTransactionModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={handleAdd} />
    </motion.div>
  );
}
