CREATE DATABASE my_finance;

\c my_finance;

CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  description VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  type VARCHAR(10) CHECK (type IN ('revenue', 'expense')) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Metas
CREATE TABLE goals (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  current_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  target_amount DECIMAL(10, 2) NOT NULL,
  icon VARCHAR(50) DEFAULT 'Wallet',
  color VARCHAR(50) DEFAULT 'text-blue-500',
  bg_color VARCHAR(50) DEFAULT 'bg-blue-500/10',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orçamentos
CREATE TABLE budgets (
  id SERIAL PRIMARY KEY,
  category VARCHAR(255) NOT NULL UNIQUE,
  limit_amount DECIMAL(10, 2) NOT NULL,
  icon VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dados iniciais para Metas
INSERT INTO goals (title, current_amount, target_amount, icon, color, bg_color) VALUES 
('Reserva de Emergência', 15000, 25000, 'Wallet', 'text-blue-500', 'bg-blue-500/10'),
('Viagem Europeia', 4200, 12000, 'Plane', 'text-purple-500', 'bg-purple-500/10'),
('Novo Computador', 5000, 8000, 'TrendingUp', 'text-green-500', 'bg-green-500/10');

-- Dados iniciais para Orçamentos
INSERT INTO budgets (category, limit_amount, icon) VALUES 
('Alimentação', 1200, '🍽️'),
('Moradia', 2500, '🏠'),
('Transporte', 500, '🚗'),
('Lazer', 300, '🎬'),
('Saúde', 400, '💊'),
('Educação', 200, '📚');

-- Configurações
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) DEFAULT 'Leonardo',
  email VARCHAR(255) DEFAULT 'leonardo@exemplo.com',
  budget_alerts BOOLEAN DEFAULT TRUE,
  weekly_summary BOOLEAN DEFAULT TRUE,
  dark_mode BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO settings (name, email, budget_alerts, weekly_summary, dark_mode) 
VALUES ('Leonardo', 'leonardo@exemplo.com', true, true, false)
ON CONFLICT DO NOTHING;

