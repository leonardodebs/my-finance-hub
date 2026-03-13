import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, type Transaction } from "./financeData";

export const exportTransactionsToPDF = (txns: Transaction[]) => {
  const doc = new jsPDF();
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR");
  const timeStr = now.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });

  // Header
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text("My Finance Hub", 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Relatório de Transações Detalhado", 14, 28);
  doc.text(`Gerado em: ${dateStr} às ${timeStr}`, 14, 33);

  // Summary logic
  const revenue = txns.filter(t => t.type === 'revenue').reduce((acc, t) => acc + Number(t.amount), 0);
  const expenses = txns.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
  const balance = revenue - expenses;

  // Summary Box
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(14, 40, 182, 25, 3, 3, "F");
  
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("RESUMO DO PERÍODO SELECIONADO", 18, 46);
  
  doc.setFontSize(11);
  doc.setTextColor(34, 197, 94); // Revenue color
  doc.text(`Receitas: ${formatCurrency(revenue)}`, 18, 55);
  
  doc.setTextColor(239, 68, 68); // Expense color
  doc.text(`Despesas: ${formatCurrency(expenses)}`, 80, 55);
  
  doc.setTextColor(40, 40, 40);
  doc.text(`Saldo: ${formatCurrency(balance)}`, 140, 55);

  // Table
  const tableRows = txns.map(t => [
    t.description,
    t.category,
    new Date(t.date).toLocaleDateString("pt-BR"),
    { 
      content: formatCurrency(t.amount), 
      styles: { textColor: t.type === 'revenue' ? [34, 197, 94] : [239, 68, 68], fontStyle: 'bold' as const } 
    },
    t.type === 'revenue' ? 'Entrada' : 'Saída'
  ]);

  autoTable(doc, {
    startY: 75,
    head: [["Descrição", "Categoria", "Data", "Valor", "Tipo"]],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: tableRows as any,
    headStyles: { 
      fillColor: [79, 70, 229], // Primary color
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold' as const
    },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    margin: { top: 30 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        // Handled via content object above
      }
    }
  });

  // Footer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${i} de ${pageCount} - My Finance Hub v1.0`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  doc.save(`relatorio_financeiro_${now.toISOString().split('T')[0]}.pdf`);
};
