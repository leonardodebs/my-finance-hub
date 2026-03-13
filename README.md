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
- **Modo Visual**: Suporte completo a **Modo Escuro (Dark Mode)** para melhor conforto visual.

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
- Node.js instalado.
- PostgreSQL rodando localmente (com banco de dados `my_finance` configurado).

### Passo 1: Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz (caso ainda não exista) com suas configurações do Postgres e JWT Secret:
```env
PORT=3001
DB_USER=postgres
DB_PASSWORD=sua_senha
DB_HOST=localhost
DB_PORT=5432
DB_NAME=my_finance
JWT_SECRET=super_secret_para_sua_api
```

### Passo 2: Instalar Dependências
```bash
npm install
```

### Passo 3: Iniciar o Sistema
O banco de dados irá auto-configurar as tabelas e índices necessários ao iniciar o servidor (Graças às migrações automáticas!).

```bash
# Terminal 1 (Servidor Backend)
npm run server

# Terminal 2 (Frontend)
npm run dev
```
> Opcional: Se estiver no Windows, basta duplo-clique no script `iniciar_financas.bat`.

---

## 📝 Maturidade do Projeto e Atualizações Recentes

- 🔐 **Segurança Hardening**: Autenticação por JWT, Cors configurado, senhas encriptadas via Bcrypt e Isolamento de Dados Per-User (Nenhum usuário toca as finanças do outro).
- ⚡ **Performance e Lazy Loading**: As métricas de *First Contentful Paint* (FCP) saltaram com as páginas modulares e React Query servindo dados do cache imediatamente sem loadings intermináveis. Adicionado indexação no SQL no PostgreSQL!
- 🎨 **UX Premium**: Micro-animações super fluidas, painéis modernos com Dark Mode que é salvo dinamicamente por banco e Flash Cards interativos quando uma transação nova ganha destaque (verde).
- 📄 **Exportação de Relatórios**: O sistema consolida as métricas na visualização atual e cospe um documento corporativo em PDF estruturado.
- 🎯 **Conectividade em Tempo Real Simulado**: A manipulação mágica no core de estados recarrega transações assim que você modifica gráficos, adiciona um orçamento ou zera uma meta.

---

Desenvolvido para provar que a união de UX excelente com uma fundação robusta de desenvolvimento full-stack resulta em ferramentas poderosas. 🚀
