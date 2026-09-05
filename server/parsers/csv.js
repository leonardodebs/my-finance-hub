// Parser de CSV de extrato bancário.
//
// Ao contrário do OFX, CSV não tem padrão: cada banco escolhe delimitador,
// nomes de coluna, formato de data e de número. Este parser detecta tudo
// por heurística em vez de assumir um layout fixo.

const decodeBuffer = (buffer) => {
  const utf8 = buffer.toString('utf8');
  return utf8.includes('�') ? buffer.toString('latin1') : utf8;
};

// Remove acento e caixa para comparar nomes de coluna sem depender de grafia.
const normalizeHeader = (value) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/["']/g, '')
    .trim()
    .toLowerCase();

// Divide respeitando aspas: um campo como "PAGAMENTO, PARCELA 2" tem
// vírgula dentro e não pode ser quebrado nela.
const splitLine = (line, delimiter) => {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      // Aspas duplicadas ("") são um literal de aspas dentro do campo.
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim().replace(/^"|"$/g, ''));
};

// O delimitador é o candidato cuja contagem por linha mais se repete.
//
// Não dá para usar o mínimo: extratos trazem um preâmbulo (título, CPF,
// período) sem delimitador nenhum, o que zeraria o placar de todos os
// candidatos e faria cair no default. A moda ignora essas linhas soltas
// e enxerga o padrão do bloco de dados, que é o que interessa.
const detectDelimiter = (lines) => {
  const candidates = [';', ',', '\t', '|'];
  let best = ',';
  let bestScore = 0;
  let bestCount = 0;

  for (const candidate of candidates) {
    const counts = lines
      .slice(0, 30)
      .map((l) => l.split(candidate).length - 1)
      .filter((c) => c > 0);

    if (counts.length === 0) continue;

    const freq = new Map();
    for (const c of counts) freq.set(c, (freq.get(c) || 0) + 1);

    let modeCount = 0;
    let modeFreq = 0;
    for (const [count, times] of freq) {
      if (times > modeFreq || (times === modeFreq && count > modeCount)) {
        modeFreq = times;
        modeCount = count;
      }
    }

    // Desempate por número de colunas: num CSV com ";" as vírgulas decimais
    // também aparecem de forma regular, mas em menor quantidade por linha.
    if (modeFreq > bestScore || (modeFreq === bestScore && modeCount > bestCount)) {
      bestScore = modeFreq;
      bestCount = modeCount;
      best = candidate;
    }
  }
  return best;
};

const HEADER_ALIASES = {
  date: ['data', 'data lancamento', 'data movimento', 'date', 'data da compra', 'dt'],
  description: [
    'descricao', 'historico', 'lancamento', 'description', 'memo',
    'detalhes', 'titulo', 'estabelecimento', 'movimentacao',
  ],
  amount: ['valor', 'amount', 'value', 'quantia', 'montante'],
  credit: ['credito', 'entrada', 'receita', 'credit'],
  debit: ['debito', 'saida', 'despesa', 'debit'],
};

const matchColumn = (headers, aliases) =>
  headers.findIndex((h) => aliases.some((a) => h === a || h.includes(a)));

// Converte "1.234,56", "1234.56", "-R$ 89,90" em número.
const parseAmount = (raw) => {
  if (raw === null || raw === undefined) return null;

  let text = String(raw).replace(/[R$\s]/gi, '').trim();
  if (!text) return null;

  // Parênteses indicam negativo em alguns exports contábeis: (150,00)
  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (text.startsWith('-')) {
    negative = true;
    text = text.slice(1);
  }

  const hasComma = text.includes(',');
  const hasDot = text.includes('.');

  if (hasComma && hasDot) {
    // O separador decimal é o que aparece por último: 1.234,56 vs 1,234.56
    if (text.lastIndexOf(',') > text.lastIndexOf('.')) {
      text = text.replace(/\./g, '').replace(',', '.');
    } else {
      text = text.replace(/,/g, '');
    }
  } else if (hasComma) {
    text = text.replace(',', '.');
  } else if (hasDot) {
    // Só ponto é ambíguo: "1.234" é milhar, "12.34" é decimal.
    // Três dígitos depois do último ponto indicam separador de milhar.
    const afterDot = text.slice(text.lastIndexOf('.') + 1);
    if (afterDot.length === 3) text = text.replace(/\./g, '');
  }

  const value = Number(text);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
};

