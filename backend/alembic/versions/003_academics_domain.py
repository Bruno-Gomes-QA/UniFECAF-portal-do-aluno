"""Academics domain - core academic tables

Revision ID: 003_academics_domain
Revises: 002_auth_domain
Create Date: 2026-01-30

Creates academics domain tables: campuses, courses, terms, subjects, students, sections, enrollments, meetings, class sessions, attendance, assessments and final grades.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision: str = "003_academics_domain"
down_revision: Union[str, None] = "002_auth_domain"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create academics domain tables."""
    
    # Create enums
    op.execute("""
        DO $$ BEGIN
          CREATE TYPE academics.enrollment_status AS ENUM ('ENROLLED', 'LOCKED', 'DROPPED', 'COMPLETED');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$
    """)
    
    op.execute("""
        DO $$ BEGIN
          CREATE TYPE academics.attendance_status AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$
    """)
    
    op.execute("""
        DO $$ BEGIN
          CREATE TYPE academics.final_status AS ENUM ('IN_PROGRESS', 'APPROVED', 'FAILED');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$
    """)
    
    # Campuses
    op.execute("""
        CREATE TABLE academics.campuses (
          id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name        text NOT NULL,
          city        text,
          state       text,
          created_at  timestamptz NOT NULL DEFAULT now(),
          updated_at  timestamptz NOT NULL DEFAULT now()
        )
    """)
    
    op.execute("""
        CREATE TRIGGER trg_campuses_updated_at
        BEFORE UPDATE ON academics.campuses
        FOR EACH ROW EXECUTE FUNCTION common.set_updated_at()
    """)
    
    # Courses
    op.execute("""
        CREATE TABLE academics.courses (
          id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          campus_id       uuid REFERENCES academics.campuses(id) ON DELETE SET NULL,
          name            text NOT NULL,
          degree_type     text,
          duration_terms  int CHECK (duration_terms IS NULL OR duration_terms > 0),
          created_at      timestamptz NOT NULL DEFAULT now(),
          updated_at      timestamptz NOT NULL DEFAULT now()
        )
    """)
    
    op.execute("""
        CREATE TRIGGER trg_courses_updated_at
        BEFORE UPDATE ON academics.courses
        FOR EACH ROW EXECUTE FUNCTION common.set_updated_at()
    """)
    
    # Terms
    op.execute("""
        CREATE TABLE academics.terms (
          id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          code        text UNIQUE NOT NULL,
          start_date  date NOT NULL,
          end_date    date NOT NULL,
          is_current  boolean NOT NULL DEFAULT false,
          created_at  timestamptz NOT NULL DEFAULT now(),
          updated_at  timestamptz NOT NULL DEFAULT now(),
          CHECK (end_date > start_date)
        )
    """)
    
    op.execute("""
        CREATE TRIGGER trg_terms_updated_at
        BEFORE UPDATE ON academics.terms
        FOR EACH ROW EXECUTE FUNCTION common.set_updated_at()
    """)
    
    # Subjects
    op.execute("""
        CREATE TABLE academics.subjects (
          id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          course_id   uuid NOT NULL REFERENCES academics.courses(id) ON DELETE CASCADE,
          code        text NOT NULL,
          name        text NOT NULL,
          credits     int CHECK (credits IS NULL OR credits >= 0),
          is_active   boolean NOT NULL DEFAULT true,
          created_at  timestamptz NOT NULL DEFAULT now(),
          updated_at  timestamptz NOT NULL DEFAULT now(),
          UNIQUE (course_id, code)
        )
    """)
    
    op.execute("""
        CREATE TRIGGER trg_subjects_updated_at
        BEFORE UPDATE ON academics.subjects
        FOR EACH ROW EXECUTE FUNCTION common.set_updated_at()
    """)
    
    # Students
    op.execute("""
        CREATE TABLE academics.students (
          user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          ra              text UNIQUE NOT NULL,
          full_name       text NOT NULL,
          course_id       uuid NOT NULL REFERENCES academics.courses(id) ON DELETE RESTRICT,
          admission_term  uuid REFERENCES academics.terms(id) ON DELETE SET NULL,
          total_progress  numeric(5,2) NOT NULL DEFAULT 0 CHECK (total_progress >= 0 AND total_progress <= 100),
          created_at      timestamptz NOT NULL DEFAULT now(),
          updated_at      timestamptz NOT NULL DEFAULT now()
        )
    """)
    
    op.execute("""
        CREATE TRIGGER trg_students_updated_at
        BEFORE UPDATE ON academics.students
        FOR EACH ROW EXECUTE FUNCTION common.set_updated_at()
    """)
    
    # Sections
    op.execute("""
        CREATE TABLE academics.sections (
          id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          term_id       uuid NOT NULL REFERENCES academics.terms(id) ON DELETE CASCADE,
          subject_id    uuid NOT NULL REFERENCES academics.subjects(id) ON DELETE CASCADE,
          code          text NOT NULL,
          room_default  text,
          capacity      int CHECK (capacity IS NULL OR capacity > 0),
          created_at    timestamptz NOT NULL DEFAULT now(),
          updated_at    timestamptz NOT NULL DEFAULT now(),
          UNIQUE (term_id, subject_id, code)
        )
    """)
    
    op.execute("""
        CREATE TRIGGER trg_sections_updated_at
        BEFORE UPDATE ON academics.sections
        FOR EACH ROW EXECUTE FUNCTION common.set_updated_at()
    """)
    
    # Section Enrollments
    op.execute("""
        CREATE TABLE academics.section_enrollments (
          id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id  uuid NOT NULL REFERENCES academics.students(user_id) ON DELETE CASCADE,
          section_id  uuid NOT NULL REFERENCES academics.sections(id) ON DELETE CASCADE,
          status      academics.enrollment_status NOT NULL DEFAULT 'ENROLLED',
          created_at  timestamptz NOT NULL DEFAULT now(),
          updated_at  timestamptz NOT NULL DEFAULT now(),
          UNIQUE (student_id, section_id)
        )
    """)
    
    op.execute("""
        CREATE TRIGGER trg_section_enrollments_updated_at
        BEFORE UPDATE ON academics.section_enrollments
        FOR EACH ROW EXECUTE FUNCTION common.set_updated_at()
    """)
    
    # Section Meetings
    op.execute("""
        CREATE TABLE academics.section_meetings (
          id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          section_id  uuid NOT NULL REFERENCES academics.sections(id) ON DELETE CASCADE,
          weekday     smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
          start_time  time NOT NULL,
          end_time    time NOT NULL,
          room        text,
          created_at  timestamptz NOT NULL DEFAULT now(),
          updated_at  timestamptz NOT NULL DEFAULT now(),
          CHECK (end_time > start_time)
        )
    """)
    
    op.execute("""
        CREATE TRIGGER trg_section_meetings_updated_at
        BEFORE UPDATE ON academics.section_meetings
        FOR EACH ROW EXECUTE FUNCTION common.set_updated_at()
    """)
    
    op.execute("CREATE INDEX idx_section_meetings_section_weekday ON academics.section_meetings(section_id, weekday)")
    
    # Class Sessions
    op.execute("""
        CREATE TABLE academics.class_sessions (
          id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          section_id    uuid NOT NULL REFERENCES academics.sections(id) ON DELETE CASCADE,
          session_date  date NOT NULL,
          start_time    time NOT NULL,
          end_time      time NOT NULL,
          room          text,
          is_canceled   boolean NOT NULL DEFAULT false,
          created_at    timestamptz NOT NULL DEFAULT now(),
          updated_at    timestamptz NOT NULL DEFAULT now(),
          CHECK (end_time > start_time),
          UNIQUE (section_id, session_date, start_time)
        )
    """)
    
    op.execute("""
        CREATE TRIGGER trg_class_sessions_updated_at
        BEFORE UPDATE ON academics.class_sessions
        FOR EACH ROW EXECUTE FUNCTION common.set_updated_at()
    """)
    
    op.execute("CREATE INDEX idx_class_sessions_date_time ON academics.class_sessions(session_date, start_time)")
    
    # Attendance Records
    op.execute("""
        CREATE TABLE academics.attendance_records (
          id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id    uuid NOT NULL REFERENCES academics.class_sessions(id) ON DELETE CASCADE,
          student_id    uuid NOT NULL REFERENCES academics.students(user_id) ON DELETE CASCADE,
          status        academics.attendance_status NOT NULL,
          recorded_at   timestamptz NOT NULL DEFAULT now(),
          created_at    timestamptz NOT NULL DEFAULT now(),
          updated_at    timestamptz NOT NULL DEFAULT now(),
          UNIQUE (session_id, student_id)
        )
    """)
    
    op.execute("""
        CREATE TRIGGER trg_attendance_records_updated_at
        BEFORE UPDATE ON academics.attendance_records
        FOR EACH ROW EXECUTE FUNCTION common.set_updated_at()
    """)
    
    op.execute("CREATE INDEX idx_attendance_student ON academics.attendance_records(student_id)")
    
    # Assessments
    op.execute("""
        CREATE TABLE academics.assessments (
          id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          section_id  uuid NOT NULL REFERENCES academics.sections(id) ON DELETE CASCADE,
          name        text NOT NULL,
          kind        text NOT NULL,
          weight      numeric(6,3) NOT NULL DEFAULT 1,
          max_score   numeric(6,2) NOT NULL DEFAULT 10,
          due_date    date,
          created_at  timestamptz NOT NULL DEFAULT now(),
          updated_at  timestamptz NOT NULL DEFAULT now(),
          CHECK (weight > 0),
          CHECK (max_score > 0)
        )
    """)
    
    op.execute("""
        CREATE TRIGGER trg_assessments_updated_at
        BEFORE UPDATE ON academics.assessments
        FOR EACH ROW EXECUTE FUNCTION common.set_updated_at()
    """)
    
    # Assessment Grades
    op.execute("""
        CREATE TABLE academics.assessment_grades (
          id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          assessment_id uuid NOT NULL REFERENCES academics.assessments(id) ON DELETE CASCADE,
          student_id    uuid NOT NULL REFERENCES academics.students(user_id) ON DELETE CASCADE,
          score         numeric(6,2) NOT NULL CHECK (score >= 0),
          created_at    timestamptz NOT NULL DEFAULT now(),
          updated_at    timestamptz NOT NULL DEFAULT now(),
          UNIQUE (assessment_id, student_id)
        )
    """)
    
    op.execute("""
        CREATE TRIGGER trg_assessment_grades_updated_at
        BEFORE UPDATE ON academics.assessment_grades
        FOR EACH ROW EXECUTE FUNCTION common.set_updated_at()
    """)
    
    # Final Grades
    op.execute("""
        CREATE TABLE academics.final_grades (
          id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          section_id    uuid NOT NULL REFERENCES academics.sections(id) ON DELETE CASCADE,
          student_id    uuid NOT NULL REFERENCES academics.students(user_id) ON DELETE CASCADE,
          final_score   numeric(4,2) CHECK (final_score IS NULL OR (final_score >= 0 AND final_score <= 10)),
          absences_count int NOT NULL DEFAULT 0 CHECK (absences_count >= 0),
          absences_pct  numeric(5,2) NOT NULL DEFAULT 0 CHECK (absences_pct >= 0 AND absences_pct <= 100),
          status        academics.final_status NOT NULL DEFAULT 'IN_PROGRESS',
          calculated_at timestamptz NOT NULL DEFAULT now(),
          created_at    timestamptz NOT NULL DEFAULT now(),
          updated_at    timestamptz NOT NULL DEFAULT now(),
          UNIQUE (section_id, student_id)
        )
    """)
    
    op.execute("""
        CREATE TRIGGER trg_final_grades_updated_at
        BEFORE UPDATE ON academics.final_grades
        FOR EACH ROW EXECUTE FUNCTION common.set_updated_at()
    """)
    
    op.execute("CREATE INDEX idx_final_grades_student ON academics.final_grades(student_id)")
    
    # Create convenience view
    op.execute("""
        CREATE OR REPLACE VIEW academics.v_student_next_class_today AS
        SELECT
          se.student_id,
          cs.session_date,
          cs.start_time,
          cs.end_time,
          s.id              AS section_id,
          subj.name         AS subject,
          COALESCE(cs.room, s.room_default) AS room
        FROM academics.section_enrollments se
        JOIN academics.sections s        ON s.id = se.section_id
        JOIN academics.subjects subj     ON subj.id = s.subject_id
        JOIN academics.class_sessions cs ON cs.section_id = s.id
        WHERE se.status = 'ENROLLED'
          AND cs.session_date = CURRENT_DATE
          AND cs.is_canceled = false
          AND (cs.start_time >= (CURRENT_TIME - INTERVAL '15 minutes')::time)
        ORDER BY cs.start_time ASC
    """)


