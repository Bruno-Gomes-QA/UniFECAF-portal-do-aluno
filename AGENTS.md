# agents.md (Root / Repo)

Este arquivo define **regras e padrões** para agentes/assistentes e para qualquer pessoa contribuindo no repositório.

## Objetivos do repo
- Monorepo simples: `backend/` (FastAPI) + `frontend/` (Next.js)
- Execução local com 1 comando: `docker compose up --build`
- CI (GitHub Actions) com lint/test/build
- Autenticação com **JWT via cookie httpOnly**
- Home consumindo `/home` protegido
- PostgreSQL gerenciado com Alembic desde o início

## Estrutura (contrato)
- `backend/`: Python/FastAPI + SQLAlchemy + Alembic + Pydantic
- `frontend/`: Next.js/TS + Bun
- `docs/`: documentação (guias, PRs, decisões)
- `.github/workflows`: CI
- Cada pasta (backend/frontend) tem seu próprio `AGENTS.md`

> **Não** adicionar ferramentas de monorepo (turbo/nx/lerna) sem necessidade clara. Preferir simplicidade.

## Tecnologias obrigatórias
### Backend
- FastAPI + Uvicorn
- Pydantic v2 (validação e schemas)
- PostgreSQL (Docker)
- SQLAlchemy (ORM)
- Alembic (migrations)
- Pytest + Ruff

### Frontend
- Next.js + TypeScript
- Bun (package manager e runtime)
- ESLint + TypeScript compiler

## Padrões gerais
### Qualidade
- Nada de código “mágico” sem doc.
- Preferir funções pequenas, nomes óbvios, e camadas bem separadas.
- Nenhum warning novo (lint/typecheck/test).

### Commits e PRs
- PRs pequenos e focados (Foundation -> Docker -> CI -> API -> WEB -> Polish).
- Cada PR deve incluir:
  - **O que foi feito**
  - **Como testar**
  - Checklist (lint/test/build)
- Sem “mega PR” com 200 arquivos misturados.

### Reprodutibilidade
- Tudo que rodar local deve rodar no Docker.
- `.env.example` sempre atualizado.
- `README.md` deve permitir rodar sem adivinhação.

## Convenções de config e env
- Variáveis do backend no `.env` (ex.: `JWT_SECRET`, `CORS_ORIGINS`, `DATABASE_URL`)
- Variáveis expostas ao browser **obrigatoriamente** com prefixo `NEXT_PUBLIC_` (ex.: `NEXT_PUBLIC_API_BASE`)
- Nunca commitar `.env` real
- PostgreSQL: `DATABASE_URL=postgresql://user:pass@db:5432/dbname`

## Segurança (mínimo aceitável)
- JWT em cookie `httpOnly`
- CORS com `allow_credentials=True` e origins restritos
- Em dev, `secure=False` no cookie; em produção, `secure=True`
- Evitar colocar tokens em `localStorage`

## Logging e erros
- Backend: mensagens de erro claras, sem vazar segredos
- Frontend: estados de erro com fallback e “tentar novamente”

## Testes (mínimo)
- Backend: 1 teste de fluxo auth (`login -> /home` e `sem cookie -> 401`)
- Frontend: pelo menos validação de lint/typecheck/build; testes UI opcionais por enquanto

## Definition of Done (DoD)
- `docker compose up --build` funciona (backend + frontend + PostgreSQL)
- Migrations do Alembic aplicadas automaticamente
- CI verde (lint/test/build)
- Fluxo login + `/home` protegido funcionando
- Docs atualizadas (quando houver mudança de uso/ambiente)
