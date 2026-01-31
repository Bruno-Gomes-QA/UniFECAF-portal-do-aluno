# PR11 — Admin Comm + Documents (notifications + prefs + student_documents)

## Objetivo
Comunicações e documentos:
- Notificação global e estado por usuário
- Preferências
- Documentos por aluno

---

## Endpoints (ADMIN)

### Notifications
- `GET/POST /api/v1/admin/notifications`
- `GET/PUT/PATCH/DELETE /api/v1/admin/notifications/{notification_id}`

### Deliver (user_notifications)
- `POST /api/v1/admin/notifications/{notification_id}/deliver`
  - body: `{ "all_students": true }` ou `{ "user_ids": ["..."] }`
- `GET /api/v1/admin/user-notifications` (filtros: user_id, unread_only)

### Preferences
- `GET/PUT/PATCH /api/v1/admin/users/{user_id}/notification-preferences`

### Documents
- `GET/POST /api/v1/admin/student-documents`
- `GET/PUT/PATCH/DELETE /api/v1/admin/student-documents/{doc_id}`

---

## Critérios de aceite
- Admin cria e entrega notificação
- Admin gerencia documentos
- Listas paginadas
