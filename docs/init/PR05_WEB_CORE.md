# PR05 — Web Core (Next.js + Bun + Auth + Home consumindo API)

## Objetivo
Construir o core do frontend:
- Página de login simples
- Página Home consumindo `/home` do PostgreSQL via API
- Componentização e estados (loading/erro/empty)
- Usar Bun para gerenciamento de dependências e runtime
- Preparar terreno para UI final do desafio

## Escopo
✅ Inclui
- `/login` com form (username/password)
- Ao logar: chama backend `/auth/login` com `credentials: "include"`
- `/` (Home): busca `/home` com cookie
- Redirecionamento:
  - Sem cookie (ou 401): manda para `/login`
- Componentes base e layout responsivo

❌ Não inclui
- Refinos avançados de design (PR06)
- Persistência real de “notificação lida” (opcional)

## Padrões sugeridos
- App Router (`src/app`)
- Bun como runtime e package manager
- `src/lib/api.ts` (fetch wrapper com baseURL)
- `src/components/` com componentes pequenos e testáveis
- TypeScript strict mode

## Fluxo técnico (cookies)
- `fetch("http://localhost:8000/auth/login", { method:"POST", credentials:"include" })`
- `fetch("http://localhost:8000/home", { credentials:"include" })`

## Checklist de implementação
- [ ] Garantir que `bun install` está funcionando
- [ ] Layout base (shell)
- [ ] Página `/login` (client component)
- [ ] Home como client component com:
  - [ ] loading state
  - [ ] erro (mensagem + retry)
  - [ ] sucesso renderiza dados do PostgreSQL
- [ ] Ajustar `NEXT_PUBLIC_API_BASE` e usar no fetch
- [ ] Componentes reutilizáveis iniciais (Card, Button, etc.)

## Critérios de aceite
- Login funciona e cria sessão (cookie)
- Home lê dados do backend (PostgreSQL via API)
- Sem sessão, usuário volta para login
- `bun run lint` passa
- `bun run typecheck` passa
- `bun run build` passa
