#!/bin/sh
# Restauração do backup do Bancada (ADR 0032). O passo a passo está em infra/producao/README.md.
#
#   restaurar.sh listar          mostra as cópias do banco, no servidor e fora dele
#   restaurar.sh banco ARQUIVO   restaura o banco a partir de uma cópia, como banco-2026-10-18.dump
#   restaurar.sh fotos           traz de volta as fotos e as logos do destino externo
#
# O banco só é restaurado num banco vazio, recém-criado pelo criar-papeis.sh, para nunca misturar
# os dados de agora com os do backup. Os papéis do banco já existem nele, e a cópia volta com as
# mesmas permissões de antes.

set -eu

. /usr/local/lib/bancada/comum.sh

listar() {
    registrar "Cópias do banco neste servidor:"
    find "$PASTA" -name 'banco-*.dump' -exec basename {} \; | sort
    if destino_configurado; then
        configurar_destino
        registrar "Cópias do banco fora do servidor:"
        rclone lsf cofre:banco
    fi
}

restaurar_banco() {
    nome=$(basename "$1")
    arquivo="$PASTA/$nome"
    if [ ! -f "$arquivo" ]; then
        if ! destino_configurado; then
            registrar "ERRO: $nome não está em $PASTA, e não há destino externo configurado."
            exit 1
        fi
        configurar_destino
        registrar "Baixando $nome do destino externo."
        rclone copy "cofre:banco/$nome" "$PASTA"
    fi

    tabelas=$(psql -tAc "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'")
    if [ "$tabelas" != "0" ]; then
        registrar "ERRO: o banco $PGDATABASE já tem $tabelas tabelas. A restauração só é feita" \
            "num banco vazio: siga o passo a passo do README."
        exit 1
    fi

    pg_restore --exit-on-error --single-transaction --dbname="$PGDATABASE" "$arquivo"
    registrar "Banco restaurado a partir de $nome."
}

restaurar_fotos() {
    if ! destino_configurado; then
        registrar "ERRO: sem destino externo configurado, não há de onde trazer as fotos."
        exit 1
    fi
    configurar_destino
    configurar_origem_das_fotos
    rclone copy cofre:midia "$ORIGEM_DAS_FOTOS"
    registrar "Fotos e logos restauradas em $ORIGEM_DAS_FOTOS."
}

case "${1:-}" in
    listar) listar ;;
    banco)
        if [ -z "${2:-}" ]; then
            echo "Informe a cópia: restaurar.sh banco banco-AAAA-MM-DD.dump" >&2
            exit 2
        fi
        restaurar_banco "$2"
        ;;
    fotos) restaurar_fotos ;;
    *)
        echo "Uso: restaurar.sh listar | banco ARQUIVO | fotos" >&2
        exit 2
        ;;
esac
