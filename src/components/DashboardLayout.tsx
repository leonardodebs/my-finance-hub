import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useDateFilter } from "@/contexts/DateContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const routeNames: Record<string, string> = {
  "/": "Visão Geral",
  "/transacoes": "Transações",
  "/orcamentos": "Orçamentos",
  "/metas": "Metas",
  "/configuracoes": "Configurações",
};

export function DashboardLayout() {
  const location = useLocation();
  const [title, setTitle] = useState("Finance Hub");
  const { selectedMonth, setSelectedMonth, selectedYear, setSelectedYear, months, years } = useDateFilter();

  useEffect(() => {
    setTitle(routeNames[location.pathname] || "Finance Hub");
  }, [location.pathname]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border px-4 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
            <SidebarTrigger />
            <div className="ml-3 flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <span>{title}</span>
              <span className="mx-1">—</span>
              <div className="flex items-center gap-0">
                <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(parseInt(val))}>
                  <SelectTrigger className="h-8 border-none p-1 focus:ring-0 text-primary font-semibold hover:bg-muted/50 rounded-md transition-colors w-auto gap-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m, i) => (
                      <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                  <SelectTrigger className="h-8 border-none p-1 focus:ring-0 text-primary font-semibold hover:bg-muted/50 rounded-md transition-colors w-auto gap-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-6xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
