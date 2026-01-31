# PR07 — Postgres + Alembic + Models (schema final sem campus)

## Objetivo
Integrar PostgreSQL e estabelecer base definitiva:
- Serviço `db` no `docker-compose`
- `DATABASE_URL`
- Alembic funcionando
- Models SQLAlchemy para todas as tabelas
- Migration inicial **sem campus** (remover multi-campus)

---

## Checklist

### 1) Docker Compose
- [ ] Serviço `db` (postgres:16)
- [ ] Volume persistente
- [ ] `api` depende de `db`
- [ ] Variáveis no `.env.example`:
  - `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
  - `DATABASE_URL`

### 2) Alembic
- [ ] `alembic.ini`
- [ ] `alembic/env.py` lê `DATABASE_URL` do Settings
- [ ] `target_metadata` aponta pra `Base.metadata`
- [ ] Documentar comandos:
  - `alembic revision --autogenerate -m "init schema"`
  - `alembic upgrade head`

### 3) Modelagem (remover campus)
- [ ] Não criar `academics.campuses`
- [ ] `academics.courses` **sem** `campus_id`

### 4) Models SQLAlchemy (neste PR)
Crie models para TODAS as tabelas:
- auth: `User`, `JwtSession`
- academics: `Student`, `Course`, `Term`, `Subject`, `Section`, `SectionEnrollment`, `SectionMeeting`,
  `ClassSession`, `AttendanceRecord`, `Assessment`, `AssessmentGrade`, `FinalGrade`
- finance: `Invoice`, `Payment`
- comm: `Notification`, `UserNotification`, `NotificationPreference`
- documents: `StudentDocument`
- audit: `AuditLog`

### 5) Índices, constraints e enums
- [ ] Enums no Postgres (via migration)
- [ ] Constraints e uniques do schema

---

## Critérios de aceite
- `docker compose up --build` sobe `db` + `api`
- `alembic upgrade head` funciona
- Tabelas criadas com constraints e enums
- Models importáveis sem ciclos
