# UniFECAF Portal do Aluno

Bem-vindo(a)! Este repositório é um **monorepo** com:
- `backend/`: API **FastAPI** + **PostgreSQL** (Alembic + SQLAlchemy 2.0 + Pydantic v2)
- `frontend/`: **Next.js** + TypeScript (Bun)

## Rodando com Docker (recomendado)

```bash
cp .env.example .env
docker compose up --build
```

Acesse:
- Web: `http://localhost:3000`
- API: `http://localhost:8000`
- Swagger (OpenAPI): `http://localhost:8000/docs`

### Credenciais de demo (seed)
- Admin: `admin@unifecaf.edu.br` / `admin123`
- Aluno: `demo@unifecaf.edu.br` / `demo123`

## O que tem no backend

### Autenticação (cookie httpOnly)
- JWT access-only em cookie `access_token` (httpOnly)
- Allowlist de sessões (`auth.jwt_sessions`) com `jti` para logout real
- CORS com `allow_credentials=True` e origins restritos

### Endpoints principais
- Health: `GET /health`
- Auth v1:
  - `POST /api/v1/auth/login` (204 + Set-Cookie)
  - `POST /api/v1/auth/logout` (204)
  - `GET  /api/v1/auth/me`
- Portal do aluno:
  - `GET  /api/v1/me/profile`
  - `GET  /api/v1/me/today-class`
  - `GET  /api/v1/me/academic/summary`
  - `GET  /api/v1/me/financial/summary`
  - `GET  /api/v1/me/financial/invoices`
  - `POST /api/v1/me/financial/invoices/{invoice_id}/pay-mock`
  - `GET  /api/v1/me/notifications`
  - `GET  /api/v1/me/notifications/unread-count`
  - `POST /api/v1/me/notifications/{user_notification_id}/read|unread|archive`
  - `GET  /api/v1/me/documents`
  - `POST /api/v1/me/documents/{doc_type}/request`
  - `GET  /api/v1/me/documents/{doc_type}/download`
- Admin (exige `ADMIN`):
  - CRUD: users, students, terms, courses, subjects, sections, meetings, sessions, enrollments, attendance, assessments, grades
  - Financeiro: invoices/payments + `mark-paid`
  - Comunicação: notifications + deliver + preferences
  - Documentos: student-documents

## Ambiente (.env)

Copie `.env.example` e ajuste se necessário:
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `DATABASE_URL` (formato: `postgresql://user:pass@db:5432/dbname`)
- `JWT_SECRET`
- `CORS_ORIGINS` (separado por vírgula)
- `NEXT_PUBLIC_API_BASE` (frontend)

## Qualidade / CI
- Backend: `ruff check`, `ruff format --check`, `pytest` (com Postgres)
- Frontend: `bun run lint`, `bun run typecheck`, `bun run build`

## Docs do projeto
Veja `docs/backend/BACKEND_GUIDE.md` para arquitetura e contrato de API.
