# 🎓 UniFECAF Portal do Aluno

Sistema completo de **Portal Acadêmico** com área do aluno e backoffice administrativo.

![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)
![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript)

---

## 🚀 Quick Start

```bash
# 1. Clone e entre na pasta
git clone <repo-url>
cd UniFECAF-portal-do-aluno

# 2. Execute o script automatizado (cria .env, sobe tudo e popula dados)
chmod +x start_and_seed.sh
./start_and_seed.sh

# Pronto! O script vai:
# ✅ Criar .env automaticamente
# ✅ Subir PostgreSQL
# ✅ Subir Backend (FastAPI) com migrations
# ✅ Popular banco com 300 alunos e dados realistas
# ✅ Subir Frontend (Next.js)
```

| Serviço | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:8000 |
| **API Docs (Swagger)** | http://localhost:8000/docs |

### Credenciais de Teste

| Role | Email | Senha |
|------|-------|-------|
| **Admin** | `admin@unifecaf.edu.br` | `Admin@123` |
| **Aluno** | `joao.silva@unifecaf.edu.br` | `Aluno@123` |

---

## 📋 O Que o Sistema Faz

### Portal do Aluno (área logada)

| Funcionalidade | Descrição |
|----------------|-----------|
| **Home** | Aula do dia + agenda semanal + resumo acadêmico |
| **Perfil** | Dados pessoais com edição de telefone |
| **Notas** | Notas por disciplina com média ponderada |
| **Frequência** | Presenças/faltas por disciplina + gráfico |
| **Financeiro** | Boletos com status + simulação de pagamento |
| **Notificações** | Mensagens com filtros (lidas/não lidas/arquivadas) |
| **Documentos** | Solicitação e download de documentos |
| **Histórico** | Histórico escolar completo por semestre |

### Backoffice Admin (gestão)

| Módulo | Funcionalidades |
|--------|-----------------|
| **Usuários** | CRUD completo + soft delete + reativação |
| **Alunos** | CRUD + matrícula + vinculação com usuário |
| **Acadêmico** | Termos, Cursos, Disciplinas, Turmas, Horários |
| **Financeiro** | Boletos, Pagamentos, Marcar como pago |
| **Comunicação** | Notificações + entrega por aluno + preferências |
| **Documentos** | Gerenciar solicitações de documentos |
| **Auditoria** | Log de todas as ações com filtros |
| **Dashboard** | Estatísticas por termo letivo |

---

## 🏗️ Arquitetura

```
┌──────────────────────────────────────────────────────────────┐
│                         Docker Compose                        │
├──────────────┬──────────────────────┬────────────────────────┤
│     web      │         api          │          db            │
│  (Next.js)   │      (FastAPI)       │    (PostgreSQL 16)     │
│   :3000      │        :8000         │        :5432           │
│              │                      │                        │
│  App Router  │   SQLAlchemy 2.0     │   17 migrations        │
│  TypeScript  │   Alembic            │   300 alunos seed      │
│  shadcn/ui   │   Pydantic v2        │   5 semestres dados    │
│  Tailwind    │   JWT httpOnly       │                        │
└──────────────┴──────────────────────┴────────────────────────┘
```

### Stack Técnica

| Camada | Tecnologia | Versão |
|--------|------------|--------|
| Frontend | Next.js (App Router) | 14.x |
| Frontend | TypeScript (strict mode) | 5.x |
| Frontend | Tailwind CSS + shadcn/ui | latest |
| Frontend | react-hook-form + zod | latest |
| Backend | FastAPI + Uvicorn | 0.115.x |
| Backend | SQLAlchemy + Alembic | 2.0.x |
| Backend | Pydantic | 2.x |
| Banco | PostgreSQL | 16 |
| Runtime | Python | 3.12 |
| Package Manager | Bun | latest |

---

## 🔐 Segurança

- **Autenticação**: JWT em cookie `httpOnly` (não acessível via JavaScript)
- **Sessões**: Allowlist com `jti` para revogação real de tokens
- **CORS**: `allow_credentials=True` com origins restritos
- **RBAC**: Validação de role em cada endpoint admin
- **Senhas**: Hash bcrypt com salt

---

## 📁 Estrutura do Projeto

