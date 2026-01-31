# PR10 — Admin Finance (invoices/payments) + Pay Mock

## Objetivo
CRUD do financeiro e base do fluxo de pagamento.

---

## Endpoints (ADMIN)

### Invoices
- `GET/POST /api/v1/admin/invoices`
- `GET/PUT/PATCH/DELETE /api/v1/admin/invoices/{invoice_id}`
- filtros: `student_id`, `status`, `due_date_from`, `due_date_to`

### Payments
- `GET/POST /api/v1/admin/payments`
- `GET/PUT/PATCH/DELETE /api/v1/admin/payments/{payment_id}`
- filtros: `invoice_id`, `status`

### Operação (opcional)
- `POST /api/v1/admin/invoices/{invoice_id}/mark-paid`

---

## Regras
- Não permitir pagar invoice CANCELED
- Ao marcar como PAID, criar payment SETTLED e setar `paid_at`

---

## Critérios de aceite
- CRUD com ADMIN
- Marcar pago cria payment e altera status
