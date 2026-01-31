# AGENTS.md (backend/)

Regras e padrões específicos do **backend FastAPI (Python)**.

## Objetivo do backend
- Expor uma API segura e bem documentada (Swagger em `/docs`)
- Autenticação via **JWT access-only** em cookie `access_token` (httpOnly)
- Revogação real de sessão via allowlist `auth.jwt_sessions` (`jti`)
- PostgreSQL gerenciado com **Alembic** desde o início

## Contrato de rotas

### Infra
- `GET /health` (verifica conectividade com Postgres)

### Auth (v1)
- `POST /api/v1/auth/login` → **204** + `Set-Cookie: access_token=...`
- `POST /api/v1/auth/logout` → **204** (revoga sessão + remove cookie)
- `GET  /api/v1/auth/me`

### Portal do aluno (/me)
- `GET  /api/v1/me/profile`
- `GET  /api/v1/me/today-class` (regra “1 aula por dia”, robusto com `warnings[]`)
- `GET  /api/v1/me/academic/summary`
- `GET  /api/v1/me/financial/summary`
- `GET  /api/v1/me/financial/invoices` (paginado)
- `POST /api/v1/me/financial/invoices/{invoice_id}/pay-mock`
- `GET  /api/v1/me/notifications` (paginado + `unread_only`)
- `GET  /api/v1/me/notifications/unread-count`
- `POST /api/v1/me/notifications/{user_notification_id}/read|unread|archive`
- `GET  /api/v1/me/documents`
- `POST /api/v1/me/documents/{doc_type}/request`
- `GET  /api/v1/me/documents/{doc_type}/download`

### Admin (exige `ADMIN`)
- CRUD acadêmico: terms, courses, subjects, sections, meetings, sessions, students, enrollments, attendance, assessments, assessment-grades, final-grades
- Financeiro: invoices, payments + `POST /api/v1/admin/invoices/{invoice_id}/mark-paid`
- Comunicação: notifications + deliver + user-notifications + preferences
- Documentos: student-documents

### Compatibilidade
- Não manter rotas legacy (usar apenas `/api/v1/*`).

## Estrutura do código (atual)
```txt
backend/
├── app
│   ├── core
│   │   ├── config.py      # Settings (pydantic-settings)
│   │   ├── database.py    # engine + SessionLocal + get_db
│   │   ├── deps.py        # deps: current_user, admin, pagination
│   │   ├── errors.py      # envelope de erro + handlers
│   │   └── security.py    # bcrypt + JWT (sub/jti/exp)
│   ├── db
│   │   └── utils.py       # helpers de CRUD/paginação
│   ├── models             # SQLAlchemy models (schemas do Postgres)
│   ├── routers
│   │   ├── v1/            # contrato /api/v1
│   │   ├── health.py
│   │   ├── home.py
│   │   └── auth.py        # legacy
│   ├── schemas            # Pydantic request/response
│   └── main.py
├── alembic
│   └── versions
└── tests
```

## Padrões de API
- Prefixo: `/api/v1/*`
- Paginação padrão: `limit` (1..100) e `offset` (>=0)
- Erros sempre em envelope:
```json
{ "error": { "code": "SOME_CODE", "message": "Mensagem", "details": {} } }
```
- **Weekday convention** (academics.section_meetings): `0=Domingo ... 6=Sábado`

## Segurança (mínimo aceitável)
- Cookie `access_token`: `httponly=True`, `samesite=lax` (dev), `secure=False` (dev)
- CORS: `allow_credentials=True` e origins restritos (nunca `*`)
- Nunca colocar tokens em `localStorage`
- Não logar segredos/cookies/tokens

## Testes (mínimo)
Obrigatório manter verde:
- Auth v1: login/me/logout
- RBAC: student bloqueado em `/api/v1/admin/*`
- Flows `/me`: notifications, pay-mock, documents
- Admin smoke: criação de semestre mínimo + validação de conflito de agenda

## Qualidade
Deve passar:
- `ruff check .`
- `ruff format --check .`
- `pytest`
