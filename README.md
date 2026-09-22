# Bancada

SaaS de ordens de serviço para assistências técnicas de celular. A assistência registra o
aparelho e o defeito; o cliente final acompanha o reparo por um link público, sem precisar
criar conta.

## Estado atual

Fase 0 concluída: ambiente de desenvolvimento completo subindo com um comando, integração
contínua configurada e decisões de arquitetura registradas.

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Django 5 + Django REST Framework |
| Banco | PostgreSQL 17 com pgvector |
| Cache e fila | Redis |
| Tarefas assíncronas | Celery |
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 |
| Ambiente | Docker Compose |
| CI | GitHub Actions |

## Como rodar

Pré-requisitos: Docker com o plugin Compose.

```bash
cp .env.example .env
make up
```

Serviços disponíveis:

| Endereço | O que é |
|---|---|
| http://localhost:3000 | Aplicação web |
| http://localhost:8000/api/health/ | Verificação de saúde da API |
| http://localhost:8000/admin/ | Administração do Django |
| localhost:5433 | PostgreSQL |
| localhost:6380 | Redis |

As portas do banco e do Redis são 5433 e 6380 no host para não conflitar com instalações
locais nas portas padrão. Dentro da rede do Docker os serviços continuam nas portas 5432 e
6379. Para mudar, ajuste `POSTGRES_HOST_PORT` e `REDIS_HOST_PORT` no `.env`.

## Comandos

```bash
make help        # lista todos os comandos
make up          # sobe os serviços
make down        # derruba os serviços
make logs        # acompanha os logs
make test        # roda os testes do backend
make lint        # roda ruff e mypy
make migrate     # aplica migrações
make superuser   # cria um administrador
make clean       # derruba tudo e apaga o banco local
```

## Estrutura

```
apps/api     Backend Django, Celery e testes
apps/web     Frontend Next.js
docs/        Plano do projeto e registros de decisão de arquitetura
infra/       Infraestrutura de produção (a partir da Fase 6)
```

## Documentação

- [Plano do projeto](docs/PLANO.md) — visão geral, domínio e roadmap
- [Decisões de arquitetura](docs/adr/) — o porquê de cada escolha técnica
