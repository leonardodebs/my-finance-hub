import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getTransactions, 
  saveTransactions, 
  deleteTransaction, 
  getBudgets, 
  saveBudget, 
  deleteBudget,
  getGoals,
  saveGoal,
  deleteGoal,
  getSettings,
  saveSettings,
  type Transaction,
  type Budget,
  type Goal,
  type UserSettings
} from '@/data/financeData';

// --- TRANSACTIONS ---
export const useTransactions = () => {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: getTransactions,
  });
};

export const useAddTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (txn: Omit<Transaction, 'id'>) => saveTransactions(txn),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] }); // Updates budget spent amounts
    },
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
};

// --- BUDGETS ---
export const useBudgets = () => {
  return useQuery({
    queryKey: ['budgets'],
    queryFn: getBudgets,
  });
};

export const useAddBudget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (budget: Omit<Budget, 'id' | 'spent'>) => saveBudget(budget),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
};

export const useDeleteBudget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
};

// --- GOALS ---
export const useGoals = () => {
  return useQuery({
    queryKey: ['goals'],
    queryFn: getGoals,
  });
};

export const useAddGoal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goal: Omit<Goal, 'id'>) => saveGoal(goal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
};

export const useDeleteGoal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
};

// --- SETTINGS ---
export const useSettings = () => {
  return useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });
};

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: UserSettings) => saveSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
};
