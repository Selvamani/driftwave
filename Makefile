.PHONY: up down index watch logs api-logs indexer-logs test lint clean reset-index pull-model setup setup-dev

# ── SETUP ──────────────────────────────────────────────

setup: ## Initial setup — copy .env, pull Ollama model, start services
	@echo "🌊 Setting up Driftwave..."
	@[ -f .env ] || cp .env.example .env && echo "✓ Created .env from .env.example"
	@echo "▶  Starting services..."
	@docker compose up -d navidrome qdrant redis postgres
	@echo "▶  Pulling Ollama model (this may take a while)..."
	@docker compose run --rm ollama ollama pull $$(grep OLLAMA_MODEL .env | cut -d= -f2 || echo gemma2:9b)
	@docker compose up -d
	@echo ""
	@echo "✅ Driftwave is ready!"
	@echo "   Web app:    http://localhost:$$(grep FRONTEND_PORT .env | cut -d= -f2 || echo 3000)"
	@echo "   API docs:   http://localhost:$$(grep API_PORT .env | cut -d= -f2 || echo 8000)/docs"
	@echo "   Navidrome:  http://localhost:$$(grep NAVIDROME_PORT .env | cut -d= -f2 || echo 4533)"

setup-dev: ## Install local deps + start backing services (qdrant, redis, postgres, ollama)
	@echo "🌊 Setting up Driftwave dev environment..."
	@[ -f .env ] || cp .env.example .env && echo "✓ Created .env from .env.example"
	@echo "▶  Starting backing services..."
	docker compose up -d qdrant redis postgres ollama
	@echo "▶  Creating API venv..."
	python3 -m venv api/.venv
	api/.venv/bin/pip install -r api/requirements.txt
	@echo "▶  Creating indexer venv..."
	python3 -m venv indexer/.venv
	indexer/.venv/bin/pip install -r indexer/requirements.txt
	@echo "▶  Installing frontend deps..."
	cd frontend && npm install
	@echo "▶  Installing Flutter deps..."
	cd mobile && flutter pub get
	@echo ""
	@echo "✅ Dev environment ready!"
	@echo "   make api-dev      → API with hot reload"
	@echo "   make frontend-dev → React dev server"
	@echo "   make indexer-dev  → Indexer watch mode"

# ── SERVICES ───────────────────────────────────────────

up: ## Start all services
	docker compose up -d
	@echo "✅ All services up"
	@echo "   Web:       http://localhost:3000"
	@echo "   API:       http://localhost:8000/docs"
	@echo "   Navidrome: http://localhost:4533"

down: ## Stop all services
	docker compose down

restart: ## Restart all services
	docker compose restart

restart-api: ## Restart API (picks up code changes)
	docker compose restart api

# ── INDEXER ────────────────────────────────────────────

index: ## Full library scan (one-shot)
	@echo "🎵 Indexing music library..."
	docker compose run --rm indexer python main.py scan

watch: ## Watch mode — auto-index new files
	@echo "👁  Watching for new files..."
	docker compose run --rm indexer python main.py watch

reset-index: ## Clear Qdrant collections and re-index from scratch
	@echo "⚠️  This will clear all indexed data. Are you sure? [y/N] " && read ans && [ $${ans:-N} = y ]
	docker compose run --rm indexer python main.py reset
	$(MAKE) index

pull-model: ## Pull/update Ollama model
	docker compose exec ollama ollama pull $$(grep OLLAMA_MODEL .env | cut -d= -f2 || echo gemma2:9b)

test-navidrome: ## Test Navidrome Subsonic connection from the indexer
	docker compose run --rm indexer python -c "\
import asyncio, os; \
from config import settings; \
from navidrome import find_song_id; \
print(f'URL: {settings.NAVIDROME_URL}'); \
print(f'User: {settings.NAVIDROME_USER}'); \
result = asyncio.run(find_song_id('Mutham Mutham', '/music/12B/Mutham Mutham.mp3')); \
print(f'subsonic_id: {result!r}') \
"

# ── LOGS ───────────────────────────────────────────────

logs: ## Tail all service logs
	docker compose logs -f

api-logs: ## Tail API logs
	docker compose logs -f api

indexer-logs: ## Tail indexer logs
	docker compose logs -f indexer

navidrome-logs: ## Tail Navidrome logs
	docker compose logs -f navidrome

# ── DEVELOPMENT ────────────────────────────────────────

api-dev: ## Run API in dev mode with hot reload
	api/.venv/bin/uvicorn api.main:app --reload --port 8000

frontend-dev: ## Run frontend in dev mode
	cd frontend && npm install && npm run dev

indexer-dev: ## Run indexer locally with watch mode
	indexer/.venv/bin/python indexer/main.py watch

test: ## Run all tests
	@echo "🧪 Running API tests..."
	api/.venv/bin/pytest api/tests/ -v
	@echo "🧪 Running indexer tests..."
	indexer/.venv/bin/pytest indexer/tests/ -v

lint: ## Lint Python and Dart code
	api/.venv/bin/ruff check api/
	indexer/.venv/bin/ruff check indexer/
	cd mobile && dart analyze

# ── CLEANUP ────────────────────────────────────────────

clean: ## Remove containers, networks (keep volumes)
	docker compose down --remove-orphans

clean-all: ## Remove EVERYTHING including volumes (destructive!)
	@echo "⚠️  This will delete all data including your index. Are you sure? [y/N] " && read ans && [ $${ans:-N} = y ]
	docker compose down -v --remove-orphans

# ── INFO ───────────────────────────────────────────────

status: ## Show running service status
	docker compose ps

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
