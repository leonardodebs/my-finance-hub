const API_URL = "http://localhost:3001/api";

const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  
  if (response.status === 401 || response.status === 403) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Acesso negado');
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Erro na requisição');
  }

  return response;
};

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}

export const getAdminUsers = async (): Promise<AdminUser[]> => {
  const response = await apiFetch('/admin/users');
  return await response.json();
};

export const updateAdminUser = async (id: string, userData: Partial<AdminUser>): Promise<AdminUser> => {
  const response = await apiFetch(`/admin/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(userData),
  });
  return await response.json();
};

export const deleteAdminUser = async (id: string): Promise<boolean> => {
  const response = await apiFetch(`/admin/users/${id}`, { method: "DELETE" });
  return response.ok;
};
