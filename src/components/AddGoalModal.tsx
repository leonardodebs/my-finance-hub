import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Goal } from "@/data/financeData";
import { Button } from "./ui/button";
import { Wallet, Plane, TrendingUp, Car, Home, Gift, Shield, Target } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (g: Omit<Goal, "id">) => void;
}

const icons = [
  { name: "wallet", icon: Wallet, color: "text-blue-500", bg: "bg-blue-500/10" },
  { name: "plane", icon: Plane, color: "text-purple-500", bg: "bg-purple-500/10" },
  { name: "trendingup", icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10" },
  { name: "car", icon: Car, color: "text-orange-500", bg: "bg-orange-500/10" },
  { name: "home", icon: Home, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { name: "gift", icon: Gift, color: "text-pink-500", bg: "bg-pink-500/10" },
  { name: "shield", icon: Shield, color: "text-teal-500", bg: "bg-teal-500/10" },
  { name: "target", icon: Target, color: "text-red-500", bg: "bg-red-500/10" },
];

export function AddGoalModal({ open, onClose, onAdd }: Props) {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("0");
  const [selectedIcon, setSelectedIcon] = useState(icons[0]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !target) return;
    setSaving(true);
    setTimeout(() => {
      onAdd({
        title,
        current_amount: parseFloat(current),
        target_amount: parseFloat(target),
        icon: selectedIcon.name,
        color: selectedIcon.color,
        bg_color: selectedIcon.bg,
      });
      setTitle("");
      setTarget("");
      setCurrent("0");
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
            <h2 className="text-lg font-semibold mb-4">Nova Meta</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Título da Meta</label>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Ex: Reserva de Emergência"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Valor Alvo (R$)</label>
                  <input
                    type="number"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Já Guardado (R$)</label>
                  <input
                    type="number"
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Ícone e Cor</label>
                <div className="flex flex-wrap gap-3">
                  {icons.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setSelectedIcon(item)}
                      className={`p-3 rounded-lg flex items-center justify-center transition-all ${
                        selectedIcon.name === item.name 
                          ? `${item.bg} ring-2 ring-primary scale-110` 
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      <item.icon className={`h-5 w-5 ${item.color}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="ghost" type="button" onClick={onClose} className="flex-1">Cancelar</Button>
                <Button type="submit" disabled={saving || !title || !target} className="flex-1">
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
