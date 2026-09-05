import { describe, it, expect } from 'vitest';
import { parseOfx } from './ofx.js';
import { parseCsv } from './csv.js';
import { suggestCategory } from './categorize.js';

// OFX 1.x: SGML com tags não fechadas e charset latin1 — o caso mais comum
// nos bancos brasileiros.
const OFX_SGML = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
CHARSET:1252

<OFX>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260805120000[-3:BRT]
<TRNAMT>-152.90
<FITID>202608050001
<MEMO>SUPERMERCADO PAO DE ACUCAR
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260810
<TRNAMT>8500.00
<FITID>202608100002
<MEMO>PAGAMENTO SALARIO
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260812
<TRNAMT>-89,90
<FITID>202608120003
<MEMO>POSTO IPIRANGA COMBUSTIVEL
</STMTTRN>
<STMTTRN>
<DTPOSTED>
<TRNAMT>-10.00
<FITID>quebrado
<MEMO>SEM DATA
</STMTTRN>
</BANKTRANLIST>
</OFX>`;

describe('parseOfx', () => {
  const { transactions, warnings } = parseOfx(Buffer.from(OFX_SGML, 'latin1'));

  it('descarta lançamento sem data e avisa', () => {
    expect(transactions).toHaveLength(3);
    expect(warnings).toHaveLength(1);
  });

  it('ignora hora e fuso na data', () => {
    expect(transactions[0].date).toBe('2026-08-05');
  });

  it('deriva a natureza do sinal do valor', () => {
    expect(transactions[0].type).toBe('expense');
    expect(transactions[0].amount).toBe(152.9);
    expect(transactions[1].type).toBe('revenue');
  });

  it('aceita vírgula decimal', () => {
    expect(transactions[2].amount).toBe(89.9);
  });

  it('preserva o FITID para deduplicação', () => {
    expect(transactions[0].fitid).toBe('202608050001');
  });

  it('também lê OFX 2.x com tags fechadas', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OFX><BANKTRANLIST>
<STMTTRN><DTPOSTED>20260901</DTPOSTED><TRNAMT>-45.00</TRNAMT><FITID>x1</FITID><NAME>IFOOD</NAME></STMTTRN>
</BANKTRANLIST></OFX>`;
    const result = parseOfx(Buffer.from(xml, 'utf8'));
    expect(result.transactions).toHaveLength(1);
    // Sem MEMO, cai no NAME
    expect(result.transactions[0].description).toBe('IFOOD');
  });

  it('rejeita arquivo sem transações', () => {
    expect(() => parseOfx(Buffer.from('nada aqui'))).toThrow(/sem transações/i);
  });
});

describe('parseCsv', () => {
  it('pula o preâmbulo e acha o cabeçalho real', () => {
    // Extratos trazem título, CPF e período antes das colunas. Essas linhas
    // não têm delimitador e já quebraram a detecção uma vez.
    const csv = `Extrato Conta Corrente
CPF: 000.000.000-00
Periodo: 01/08/2026 a 31/08/2026

Data;Historico;Valor
05/08/2026;DROGARIA PACHECO;-45,80
10/08/2026;TRANSFERENCIA RECEBIDA;1.250,00
12/08/2026;"UBER *TRIP, SAO PAULO";-32,50
15/08/2026;SALDO DO DIA;0,00`;

    const { transactions } = parseCsv(Buffer.from(csv, 'utf8'));

    expect(transactions).toHaveLength(3);
    expect(transactions[0].date).toBe('2026-08-05');
    // Separador de milhar pt-BR
    expect(transactions[1].amount).toBe(1250);
    // Vírgula dentro de aspas não pode quebrar o campo
    expect(transactions[2].description).toBe('UBER *TRIP, SAO PAULO');
    // Lançamento de valor zero é ruído de saldo, não transação
    expect(transactions.some((t) => t.amount === 0)).toBe(false);
  });

  it('lê formato en-US com milhar por vírgula', () => {
    const csv = `date,description,amount
2026-08-05,AMAZON MARKETPLACE,"-1,234.56"
2026-08-06,NETFLIX,-55.90`;
    const { transactions } = parseCsv(Buffer.from(csv, 'utf8'));
    expect(transactions).toHaveLength(2);
    expect(transactions[0].amount).toBe(1234.56);
  });

  it('lê layout com colunas separadas de crédito e débito', () => {
    const csv = `Data;Descricao;Credito;Debito
05/08/2026;DEPOSITO;500,00;
06/08/2026;COMPRA MERCADO;;120,00`;
    const { transactions } = parseCsv(Buffer.from(csv, 'utf8'));
    expect(transactions[0].type).toBe('revenue');
    expect(transactions[1].type).toBe('expense');
  });

  it('rejeita CSV sem colunas reconhecíveis', () => {
    expect(() => parseCsv(Buffer.from('a;b\n1;2'))).toThrow(/identificar as colunas/i);
  });
});

