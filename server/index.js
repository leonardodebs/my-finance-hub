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
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS settings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          name VARCHAR(255) DEFAULT 'Leonardo',
          email VARCHAR(255) DEFAULT 'leonardo@exemplo.com',
          budget_alerts BOOLEAN DEFAULT TRUE,
          weekly_summary BOOLEAN DEFAULT TRUE,
          dark_mode BOOLEAN DEFAULT FALSE,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Users and Settings tables ready');
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

    const token = jwt.sign({ userId: newUser.rows[0].id }, JWT_SECRET, { expiresIn: '7d' });
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

    const token = jwt.sign({ userId: user.rows[0].id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.rows[0].id, name: user.rows[0].name, email: user.rows[0].email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Routes
app.get('/api/transactions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transactions ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/transactions', async (req, res) => {
  const { description, category, amount, type, date } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO transactions (description, category, amount, type, date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [description, category, amount, type, date]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/transactions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM transactions WHERE id = $1', [id]);
    res.json({ message: 'Transaction deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// BUDGETS
app.get('/api/budgets', async (req, res) => {
  try {
    // Busca orçamentos e soma gastos reais das transações para cada categoria
    const query = `
      SELECT b.*, COALESCE(SUM(t.amount), 0) as spent
      FROM budgets b
      LEFT JOIN transactions t ON b.category = t.category AND t.type = 'expense'
      GROUP BY b.id
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/budgets', async (req, res) => {
  const { category, limit_amount, icon } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO budgets (category, limit_amount, icon) VALUES ($1, $2, $3) ON CONFLICT (category) DO UPDATE SET limit_amount = EXCLUDED.limit_amount, icon = EXCLUDED.icon RETURNING *',
      [category, limit_amount, icon]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/budgets/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM budgets WHERE id = $1', [id]);
    res.json({ message: 'Budget deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GOALS
app.get('/api/goals', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM goals ORDER BY created_at ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/goals', async (req, res) => {
  const { title, current_amount, target_amount, icon, color, bg_color } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO goals (title, current_amount, target_amount, icon, color, bg_color) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, current_amount, target_amount, icon, color, bg_color]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/goals/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM goals WHERE id = $1', [id]);
    res.json({ message: 'Goal deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// SETTINGS
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings LIMIT 1');
    if (result.rows.length === 0) {
      // Return default settings if none exist
      return res.json({
        name: 'Leonardo',
        email: 'leonardo@exemplo.com',
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

app.post('/api/settings', async (req, res) => {
  const { name, email, budget_alerts, weekly_summary, dark_mode } = req.body;
  try {
    // Check if settings exist
    const check = await pool.query('SELECT id FROM settings LIMIT 1');
    let result;
    if (check.rows.length === 0) {
      result = await pool.query(
        'INSERT INTO settings (name, email, budget_alerts, weekly_summary, dark_mode) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, email, budget_alerts, weekly_summary, dark_mode]
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
