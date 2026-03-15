import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import React, { Suspense, lazy } from "react";
import { ThemeProvider } from "next-themes";
import { DateProvider } from "@/contexts/DateContext";

// Lazy-loaded pages
const Index = lazy(() => import("./pages/Index.tsx"));
const Transactions = lazy(() => import("./pages/Transactions.tsx"));
const Budgets = lazy(() => import("./pages/Budgets.tsx"));
const Goals = lazy(() => import("./pages/Goals.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));
const Login = lazy(() => import("./pages/Login.tsx"));
const Register = lazy(() => import("./pages/Register.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
import { DashboardLayout } from "./components/DashboardLayout.tsx";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <DateProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Carregando...</div>}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/registro" element={<Register />} />
                
                <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                  <Route path="/" element={<Index />} />
                  <Route path="/transacoes" element={<Transactions />} />
                  <Route path="/orcamentos" element={<Budgets />} />
                  <Route path="/metas" element={<Goals />} />
                  <Route path="/configuracoes" element={<Settings />} />
                </Route>
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </DateProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
