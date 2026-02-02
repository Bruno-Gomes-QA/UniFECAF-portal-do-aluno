.PHONY: help up down logs api-lint api-test web-lint web-typecheck web-build

help:
	@echo "Targets:"
	@echo "  up             - docker compose up --build"
	@echo "  down           - docker compose down"
	@echo "  logs           - docker compose logs -f"
	@echo "  api-lint       - ruff format/check"
	@echo "  api-test       - pytest"
	@echo "  web-lint       - bun run lint"
	@echo "  web-typecheck  - bun run typecheck"
	@echo "  web-build      - bun run build"

up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f

api-lint:
	cd backend && ruff format . && ruff check .

api-test:
	cd backend && pytest

web-lint:
	cd frontend && bun run lint

web-typecheck:
	cd frontend && bun run typecheck

web-build:
	cd frontend && bun run build
