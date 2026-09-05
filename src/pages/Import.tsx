import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Upload, FileText, Loader2, CheckCircle2, AlertTriangle, ArrowLeft, Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCategories } from "@/hooks/useFinance";
import {
  formatCurrency,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_REVENUE_CATEGORIES,
} from "@/data/financeData";
import {
  previewImport, commitImport, type ImportPreview, type ImportedTransaction,
} from "@/data/importData";

export default function Import() {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [rows, setRows] = useState<ImportedTransaction[]>([]);
  // Índices marcados para importar. Duplicados começam desmarcados.
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { data: categories = [] } = useCategories();

  const expenseCategories = categories.length
    ? categories.filter((c) => c.type === "expense").map((c) => c.name)
    : DEFAULT_EXPENSE_CATEGORIES;
  const revenueCategories = categories.length
    ? categories.filter((c) => c.type === "revenue").map((c) => c.name)
    : DEFAULT_REVENUE_CATEGORIES;

  const handleFile = async (file: File) => {
    setLoading(true);
    try {
      const result = await previewImport(file);
      setPreview(result);
      setRows(result.transactions);
      // Pré-seleciona só o que é novo: reimportar duplicado é o erro
      // mais fácil de cometer sem perceber.
      setSelected(
        new Set(
          result.transactions
            .map((t, i) => (t.duplicate ? -1 : i))
            .filter((i) => i >= 0)
        )
      );
      toast.success(
        `${result.total} lançamento(s) lidos do arquivo ${result.format}`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao ler o arquivo");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const toggle = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === rows.length ? new Set() : new Set(rows.map((_, i) => i))
    );
  };

  const setCategory = (index: number, category: string) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, category } : row))
    );
  };

  const handleImport = async () => {
    const chosen = rows.filter((_, i) => selected.has(i));
    if (chosen.length === 0) {
      toast.error("Selecione ao menos um lançamento");
      return;
    }

    setSaving(true);
    try {
      const { inserted, skipped } = await commitImport(chosen);
      // O dashboard e os orçamentos leem transações; sem invalidar,
      // a tela continuaria mostrando os números antigos.
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });

      toast.success(
        `${inserted} transação(ões) importada(s)` +
          (skipped > 0 ? ` · ${skipped} ignorada(s) por já existirem` : "")
      );
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao importar");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setRows([]);
    setSelected(new Set());
    if (inputRef.current) inputRef.current.value = "";
  };

  const selectedTotal = rows.reduce((acc, row, i) => {
    if (!selected.has(i)) return acc;
    return acc + (row.type === "revenue" ? row.amount : -row.amount);
  }, 0);

  // ---------- Etapa 1: upload ----------
  if (!preview) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importar Extrato</h1>
          <p className="text-muted-foreground">
            Envie o extrato do seu banco em OFX ou CSV e confira antes de gravar.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors ${
            dragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Lendo o arquivo...</p>
            </>
          ) : (
            <>
              <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">
                Arraste o arquivo aqui ou clique para escolher
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                .ofx ou .csv · até 5MB
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".ofx,.csv,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </motion.div>

        <div className="flex gap-3 rounded-lg border bg-muted/40 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Prefira OFX.</strong> É um
              formato estruturado e traz um identificador único por lançamento,
              o que evita duplicação ao reimportar períodos sobrepostos.
            </p>
            <p>
              Baixe pelo site ou app do banco, na mesma tela onde você baixaria
              o extrato em PDF.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Etapa 2: conferência ----------
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Conferir Importação
          </h1>
          <p className="text-muted-foreground">
            {preview.total} lançamento(s) no arquivo {preview.format} ·{" "}
            {preview.novos} novo(s)
            {preview.duplicados > 0 && ` · ${preview.duplicados} já importado(s)`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={reset}>
            <ArrowLeft className="h-4 w-4" />
            Trocar arquivo
          </Button>
          <Button
            className="gap-2"
            onClick={handleImport}
            disabled={saving || selected.size === 0}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Importar {selected.size} selecionada(s)
          </Button>
        </div>
      </div>

      {preview.warnings.length > 0 && (
        <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="space-y-1 text-sm">
            {preview.warnings.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4 rounded-lg border p-4 text-sm">
        <div>
          <span className="text-muted-foreground">Selecionadas: </span>
          <strong>{selected.size}</strong>
        </div>
        <div>
          <span className="text-muted-foreground">Impacto no saldo: </span>
          <strong
            className={selectedTotal >= 0 ? "text-emerald-500" : "text-red-500"}
          >
            {formatCurrency(selectedTotal)}
          </strong>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="w-10 p-3">
                <Checkbox
                  checked={selected.size === rows.length && rows.length > 0}
                  onCheckedChange={toggleAll}
                  aria-label="Selecionar todos"
                />
              </th>
              <th className="p-3 text-left font-medium">Data</th>
              <th className="p-3 text-left font-medium">Descrição</th>
              <th className="p-3 text-left font-medium">Categoria</th>
              <th className="p-3 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const options =
                row.type === "revenue" ? revenueCategories : expenseCategories;
              return (
                <tr
                  key={`${row.import_hash}-${index}`}
                  className={`border-b last:border-0 ${
                    row.duplicate ? "bg-muted/30 text-muted-foreground" : ""
                  }`}
                >
                  <td className="p-3">
                    <Checkbox
                      checked={selected.has(index)}
                      onCheckedChange={() => toggle(index)}
                      aria-label={`Selecionar ${row.description}`}
                    />
                  </td>
                  <td className="whitespace-nowrap p-3">
                    {new Date(`${row.date}T00:00:00`).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="max-w-[280px] truncate p-3" title={row.description}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 shrink-0 opacity-50" />
                      <span className="truncate">{row.description}</span>
                      {row.duplicate && (
                        <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          já importado
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <Select
                      value={row.category}
                      onValueChange={(value) => setCategory(index, value)}
                    >
                      <SelectTrigger className="h-8 w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td
                    className={`whitespace-nowrap p-3 text-right font-medium ${
                      row.type === "revenue" ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    {row.type === "revenue" ? "+" : "-"}
                    {formatCurrency(row.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
