import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'my_finance',
  password: process.env.DB_PASSWORD || 'admin',
  port: process.env.DB_PORT || 5433,
});

const generateRandomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

async function seed() {
  try {
    console.log('Conectando ao banco de dados...');
    
    // Create demo user
    const email = 'demo@linkedin.com';
    const password = await bcrypt.hash('demo123', 10);
    
    // Check if user exists
    let userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    let userId;
    
    if (userRes.rows.length === 0) {
      console.log('Criando usuário Demo (demo@linkedin.com)...');
      const newUser = await pool.query(
        'INSERT INTO users (name, email, password, is_admin) VALUES ($1, $2, $3, $4) RETURNING id',
        ['Demo Portfólio', email, password, true]
      );
      userId = newUser.rows[0].id;
    } else {
      userId = userRes.rows[0].id;
      console.log(`Usuário Demo já existe (ID: ${userId}). Limpando dados antigos...`);
      // Clear old data for a fresh seed
      await pool.query('DELETE FROM settings WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM budgets WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM goals WHERE user_id = $1', [userId]);
    }

    // Settings
    await pool.query(
      'INSERT INTO settings (user_id, name, email, budget_alerts, weekly_summary, dark_mode) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, 'Demo LinkedIn', email, true, true, false]
    );

    console.log('Criando transações reais...');
    // Generate Transactions
    const expenseCategories = ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Educação'];
    const revenueCategories = ['Salário', 'Freelance', 'Investimentos'];
    
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    
    for (let i = 0; i < 90; i++) {
        const isRevenue = Math.random() > 0.8;
        const type = isRevenue ? 'revenue' : 'expense';
        const category = isRevenue ? revenueCategories[Math.floor(Math.random() * revenueCategories.length)] : expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
        
        let amount = isRevenue ? (Math.random() * 3000 + 800) : (Math.random() * 400 + 20);
        amount = parseFloat(amount.toFixed(2));
        
        const date = generateRandomDate(threeMonthsAgo, now).toISOString().split('T')[0];
        
        // Some specific realistic items
        let description = 'Transação';
        if (category === 'Alimentação') description = ['Supermercado Carrefour', 'Ifood Pizza', 'Padaria Central', 'Restaurante Japonês', 'Cafeteria'][Math.floor(Math.random()*5)];
        if (category === 'Moradia') description = ['Aluguel', 'Conta de Luz', 'Internet Fibra', 'Condomínio', 'Sabesp'][Math.floor(Math.random()*5)];
        if (category === 'Transporte') description = ['Uber', 'Posto Ipiranga', 'Metrô Bilhete Único', 'Estacionamento Shopping', '99 Pop'][Math.floor(Math.random()*5)];
        if (category === 'Lazer') description = ['Cinema Ingresso', 'Show Ticket', 'Netflix', 'Spotify Premium', 'Barzinho'][Math.floor(Math.random()*5)];
        if (category === 'Saúde') description = ['Farmácia Droga Raia', 'Plano Prevent Senior', 'Consulta Dermatologista'][Math.floor(Math.random()*3)];
        if (category === 'Educação') description = ['Curso Udemy', 'Mensalidade Faculdade', 'Livros Amazon'][Math.floor(Math.random()*3)];

        if (category === 'Salário') description = 'Adiantamento de Salário';
        if (category === 'Freelance') description = ['Projeto Upwork', 'Consultoria Empresa X', 'Site Freela'][Math.floor(Math.random()*3)];
        if (category === 'Investimentos') description = ['Rendimento CDB', 'Dividendos FIIs', 'Tesouro Direto'][Math.floor(Math.random()*3)];

        await pool.query(
          'INSERT INTO transactions (user_id, description, category, amount, type, date) VALUES ($1, $2, $3, $4, $5, $6)',
          [userId, description, category, amount, type, date]
        );
    }
    
    // Transações fixas do mês atual para garantir gráfico bonito
    await pool.query(
      'INSERT INTO transactions (user_id, description, category, amount, type, date) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, 'Salário Mês Atual', 'Salário', 11500.00, 'revenue', now.toISOString().split('T')[0]]
    );

    console.log('Criando orçamentos mensais...');
    // Create Budgets
    const budgets = [
        { category: 'Alimentação', limit: 2500, icon: 'utensils' },
        { category: 'Lazer', limit: 800, icon: 'film' },
        { category: 'Transporte', limit: 1000, icon: 'car' },
        { category: 'Moradia', limit: 3500, icon: 'home' }
    ];
    for (const b of budgets) {
        await pool.query(
            'INSERT INTO budgets (user_id, category, limit_amount, icon) VALUES ($1, $2, $3, $4)',
            [userId, b.category, b.limit, b.icon]
        );
    }

    console.log('Criando metas a longo prazo...');
    // Create Goals
    const goals = [
        { title: 'Reserva de Emergência', current: 18500, target: 40000, icon: 'shield', color: '#3b82f6', bg_color: '#dbeafe' },
        { title: 'Viagem para Europa', current: 7200, target: 15000, icon: 'plane', color: '#a855f7', bg_color: '#f3e8ff' },
        { title: 'Carro Novo', current: 22000, target: 80000, icon: 'car', color: '#eab308', bg_color: '#fef08a' },
    ];
    
    for (const g of goals) {
        await pool.query(
            'INSERT INTO goals (user_id, title, current_amount, target_amount, icon, color, bg_color) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [userId, g.title, g.current, g.target, g.icon, g.color, g.bg_color]
        );
    }

    console.log('');
    console.log('✅ Banco de dados populado com sucesso para a demonstração!');
    console.log('==================================================');
    console.log(' 💰 DADOS DE LOGIN DE TESTE PRONTOS:');
    console.log(' 📧 E-mail: demo@linkedin.com');
    console.log(' 🔑 Senha:  demo123');
    console.log('==================================================');
    process.exit(0);

  } catch (err) {
    console.error('Erro ao popular o banco:', err);
    process.exit(1);
  }
}

seed();
