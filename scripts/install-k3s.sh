#!/usr/bin/env bash
# Instalação única do k3s no servidor que vai hospedar a aplicação.
# Pré-requisitos: Linux com Docker e as portas 80, 6443 e 5000 livres.
# O nó recebe o hostname da máquina, que é o padrão do k3s.
# Rodar NO SERVIDOR:  sudo bash scripts/install-k3s.sh
set -euo pipefail

REGISTRY_PORT=5000

log() { echo -e "\n\033[1;34m==>\033[0m $*"; }

if [[ $EUID -ne 0 ]]; then
  echo "Este script precisa de root. Use: sudo bash $0" >&2
  exit 1
fi

# --- Verificações de porta antes de mexer em qualquer coisa -----------------
log "Verificando conflitos de porta"
for p in 80 6443 "$REGISTRY_PORT"; do
  if ss -ltn | grep -q ":$p "; then
    echo "ERRO: porta $p já está em uso. Libere-a ou ajuste o script." >&2
    ss -ltnp | grep ":$p " >&2
    exit 1
  fi
done
echo "Portas 80, 6443 e $REGISTRY_PORT livres."

# --- Resíduo de instalação anterior ----------------------------------------
# Um /etc/rancher/node/password órfão faz o agente falhar com
# "Node password rejected" ao reinstalar.
if [[ -f /etc/rancher/node/password ]] && [[ ! -d /var/lib/rancher/k3s ]]; then
  log "Removendo credencial órfã de instalação anterior do k3s"
  rm -f /etc/rancher/node/password
fi

# --- Registry local ---------------------------------------------------------
# k3s usa containerd, não o Docker. Um registry local é a ponte: o build sai
# do Docker e o kubelet puxa de localhost:5000, sem precisar de root no deploy.
log "Subindo registry local em localhost:$REGISTRY_PORT"
if ! docker ps --format '{{.Names}}' | grep -q '^k3s-registry$'; then
  docker rm -f k3s-registry 2>/dev/null || true
  docker run -d --name k3s-registry --restart=always \
    -p 127.0.0.1:$REGISTRY_PORT:5000 \
    -v k3s-registry-data:/var/lib/registry \
    registry:2
else
  echo "registry já em execução."
fi

# --- containerd precisa aceitar HTTP no registry local ----------------------
log "Configurando /etc/rancher/k3s/registries.yaml"
mkdir -p /etc/rancher/k3s
cat > /etc/rancher/k3s/registries.yaml <<EOF
mirrors:
  "localhost:$REGISTRY_PORT":
    endpoint:
      - "http://localhost:$REGISTRY_PORT"
EOF

# --- Instalação do k3s ------------------------------------------------------
log "Instalando k3s (sem Traefik)"
# --disable traefik  : o Traefik tentaria as portas 80 e 443; a 443 já é do openclaw-caddy
# --disable servicelb: o ingress-nginx vai usar hostPort 80 diretamente
# --write-kubeconfig-mode 644: permite kubectl sem sudo
if ! systemctl is-active --quiet k3s; then
  curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="server \
    --disable traefik \
    --disable servicelb \
    --write-kubeconfig-mode 644" sh -
else
  echo "k3s já está ativo."
fi

log "Aguardando o nó ficar Ready"
for i in $(seq 1 60); do
  if k3s kubectl get nodes 2>/dev/null | grep -q ' Ready '; then break; fi
  sleep 2
done
k3s kubectl get nodes

# --- kubeconfig para o usuário ---------------------------------------------
USER_NAME="${SUDO_USER:-root}"
USER_HOME=$(getent passwd "$USER_NAME" | cut -d: -f6)
log "Copiando kubeconfig para $USER_HOME/.kube/config"
mkdir -p "$USER_HOME/.kube"
cp /etc/rancher/k3s/k3s.yaml "$USER_HOME/.kube/config"
chown -R "$USER_NAME":"$USER_NAME" "$USER_HOME/.kube"
chmod 600 "$USER_HOME/.kube/config"

# kubectl standalone, para não depender de "k3s kubectl"
if [[ ! -e /usr/local/bin/kubectl ]]; then
  ln -s /usr/local/bin/k3s /usr/local/bin/kubectl
fi

# --- ingress-nginx ----------------------------------------------------------
# hostPort só na 80. Sem 443 (ocupada) e sem LoadBalancer.
log "Instalando ingress-nginx (hostPort 80, sem HTTPS)"
cat > /var/lib/rancher/k3s/server/manifests/ingress-nginx.yaml <<'EOF'
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: ingress-nginx
  namespace: kube-system
spec:
  repo: https://kubernetes.github.io/ingress-nginx
  chart: ingress-nginx
  targetNamespace: ingress-nginx
  createNamespace: true
  valuesContent: |-
    controller:
      kind: DaemonSet
      hostPort:
        enabled: true
        ports:
          http: 80
      service:
        enabled: false
      config:
        use-forwarded-headers: "true"
      ingressClassResource:
        default: true
      extraArgs:
        enable-ssl-passthrough: "false"
EOF

log "Aguardando o ingress-nginx subir (pode levar ~2 min no primeiro boot)"
for i in $(seq 1 90); do
  if kubectl -n ingress-nginx get pods 2>/dev/null | grep -q 'Running'; then break; fi
  sleep 2
done
kubectl -n ingress-nginx get pods || true

# --- Sanidade: os containers Docker existentes continuam de pé? ------------
log "Conferindo se os containers Docker pré-existentes seguem rodando"
docker ps --format '{{.Names}}\t{{.Status}}'

log "k3s instalado. Próximo passo: scripts/deploy.sh (não precisa de sudo)"
