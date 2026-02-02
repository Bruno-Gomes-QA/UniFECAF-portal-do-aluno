# AGENTS.md — UniFECAF Portal do Aluno (Backend FastAPI)

Diretrizes para agentes LLM e contribuidores no backend **FastAPI + PostgreSQL**.

---

## 1) Visão Geral

| Item | Tecnologia |
|------|------------|
| Framework | FastAPI + Uvicorn |
| Linguagem | Python 3.12 |
| ORM | SQLAlchemy 2.0 |
| Migrations | Alembic |
| Validação | Pydantic v2 |
| Banco | PostgreSQL 16 |
| Linter | Ruff |
| Testes | Pytest |

### Autenticação
- JWT access-only em cookie `access_token` (httpOnly)
- Allowlist de sessões em `auth.jwt_sessions` com `jti`
- Revogação real de token no logout

---

## 2) Estrutura de Pastas

\`\`\`
backend/
├── app/
│   ├── core/
│   │   ├── config.py       # Settings (pydantic-settings)
│   │   ├── database.py     # Engine + SessionLocal + get_db
│   │   ├── deps.py         # Dependencies: current_user, admin, pagination
│   │   ├── errors.py       # Envelope de erro + handlers
│   │   └── security.py     # bcrypt + JWT (sub/jti/exp)
│   ├── db/
│   │   └── utils.py        # Helpers de CRUD e paginação
│   ├── models/             # SQLAlchemy models
│   │   ├── academics.py    # Student, Course, Subject, Section, etc.
│   │   ├── auth.py         # JwtSession
│   │   ├── audit.py        # AuditLog
│   │   ├── documents.py    # StudentDocument
│   │   ├── finance.py      # Invoice, Payment
│   │   ├── notifications.py # Notification, UserNotification
│   │   └── user.py         # User
│   ├── routers/
│   │   ├── health.py       # GET /health
│   │   └── v1/             # API versionada
│   │       ├── auth.py     # /api/v1/auth/*
│   │       ├── me.py       # /api/v1/me/* (portal aluno)
│   │       ├── admin_*.py  # /api/v1/admin/* (backoffice)
│   │       └── __init__.py
│   ├── schemas/            # Pydantic request/response
│   └── main.py             # FastAPI app
├── alembic/
│   └── versions/           # 17 migrations
├── tests/                  # Pytest
├── seed_data.py            # Script de seed (300 alunos, 5 semestres)
└── requirements.txt
\`\`\`

---

## 3) Contrato de Rotas

### Infra
- \`GET /health\` — Verifica conectividade com Postgres

### Auth (v1)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | \`/api/v1/auth/login\` | 204 + Set-Cookie |
| POST | \`/api/v1/auth/logout\` | 204 (revoga sessão) |
| GET | \`/api/v1/auth/me\` | Usuário autenticado |

### Portal do Aluno (/me)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | \`/api/v1/me/profile\` | Perfil do aluno |
| PATCH | \`/api/v1/me/profile\` | Atualizar telefone |
| GET | \`/api/v1/me/today-class\` | Aula do dia |
| GET | \`/api/v1/me/schedule/today\` | Agenda do dia |
| GET | \`/api/v1/me/schedule/week\` | Agenda da semana |
| GET | \`/api/v1/me/academic/summary\` | Resumo acadêmico |
| GET | \`/api/v1/me/enrollments\` | Matrículas do termo |
| GET | \`/api/v1/me/grades\` | Notas detalhadas |
| GET | \`/api/v1/me/attendance\` | Frequência |
| GET | \`/api/v1/me/transcript\` | Histórico escolar |
| GET | \`/api/v1/me/financial/summary\` | Resumo financeiro |
| GET | \`/api/v1/me/financial/invoices\` | Boletos (paginado) |
| POST | \`/api/v1/me/financial/invoices/{id}/pay-mock\` | Simular pagamento |
| GET | \`/api/v1/me/notifications\` | Notificações (paginado) |
| GET | \`/api/v1/me/notifications/unread-count\` | Contagem não lidas |
| POST | \`/api/v1/me/notifications/{id}/read\` | Marcar como lida |
| POST | \`/api/v1/me/notifications/{id}/unread\` | Marcar como não lida |
| POST | \`/api/v1/me/notifications/{id}/archive\` | Arquivar |
| GET | \`/api/v1/me/documents\` | Lista documentos |
| POST | \`/api/v1/me/documents/{type}/request\` | Solicitar documento |
| GET | \`/api/v1/me/documents/{type}/download\` | Baixar documento |

### Admin (exige role ADMIN)
- **Usuários**: CRUD \`/api/v1/admin/users\`
- **Alunos**: CRUD \`/api/v1/admin/students\`
- **Acadêmico**: terms, courses, subjects, sections, meetings, sessions, enrollments, attendance, assessments, grades
- **Financeiro**: invoices, payments, mark-paid
- **Comunicação**: notifications, deliver, user-notifications, preferences
- **Documentos**: student-documents
- **Auditoria**: audit-logs
- **Dashboard**: stats por termo

---

## 4) Padrões de API

### Paginação
\`\`\`
?limit=20&offset=0
\`\`\`
- \`limit\`: 1..100 (default: 20)
- \`offset\`: >= 0 (default: 0)

### Envelope de Erro
\`\`\`json
{
  "error": {
    "code": "SOME_CODE",
    "message": "Mensagem amigável",
    "details": {}
  }
}
\`\`\`

### Convenções SQLAlchemy
- Usar \`.is_(True)\` e \`.is_(False)\` ao invés de \`== True\` / \`== False\`
- Weekday: \`0=Domingo ... 6=Sábado\`

---

## 5) Segurança

- Cookie \`access_token\`: \`httponly=True\`, \`samesite=lax\`, \`secure=False\` (dev)
- CORS: \`allow_credentials=True\`, origins restritos (nunca \`*\`)
- Nunca logar tokens/cookies/segredos
- RBAC: validar \`user.role\` em cada endpoint admin

---

## 6) Checklist de Qualidade

- [ ] \`ruff check .\` sem erros
- [ ] \`ruff format --check .\` ok
- [ ] \`pytest\` verde
- [ ] Migrations aplicáveis (\`alembic upgrade head\`)
- [ ] Schemas Pydantic para request/response
- [ ] Erros com código + mensagem clara
