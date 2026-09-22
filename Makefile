.DEFAULT_GOAL := help

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-14s\033[0m %s\n", $$1, $$2}'

up: ## Sobe todos os servicos
	docker compose up -d --build

down: ## Derruba todos os servicos
	docker compose down

logs: ## Acompanha os logs de todos os servicos
	docker compose logs -f

ps: ## Mostra o estado dos servicos
	docker compose ps

shell: ## Abre um terminal dentro do container da API
	docker compose exec api bash

migrate: ## Aplica as migracoes do banco
	docker compose exec api python manage.py migrate

makemigrations: ## Gera novas migracoes a partir dos models
	docker compose exec api python manage.py makemigrations

superuser: ## Cria um usuario administrador
	docker compose exec api python manage.py createsuperuser

test: ## Roda os testes do backend
	docker compose exec api pytest

lint: ## Roda os verificadores de qualidade do backend
	docker compose exec api ruff check .
	docker compose exec api ruff format --check .
	docker compose exec api mypy .

fmt: ## Formata o codigo do backend
	docker compose exec api ruff format .
	docker compose exec api ruff check --fix .

clean: ## Derruba tudo e apaga os volumes (APAGA O BANCO LOCAL)
	docker compose down -v

.PHONY: help up down logs ps shell migrate makemigrations superuser test lint fmt clean
