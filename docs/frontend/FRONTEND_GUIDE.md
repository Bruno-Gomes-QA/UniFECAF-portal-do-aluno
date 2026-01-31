# UniFECAF Portal do Aluno — Frontend Guide (Chef)

> Data: 2026-01-30  
> Stack: **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui**  
> Requisitos: **SSR**, cookie **httpOnly**, pt-BR, timezone `America/Sao_Paulo`  
> Estrutura: **mesmo app** com route groups: `/` (portal aluno) e `/admin` (painel admin)

Este guia é o “chef” do frontend. Ele define arquitetura, padrões (SSR), comunicação com o backend, autenticação, cache e o plano de PRs.

---

## 0) Decisões fechadas
- Rotas:
  - `/login` → autenticação (cookie httpOnly)
  - `/` → **Portal do aluno**
  - `/admin` → **Admin**
- UI:
  - **shadcn/ui** (Next) como base
  - padrão de tela admin: **DataTable + Sheet (50vw) + Dialog**
- Busca: **por tela** (via filtros/pagination), sem busca global
- Mutations: unitárias (sem bulk agora)
- Soft delete: entidades devem ter `is_active`/`deleted_at` (ou equivalente) e UI deve refletir
- Student: pode alterar **somente telefone**
- Datas/horas: mostrar sempre em `America/Sao_Paulo` (front), backend em UTC

---

## 1) Paleta (tokens) e distribuição de cores
Mapeamento sugerido:
- `navy`: `#1A3666` (sidebar/admin frame)
- `primary`: `#254AB9` (CTA)
- `cyan`: `#00B1D2` (info)
- `text`: `#191919`
- `success`: `#17A460`
- `successDark`: `#01562C`
- `successSoft`: `#95DE68`
- `bg`: `#F0EEE9` (background)
- `purple`: `#351B65` (accent)
- `danger`: `#FF2B5F`
- `warning`: `#F2CB0A`

**Recomendação:** mapear em tokens shadcn (`--primary`, `--secondary`, `--destructive`, `--background`, etc.)
e usar Badge semântico para status.

---

## 2) Estrutura de pastas (contrato)
Inspirado no seu AGENTS.md (Nuxt), mas “Next-native”:

```txt
apps/web
├── app
│   ├── (auth)
│   │   └── login/page.tsx
│   ├── (student)
│   │   ├── layout.tsx            # valida STUDENT
│   │   └── page.tsx              # Home portal
│   ├── admin
│   │   ├── layout.tsx            # valida ADMIN + AdminShell
│   │   ├── page.tsx              # Dashboard
│   │   ├── users/page.tsx
│   │   ├── students/page.tsx
│   │   ├── academics/...
│   │   ├── finance/...
│   │   ├── comm/...
│   │   ├── documents/...
│   │   └── audit/page.tsx
│   ├── api
│   │   └── proxy/[...path]/route.ts  # BFF -> backend
│   └── globals.css
├── components
│   ├── ui                        # shadcn
│   ├── shell                     # layouts: AdminShell, StudentShell
│   └── shared                    # Breadcrumb, PageHeader, FiltersBar, etc.
├── features
│   ├── admin
│   │   ├── users
│   │   ├── students
│   │   ├── academics
│   │   ├── finance
│   │   ├── comm
│   │   ├── documents
│   │   └── audit
│   └── student
│       ├── home-widgets
│       └── profile
├── lib
│   ├── api
│   │   ├── client.ts             # fetch wrapper (server+client)
│   │   ├── errors.ts             # envelope normalizer
│   │   └── routes.ts             # endpoints map
│   ├── auth
│   │   ├── server.ts             # getCurrentUser (server)
│   │   └── types.ts
│   ├── formatters
│   │   ├── date.ts               # pt-BR + America/Sao_Paulo
│   │   └── money.ts
│   ├── validators                # zod schemas de forms
│   └── utils.ts
└── types
    └── api.ts                    # tipos (OpenAPI ou manual)
```

---

## 3) Comunicação com backend (SSR) — BFF Proxy
**Por quê**
- Evita dor de CORS e cookies entre domínios
- Centraliza:
  - normalização do envelope de erro
  - logs e tracing (opcional)

**Como**
- Front chama: `/api/proxy/...`
- Proxy repassa para `BACKEND_BASE_URL`
- Cookies httpOnly fluem automaticamente

---

## 4) Autenticação e guards (SSR)
- Login via Server Action / Route handler
- Guards server-side:
  - `app/admin/layout.tsx`: exige `ADMIN`
  - `app/(student)/layout.tsx`: exige `STUDENT`

---

## 5) Cache
- Admin: `no-store` em listas/detalhes
- Portal: `revalidate` curto em widgets (10-30s) + botão atualizar
- Após mutations: `router.refresh()` (ou redirect server-side)

---

## 6) Padrão de telas admin
- Listas em **DataTable** SSR
- Filtros via `searchParams`
- Create/Edit em **Sheet** lateral (50vw)
- Confirm em **Dialog**
- Detalhe em Sheet com Accordion + ScrollArea

---

## 7) Soft delete (UI)
- Toggle “Ativos / Inativos / Todos”
- Ação padrão: “Desativar” e “Reativar”

---

## 8) Plano de PRs
- PRW01: Setup UI + theme + shell (admin/student)
- PRW02: Auth SSR + Proxy BFF + guards
- PRW03: Infra de DataTable/Filters/Forms + padrões
- PRW04: Admin — Users + Students (perfil 360 + editar telefone)
- PRW05: Admin — Academics
- PRW06: Admin — Finance
- PRW07: Admin — Comm + Documents
- PRW08: Admin — Audit
- PRW09: Portal do aluno (SSR)
- PRW10: Polish

---

## 9) Definition of Done do frontend
- SSR e guards funcionando
- CRUDs admin com DataTable + Sheet + Dialog
- Portal monta Home 100% via API
- Paleta consistente
