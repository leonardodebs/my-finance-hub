// Importação de extratos bancários (OFX / CSV)

const API_URL = "/api";

export interface ImportedTransaction {
  date: string;
  description: string;
  category: string;
  amount: number;
  type: "revenue" | "expense";
  fitid: string | null;
  import_hash: string;
  /** Já existe no banco — veio de uma importação anterior. */
  duplicate: boolean;
}

export interface ImportPreview {
  format: "OFX" | "CSV";
  total: number;
  novos: number;
  duplicados: number;
  warnings: string[];
  transactions: ImportedTransaction[];
}

const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleUnauthorized = (response: Response) => {
  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
    throw new Error("Não Autorizado");
  }
};

/**
 * Envia o arquivo e recebe o que o servidor entendeu, sem gravar nada.
 */
export const previewImport = async (file: File): Promise<ImportPreview> => {
  const formData = new FormData();
  formData.append("file", file);

  // Sem Content-Type de propósito: o browser precisa definir o boundary
  // do multipart sozinho. Passar 'application/json' aqui quebraria o upload.
  const response = await fetch(`${API_URL}/import/preview`, {
    method: "POST",
    headers: authHeader(),
    body: formData,
  });

  handleUnauthorized(response);

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Falha ao ler o arquivo");
  }
  return data;
};

/**
 * Grava as transações confirmadas (já com as categorias ajustadas).
 */
export const commitImport = async (
  transactions: ImportedTransaction[]
): Promise<{ inserted: number; skipped: number }> => {
  const response = await fetch(`${API_URL}/import/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ transactions }),
  });

  handleUnauthorized(response);

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Falha ao importar");
  }
  return data;
};
