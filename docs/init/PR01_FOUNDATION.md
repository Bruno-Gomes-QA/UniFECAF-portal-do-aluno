# PR01 — Foundation (Monorepo + Padrões + Tooling + PostgreSQL)

## Objetivo
Criar a base sólida do repositório para suportar o restante do desafio:
- Estrutura de monorepo (`backend/`, `frontend/`)
- Padrões de qualidade (lint/format/test)
- PostgreSQL setup com Alembic
- Documentação mínima para onboarding rápido

## Escopo
✅ Inclui
- Estrutura de pastas (`backend/`, `frontend/`, `docs/`, `.github/`)
- Arquivos raiz: `README.md`, `.env.example`, `Makefile`, `init.sql`, `AGENTS.md`
- PostgreSQL: schema (`init.sql`) e setup do Alembic
- Tooling inicial:
  - API: `ruff`, `pytest`, `sqlalchemy`, `alembic` configurados
  - WEB: `bun`, `eslint` e `tsc` scripts configurados
- AGENTS.md em cada pasta (raiz, backend, frontend)

❌ Não inclui
- Docker/Compose (PR02)
- CI (PR03)
- Implementação funcional (PR04+)

## Checklist de implementação
### Repo
- [ ] Criar pastas: `backend/`, `frontend/`, `docs/`, `.github/workflows`
- [ ] Criar `AGENTS.md` na raiz
- [ ] Criar `docs/00_GUIDE.md` (guia geral)
- [ ] Criar `docs/EXECUTION_PLAN.md` (checklist geral)
- [ ] Criar `README.md` inicial (como rodar local e visão geral)
- [ ] Criar `.env.example` (API + WEB + PostgreSQL)
- [ ] Criar `Makefile` com atalhos comuns
- [ ] Criar `init.sql` com schema PostgreSQL completo

### API (backend/)
- [ ] Criar `backend/AGENTS.md`
- [ ] Estrutura base:
  - [ ] `app/main.py` com FastAPI "hello"
  - [ ] `app/core/config.py` (Settings com Pydantic)
  - [ ] `app/core/database.py` (SQLAlchemy engine e session)
  - [ ] `app/core/security.py` (placeholders)
  - [ ] `app/models/` (pasta para SQLAlchemy models)
  - [ ] `app/routers/` (placeholder)
  - [ ] `app/schemas/` (Pydantic schemas)
  - [ ] `tests/` com 1 teste simples
- [ ] Alembic:
  - [ ] Inicializar Alembic: `alembic init alembic`
  - [ ] Configurar `alembic.ini` e `alembic/env.py`
  - [ ] Criar migration inicial baseada no `init.sql`
- [ ] Dependências:
  - [ ] `requirements.txt` (fastapi, uvicorn, sqlalchemy, alembic, psycopg2-binary, pydantic, pydantic-settings)
  - [ ] `requirements-dev.txt` (ruff, pytest, httpx)
- [ ] `pyproject.toml` com config do ruff (line-length, target-version)
- [ ] Scripts documentados (README/Makefile)

### WEB (frontend/)
- [ ] Criar `frontend/AGENTS.md`
- [ ] Inicializar Next.js com TypeScript em `frontend/`
- [ ] Configurar Bun:
  - [ ] `bun install` (gera `bun.lockb`)
  - [ ] Ajustar `package.json` scripts para usar Bun
- [ ] Adicionar scripts:
  - [ ] `bun run lint`
  - [ ] `bun run typecheck` (`tsc --noEmit`)
  - [ ] `bun run build`
  - [ ] `bun run dev`

## Makefile sugerido
- `make help`
- `make api-lint`, `make api-test`, `make api-migrate`
- `make web-lint`, `make web-typecheck`, `make web-build`
- `make db-up` (subir PostgreSQL local para dev)
- `make db-migrate` (aplicar migrations)

## Critérios de aceite
- Estrutura do repo pronta e clara
- `init.sql` criado com schema completo
- Alembic configurado e migration inicial criada
- API roda localmente (sem docker) com `uvicorn` e conecta ao PostgreSQL
- WEB builda localmente (sem docker) com `bun run build`
- `ruff` e `pytest` executam com sucesso
- AGENTS.md presente na raiz, backend/ e frontend/

## Notas
- Evitar overengineering: sem turbo/lerna/yarn workspaces. Monorepo “na raça” já atende muito bem.- PostgreSQL: usar `init.sql` como referência para criar migrations do Alembic
- Bun no frontend para velocidade e simplicidade
- SQLAlchemy 2.0+ (async se possível, mas sync também é ok para MVP)