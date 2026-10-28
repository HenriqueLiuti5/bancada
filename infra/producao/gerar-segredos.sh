#!/bin/sh
# Cria o .env de produção a partir do .env.example, com senhas e chaves novas, geradas neste
# servidor. Não mexe num .env que já existe.

set -eu

cd "$(dirname "$0")"

if [ -f .env ]; then
    echo ".env já existe; nada foi alterado."
    exit 0
fi

aleatorio() {
    head -c "$1" /dev/urandom | base64 | tr '+/' '-_' | tr -d '=\n'
}

# A chave de criptografia é uma chave Fernet: 32 bytes em base64 para URL, com o = no fim.
chave_de_criptografia() {
    head -c 32 /dev/urandom | base64 | tr '+/' '-_' | tr -d '\n'
}

sed \
    -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(aleatorio 24)|" \
    -e "s|^POSTGRES_OWNER_PASSWORD=.*|POSTGRES_OWNER_PASSWORD=$(aleatorio 24)|" \
    -e "s|^POSTGRES_APP_PASSWORD=.*|POSTGRES_APP_PASSWORD=$(aleatorio 24)|" \
    -e "s|^DJANGO_SECRET_KEY=.*|DJANGO_SECRET_KEY=$(aleatorio 48)|" \
    -e "s|^BANCADA_ENCRYPTION_KEY=.*|BANCADA_ENCRYPTION_KEY=$(chave_de_criptografia)|" \
    -e "s|^ASAAS_WEBHOOK_TOKEN=.*|ASAAS_WEBHOOK_TOKEN=$(aleatorio 36)|" \
    -e "s|^BACKUP_SENHA=.*|BACKUP_SENHA=$(aleatorio 24)|" \
    -e "s|^UMAMI_POSTGRES_PASSWORD=.*|UMAMI_POSTGRES_PASSWORD=$(aleatorio 24)|" \
    -e "s|^UMAMI_APP_SECRET=.*|UMAMI_APP_SECRET=$(aleatorio 48)|" \
    .env.example >.env
chmod 600 .env

echo ".env criado com senhas e chaves novas. Falta preencher DOMINIO, o Asaas e o e-mail."
echo "Guarde uma cópia do .env num gerenciador de senhas, longe deste servidor."
