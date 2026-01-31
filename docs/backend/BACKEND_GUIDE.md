# UniFECAF Portal do Aluno — Backend Guide (Chef)

> Data: 2026-01-30  
> Stack: **FastAPI + Pydantic v2 + SQLAlchemy 2.0 + Alembic + PostgreSQL**  
> Auth: **JWT (access-only) em cookie httpOnly** + **allowlist de sessões (jti) para revogação**

Este guia é o “chef” do backend. Ele define arquitetura, padrões, modelos (Pydantic), endpoints, regras de negócio e o plano de PRs para implementar tudo com qualidade.

---

## 0) Decisões fechadas (para não virar refactor eterno)
- Monorepo: `apps/api` e `apps/web`
- Banco: PostgreSQL
- Migrações: **Alembic**
- ORM: **SQLAlchemy 2.0**
- Auth: cookie httpOnly (access token) + tabela `auth.jwt_sessions` para logout real
- Papeis:
  - **ADMIN**: CRUD completo e operações administrativas
  - **STUDENT**: acesso apenas aos próprios dados + ações de portal (ler/marcar notificação, solicitar documento, pagar boleto mock)
- Campus: **um único campus** → não modelar multi-campus.  
  **Ação:** remover `academics.campuses` e `academics.courses.campus_id` do schema/migration inicial.

---

## 1) Arquitetura de pastas (contrato)
Sugestão robusta e prática:

```txt
apps/api
├── app
│   ├── core
│   │   ├── config.py            # Settings (env)
│   │   ├── security.py          # JWT create/verify, cookie helpers
│   │   ├── errors.py            # Error envelope + exception handlers
│   │   └── deps.py              # auth deps (current_user, require_role, pagination)
│   ├── db
│   │   ├── base.py              # Base declarativa
│   │   ├── session.py           # engine + session factory
│   │   └── utils.py             # helpers de transação/paginação
│   ├── models                   # SQLAlchemy models (tabelas)
│   ├── schemas                  # Pydantic (requests/responses)
│   ├── repositories             # acesso ao DB (sem regra de negócio)
│   ├── services                 # regra de negócio (validações)
│   ├── routers
│   │   ├── auth.py
│   │   ├── me.py                # endpoints do aluno (portal)
│   │   ├── admin_academics.py
│   │   ├── admin_finance.py
│   │   ├── admin_comm.py
│   │   └── admin_documents.py
│   └── main.py                  # app setup, CORS, routers, handlers
├── alembic
│   ├── versions
│   └── env.py
├── alembic.ini
└── tests
    ├── test_auth_sessions.py
    ├── test_me_endpoints.py
    └── test_admin_crud_smoke.py
```

---

## 2) Padrões de API

### 2.1 Prefixos e versionamento
- Todas as rotas sob: `/api/v1`
- Separar domínios:
  - `/api/v1/auth/*`
  - `/api/v1/me/*`
  - `/api/v1/admin/*`

### 2.2 Envelope de erro (profissional)
Resposta padrão de erro:

```json
{
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Credenciais inválidas.",
    "details": {}
  }
}
```

- Implementar handlers para:
  - `HTTPException`
  - `RequestValidationError`
  - exceções internas genéricas (retornar `INTERNAL_ERROR` sem stack)

### 2.3 Paginação (limit/offset)
Padrão para listas:
- Query params: `limit` (default 20, max 100) e `offset` (default 0)
- Response:
```json
{ "items": [...], "limit": 20, "offset": 0, "total": 123 }
```

### 2.4 Data/Time
- `date`: `YYYY-MM-DD`
- `time`: `HH:MM:SS` (ou `HH:MM`)
- timestamps: UTC em `timestamptz`
- frontend formata para local

---

## 3) Auth e RBAC

### 3.1 Login/logout
- `POST /api/v1/auth/login`
  - recebe email+senha
  - cria JWT com `sub=user_id` e `jti=session_id`
  - cria linha em `auth.jwt_sessions`
  - seta cookie `access_token` (httpOnly, samesite=lax)
- `POST /api/v1/auth/logout`
  - revoga `jwt_sessions.jti`
  - remove cookie

### 3.2 Dependencies (FastAPI)
- `get_current_user()`:
  - lê cookie
  - valida JWT (signature + exp)
  - valida allowlist (`jwt_sessions` existe e não revogado)
