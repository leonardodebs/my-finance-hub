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
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-3 gap-6"
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
      initial="hidden"
      animate="show"
    >
      {/* Revenue */}
      <motion.div variants={item} className="rounded-xl p-6 shadow-sm border border-emerald-200 dark:border-emerald-900/30 bg-emerald-50 dark:bg-[#07241A]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-emerald-700 dark:text-emerald-400 text-sm font-medium tracking-wide uppercase">Receitas</span>
          <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <p className="text-3xl font-bold tracking-tight text-emerald-950 dark:text-white mt-1">
          {formatCurrency(totalRevenue)}
        </p>
      </motion.div>

      {/* Expenses */}
      <motion.div variants={item} className="rounded-xl p-6 shadow-sm border border-rose-200 dark:border-rose-900/30 bg-rose-50 dark:bg-[#2C1113]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-rose-700 dark:text-rose-400 text-sm font-medium tracking-wide uppercase">Despesas</span>
          <div className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
            <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
        </div>
        <p className="text-3xl font-bold tracking-tight text-rose-950 dark:text-white mt-1">
          {formatCurrency(totalExpenses)}
        </p>
      </motion.div>

      {/* Balance */}
      <motion.div variants={item} className="rounded-xl p-6 shadow-sm border border-indigo-200 dark:border-indigo-900/30 bg-indigo-50 dark:bg-[#1A1231]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-indigo-700 dark:text-indigo-400 text-sm font-medium tracking-wide uppercase">Saldo</span>
          <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
            <Wallet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
        <p className="text-3xl font-bold tracking-tight text-indigo-950 dark:text-white mt-1">
          {formatCurrency(currentBalance)}
        </p>
      </motion.div>
    </motion.div>
  );
}
