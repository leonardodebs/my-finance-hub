#!/usr/bin/env bash
# Deploy do my-finance-hub no k3s do Lenovo.
# Rodar na ESTAÇÃO DE TRABALHO (Git Bash):  bash scripts/deploy.sh
# Não precisa de sudo — a instalação (install-k3s.sh) já cuidou do que exige root.
set -euo pipefail

# Configuração do ambiente. Fica em .env.deploy (fora do versionamento) para
# que o repositório não carregue o endereço de nenhum servidor específico.
# Copie .env.deploy.example e ajuste.
if [[ -f "$(dirname "$0")/../.env.deploy" ]]; then
  # shellcheck disable=SC1091
  source "$(dirname "$0")/../.env.deploy"
fi

if [[ -z "${SERVER:-}" ]]; then
  cat >&2 <<'EOF'
ERRO: SERVER não definido.

Crie o arquivo .env.deploy na raiz do projeto:

    cp .env.deploy.example .env.deploy
    # edite com o endereço do seu servidor

Ou passe direto:

    SERVER=usuario@192.168.0.10 bash scripts/deploy.sh
EOF
  exit 1
fi

REMOTE_DIR="${REMOTE_DIR:-/home/$(echo "$SERVER" | cut -d@ -f1)/apps/my-finance-hub}"
REGISTRY="${REGISTRY:-localhost:5000}"
NS=finance

log() { echo -e "\n\033[1;34m==>\033[0m $*"; }

cd "$(dirname "$0")/.."

TAG="$(git rev-parse --short HEAD 2>/dev/null || echo nogit)-$(date +%Y%m%d%H%M%S)"
log "Tag desta versão: $TAG"

# --- 1. Sincroniza o código -------------------------------------------------
# tar sobre ssh: não depende de rsync (que não existe no Windows) nem de push
log "Enviando código para $SERVER:$REMOTE_DIR"
ssh "$SERVER" "mkdir -p '$REMOTE_DIR'"
tar czf - \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=dist \
  --exclude='*.log' \
  . | ssh "$SERVER" "tar xzf - -C '$REMOTE_DIR'"

# --- 2. Build e push das imagens -------------------------------------------
log "Buildando imagens no servidor"
ssh "$SERVER" "cd '$REMOTE_DIR' && \
  docker build --provenance=false -f docker/Dockerfile.api -t $REGISTRY/finance-api:$TAG -t $REGISTRY/finance-api:latest . && \
  docker build --provenance=false -f docker/Dockerfile.web -t $REGISTRY/finance-web:$TAG -t $REGISTRY/finance-web:latest ."

log "Publicando no registry local"
ssh "$SERVER" "docker push $REGISTRY/finance-api:$TAG && \
  docker push $REGISTRY/finance-api:latest && \
  docker push $REGISTRY/finance-web:$TAG && \
  docker push $REGISTRY/finance-web:latest"

# --- 3. Secret (criado só uma vez) -----------------------------------------
# Se o JWT_SECRET mudasse a cada deploy, todo mundo seria deslogado.
# Se o DB_PASSWORD mudasse, a API não conectaria mais no volume já inicializado.
log "Garantindo o Secret finance-secrets"
ssh "$SERVER" "kubectl apply -f '$REMOTE_DIR/k8s/00-namespace.yaml' >/dev/null && \
  if kubectl -n $NS get secret finance-secrets >/dev/null 2>&1; then \
    echo 'Secret já existe — preservado.'; \
  else \
    kubectl -n $NS create secret generic finance-secrets \
      --from-literal=DB_PASSWORD=\"\$(openssl rand -hex 24)\" \
      --from-literal=JWT_SECRET=\"\$(openssl rand -hex 48)\" && \
    echo 'Secret criado com valores aleatórios.'; \
  fi"

# --- 4. Aplica os manifestos ------------------------------------------------
log "Aplicando manifestos"
ssh "$SERVER" "kubectl apply -f '$REMOTE_DIR/k8s/'"

# --- 5. Aponta os Deployments para a tag desta versão -----------------------
# :latest com imagePullPolicy IfNotPresent não seria repuxado; a tag imutável força o rollout.
log "Atualizando imagens para $TAG"
ssh "$SERVER" "kubectl -n $NS set image deployment/finance-api api=$REGISTRY/finance-api:$TAG && \
  kubectl -n $NS set image deployment/finance-web web=$REGISTRY/finance-web:$TAG"

log "Aguardando rollout"
ssh "$SERVER" "kubectl -n $NS rollout status statefulset/finance-postgres --timeout=180s && \
  kubectl -n $NS rollout status deployment/finance-api --timeout=180s && \
  kubectl -n $NS rollout status deployment/finance-web --timeout=180s"

log "Estado final"
ssh "$SERVER" "kubectl -n $NS get pods,svc,ingress"

echo -e "\n\033[1;32mDeploy concluído.\033[0m"
echo "Acesse:  http://$(echo "$SERVER" | cut -d@ -f2)/"