- `require_role("ADMIN")`, `require_role("STUDENT")`
- `require_self_student()` para endpoints `/me/*` (impede aluno ver outro)

---

## 4) Regras de negócio-chave

### 4.1 Regra UniFECAF: “1 aula por dia”
Para um aluno **no curso atual**, existe **no máximo 1 aula por dia**.  
Implementação robusta:
- Validar no ato de matrícula (admin): o aluno não pode ter duas seções com encontro no mesmo weekday no term atual.
- Endpoint do aluno `/me/today-class`:
  - busca sessões do dia para as seções do aluno
  - se >1 por bug de dados: retorna a mais cedo e inclui `warnings[]` no payload.

### 4.2 Notas e faltas
- Nota final: 0..10 com **2 casas**
- Faltas: calcular a partir de `attendance_records`:
  - `absences_count = count(status='ABSENT')`
  - `total_sessions = count(all sessions)`
  - `absences_pct = absences_count/total_sessions*100`

### 4.3 Financeiro
- “Widget”: próximo invoice `PENDING` mais próximo do vencimento; se não existir, último `PAID`.
- “Pagar mock”: cria `payment` e seta invoice `PAID`.

### 4.4 Documentos
- “Solicitar”: `status=GENERATING`, em seguida mock “gera” (ou job futuro). Para o desafio: gerar síncrono simplificado.

---

## 5) Endpoints (mapa final)

### 5.1 Auth
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET  /api/v1/auth/me` (perfil do usuário logado)

### 5.2 Portal do aluno (/me)
- `GET  /api/v1/me/profile` (student + curso)
- `GET  /api/v1/me/today-class` (regra 1 aula/dia)
- `GET  /api/v1/me/academic/summary` (disciplinas do term atual: nota + % faltas + status)
- `GET  /api/v1/me/financial/summary` (próximo boleto, status)
- `GET  /api/v1/me/financial/invoices` (paginado)
- `POST /api/v1/me/financial/invoices/{invoice_id}/pay-mock`
- `GET  /api/v1/me/notifications` (paginado, filtro unread_only)
- `GET  /api/v1/me/notifications/unread-count`
- `POST /api/v1/me/notifications/{id}/read`
- `POST /api/v1/me/notifications/{id}/unread` (opcional)
- `POST /api/v1/me/notifications/{id}/archive` (opcional)
- `GET  /api/v1/me/documents`
- `POST /api/v1/me/documents/{doc_type}/request`
- `GET  /api/v1/me/documents/{doc_type}/download`

### 5.3 Admin (/admin) — CRUD completo + regras
**AuthZ:** todas exigem ADMIN.

- Users/Students:
  - `GET/POST/PUT/PATCH/DELETE /api/v1/admin/users`
  - `GET/POST/PUT/PATCH/DELETE /api/v1/admin/students`
- Catálogo acadêmico:
  - `terms`, `courses`, `subjects`, `sections`, `section_meetings`, `class_sessions`
  - `section_enrollments`, `attendance_records`
  - `assessments`, `assessment_grades`, `final_grades`
- Financeiro:
  - `invoices`, `payments`
- Comunicação:
  - `notifications`, `user_notifications`, `notification_preferences`
- Documentos:
  - `student_documents`

---

## 6) Plano de PRs (implementação segura)
1. **PR07 — Postgres + Alembic + Models** (schema final sem campus)
2. **PR08 — Base API** (RBAC, error envelope, deps, sessão JWT allowlist)
3. **PR09 — Admin Academics CRUD** (+ validações de “1 aula/dia” via matrículas)
4. **PR10 — Admin Finance + Payments** (+ pay mock)
5. **PR11 — Admin Comm + Documents** (notifications e documentos)
6. **PR12 — Portal do aluno (/me)** (endpoints consumíveis pelo frontend)
7. **PR13 — Regras e agregações** (summary endpoints e cálculos de faltas/notas)
8. **PR14 — Testes, hardening e OpenAPI polish** (contratos, exemplos)

---

## 7) DoD do backend
- Migrações aplicam sem erro (`alembic upgrade head`)
- CI passa (ruff + pytest)
- RBAC funciona: aluno não acessa admin; aluno não vê dados de outros
- Endpoints do `/me` entregam tudo para montar a Home e ações
- Pay mock e documentos mock funcionam (mudança de status)
