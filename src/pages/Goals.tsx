import { useState } from "react";
import { motion } from "framer-motion";
import { formatCurrency, type Goal } from "@/data/financeData";
import { useGoals, useAddGoal, useDeleteGoal } from "@/hooks/useFinance";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, Wallet, Plane, Car, Home, Gift, Loader2, Trash2 } from "lucide-react";
import { AddGoalModal } from "@/components/AddGoalModal";

const iconMap: Record<string, React.ElementType> = {
  Wallet, Plane, TrendingUp, Car, Home, Gift, Target
};

export default function Goals() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: goals = [], isLoading: loading } = useGoals();
  const addGoalMutation = useAddGoal();
  const deleteGoalMutation = useDeleteGoal();

  const handleAdd = async (g: Omit<Goal, "id">) => {
    addGoalMutation.mutate(g, {
      onSuccess: () => setModalOpen(false)
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deseja realmente excluir esta meta?")) {
      deleteGoalMutation.mutate(id);
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
          <h1 className="text-2xl font-bold tracking-tight">Metas</h1>
          <p className="text-muted-foreground">Planeje e acompanhe seus objetivos de longo prazo.</p>
        </div>
        <Button className="gap-2" onClick={() => setModalOpen(true)}>
          <Target className="h-4 w-4" />
          Nova Meta
        </Button>
      </div>

      <AddGoalModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onAdd={handleAdd} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((goal, index) => {
          const percent = Math.round((Number(goal.current_amount) / Number(goal.target_amount)) * 100);
          const Icon = iconMap[goal.icon] || Wallet;
          
          return (
            <motion.div
              key={goal.id}
              className="bg-card p-6 rounded-xl border border-border"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${goal.bg_color} ${goal.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{goal.title}</h3>
                    <p className="text-sm text-muted-foreground">Meta de economia</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-expense"
                  onClick={() => handleDelete(goal.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground font-medium">{percent}% concluído</span>
                  <span className="font-semibold">{formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}</span>
                </div>
                <Progress value={percent} className="h-3" />
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Restante</p>
                    <p className="font-semibold">{formatCurrency(Number(goal.target_amount) - Number(goal.current_amount))}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Previsão</p>
                    <p className="font-semibold">6 meses</p>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

    </div>
  );
}
