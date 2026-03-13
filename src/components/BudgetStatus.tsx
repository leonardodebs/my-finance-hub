import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getBudgets, formatCurrency, type Budget } from "@/data/financeData";

const COLORS = ['#eab308', '#10b981', '#a855f7', '#3b82f6'];

export function BudgetStatus() {
  const [budgets, setBudgets] = useState<Budget[]>([]);

  useEffect(() => {
    getBudgets().then(setBudgets);
  }, []);

  return (
    <motion.div
      className="rounded-xl p-6 shadow-sm border border-border dark:border-indigo-900/20 bg-card dark:bg-[#0F121E]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-medium text-foreground dark:text-white tracking-wide">Orçamento Mensal</h2>
        <a href="/orcamentos" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
          Gerenciar &rarr;
        </a>
      </div>
      
      {budgets.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm border border-border dark:border-indigo-900/20 rounded-xl bg-muted/30 dark:bg-[#151928]">
          Nenhum orçamento definido.
        </div>
      ) : (
        <div className="space-y-6">
          {budgets.map((b, i) => {
            const pct = Math.min((b.spent / b.limit_amount) * 100, 100);
            const isOver = b.spent > b.limit_amount;
            const barColor = isOver ? '#F43F5E' : COLORS[i % COLORS.length];
            return (
              <div key={b.category}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: barColor }} />
                    <span className="text-sm font-medium text-foreground dark:text-white">
                      {b.category}
                    </span>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground font-medium">
                    {formatCurrency(b.spent)} <span className="text-muted-foreground/50">/ {formatCurrency(b.limit_amount)}</span>
                  </span>
                </div>
                <div className="h-1.5 bg-muted dark:bg-[#1E2336] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
