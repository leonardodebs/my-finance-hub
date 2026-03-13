import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { formatCurrency } from "@/data/financeData";

interface MonthlyComparisonProps {
  data: {
    current: { revenue: number, expenses: number };
    last: { revenue: number, expenses: number };
    diff: { revenue: number, expenses: number };
  }
}

export function MonthlyComparison({ data }: MonthlyComparisonProps) {
  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Comparativo Mensal</h3>
      
      <div className="space-y-6">
        {/* Revenue Comparison */}
        <div>
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-xs text-muted-foreground">Receitas</p>
              <p className="text-xl font-bold">{formatCurrency(data.current.revenue)}</p>
            </div>
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${data.diff.revenue >= 0 ? 'bg-revenue/10 text-revenue' : 'bg-expense/10 text-expense'}`}>
              {data.diff.revenue >= 0 ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
              {Math.abs(Math.round(data.diff.revenue))}%
            </div>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-revenue transition-all duration-500" 
              style={{ width: `${Math.min(100, (data.current.revenue / (data.last.revenue || data.current.revenue || 1)) * 50)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Mês anterior: {formatCurrency(data.last.revenue)}</p>
        </div>

        {/* Expenses Comparison */}
        <div>
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-xs text-muted-foreground">Despesas</p>
              <p className="text-xl font-bold">{formatCurrency(data.current.expenses)}</p>
            </div>
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${data.diff.expenses <= 0 ? 'bg-revenue/10 text-revenue' : 'bg-expense/10 text-expense'}`}>
              {data.diff.expenses > 0 ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
              {Math.abs(Math.round(data.diff.expenses))}%
            </div>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-expense transition-all duration-500" 
              style={{ width: `${Math.min(100, (data.current.expenses / (data.last.expenses || data.current.expenses || 1)) * 50)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Mês anterior: {formatCurrency(data.last.expenses)}</p>
        </div>
      </div>
    </div>
  );
}
