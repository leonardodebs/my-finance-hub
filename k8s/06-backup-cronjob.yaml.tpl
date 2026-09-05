# Backup diário do Postgres, em duas camadas.
#
# ESTE ARQUIVO É UM TEMPLATE. Os dois caminhos de hostPath dependem de como a
# máquina está organizada, então vêm de BACKUP_MOUNT e TEXTFILE_DIR no
# .env.deploy. O scripts/deploy.sh renderiza com envsubst antes de aplicar; o
# `kubectl apply -f k8s/` ignora a extensão .tpl.
#
#   1. PVC no cluster  — cópia rápida, sempre disponível para restore imediato.
#   2. Pendrive externo — sobrevive à perda do disco do nó.
#
# A camada 2 é o que torna isto um backup de verdade: os dois volumes da
# camada 1 (banco e dumps) vivem no mesmo disco, então sozinha ela cobre erro
# humano e corrupção lógica, mas não falha de hardware.
#
# ONDE O DUMP VAI PARAR
#
# /srv/backup/dumps/finance/ — segue a convenção já usada no host para n8n e
# jobops, cada serviço no seu diretório. O horário (03:00) fica entre o backup
# do n8n (02:00) e o do jobops (03:30), e antes do restic (04:00), de modo que
# o dump do dia entra no snapshot do restic no mesmo ciclo.
#
# A GUARDA CONTRA O PENDRIVE AUSENTE
#
# O /etc/fstab monta o pendrive com `nofail`. Isso é bom para o boot, mas cria
# uma armadilha: se ele estiver desconectado, /srv/backup vira um diretório
# vazio no disco interno e o backup escreveria ali achando que está no
# pendrive — exatamente o cenário que este arquivo existe para evitar.
# Por isso o job confere marcadores que só existem no pendrive real antes de
# copiar qualquer coisa, e falha alto se não os encontrar.
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: finance-backups
  namespace: finance
spec:
  accessModes: ["ReadWriteOnce"]
  storageClassName: local-path
  resources:
    requests:
      storage: 2Gi
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: finance-postgres-backup
  namespace: finance
