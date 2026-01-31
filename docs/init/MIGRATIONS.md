# Migrations do Banco de Dados

Este documento descreve a estrutura de migrations do Alembic para o Portal do Aluno UniFECAF.

## Estrutura das Migrations

As migrations estão organizadas por domínio, facilitando a manutenção e compreensão do schema do banco de dados:

### 001_common_extensions.py
- **Descrição**: Configurações comuns e extensões do PostgreSQL
- **Conteúdo**:
  - Extensões: `pgcrypto` (geração de UUIDs), `citext` (texto case-insensitive)
  - Schemas: `auth`, `academics`, `finance`, `comm`, `documents`, `audit`, `common`
  - Função trigger: `set_updated_at()` para atualizar timestamps automaticamente

### 002_auth_domain.py
- **Descrição**: Domínio de autenticação e usuários
- **Conteúdo**:
  - Enums: `user_role` (student, teacher, admin), `user_status` (active, inactive, suspended)
  - Tabela `auth.users`: usuários do sistema com email, senha hash, CPF, telefone
  - Tabela `auth.jwt_sessions`: controle de sessões JWT
  - Triggers para `updated_at`

### 003_academics_domain.py
- **Descrição**: Domínio acadêmico (maior migration)
- **Conteúdo**:
  - Enums: `enrollment_status`, `attendance_status`, `final_status`
  - Tabelas principais:
    - `academics.campuses`: unidades/campus da instituição
    - `academics.courses`: cursos oferecidos
    - `academics.terms`: períodos letivos (semestres)
    - `academics.subjects`: disciplinas
    - `academics.students`: dados dos alunos
    - `academics.sections`: turmas de disciplinas
    - `academics.section_enrollments`: matrículas em turmas
    - `academics.section_meetings`: horários das aulas
    - `academics.class_sessions`: sessões de aula
    - `academics.attendance_records`: registros de presença
    - `academics.assessments`: avaliações (provas, trabalhos)
    - `academics.assessment_grades`: notas das avaliações
    - `academics.final_grades`: notas finais
  - View: `v_student_next_class_today` (próxima aula do aluno)

### 004_finance_domain.py
- **Descrição**: Domínio financeiro
- **Conteúdo**:
  - Enums: `invoice_status`, `payment_status`
  - Tabela `finance.invoices`: faturas/mensalidades
  - Tabela `finance.payments`: pagamentos realizados

### 005_comm_domain.py
- **Descrição**: Domínio de comunicação e notificações
- **Conteúdo**:
  - Enums: `notification_type`, `notification_channel`, `notification_priority`
  - Tabela `comm.notifications`: notificações do sistema
  - Tabela `comm.user_notifications`: notificações por usuário
  - Tabela `comm.notification_preferences`: preferências de notificação

### 006_documents_domain.py
- **Descrição**: Domínio de documentos do aluno
- **Conteúdo**:
  - Enums: `document_type`, `document_status`
  - Tabela `documents.student_documents`: documentos dos alunos

### 007_audit_domain.py
- **Descrição**: Domínio de auditoria
- **Conteúdo**:
  - Tabela `audit.audit_log`: log de auditoria do sistema

### 008_seed_data.py
- **Descrição**: Dados de demonstração
- **Conteúdo**:
  - Usuário demo: `demo@unifecaf.edu.br` / `demo123`
  - Campus, curso, período letivo, disciplinas
  - Aluno vinculado ao usuário demo
  - Turmas, matrículas, sessões de aula
  - Avaliações e notas
  - Faturas financeiras
  - Notificações

## Ordem de Execução

As migrations devem ser executadas em ordem sequencial (001 → 008), pois cada uma depende da anterior.

O Alembic gerencia isso automaticamente através dos campos `revision` e `down_revision` em cada migration.

## Como Aplicar

```bash
# Aplicar todas as migrations pendentes
alembic upgrade head

# Reverter última migration
alembic downgrade -1

# Reverter todas as migrations
alembic downgrade base

# Ver histórico
alembic history

# Ver status atual
alembic current
```

## Rollback

Cada migration possui uma função `downgrade()` que reverte as mudanças da `upgrade()`.

Isso permite rollback seguro em caso de problemas.

## Observações Importantes

1. **Bcrypt Version**: O backend usa `bcrypt==4.0.1` (pinned) para compatibilidade com `passlib 1.7.4`
2. **Metadata Reserved Word**: A tabela `user_notifications` usa `extra_data` ao invés de `metadata` para evitar conflitos com SQLAlchemy
3. **UUIDs**: Todas as PKs usam UUID v4 gerado via `gen_random_uuid()` do PostgreSQL
4. **Timestamps**: Campos `created_at` e `updated_at` são gerenciados automaticamente via triggers
5. **Cascades**: Foreign keys configuradas com `ON DELETE CASCADE` ou `ON DELETE SET NULL` conforme necessário

## Estrutura de Pastas

```
backend/
├── alembic/
│   ├── versions/
│   │   ├── 001_common_extensions.py
│   │   ├── 002_auth_domain.py
│   │   ├── 003_academics_domain.py
│   │   ├── 004_finance_domain.py
│   │   ├── 005_comm_domain.py
│   │   ├── 006_documents_domain.py
│   │   ├── 007_audit_domain.py
│   │   └── 008_seed_data.py
│   ├── env.py
│   └── script.py.mako
└── alembic.ini
```
