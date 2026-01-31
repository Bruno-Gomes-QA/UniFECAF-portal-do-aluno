.PHONY: help up down logs api-lint api-test web-lint web-typecheck web-build

help:
	@echo "Targets:"
	@echo "  up             - docker compose up --build"
	@echo "  down           - docker compose down"
	@echo "  logs           - docker compose logs -f"
	@echo "  api-lint       - ruff format/check"
	@echo "  api-test       - pytest"
	@echo "  web-lint       - npm run lint"
	@echo "  web-typecheck  - npm run typecheck"
	@echo "  web-build      - npm run build"

up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f

api-lint:
	cd apps/api && ruff format . && ruff check .

api-test:
	cd apps/api && pytest

web-lint:
	cd apps/web && npm run lint

web-typecheck:
	cd apps/web && npm run typecheck

web-build:
	cd apps/web && npm run build
