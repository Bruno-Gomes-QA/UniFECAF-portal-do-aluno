# agents.md (backend/)

Regras e padrões específicos do **backend FastAPI (Python)**.

## Objetivo do backend
- Fornecer endpoints:
  - `GET /health` (verifica conexão com PostgreSQL)
  - `POST /auth/login` (valida no PostgreSQL, seta cookie `access_token`)
  - `POST /auth/logout` (limpa cookie)
  - `GET /home` (protegido, retorna JSON do PostgreSQL com dados tipados)
- CORS com credenciais
- PostgreSQL com SQLAlchemy e Alembic
- Pydantic v2 para validação
- Testes mínimos do fluxo de auth

## Stack e decisões
- FastAPI + Uvicorn
- PostgreSQL (ORM: SQLAlchemy 2.0+)
- Alembic (migrations)
- Pydantic v2 (schemas de requisição/resposta)
- JWT HS256 em cookie httpOnly
- Password hashing com bcrypt

## Estrutura sugerida
```txt
backend/
├── AGENTS.md
├── app
│   ├── core
│   │   ├── config.py      # Settings com Pydantic (JWT, CORS, DATABASE_URL)
│   │   ├── database.py    # SQLAlchemy engine, SessionLocal, get_db
│   │   └── security.py    # JWT + password hashing
│   ├── models
│   │   ├── __init__.py
│   │   └── user.py        # SQLAlchemy models (User, Student, etc.)
│   ├── routers
│   │   ├── health.py      # GET /health (com check de DB)
│   │   ├── auth.py        # POST /login, /logout
│   │   └── home.py        # GET /home (protegido)
│   ├── schemas
│   │   ├── auth.py        # Pydantic schemas para auth
│   │   └── home.py        # Pydantic schemas para home
│   └── main.py
### Database (SQLAlchemy + Alembic)
- SQLAlchemy 2.0+ (preferência por async, mas sync é ok para MVP)
- Models em `app/models/` espelhando o schema do PostgreSQL (`init.sql`)
- Session por requisição via dependency injection (`get_db`)
- Alembic para todas as mudanças de schema
- Migrations devem ser idempotentes

### Pydantic
- Pydantic v2 para schemas de requisição/resposta
- Separar SQLAlchemy models de Pydantic schemas
- Usar `model_config = ConfigDict(from_attributes=True)` para conversão ORM -> Pydantic
- Schemas em `app/schemas/`

### API design
- Rotas pequenas e "finas"; lógica em `core/` ou services quando necessário
- Responses consistentes e documentadas (status codes corretos)
- Erros com `HTTPException` e mensagens claras
- Sempre usar dependency injection para database session
├── tests
│   ├── test_auth_flow.py
│   └── test_database.py
├── requirements.txt
├── requirements-dev.txt
├── pyproject.toml
└── Dockerfile
```

## Padrões de código
### API design
- Rotas pequenas e “finas”; lógica em `core/` quando necessário.
- Responses consistentes e documeusar `pydantic-settings`)
- Variáveis obrigatórias: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`
- `CORS_ORIGINS` deve ser lista (split por vírgula)
- Validar DATABASE_URL no startup
Conexão com PostgreSQL funciona
- Teste 2: `GET /home` sem cookie => `401`
- Teste 3: `POST /auth/login` com credenciais válidas => cookie setado
- Teste 4: `GET /home` com cookie válido => `200` com dados do PostgreSQL
- Usar fixtures para criar usuário de teste no DB
  - `httponly=True`
  - `samesite="lax"`
  - `secure=False` em dev
  - `path="/"`
- Não aceitar `*` em CORS quando `allow_credentials=True`.
- Não logar tokens nem segredos.
- `JWT_SECRET` vem de env; nunca hardcode.

### Config
- Centralizar env em `Settings` (pydantic-settings ou solução simples).
- `CORS_ORIGINS` deve ser lista (split por vírgula).

## Testes mínimos (obrigatórios)
- Teste 1: `GET /home` sem cookie => `401`- Criar session do SQLAlchemy sem context manager ou dependency
- Fazer queries SQL raw quando o ORM pode resolver
- Esquecer de fechar sessions (usar `try/finally` ou dependency)
- Fazer migrations manuais (sempre usar Alembic)- Teste 2: `POST /auth/login` => cookie setado
- Teste 3: `GET /home` com cookie => `200`

## Qualidade
Deve passar:
- `ruff format --check .` (ou `ruff format .` local)
- `ruff check .`
- `pytest`

## Observabilidade
- Logar início da app e erros inesperados (sem vazar segredos).
- Para endpoints críticos, logar apenas metadados (status, rota).

## Anti-padrões (evitar)
- Colocar toda a lógica em `main.py`
- Duplicar schemas em múltiplos lugares
- Validar JWT “na mão” em cada rota (usar dependency)
- Misturar regras de CORS em vários arquivos
