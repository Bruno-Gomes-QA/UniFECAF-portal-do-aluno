# PR06 — Integração & Polimento (UX + Ajustes finos + README final)

## Objetivo
Fechar o pacote para avaliação:
- UI mais próxima do design/brief
- Interações principais funcionando com dados reais do PostgreSQL
- Ajustes finos de cookie/CORS no compose
- README final com “como rodar” impecável

## Escopo
✅ Inclui
- Home completa (seções do hub):
  - Identificação do aluno + progresso
  - Resumo de notas (alerta de faltas > 20%)
  - Financeiro (PENDING/PAID)
  - Agenda do dia
  - Sininho (lidas/não lidas)
  - Ações rápidas (navegação/ações simples)
- Responsividade (mobile-first)
- Estado vazio para listas
- Ajustes finais no backend para suportar interação (se necessário)
- README final com:
  - comandos
  - decisões arquiteturais
  - trade-offs

## Checklist de implementação
- [ ] Seed data no PostgreSQL (usuários, notas, financeiro, agenda)
- [ ] Layout responsivo (mobile-first)
- [ ] Componentes reutilizáveis (ex: Card, Badge, Progress)
- [ ] Notificações:
  - [ ] marcar como lida no front
  - [ ] (opcional) persistir no PostgreSQL via endpoint PATCH
- [ ] Observabilidade mínima:
  - [ ] logs básicos no backend
  - [ ] mensagens de erro amigáveis no front
- [ ] Revisão de CORS/credentials
- [ ] README completo com setup, variáveis de ambiente, e comandos

## Critérios de aceite
- Experiência fluida no browser
- `docker compose up --build` roda tudo (PostgreSQL + API + WEB)
- Dados realistas no PostgreSQL (seed)
- CI verde
- README "copy/paste & run"
- Migrations aplicadas automaticamente
