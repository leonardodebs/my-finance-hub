import 'dotenv/config';
import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import crypto from 'crypto';
import { parseOfx } from './parsers/ofx.js';
import { parseCsv } from './parsers/csv.js';
import { suggestCategory } from './parsers/categorize.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'my_finance',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// Em produção o segredo vem do Secret do Kubernetes — nunca do fallback.
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('JWT_SECRET obrigatório em produção. Abortando.');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-finance-hub-2026';

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Acesso negado, faça o login novamente' });
  
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

// Test connection and setup
pool.query('SELECT NOW()', async (err, res) => {
  if (err) {
    console.error('Error connecting to the database', err);
  } else {
    console.log('Connected to PostgreSQL database');
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          is_admin BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS settings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          name VARCHAR(255) DEFAULT 'Usuário',
          email VARCHAR(255) DEFAULT 'usuario@exemplo.com',
          budget_alerts BOOLEAN DEFAULT TRUE,
          weekly_summary BOOLEAN DEFAULT TRUE,
          dark_mode BOOLEAN DEFAULT FALSE,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id)
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          description VARCHAR(255) NOT NULL,
          category VARCHAR(255) NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          type VARCHAR(50) NOT NULL,
          date DATE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS budgets (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          category VARCHAR(255) NOT NULL,
          limit_amount DECIMAL(10, 2) NOT NULL,
          icon VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, category)
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS goals (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          title VARCHAR(255) NOT NULL,
          current_amount DECIMAL(10, 2) NOT NULL,
          target_amount DECIMAL(10, 2) NOT NULL,
          icon VARCHAR(50),
          color VARCHAR(50),
          bg_color VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, name, type)
        );
      `);

      // Migration para injetar user_id no banco legado garantindo o novo isolation
      const tables = ['transactions', 'budgets', 'goals', 'settings', 'categories'];
      for (const table of tables) {
        await pool.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='${table}' AND column_name='user_id') THEN
              ALTER TABLE ${table} ADD COLUMN user_id INTEGER REFERENCES users(id);
            END IF;
          END $$;
        `).catch(() => {});
      }

      // Migration para adicionar is_admin na tabela users se não existir
      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_admin') THEN
            ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
            
            -- Set the earliest created user as admin for the tests
          END IF;
          
          -- Garantir que pelo menos o usuário de ID 1 tenha isAdmin
          UPDATE users SET is_admin = TRUE WHERE id = (SELECT MIN(id) FROM users);
        END $$;
      `).catch(() => {});

      console.log('Tabelas de isolamento Multi-user criadas com sucesso');

      // Migration para a importação de extratos: chave de deduplicação.
      // Guarda o FITID do OFX (ou um hash de data+valor+descrição no CSV) para
      // que reimportar o mesmo extrato não duplique lançamentos.
      await pool.query(
        'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS import_hash VARCHAR(64);'
      ).catch(() => {});

      // Setup Indexes for Performance Optimization
      const createIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id);',
        'CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions (user_id, date DESC);',
        'CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets (user_id);',
        'CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals (user_id);',
        // Índice parcial: só vale para linhas importadas. Transações criadas
        // à mão ficam com import_hash NULL e não sofrem restrição de unicidade.
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_import_hash ON transactions (user_id, import_hash) WHERE import_hash IS NOT NULL;'
      ];
      
      for (const idxQuery of createIndexes) {
        await pool.query(idxQuery).catch(() => {});
      }
      console.log('Database indexes applied for performance');
    } catch (tableErr) {
      console.error('Error creating tables:', tableErr);
    }
  }
});

// HEALTH — usado pelas probes do Kubernetes
// livenessProbe: só confirma que o processo responde
app.get('/api/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

// readinessProbe: só entra no balanceamento se o banco responder
app.get('/api/readyz', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ready' });
  } catch (err) {
    res.status(503).json({ status: 'database unavailable' });
  }
});

// AUTH
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hashedPassword]
    );

    const token = jwt.sign({ userId: newUser.rows[0].id, isAdmin: newUser.rows[0].is_admin }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: newUser.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(400).json({ error: 'Credenciais inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign({ userId: user.rows[0].id, isAdmin: user.rows[0].is_admin }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.rows[0].id, name: user.rows[0].name, email: user.rows[0].email, is_admin: user.rows[0].is_admin } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin Middleware
const verifyAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Acesso negado: Requer privilégios de administrador' });
  }
  next();
};

// Admin Routes for User Management
app.get('/api/admin/users', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, is_admin, created_at FROM users ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/admin/users/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, email, is_admin } = req.body;
  try {
    if (String(req.user.userId) === String(id) && is_admin === false) {
      return res.status(400).json({ error: 'Você não pode remover seus próprios privilégios de administrador.' });
    }
    
    const result = await pool.query(
      'UPDATE users SET name = $1, email = $2, is_admin = $3 WHERE id = $4 RETURNING id, name, email, is_admin',
      [name, email, is_admin, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/admin/users/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    if (String(req.user.userId) === String(id)) {
      return res.status(400).json({ error: 'Você não pode excluir sua própria conta por aqui.' });
    }
    await pool.query('DELETE FROM settings WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM transactions WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM budgets WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM goals WHERE user_id = $1', [id]);
    
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Routes (Todas Protegidas por verifyToken)
app.get('/api/transactions', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transactions WHERE user_id = $1 OR user_id IS NULL ORDER BY date DESC, id DESC', [req.user.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/transactions', verifyToken, async (req, res) => {
  const { description, category, amount, type, date } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO transactions (user_id, description, category, amount, type, date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.userId, description, category, amount, type, date]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/transactions/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM transactions WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)', [id, req.user.userId]);
    res.json({ message: 'Transaction deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/transactions/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { description, category, amount, type, date } = req.body;
  try {
    const result = await pool.query(
      'UPDATE transactions SET description = $1, category = $2, amount = $3, type = $4, date = $5 WHERE id = $6 AND (user_id = $7 OR user_id IS NULL) RETURNING *',
      [description, category, amount, type, date, id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transação não encontrada ou sem permissão' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// BUDGETS
app.get('/api/budgets', verifyToken, async (req, res) => {
  try {
    const query = `
      SELECT b.*, COALESCE(SUM(t.amount), 0) as spent
      FROM budgets b
      LEFT JOIN transactions t ON LOWER(b.category) = LOWER(t.category) AND t.type = 'expense' AND (t.user_id = b.user_id OR t.user_id IS NULL)
      WHERE b.user_id = $1 OR b.user_id IS NULL
      GROUP BY b.id
    `;
    const result = await pool.query(query, [req.user.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/budgets', verifyToken, async (req, res) => {
  const { category, limit_amount, icon } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO budgets (user_id, category, limit_amount, icon) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, category) DO UPDATE SET limit_amount = EXCLUDED.limit_amount, icon = EXCLUDED.icon RETURNING *',
      [req.user.userId, category, limit_amount, icon]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    // Tenta fallback para garantir compatibilidade caso conflito anterior não tenha index de user_id
    try {
      const fallbackResult = await pool.query(
        'INSERT INTO budgets (user_id, category, limit_amount, icon) VALUES ($1, $2, $3, $4) ON CONFLICT (category) DO UPDATE SET limit_amount = EXCLUDED.limit_amount, icon = EXCLUDED.icon RETURNING *',
        [req.user.userId, category, limit_amount, icon]
      );
      res.json(fallbackResult.rows[0]);
    } catch(e) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.delete('/api/budgets/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM budgets WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)', [id, req.user.userId]);
    res.json({ message: 'Budget deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GOALS
app.get('/api/goals', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM goals WHERE user_id = $1 OR user_id IS NULL ORDER BY created_at ASC', [req.user.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/goals', verifyToken, async (req, res) => {
  const { title, current_amount, target_amount, icon, color, bg_color } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO goals (user_id, title, current_amount, target_amount, icon, color, bg_color) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.user.userId, title, current_amount, target_amount, icon, color, bg_color]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/goals/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM goals WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)', [id, req.user.userId]);
    res.json({ message: 'Goal deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CATEGORIES
app.get('/api/categories', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories WHERE user_id = $1 ORDER BY name ASC', [req.user.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/categories', verifyToken, async (req, res) => {
  const { name, type } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO categories (user_id, name, type) VALUES ($1, $2, $3) ON CONFLICT (user_id, name, type) DO NOTHING RETURNING *',
      [req.user.userId, name, type]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Categoria já existe' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/categories/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM categories WHERE id = $1 AND user_id = $2', [id, req.user.userId]);
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// SETTINGS
app.get('/api/settings', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings WHERE user_id = $1 LIMIT 1', [req.user.userId]);
    if (result.rows.length === 0) {
      return res.json({
        name: 'Usuário',
        email: '...',
        budget_alerts: true,
        weekly_summary: true,
        dark_mode: false
      });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/settings', verifyToken, async (req, res) => {
  const { name, email, budget_alerts, weekly_summary, dark_mode } = req.body;
  try {
    const check = await pool.query('SELECT id FROM settings WHERE user_id = $1 LIMIT 1', [req.user.userId]);
    let result;
    if (check.rows.length === 0) {
      result = await pool.query(
        'INSERT INTO settings (user_id, name, email, budget_alerts, weekly_summary, dark_mode) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [req.user.userId, name, email, budget_alerts, weekly_summary, dark_mode]
      );
    } else {
      result = await pool.query(
        'UPDATE settings SET name = $1, email = $2, budget_alerts = $3, weekly_summary = $4, dark_mode = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
        [name, email, budget_alerts, weekly_summary, dark_mode, check.rows[0].id]
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// IMPORTAÇÃO DE EXTRATOS (OFX / CSV)

// Armazenamento em memória de propósito: o arquivo é processado e descartado
// na mesma requisição. Nada toca o disco, então os pods seguem stateless.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(ofx|csv|txt)$/i.test(file.originalname);
    cb(ok ? null : new Error('Formato não suportado. Envie um arquivo .ofx ou .csv'), ok);
  },
});

// Chave de deduplicação. O FITID do OFX é atribuído pelo próprio banco e é o
// identificador mais confiável possível. No CSV, que não tem esse campo,
// a alternativa é a assinatura do lançamento.
const buildImportHash = (txn) => {
  const seed = txn.fitid
    ? `fitid:${txn.fitid}`
    : `sig:${txn.date}|${txn.amount.toFixed(2)}|${txn.description.toLowerCase()}`;
  return crypto.createHash('sha256').update(seed).digest('hex').slice(0, 64);
};

// Etapa 1: lê o arquivo e devolve o que entendeu, SEM gravar nada.
// A confirmação é sempre da pessoa — importar extrato direto no banco seria
// irreversível e qualquer erro de parsing viraria sujeira permanente.
app.post('/api/import/preview', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

    const name = req.file.originalname.toLowerCase();
    const isOfx = name.endsWith('.ofx') || req.file.buffer.subarray(0, 2048).toString('latin1').includes('<STMTTRN>');

    let parsed;
    try {
      parsed = isOfx ? parseOfx(req.file.buffer) : parseCsv(req.file.buffer);
    } catch (parseErr) {
      return res.status(422).json({ error: parseErr.message });
    }

    // Sugere categoria só entre as que a pessoa realmente tem cadastradas.
    const catResult = await pool.query(
      'SELECT name FROM categories WHERE user_id = $1',
      [req.user.userId]
    );
    const available = catResult.rows.map((r) => r.name);

    const withHash = parsed.transactions.map((t) => ({
      ...t,
      import_hash: buildImportHash(t),
      category: suggestCategory(t.description, t.type, available),
    }));

    // Marca o que já existe para a pessoa ver antes de confirmar.
    const hashes = withHash.map((t) => t.import_hash);
    const existing = await pool.query(
      'SELECT import_hash FROM transactions WHERE user_id = $1 AND import_hash = ANY($2)',
      [req.user.userId, hashes]
    );
    const known = new Set(existing.rows.map((r) => r.import_hash));

    const transactions = withHash.map((t) => ({ ...t, duplicate: known.has(t.import_hash) }));
    const novos = transactions.filter((t) => !t.duplicate).length;

    res.json({
      format: isOfx ? 'OFX' : 'CSV',
      total: transactions.length,
      novos,
      duplicados: transactions.length - novos,
      warnings: parsed.warnings,
      transactions,
    });
  } catch (err) {
    console.error('Erro no preview de importação:', err);
    res.status(500).json({ error: 'Falha ao processar o arquivo' });
  }
});

// Etapa 2: grava o que a pessoa confirmou (já com as categorias que ela ajustou).
app.post('/api/import/commit', verifyToken, async (req, res) => {
  const { transactions } = req.body;

  if (!Array.isArray(transactions) || transactions.length === 0) {
    return res.status(400).json({ error: 'Nenhuma transação para importar' });
  }
  if (transactions.length > 2000) {
    return res.status(400).json({ error: 'Limite de 2000 transações por importação' });
  }

  const client = await pool.connect();
  try {
    // Tudo ou nada: uma falha no meio não pode deixar meio extrato importado.
    await client.query('BEGIN');
    let inserted = 0;
    let skipped = 0;

    for (const t of transactions) {
      if (!t.date || !t.description || t.amount === undefined || !t.type) {
        skipped++;
        continue;
      }

      // ON CONFLICT sobre o índice parcial: a corrida entre duas importações
      // simultâneas do mesmo arquivo resolve no banco, não na aplicação.
      const result = await client.query(
        `INSERT INTO transactions (user_id, description, category, amount, type, date, import_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id, import_hash) WHERE import_hash IS NOT NULL DO NOTHING
         RETURNING id`,
        [
          req.user.userId,
          String(t.description).slice(0, 255),
          t.category || 'Outros',
          Math.abs(Number(t.amount)),
          t.type === 'revenue' ? 'revenue' : 'expense',
          t.date,
          t.import_hash || buildImportHash(t),
        ]
      );

      if (result.rowCount > 0) inserted++;
      else skipped++;
    }

    await client.query('COMMIT');
    res.json({ inserted, skipped });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao gravar importação:', err);
    res.status(500).json({ error: 'Falha ao gravar as transações' });
  } finally {
    client.release();
  }
});

// Traduz os erros do multer (tamanho, formato) em mensagem legível.
app.use((err, _req, res, next) => {
  if (err && (err instanceof multer.MulterError || /Formato não suportado/.test(err.message))) {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'Arquivo maior que 5MB'
      : err.message;
    return res.status(400).json({ error: msg });
  }
  next(err);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