spec:
  schedule: "0 3 * * *"
  # Se o nó estiver desligado na hora marcada, não vale acumular execuções.
  concurrencyPolicy: Forbid
  startingDeadlineSeconds: 3600
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: backup
              # Mesma major do banco: pg_dump de versão anterior recusa
              # conectar num servidor mais novo.
              image: postgres:16-alpine
              command:
                - /bin/sh
                - -c
                - |
                  set -euo pipefail

                  STAMP=$(date +%Y%m%d-%H%M%S)
                  NOME="finance-${STAMP}.sql.gz"
                  LOCAL="/backups/${NOME}"

                  # ---------- 1. dump para o PVC ----------
                  echo "==> Gerando ${LOCAL}"
                  # pipefail garante que falha do pg_dump derrube o job, em vez
                  # de gerar um .gz vazio e reportar sucesso.
                  pg_dump -h finance-postgres -U postgres my_finance \
                    | gzip > "${LOCAL}"

                  TAMANHO=$(stat -c%s "${LOCAL}")
                  # Um dump válido nunca é tão pequeno; se for, algo falhou em
                  # silêncio e é melhor apagar do que guardar lixo que passaria
                  # por backup bom na hora do desespero.
                  if [ "${TAMANHO}" -lt 1024 ]; then
                    echo "ERRO: dump com ${TAMANHO} bytes, suspeito. Descartando."
                    rm -f "${LOCAL}"
                    exit 1
                  fi
                  gzip -t "${LOCAL}"
                  echo "    ${TAMANHO} bytes, gzip íntegro"

                  # ---------- 2. cópia para o pendrive ----------
                  # Marcadores que só existem no pendrive real. Se o fstab
                  # montou nada (nofail com o dispositivo ausente), estes
                  # caminhos não existem e o job para aqui.
                  USB_OK=1
                  for marcador in /usb/dumps /usb/restic; do
                    if [ ! -d "${marcador}" ]; then
                      echo "ERRO: ${marcador} ausente — o pendrive não está montado."
                      USB_OK=0
                    fi
                  done

                  if [ "${USB_OK}" -eq 0 ]; then
                    echo "Dump local preservado em ${LOCAL}, mas SEM cópia externa."
                    # Registra a falha na métrica antes de sair, senão o
                    # Prometheus veria apenas silêncio.
                    printf '%s\n' \
                      '# HELP finance_backup_usb_copy_success Cópia do dump para o pendrive.' \
                      '# TYPE finance_backup_usb_copy_success gauge' \
                      'finance_backup_usb_copy_success 0' \
                      > /textfile/finance-backup.prom.tmp
                    mv /textfile/finance-backup.prom.tmp /textfile/finance-backup.prom
                    exit 1
                  fi

                  mkdir -p /usb/dumps/finance
                  cp "${LOCAL}" "/usb/dumps/finance/${NOME}"
                  # Verifica a cópia no destino: erro de escrita em pendrive é
                  # comum e silencioso.
                  gzip -t "/usb/dumps/finance/${NOME}"
                  sync
                  echo "==> Copiado para /usb/dumps/finance/${NOME}"

                  # ---------- 3. retenção ----------
                  # Menor no PVC, que divide disco com o banco; maior no
                  # pendrive, que tem espaço sobrando.
                  find /backups -name 'finance-*.sql.gz' -mtime +14 -delete
                  find /usb/dumps/finance -name 'finance-*.sql.gz' -mtime +30 -delete

                  # ---------- 4. métricas ----------
                  # Escrita atômica: o node-exporter lê este diretório
                  # continuamente e não pode pegar um arquivo pela metade.
                  AGORA=$(date +%s)
                  {
                    echo '# HELP finance_backup_last_success_timestamp_seconds Último backup concluído.'
                    echo '# TYPE finance_backup_last_success_timestamp_seconds gauge'
                    echo "finance_backup_last_success_timestamp_seconds ${AGORA}"
                    echo '# HELP finance_backup_size_bytes Tamanho do último dump.'
                    echo '# TYPE finance_backup_size_bytes gauge'
                    echo "finance_backup_size_bytes ${TAMANHO}"
                    echo '# HELP finance_backup_usb_copy_success Cópia do dump para o pendrive.'
                    echo '# TYPE finance_backup_usb_copy_success gauge'
                    echo 'finance_backup_usb_copy_success 1'
                  } > /textfile/finance-backup.prom.tmp
                  mv /textfile/finance-backup.prom.tmp /textfile/finance-backup.prom

                  # Mesmo formato do status do restic já usado no host.
                  echo "${AGORA}" > /usb/status/finance-backup-last-success

                  echo "==> Backups no pendrive:"
                  ls -lh /usb/dumps/finance
              env:
                - name: PGPASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: finance-secrets
                      key: DB_PASSWORD
              volumeMounts:
                - name: backups
                  mountPath: /backups
                - name: usb
                  mountPath: /usb
                - name: textfile
                  mountPath: /textfile
              resources:
                requests:
                  cpu: 50m
                  memory: 64Mi
                limits:
                  memory: 256Mi
          volumes:
            - name: backups
              persistentVolumeClaim:
                claimName: finance-backups
            # hostPath prende o pod ao nó que tem o pendrive. Num cluster de
            # um nó isso é inócuo; se o cluster crescer, este job precisa de
            # nodeSelector apontando para a máquina com o dispositivo.
            - name: usb
              hostPath:
                path: ${BACKUP_MOUNT}
                type: Directory
            # Diretório lido pelo textfile collector do node-exporter, o que
            # leva o estado do backup para o Prometheus sem exporter extra.
            - name: textfile
              hostPath:
                path: ${TEXTFILE_DIR}
                type: Directory
