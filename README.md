# Bancada

SaaS de ordens de serviço para assistências técnicas de celular. A assistência registra o
aparelho e o defeito; o cliente final acompanha o reparo por um link público, sem precisar
criar conta.

## Estado atual

Fase 1C concluída: o produto fecha o ciclo. A assistência abre a ordem, movimenta o status e
envia o link; o cliente acompanha o reparo sem criar conta.

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

Pré-requisitos: Docker com o plugin Compose, Git e `make`.

```bash
git clone https://github.com/HenriqueLiuti5/bancada.git
cd bancada
make setup
make up
make semear
```

O `make setup` cria o `.env` a partir do exemplo e gera uma chave de criptografia própria da
máquina. Essa chave protege a senha de desbloqueio dos aparelhos, então **cada ambiente tem a
sua** e ela nunca é versionada. Dados gravados com uma chave não podem ser lidos com outra.

O `make semear` cria uma assistência de exemplo com clientes, aparelhos e duas ordens de serviço,
além dos usuários `admin` e `joana` (senha `bancada123`, apenas para uso local).

Se `docker compose` não for reconhecido mas `docker-compose` existir, o plugin não está
registrado. Isso resolve, sem precisar de administrador:

```bash
mkdir -p ~/.docker/cli-plugins
ln -sf "$(command -v docker-compose)" ~/.docker/cli-plugins/docker-compose
```

Serviços disponíveis:

| Endereço | O que é |
|---|---|
| http://localhost:3000 | Aplicação web (entre com `joana` / `bancada123`) |
| http://localhost:8000/api/health/ | Verificação de saúde da API |
| http://localhost:8000/admin/ | Administração do Django |
| http://localhost:3000/os/`token` | Acompanhamento público (o token aparece no detalhe da OS) |
| localhost:5433 | PostgreSQL |
| localhost:6380 | Redis |

As portas do banco e do Redis são 5433 e 6380 no host para não conflitar com instalações
locais nas portas padrão. Dentro da rede do Docker os serviços continuam nas portas 5432 e
6379. Para mudar, ajuste `POSTGRES_HOST_PORT` e `REDIS_HOST_PORT` no `.env`.

## Comandos

```bash
make help        # lista todos os comandos
make setup       # cria o .env com uma chave de criptografia nova
make up          # sobe os serviços
make down        # derruba os serviços
make logs        # acompanha os logs
make test        # roda os testes do backend
make lint        # roda ruff e mypy
make migrate     # aplica migrações
make semear      # popula o banco com dados de demonstração
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
