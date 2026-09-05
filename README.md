# 💰 My Finance Hub

Um centro de controle financeiro moderno, intuitivo e completo para gestão de gastos pessoais, orçamentos e metas, construído com tecnologias de ponta.

Roda de duas formas: local, com `npm run dev`, ou conteinerizado em **Kubernetes (k3s)** — ver [k8s/README.md](k8s/README.md).

---

## 🚀 Funcionalidades Principais

### 📊 Painel de Controle (Dashboard)
- **Visão Geral**: Resumo rápido de saldo atual, receitas totais e despesas.
- **Receitas × Despesas**: Gráfico de evolução mostrando os meses anteriores em relação ao mês selecionado.
- **Gastos por Categoria**: Visualização para identificar para onde seu dinheiro está indo.
- **Filtro global de mês e ano** no cabeçalho, aplicado a todo o painel.

### 📥 Importação de Extratos Bancários
- **Formatos**: OFX (1.x SGML e 2.x XML) e CSV. O formato é detectado pelo conteúdo, não só pela extensão.
- **Conferência antes de gravar**: o arquivo nunca vai direto para o banco. A tela mostra o que foi entendido, você ajusta as categorias e desmarca o que não quer.
- **Deduplicação**: reimportar o mesmo extrato não duplica lançamentos. A chave é o `FITID`, identificador que o próprio banco atribui a cada transação.
- **Classificação automática** por palavra-chave, calibrada com descritores reais de cartão (que truncam nomes e usam prefixos de adquirente como `IFD*`).

> **Prefira OFX.** É estruturado e traz identificador único por lançamento. CSV funciona, mas cada banco inventa um layout e o parser depende de heurística.

### 💸 Gestão de Transações
- **Histórico Completo**: Lista detalhada de todas as entradas e saídas.
- **Filtros combináveis**: busca textual, **categoria** (com contagem de lançamentos), período (7 dias, 30 dias, este mês, mês passado, este ano) e tipo (entradas/saídas).
- **Exportação**: relatórios em **PDF** a partir da visualização filtrada.

### 🎯 Planejamento e Metas
- **Orçamentos por Categoria**: Defina limites mensais e receba alertas visuais ao se aproximar do limite.
- **Metas de Economia**: Acompanhe objetivos de longo prazo, como reserva de emergência ou viagens.

### ⚙️ Personalização
- **Perfil de Usuário**: Gestão de informações básicas (Nome e E-mail).
- **Preferências do App**: Alertas de orçamento e resumos semanais.
- **Categorias Dinâmicas**: Crie categorias próprias de Receita e Despesa nas configurações, além das padrão do sistema.
- **Modo Visual**: Suporte a **Modo Escuro (Dark Mode)**.

### 🛡️ Gestão de Usuários (Admin)
- **Painel Administrativo**: Admins podem visualizar, editar e excluir contas.
- **Segurança Hierárquica**: Permissões verificadas no Frontend e no Backend (middleware `verifyAdmin`).

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React + Vite** e **TypeScript**.
- **React Query**: cache inteligente de requisições, sem recarregamentos desnecessários.
- **Code-Splitting (React.lazy)**: carregamento assíncrono de rotas.
- **Tailwind CSS + Shadcn/UI** e **Framer Motion**.

### Backend & Segurança
- **Node.js + Express** e **PostgreSQL** com índices de performance.
- **Multi-Tenancy**: isolamento por `user_id` em todas as consultas.
- **Autenticação JWT** e **BcryptJS** para hash de senhas.
- **Parsers próprios** de OFX e CSV, sem dependência externa de parsing.

### Infraestrutura
- **Docker**: imagem da API em `node:20-alpine`; frontend em build multi-stage servido por **nginx**.
- **Kubernetes (k3s)**: Postgres em StatefulSet com PVC, API e frontend em Deployments, roteamento por Ingress.

---

## 📦 Executando Localmente

