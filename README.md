# 💰 My Finance Hub

Um centro de controle financeiro moderno, intuitivo e completo para gestão de gastos pessoais, orçamentos e metas, construído com tecnologias de ponta.

---

## 🚀 Funcionalidades Principais

### 📊 Painel de Controle (Dashboard)
- **Visão Geral**: Resumo rápido de saldo atual, receitas totais e despesas.
- **Gráficos Interativos**: Visualização de gastos por categoria para identificar para onde seu dinheiro está indo.
- **Comparativo Mensal**: Inteligência que compara os gastos do mês atual com o anterior.

### 💸 Gestão de Transações
- **Histórico Completo**: Lista detalhada de todas as entradas e saídas.
- **Filtros Avançados**: Pesquisa por descrição, categoria ou filtros de período (7 dias, 30 dias, este mês, este ano).
- **Exportação inteligente**: Gerar relatórios de transações em formato **PDF** para controle externo.

### 🎯 Planejamento e Metas
- **Orçamentos por Categoria**: Defina limites mensais para categorias específicas (Alimentação, Lazer, etc.) e receba alertas visuais ao se aproximar do limite.
- **Metas de Economia**: Acompanhe o progresso de objetivos de longo prazo, como reserva de emergência ou viagens.

### ⚙️ Personalização
- **Perfil de Usuário**: Gestão de informações básicas (Nome e E-mail).
- **Preferências do App**: Ativação/Desativação de alertas de orçamento e resumos semanais.
- **Gestão de Categorias Dinâmicas**: Crie suas próprias categorias de Receita e Despesa diretamente nas configurações, expandindo a flexibilidade do sistema para seu estilo de vida.
- **Modo Visual**: Suporte completo a **Modo Escuro (Dark Mode)** para melhor conforto visual.

### 🛡️ Gestão de Usuários (Admin)
- **Painel Administrativo**: Usuários com privilégios de Admin podem visualizar, editar e excluir contas de outros usuários.
- **Segurança Hierárquica**: Verificação de permissões tanto no Frontend quanto no Backend (Middleware `verifyAdmin`).

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React + Vite**: Performance e rapidez extremas no desenvolvimento.
- **TypeScript**: Segurança de tipos escalável.
- **React Query (@tanstack/react-query)**: Gerenciamento de estado global e cache inteligente de requisições API. Sem necessidade de recarregamentos desnecessários.
- **Code-Splitting (React.lazy)**: Carregamento assíncrono de rotas (Lazy Loading) para um Initial Load absurdamente rápido.
- **Tailwind CSS + Shadcn/UI**: Componentes elegantes, refinados e acessíveis.
- **Framer Motion**: Animações fluidas e micro-interações que encantam.

### Backend & Segurança
- **Node.js + Express**: API veloz e segura.
- **PostgreSQL**: Banco de dados relacional com **Índices de Performance** configurados na estrutura de dados.
- **Multi-Tenancy**: Isolamento completo de dados `user_id`, garantindo que um usuário não acesse os dados de outro de nenhuma maneira.
- **Autenticação JWT**: API inteiramente protegida por JSON Web Tokens.
- **BcryptJS**: Hash e salting avançado para senhas de usuários.

---

## 📦 Como Executar o Projeto

### Pré-requisitos
- Node.js (v20+) instalado.
- PostgreSQL rodando (pode ser Windows ou WSL2 no Linux).

### Passos de Instalação (Linux/WSL2)
1. **Clone o repositório**:
   ```bash
   git clone https://github.com/leonardodebs/my-finance-hub.git
   cd my-finance-hub
   ```
2. **Configure o Banco de Dados**:
   ```sql
   CREATE DATABASE my_finance;
   ```
3. **Variáveis de Ambiente**:
   Crie um `.env` com base no seu banco:
   ```env
   PORT=3001
   DB_USER=postgres
   DB_PASSWORD=sua_senha
   DB_HOST=localhost
   DB_PORT=5433 -- (Ou 5432 se for padrão)
   DB_NAME=my_finance
   JWT_SECRET=super_secret_para_sua_api
   ```
4. **Instale e Rode**:
   ```bash
   npm install
   
   # Popule o banco com dados de exemplo reais (OPCIONAL)
   node server/seed.js
   
   # Inicie os serviços
   npm run server & npm run dev
   ```

### 💰 Teste Rápido (Demo Mode)
Caso queira testar o app já com centenas de transações, gráficos populados e metas em andamento, após rodar o `seed.js`, use as credenciais:
- **Email**: `demo@linkedin.com`
- **Senha**: `demo123`

---

## 📝 Maturidade do Projeto e Atualizações Recentes

- 🔐 **Segurança Hardening**: Autenticação por JWT, Cors configurado, senhas encriptadas via Bcrypt e Isolamento de Dados Per-User.
- ⚡ **Performance e Lazy Loading**: As métricas de *First Contentful Paint* (FCP) saltaram com as páginas modulares e React Query servindo dados do cache imediatamente.
- 👑 **Admin Control**: Adicionado painel de super-usuário para controle de usuários e segurança em cascata no banco de dados.
- 🎨 **UX Premium**: Micro-animações fluidas, Dark Mode persistente e Logotipo renovado para uma experiência profissional.
- 🏷️ **Categorias Dinâmicas**: Implementação de sistema CRUD para categorias personalizadas com persistência em banco de dados e isolamento por usuário.
- 📄 **Exportação de Relatórios**: O sistema consolida as métricas na visualização atual e gera documentos PDF estruturados.

---

## 🤖 Desenvolvimento com IA

Este projeto contou com a "mão" (ou o processamento) de uma tecnologia de ponta: foi desenvolvido e aprimorado em parceria com o **Google Antigravity**, utilizando o poder do **Google Gemini**. A IA atuou como programadora real em todas as etapas, desde a arquitetura do banco de dados até o refino das micro-animações da interface.

---

Desenvolvido para provar que a união de tecnologia de IA avançada com uma visão robusta de desenvolvimento full-stack resulta em ferramentas poderosas. 🚀
