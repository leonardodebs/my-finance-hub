import { useState } from "react";
import { motion } from "framer-motion";
import { formatCurrency, type Budget } from "@/data/financeData";
import { useBudgets, useAddBudget, useDeleteBudget } from "@/hooks/useFinance";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { PlusCircle, Info, Loader2, Trash2, Utensils, Film, Car, Home, Target } from "lucide-react";
import { AddBudgetModal } from "@/components/AddBudgetModal";

const iconMap: Record<string, React.ElementType> = {
  utensils: Utensils,
  film: Film,
  car: Car,
  home: Home
};

export default function Budgets() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: budgets = [], isLoading: loading } = useBudgets();
  const addBudgetMutation = useAddBudget();
  const deleteBudgetMutation = useDeleteBudget();

  const handleAdd = async (b: Omit<Budget, "id" | "spent">) => {
    addBudgetMutation.mutate(b, {
      onSuccess: () => {
        setModalOpen(false);
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deseja realmente excluir este orçamento?")) {
      deleteBudgetMutation.mutate(id);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orçamentos</h1>
          <p className="text-muted-foreground">Acompanhe seus limites de gastos por categoria.</p>
        </div>
        <Button className="gap-2" onClick={() => setModalOpen(true)}>
          <PlusCircle className="h-4 w-4" />
          Novo Limite
        </Button>
      </div>

      <AddBudgetModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onAdd={handleAdd} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.map((budget, index) => {
          const percent = Math.min(Math.round((budget.spent / budget.limit_amount) * 100), 100);
          const isNearLimit = percent > 85;
          const isOverLimit = Number(budget.spent) > Number(budget.limit_amount);
          const Icon = iconMap[budget.icon] || Target;

          return (
            <motion.div
              key={budget.id}
              className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-all"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                <div>
                  <h3 className="font-semibold">{budget.category}</h3>
                  <p className="text-xs text-muted-foreground">Mensal</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-expense" onClick={() => handleDelete(budget.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Info className="h-4 w-4" />
                </Button>
              </div>
            </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Gasto</span>
                  <span className={`font-medium ${isOverLimit ? "text-expense" : ""}`}>
                    {formatCurrency(budget.spent)}
                  </span>
                </div>
                
                <Progress 
                  value={percent} 
                  className="h-2" 
                  indicatorClassName={isOverLimit ? "bg-expense" : isNearLimit ? "bg-yellow-500" : "bg-primary"}
                />

                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${percent > 90 ? "text-expense" : "text-muted-foreground"}`}>
                    {percent}% usado
                  </span>
                  <span className="text-muted-foreground">
                    Limite: {formatCurrency(budget.limit_amount)}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

    </div>
  );
}
