# UniFECAF Student Hub — Guia Geral (Chef)

> Data: 2026-01-30  
> Stack-alvo: **Next.js (TS) + Bun** + **FastAPI (Python) + PostgreSQL + SQLAlchemy + Alembic** + **Docker Compose** + **GitHub Actions (CI)**  
> Diretrizes escolhidas: **monorepo**, **CI (lint/test/build)**, **JWT via cookie httpOnly**, **Testes**, **Migrations desde o início**.

## Objetivo do repositório
Entregar um projeto, com:
- Estrutura clara (monorepo) e replicável em qualquer máquina
- Execução local **com 1 comando** via `docker compose up`
- PostgreSQL rodando em container com migrations automáticas (Alembic)
- CI consistente (front + back) garantindo qualidade
- Backend com autenticação (JWT em cookie httpOnly) e endpoint `/home`
- Frontend consumindo `/home` e exibindo a Home do Portal do Aluno

## Estratégia de entrega (por PRs)
**Ordem recomendada para não inventar moda, e ser profissional:**
1. **PR01 — Foundation**: monorepo + padrões + tooling base + PostgreSQL setup + docs mínimas
2. **PR02 — Docker & Compose**: Dockerfiles + compose + PostgreSQL + healthchecks + migrations + env
3. **PR03 — CI (GitHub Actions)**: lint/test/build + smoke (compose)
4. **PR04 — API Core**: FastAPI + /health + auth cookie + /home protegido + Pydantic schemas + SQLAlchemy models
5. **PR05 — Web Core**: Next + Bun + pages base + login + Home consumindo API
6. **PR06 — Integração & Polimento**: refinamentos UX + ajustes CORS/cookies + README final

---

## Convenções do repo

### Estrutura final esperada
```txt
.
├── backend
│   ├── AGENTS.md
│   ├── app
│   │   ├── core
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── security.py
│   │   ├── models
│   │   ├── routers
│   │   ├── schemas
│   │   └── main.py
│   ├── alembic
│   │   ├── versions
│   │   └── env.py
│   ├── alembic.ini
│   ├── tests
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend
│   ├── AGENTS.md
│   ├── src
│   ├── package.json
│   ├── bun.lockb
│   ├── next.config.mjs
│   └── Dockerfile
├── .github
│   └── workflows
│       └── ci.yml
├── docs
│   ├── 00_GUIDE.md
│   ├── EXECUTION_PLAN.md
│   ├── PR01_FOUNDATION.md
│   ├── PR02_DOCKER_COMPOSE.md
│   ├── PR03_CI.md
│   ├── PR04_API_CORE.md
│   ├── PR05_WEB_CORE.md
│   └── PR06_INTEGRATION_POLISH.md
├── init.sql
├── docker-compose.yml
├── .env.example
├── Makefile
├── AGENTS.md
└── README.md
```

### Padrões
- **Python**: `ruff` (lint + format) + `pytest` + `pydantic` + `fastapi` + `sqlalchemy` + `alembic`
- **Node**: `bun` (package manager) + `eslint` + `tsc --noEmit` + `next build`
- **Database**: PostgreSQL + migrations com Alembic baseadas em `init.sql`
- **Commits/PR**: título do PR seguindo `PRxx - ...` e checklist no corpo (copiar do .md)

---

## Fluxo de trabalho (local)
### Subir tudo
```bash
cp .env.example .env
docker compose up --build
```

### Rodar testes localmente (sem Docker)
**API**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
# Precisa de PostgreSQL rodando localmente ou via Docker
export DATABASE_URL="postgresql://unifecaf:unifecaf@localhost:5432/unifecaf_dev"
alembic upgrade head
ruff format .
ruff check .
pytest
```

**WEB**
```bash
cd frontend
bun install
bun run lint
bun run typecheck
bun run build
```

---

## Definições importantes (cookies/JWT/CORS)
### JWT via cookie httpOnly
- Cookie: `access_token` (httpOnly, path=/, sameSite=Lax, secure=false em dev)
- Proteção no back: extrair token do cookie e validar assinatura/expiração
- No front: requests ao backend usando `credentials: "include"`

### CORS
- Permitir `http://localhost:3000` com `allow_credentials=True`
- Em dev com Docker Compose: backend em `localhost:8000`, web em `localhost:3000`, PostgreSQL em `localhost:5432`

---

## PR template (copiar/colar na descrição do PR)
```md
## O que foi feito
- ...

## Como testar
- ...

## Checklist
- [ ] Lint passa
- [ ] Testes passam
- [ ] Build passa
- [ ] Documentação atualizada (se necessário)
```

---

## Critérios de “pronto”
- `docker compose up --build` sobe web + api + PostgreSQL sem erro
- Migrations do Alembic aplicadas automaticamente no startup
- CI passa em PR e em merge na main
- `/health` responde ok
- Login seta cookie e `/home` exige cookie
- Home renderiza dados do PostgreSQL, com estado de loading/erro
