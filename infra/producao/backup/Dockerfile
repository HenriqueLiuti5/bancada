FROM postgres:17-alpine

RUN apk add --no-cache rclone tzdata \
    && adduser -D -H -u 10001 reparium \
    && mkdir -p /backups /midia /usr/local/lib/reparium \
    && chown reparium /backups /midia

COPY comum.sh /usr/local/lib/reparium/
COPY backup.sh restaurar.sh /usr/local/bin/
RUN sed -i 's/\r$//' /usr/local/lib/reparium/comum.sh /usr/local/bin/backup.sh /usr/local/bin/restaurar.sh \
    && chmod 755 /usr/local/bin/backup.sh /usr/local/bin/restaurar.sh

# O rclone é configurado só por variáveis de ambiente, sem arquivo de configuração.
ENV HOME=/tmp \
    RCLONE_CONFIG=""

USER reparium

CMD ["backup.sh", "agendar"]
