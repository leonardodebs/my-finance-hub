import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SummaryCards } from "@/components/SummaryCards";
import { ExpenseChart } from "@/components/ExpenseChart";
import { BudgetStatus } from "@/components/BudgetStatus";
import { TransactionList } from "@/components/TransactionList";
import { RevenueVsExpenseChart } from "@/components/RevenueVsExpenseChart";

import { useEffect, useState } from "react";
import { getTransactions, saveTransactions, calculateTotals, type Transaction } from "@/data/financeData";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddTransactionModal } from "@/components/AddTransactionModal";

const Index = () => {
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [data, setData] = useState<ReturnType<typeof calculateTotals>>({
    totalRevenue: 0,
    totalExpenses: 0,
    currentBalance: 0,
    categoryExpenses: [],
  });
  const [monthlyTxns, setMonthlyTxns] = useState<Transaction[]>([]);

  useEffect(() => {
    const load = async () => {
      const txns = await getTransactions();
      setData(calculateTotals(txns));
      setMonthlyTxns(txns);
      setLoading(false);
    };
    load();

    const handleTransactionChange = () => {
      load();
    };

    window.addEventListener('transactionsChanged', handleTransactionChange);
    return () => window.removeEventListener('transactionsChanged', handleTransactionChange);
  }, []);

  const handleAdd = async (t: Omit<Transaction, "id">) => {
    const saved = await saveTransactions(t);
    if (saved) {
      setModalOpen(false);
      window.dispatchEvent(new Event('transactionsChanged'));
    }
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Finanças Pessoais</h1>
          <p className="text-muted-foreground text-sm">Visão geral do mês atual</p>
        </div>
        <Button 
          variant="outline"
          className="bg-white text-black hover:bg-gray-100 font-medium gap-2 transition-colors duration-200"
          onClick={() => setModalOpen(true)}
        >
          <Plus className="h-4 w-4 text-black" /> Nova Transação
        </Button>
      </div>

      <SummaryCards 
        totalRevenue={data.totalRevenue} 
        totalExpenses={data.totalExpenses} 
        currentBalance={data.currentBalance} 
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueVsExpenseChart transactions={monthlyTxns} />
        <ExpenseChart data={data.categoryExpenses} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TransactionList />
        <BudgetStatus />
      </div>

      <AddTransactionModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={handleAdd} />
    </div>
  );
};

export default Index;
