import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SummaryCards } from "@/components/SummaryCards";
import { ExpenseChart } from "@/components/ExpenseChart";
import { BudgetStatus } from "@/components/BudgetStatus";
import { TransactionList } from "@/components/TransactionList";
import { RevenueVsExpenseChart } from "@/components/RevenueVsExpenseChart";

import { useEffect, useState, useMemo } from "react";
import { calculateTotals, type Transaction } from "@/data/financeData";
import { useTransactions, useAddTransaction } from "@/hooks/useFinance";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddTransactionModal } from "@/components/AddTransactionModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";

const Index = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: txns = [], isLoading, isError } = useTransactions();
  const addTransactionMutation = useAddTransaction();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = 2023; // Início razoável
    const yearsArray = [];
    for (let y = currentYear + 1; y >= startYear; y--) {
      yearsArray.push(y);
    }
    return yearsArray;
  }, []);

  const currentMonthTxns = useMemo(() => {
    return txns.filter(t => {
      const d = new Date(t.date);
      return d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear;
    });
  }, [txns, selectedMonth, selectedYear]);

  const data = useMemo(() => calculateTotals(currentMonthTxns), [currentMonthTxns]);
  const monthlyTxns = currentMonthTxns;

  const handleAdd = async (t: Omit<Transaction, "id">) => {
    addTransactionMutation.mutate(t, {
      onSuccess: () => {
        setModalOpen(false);
      }
    });
  };

  if (isLoading) {
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-white mb-1">Finanças Pessoais</h1>
          <div className="flex items-center gap-3 text-muted-foreground">
            <p className="text-sm">Visão geral de</p>
            <div className="flex items-center gap-2">
              <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(parseInt(val))}>
                <SelectTrigger className="h-8 w-[130px] bg-transparent border-none p-0 focus:ring-0 font-medium text-primary">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m, i) => (
                    <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                <SelectTrigger className="h-8 w-[80px] bg-transparent border-none p-0 focus:ring-0 font-medium text-primary">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <Button 
          variant="outline"
          className="bg-card text-foreground hover:bg-accent dark:bg-white dark:text-black dark:hover:bg-gray-100 font-medium gap-2 transition-colors duration-200"
          onClick={() => setModalOpen(true)}
        >
          <Plus className="h-4 w-4" /> Nova Transação
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
