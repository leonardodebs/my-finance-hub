import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { formatCurrency } from "@/data/financeData";

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

interface SummaryCardsProps {
  totalRevenue: number;
  totalExpenses: number;
  currentBalance: number;
}

export function SummaryCards({ totalRevenue, totalExpenses, currentBalance }: SummaryCardsProps) {
  const netFlow = totalRevenue - totalExpenses;

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
      initial="hidden"
      animate="show"
    >
      {/* Balance */}
      <motion.div variants={item} className="bg-card rounded-xl p-6 card-shadow sm:col-span-1">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <Wallet className="h-4 w-4" />
          Saldo Atual
        </div>
        <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
          {formatCurrency(currentBalance)}
        </p>
      </motion.div>

      {/* Revenue */}
      <motion.div variants={item} className="bg-card rounded-xl p-6 card-shadow">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <TrendingUp className="h-4 w-4 text-revenue" />
          Receitas do Mês
        </div>
        <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
          {formatCurrency(totalRevenue)}
        </p>
      </motion.div>

      {/* Expenses */}
      <motion.div variants={item} className="bg-card rounded-xl p-6 card-shadow">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <TrendingDown className="h-4 w-4 text-expense" />
          Despesas do Mês
        </div>
        <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
          {formatCurrency(totalExpenses)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Saldo: <span className={netFlow >= 0 ? "text-revenue" : "text-expense"}>{formatCurrency(netFlow)}</span>
        </p>
      </motion.div>
    </motion.div>
  );
}
