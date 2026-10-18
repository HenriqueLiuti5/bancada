FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/opt/venv/bin:$PATH"

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libpango-1.0-0 \
        libpangoft2-1.0-0 \
        libharfbuzz-subset0 \
        fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app


FROM base AS desenvolvimento

ENV RUFF_CACHE_DIR=/tmp/ruff-cache \
    MYPY_CACHE_DIR=/tmp/mypy-cache

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project

COPY . .

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]


FROM base AS producao

ARG VERSAO=local
ENV VERSAO=$VERSAO \
    WEB_CONCURRENCY=2 \
    XDG_CACHE_HOME=/tmp/cache

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

COPY . .

# Os arquivos do painel administrativo são coletados na montagem da imagem. O DEBUG ligado só
# neste comando dispensa a chave de produção, que não existe aqui. O cache de fontes do gerador de
# PDF é montado agora, e o que a coleta deixou em /tmp sai, para o usuário da API recriar.
RUN DJANGO_DEBUG=1 python manage.py collectstatic --noinput \
    && fc-cache -f \
    && rm -rf /tmp/cache \
    && useradd --system --uid 10001 --no-create-home --home-dir /nonexistent bancada \
    && mkdir -p /app/media \
    && chown bancada /app/media

USER bancada

EXPOSE 8000

# Antes de atender, a API confere a configuração de produção e o papel do banco, e não sobe se o
# papel puder passar por cima do isolamento entre assistências (ADR 0032).
CMD ["sh", "-c", "python manage.py check --deploy --database default --fail-level WARNING && exec gunicorn -c python:config.gunicorn config.wsgi"]
