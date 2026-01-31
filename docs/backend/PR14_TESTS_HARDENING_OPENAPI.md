# PR14 — Testes, hardening e OpenAPI polish

## Objetivo
Fechar com qualidade:
- testes críticos (auth, rbac, me, admin smoke)
- OpenAPI claro (tags, exemplos)
- segurança mínima e logging

---

## Checklist
- Fixtures: admin + student + dados base
- Auth tests: login/logout/me
- RBAC: student bloqueado em /admin
- /me flows:
  - notifications unread/read
  - pay-mock
  - request documents
- OpenAPI:
  - tags por domínio
  - exemplos em schemas
  - erro envelope documentado
- Logging básico sem segredos

---

## Critérios de aceite
- pytest passa no CI
- OpenAPI navegável e consistente
