# AGENTS.md — UniFECAF Portal do Aluno (Frontend Next.js)

Estas diretrizes orientam qualquer agente LLM (e contribuidores) no frontend **Next.js + shadcn/ui** em `apps/web/`.

---

## 1) Visão Geral
- **Stack**: Next.js (App Router), TypeScript estrito, Tailwind, shadcn/ui (Radix).
- **SSR**: obrigatório. Use Server Components e Server Layouts para guards e data fetching.
- **Rotas**:
  - `/login` (auth)
  - `/` (Portal do Aluno - STUDENT)
  - `/admin` (Painel Admin - ADMIN)
- **Comunicação com backend**: via **BFF Proxy** (`app/api/proxy/[...path]/route.ts`)
- **UI**: priorize componentes shadcn e padrões de dashboard (DataTable + Sheet + Dialog).

---

## 2) Estrutura de Pastas (contrato)
```
apps/web/
├─ app/
│  ├─ (auth)/login
│  ├─ (student)/...
│  ├─ admin/...
│  └─ api/proxy/[...path]/route.ts
├─ components/
│  ├─ ui/
│  ├─ shell/
│  └─ shared/
├─ features/
│  ├─ admin/<domain>/
│  └─ student/<domain>/
├─ lib/
│  ├─ api/
│  ├─ auth/
│  ├─ formatters/
│  └─ validators/
└─ types/
```

---

## 3) Convenções de Código
1. **Nada de fetch solto em pages**: centralize em `lib/api` e `features/*/api.ts`.
2. **Server vs Client**
   - Server: fetch SSR, guards, pages de listas.
   - Client: Sheets/Dialogs e forms.
3. **Erro**: normalize envelope em `lib/api/errors.ts` e exiba toast.
4. **Datas**: sempre pt-BR + `America/Sao_Paulo` via `lib/formatters/date.ts`.
5. **Soft delete**: UI com filtro e ação desativar/reativar.
6. **Padrão Admin**:
   - List: DataTable SSR
   - Create/Edit: Sheet 50vw
   - Confirm: Dialog
   - Detail: Sheet + Accordion + ScrollArea
7. **Student**: no portal, só editar telefone.
8. **A11y/UX**: skeleton/empty/error obrigatórios.

---

## 4) Fluxo para criar tela integrada ao backend

### Passo 1 — Tipos
- Criar `features/<domain>/types.ts` (ou em `types/` se compartilhar).
- Evitar `any`.

### Passo 2 — API layer
Em `features/<domain>/api.ts` crie funções:
- `listX(params)` / `getX(id)`
- `createX(payload)` / `updateX(id,payload)`
- `toggleActive(id, active)`

### Passo 3 — Componentes de domínio
- `XTable.tsx`
- `XFormSheet.tsx`
- `XDetailsSheet.tsx`

### Passo 4 — Page SSR
- `page.tsx` lê `searchParams` e chama `listX()`.
- Renderiza Table + filtros.

### Passo 5 — Revisão
- lint/typecheck/build
- estados de loading/empty/error

---

## 5) Checklist antes do merge
- [ ] SSR guard server-side ok
- [ ] DataTable paginada e filtros via URL
- [ ] Sheet/Dialog consistentes
- [ ] Tipos + zod schemas
- [ ] Erros padronizados
- [ ] pt-BR e timezone ok
