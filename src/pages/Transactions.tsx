import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  getTransactions, 
  deleteTransaction, 
  formatCurrency, 
  type Transaction 
} from "@/data/financeData";
import { exportTransactionsToPDF } from "@/data/pdfExport";
import { 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Loader2, 
  Trash2, 
  Download,
  Calendar,
  FileText
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  subDays, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  startOfYear, 
  isWithinInterval 
} from "date-fns";

type Period = "all" | "7days" | "30days" | "thisMonth" | "lastMonth" | "thisYear";

export default function Transactions() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "revenue" | "expense">("all");
  const [periodFilter, setPeriodFilter] = useState<Period>("all");

  useEffect(() => {
    const load = async () => {
      const data = await getTransactions();
      setTxns(data);
      setLoading(false);
    };
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm("Deseja realmente excluir esta transação?")) {
      const success = await deleteTransaction(id);
      if (success) {
        setTxns(prev => prev.filter(t => t.id !== id));
      }
    }
  };

  const filteredTransactions = [...txns]
    .reverse()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .filter((t) => {
    const tDate = new Date(t.date);
    const now = new Date();

    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || t.type === typeFilter;
    
    let matchesPeriod = true;
    // Fix: Add 1 day to 'now' boundaries to safely include timezone-skewed transactions (e.g. UTC date > local date)
    const safeNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    if (periodFilter === "7days") {
      matchesPeriod = isWithinInterval(tDate, { start: subDays(now, 7), end: safeNow });
    } else if (periodFilter === "30days") {
      matchesPeriod = isWithinInterval(tDate, { start: subDays(now, 30), end: safeNow });
    } else if (periodFilter === "thisMonth") {
      const safeMonthEnd = new Date(endOfMonth(now).getTime() + 24 * 60 * 60 * 1000);
      matchesPeriod = isWithinInterval(tDate, { start: startOfMonth(now), end: safeMonthEnd });
    } else if (periodFilter === "lastMonth") {
      const lastMonth = subMonths(now, 1);
      const safeLastMonthEnd = new Date(endOfMonth(lastMonth).getTime() + 24 * 60 * 60 * 1000);
      matchesPeriod = isWithinInterval(tDate, { start: startOfMonth(lastMonth), end: safeLastMonthEnd });
    } else if (periodFilter === "thisYear") {
      matchesPeriod = isWithinInterval(tDate, { start: startOfYear(now), end: safeNow });
    }

    return matchesSearch && matchesType && matchesPeriod;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transações</h1>
          <p className="text-muted-foreground">Gerencie seu histórico financeiro detalhado.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => exportTransactionsToPDF(filteredTransactions)}>
            <FileText className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por descrição ou categoria..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as Period)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4 opacity-50" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o período</SelectItem>
              <SelectItem value="7days">Últimos 7 dias</SelectItem>
              <SelectItem value="30days">Últimos 30 dias</SelectItem>
              <SelectItem value="thisMonth">Este mês</SelectItem>
              <SelectItem value="lastMonth">Mês passado</SelectItem>
              <SelectItem value="thisYear">Este ano</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex bg-muted p-1 rounded-lg">
            <button 
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${typeFilter === "all" ? "bg-background shadow-sm" : "hover:text-foreground"}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setTypeFilter("revenue")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${typeFilter === "revenue" ? "bg-background shadow-sm text-revenue" : "hover:text-foreground"}`}
            >
              Entradas
            </button>
            <button 
              onClick={() => setTypeFilter("expense")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${typeFilter === "expense" ? "bg-background shadow-sm text-expense" : "hover:text-foreground"}`}
            >
              Saídas
            </button>
          </div>
        </div>
      </div>

      <motion.div 
        className="bg-card rounded-xl border border-border overflow-hidden"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left border-b border-border text-muted-foreground">
                <th className="px-6 py-4 font-medium">Descrição</th>
                <th className="px-6 py-4 font-medium">Categoria</th>
                <th className="px-6 py-4 font-medium">Data</th>
                <th className="px-6 py-4 font-medium text-right">Valor</th>
                <th className="px-6 py-4 font-medium text-right w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${t.type === "revenue" ? "bg-revenue/10 text-revenue" : "bg-expense/10 text-expense"}`}>
                        {t.type === "revenue" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                      </div>
                      <span className="font-medium">{t.description}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                      {t.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground tabular-nums">
                    {new Date(t.date).toLocaleDateString("pt-BR")}
                  </td>
                  <td className={`px-6 py-4 text-right font-semibold tabular-nums ${t.type === "revenue" ? "text-revenue" : "text-expense"}`}>
                    {t.type === "revenue" ? "+" : "−"}{formatCurrency(t.amount)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-expense"
                      onClick={() => handleDelete(t.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredTransactions.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            Nenhuma transação encontrada para o período selecionado.
          </div>
        )}
      </motion.div>
    </div>
  );
}
