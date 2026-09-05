# my-finance-hub no k3s

Deploy single-node no servidor Lenovo (`leonardo@192.168.15.3`, hostname `vmlab`).

## Topologia

```
Host 192.168.15.3
│
├─ Docker (pré-existente: grafana, prometheus, n8n, portainer, jobops…)  ← intocado
│   └─ k3s-registry (registry:2 em 127.0.0.1:5000)   ← ponte de imagens
│
└─ k3s (containerd)
    └─ ingress-nginx  DaemonSet, hostPort 80        ← única porta do host consumida
        │
        ├─ /api  →  svc finance-api:3001   →  Deployment finance-api    (1 réplica, Recreate)
        │                                        └─ initContainer aguarda o Postgres
        └─ /     →  svc finance-web:80     →  Deployment finance-web    (2 réplicas)

            StatefulSet finance-postgres  →  PVC 5Gi (storageClass local-path)
```

Por que cada escolha:

- **Traefik desabilitado** — ele reivindicaria as portas 80 e 443 do host, e a 443 já é do `openclaw-caddy`.
- **ServiceLB desabilitado** — o `ingress-nginx` usa `hostPort: 80` direto, sem a camada klipper.
- **API em 1 réplica com `strategy: Recreate`** — o `server/index.js` roda `CREATE TABLE` no boot; duas instâncias em paralelo executariam o mesmo DDL durante um rollout.
- **initContainer `wait-for-postgres`** — sem ele, se a API subir antes do banco, o bloco de criação de tabelas falha em silêncio e as tabelas nunca são criadas.
- **Registry local** — o k3s usa containerd, que não enxerga imagens do Docker. O registry evita ter que rodar `sudo k3s ctr images import` a cada deploy.
- **Tag imutável por deploy** — `:latest` com `imagePullPolicy: IfNotPresent` não seria repuxado; o `deploy.sh` faz `kubectl set image` para uma tag com git-sha + timestamp.

## Uso

Instalação (uma vez, no servidor, pede senha de sudo):

```bash
sudo bash ~/apps/my-finance-hub/scripts/install-k3s.sh
```

Deploy (da estação de trabalho, sem sudo):

```bash
bash scripts/deploy.sh
```

Acesso: <http://192.168.15.3/> ou <http://finance.192.168.15.3.nip.io/>

## Operação

```bash
kubectl -n finance get pods,svc,ingress          # estado geral
kubectl -n finance logs -f deploy/finance-api    # logs da API
kubectl -n finance logs -f deploy/finance-web    # logs do nginx
kubectl -n finance rollout restart deploy/finance-api
kubectl -n finance describe pod <pod>            # investigar CrashLoop/Pending

# psql direto no banco
kubectl -n finance exec -it finance-postgres-0 -- psql -U postgres -d my_finance

# ver os segredos gerados
kubectl -n finance get secret finance-secrets -o jsonpath='{.data.JWT_SECRET}' | base64 -d
```

## Backup do banco

O PVC vive em `/var/lib/rancher/k3s/storage/` no host.

```bash
kubectl -n finance exec finance-postgres-0 -- pg_dump -U postgres my_finance > backup.sql
```

## Rollback total

O k3s instala um desinstalador próprio. Ele não toca nos containers Docker existentes:

```bash
sudo /usr/local/bin/k3s-uninstall.sh
docker rm -f k3s-registry && docker volume rm k3s-registry-data
```
