# 💰 My Finance Hub

Um centro de controle financeiro moderno, intuitivo e completo para gestão de gastos pessoais, orçamentos e metas, construído com tecnologias de ponta.

---

## 🚀 Funcionalidades Principais

### 📊 Painel de Controle (Dashboard)
- **Visão Geral**: Resumo rápido de saldo atual, receitas totais e despesas.
* **Gráficos Interativos**: Visualização de gastos por categoria para identificar para onde seu dinheiro está indo.
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
- **React + Vite**: Performance e rapidez no desenvolvimento.
- **TypeScript**: Segurança de tipos em todo o projeto.
- **Tailwind CSS**: Estilização moderna e responsiva.
- **Shadcn/UI**: Componentes de interface de usuário premium e acessíveis.
- **Framer Motion**: Animações suaves e micro-interações.
- **Lucide React**: Biblioteca de ícones elegantes.

### Backend & Segurança
- **Node.js + Express**: Servidor robusto para processamento das requisições.
- **PostgreSQL**: Banco de dados relacional para armazenamento seguro das finanças.
- **Autenticação JWT**: Sistema de login seguro protegendo o sistema por meio de Tokens.
- **BcryptJS**: Hash forte para as senhas de usuários.
- **Filtros e Lógica**: Implementação de lógica de comparação mensal e cálculos de orçamento em tempo real.

---

## 📦 Como Executar o Projeto

### Pré-requisitos
- Node.js instalado.
- PostgreSQL rodando localmente.

### Passo 1: Configurar o Banco de Dados
1. Crie um banco de dados chamado `my_finance` no seu PostgreSQL.
2. Execute o script contido em `server/schema.sql` para criar as tabelas e dados iniciais.
3. Certifique-se de configurar as credenciais no arquivo `.env` (ou use os padrões configurados no `server/index.js`).

### Passo 2: Instalar Dependências
```bash
npm install
```

### Passo 3: Iniciar o Sistema
Para sua facilidade, existe um arquivo de lote para Windows que inicia tudo de uma vez:
```bash
# Basta clicar duas vezes em:
iniciar_financas.bat
```
Ou manualmente:
```bash
# Terminal 1 (Servidor)
npm run server

# Terminal 2 (Frontend)
npm run dev
```

---

## 📝 Atualizações Recentes

- ✅ **Autenticação e Segurança**: Sistema completo de Login e Registro com senhas criptografadas (Bcrypt) e JWT, garantindo que suas contas e dados fiquem privados e seguros.
- ✅ **Integração de Configurações**: Menu de configurações funcional com persistência no banco de dados, integrado com as permissões do usuário logado.
- ✅ **Modo Escuro Verdadeiro**: Implementado o suporte a tema dinâmico, salvo nas preferências do usuário.
- ✅ **Relatórios**: Implementada a exportação de transações em PDF.
- ✅ **Inteligência de Comparativo**: Calculadora da diferença percentual de gastos entre meses.
- ✅ **Estabilidade de Orçamentos**: Sincronização em tempo real entre transações realizadas e limites de orçamento.

---

Desenvolvido com foco em UX/UI para transformar a gestão financeira em algo simples e agradável. 🚀
