.PHONY: setup dev db-up db-down db-migrate db-studio smoke-test

## First-time setup — run once after cloning
setup: db-up db-migrate
	@echo "✓ Setup complete. Add your QWEN_API_KEY to .env then run: make dev"

## Start all three services (MCP + API + Web)
dev:
	npm run dev

## Start postgres + redis via Docker
db-up:
	docker compose up -d
	@echo "Waiting for postgres..."
	@until docker compose exec -T postgres pg_isready -U inbox -d inboxpilot > /dev/null 2>&1; do sleep 1; done
	@echo "✓ Postgres ready"

## Stop Docker services
db-down:
	docker compose down

## Run Prisma migrations
db-migrate:
	npm run db:migrate

## Open Prisma Studio
db-studio:
	npm run db:studio

## Quick smoke test — check all three services respond
smoke-test:
	@echo "Checking MCP server..."
	@curl -sf http://localhost:4001/tools -H "x-mcp-key: internal-secret" | python3 -m json.tool | head -5 || echo "FAIL: MCP not responding"
	@echo "Checking API server..."
	@curl -sf http://localhost:3001/health | python3 -m json.tool || echo "FAIL: API not responding"
	@echo "Checking Web server..."
	@curl -sf http://localhost:3000 -o /dev/null -w "HTTP %{http_code}\n" || echo "FAIL: Web not responding"
	@echo "✓ Smoke test complete"
