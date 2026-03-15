import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { User, Bell, Shield, Palette, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { type UserSettings } from "@/data/financeData";
import { useSettings, useUpdateSettings } from "@/hooks/useFinance";
import { useTheme } from "next-themes";
import { AdminSection } from "@/components/AdminSection";
import { CategoryManager } from "@/components/CategoryManager";

export default function Settings() {
  const { setTheme } = useTheme();
  const { data: serverSettings, isLoading: loading } = useSettings();
  const updateSettingsMutation = useUpdateSettings();
  
  const [settings, setSettings] = useState<UserSettings>({
    name: "Leonardo",
    email: "leonardo@exemplo.com",
    budget_alerts: true,
    weekly_summary: true,
    dark_mode: false,
  });

  const currentUserStr = localStorage.getItem("user");
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  const isAdmin = currentUser?.is_admin === true;

  useEffect(() => {
    if (serverSettings) {
      setSettings(serverSettings);
      setTheme(serverSettings.dark_mode ? "dark" : "light");
    }
  }, [serverSettings, setTheme]);

  const handleSave = async () => {
    updateSettingsMutation.mutate(settings, {
      onSuccess: () => {
        toast.success("Configurações salvas com sucesso!");
      },
      onError: () => {
        toast.error("Erro ao salvar configurações.");
      }
    });
  };

  const updateSetting = (key: keyof UserSettings, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (key === "dark_mode") {
      setTheme(value ? "dark" : "light");
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
    <div className="max-w-3xl space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Gerencie sua conta e preferências do aplicativo.</p>
        </div>
        <Button 
          className="hidden sm:flex gap-2" 
          onClick={handleSave} 
          disabled={updateSettingsMutation.isPending}
        >
          {updateSettingsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Tudo
        </Button>
      </div>

      <motion.div 
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary font-semibold border-b border-border pb-2">
            <User className="h-4 w-4" />
            Perfil
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input 
                id="name" 
                value={settings.name} 
                onChange={(e) => updateSetting("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input 
                id="email" 
                type="email"
                value={settings.email} 
                onChange={(e) => updateSetting("email", e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 pt-4">
          <div className="flex items-center gap-2 text-primary font-semibold border-b border-border pb-2">
            <Bell className="h-4 w-4" />
            Notificações
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="budget-alerts">Alertas de Orçamento</Label>
                <p className="text-xs text-muted-foreground">Receba avisos quando atingir 80% do limite.</p>
              </div>
              <Switch 
                id="budget-alerts"
                checked={settings.budget_alerts} 
                onCheckedChange={(checked) => updateSetting("budget_alerts", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="weekly-summary">Resumo Semanal</Label>
                <p className="text-xs text-muted-foreground">E-mail com o balanço da sua semana.</p>
              </div>
              <Switch 
                id="weekly-summary"
                checked={settings.weekly_summary} 
                onCheckedChange={(checked) => updateSetting("weekly_summary", checked)}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 pt-4">
          <div className="flex items-center gap-2 text-primary font-semibold border-b border-border pb-2">
            <Palette className="h-4 w-4" />
            Aparência
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dark-mode">Modo Escuro</Label>
              <p className="text-xs text-muted-foreground">Alterar o tema visual do aplicativo.</p>
            </div>
            <Switch 
              id="dark-mode"
              checked={settings.dark_mode} 
              onCheckedChange={(checked) => updateSetting("dark_mode", checked)}
            />
          </div>
        </section>

        <section className="space-y-4 pt-4">
          <CategoryManager />
        </section>

        <section className="space-y-4 pt-4">
          <div className="flex items-center gap-2 text-primary font-semibold border-b border-border pb-2 text-expense">
            <Shield className="h-4 w-4" />
            Segurança
          </div>
          <Button variant="destructive">Excluir Conta</Button>
        </section>

        {isAdmin && <AdminSection />}

        <div className="flex sm:hidden pt-4">
          <Button 
            className="w-full gap-2" 
            onClick={handleSave} 
            disabled={updateSettingsMutation.isPending}
          >
            {updateSettingsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Alterações
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
