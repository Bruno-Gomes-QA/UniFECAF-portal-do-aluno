# PR04 — API Core (FastAPI + JWT cookie httpOnly + /home + PostgreSQL)

## Objetivo
Implementar o core do backend:
- Healthcheck
- Login que define cookie httpOnly com JWT
- Endpoint protegido `/home` retornando JSON do PostgreSQL
- SQLAlchemy models baseados no `init.sql`
- Pydantic schemas para validação
- Testes mínimos garantindo o fluxo

## Escopo
✅ Inclui
- `/health` (GET) - verifica conexão com PostgreSQL
- `/auth/login` (POST) -> seta cookie `access_token`
- `/auth/logout` (POST) -> limpa cookie
- `/home` (GET) -> protegido (precisa cookie válido), retorna dados do PostgreSQL
- SQLAlchemy models (User, Student, etc.) baseados em `init.sql`
- Pydantic schemas para requisição/resposta
- CORS com credenciais
- Testes: login + acesso ao /home + nega sem cookie

❌ Não inclui
- Todos os endpoints do schema completo (apenas o essencial para MVP)
- RBAC/refresh token

## Estrutura sugerida
- `app/core/config.py` (Settings: JWT, CORS, DATABASE_URL)
- `app/core/database.py` (SQLAlchemy engine, SessionLocal, get_db)
- `app/core/security.py` (create/verify JWT, password hashing)
- `app/models/user.py` (SQLAlchemy User, Student models)
- `app/routers/health.py` (GET /health com check de DB)
- `app/routers/auth.py` (POST /login, POST /logout)
- `app/routers/home.py` (GET /home protegido)
- `app/schemas/auth.py` (LoginRequest, LoginResponse com Pydantic)
- `app/schemas/home.py` (HomeResponse com dados tipados)
- `tests/test_auth_flow.py`
- `tests/test_database.py` (teste de conexão)

## Decisões (Database)
- SQLAlchemy 2.0+ (preferência por async, mas sync é ok para MVP)
- Models espelhando `init.sql` (pelo menos: `auth.users`, `academics.students`)
- Session por requisição (dependency injection com `get_db`)
- Alembic migrations já aplicadas (do PR02)

## Decisões (Pydantic)
- Pydantic v2 para schemas de requisição/resposta
- Separar SQLAlchemy models (`app/models/`) de Pydantic schemas (`app/schemas/`)
- Usar `from_attributes=True` (antes `orm_mode`) para converter ORM -> Pydantic

## Decisões (JWT)
- Algoritmo: HS256
- Payload mínimo: `sub`, `exp`
- Cookie:
  - nome: `access_token`
  - `httponly=True`
  - `samesite="lax"`
  - `secure=False` (dev)
  - `path="/"`

## CORS
- `allow_origins=[http://localhost:3000]`
- `allow_credentials=True`
- `allow_methods=["*"]`
- `allow_headers=["*"]`

## Como testar
### Local (com PostgreSQL via Docker)
```bash
# Subir apenas o PostgreSQL
docker compose up -d db

# Exportar DATABASE_URL
export DATABASE_URL="postgresql://unifecaf:unifecaf@localhost:5432/unifecaf_dev"

# Rodar migrations
cd backend
alembic upgrade head

# Rodar API
uvicorn app.main:app --reload
```

### Fluxo manual
1) POST `http://localhost:8000/auth/login` com JSON `{"username":"demo","password":"demo"}`
2) Verificar cookie `access_token` no browser / client
3) GET `http://localhost:8000/home` deve retornar 200
4) POST `http://localhost:8000/auth/logout` deve limpar cookie
5) GET `/home` deve retornar 401

## Critérios de aceite
- `/health` verifica conexão com PostgreSQL e retorna status
- `/home` retorna 401 sem cookie
- `/auth/login` valida credenciais no PostgreSQL, retorna 200/204 e seta cookie
- `/home` retorna 200 com cookie válido e dados do PostgreSQL (mesmo que seja 1 usuário seed)
- Testes passam no CI
- SQLAlchemy models definidos e funcionando

## Notas sobre dados iniciais (seed)
- Criar pelo menos 1 usuário de teste no PostgreSQL via migration ou script SQL
- Exemplo: `email=demo@unifecaf.edu.br`, `password=demo123` (hash bcrypt)
- Pode ser uma migration Alembic ou arquivo SQL rodado manualmente
- Em produção, seed seria um processo separado
