# PR03 — CI (GitHub Actions: Lint/Test/Build)

## Objetivo
Garantir qualidade automática a cada PR:
- Python: format/lint/test
- Next: lint/typecheck/build
- (Opcional) Smoke test com docker-compose

## Escopo
✅ Inclui
- Workflow `.github/workflows/ci.yml`
- Cache para pip/npm
- Jobs independentes (api / web)

❌ Não inclui
- Deploy (fora do escopo atual)

## Pipeline proposto
### Job: api
- [ ] Checkout
- [ ] Setup Python 3.12
- [ ] Instalar deps (`requirements.txt` + `requirements-dev.txt`)
- [ ] `ruff format --check .`
- [ ] `ruff check .`
- [ ] `pytest`

### Job: web
- [ ] Checkout
- [ ] Setup Bun (usar `oven/setup-bun@v2`)
- [ ] `bun install`
- [ ] `bun run lint`
- [ ] `bun run typecheck`
- [ ] `bun run build`

### Job opcional: docker-smoke
- [ ] `docker compose build`
- [ ] `docker compose up -d`
- [ ] Aguardar serviços ficarem healthy
- [ ] curl `/health` da API (deve retornar 200)
- [ ] curl `/` do WEB (deve retornar 200)
- [ ] Verificar conexão com PostgreSQL (API deve conectar)
- [ ] `docker compose down -v`

## Critérios de aceite
- CI roda em PRs e em push na main
- Quebra o build se lint/test/typecheck falhar
- Tempo razoável (cache funcionando)

## Convenção de status
- Branch protection na main (opcional): exigir `ci` verde antes de merge.
