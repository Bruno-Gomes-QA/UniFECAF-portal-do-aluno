"""Seed UniFECAF Portal do Aluno (dados compatíveis com o JSON do desafio)

Revision ID: 008_seed_data
Revises: 007_audit_domain
Create Date: 2026-01-30

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "008_seed_data"
down_revision = "007_audit_domain"
branch_labels = None
depends_on = None

# Credenciais de demo (para README):
# - admin@unifecaf.edu.br / admin123
# - demo@unifecaf.edu.br  / demo123

ADMIN_EMAIL = "admin@unifecaf.edu.br"
DEMO_EMAIL = "demo@unifecaf.edu.br"

ADMIN_HASH = "$2b$12$WxiM0oeNRfEzmHMl6TCj6uUN5PL4BT.yS7/JcSw0cdWPiyrQSGSJe"  # admin123
DEMO_HASH = "$2b$12$ggUaCepcvEfOzWkfW.v5fum9x0mrM2W7ZEOVNk0UVrfv/5kpZoTNO"  # demo123


def upgrade() -> None:
    # 1) USERS (ADMIN + STUDENT) - idempotente por email (citext unique)
    op.execute(f"""
    INSERT INTO auth.users (email, password_hash, role, status)
    VALUES ('{ADMIN_EMAIL}', '{ADMIN_HASH}', 'ADMIN'::auth.user_role, 'ACTIVE'::auth.user_status)
    ON CONFLICT (email) DO UPDATE
      SET password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          status = EXCLUDED.status;
    """)

    op.execute(f"""
    INSERT INTO auth.users (email, password_hash, role, status)
    VALUES ('{DEMO_EMAIL}', '{DEMO_HASH}', 'STUDENT'::auth.user_role, 'ACTIVE'::auth.user_status)
    ON CONFLICT (email) DO UPDATE
      SET password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          status = EXCLUDED.status;
    """)

    # 2) COURSE (do JSON)
    op.execute("""
    INSERT INTO academics.courses (name, degree_type, duration_terms)
    SELECT 'Análise e Desenvolvimento de Sistemas', 'Tecnólogo', 5
    WHERE NOT EXISTS (
      SELECT 1 FROM academics.courses WHERE name = 'Análise e Desenvolvimento de Sistemas'
    );
    """)

    # 3) TERM atual (do JSON) - 2026-1 como current
    op.execute("""
    INSERT INTO academics.terms (code, start_date, end_date, is_current)
    VALUES ('2026-1', '2026-01-15', '2026-06-30', true)
    ON CONFLICT (code) DO UPDATE
      SET start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          is_current = EXCLUDED.is_current;
    """)

    # Garante que só 1 term esteja marcado como current
    op.execute("""
    UPDATE academics.terms
      SET is_current = false
    WHERE code <> '2026-1' AND is_current = true;
    """)

    # 4) SUBJECTS (do JSON) no curso ADS
    op.execute("""
    WITH c AS (
      SELECT id FROM academics.courses WHERE name = 'Análise e Desenvolvimento de Sistemas' LIMIT 1
    )
    INSERT INTO academics.subjects (course_id, code, name, credits, is_active)
    SELECT c.id, x.code, x.name, 4, true
    FROM c
    CROSS JOIN (VALUES
      ('ADS-DWF-001', 'Desenvolvimento Web Fullstack'),
      ('ADS-NOSQL-001', 'Banco de Dados NoSQL')
    ) AS x(code, name)
    ON CONFLICT (course_id, code) DO UPDATE
      SET name = EXCLUDED.name,
          credits = EXCLUDED.credits,
          is_active = EXCLUDED.is_active;
    """)

    # 5) STUDENT (do JSON) vinculado ao DEMO user
    op.execute(f"""
    WITH u AS (
      SELECT id FROM auth.users WHERE email = '{DEMO_EMAIL}' LIMIT 1
    ),
    c AS (
      SELECT id FROM academics.courses WHERE name = 'Análise e Desenvolvimento de Sistemas' LIMIT 1
    ),
    t AS (
      SELECT id FROM academics.terms WHERE code = '2026-1' LIMIT 1
    )
    INSERT INTO academics.students (user_id, ra, full_name, course_id, admission_term, total_progress)
    SELECT u.id, '20240988', 'Candidato(a) Pleno Teste', c.id, t.id, 45
    FROM u, c, t
    ON CONFLICT (ra) DO UPDATE
      SET full_name = EXCLUDED.full_name,
          course_id = EXCLUDED.course_id,
          admission_term = EXCLUDED.admission_term,
          total_progress = EXCLUDED.total_progress;
    """)

    # 6) SECTIONS (turmas) no term atual, 1 por disciplina
    op.execute("""
    WITH t AS (SELECT id AS term_id FROM academics.terms WHERE code='2026-1' LIMIT 1),
    s AS (SELECT id AS subject_id, name FROM academics.subjects WHERE code IN ('ADS-DWF-001','ADS-NOSQL-001'))
    INSERT INTO academics.sections (term_id, subject_id, code, room_default, capacity)
    SELECT t.term_id, s.subject_id, 'A',
           CASE WHEN s.name='Desenvolvimento Web Fullstack' THEN 'Sala 302 - Bloco A' ELSE 'Sala 201 - Bloco A' END,
           60
    FROM t, s
    ON CONFLICT (term_id, subject_id, code) DO UPDATE
      SET room_default = EXCLUDED.room_default,
          capacity = EXCLUDED.capacity;
    """)

    # 7) WEEKLY MEETINGS (regra: 1 aula por dia)
    # - DWF: segunda 19-21
    # - NoSQL: quarta 19-21
    op.execute("""
    WITH sec AS (
      SELECT se.id, subj.code AS subject_code
      FROM academics.sections se
      JOIN academics.subjects subj ON subj.id = se.subject_id
      JOIN academics.terms t ON t.id = se.term_id
      WHERE t.code='2026-1' AND se.code='A'
    )
    INSERT INTO academics.section_meetings (section_id, weekday, start_time, end_time, room)
    SELECT
      sec.id,
      CASE WHEN sec.subject_code='ADS-DWF-001' THEN 1 ELSE 3 END,  -- 1=Mon, 3=Wed (0=Sun)
      '19:00:00'::time,
      '21:00:00'::time,
      CASE WHEN sec.subject_code='ADS-DWF-001' THEN 'Sala 302 - Bloco A' ELSE 'Sala 201 - Bloco A' END
    FROM sec
    WHERE NOT EXISTS (
      SELECT 1
      FROM academics.section_meetings m
      WHERE m.section_id = sec.id
        AND m.weekday = CASE WHEN sec.subject_code='ADS-DWF-001' THEN 1 ELSE 3 END
        AND m.start_time = '19:00:00'::time
    );
    """)

    # 8) CLASS SESSION (today_classes do JSON)
    # - Cria uma sessão para HOJE (CURRENT_DATE) na disciplina DWF às 19:00 na Sala 302 - Bloco A.
    op.execute("""
    WITH sec AS (
      SELECT se.id AS section_id
      FROM academics.sections se
      JOIN academics.subjects subj ON subj.id = se.subject_id
      JOIN academics.terms t ON t.id = se.term_id
      WHERE t.code='2026-1' AND subj.code='ADS-DWF-001' AND se.code='A'
      LIMIT 1
    )
    INSERT INTO academics.class_sessions (section_id, session_date, start_time, end_time, room, is_canceled)
    SELECT sec.section_id, CURRENT_DATE, '19:00:00'::time, '21:00:00'::time, 'Sala 302 - Bloco A', false
    FROM sec
    ON CONFLICT (section_id, session_date, start_time) DO UPDATE
      SET room = EXCLUDED.room,
          is_canceled = EXCLUDED.is_canceled;
    """)

    # 9) ENROLLMENTS do aluno nas 2 disciplinas do semestre
    op.execute("""
    WITH st AS (
      SELECT user_id AS student_id FROM academics.students WHERE ra='20240988' LIMIT 1
    ),
    secs AS (
      SELECT se.id AS section_id
      FROM academics.sections se
      JOIN academics.subjects subj ON subj.id = se.subject_id
      JOIN academics.terms t ON t.id = se.term_id
      WHERE t.code='2026-1' AND subj.code IN ('ADS-DWF-001','ADS-NOSQL-001') AND se.code='A'
    )
    INSERT INTO academics.section_enrollments (student_id, section_id, status)
    SELECT st.student_id, secs.section_id, 'ENROLLED'::academics.enrollment_status
    FROM st, secs
    ON CONFLICT (student_id, section_id) DO UPDATE SET status = EXCLUDED.status;
    """)

    # 10) FINAL GRADES (academic_summary do JSON)
    # No JSON, "absences" é apresentado como número; o PDF menciona "% de faltas".
    # Aqui vamos armazenar como absences_pct (12 e 26) para bater com o UI/alerta >20%.
    op.execute("""
    WITH st AS (
      SELECT user_id AS student_id FROM academics.students WHERE ra='20240988' LIMIT 1
    ),
    sec AS (
      SELECT se.id AS section_id, subj.code AS subject_code
      FROM academics.sections se
      JOIN academics.subjects subj ON subj.id = se.subject_id
      JOIN academics.terms t ON t.id = se.term_id
      WHERE t.code='2026-1' AND subj.code IN ('ADS-DWF-001','ADS-NOSQL-001') AND se.code='A'
    )
    INSERT INTO academics.final_grades (
      section_id, student_id, final_score, absences_count, absences_pct, status
    )
    SELECT
      sec.section_id,
      st.student_id,
      CASE WHEN sec.subject_code='ADS-DWF-001' THEN 8.50 ELSE 5.00 END,
      0,
      CASE WHEN sec.subject_code='ADS-DWF-001' THEN 12.00 ELSE 26.00 END,
      'IN_PROGRESS'::academics.final_status
    FROM st, sec
    ON CONFLICT (section_id, student_id) DO UPDATE
      SET final_score = EXCLUDED.final_score,
          absences_pct = EXCLUDED.absences_pct,
          status = EXCLUDED.status;
    """)

    # 11) FINANCIAL SUMMARY (do JSON): próximo boleto
    op.execute("""
    WITH st AS (
      SELECT user_id AS student_id FROM academics.students WHERE ra='20240988' LIMIT 1
    )
    INSERT INTO finance.invoices (student_id, term_id, description, due_date, amount, status)
    SELECT st.student_id, (SELECT id FROM academics.terms WHERE code='2026-1' LIMIT 1),
           'Mensalidade', '2026-02-10'::date, 450.00, 'PENDING'::finance.invoice_status
    FROM st
    WHERE NOT EXISTS (
      SELECT 1 FROM finance.invoices
      WHERE student_id = st.student_id AND due_date='2026-02-10'::date AND amount=450.00
    );
    """)

    # 12) NOTIFICATIONS (do JSON) + entrega ao usuário
    op.execute("""
    -- Notificação 1: unread
    INSERT INTO comm.notifications (type, channel, priority, title, body)
    VALUES ('ACADEMIC'::comm.notification_type, 'IN_APP'::comm.notification_channel, 'NORMAL'::comm.notification_priority, NULL, 'Sua nota de Banco de Dados foi publicada.')
    ON CONFLICT DO NOTHING;
    """)

    op.execute("""
    -- Notificação 2: read
    INSERT INTO comm.notifications (type, channel, priority, title, body)
    VALUES ('ADMIN'::comm.notification_type, 'IN_APP'::comm.notification_channel, 'NORMAL'::comm.notification_priority, NULL, 'Lembrete: Renovação de matrícula disponível.')
    ON CONFLICT DO NOTHING;
    """)

    # Extra: informações da unidade sede (endereço/telefone) — útil para demo
    op.execute("""
    INSERT INTO comm.notifications (type, channel, priority, title, body)
    VALUES (
      'ADMIN'::comm.notification_type, 'IN_APP'::comm.notification_channel, 'LOW'::comm.notification_priority,
      'Unidade Sede (Taboão da Serra)',
      'Av. Vida Nova, 166 - Jardim Maria Rosa, Taboão da Serra - SP CEP 06764-045 • Tel: (11) 4210-4950'
    )
    ON CONFLICT DO NOTHING;
    """)

    # Link notification 1 (unread)
    op.execute(f"""
    WITH u AS (
      SELECT id AS user_id FROM auth.users WHERE email='{DEMO_EMAIL}' LIMIT 1
    ),
    n AS (
      SELECT id AS notification_id FROM comm.notifications WHERE body='Sua nota de Banco de Dados foi publicada.' LIMIT 1
    )
    INSERT INTO comm.user_notifications (user_id, notification_id, read_at)
    SELECT u.user_id, n.notification_id, NULL FROM u, n
    ON CONFLICT (user_id, notification_id) DO UPDATE SET read_at = EXCLUDED.read_at;
    """)

    # Link notification 2 (read)
    op.execute(f"""
    WITH u AS (
      SELECT id AS user_id FROM auth.users WHERE email='{DEMO_EMAIL}' LIMIT 1
    ),
    n AS (
      SELECT id AS notification_id FROM comm.notifications WHERE body='Lembrete: Renovação de matrícula disponível.' LIMIT 1
    )
    INSERT INTO comm.user_notifications (user_id, notification_id, read_at)
    SELECT u.user_id, n.notification_id, now() FROM u, n
    ON CONFLICT (user_id, notification_id) DO UPDATE SET read_at = EXCLUDED.read_at;
    """)

    # Link notification 3 (read)
    op.execute(f"""
    WITH u AS (
      SELECT id AS user_id FROM auth.users WHERE email='{DEMO_EMAIL}' LIMIT 1
    ),
    n AS (
      SELECT id AS notification_id FROM comm.notifications WHERE title='Unidade Sede (Taboão da Serra)' LIMIT 1
    )
    INSERT INTO comm.user_notifications (user_id, notification_id, read_at)
    SELECT u.user_id, n.notification_id, now() FROM u, n
    ON CONFLICT (user_id, notification_id) DO UPDATE SET read_at = EXCLUDED.read_at;
    """)

    # 13) NOTIFICATION PREFERENCES
    op.execute(f"""
    INSERT INTO comm.notification_preferences (user_id, in_app_enabled, email_enabled, sms_enabled)
    SELECT id, true, true, false FROM auth.users WHERE email='{DEMO_EMAIL}'
    ON CONFLICT (user_id) DO UPDATE
      SET in_app_enabled = EXCLUDED.in_app_enabled,
          email_enabled = EXCLUDED.email_enabled,
          sms_enabled = EXCLUDED.sms_enabled;
    """)

    # 14) DOCUMENTS (ações rápidas)
    op.execute("""
    WITH st AS (
      SELECT user_id AS student_id FROM academics.students WHERE ra='20240988' LIMIT 1
    )
    INSERT INTO documents.student_documents (student_id, doc_type, status, title, file_url, generated_at)
    SELECT st.student_id, d.doc_type::documents.document_type, 'AVAILABLE'::documents.document_status, d.title, d.url, now()
    FROM st
    CROSS JOIN (VALUES
      ('DECLARATION','Declaração de Matrícula','https://files.demo.unifecaf.local/declaracao.pdf'),
      ('STUDENT_CARD','Carteirinha Digital','https://files.demo.unifecaf.local/carteirinha.pdf'),
      ('TRANSCRIPT','Histórico Escolar','https://files.demo.unifecaf.local/historico.pdf')
    ) AS d(doc_type, title, url)
    ON CONFLICT (student_id, doc_type) DO UPDATE
      SET status = EXCLUDED.status,
          title = EXCLUDED.title,
          file_url = EXCLUDED.file_url,
          generated_at = EXCLUDED.generated_at;
    """)

    # 15) AUDIT (opcional, mas ajuda na demo/admin)
    op.execute("""
    INSERT INTO audit.audit_log (actor_user_id, action, entity_type, data)
    SELECT u.id, 'SEED_APPLIED', 'seed', jsonb_build_object('seed', '009_seed_unifecaf_demo')
    FROM auth.users u
    WHERE u.email = 'admin@unifecaf.edu.br'
    LIMIT 1;
    """)


def downgrade() -> None:
    # Remove dados de demo (reverse-friendly via chaves estáveis)
    op.execute("""
    DELETE FROM documents.student_documents
    WHERE student_id IN (SELECT user_id FROM academics.students WHERE ra='20240988');
    """)

    op.execute(f"""
    DELETE FROM comm.user_notifications
    WHERE user_id IN (SELECT id FROM auth.users WHERE email='{DEMO_EMAIL}');
    """)

    op.execute("""
    DELETE FROM comm.notifications
    WHERE body IN (
      'Sua nota de Banco de Dados foi publicada.',
      'Lembrete: Renovação de matrícula disponível.'
    )
    OR title = 'Unidade Sede (Taboão da Serra)';
    """)

    op.execute(f"""
    DELETE FROM comm.notification_preferences
    WHERE user_id IN (SELECT id FROM auth.users WHERE email='{DEMO_EMAIL}');
    """)

    op.execute("""
    DELETE FROM finance.invoices
    WHERE due_date='2026-02-10'::date AND amount=450.00
      AND student_id IN (SELECT user_id FROM academics.students WHERE ra='20240988');
    """)

    op.execute("""
    DELETE FROM academics.final_grades
    WHERE student_id IN (SELECT user_id FROM academics.students WHERE ra='20240988');
    """)

    op.execute("""
    DELETE FROM academics.section_enrollments
    WHERE student_id IN (SELECT user_id FROM academics.students WHERE ra='20240988');
    """)

    op.execute("""
    DELETE FROM academics.class_sessions
    WHERE room='Sala 302 - Bloco A'
      AND section_id IN (
        SELECT se.id
        FROM academics.sections se
        JOIN academics.subjects subj ON subj.id=se.subject_id
        WHERE subj.code='ADS-DWF-001'
      );
    """)

    op.execute("""
    DELETE FROM academics.section_meetings
    WHERE section_id IN (
      SELECT se.id
      FROM academics.sections se
      JOIN academics.subjects subj ON subj.id=se.subject_id
      WHERE subj.code IN ('ADS-DWF-001','ADS-NOSQL-001')
    );
    """)

    op.execute("""
    DELETE FROM academics.sections
    WHERE term_id IN (SELECT id FROM academics.terms WHERE code='2026-1')
      AND subject_id IN (SELECT id FROM academics.subjects WHERE code IN ('ADS-DWF-001','ADS-NOSQL-001'))
      AND code='A';
    """)

    op.execute("""
    DELETE FROM academics.students WHERE ra='20240988';
    """)

    # Mantém subjects/course/term por segurança (podem ser usados em outros testes).
    # Se quiser remover também, descomente:
    # op.execute("DELETE FROM academics.subjects WHERE code IN ('ADS-DWF-001','ADS-NOSQL-001');")
    # op.execute("DELETE FROM academics.terms WHERE code='2026-1';")
    # op.execute("DELETE FROM academics.courses WHERE name='Análise e Desenvolvimento de Sistemas';")

    op.execute(f"DELETE FROM auth.users WHERE email IN ('{DEMO_EMAIL}', '{ADMIN_EMAIL}');")