describe('suggestCategory', () => {
  const disponiveis = [
    'Supermercado', 'Combustível', 'Farmácia',
    'Salário', 'Lazer', 'Transporte', 'Outros',
  ];

  it.each([
    ['SUPERMERCADO PAO DE ACUCAR', 'expense', 'Supermercado'],
    ['POSTO IPIRANGA COMBUSTIVEL', 'expense', 'Combustível'],
    ['DROGARIA PACHECO', 'expense', 'Farmácia'],
    ['PAGAMENTO SALARIO', 'revenue', 'Salário'],
    ['NETFLIX.COM', 'expense', 'Lazer'],
    ['UBER *TRIP', 'expense', 'Transporte'],
    ['ALGUMA COISA ALEATORIA', 'expense', 'Outros'],
  ])('classifica "%s" como %s', (descricao, tipo, esperado) => {
    expect(suggestCategory(descricao, tipo, disponiveis)).toBe(esperado);
  });

  it('não sugere categoria que a pessoa não tem cadastrada', () => {
    expect(suggestCategory('POSTO IPIRANGA', 'expense', ['Outros'])).toBe('Outros');
  });

  // Casos extraídos de um extrato Nubank real. Todos falhavam na primeira
  // versão do vocabulário, por dois motivos recorrentes: o descritor do
  // cartão trunca a palavra e o adquirente prefixa o nome do lojista.
  describe('descritores reais de cartão', () => {
    it.each([
      // Truncamento: a palavra chega cortada na fatura
      ['Compra no débito - AMERICA PARK ESTACIONA', 'Estacionamento'],
      // Prefixo de adquirente: IFD* é o iFood
      ['Compra no débito - IFD*CARMONA E OLIVEIRA', 'Alimentação'],
      ['Compra no débito - JIM.COM* ZEPPIN ALIMEN', 'Alimentação'],
      // Grafia em português
      ['Compra no débito - BRASIL BURGUER', 'Alimentação'],
      ['Compra no débito - CORACAO SANDUICHEIRIA', 'Alimentação'],
      ['Compra no débito - ACAI NOPEH', 'Alimentação'],
      ['Compra no débito - BENTO BISTRO', 'Alimentação'],
      ['Compra no débito - HELLO POKE EMPORIO', 'Alimentação'],
      ['Compra no débito - EsfihaQuente', 'Alimentação'],
      // Abreviação de supermercado e rede regional
      ['Compra no débito - SUP BARRETO', 'Supermercado'],
      ['Compra no débito - BRETAS 527', 'Supermercado'],
      // "de" no meio quebrava o match
      ['Pagamento de fatura', 'Cartão crédito'],
      ['Compra no débito - HIPNOSE BARBER SHOP', 'Corte cabelo'],
      // Pix para CNPJ identificável
      ['Transferência enviada pelo Pix - SHPP BRASIL INSTITUICAO DE PAG', 'Compras online'],
      ['Transferência enviada pelo Pix - DETRANGO', 'Carro'],
      ['Pagamento de boleto efetuado - BRADESCO SEGUROS - SEGURO AUTOMOVEL', 'Carro'],
      ['Compra no débito via NuPay - Raia Drogasil', 'Farmácia'],
    ])('classifica "%s" como %s', (descricao, esperado) => {
      expect(suggestCategory(descricao, 'expense')).toBe(esperado);
    });

    it('"SUP" não pode casar palavras que apenas começam com sup', () => {
      // O padrão usa fronteira de palavra justamente para evitar isso
      expect(suggestCategory('Compra no débito - SUPORTE TECNICO', 'expense')).not.toBe('Supermercado');
    });

    it('Pix entre pessoas físicas fica em Outros', () => {
      // Não há como inferir a natureza — chutar seria pior que admitir
      expect(
        suggestCategory('Transferência enviada pelo Pix - Isadora Alves Lustosa', 'expense')
      ).toBe('Outros');
    });

    it('reconhece RDB e resgate como investimento', () => {
      expect(suggestCategory('Resgate RDB', 'revenue')).toBe('Investimentos');
    });

    it.each([
      ['Empréstimo pessoal creditado'],
      ['Crédito pessoal - parcela liberada'],
      ['Empréstimo consignado'],
      ['Antecipacao FGTS'],
    ])('classifica "%s" como Empréstimos', (descricao) => {
      expect(suggestCategory(descricao, 'revenue')).toBe('Empréstimos');
    });

    it('não confunde empréstimo com rendimento de investimento', () => {
      // Ambos são entrada de dinheiro, mas só um é patrimônio próprio
      expect(suggestCategory('Rendimento da conta', 'revenue')).toBe('Investimentos');
      expect(suggestCategory('Empréstimo pessoal', 'revenue')).toBe('Empréstimos');
    });
  });
});