def downgrade() -> None:
    """Drop academics domain tables."""
    op.execute("DROP VIEW IF EXISTS academics.v_student_next_class_today")
    op.execute("DROP TABLE IF EXISTS academics.final_grades CASCADE")
    op.execute("DROP TABLE IF EXISTS academics.assessment_grades CASCADE")
    op.execute("DROP TABLE IF EXISTS academics.assessments CASCADE")
    op.execute("DROP TABLE IF EXISTS academics.attendance_records CASCADE")
    op.execute("DROP TABLE IF EXISTS academics.class_sessions CASCADE")
    op.execute("DROP TABLE IF EXISTS academics.section_meetings CASCADE")
    op.execute("DROP TABLE IF EXISTS academics.section_enrollments CASCADE")
    op.execute("DROP TABLE IF EXISTS academics.sections CASCADE")
    op.execute("DROP TABLE IF EXISTS academics.students CASCADE")
    op.execute("DROP TABLE IF EXISTS academics.subjects CASCADE")
    op.execute("DROP TABLE IF EXISTS academics.terms CASCADE")
    op.execute("DROP TABLE IF EXISTS academics.courses CASCADE")
    op.execute("DROP TABLE IF EXISTS academics.campuses CASCADE")
    op.execute("DROP TYPE IF EXISTS academics.final_status")
    op.execute("DROP TYPE IF EXISTS academics.attendance_status")
    op.execute("DROP TYPE IF EXISTS academics.enrollment_status")
