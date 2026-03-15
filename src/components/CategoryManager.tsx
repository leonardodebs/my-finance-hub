import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Tag, Loader2 } from "lucide-react";
import { useCategories, useAddCategory, useDeleteCategory } from "@/hooks/useFinance";
import { toast } from "sonner";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_REVENUE_CATEGORIES } from "@/data/financeData";

export function CategoryManager() {
  const { data: customCategories = [], isLoading } = useCategories();
  const addCategoryMutation = useAddCategory();
  const deleteCategoryMutation = useDeleteCategory();

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"expense" | "revenue">("expense");

  const handleAdd = () => {
    if (!newName.trim()) return;
    
    // Check if it's already a default category
    const defaults = newType === "expense" ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_REVENUE_CATEGORIES;
    if (defaults.some(c => c.toLowerCase() === newName.trim().toLowerCase())) {
        toast.error("Esta já é uma categoria padrão do sistema.");
        return;
    }

    addCategoryMutation.mutate({ name: newName.trim(), type: newType }, {
      onSuccess: () => {
        setNewName("");
        toast.success("Categoria adicionada!");
      },
      onError: () => toast.error("Erro ao adicionar categoria.")
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Deseja excluir esta categoria?")) {
      deleteCategoryMutation.mutate(id, {
        onSuccess: () => toast.success("Categoria removida."),
        onError: () => toast.error("Erro ao remover categoria.")
      });
    }
  };

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center gap-2 text-primary font-semibold border-b border-border pb-2">
        <Tag className="h-4 w-4" />
        Minhas Categorias Personalizadas
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input 
          placeholder="Nome da categoria..." 
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1"
        />
        <div className="flex gap-2">
          <select 
            value={newType}
            onChange={(e) => setNewType(e.target.value as any)}
            className="bg-muted rounded-lg px-3 py-2 text-sm outline-none border-border border"
          >
            <option value="expense">Despesa</option>
            <option value="revenue">Receita</option>
          </select>
          <Button onClick={handleAdd} disabled={addCategoryMutation.isPending} className="gap-2">
            {addCategoryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Criar
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2 tracking-wider">Despesas</h3>
          <div className="flex flex-wrap gap-2">
            {customCategories.filter(c => c.type === "expense").map(c => (
              <Badge key={c.id} variant="secondary" className="pl-3 pr-1 py-1 gap-2 bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                {c.name}
                <button onClick={() => handleDelete(c.id)} className="hover:text-red-800 transition-colors">
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {customCategories.filter(c => c.type === "expense").length === 0 && (
              <p className="text-xs text-muted-foreground italic">Nenhuma categoria personalizada de despesa.</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2 tracking-wider">Receitas</h3>
          <div className="flex flex-wrap gap-2">
            {customCategories.filter(c => c.type === "revenue").map(c => (
              <Badge key={c.id} variant="secondary" className="pl-3 pr-1 py-1 gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                {c.name}
                <button onClick={() => handleDelete(c.id)} className="hover:text-emerald-800 transition-colors">
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {customCategories.filter(c => c.type === "revenue").length === 0 && (
              <p className="text-xs text-muted-foreground italic">Nenhuma categoria personalizada de receita.</p>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 bg-muted/50 rounded-lg border border-border">
        <p className="text-xs text-muted-foreground">
          <strong>Dica:</strong> As categorias acima serão exibidas nos formulários de transações além das categorias padrão do sistema.
        </p>
      </div>
    </div>
  );
}
