#!/usr/bin/env python3
"""
UniFECAF Portal do Aluno - Seed Data Script
Gera dados realistas seguindo as regras definidas em docs/SEED_RULES.md

Uso:
    python seed_data.py          # Executa seed (idempotente)
    python seed_data.py --reset  # Limpa dados do seed antes de recriar
"""

import argparse
import os
import random
import re
import sys
import unicodedata
from datetime import date, datetime, time, timedelta
from decimal import Decimal

import bcrypt
from faker import Faker
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

# =============================================================================
# CONFIGURAÇÕES NO TOPO DO SCRIPT (editáveis conforme SEED_RULES)
# =============================================================================

# Escala
TOTAL_STUDENTS = 300

# Distribuição por curso (ADM > ADS > CDC)
COURSE_DISTRIBUTION = {
    "ADM": 0.45,  # 135 alunos
    "ADS": 0.35,  # 105 alunos
    "CDC": 0.20,  # 60 alunos
}

# Turmas (seções) por curso por semestre
CLASSES_PER_COURSE_PER_TERM = {
    "ADM": 5,  # A..E
    "ADS": 4,  # A..D
    "CDC": 3,  # A..C
}
SECTION_CAPACITY = 35

# Semestres (5 fixos - do SEED_RULES)
TERMS = [
    {"code": "2024-1", "start": date(2024, 2, 1), "end": date(2024, 6, 30), "is_current": False},
    {"code": "2024-2", "start": date(2024, 8, 1), "end": date(2024, 12, 20), "is_current": False},
    {"code": "2025-1", "start": date(2025, 2, 1), "end": date(2025, 6, 30), "is_current": False},
    {"code": "2025-2", "start": date(2025, 8, 1), "end": date(2025, 12, 20), "is_current": False},
    {"code": "2026-1", "start": date(2026, 2, 2), "end": date(2026, 6, 30), "is_current": True},
]

# Semestre curricular base por curso no primeiro term (2024-1)
COURSE_BASE_TERM_NUMBER = {
    "ADS": 1,
    "CDC": 3,
    "ADM": 2,
}

# Cursos com mensalidades
COURSES = [
    {
        "code": "ADS",
        "name": "Análise e Desenvolvimento de Sistemas",
        "degree_type": "TECNOLOGO",
        "duration_terms": 5,
        "monthly_fee": Decimal("499.90"),
    },
    {
        "code": "CDC",
        "name": "Ciência da Computação",
        "degree_type": "BACHARELADO",
        "duration_terms": 8,
        "monthly_fee": Decimal("699.90"),
    },
    {
        "code": "ADM",
        "name": "Administração",
        "degree_type": "BACHARELADO",
        "duration_terms": 8,
        "monthly_fee": Decimal("459.90"),
    },
]

# Disciplinas REAIS por curso por term (5 por semestre)
# term_number = semestre curricular
REAL_SUBJECTS = {
    "ADS": {
        1: [
            "Lógica de Programação",
            "Fundamentos de Sistemas de Informação",
            "Matemática para Computação",
            "Comunicação e Expressão",
            "Arquitetura de Computadores",
        ],
        2: [
            "Estruturas de Dados",
            "Programação Orientada a Objetos",
            "Banco de Dados I",
            "Engenharia de Software I",
            "Redes de Computadores",
        ],
        3: [
            "Desenvolvimento Web",
            "Banco de Dados II",
            "Engenharia de Software II",
            "Sistemas Operacionais",
            "Projeto Integrador I",
        ],
        4: [
            "Desenvolvimento Mobile",
            "Desenvolvimento Web Fullstack",
            "Gestão de Projetos de TI",
            "Segurança da Informação",
            "Projeto Integrador II",
        ],
        5: [
            "Computação em Nuvem",
            "Inteligência Artificial",
            "DevOps e Infraestrutura",
            "Empreendedorismo Digital",
            "Trabalho de Conclusão de Curso",
        ],
    },
    "CDC": {
        3: [
            "Cálculo Diferencial e Integral II",
            "Álgebra Linear",
            "Estruturas de Dados Avançadas",
            "Teoria da Computação",
            "Programação Funcional",
        ],
        4: [
            "Cálculo Numérico",
            "Probabilidade e Estatística",
            "Sistemas Operacionais",
            "Compiladores",
            "Redes de Computadores",
        ],
        5: [
            "Inteligência Artificial",
            "Computação Gráfica",
            "Banco de Dados Avançado",
            "Engenharia de Software",
            "Projeto de Pesquisa I",
        ],
        6: [
            "Aprendizado de Máquina",
            "Sistemas Distribuídos",
            "Segurança Computacional",
            "Processamento de Imagens",
            "Projeto de Pesquisa II",
        ],
        7: [
            "Deep Learning",
            "Big Data e Analytics",
            "Internet das Coisas",
            "Computação Quântica",
            "Trabalho de Conclusão I",
        ],
    },
    "ADM": {
        2: [
            "Teoria Geral da Administração",
            "Contabilidade Básica",
            "Matemática Financeira",
            "Comunicação Empresarial",
            "Sociologia Organizacional",
        ],
        3: [
            "Gestão de Pessoas",
            "Contabilidade Gerencial",
            "Microeconomia",
            "Estatística Aplicada",
            "Direito Empresarial",
        ],
        4: [
            "Marketing",
            "Gestão Financeira",
            "Macroeconomia",
            "Gestão de Operações",
            "Comportamento Organizacional",
        ],
        5: [
            "Marketing Digital",
            "Gestão de Custos",
            "Administração Estratégica",
            "Logística e Supply Chain",
            "Projeto Integrador I",
        ],
        6: [
            "Gestão de Projetos",
            "Mercado de Capitais",
            "Negócios Internacionais",
            "Empreendedorismo",
            "Projeto Integrador II",
        ],
    },
}

# Financeiro
INVOICES_PER_TERM = 6
DUE_DAYS = [5, 10, 20, 25]

# % de alunos inadimplentes (devendo Nov/Dez 2025)
DELINQUENT_PERCENT = 0.06  # 6%

# Notificações por aluno
NOTIFICATIONS_PER_STUDENT = 3

# Random seed para reprodutibilidade
SEED = 20260201

# RA inicial (sequencial)
RA_START = 108775

# Admins (fixos)
ADMINS = [
    {"email": "bruno.gomes@fecaf.com.br", "is_superadmin": True},
    {"email": "ellen.santos@fecaf.com.br", "is_superadmin": False},
    {"email": "eloa.lisboa@fecaf.com.br", "is_superadmin": False},
    {"email": "alan.marcon@fecaf.com.br", "is_superadmin": False},
    {"email": "thiago.lopez@fecaf.com.br", "is_superadmin": False},
    {"email": "osvaldo.silva@fecaf.com.br", "is_superadmin": False},
]

