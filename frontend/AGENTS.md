# AGENTS.md — UniFECAF Portal do Aluno (Frontend Next.js)

Diretrizes para agentes LLM e contribuidores no frontend **Next.js + shadcn/ui**.

---

## 1) Visão Geral

| Item | Tecnologia |
|------|------------|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript (strict mode) |
| Estilização | Tailwind CSS + shadcn/ui (Radix primitives) |
| Package Manager | Bun |
| Forms | react-hook-form + zod |
| Tabelas | @tanstack/react-table |

### Rotas Principais
- `/login` — Autenticação
- `/` — Portal do Aluno (role: STUDENT)
- `/administrativo` — Painel Administrativo (role: ADMIN)

### Comunicação com Backend
- **SSR**: chamadas diretas ao backend via `lib/api/server.ts`
- **Client**: chamadas via `lib/api/browser.ts`
- Cookie `access_token` propagado automaticamente

---

## 2) Estrutura de Pastas

```
frontend/
└─ src/
   ├─ app/
   │  ├─ (auth)/login/          # Página de login
   │  ├─ (student)/             # Portal do aluno (layout com StudentShell)
   │  │  ├─ page.tsx            # Dashboard home
   │  │  ├─ horarios/           # Grade de horários
   │  │  ├─ notas/              # Notas e frequência
   │  │  ├─ financeiro/         # Boletos e pagamentos
   │  │  ├─ documentos/         # Declarações e histórico
   │  │  ├─ notificacoes/       # Central de notificações
   │  │  └─ configuracoes/      # Perfil do aluno
   │  ├─ administrativo/        # Backoffice admin
   │  │  ├─ page.tsx            # Dashboard admin
   │  │  ├─ usuarios/           # CRUD usuários
   │  │  ├─ alunos/             # CRUD alunos
   │  │  ├─ academico/          # Cursos, disciplinas, turmas, etc.
   │  │  ├─ financeiro/         # Faturas e pagamentos
   │  │  ├─ comunicacao/        # Notificações
   │  │  ├─ documentos/         # Documentos dos alunos
   │  │  └─ auditoria/          # Logs de auditoria
   │  └─ api/                   # BFF routes (se necessário)
   ├─ components/
   │  ├─ ui/                    # shadcn/ui components
   │  ├─ shell/                 # StudentShell, AdminShell
   │  └─ shared/                # Componentes reutilizáveis
   ├─ features/
   │  ├─ admin/<domain>/        # Componentes por domínio admin
   │  └─ student/<domain>/      # Componentes por domínio student
   ├─ lib/
   │  ├─ api/                   # Clients HTTP (server.ts, browser.ts)
   │  ├─ auth/                  # Guards e utilitários de auth
   │  └─ formatters/            # date.ts, money.ts
   └─ types/                    # Tipos compartilhados
```

---

## 3) Convenções de Código

### Fetch e API
- **NUNCA** usar `fetch()` solto em pages
- Centralizar em `lib/api/server.ts` (SSR) ou `lib/api/browser.ts` (client)
- Rotas em `lib/api/routes.ts`

### Server vs Client Components
| Tipo | Uso |
|------|-----|
| Server | Fetch SSR, guards, páginas de lista |
| Client | Sheets, Dialogs, forms interativos |

### Tratamento de Erros
- Normalizar via `lib/api/errors.ts`
- Exibir toast com `sonner`
- Estados: loading (Skeleton), empty, error

### Padrão de Telas Admin
1. **List**: DataTable SSR com paginação via URL
2. **Create/Edit**: Sheet (50vw)
3. **Delete/Confirm**: Dialog
4. **Details**: Sheet + Accordion + ScrollArea

### Idioma
- **Obrigatório pt-BR** para todo texto visível ao usuário
- Código e variáveis em inglês

### Datas e Valores
- Datas: `lib/formatters/date.ts` (pt-BR, timezone São Paulo)
- Valores: `lib/formatters/money.ts` (BRL)

---

## 4) Fluxo para Criar Nova Tela

### Passo 1 — Tipos
```typescript
// types/<domain>.ts ou features/<domain>/types.ts
export type Entity = { id: string; name: string; ... };
```

### Passo 2 — API Layer
```typescript
// features/<domain>/api.ts
export async function listEntities(params) { ... }
export async function createEntity(payload) { ... }
```

### Passo 3 — Componentes
- `EntityTable.tsx` — DataTable
- `EntityFormSheet.tsx` — Create/Edit
- `EntityDetailsSheet.tsx` — Visualização

### Passo 4 — Page SSR
```typescript
// app/<route>/page.tsx
export default async function Page({ searchParams }) {
  const data = await listEntities(searchParams);
  return <EntityTable data={data} />;
}
```

---

## 5) Checklist de Qualidade

- [ ] TypeScript strict sem `any`
- [ ] Validação com zod
- [ ] Estados de loading/empty/error
- [ ] Responsividade (mobile-first)
- [ ] Textos em pt-BR
- [ ] `bun run lint` sem erros
- [ ] `bun run typecheck` sem erros
- [ ] `bun run build` com sucesso
