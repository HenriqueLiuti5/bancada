.DEFAULT_GOAL := help

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-14s\033[0m %s\n", $$1, $$2}'

setup: ## Prepara o .env local com uma chave de criptografia nova
	@if [ -f .env ]; then \
		echo ".env ja existe; nada foi alterado."; \
	else \
		cp .env.example .env; \
		CHAVE=$$(python3 -c "import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())" 2>/dev/null || openssl rand -base64 32 | tr '+/' '-_'); \
		sed -i.bak "s|^BANCADA_ENCRYPTION_KEY=.*|BANCADA_ENCRYPTION_KEY=$$CHAVE|" .env && rm -f .env.bak; \
		echo ".env criado com uma chave de criptografia propria desta maquina."; \
	fi

up: ## Sobe todos os servicos
	docker compose up -d --build --renew-anon-volumes

down: ## Derruba todos os servicos
	docker compose down

logs: ## Acompanha os logs de todos os servicos
	docker compose logs -f

ps: ## Mostra o estado dos servicos
	docker compose ps

reiniciar-worker: ## Reinicia o worker e o agendador para carregarem codigo novo de tarefas
	docker compose restart worker beat

shell: ## Abre um terminal dentro do container da API
	docker compose exec api bash

migrate: ## Aplica as migracoes do banco
	docker compose exec api python manage.py migrate

makemigrations: ## Gera novas migracoes a partir dos models
	docker compose exec api python manage.py makemigrations

semear: ## Popula o banco com dados de demonstracao
	docker compose exec api python manage.py semear

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

.PHONY: help setup up down logs ps reiniciar-worker shell migrate makemigrations semear superuser test lint fmt clean