# Horários das aulas
CLASS_START_TIME = time(19, 10)
CLASS_END_TIME = time(22, 0)

# Ambiente por dia da semana (1=Segunda até 5=Sexta)
ROOM_BY_WEEKDAY = {
    1: "LAB 13 - PRINCIPAL",
    2: "LAB 13 - PRINCIPAL",
    3: "REMOTO - GOOGLE MEET",
    4: "EAD/AVA",
    5: "LAB 13 - PRINCIPAL",
}

# Tipos de avaliação por disciplina (3 por disciplina)
ASSESSMENT_TYPES = [
    {"name": "Prova N1", "kind": "PROVA", "weight": Decimal("0.400")},
    {"name": "Prova N2", "kind": "PROVA", "weight": Decimal("0.400")},
    {"name": "Trabalho Integrador", "kind": "TRABALHO", "weight": Decimal("0.200")},
]

# =============================================================================
# FUNÇÕES AUXILIARES
# =============================================================================

fake = Faker("pt_BR")
Faker.seed(SEED)
random.seed(SEED)


def normalize_name(name: str) -> str:
    """Normaliza nome para uso em email (remove acentos, lowercase, substitui espaços)."""
    nfkd = unicodedata.normalize("NFKD", name)
    ascii_name = "".join(c for c in nfkd if not unicodedata.combining(c))
    ascii_name = ascii_name.lower()
    ascii_name = ascii_name.replace(" ", ".")
    ascii_name = re.sub(r"[^a-z0-9.]", "", ascii_name)
    while ".." in ascii_name:
        ascii_name = ascii_name.replace("..", ".")
    ascii_name = ascii_name.strip(".")
    return ascii_name


