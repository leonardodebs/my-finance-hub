import 'dotenv/config';
import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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

      // Migration para injetar user_id no banco legado garantindo o novo isolation
      const tables = ['transactions', 'budgets', 'goals', 'settings'];
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

      // Setup Indexes for Performance Optimization
      const createIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id);',
        'CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions (user_id, date DESC);',
        'CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets (user_id);',
        'CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals (user_id);'
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
    const result = await pool.query('SELECT * FROM transactions WHERE user_id = $1 OR user_id IS NULL ORDER BY date DESC', [req.user.userId]);
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
