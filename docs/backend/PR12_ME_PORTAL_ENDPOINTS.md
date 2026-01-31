# PR12 — Portal do aluno (/me) — endpoints consumíveis pelo frontend

## Objetivo
Entregar endpoints “de produto”:
- aluno vê só seus dados
- ações completas (notificação, pagamento mock, documentos)
- sem payload monolítico (frontend compõe telas)

---

## Endpoints (/me)

### Perfil
- `GET /api/v1/me/profile`

### Aula do dia (1 por dia)
- `GET /api/v1/me/today-class`

### Resumo acadêmico (term atual)
- `GET /api/v1/me/academic/summary`

### Financeiro
- `GET /api/v1/me/financial/summary`
- `GET /api/v1/me/financial/invoices`
- `POST /api/v1/me/financial/invoices/{invoice_id}/pay-mock`

### Notificações
- `GET /api/v1/me/notifications?unread_only=true|false`
- `GET /api/v1/me/notifications/unread-count`
- `POST /api/v1/me/notifications/{user_notification_id}/read`
- `POST /api/v1/me/notifications/{user_notification_id}/unread` (opcional)
- `POST /api/v1/me/notifications/{user_notification_id}/archive` (opcional)

### Documentos
- `GET /api/v1/me/documents`
- `POST /api/v1/me/documents/{doc_type}/request`
- `GET /api/v1/me/documents/{doc_type}/download`

---

## Critérios de aceite
- RBAC correto (aluno não acessa /admin)
- Ações mudam estado no DB
- Responses tipadas e consistentes
