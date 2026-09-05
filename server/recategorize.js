// Reaplica o classificador em transações já gravadas.
//
// Útil depois de melhorar o vocabulário do categorize.js: sem isto, o ganho
// só valeria para importações futuras e o histórico ficaria desatualizado.
//
// Só mexe em quem está em 'Outros'. Categoria que a pessoa ajustou à mão é
// decisão dela e não pode ser sobrescrita por um palpite automático.
//
// Uso:
//   node server/recategorize.js --dry-run   (mostra o que mudaria, não grava)
//   node server/recategorize.js             (aplica)

import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;
import { suggestCategory } from './parsers/categorize.js';

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'my_finance',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

const dryRun = process.argv.includes('--dry-run');

async function main() {
  console.log(dryRun ? 'MODO SIMULAÇÃO — nada será gravado\n' : 'APLICANDO ALTERAÇÕES\n');

  const { rows } = await pool.query(
    `SELECT id, user_id, description, type
     FROM transactions
     WHERE category = 'Outros'
     ORDER BY id`
  );

  if (rows.length === 0) {
    console.log('Nenhuma transação em "Outros". Nada a fazer.');
    return;
  }

  console.log(`${rows.length} transação(ões) em "Outros" para reavaliar.\n`);

  // As categorias disponíveis são por usuário: o palpite não pode apontar
  // para uma categoria que aquela pessoa não tem.
  const categoriasPorUsuario = new Map();
  for (const userId of new Set(rows.map((r) => r.user_id))) {
    const result = await pool.query(
      'SELECT name FROM categories WHERE user_id = $1',
      [userId]
    );
    categoriasPorUsuario.set(userId, result.rows.map((r) => r.name));
  }

  const mudancas = [];
  for (const row of rows) {
    const nova = suggestCategory(
      row.description,
      row.type,
      categoriasPorUsuario.get(row.user_id) || []
    );
    if (nova !== 'Outros') {
      mudancas.push({ id: row.id, nova, descricao: row.description });
    }
  }

  if (mudancas.length === 0) {
    console.log('O classificador não conseguiu melhorar nenhuma. Nada a fazer.');
    return;
  }

  const porCategoria = mudancas.reduce((acc, m) => {
    acc[m.nova] = (acc[m.nova] || 0) + 1;
    return acc;
  }, {});

  console.log('Reclassificações:');
  for (const [categoria, qtd] of Object.entries(porCategoria).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(qtd).padStart(3)}  ${categoria}`);
  }
  console.log('');
  for (const m of mudancas) {
    console.log(`  #${String(m.id).padEnd(5)} ${m.nova.padEnd(16)} ${m.descricao.slice(0, 60)}`);
  }

  if (dryRun) {
    console.log(`\n${mudancas.length} mudança(s) seriam aplicadas. Rode sem --dry-run para gravar.`);
    return;
  }

  // Tudo ou nada: uma falha no meio não pode deixar metade reclassificada.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const m of mudancas) {
      await client.query('UPDATE transactions SET category = $1 WHERE id = $2', [
        m.nova,
        m.id,
      ]);
    }
    await client.query('COMMIT');
    console.log(`\n${mudancas.length} transação(ões) reclassificada(s).`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

main()
  .catch((err) => {
    console.error('Falha:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
