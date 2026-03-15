import React, { createContext, useContext, useState, useMemo } from "react";

interface DateContextType {
  selectedMonth: number;
  selectedYear: number;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
  months: string[];
  years: number[];
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export function DateProvider({ children }: { children: React.ReactNode }) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = 2023;
    const yearsArray = [];
    for (let y = currentYear + 1; y >= startYear; y--) {
      yearsArray.push(y);
    }
    return yearsArray;
  }, []);

  return (
    <DateContext.Provider value={{ 
      selectedMonth, 
      selectedYear, 
      setSelectedMonth, 
      setSelectedYear,
      months,
      years
    }}>
      {children}
    </DateContext.Provider>
  );
}

export function useDateFilter() {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error("useDateFilter must be used within a DateProvider");
  }
  return context;
}
