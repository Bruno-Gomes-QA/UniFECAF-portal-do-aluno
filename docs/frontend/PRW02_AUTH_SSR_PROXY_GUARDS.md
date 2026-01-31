# PRW02 — Auth SSR + Proxy BFF + Guards

## Objetivo
Autenticação com cookie httpOnly e proteção SSR.

---

## Entregas
- Proxy: `app/api/proxy/[...path]/route.ts`
- `lib/api/client.ts`, `lib/api/errors.ts`
- `lib/auth/server.ts` (`getCurrentUser()`)
- Guards em `app/admin/layout.tsx` e `app/(student)/layout.tsx`
- `/login` com submit server-side

---

## Critérios de aceite
- `/admin` bloqueia sem cookie
- ADMIN acessa admin
- STUDENT acessa portal
