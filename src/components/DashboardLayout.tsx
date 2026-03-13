import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

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
            <span className="ml-3 text-sm font-medium text-muted-foreground">{title} — Março 2026</span>
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
