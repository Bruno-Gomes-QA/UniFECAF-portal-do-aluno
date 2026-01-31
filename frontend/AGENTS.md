# agents.md (frontend/)

Regras e padrões específicos do **frontend Next.js (TypeScript)**.

## Objetivo do frontend
- Login simples
- Home consumindo `/home` do backend (dados do PostgreSQL)
- UX com estados: loading/erro/empty
- Componentes claros e reutilizáveis
- Usar Bun para gerenciamento e runtime

## Stack e decisões
- Next.js + TypeScript
- Bun (package manager e runtime)
- Fetch com `credentials: "include"` (cookie httpOnly)
- Variável de base URL: `NEXT_PUBLIC_API_BASE` (ex.: `http://localhost:8000`)

## Estrutura sugerida
```txt
frontend/
├── AGENTS.md
├── src
│   ├── app
│   │   ├── (public)
│   │   │   └── login
│   │   │       └── page.tsx
│   │   ├── (private)
│   │   │   └── page.tsx      # home
│   │   └── layout.tsx
│   ├── components
│   │   ├── ui/              # componentes base (Button, Card, etc.)
│   │   └── features/        # componentes específicos (GradesSummary, etc.)
│   ├── lib
│   │   ├── api.ts           # fetch wrapper
│   │   └── types.ts         # tipos do backend
│   └── styles
├── Bun
- Usar `bun install` para instalar dependências
- Usar `bun run <script>` para executar scripts
- `bun.lockb` deve ser commitado (equivalente ao package-lock.json)
- Em desenvolvimento local: `bun run dev`
- Para build: `bun run build`

### TypeScript
- `noImplicitAny` ligado
- Tipar respostas do backend em `src/lib/types.ts`
- Evitar `any`. Se inevitável, justificar em comentário curto
- Usar interfaces para dados vindos da API
├── tsconfig.json
└── Dockerfile
```

> Se preferir manter simples no começo: `src/app/login/page.tsx` e `src/app/page.tsx` já resolve.

## Padrões de código e focados:
  - `StudentHeader` - cabeçalho com info do aluno
  - `GradesSummary` - resumo de notas
  - `FinancialWidget` - status financeiro
  - `TodayAgenda` - agenda do dia
  - `NotificationsBell` - sino de notificações
  - `QuickActions` - ações rápidas
- Server Components quando possível, Client Components quando necessário (estados, eventos)
- Separar lógica de fetch em `src/lib/api.ts`
- Componentes pequenos:
  - `StudentHeader`
  - `GradesSummary`
  - `FinancialWidget`
  - `TodayAgenda`
  - `NotificationsBell`
  - `QuickActions`

### UI/UX
- Mobile-first
- Estados obrigatórios:
  - loading (skeleton ou texto)
  - erro (mensagem e retry)
  - vazio (mensagem amigável)
bun run lint`
- `bun run typecheck`
- `bunmpre** usar `credentials: "include"` em calls para a API.
- Não ler JWT no JS (cookie é httpOnly).
- Erro 401 na Home deve redirecionar pra `/login`.

## Qualidade (scripts)
Deve passar:
- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Anti-padrões (evitar)
- Guardar token em `localStorage`/`sessionStorage`
- Fetch espalhado em 10 arquivos sem padrão
- Componentes gigantes com +300 linhas
- CSS inline demais; preferir utilitários (Tailwind) ou componentes consistentes

## Observabilidade
- `console.error` aceitável em dev, mas preferir mensagens amigáveis ao usuário.
- Se logar algo, nunca logar cookie/token.