def generate_password_hash(password: str) -> str:
    """Gera hash bcrypt da senha."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def get_admin_password(email: str) -> str:
    """Gera senha para admin: <nome>123@"""
    name = email.split("@")[0].split(".")[0]
    return f"{name}123@"


def get_student_password(first_name: str, ra: str) -> str:
    """Gera senha para aluno: <nome>@<ra>"""
    normalized = normalize_name(first_name)
    return f"{normalized}@{ra}"


def generate_invoice_reference(student_ra: str, term_code: str, installment: int) -> str:
    """Gera referência única para fatura."""
    return f"{student_ra}-{term_code}-{installment:02d}"


def get_term_months(term_code: str) -> list[tuple[int, int]]:
    """Retorna lista de (ano, mês) para o semestre."""
    year = int(term_code[:4])
    semester = int(term_code[-1])
    if semester == 1:
        return [(year, m) for m in range(1, 7)]
    else:
        return [(year, m) for m in range(7, 13)]


def get_weekdays_in_range(start_date: date, end_date: date, weekday: int) -> list[date]:
    """Retorna todas as datas de um dia da semana específico no intervalo."""
    dates = []
    current = start_date
    # Ajustar para o primeiro dia da semana desejado
    while current.isoweekday() != weekday:
        current += timedelta(days=1)
    while current <= end_date:
        dates.append(current)
        current += timedelta(days=7)
    return dates


# =============================================================================
# FUNÇÕES DE SEED
# =============================================================================


def seed_admins(session: Session) -> dict[str, str]:
    """Cria usuários admin. Retorna dict email -> user_id."""
    print("  → Criando admins...")
    admin_ids = {}

    for admin in ADMINS:
        email = admin["email"]
        password = get_admin_password(email)
        password_hash = generate_password_hash(password)

        result = session.execute(
            text("""
                INSERT INTO auth.users (email, password_hash, role, status, is_superadmin)
                VALUES (:email, :password_hash, 'ADMIN'::auth.user_role, 'ACTIVE'::auth.user_status, :is_superadmin)
                ON CONFLICT (email) DO UPDATE SET
                    password_hash = EXCLUDED.password_hash,
                    role = EXCLUDED.role,
                    status = EXCLUDED.status,
                    is_superadmin = EXCLUDED.is_superadmin
                RETURNING id
            """),
            {
                "email": email,
                "password_hash": password_hash,
                "is_superadmin": admin["is_superadmin"],
            },
        )
        user_id = str(result.fetchone()[0])
        admin_ids[email] = user_id

    print(f"    ✓ {len(admin_ids)} admins criados/atualizados")
    return admin_ids


def seed_courses(session: Session) -> dict[str, dict]:
    """Cria cursos. Retorna dict code -> {id, monthly_fee, ...}."""
    print("  → Criando cursos...")
    course_data = {}

    for course in COURSES:
        result = session.execute(
            text("""
                INSERT INTO academics.courses (code, name, degree_type, duration_terms, is_active)
                VALUES (:code, :name, CAST(:degree_type AS academics.degree_type), :duration_terms, true)
                ON CONFLICT (code) DO UPDATE SET
                    name = EXCLUDED.name,
                    degree_type = EXCLUDED.degree_type,
                    duration_terms = EXCLUDED.duration_terms,
                    is_active = EXCLUDED.is_active
                RETURNING id
            """),
            {
                "code": course["code"],
                "name": course["name"],
                "degree_type": course["degree_type"],
                "duration_terms": course["duration_terms"],
            },
        )
        course_id = str(result.fetchone()[0])
        course_data[course["code"]] = {
            "id": course_id,
            "monthly_fee": course["monthly_fee"],
            "duration_terms": course["duration_terms"],
            "name": course["name"],
        }

    print(f"    ✓ {len(course_data)} cursos criados/atualizados")
    return course_data


def seed_terms(session: Session) -> dict[str, str]:
    """Cria termos/semestres. Retorna dict code -> term_id."""
    print("  → Criando semestres...")
    term_ids = {}

    session.execute(text("UPDATE academics.terms SET is_current = false WHERE is_current = true"))

    for term in TERMS:
        result = session.execute(
            text("""
                INSERT INTO academics.terms (code, start_date, end_date, is_current)
                VALUES (:code, :start_date, :end_date, :is_current)
                ON CONFLICT (code) DO UPDATE SET
                    start_date = EXCLUDED.start_date,
                    end_date = EXCLUDED.end_date,
                    is_current = EXCLUDED.is_current
                RETURNING id
            """),
            {
                "code": term["code"],
                "start_date": term["start"],
                "end_date": term["end"],
                "is_current": term["is_current"],
            },
        )
        term_id = str(result.fetchone()[0])
        term_ids[term["code"]] = term_id

    print(f"    ✓ {len(term_ids)} semestres criados/atualizados")
    return term_ids


def seed_subjects(session: Session, course_data: dict) -> dict[tuple[str, int], list[dict]]:
    """Cria disciplinas. Retorna dict (course_code, term_number) -> [subject_data]."""
    print("  → Criando disciplinas...")
    subjects_by_course_term = {}
    total = 0

    for course_code, terms_subjects in REAL_SUBJECTS.items():
        course_id = course_data[course_code]["id"]

        for term_number, subject_names in terms_subjects.items():
            subjects_list = []
            for idx, name in enumerate(subject_names):
                code = f"{course_code}-{term_number:02d}-{idx + 1:02d}"

                result = session.execute(
                    text("""
                        INSERT INTO academics.subjects (course_id, code, name, credits, term_number, is_active)
                        VALUES (:course_id, :code, :name, 4, :term_number, true)
                        ON CONFLICT (course_id, code) DO UPDATE SET
                            name = EXCLUDED.name,
                            credits = EXCLUDED.credits,
                            term_number = EXCLUDED.term_number,
                            is_active = EXCLUDED.is_active
                        RETURNING id
                    """),
                    {
                        "course_id": course_id,
                        "code": code,
                        "name": name,
                        "term_number": term_number,
                    },
                )
                subject_id = str(result.fetchone()[0])
                subjects_list.append({"id": subject_id, "code": code, "name": name})
                total += 1

            subjects_by_course_term[(course_code, term_number)] = subjects_list

    print(f"    ✓ {total} disciplinas criadas/atualizadas")
    return subjects_by_course_term


def seed_sections_and_meetings(
    session: Session,
    course_data: dict,
    term_ids: dict[str, str],
    subjects_by_course_term: dict,
) -> dict[tuple[str, str, str], list[dict]]:
    """
    Cria seções (turmas) e meetings (horários) para TODOS os terms.
    Retorna dict (course_code, term_code, letter) -> [section_data]
    """
    print("  → Criando turmas e horários...")
    sections_data = {}
    total_sections = 0
    total_meetings = 0

    for term_idx, term in enumerate(TERMS):
        term_code = term["code"]
        term_id = term_ids[term_code]

        for course in COURSES:
            course_code = course["code"]
            num_classes = CLASSES_PER_COURSE_PER_TERM[course_code]
            base_term_number = COURSE_BASE_TERM_NUMBER[course_code]
            current_term_number = base_term_number + term_idx

            # Buscar disciplinas para este term_number
            key = (course_code, current_term_number)
            if key not in subjects_by_course_term:
                # Se não houver disciplinas definidas, pula este course/term
                continue

            subjects = subjects_by_course_term[key]

            # Criar turmas A, B, C, etc
            for letter_idx in range(num_classes):
                letter = chr(ord("A") + letter_idx)
                section_code = f"{course_code}-{current_term_number}{letter}"
                sections_list = []

                for subj_idx, subject in enumerate(subjects):
                    # Dia da semana: 1-5 (seg-sex) baseado no índice da disciplina
                    weekday = (subj_idx % 5) + 1
                    room = ROOM_BY_WEEKDAY[weekday]

                    result = session.execute(
                        text("""
                            INSERT INTO academics.sections (term_id, subject_id, code, room_default, capacity)
                            VALUES (:term_id, :subject_id, :code, :room, :capacity)
                            ON CONFLICT (term_id, subject_id, code) DO UPDATE SET
                                room_default = EXCLUDED.room_default,
                                capacity = EXCLUDED.capacity
                            RETURNING id
                        """),
                        {
                            "term_id": term_id,
                            "subject_id": subject["id"],
                            "code": section_code,
                            "room": room,
                            "capacity": SECTION_CAPACITY,
                        },
                    )
                    section_id = str(result.fetchone()[0])
                    total_sections += 1

                    # Criar meeting (horário semanal)
                    session.execute(
                        text("""
                            INSERT INTO academics.section_meetings (section_id, weekday, start_time, end_time, room)
                            VALUES (:section_id, :weekday, :start_time, :end_time, :room)
                            ON CONFLICT DO NOTHING
                        """),
                        {
                            "section_id": section_id,
                            "weekday": weekday,
                            "start_time": CLASS_START_TIME,
                            "end_time": CLASS_END_TIME,
                            "room": room,
                        },
                    )
                    total_meetings += 1

                    sections_list.append(
                        {
                            "id": section_id,
                            "subject_id": subject["id"],
                            "subject_name": subject["name"],
                            "weekday": weekday,
                            "room": room,
                            "term_start": term["start"],
                            "term_end": term["end"],
                        }
                    )

                sections_data[(course_code, term_code, letter)] = sections_list

    print(f"    ✓ {total_sections} turmas criadas/atualizadas")
    print(f"    ✓ {total_meetings} horários criados")
    return sections_data


def seed_class_sessions(
    session: Session,
    sections_data: dict,
    term_ids: dict[str, str],
) -> dict[str, list[str]]:
    """
    Cria class_sessions (aulas concretas) para TODAS as turmas de TODOS os semestres.
    Para semestres passados: todas as aulas
    Para semestre atual: aulas até hoje + próximas 2 semanas
    
    Retorna dict section_id -> [session_ids]
    """
    print("  → Criando sessões de aula (class_sessions)...")
    
    today = date.today()
    total_sessions = 0
    section_sessions = {}  # section_id -> [session_ids]

    for key, sections in sections_data.items():
        course_code, term_code, letter = key
        
        # Encontrar o term correspondente
        term_data = next((t for t in TERMS if t["code"] == term_code), None)
        if not term_data:
            continue
        
        is_current = term_data["is_current"]
        term_start = term_data["start"]
        term_end = term_data["end"]
        
        # Para semestre atual: limitar até 2 semanas no futuro
        if is_current:
            effective_end = min(term_end, today + timedelta(days=14))
        else:
            effective_end = term_end
        
        for section in sections:
            section_id = section["id"]
            weekday = section["weekday"]
            room = section["room"]
            
            # Obter todas as datas de aula
            class_dates = get_weekdays_in_range(term_start, effective_end, weekday)
            
            session_ids = []
            for class_date in class_dates:
                result = session.execute(
                    text("""
                        INSERT INTO academics.class_sessions (section_id, session_date, start_time, end_time, room, is_canceled)
                        VALUES (:section_id, :session_date, :start_time, :end_time, :room, false)
                        ON CONFLICT (section_id, session_date, start_time) DO UPDATE SET
                            room = EXCLUDED.room,
                            is_canceled = EXCLUDED.is_canceled
                        RETURNING id
                    """),
                    {
                        "section_id": section_id,
                        "session_date": class_date,
                        "start_time": CLASS_START_TIME,
                        "end_time": CLASS_END_TIME,
                        "room": room,
                    },
                )
                session_id = str(result.fetchone()[0])
                session_ids.append(session_id)
                total_sessions += 1
            
            section_sessions[section_id] = session_ids

    print(f"    ✓ {total_sessions} sessões de aula criadas")
    return section_sessions


def seed_students(
    session: Session,
    course_data: dict,
    term_ids: dict[str, str],
) -> list[dict]:
    """Cria alunos. Retorna lista de student_data."""
    print("  → Criando alunos...")
    students = []

    course_counts = {
        code: int(TOTAL_STUDENTS * pct) for code, pct in COURSE_DISTRIBUTION.items()
    }
    diff = TOTAL_STUDENTS - sum(course_counts.values())
    if diff > 0:
        course_counts["ADM"] += diff

    result = session.execute(
        text("SELECT MAX(CAST(ra AS INTEGER)) FROM academics.students WHERE ra ~ '^[0-9]+$'")
    )
    max_ra = result.scalar()
    next_ra = max(RA_START, (max_ra or 0) + 1)

    first_term_id = term_ids[TERMS[0]["code"]]

    used_emails = set()
    student_idx = 0

    for course_code, count in course_counts.items():
        course_id = course_data[course_code]["id"]

        for _ in range(count):
            full_name = fake.name()
            first_name = full_name.split()[0]
            last_name = full_name.split()[-1] if len(full_name.split()) > 1 else ""

            ra = str(next_ra)
            next_ra += 1

            base_email = f"{normalize_name(first_name)}.{normalize_name(last_name)}.{ra}@a.fecaf.com.br"
            email = base_email
            counter = 1
            while email in used_emails:
                email = f"{normalize_name(first_name)}.{normalize_name(last_name)}{counter}.{ra}@a.fecaf.com.br"
                counter += 1
            used_emails.add(email)

            password = get_student_password(first_name, ra)
            password_hash = generate_password_hash(password)

            total_progress = Decimal(str(random.randint(35, 90)))
            status = "ACTIVE"

            result = session.execute(
                text("""
                    INSERT INTO auth.users (email, password_hash, role, status, is_superadmin)
                    VALUES (:email, :password_hash, 'STUDENT'::auth.user_role, 'ACTIVE'::auth.user_status, false)
                    ON CONFLICT (email) DO UPDATE SET
                        password_hash = EXCLUDED.password_hash,
                        role = EXCLUDED.role,
                        status = EXCLUDED.status
                    RETURNING id
                """),
                {"email": email, "password_hash": password_hash},
            )
            user_id = str(result.fetchone()[0])

            session.execute(
                text("""
                    INSERT INTO academics.students (user_id, ra, full_name, course_id, admission_term, total_progress, status)
                    VALUES (:user_id, :ra, :full_name, :course_id, :admission_term, :total_progress, CAST(:status AS academics.student_status))
                    ON CONFLICT (ra) DO UPDATE SET
                        full_name = EXCLUDED.full_name,
                        course_id = EXCLUDED.course_id,
                        admission_term = EXCLUDED.admission_term,
                        total_progress = EXCLUDED.total_progress,
                        status = EXCLUDED.status
                """),
                {
                    "user_id": user_id,
                    "ra": ra,
                    "full_name": full_name,
                    "course_id": course_id,
                    "admission_term": first_term_id,
                    "total_progress": total_progress,
                    "status": status,
                },
            )

            students.append(
                {
                    "user_id": user_id,
                    "ra": ra,
                    "full_name": full_name,
                    "first_name": first_name,
                    "email": email,
                    "course_code": course_code,
                    "course_id": course_id,
                    "status": status,
                    "idx": student_idx,
                }
            )
            student_idx += 1

    print(f"    ✓ {len(students)} alunos criados/atualizados")
    return students


def assign_student_sections(
    students: list[dict],
    sections_data: dict,
    term_ids: dict[str, str],
) -> dict[str, dict]:
    """Atribui seções (turmas) para cada aluno por term. Retorna student_sections."""
    student_sections = {}

    for student in students:
        course_code = student["course_code"]
        num_classes = CLASSES_PER_COURSE_PER_TERM[course_code]

        letter_idx = student["idx"] % num_classes
        letter = chr(ord("A") + letter_idx)

        student_sections[student["user_id"]] = {
            "letter": letter,
            "course_code": course_code,
        }

    return student_sections


def seed_enrollments_and_grades(
    session: Session,
    students: list[dict],
    sections_data: dict,
    term_ids: dict[str, str],
    student_sections: dict,
) -> None:
    """Cria matrículas e notas finais para todos os alunos em todos os semestres."""
    print("  → Criando matrículas e notas finais...")
    total_enrollments = 0
    total_grades = 0

    current_term_code = next(t["code"] for t in TERMS if t["is_current"])

    for student in students:
        user_id = student["user_id"]
        course_code = student["course_code"]
        letter = student_sections[user_id]["letter"]

        for term_idx, term in enumerate(TERMS):
            term_code = term["code"]
            is_current = term["is_current"]

            key = (course_code, term_code, letter)
            if key not in sections_data:
                continue

            sections = sections_data[key]

            for section in sections:
                section_id = section["id"]

                if is_current:
                    enrollment_status = "ENROLLED"
                else:
                    enrollment_status = "COMPLETED"

                session.execute(
                    text("""
                        INSERT INTO academics.section_enrollments (student_id, section_id, status)
                        VALUES (:student_id, :section_id, CAST(:status AS academics.enrollment_status))
                        ON CONFLICT (student_id, section_id) DO UPDATE SET status = EXCLUDED.status
                    """),
                    {
                        "student_id": user_id,
                        "section_id": section_id,
                        "status": enrollment_status,
                    },
                )
                total_enrollments += 1

                # Notas finais
                if is_current:
                    # Term atual: IN_PROGRESS, sem nota final ainda
                    final_score = None
                    absences_pct = Decimal(str(random.randint(0, 15)))
                    grade_status = "IN_PROGRESS"
                else:
                    # Terms passados: APPROVED ou FAILED
                    final_score = Decimal(str(round(random.uniform(4.0, 10.0), 2)))
                    absences_pct = Decimal(str(random.randint(0, 30)))

                    # 85% aprovados
                    if random.random() < 0.85:
                        final_score = max(final_score, Decimal("6.0"))
                        absences_pct = min(absences_pct, Decimal("25"))
                        grade_status = "APPROVED"
                    else:
                        if random.random() < 0.5:
                            final_score = Decimal(str(round(random.uniform(0, 5.9), 2)))
                        else:
                            absences_pct = Decimal(str(random.randint(26, 40)))
                        grade_status = "FAILED"

                session.execute(
                    text("""
                        INSERT INTO academics.final_grades (section_id, student_id, final_score, absences_pct, status)
                        VALUES (:section_id, :student_id, :final_score, :absences_pct, CAST(:status AS academics.final_status))
                        ON CONFLICT (section_id, student_id) DO UPDATE SET
                            final_score = EXCLUDED.final_score,
                            absences_pct = EXCLUDED.absences_pct,
                            status = EXCLUDED.status
                    """),
                    {
                        "section_id": section_id,
                        "student_id": user_id,
                        "final_score": final_score,
                        "absences_pct": absences_pct,
                        "status": grade_status,
                    },
                )
                total_grades += 1

    print(f"    ✓ {total_enrollments} matrículas criadas/atualizadas")
    print(f"    ✓ {total_grades} notas finais criadas/atualizadas")


def seed_assessments(
    session: Session,
    sections_data: dict,
    term_ids: dict[str, str],
) -> dict[str, list[dict]]:
    """
    Cria avaliações (assessments) para cada section.
    Semestres passados: todas avaliações no passado
    Semestre atual: 2 avaliações passadas, 1 futura
    
    Retorna dict section_id -> [assessment_data]
    """
    print("  → Criando avaliações...")
    
    today = date.today()
    total_assessments = 0
    section_assessments = {}  # section_id -> [assessment_data]

    for key, sections in sections_data.items():
        course_code, term_code, letter = key
        
        term_data = next((t for t in TERMS if t["code"] == term_code), None)
        if not term_data:
            continue
        
        is_current = term_data["is_current"]
        term_start = term_data["start"]
        term_end = term_data["end"]

        for section in sections:
            section_id = section["id"]
            assessments_list = []
            
            for idx, assessment_type in enumerate(ASSESSMENT_TYPES):
                # Calcular due_date da avaliação
                if is_current:
                    if idx == 0:
                        # N1: já passou (início do semestre + 6 semanas)
                        due_date = term_start + timedelta(weeks=6)
                    elif idx == 1:
                        # N2: próxima (início + 12 semanas ou hoje + 2 semanas)
                        due_date = term_start + timedelta(weeks=12)
                        if due_date < today:
                            due_date = today + timedelta(weeks=2)
                    else:
                        # Trabalho: final do semestre
                        due_date = term_end - timedelta(weeks=2)
                else:
                    # Semestres passados: distribuir ao longo do semestre
                    term_duration = (term_end - term_start).days
                    offset = int(term_duration * (idx + 1) / (len(ASSESSMENT_TYPES) + 1))
                    due_date = term_start + timedelta(days=offset)
                
                result = session.execute(
                    text("""
                        INSERT INTO academics.assessments (section_id, name, kind, weight, max_score, due_date)
                        VALUES (:section_id, :name, :kind, :weight, 10.00, :due_date)
                        ON CONFLICT DO NOTHING
                        RETURNING id
                    """),
                    {
                        "section_id": section_id,
                        "name": assessment_type["name"],
                        "kind": assessment_type["kind"],
                        "weight": assessment_type["weight"],
                        "due_date": due_date,
                    },
                )
                row = result.fetchone()
                if row:
                    assessment_id = str(row[0])
                else:
                    # Já existe, buscar
                    result = session.execute(
                        text("""
                            SELECT id FROM academics.assessments 
                            WHERE section_id = :section_id AND name = :name
                        """),
                        {"section_id": section_id, "name": assessment_type["name"]},
                    )
                    row = result.fetchone()
                    if row:
                        assessment_id = str(row[0])
                    else:
                        continue
                
                assessments_list.append({
                    "id": assessment_id,
                    "name": assessment_type["name"],
                    "kind": assessment_type["kind"],
                    "weight": assessment_type["weight"],
                    "due_date": due_date,
                    "is_past": due_date < today,
                })
                total_assessments += 1
            
            section_assessments[section_id] = assessments_list

    print(f"    ✓ {total_assessments} avaliações criadas")
    return section_assessments


def seed_assessment_grades(
    session: Session,
    students: list[dict],
    sections_data: dict,
    student_sections: dict,
    section_assessments: dict,
) -> None:
    """
    Cria notas de avaliações para os alunos.
    Avaliações passadas: todos têm nota
    Avaliações futuras: ninguém tem nota ainda
    """
    print("  → Criando notas de avaliações...")
    
    today = date.today()
    total_grades = 0

    for student in students:
        user_id = student["user_id"]
        course_code = student["course_code"]
        letter = student_sections[user_id]["letter"]

        for term in TERMS:
            term_code = term["code"]
            
            key = (course_code, term_code, letter)
            if key not in sections_data:
                continue

            sections = sections_data[key]

            for section in sections:
                section_id = section["id"]
                
                if section_id not in section_assessments:
                    continue
                
                assessments = section_assessments[section_id]
                
                for assessment in assessments:
                    # Só criar nota se a avaliação já passou
                    if not assessment["is_past"]:
                        continue
                    
                    # Gerar nota entre 3.0 e 10.0 (maioria passa)
                    if random.random() < 0.85:
                        score = Decimal(str(round(random.uniform(6.0, 10.0), 2)))
                    else:
                        score = Decimal(str(round(random.uniform(3.0, 5.9), 2)))
                    
                    session.execute(
                        text("""
                            INSERT INTO academics.assessment_grades (assessment_id, student_id, score)
                            VALUES (:assessment_id, :student_id, :score)
                            ON CONFLICT (assessment_id, student_id) DO UPDATE SET score = EXCLUDED.score
                        """),
                        {
                            "assessment_id": assessment["id"],
                            "student_id": user_id,
                            "score": score,
                        },
                    )
                    total_grades += 1

    print(f"    ✓ {total_grades} notas de avaliações criadas")


def seed_attendance(
    session: Session,
    students: list[dict],
    sections_data: dict,
    student_sections: dict,
    section_sessions: dict[str, list[str]],
) -> None:
    """
    Cria registros de presença para aulas passadas.
    85% presença, 10% falta, 5% justificado
    """
    print("  → Criando registros de presença...")
    
    today = date.today()
    total_records = 0

    for student in students:
        user_id = student["user_id"]
        course_code = student["course_code"]
        letter = student_sections[user_id]["letter"]

        for term in TERMS:
            term_code = term["code"]
            
            key = (course_code, term_code, letter)
            if key not in sections_data:
                continue

            sections = sections_data[key]

            for section in sections:
                section_id = section["id"]
                
                if section_id not in section_sessions:
                    continue
                
                # Buscar sessões passadas desta seção
                result = session.execute(
                    text("""
                        SELECT id, session_date FROM academics.class_sessions
                        WHERE section_id = :section_id AND session_date < :today AND is_canceled = false
                        ORDER BY session_date
                    """),
                    {"section_id": section_id, "today": today},
                )
                sessions_data = result.fetchall()
                
                for session_row in sessions_data:
                    session_id = str(session_row[0])
                    
                    # Determinar status de presença
                    r = random.random()
                    if r < 0.85:
                        status = "PRESENT"
                    elif r < 0.95:
                        status = "ABSENT"
                    else:
                        status = "EXCUSED"
                    
                    session.execute(
                        text("""
                            INSERT INTO academics.attendance_records (session_id, student_id, status)
                            VALUES (:session_id, :student_id, CAST(:status AS academics.attendance_status))
                            ON CONFLICT (session_id, student_id) DO UPDATE SET status = EXCLUDED.status
                        """),
                        {
                            "session_id": session_id,
                            "student_id": user_id,
                            "status": status,
                        },
                    )
                    total_records += 1

    print(f"    ✓ {total_records} registros de presença criados")


def seed_invoices_and_payments(
    session: Session,
    students: list[dict],
    course_data: dict,
    term_ids: dict[str, str],
) -> list[str]:
    """
    Cria faturas e pagamentos com regra correta de inadimplência:
    - Alunos em dia: tudo pago até dez/2025, boletos de jan/2026 em diante gerados e pendentes
    - Alunos inadimplentes (6%): devendo nov/dez 2025, SEM boletos de 2026 (não fez rematrícula)
    
    Retorna lista de user_ids de alunos inadimplentes.
    """
    print("  → Criando faturas e pagamentos...")
    total_invoices = 0
    total_payments = 0

    today = date.today()
    
    # Selecionar alunos inadimplentes
    num_delinquent = int(len(students) * DELINQUENT_PERCENT)
    shuffled_students = students.copy()
    random.shuffle(shuffled_students)
    delinquent_user_ids = {s["user_id"] for s in shuffled_students[:num_delinquent]}

    for student in students:
        user_id = student["user_id"]
        ra = student["ra"]
        course_code = student["course_code"]
        monthly_fee = course_data[course_code]["monthly_fee"]
        is_delinquent = user_id in delinquent_user_ids

        due_day = random.choice(DUE_DAYS)

        for term in TERMS:
            term_code = term["code"]
            term_id = term_ids[term_code]
            is_current = term["is_current"]
            term_year = int(term_code[:4])
            term_semester = int(term_code[-1])

            # Para inadimplentes: não gerar boletos de 2026 (não fez rematrícula)
            if is_delinquent and term_year >= 2026:
                continue

            months = get_term_months(term_code)

            for installment, (year, month) in enumerate(months, 1):
                due_date = date(year, month, due_day)
                reference = generate_invoice_reference(ra, term_code, installment)

                # Determinar status da fatura
                if is_delinquent:
                    # Inadimplente: devendo nov/dez 2025
                    if year == 2025 and month >= 11:
                        invoice_status = "OVERDUE"
                    else:
                        # Meses anteriores: pagos
                        invoice_status = "PAID"
                else:
                    # Aluno em dia
                    if is_current:
                        if due_date > today:
                            # Boleto futuro do semestre atual: PENDING
                            invoice_status = "PENDING"
                        else:
                            # Boleto passado do semestre atual: 95% PAID, 5% ainda pendente (atraso curto)
                            if random.random() < 0.95:
                                invoice_status = "PAID"
                            else:
                                invoice_status = "PENDING"
                    else:
                        # Semestres passados: 100% PAID
                        invoice_status = "PAID"

                # Criar invoice
                session.execute(
                    text("""
                        INSERT INTO finance.invoices (
                            reference, student_id, term_id, description, due_date, amount,
                            installment_number, installment_total, status
                        )
                        VALUES (
                            :reference, :student_id, :term_id, 'Mensalidade', :due_date, :amount,
                            :installment_number, :installment_total, CAST(:status AS finance.invoice_status)
                        )
                        ON CONFLICT (reference) DO UPDATE SET
                            due_date = EXCLUDED.due_date,
                            amount = EXCLUDED.amount,
                            status = EXCLUDED.status
                        RETURNING id
                    """),
                    {
                        "reference": reference,
                        "student_id": user_id,
                        "term_id": term_id,
                        "due_date": due_date,
                        "amount": monthly_fee,
                        "installment_number": installment,
                        "installment_total": INVOICES_PER_TERM,
                        "status": invoice_status,
                    },
                )
                result = session.execute(
                    text("SELECT id FROM finance.invoices WHERE reference = :reference"),
                    {"reference": reference},
                )
                invoice_id = str(result.fetchone()[0])
                total_invoices += 1

                # Criar payment se PAID
                if invoice_status == "PAID":
                    days_before = random.randint(0, 5)
                    paid_at = datetime.combine(due_date - timedelta(days=days_before), time(10, 0))
                    # Não pagar no futuro
                    if paid_at.date() > today:
                        paid_at = datetime.combine(today - timedelta(days=random.randint(1, 5)), time(10, 0))

                    session.execute(
                        text("""
                            INSERT INTO finance.payments (invoice_id, amount, status, method, paid_at)
                            SELECT :invoice_id, :amount, 'SETTLED'::finance.payment_status, 'PIX', :paid_at
                            WHERE NOT EXISTS (
                                SELECT 1 FROM finance.payments WHERE invoice_id = :invoice_id AND status = 'SETTLED'
                            )
                        """),
                        {
                            "invoice_id": invoice_id,
                            "amount": monthly_fee,
                            "paid_at": paid_at,
                        },
                    )
                    total_payments += 1

    print(f"    ✓ {total_invoices} faturas criadas/atualizadas")
    print(f"    ✓ {total_payments} pagamentos criados")
    print(f"    ✓ {num_delinquent} alunos marcados como inadimplentes")
    
    return list(delinquent_user_ids)


def seed_locked_students(
    session: Session,
    students: list[dict],
    term_ids: dict[str, str],
    delinquent_user_ids: list[str],
) -> None:
    """
    Aplica bloqueios nos alunos inadimplentes.
    Metade: status LOCKED no student
    Metade: status LOCKED nas matrículas
    """
    print("  → Aplicando bloqueios de rematrícula...")

    current_term_code = next(t["code"] for t in TERMS if t["is_current"])
    
    if not delinquent_user_ids:
        print("    ⚠ Nenhum aluno inadimplente para bloquear")
        return

    # Dividir inadimplentes em dois grupos
    half = len(delinquent_user_ids) // 2
    mode_a_ids = delinquent_user_ids[:half]  # Status LOCKED no student
    mode_b_ids = delinquent_user_ids[half:]  # Status LOCKED nas matrículas

    # Modo A: travar aluno
    for user_id in mode_a_ids:
        session.execute(
            text("""
                UPDATE academics.students SET status = 'LOCKED'::academics.student_status
                WHERE user_id = :user_id
            """),
            {"user_id": user_id},
        )

    # Modo B: travar matrículas do term atual (se houver - inadimplentes não têm matrículas em 2026)
    # Então vamos travar as últimas matrículas que eles tinham (2025-2)
    prev_term_code = "2025-2"
    for user_id in mode_b_ids:
        session.execute(
            text("""
                UPDATE academics.section_enrollments SET status = 'LOCKED'::academics.enrollment_status
                WHERE student_id = :student_id AND section_id IN (
                    SELECT id FROM academics.sections WHERE term_id = :term_id
                )
            """),
            {"student_id": user_id, "term_id": term_ids[prev_term_code]},
        )

    print(f"    ✓ {len(mode_a_ids)} alunos com status LOCKED (Modo A)")
    print(f"    ✓ {len(mode_b_ids)} alunos com matrículas LOCKED (Modo B)")


def seed_notifications(session: Session, students: list[dict]) -> None:
    """Cria notificações para cada aluno."""
    print("  → Criando notificações...")

    templates = [
        {
            "type": "FINANCIAL",
            "priority": "NORMAL",
            "title": "Mensalidade próxima do vencimento",
            "body": "Sua mensalidade vence em breve. Evite juros e multas pagando até a data de vencimento.",
        },
        {
            "type": "FINANCIAL",
            "priority": "HIGH",
            "title": "Pendência financeira",
            "body": "Você possui pendências financeiras que podem afetar sua rematrícula. Regularize sua situação.",
        },
        {
            "type": "ACADEMIC",
            "priority": "NORMAL",
            "title": "Bem-vindo ao semestre 2026-1",
            "body": "As aulas do semestre 2026-1 já começaram! Confira sua grade de horários e bons estudos.",
        },
        {
            "type": "ACADEMIC",
            "priority": "LOW",
            "title": "Avaliação disponível",
            "body": "Uma nova avaliação foi publicada em uma de suas disciplinas. Confira o calendário de provas.",
        },
        {
            "type": "ADMIN",
            "priority": "NORMAL",
            "title": "Atualização cadastral",
            "body": "Mantenha seus dados cadastrais atualizados para receber comunicados importantes.",
        },
    ]

    notification_ids = []
    for template in templates:
        result = session.execute(
            text("""
                INSERT INTO comm.notifications (type, channel, priority, title, body)
                VALUES (CAST(:type AS comm.notification_type), 'IN_APP'::comm.notification_channel, CAST(:priority AS comm.notification_priority), :title, :body)
                ON CONFLICT DO NOTHING
                RETURNING id
            """),
            template,
        )
        row = result.fetchone()
        if row:
            notification_ids.append(str(row[0]))
        else:
            result = session.execute(
                text("SELECT id FROM comm.notifications WHERE title = :title LIMIT 1"),
                {"title": template["title"]},
            )
            row = result.fetchone()
            if row:
                notification_ids.append(str(row[0]))

    total_user_notifications = 0

    for student in students:
        user_id = student["user_id"]
        selected = random.sample(notification_ids, min(NOTIFICATIONS_PER_STUDENT, len(notification_ids)))

        for notif_id in selected:
            read_at = datetime.now() if random.random() < 0.6 else None

            session.execute(
                text("""
                    INSERT INTO comm.user_notifications (user_id, notification_id, read_at)
                    VALUES (:user_id, :notification_id, :read_at)
                    ON CONFLICT (user_id, notification_id) DO UPDATE SET read_at = EXCLUDED.read_at
                """),
                {
                    "user_id": user_id,
                    "notification_id": notif_id,
                    "read_at": read_at,
                },
            )
            total_user_notifications += 1

    print(f"    ✓ {len(templates)} templates de notificação")
    print(f"    ✓ {total_user_notifications} notificações entregues")


def seed_documents(session: Session, students: list[dict]) -> None:
    """Cria documentos para cada aluno."""
    print("  → Criando documentos...")

    doc_types = [
        ("DECLARATION", "Declaração de Matrícula"),
        ("STUDENT_CARD", "Carteirinha Digital"),
        ("TRANSCRIPT", "Histórico Escolar"),
    ]

    total = 0
    for student in students:
        user_id = student["user_id"]
        ra = student["ra"]

        for doc_type, title in doc_types:
            file_url = f"https://files.local/demo/{ra}/{doc_type.lower()}.pdf"

            session.execute(
                text("""
                    INSERT INTO documents.student_documents (student_id, doc_type, status, title, file_url, generated_at)
                    VALUES (:student_id, CAST(:doc_type AS documents.document_type), 'AVAILABLE'::documents.document_status, :title, :file_url, NOW())
                    ON CONFLICT (student_id, doc_type) DO UPDATE SET
                        status = EXCLUDED.status,
                        title = EXCLUDED.title,
                        file_url = EXCLUDED.file_url,
                        generated_at = EXCLUDED.generated_at
                """),
                {
                    "student_id": user_id,
                    "doc_type": doc_type,
                    "title": title,
                    "file_url": file_url,
                },
            )
            total += 1

    print(f"    ✓ {total} documentos criados/atualizados")


def run_validations(session: Session) -> None:
    """Roda validações pós-seed."""
    print("\n📊 Validações pós-seed:")

    validations = [
        ("students", "SELECT COUNT(*) FROM academics.students"),
        ("courses", "SELECT COUNT(*) FROM academics.courses"),
        ("terms", "SELECT COUNT(*) FROM academics.terms"),
        ("subjects", "SELECT COUNT(*) FROM academics.subjects"),
        ("sections", "SELECT COUNT(*) FROM academics.sections"),
        ("enrollments", "SELECT COUNT(*) FROM academics.section_enrollments"),
        ("final_grades", "SELECT COUNT(*) FROM academics.final_grades"),
        ("assessments", "SELECT COUNT(*) FROM academics.assessments"),
        ("assessment_grades", "SELECT COUNT(*) FROM academics.assessment_grades"),
        ("class_sessions", "SELECT COUNT(*) FROM academics.class_sessions"),
        ("attendance_records", "SELECT COUNT(*) FROM academics.attendance_records"),
        ("invoices", "SELECT COUNT(*) FROM finance.invoices"),
        ("payments", "SELECT COUNT(*) FROM finance.payments"),
        ("notifications", "SELECT COUNT(*) FROM comm.notifications"),
        ("user_notifications", "SELECT COUNT(*) FROM comm.user_notifications"),
        ("documents", "SELECT COUNT(*) FROM documents.student_documents"),
    ]

    for name, query in validations:
        result = session.execute(text(query))
        count = result.scalar()
        print(f"  {name}: {count}")

    print("\n✅ Verificações:")

    # Apenas 1 term is_current
    result = session.execute(text("SELECT COUNT(*) FROM academics.terms WHERE is_current = true"))
    current_terms = result.scalar()
    status = "✓" if current_terms == 1 else "✗"
    print(f"  {status} Apenas 1 term is_current: {current_terms}")

    # Nenhum invoice PAID sem payment
    result = session.execute(
        text("""
            SELECT COUNT(*) FROM finance.invoices i
            WHERE i.status = 'PAID'
            AND NOT EXISTS (SELECT 1 FROM finance.payments p WHERE p.invoice_id = i.id AND p.status = 'SETTLED')
        """)
    )
    orphan_paid = result.scalar()
    status = "✓" if orphan_paid == 0 else "✗"
    print(f"  {status} Invoices PAID sem payment: {orphan_paid}")

    # Verificar inadimplentes
    result = session.execute(
        text("""
            SELECT COUNT(DISTINCT student_id) FROM finance.invoices
            WHERE status = 'OVERDUE'
        """)
    )
    overdue_students = result.scalar()
    print(f"  ℹ Alunos com faturas OVERDUE: {overdue_students}")

    # Alunos LOCKED
    result = session.execute(
        text("SELECT COUNT(*) FROM academics.students WHERE status = 'LOCKED'")
    )
    locked_students = result.scalar()
    print(f"  ℹ Alunos com status LOCKED: {locked_students}")

    # Sessões por semestre
    result = session.execute(
        text("""
            SELECT t.code, COUNT(cs.id) 
            FROM academics.terms t
            LEFT JOIN academics.sections s ON s.term_id = t.id
            LEFT JOIN academics.class_sessions cs ON cs.section_id = s.id
            GROUP BY t.code
            ORDER BY t.code
        """)
    )
    print("  ℹ Sessões por semestre:")
    for row in result.fetchall():
        print(f"      {row[0]}: {row[1]} aulas")


def reset_seed_data(session: Session) -> None:
    """Remove dados criados pelo seed."""
    print("\n🗑️  Removendo dados do seed...")

    session.execute(text("DELETE FROM documents.student_documents WHERE student_id IN (SELECT user_id FROM academics.students)"))
    session.execute(text("DELETE FROM comm.user_notifications WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@a.fecaf.com.br' OR email LIKE '%@fecaf.com.br')"))
    session.execute(text("DELETE FROM comm.notification_preferences WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@a.fecaf.com.br' OR email LIKE '%@fecaf.com.br')"))
    session.execute(text("DELETE FROM finance.payments WHERE invoice_id IN (SELECT id FROM finance.invoices)"))
    session.execute(text("DELETE FROM finance.invoices WHERE student_id IN (SELECT user_id FROM academics.students)"))
    session.execute(text("DELETE FROM academics.final_grades"))
    session.execute(text("DELETE FROM academics.attendance_records"))
    session.execute(text("DELETE FROM academics.assessment_grades"))
    session.execute(text("DELETE FROM academics.assessments"))
    session.execute(text("DELETE FROM academics.class_sessions"))
    session.execute(text("DELETE FROM academics.section_enrollments"))
    session.execute(text("DELETE FROM academics.section_meetings"))
    session.execute(text("DELETE FROM academics.sections"))
    session.execute(text("DELETE FROM academics.subjects"))
    session.execute(text("DELETE FROM academics.students"))
    session.execute(text("DELETE FROM academics.terms"))
    session.execute(text("DELETE FROM academics.courses"))
    session.execute(text("DELETE FROM comm.notifications"))
    session.execute(text("DELETE FROM auth.users WHERE email LIKE '%@a.fecaf.com.br' OR email LIKE '%@fecaf.com.br'"))

    print("  ✓ Dados removidos")


def main():
    parser = argparse.ArgumentParser(description="UniFECAF Portal - Seed Data Script")
    parser.add_argument("--reset", action="store_true", help="Remove dados do seed antes de recriar")
    args = parser.parse_args()

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL não definida")
        sys.exit(1)

    print(f"\n🌱 UniFECAF Portal - Seed Data Script")
    print(f"   Database: {database_url.split('@')[-1] if '@' in database_url else 'local'}")
    print(f"   Total de alunos: {TOTAL_STUDENTS}")
    print(f"   Random seed: {SEED}")

    engine = create_engine(database_url)

    with Session(engine) as session:
        try:
            if args.reset:
                reset_seed_data(session)
                session.commit()

            print("\n📝 Iniciando seed...")

            # 1. Admins
            admin_ids = seed_admins(session)

            # 2. Cursos
            course_data = seed_courses(session)

            # 3. Semestres
            term_ids = seed_terms(session)

            # 4. Disciplinas
            subjects_by_course_term = seed_subjects(session, course_data)

            # 5. Seções e Meetings
            sections_data = seed_sections_and_meetings(
                session, course_data, term_ids, subjects_by_course_term
            )

            # 6. Class Sessions (aulas concretas) - PARA TODOS OS SEMESTRES
            section_sessions = seed_class_sessions(session, sections_data, term_ids)

            # 7. Alunos
            students = seed_students(session, course_data, term_ids)

            # 8. Atribuir seções aos alunos
            student_sections = assign_student_sections(students, sections_data, term_ids)

            # 9. Matrículas e Notas Finais
            seed_enrollments_and_grades(
                session, students, sections_data, term_ids, student_sections
            )

            # 10. Avaliações
            section_assessments = seed_assessments(session, sections_data, term_ids)

            # 11. Notas de Avaliações
            seed_assessment_grades(
                session, students, sections_data, student_sections, section_assessments
            )

            # 12. Presenças
            seed_attendance(
                session, students, sections_data, student_sections, section_sessions
            )

            # 13. Faturas e Pagamentos (retorna inadimplentes)
            delinquent_user_ids = seed_invoices_and_payments(session, students, course_data, term_ids)

            # 14. Bloqueios (usando lista de inadimplentes)
            seed_locked_students(session, students, term_ids, delinquent_user_ids)

            # 15. Notificações
            seed_notifications(session, students)

            # 16. Documentos
            seed_documents(session, students)

            # Commit
            session.commit()

            # 17. Validações
            run_validations(session)

            print("\n✅ Seed concluído com sucesso!")

        except Exception as e:
            session.rollback()
            print(f"\n❌ Erro durante o seed: {e}")
            raise


if __name__ == "__main__":
    main()