### Pré-requisitos
- Node.js v20+
- PostgreSQL rodando

### Passos
1. **Clone o repositório**:
   ```bash
   git clone https://github.com/leonardodebs/my-finance-hub.git
   cd my-finance-hub
   ```
2. **Crie o banco**:
   ```sql
   CREATE DATABASE my_finance;
   ```
3. **Configure o `.env`** na raiz:
   ```env
   PORT=3001
   DB_USER=postgres
   DB_PASSWORD=sua_senha
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=my_finance
   JWT_SECRET=troque_por_um_valor_aleatorio_longo
   ```
   As tabelas e os índices são criados automaticamente no primeiro boot da API.

4. **Instale e rode**:
   ```bash
   npm install

   # Popule com dados de exemplo (OPCIONAL)
   node server/seed.js

   # Inicie os dois serviços
   npm run server & npm run dev
   ```

O frontend sobe em `http://localhost:8080` e conversa com a API pelo caminho relativo `/api`, que o Vite redireciona para a porta 3001 em desenvolvimento.

### 💰 Teste Rápido (Demo Mode)
Após rodar o `seed.js`, use as credenciais:
- **Email**: `demo@linkedin.com`
- **Senha**: `demo123`

> ⚠️ O usuário demo é criado como **administrador** e sua senha é pública. Não o mantenha em uma instância com dados reais.

### 🧪 Testes
```bash
npm test
```
Cobre os parsers de OFX e CSV e o classificador de categorias.

---

## ☸️ Deploy em Kubernetes

O projeto roda em **k3s single-node**. A instalação e a operação estão documentadas em **[k8s/README.md](k8s/README.md)**, incluindo a topologia, a justificativa de cada decisão e o procedimento de rollback.

Resumo:

```bash
# 1. Aponte para o seu servidor
cp .env.deploy.example .env.deploy
#    edite SERVER=usuario@host

# 2. No servidor, uma vez (pede sudo)
sudo bash scripts/install-k3s.sh

# 3. Na estação de trabalho, a cada deploy (não pede sudo)
bash scripts/deploy.sh
```

Nada no repositório fixa endereço de servidor: o destino vem do `.env.deploy`, que fica fora do versionamento, e o Ingress usa uma regra sem `host`, atendendo qualquer nome que aponte para o nó — IP, `nip.io` ou domínio próprio.

---

## 📝 Maturidade do Projeto e Atualizações Recentes

- ☸️ **Deploy em Kubernetes**: aplicação conteinerizada e rodando em k3s, com banco persistido em PVC, healthchecks e rollout automatizado.
- 📥 **Importação de Extratos**: leitura de OFX e CSV com conferência prévia, deduplicação por identificador do banco e classificação automática de categorias.
- 🔍 **Filtro por Categoria**: a lista de transações passou a combinar categoria, período, tipo e busca textual.
- 🔐 **Segurança**: JWT, CORS, senhas com Bcrypt, isolamento por usuário e `JWT_SECRET` obrigatório em produção.
- ⚡ **Performance**: páginas modulares com lazy loading e React Query servindo do cache.
- 👑 **Admin Control**: painel de super-usuário com segurança em cascata no banco.
- 🏷️ **Categorias Dinâmicas**: CRUD de categorias personalizadas com persistência e isolamento por usuário.
- 📄 **Exportação de Relatórios**: consolidação das métricas da visualização atual em PDF.

---

## 🤖 Desenvolvimento com IA

Este projeto foi desenvolvido em parceria com IA atuando como programadora em todas as etapas, da arquitetura do banco ao refino das micro-animações.

- **Google Antigravity / Gemini**: aplicação, banco de dados e interface.
- **Claude (Anthropic)**: conteinerização e deploy em Kubernetes, parsers de extrato e classificador de categorias.

---

Desenvolvido para provar que a união de tecnologia de IA avançada com uma visão robusta de desenvolvimento full-stack resulta em ferramentas poderosas. 🚀