const parseDate = (raw) => {
  if (!raw) return null;
  const text = String(raw).trim();

  // ISO: YYYY-MM-DD
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // BR: DD/MM/YYYY ou DD-MM-YY
  const br = text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (br) {
    const day = br[1].padStart(2, '0');
    const month = br[2].padStart(2, '0');
    const year = br[3].length === 2 ? `20${br[3]}` : br[3];
    if (Number(month) > 12) return null;
    return `${year}-${month}-${day}`;
  }
  return null;
};

/**
 * Extrai as transações de um CSV de extrato.
 * @param {Buffer} buffer conteúdo bruto do arquivo
 * @returns {{transactions: Array, warnings: string[]}}
 */
export const parseCsv = (buffer) => {
  const content = decodeBuffer(buffer);
  const warnings = [];

  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    throw new Error('CSV vazio ou sem linhas de dados.');
  }

  const delimiter = detectDelimiter(lines);

  // Muitos bancos põem título, CPF e período antes do cabeçalho real.
  // O cabeçalho é a primeira linha com uma coluna de data E uma de valor.
  let headerIndex = -1;
  let headers = [];
  for (let i = 0; i < Math.min(lines.length, 25); i++) {
    const candidate = splitLine(lines[i], delimiter).map(normalizeHeader);
    const hasDate = matchColumn(candidate, HEADER_ALIASES.date) !== -1;
    const hasValue =
      matchColumn(candidate, HEADER_ALIASES.amount) !== -1 ||
      matchColumn(candidate, HEADER_ALIASES.credit) !== -1 ||
      matchColumn(candidate, HEADER_ALIASES.debit) !== -1;
    if (hasDate && hasValue) {
      headerIndex = i;
      headers = candidate;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error(
      'Não consegui identificar as colunas do CSV. É preciso ao menos uma coluna de data e uma de valor.'
    );
  }

  const dateCol = matchColumn(headers, HEADER_ALIASES.date);
  const descCol = matchColumn(headers, HEADER_ALIASES.description);
  const amountCol = matchColumn(headers, HEADER_ALIASES.amount);
  const creditCol = matchColumn(headers, HEADER_ALIASES.credit);
  const debitCol = matchColumn(headers, HEADER_ALIASES.debit);

  const transactions = [];
  let skipped = 0;

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const fields = splitLine(lines[i], delimiter);
    const date = parseDate(fields[dateCol]);

    let amount = null;
    if (amountCol !== -1) {
      amount = parseAmount(fields[amountCol]);
    } else {
      // Layout com colunas separadas de entrada e saída.
      const credit = creditCol !== -1 ? parseAmount(fields[creditCol]) : null;
      const debit = debitCol !== -1 ? parseAmount(fields[debitCol]) : null;
      if (credit) amount = Math.abs(credit);
      else if (debit) amount = -Math.abs(debit);
    }

    if (!date || amount === null || amount === 0) {
      skipped++;
      continue;
    }

    const description =
      descCol !== -1 && fields[descCol] ? fields[descCol] : 'Sem descrição';

    transactions.push({
      date,
      description: description.replace(/\s+/g, ' ').slice(0, 255),
      amount: Math.abs(amount),
      type: amount < 0 ? 'expense' : 'revenue',
      // CSV não traz identificador do banco; a deduplicação usará o
      // hash de data + valor + descrição.
      fitid: null,
    });
  }

  if (skipped > 0) {
    warnings.push(
      `${skipped} linha(s) ignorada(s) por falta de data, valor ausente ou valor zero.`
    );
  }
  if (transactions.length === 0) {
    throw new Error('Nenhuma transação válida encontrada no CSV.');
  }

  return { transactions, warnings };
};
