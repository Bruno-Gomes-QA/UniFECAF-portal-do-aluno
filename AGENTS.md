# AGENTS.md — UniFECAF Portal do Aluno (Monorepo Root)

Diretrizes para agentes LLM e contribuidores neste monorepo.

---

## 1) Objetivos do Projeto

Sistema completo de **Portal do Aluno** para universidade, incluindo:

- **Portal do Aluno**: área logada com perfil, notas, frequência, financeiro, notificações e documentos
- **Backoffice Admin**: gestão completa de usuários, acadêmico, financeiro, comunicação e auditoria

---

## 2) Stack Técnica

| Camada | Tecnologia |
|--------|------------|
| **Backend** | FastAPI + Python 3.12 + SQLAlchemy 2.0 + Alembic |
| **Frontend** | Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui |
| **Banco** | PostgreSQL 16 |
| **Package Manager** | Bun (frontend) |
| **Containers** | Docker + Docker Compose |
| **CI** | GitHub Actions |

---

## 3) Estrutura do Monorepo

\`\`\`
/
├── backend/          # FastAPI + PostgreSQL
│   ├── app/          # Código principal
│   ├── alembic/      # Migrations (17 versões)
│   ├── tests/        # Pytest
│   └── AGENTS.md     # Diretrizes backend
├── frontend/         # Next.js + TypeScript
│   ├── src/          # Código fonte
│   │   ├── app/      # App Router (pages)
│   │   ├── components/
│   │   ├── features/
│   │   └── lib/
│   └── AGENTS.md     # Diretrizes frontend
├── docs/             # Documentação
│   ├── features/     # Especificações de funcionalidades
│   └── *.md          # Regras de negócio
├── docker-compose.yml
├── Makefile          # Comandos úteis
└── README.md         # Guia de início rápido
\`\`\`

---

## 4) Como Rodar

\`\`\`bash
# Subir tudo (backend + frontend + postgres)
docker compose up --build

# Acessos:
# - Frontend: http://localhost:3000
# - Backend:  http://localhost:8000
# - API Docs: http://localhost:8000/docs
\`\`\`

---

## 5) Autenticação

- JWT access-only em cookie \`httpOnly\`
- Allowlist de sessões com \`jti\` para revogação real
- CORS com \`allow_credentials=True\` e origins restritos
- Em dev: \`secure=False\`; em prod: \`secure=True\`

---

## 6) Convenções de Ambiente

| Variável | Descrição |
|----------|-----------|
| \`DATABASE_URL\` | PostgreSQL connection string |
| \`JWT_SECRET\` | Chave para assinar tokens |
| \`CORS_ORIGINS\` | Origins permitidos (comma-separated) |
| \`NEXT_PUBLIC_API_BASE\` | URL base da API para o browser |

- \`.env.example\` sempre atualizado
- Nunca commitar \`.env\` real

---

## 7) Padrões de Contribuição

### Commits e PRs
- PRs pequenos e focados
- Cada PR deve incluir: o que foi feito + como testar
- Sem "mega PR" com 200 arquivos misturados

### Qualidade
- Nada de código "mágico" sem documentação
- Funções pequenas, nomes óbvios
- Nenhum warning novo (lint/typecheck/test)

### Reprodutibilidade
- Tudo que rodar local deve rodar no Docker
- README permite rodar sem adivinhação

---

## 8) Definition of Done

- [ ] \`docker compose up --build\` funciona
- [ ] Migrations aplicadas automaticamente
- [ ] CI verde (lint/test/build)
- [ ] Fluxo login + portal funcionando
- [ ] Docs atualizadas quando necessário
