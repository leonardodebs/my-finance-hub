import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getBudgets, formatCurrency, type Budget } from "@/data/financeData";

export function BudgetStatus() {
  const [budgets, setBudgets] = useState<Budget[]>([]);

  useEffect(() => {
    getBudgets().then(setBudgets);
  }, []);

  if (budgets.length === 0) return null;

  return (
    <motion.div
      className="bg-card rounded-xl p-6 card-shadow"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
    >
      <h2 className="text-sm font-medium text-muted-foreground mb-4">Orçamentos</h2>
      <div className="space-y-4">
        {budgets.map((b) => {
          const pct = Math.min((b.spent / b.limit_amount) * 100, 100);
          const isOver = b.spent > b.limit_amount;
          return (
            <div key={b.category}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">
                  {b.icon} {b.category}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {formatCurrency(b.spent)} / {formatCurrency(b.limit_amount)}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isOver ? "bg-expense" : "bg-primary"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
