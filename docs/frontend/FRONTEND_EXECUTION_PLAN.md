# Guia de Execução dos PRs — Frontend

Ordem e validação de cada PR para implementar o frontend completo (Admin + Portal).

---

## PRW01 — Setup UI + Theme + Shells
- Instalar shadcn/ui (Next) e componentes base
- Definir tokens de cor no `globals.css`
- Criar `AdminShell` e `StudentShell`

**Validar**
- `/admin` renderiza shell
- `/` renderiza shell do aluno

---

## PRW02 — Auth SSR + Proxy BFF + Guards
- Proxy: `app/api/proxy/[...path]/route.ts`
- `lib/api/client.ts` e normalização de erro
- `/login` (server action) e guards em layouts

**Validar**
- `/admin` redireciona sem cookie
- ADMIN entra no admin
- STUDENT entra no portal

---

## PRW03 — Infra DataTable + Forms + Sheets/Dialogs
- DataTable SSR com paginação e filtros em URL
- FormSheet (zod + react-hook-form)
- ConfirmDialog

**Validar**
- página playground com tabela + sheet + confirm

---

## PRW04 — Admin Users + Students (Perfil 360)
- Users CRUD + soft delete
- Students CRUD + details sheet com abas
- Editar telefone rápido (sheet)

---

## PRW05 — Admin Academics
- Terms (set current)
- Courses/Subjects
- Sections/Meetings/Sessions
- Enrollments com erro de conflito

---

## PRW06 — Admin Finance
- Invoices + Payments
- Mark paid unitário

---

## PRW07 — Admin Comm + Documents
- Notifications + Deliver
- User notifications
- Student documents

---

## PRW08 — Admin Audit
- Tabela com filtros + JSON viewer

---

## PRW09 — Portal do Aluno (SSR)
- Home widgets + ações
- Perfil: editar telefone

---

## PRW10 — Polish
- Skeletons/empty/error
- A11y e consistência

---

## Checklist rápido
- `npm run lint`
- `npm run typecheck`
- `npm run build`
