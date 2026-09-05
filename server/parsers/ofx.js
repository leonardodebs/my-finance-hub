// Parser de OFX (Open Financial Exchange).
//
// Duas gerações convivem no mundo real e os dois precisam funcionar:
//   - OFX 1.x: SGML, tags normalmente NÃO fechadas  ->  <TRNAMT>-150.00
//   - OFX 2.x: XML bem formado                      ->  <TRNAMT>-150.00</TRNAMT>
// Por isso a extração lê "do > até o próximo < ou fim de linha", o que cobre os dois.

// Bancos brasileiros costumam emitir em ISO-8859-1/Windows-1252, não em UTF-8.
// Ler como UTF-8 transformaria "Alimentação" em "AlimentaÃ§Ã£o".
const decodeBuffer = (buffer) => {
  const head = buffer.subarray(0, 512).toString('latin1').toUpperCase();
  const isLatin =
    head.includes('CHARSET:1252') ||
    head.includes('CHARSET:ISO-8859-1') ||
    head.includes('ENCODING:USASCII') ||
    head.includes('ISO-8859-1');

  if (isLatin) return buffer.toString('latin1');

  // Sem pista no cabeçalho: tenta UTF-8 e cai pra latin1 se aparecer o
  // caractere de substituição, sinal de que a decodificação falhou.
  const utf8 = buffer.toString('utf8');
  return utf8.includes('\uFFFD') ? buffer.toString('latin1') : utf8;
};

// Lê o valor de uma tag, tolerando tag fechada ou não.
const tagValue = (block, tag) => {
  const match = block.match(new RegExp(`<${tag}>([^<\r\n]*)`, 'i'));
  return match ? match[1].trim() : null;
};

// OFX grava data como YYYYMMDD, opcionalmente seguida de hora e fuso:
//   20260805  |  20260805120000  |  20260805120000[-3:BRT]
// Só os 8 primeiros dígitos importam — usar a hora traria bugs de fuso.
const parseOfxDate = (raw) => {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length < 8) return null;

  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);

  const monthNum = Number(month);
  const dayNum = Number(day);
  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) return null;

  return `${year}-${month}-${day}`;
};

const parseAmount = (raw) => {
  if (!raw) return null;
  // Alguns emissores usam vírgula decimal mesmo em OFX.
  const normalized = raw.replace(/\s/g, '').replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
};

/**
 * Extrai as transações de um arquivo OFX.
 * @param {Buffer} buffer conteúdo bruto do arquivo
 * @returns {{transactions: Array, warnings: string[]}}
 */
export const parseOfx = (buffer) => {
  const content = decodeBuffer(buffer);
  const warnings = [];

  if (!/<STMTTRN>/i.test(content)) {
    throw new Error(
      'Arquivo OFX sem transações (<STMTTRN>). Confira se o extrato baixado não veio vazio.'
    );
  }

  const blocks = content.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi) || [];
  const transactions = [];
  let skipped = 0;

  for (const block of blocks) {
    const date = parseOfxDate(tagValue(block, 'DTPOSTED'));
    const amount = parseAmount(tagValue(block, 'TRNAMT'));

    // Sem data ou sem valor a linha é inútil — melhor descartar e avisar
    // do que inserir uma transação corrompida no banco.
    if (!date || amount === null) {
      skipped++;
      continue;
    }

    // MEMO costuma trazer a descrição legível; NAME é o fallback.
    const description =
      tagValue(block, 'MEMO') || tagValue(block, 'NAME') || 'Sem descrição';

    transactions.push({
      date,
      description: description.replace(/\s+/g, ' ').slice(0, 255),
      // O sinal do valor define a natureza: negativo sai, positivo entra.
      amount: Math.abs(amount),
      type: amount < 0 ? 'expense' : 'revenue',
      // FITID é o identificador único que o próprio banco atribui.
      // É a melhor chave de deduplicação que existe: sobrevive a
      // reimportações e a extratos com períodos sobrepostos.
      fitid: tagValue(block, 'FITID'),
    });
  }

  if (skipped > 0) {
    warnings.push(`${skipped} lançamento(s) ignorado(s) por falta de data ou valor.`);
  }
  if (transactions.length === 0) {
    throw new Error('Nenhuma transação válida encontrada no arquivo OFX.');
  }

  return { transactions, warnings };
};
