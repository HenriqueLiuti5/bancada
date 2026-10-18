#!/bin/sh
# Roda na primeira vez que o container do banco sobe, com o banco ainda vazio, e cria os papéis
# descritos em papeis.sql com as senhas do .env.

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    -v banco="$POSTGRES_DB" \
    -v dono="$POSTGRES_OWNER_USER" \
    -v senha_do_dono="$POSTGRES_OWNER_PASSWORD" \
    -v aplicacao="$POSTGRES_APP_USER" \
    -v senha_da_aplicacao="$POSTGRES_APP_PASSWORD" \
    -f /bancada/papeis.sql
