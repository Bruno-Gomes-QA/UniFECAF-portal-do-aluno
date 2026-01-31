# PR02 — Docker & Docker Compose (Ambiente Reprodutível + PostgreSQL)

## Objetivo
Garantir que a banca consiga rodar tudo com:
```bash
docker compose up --build
```
Incluindo PostgreSQL rodando em container e migrations automáticas.

## Escopo
✅ Inclui
- `Dockerfile` para API e WEB
- `docker-compose.yml` na raiz com 3 serviços: `db`, `api`, `web`
- PostgreSQL container configurado
- Migrations automáticas do Alembic no startup da API
- `healthcheck` na API e no PostgreSQL
- `env` central com `.env`

❌ Não inclui
- CI (PR03)
- Auth/JWT e Home real (PR04/PR05)

## Checklist de implementação
### API Dockerfile (backend/Dockerfile)
- [ ] Base `python:3.12-slim`
- [ ] Copiar `requirements*.txt`
- [ ] `pip install` (com cache)
- [ ] Copiar código (incluindo `alembic/` e `alembic.ini`)
- [ ] Expor `8000`
- [ ] Criar script de entrypoint que:
  - [ ] Aguarda PostgreSQL estar pronto
  - [ ] Executa `alembic upgrade head`
  - [ ] Inicia `uvicorn app.main:app --host 0.0.0.0 --port 8000`

### WEB Dockerfile (frontend/Dockerfile)
- [ ] Base `oven/bun:1` para build
- [ ] Copiar `package.json` e `bun.lockb`
- [ ] `bun install`
- [ ] Copiar código
- [ ] Build: `bun run build`
- [ ] Multi-stage: usar `oven/bun:1-slim` para runtime
- [ ] Start: `bun run start` (porta 3000)

### docker-compose.yml
- [ ] Service `db`:
  - [ ] Image `postgres:16-alpine`
  - [ ] Variáveis: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
  - [ ] Volume para persistência: `pgdata:/var/lib/postgresql/data`
  - [ ] Healthcheck usando `pg_isready`
  - [ ] Porta `5432:5432` (para dev local)
- [ ] Service `api`:
  - [ ] Build de `./backend`
  - [ ] Porta `8000:8000`
  - [ ] Depende de `db` (com `condition: service_healthy`)
  - [ ] Variável `DATABASE_URL=postgresql://unifecaf:unifecaf@db:5432/unifecaf_dev`
  - [ ] Outras vars: `CORS_ORIGINS`, `JWT_SECRET`, `JWT_EXPIRES_MINUTES`
- [ ] Service `web`:
  - [ ] Build de `./frontend`
  - [ ] Porta `3000:3000`
  - [ ] Depende de `api`
  - [ ] Variável `NEXT_PUBLIC_API_BASE=http://localhost:8000`
- [ ] Volume `pgdata` declarado

### .env.example
- [ ] `# PostgreSQL`
- [ ] `POSTGRES_USER=unifecaf`
- [ ] `POSTGRES_PASSWORD=unifecaf`
- [ ] `POSTGRES_DB=unifecaf_dev`
- [ ] `DATABASE_URL=postgresql://unifecaf:unifecaf@db:5432/unifecaf_dev`
- [ ] `# Backend`
- [ ] `JWT_SECRET=changeme-super-secret-key-min-32-chars`
- [ ] `JWT_EXPIRES_MINUTES=60`
- [ ] `CORS_ORIGINS=http://localhost:3000`
- [ ] `# Frontend`
- [ ] `NEXT_PUBLIC_API_BASE=http://localhost:8000`

## Como testar
```bash
cp .env.example .env
docker compose up --build
# PostgreSQL: localhost:5432 (conectar com psql/DBeaver)
# API: http://localhost:8000/health
# WEB: http://localhost:3000
# Verificar logs da API para confirmar que migrations rodaram
```

## Critérios de aceite
- `docker compose up --build` sobe sem erros
- PostgreSQL responde em `:5432`
- Migrations do Alembic executam automaticamente no startup da API
- API responde em `:8000` e conecta ao PostgreSQL
- WEB responde em `:3000`
- Variáveis de ambiente carregadas
- Volume `pgdata` persiste dados entre restarts

## Notas importantes (cookies)
- Cookie é por domínio (localhost), não por porta. Então, cookie setado pelo backend tende a funcionar também no `localhost:3000`.
- Em dev, **não** usar `SameSite=None` (exigiria `Secure=true`).

## Notas sobre PostgreSQL e migrations
- API deve aguardar PostgreSQL estar pronto antes de rodar migrations (usar `depends_on` com `condition: service_healthy`)
- Script de entrypoint pode usar um simples loop `pg_isready` ou biblioteca como `wait-for-it`
- Alembic deve rodar `upgrade head` toda vez que a API sobe (idempotente)
- Em produção, migrations devem rodar em um step separado (CI/CD), mas para dev isso é ok
