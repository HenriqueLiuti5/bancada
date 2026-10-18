#!/bin/sh
# Backup do Bancada: o banco, as fotos e as logos (ADR 0032).
#
#   backup.sh agendar   fica no ar e faz um backup por dia, a partir de HORA_DO_BACKUP
#   backup.sh agora     faz um backup na hora
#
# Cada cópia do banco é restaurada num banco de teste logo depois de feita, para provar que ela
# volta. Com o destino externo configurado (BACKUP_S3_*), banco, fotos e logos vão também para
# fora do servidor, criptografados com a BACKUP_SENHA. Sem ele, o backup fica só aqui, e o log
# avisa todo dia. A chave BANCADA_ENCRYPTION_KEY nunca entra no backup (ADR 0029).

set -eu

. /usr/local/lib/bancada/comum.sh

HORA_DO_BACKUP="${HORA_DO_BACKUP:-3}"
DIAS_NO_SERVIDOR=7
DIAS_FORA_DO_SERVIDOR=30
BANCO_DE_TESTE=bancada_teste_de_restauracao

conferir_restauracao() {
    dropdb --if-exists "$BANCO_DE_TESTE"
    createdb "$BANCO_DE_TESTE"
    pg_restore --no-owner --no-privileges --exit-on-error --dbname="$BANCO_DE_TESTE" "$1"
    migracoes=$(psql -d "$BANCO_DE_TESTE" -tAc "SELECT count(*) FROM django_migrations")
    ordens=$(psql -d "$BANCO_DE_TESTE" -tAc "SELECT count(*) FROM ordens_ordemservico")
    dropdb "$BANCO_DE_TESTE"
    registrar "A cópia voltou num banco de teste: $migracoes migrações e $ordens ordens de serviço."
}

fazer_backup() {
    dia=$(date +%F)
    arquivo="$PASTA/banco-$dia.dump"

    registrar "Copiando o banco para $arquivo."
    pg_dump --format=custom --file="$arquivo.parcial"
    mv "$arquivo.parcial" "$arquivo"
    conferir_restauracao "$arquivo"
    find "$PASTA" -name 'banco-*.dump' -mtime +"$DIAS_NO_SERVIDOR" -delete

    if destino_configurado; then
        configurar_destino
        configurar_origem_das_fotos
        registrar "Mandando o banco, as fotos e as logos para fora do servidor."
        rclone copy "$arquivo" cofre:banco
        rclone sync "$ORIGEM_DAS_FOTOS" cofre:midia --backup-dir "cofre:midia-apagada/$dia"
        rclone delete cofre:banco --min-age "${DIAS_FORA_DO_SERVIDOR}d"
        rclone delete cofre:midia-apagada --min-age "${DIAS_FORA_DO_SERVIDOR}d" --rmdirs
    else
        registrar "AVISO: sem destino externo (BACKUP_S3_* no .env), o backup ficou só neste servidor."
    fi

    echo "$dia" >"$PASTA/ultimo-backup"
    if [ -n "${AVISO_DO_BACKUP_URL:-}" ]; then
        wget -q -O /dev/null "$AVISO_DO_BACKUP_URL" ||
            registrar "AVISO: o endereço de aviso do backup não respondeu."
    fi
    registrar "Backup de $dia concluído."
}

agendar() {
    registrar "Backup diário a partir das ${HORA_DO_BACKUP}h, no horário de Brasília."
    while true; do
        hoje=$(date +%F)
        ultimo=$(cat "$PASTA/ultimo-backup" 2>/dev/null || true)
        if [ "$(date +%H)" -ge "$HORA_DO_BACKUP" ] && [ "$ultimo" != "$hoje" ]; then
            if ! backup.sh agora; then
                registrar "ERRO: o backup de $hoje falhou. Nova tentativa em uma hora."
                sleep 3600
            fi
        fi
        sleep 300
    done
}

case "${1:-}" in
    agora) fazer_backup ;;
    agendar) agendar ;;
    *)
        echo "Uso: backup.sh agendar | agora" >&2
        exit 2
        ;;
esac
