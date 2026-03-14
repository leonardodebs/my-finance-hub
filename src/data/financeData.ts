// Finance Hub Data Service

export interface Transaction {
  id: string;
  description: string;
  category: string;
  amount: number;
  type: "revenue" | "expense";
  date: string;
  isNew?: boolean;
}

export interface Goal {
  id: string;
  title: string;
  current_amount: number;
  target_amount: number;
  icon: string;
  color: string;
  bg_color: string;
}

export interface Budget {
  id: string;
  category: string;
  limit_amount: number;
  spent: number;
  icon: string;
}

export interface CategoryExpense {
  category: string;
  amount: number;
}

const API_URL = "http://localhost:3001/api";

const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  
  // Interceptor de Segurança: se o token espirar ou faltar, desloga a pessoa
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Não Autorizado');
  }

  return response;
};

// TRANSACTIONS
export const getTransactions = async (): Promise<Transaction[]> => {
  try {
    const response = await apiFetch('/transactions');
    if (!response.ok) throw new Error("Failed to fetch transactions");
    return await response.json();
  } catch (err) {
    console.error("Error fetching transactions:", err);
    return [];
  }
};

export const saveTransactions = async (txn: Omit<Transaction, "id">): Promise<Transaction | null> => {
  try {
    const response = await apiFetch('/transactions', {
      method: "POST",
      body: JSON.stringify(txn),
    });
    if (!response.ok) throw new Error("Failed to save transaction");
    return await response.json();
  } catch (err) {
    console.error("Error saving transaction:", err);
    return null;
  }
};

export const deleteTransaction = async (id: string): Promise<boolean> => {
  try {
    const response = await apiFetch(`/transactions/${id}`, { method: "DELETE" });
    return response.ok;
  } catch (err) {
    console.error("Error deleting transaction:", err);
    return false;
  }
};

export const updateTransaction = async (id: string, txn: Omit<Transaction, "id">): Promise<Transaction | null> => {
  try {
    const response = await apiFetch(`/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(txn),
    });
    if (!response.ok) throw new Error("Failed to update transaction");
    return await response.json();
  } catch (err) {
    console.error("Error updating transaction:", err);
    return null;
  }
};

// BUDGETS
export const getBudgets = async (): Promise<Budget[]> => {
  try {
    const response = await apiFetch('/budgets');
    if (!response.ok) throw new Error("Failed to fetch budgets");
    return await response.json();
  } catch (err) {
    console.error("Error fetching budgets:", err);
    return [];
  }
};

export const saveBudget = async (budget: Omit<Budget, "id" | "spent">): Promise<Budget | null> => {
  try {
    const response = await apiFetch('/budgets', {
      method: "POST",
      body: JSON.stringify(budget),
    });
    if (!response.ok) throw new Error("Failed to save budget");
    return await response.json();
  } catch (err) {
    console.error("Error saving budget:", err);
    return null;
  }
};

export const deleteBudget = async (id: string): Promise<boolean> => {
  try {
    const response = await apiFetch(`/budgets/${id}`, { method: "DELETE" });
    return response.ok;
  } catch (err) {
    console.error("Error deleting budget:", err);
    return false;
  }
};

// GOALS
export const getGoals = async (): Promise<Goal[]> => {
  try {
    const response = await apiFetch('/goals');
    if (!response.ok) throw new Error("Failed to fetch goals");
    return await response.json();
  } catch (err) {
    console.error("Error fetching goals:", err);
    return [];
  }
};

export const saveGoal = async (goal: Omit<Goal, "id">): Promise<Goal | null> => {
  try {
    const response = await apiFetch('/goals', {
      method: "POST",
      body: JSON.stringify(goal),
    });
    if (!response.ok) throw new Error("Failed to save goal");
    return await response.json();
  } catch (err) {
    console.error("Error saving goal:", err);
    return null;
  }
};

export const deleteGoal = async (id: string): Promise<boolean> => {
  try {
    const response = await apiFetch(`/goals/${id}`, { method: "DELETE" });
    return response.ok;
  } catch (err) {
    console.error("Error deleting goal:", err);
    return false;
  }
};

// SETTINGS
export interface UserSettings {
  name: string;
  email: string;
  budget_alerts: boolean;
  weekly_summary: boolean;
  dark_mode: boolean;
}

export const getSettings = async (): Promise<UserSettings> => {
  try {
    const response = await apiFetch('/settings');
    if (!response.ok) throw new Error("Failed to fetch settings");
    return await response.json();
  } catch (err) {
    console.error("Error fetching settings:", err);
    return {
      name: "Usuário",
      email: "...",
      budget_alerts: true,
      weekly_summary: true,
      dark_mode: false
    };
  }
};

export const saveSettings = async (settings: UserSettings): Promise<UserSettings | null> => {
  try {
    const response = await apiFetch('/settings', {
      method: "POST",
      body: JSON.stringify(settings),
    });
    if (!response.ok) throw new Error("Failed to save settings");
    return await response.json();
  } catch (err) {
    console.error("Error saving settings:", err);
    return null;
  }
};

// HELPERS
export const calculateTotals = (txns: Transaction[]) => {
  const revenue = txns.filter(t => t.type === 'revenue').reduce((acc, t) => acc + Number(t.amount), 0);
  const expenses = txns.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
  
  const byCategoryMap = txns.filter(t => t.type === 'expense').reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
    return acc;
  }, {} as Record<string, number>);

  const byCategory = Object.entries(byCategoryMap).map(([category, amount]) => ({
    category,
    amount
  })).sort((a, b) => b.amount - a.amount);

  return {
    totalRevenue: revenue,
    totalExpenses: expenses,
    currentBalance: revenue - expenses,
    categoryExpenses: byCategory
  };
};

export const calculateMonthlyComparison = (txns: Transaction[]) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const lastMonth = lastMonthDate.getMonth();
  const lastMonthYear = lastMonthDate.getFullYear();

  const currentMonthTxns = txns.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const lastMonthTxns = txns.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
  });

  const currentRevenue = currentMonthTxns.filter(t => t.type === 'revenue').reduce((acc, t) => acc + Number(t.amount), 0);
  const currentExpenses = currentMonthTxns.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
  
  const lastRevenue = lastMonthTxns.filter(t => t.type === 'revenue').reduce((acc, t) => acc + Number(t.amount), 0);
  const lastExpenses = lastMonthTxns.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);

  return {
    current: { revenue: currentRevenue, expenses: currentExpenses },
    last: { revenue: lastRevenue, expenses: lastExpenses },
    diff: {
      revenue: lastRevenue === 0 ? 100 : ((currentRevenue - lastRevenue) / lastRevenue) * 100,
      expenses: lastExpenses === 0 ? 100 : ((currentExpenses - lastExpenses) / lastExpenses) * 100
    }
  };
};

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
