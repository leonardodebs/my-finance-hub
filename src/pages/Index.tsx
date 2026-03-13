import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SummaryCards } from "@/components/SummaryCards";
import { ExpenseChart } from "@/components/ExpenseChart";
import { BudgetStatus } from "@/components/BudgetStatus";
import { TransactionList } from "@/components/TransactionList";
import { MonthlyComparison } from "@/components/MonthlyComparison";

import { useEffect, useState } from "react";
import { getTransactions, calculateTotals, calculateMonthlyComparison, type Transaction } from "@/data/financeData";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReturnType<typeof calculateTotals>>({
    totalRevenue: 0,
    totalExpenses: 0,
    currentBalance: 0,
    categoryExpenses: [],
  });
  const [comparison, setComparison] = useState<ReturnType<typeof calculateMonthlyComparison>>({
    current: { revenue: 0, expenses: 0 },
    last: { revenue: 0, expenses: 0 },
    diff: { revenue: 0, expenses: 0 }
  });

  useEffect(() => {
    const load = async () => {
      const txns = await getTransactions();
      setData(calculateTotals(txns));
      setComparison(calculateMonthlyComparison(txns));
      setLoading(false);
    };
    load();

    const handleTransactionChange = () => {
      load();
    };

    window.addEventListener('transactionsChanged', handleTransactionChange);
    return () => window.removeEventListener('transactionsChanged', handleTransactionChange);
  }, []);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SummaryCards 
        totalRevenue={data.totalRevenue} 
        totalExpenses={data.totalExpenses} 
        currentBalance={data.currentBalance} 
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ExpenseChart data={data.categoryExpenses} />
        </div>
        <div>
          <MonthlyComparison data={comparison} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetStatus />
        <TransactionList />
      </div>
    </div>
  );
};

export default Index;
