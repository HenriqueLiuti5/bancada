# Partes comuns ao backup.sh e ao restaurar.sh.

PASTA=/backups
ORIGEM_DAS_FOTOS=/midia

# Os avisos do Postgres que não são problema, como "esse banco de teste não existe", ficam fora
# do log.
export PGOPTIONS="-c client_min_messages=warning"

registrar() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $*"
}

destino_configurado() {
    [ -n "${BACKUP_S3_BUCKET:-}" ]
}

# O destino externo é um armazenamento compatível com S3. Por cima dele, o "cofre" do rclone
# criptografa o conteúdo e o nome de cada arquivo com a BACKUP_SENHA antes do envio.
configurar_destino() {
    if [ -z "${BACKUP_SENHA:-}" ]; then
        registrar "ERRO: defina BACKUP_SENHA no .env para mandar o backup para fora do servidor."
        return 1
    fi
    export RCLONE_CONFIG_DESTINO_TYPE=s3
    if [ -n "${BACKUP_S3_ENDPOINT:-}" ]; then
        export RCLONE_CONFIG_DESTINO_PROVIDER=Other
        export RCLONE_CONFIG_DESTINO_ENDPOINT="$BACKUP_S3_ENDPOINT"
    else
        export RCLONE_CONFIG_DESTINO_PROVIDER=AWS
    fi
    if [ -n "${BACKUP_S3_REGION:-}" ]; then
        export RCLONE_CONFIG_DESTINO_REGION="$BACKUP_S3_REGION"
    fi
    export RCLONE_CONFIG_DESTINO_ACCESS_KEY_ID="${BACKUP_S3_ACCESS_KEY_ID:-}"
    export RCLONE_CONFIG_DESTINO_SECRET_ACCESS_KEY="${BACKUP_S3_SECRET_ACCESS_KEY:-}"
    export RCLONE_CONFIG_DESTINO_NO_CHECK_BUCKET=true
    export RCLONE_CONFIG_COFRE_TYPE=crypt
    export RCLONE_CONFIG_COFRE_REMOTE="destino:$BACKUP_S3_BUCKET/bancada"
    RCLONE_CONFIG_COFRE_PASSWORD=$(printf '%s' "$BACKUP_SENHA" | rclone obscure -)
    export RCLONE_CONFIG_COFRE_PASSWORD
}

# Com as fotos e as logos num armazenamento S3 (S3_BUCKET), o backup as copia de lá; sem ele, da
# pasta de mídia, que é a mesma da API.
configurar_origem_das_fotos() {
    if [ -z "${S3_BUCKET:-}" ]; then
        return 0
    fi
    export RCLONE_CONFIG_FOTOS_TYPE=s3
    if [ -n "${S3_ENDPOINT_URL:-}" ]; then
        export RCLONE_CONFIG_FOTOS_PROVIDER=Other
        export RCLONE_CONFIG_FOTOS_ENDPOINT="$S3_ENDPOINT_URL"
    else
        export RCLONE_CONFIG_FOTOS_PROVIDER=AWS
    fi
    if [ -n "${S3_REGION:-}" ]; then
        export RCLONE_CONFIG_FOTOS_REGION="$S3_REGION"
    fi
    export RCLONE_CONFIG_FOTOS_ACCESS_KEY_ID="${S3_ACCESS_KEY_ID:-}"
    export RCLONE_CONFIG_FOTOS_SECRET_ACCESS_KEY="${S3_SECRET_ACCESS_KEY:-}"
    export RCLONE_CONFIG_FOTOS_NO_CHECK_BUCKET=true
    ORIGEM_DAS_FOTOS="fotos:$S3_BUCKET"
}
