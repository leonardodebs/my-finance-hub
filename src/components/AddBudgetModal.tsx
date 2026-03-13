import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Budget } from "@/data/financeData";
import { Button } from "./ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (b: Omit<Budget, "id" | "spent">) => void;
}

const icons = ["🍽️", "🏠", "🚗", "🎬", "💊", "📚", "🛒", "⛽", "💻", "👔", "💆", "🎁"];

export function AddBudgetModal({ open, onClose, onAdd }: Props) {
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  const [icon, setIcon] = useState(icons[0]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !limit) return;
    setSaving(true);
    setTimeout(() => {
      onAdd({
        category,
        limit_amount: parseFloat(limit),
        icon,
      });
      setCategory("");
      setLimit("");
      setSaving(false);
    }, 400);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative bg-card rounded-xl p-6 w-full max-w-md mx-4 card-shadow"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <h2 className="text-lg font-semibold mb-4">Novo Orçamento</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Categoria</label>
                <input
                  autoFocus
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Ex: Lazer"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Limite Mensal (R$)</label>
                <input
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="0,00"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Ícone</label>
                <div className="flex flex-wrap gap-2">
                  {icons.map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIcon(i)}
                      className={`h-10 w-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                        icon === i ? "bg-primary text-primary-foreground scale-110" : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="ghost" type="button" onClick={onClose} className="flex-1">Cancelar</Button>
                <Button type="submit" disabled={saving || !category || !limit} className="flex-1">
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
