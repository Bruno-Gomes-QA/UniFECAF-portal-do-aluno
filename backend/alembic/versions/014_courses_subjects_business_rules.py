"""
014 - Courses and Subjects Business Rules.

This migration adds:
- DegreeType enum for courses
- code column to courses (unique, required)
- is_active column to courses (soft-delete)
- term_number column to subjects (curriculum organization)
- Proper constraints for credits and duration_terms
- Case-insensitive unique index on course name

Revision ID: 014_courses_subjects
Revises: 013_student_business_rules
"""

from alembic import op

revision = "014_courses_subjects"
down_revision = "013_student_business_rules"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add business rules for courses and subjects."""

    # 1. Create DegreeType enum
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE academics.degree_type AS ENUM (
                'TECNOLOGO', 'BACHARELADO', 'LICENCIATURA', 'TECNICO', 'POS_GRADUACAO'
            );
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    """)

    # 2. Add columns to courses
    op.execute("""
        ALTER TABLE academics.courses 
        ADD COLUMN IF NOT EXISTS code VARCHAR(10),
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
    """)

    # 3. Update existing courses with generated codes (based on name)
    op.execute("""
        UPDATE academics.courses 
        SET code = UPPER(
            REGEXP_REPLACE(
                SUBSTRING(name FROM 1 FOR 3),
                '[^A-Za-z0-9]',
                '',
                'g'
            )
        )
        WHERE code IS NULL;
    """)

    # Handle duplicates by appending a number
    op.execute("""
        WITH duplicates AS (
            SELECT id, code, 
                   ROW_NUMBER() OVER (PARTITION BY code ORDER BY created_at) as rn
            FROM academics.courses
        )
        UPDATE academics.courses c
        SET code = c.code || d.rn::text
        FROM duplicates d
        WHERE c.id = d.id AND d.rn > 1;
    """)

    # 4. Make code NOT NULL after populating
    op.execute("""
        ALTER TABLE academics.courses 
        ALTER COLUMN code SET NOT NULL;
    """)

    # 5. Create unique index on code
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_courses_code 
        ON academics.courses (code);
    """)

    # 6. Add unique constraint on name (case-insensitive)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_courses_name_lower 
        ON academics.courses (LOWER(name));
    """)

    # 7. Add temporary column for new degree_type, migrate data, then swap
    op.execute("""
        ALTER TABLE academics.courses 
        ADD COLUMN IF NOT EXISTS degree_type_new academics.degree_type;
    """)

    # Map existing text values to enum (handle NULL and various formats)
    op.execute("""
        UPDATE academics.courses 
        SET degree_type_new = CASE 
            WHEN LOWER(degree_type) LIKE '%tecnol%' THEN 'TECNOLOGO'::academics.degree_type
            WHEN LOWER(degree_type) LIKE '%bacharel%' THEN 'BACHARELADO'::academics.degree_type
            WHEN LOWER(degree_type) LIKE '%licenciatura%' THEN 'LICENCIATURA'::academics.degree_type
            WHEN LOWER(degree_type) LIKE '%tecnico%' OR LOWER(degree_type) LIKE '%técnico%' THEN 'TECNICO'::academics.degree_type
            WHEN LOWER(degree_type) LIKE '%pós%' OR LOWER(degree_type) LIKE '%pos%' THEN 'POS_GRADUACAO'::academics.degree_type
            ELSE 'TECNOLOGO'::academics.degree_type
        END;
    """)

    # Drop old column and rename new one
    op.execute("""
        ALTER TABLE academics.courses DROP COLUMN IF EXISTS degree_type;
        ALTER TABLE academics.courses RENAME COLUMN degree_type_new TO degree_type;
        ALTER TABLE academics.courses ALTER COLUMN degree_type SET NOT NULL;
    """)

    # 8. Make duration_terms NOT NULL with default
    op.execute("""
        UPDATE academics.courses SET duration_terms = 5 WHERE duration_terms IS NULL;
        ALTER TABLE academics.courses ALTER COLUMN duration_terms SET NOT NULL;
    """)

    # 9. Add constraint on duration_terms
    op.execute("""
        ALTER TABLE academics.courses 
        DROP CONSTRAINT IF EXISTS ck_courses_duration;
        ALTER TABLE academics.courses 
        ADD CONSTRAINT ck_courses_duration CHECK (duration_terms >= 1 AND duration_terms <= 20);
    """)

    # 10. Add term_number to subjects
    op.execute("""
        ALTER TABLE academics.subjects 
        ADD COLUMN IF NOT EXISTS term_number SMALLINT;
    """)

    # 11. Make credits NOT NULL with default and add constraint
    op.execute("""
        UPDATE academics.subjects SET credits = 4 WHERE credits IS NULL;
        ALTER TABLE academics.subjects ALTER COLUMN credits SET NOT NULL;
        ALTER TABLE academics.subjects ALTER COLUMN credits SET DEFAULT 4;
        ALTER TABLE academics.subjects 
        DROP CONSTRAINT IF EXISTS ck_subjects_credits;
        ALTER TABLE academics.subjects 
        ADD CONSTRAINT ck_subjects_credits CHECK (credits >= 1 AND credits <= 20);
    """)


def downgrade() -> None:
    """Remove business rules from courses and subjects."""
    # Remove subjects constraints
    op.execute("ALTER TABLE academics.subjects DROP CONSTRAINT IF EXISTS ck_subjects_credits;")
    op.execute("ALTER TABLE academics.subjects ALTER COLUMN credits DROP NOT NULL;")
    op.execute("ALTER TABLE academics.subjects ALTER COLUMN credits DROP DEFAULT;")
    op.execute("ALTER TABLE academics.subjects DROP COLUMN IF EXISTS term_number;")

    # Remove courses constraints and columns
    op.execute("ALTER TABLE academics.courses DROP CONSTRAINT IF EXISTS ck_courses_duration;")
    op.execute("ALTER TABLE academics.courses ALTER COLUMN duration_terms DROP NOT NULL;")
    op.execute("DROP INDEX IF EXISTS academics.uq_courses_name_lower;")
    op.execute("DROP INDEX IF EXISTS academics.uq_courses_code;")
    op.execute("ALTER TABLE academics.courses DROP COLUMN IF EXISTS is_active;")
    op.execute("ALTER TABLE academics.courses DROP COLUMN IF EXISTS code;")

    # Convert degree_type back to text (complex, create temp column)
    op.execute("""
        ALTER TABLE academics.courses 
        ADD COLUMN IF NOT EXISTS degree_type_text VARCHAR(50);
    """)
    op.execute("""
        UPDATE academics.courses 
        SET degree_type_text = CASE degree_type
            WHEN 'TECNOLOGO' THEN 'Tecnólogo'
            WHEN 'BACHARELADO' THEN 'Bacharelado'
            WHEN 'LICENCIATURA' THEN 'Licenciatura'
            WHEN 'TECNICO' THEN 'Técnico'
            WHEN 'POS_GRADUACAO' THEN 'Pós-Graduação'
            ELSE 'Tecnólogo'
        END;
    """)
    op.execute("""
        ALTER TABLE academics.courses DROP COLUMN IF EXISTS degree_type;
        ALTER TABLE academics.courses RENAME COLUMN degree_type_text TO degree_type;
    """)

    # Drop enum (only if not used)
    op.execute("DROP TYPE IF EXISTS academics.degree_type;")
