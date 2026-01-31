# PR08 — Base API (RBAC, Auth cookie, sessão allowlist, error envelope)

## Objetivo
Implementar o core:
- Login/logout com cookie httpOnly
- JWT access-only (exp) + `jti` em `auth.jwt_sessions`
- RBAC (ADMIN/STUDENT) e deps
- Envelope de erro e handlers
- Paginação padrão

---

## Checklist

### Settings
- [ ] `DATABASE_URL`
- [ ] `JWT_SECRET`, `JWT_EXPIRES_MINUTES`
- [ ] Cookie config
- [ ] `CORS_ORIGINS` (lista)

### Security
- [ ] `create_access_token(sub, jti, exp)`
- [ ] `verify_access_token`
- [ ] `set_auth_cookie` / `clear_auth_cookie`

### Sessões (allowlist)
- [ ] Criar sessão no login
- [ ] Revogar no logout
- [ ] Validar existência e não revogada no `get_current_user`

### Routers
- [ ] `POST /api/v1/auth/login` (204 + Set-Cookie)
- [ ] `POST /api/v1/auth/logout` (204 + clear cookie)
- [ ] `GET /api/v1/auth/me`

### Error envelope
- [ ] `ApiError` + handlers
- [ ] `RequestValidationError` vira `VALIDATION_ERROR`

### CORS
- [ ] `allow_credentials=True`
- [ ] Origins restritos

---

## Testes mínimos
- login invalid → 401 envelope
- login ok → cookie + sessão
- /auth/me sem cookie → 401
- /auth/me com cookie → 200

---

## Critérios de aceite
- Cookie httpOnly funcionando
- Logout revoga sessão (jti)
- Erros sempre no envelope