```
/
├── backend/
│   ├── app/
│   │   ├── core/        # Config, database, security, deps
│   │   ├── models/      # SQLAlchemy models (7 domínios)
│   │   ├── routers/v1/  # Endpoints versionados
│   │   └── schemas/     # Pydantic schemas
│   ├── alembic/         # 17 migrations
│   ├── tests/           # Pytest (auth, rbac, smoke)
│   └── seed_data.py     # Gerador de dados realistas
├── frontend/
│   └── src/
│       ├── app/         # Next.js App Router
│       │   ├── (auth)/  # Páginas públicas (login)
│       │   ├── (student)/ # Portal do aluno
│       │   └── admin/   # Backoffice
│       ├── components/  # UI components (shadcn/ui)
│       ├── features/    # Lógica de domínio
│       └── lib/         # Utils e API client
├── docs/                # Documentação e specs
├── docker-compose.yml   # Orquestração
└── Makefile             # Comandos úteis
```

---

## 🧪 Testes e Qualidade

```bash
# Backend
make lint          # Ruff check + format
make test          # Pytest

# Frontend
make lint-web      # ESLint + TypeScript check
make build-web     # Next.js build
```

### CI (GitHub Actions)

- ✅ Lint backend (ruff)
- ✅ Lint frontend (eslint + tsc)
- ✅ Build frontend (next build)
- ✅ Testes backend (pytest)

---

## 📊 Dados de Demonstração

O seed gera automaticamente:

| Entidade | Quantidade |
|----------|------------|
| Alunos | 300 |
| Cursos | 2 (ADS, Ciência da Computação) |
| Disciplinas | 12+ por curso |
| Termos | 5 semestres |
| Boletos | ~1800 (6 por aluno) |
| Notificações | 600+ |
| Aulas | Horários reais |

**95% dos dados são realistas** — não são mocks estáticos.

---

## 🔧 Comandos Úteis

```bash
# Primeira execução (setup completo)
./start_and_seed.sh           # Configuração inicial + seed

# Gerenciamento dos containers (após primeira execução)
docker compose up -d          # Subir containers
docker compose down           # Parar containers
docker compose restart api    # Reiniciar backend
docker compose restart web    # Reiniciar frontend
docker compose logs -f api    # Ver logs do backend
docker compose logs -f web    # Ver logs do frontend
docker compose ps             # Status dos containers

# Reset completo (limpa tudo e reexecuta seed)
./start_and_seed.sh           # Roda reset automático

# Makefile (atalhos)
make up                       # Subir containers
make down                     # Parar containers
make logs-api                 # Ver logs do backend
make logs-web                 # Ver logs do frontend
make shell-api                # Shell no container backend
make shell-web                # Shell no container frontend
```

---

## 📝 Variáveis de Ambiente

O script `start_and_seed.sh` cria automaticamente o arquivo `.env` a partir do `.env.example`.

Se precisar ajustar manualmente, edite o `.env`:

```env
# Backend
DATABASE_URL=postgresql://unifecaf:unifecaf123@db:5432/portal_aluno
JWT_SECRET=super-secret-key-change-in-production
CORS_ORIGINS=http://localhost:3000,http://localhost:8000

# Frontend
BACKEND_BASE_URL=http://localhost:8000
```

**Nota**: Para produção, altere `JWT_SECRET` e `COOKIE_SECURE=true`.

---

## 🎯 Endpoints da API

### Autenticação
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/v1/auth/login` | Login (204 + Set-Cookie) |
| POST | `/api/v1/auth/logout` | Logout (revoga sessão) |
| GET | `/api/v1/auth/me` | Usuário atual |

### Portal do Aluno (`/api/v1/me/*`)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/me/profile` | Perfil do aluno |
| GET | `/me/today-class` | Aula do dia |
| GET | `/me/schedule/week` | Agenda da semana |
| GET | `/me/grades` | Notas |
| GET | `/me/attendance` | Frequência |
| GET | `/me/financial/invoices` | Boletos |
| GET | `/me/notifications` | Notificações |
| GET | `/me/documents` | Documentos |

### Admin (`/api/v1/admin/*`)
Documentação completa em http://localhost:8000/docs

---

## 👥 Contribuindo

1. Leia os arquivos `AGENTS.md` (root, backend, frontend)
2. PRs pequenos e focados
3. Lint/test/build devem passar
4. Atualize docs quando necessário

---

## 📄 Licença

Projeto acadêmico — UniFECAF 2025
