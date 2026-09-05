# my-finance-hub no k3s

Deploy single-node. Os manifestos assumem um servidor Linux com Docker já
instalado; ajuste o endereço em [`scripts/deploy.sh`](../scripts/deploy.sh) e o
`host` do Ingress para o seu ambiente.

## Topologia

```
Host do servidor
│
├─ Docker (containers pré-existentes seguem intactos)
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

## Por que cada escolha

- **Traefik desabilitado** — ele reivindicaria as portas 80 e 443 do host. A 443
  já estava ocupada por outro serviço no servidor de origem.
- **ServiceLB desabilitado** — o `ingress-nginx` usa `hostPort: 80` direto, sem a
  camada klipper.
- **API em 1 réplica com `strategy: Recreate`** — o `server/index.js` roda
  `CREATE TABLE` no boot; duas instâncias em paralelo disputariam o mesmo DDL
  durante um rollout.
- **initContainer `wait-for-postgres`** — sem ele, se a API subir antes do banco,
  o bloco de criação de tabelas falha em silêncio e as tabelas nunca são criadas.
  A API continuaria de pé, respondendo erro em toda consulta.
- **Registry local** — o k3s usa containerd, que não enxerga imagens do Docker.
  O registry evita ter que rodar `sudo k3s ctr images import` a cada deploy.
- **Tag imutável por deploy** — `:latest` com `imagePullPolicy: IfNotPresent` não
  seria repuxado; o `deploy.sh` faz `kubectl set image` para uma tag com git-sha
  e timestamp.
- **`proxy-body-size: 8m` no Ingress** — o padrão do ingress-nginx é 1MB e um
  extrato bancário passa disso com facilidade. Sem a annotation, o upload morre
  num `413` antes de chegar na API.

## Uso

Instalação (uma vez, no servidor, pede senha de sudo):

```bash
sudo bash scripts/install-k3s.sh
```

Deploy (da estação de trabalho, sem sudo):

```bash
bash scripts/deploy.sh
```

O script sincroniza o código, builda as duas imagens, publica no registry local,
cria o Secret se ainda não existir, aplica os manifestos e aguarda o rollout.

### Segredos

`DB_PASSWORD` e `JWT_SECRET` são gerados com `openssl rand` na primeira execução
e **preservados** nas seguintes. Isso é intencional: se o `JWT_SECRET` mudasse a
cada deploy, todas as sessões cairiam; se o `DB_PASSWORD` mudasse, a API não
conectaria mais no volume já inicializado.

O [`01-secret.example.yaml`](01-secret.example.yaml) existe só para documentar as
chaves — não contém segredo real e não deve ser aplicado.

## Jobs avulsos

Ficam em [`jobs/`](jobs/), fora do diretório principal de propósito: o
`deploy.sh` roda `kubectl apply -f k8s/` sem `-R`, então eles **não** são
reaplicados a cada deploy.

```bash
# Popula o banco com dados de demonstração
kubectl create -f k8s/jobs/seed.yaml

# Reaplica o classificador de categorias no histórico (simulação)
kubectl create -f k8s/jobs/recategorize.yaml
```

O Job de recategorização roda com `--dry-run` por padrão e só mexe em transações
que estão em `Outros` — categoria ajustada à mão nunca é sobrescrita por palpite
automático. Para aplicar de verdade, remova o `--dry-run` dos `args`.

Ambos usam `generateName`, então podem ser criados várias vezes sem conflito de
nome, e se autodestroem 10 minutos após concluir (`ttlSecondsAfterFinished`).

## Operação

```bash
kubectl -n finance get pods,svc,ingress          # estado geral
kubectl -n finance logs -f deploy/finance-api    # logs da API
kubectl -n finance logs -f deploy/finance-web    # logs do nginx
kubectl -n finance rollout restart deploy/finance-api
kubectl -n finance describe pod <pod>            # investigar CrashLoop/Pending

# psql direto no banco
kubectl -n finance exec -it finance-postgres-0 -- psql -U postgres -d my_finance
```

### A porta 80 não aparece no `ss`

Esperado. `hostPort` no k3s usa DNAT via plugin CNI portmap, não um socket em
listen. Confirme com `curl http://<ip-do-servidor>/` em vez de `ss -ltn`.

## Backup do banco

O PVC vive em `/var/lib/rancher/k3s/storage/` no host.

```bash
kubectl -n finance exec finance-postgres-0 -- pg_dump -U postgres my_finance > backup.sql

# Restaurar
kubectl -n finance exec -i finance-postgres-0 -- psql -U postgres -d my_finance < backup.sql
```

## Rollback total

O k3s instala um desinstalador próprio. Ele não toca nos containers Docker
pré-existentes:

```bash
sudo /usr/local/bin/k3s-uninstall.sh
docker rm -f k3s-registry && docker volume rm k3s-registry-data
```
