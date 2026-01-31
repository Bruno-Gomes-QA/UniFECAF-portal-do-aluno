# UniFECAF Portal do Aluno

Monorepo com:
- **backend/**: FastAPI (Python)
- **frontend/**: Next.js (TypeScript)

## Requisitos
- Docker + Docker Compose

## Rodando
```bash
cp .env.example .env
docker compose up --build
```

- Web: http://localhost:3000
- API: http://localhost:8000

## CI
O pipeline roda lint/test/build para backend e frontend a cada PR.

## Docs
Veja `docs/00_GUIDE.md` e o plano em `docs/EXECUTION_PLAN.md`.
