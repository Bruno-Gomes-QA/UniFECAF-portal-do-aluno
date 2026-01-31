# PR09 — Admin Academics CRUD (catálogo + matrículas + regra 1 aula/dia)

## Objetivo
CRUD completo do domínio acadêmico + validações:
- termos, cursos, disciplinas, turmas
- encontros semanais, aulas por data
- matrículas, presenças
- avaliações e notas
- Regra UniFECAF: aluno não pode ter 2 aulas no mesmo weekday no semestre

---

## Endpoints (ADMIN)

### Terms
- `GET/POST /api/v1/admin/terms`
- `GET/PUT/PATCH/DELETE /api/v1/admin/terms/{term_id}`
- `POST /api/v1/admin/terms/{term_id}/set-current`

### Courses
- `GET/POST /api/v1/admin/courses`
- `GET/PUT/PATCH/DELETE /api/v1/admin/courses/{course_id}`

### Subjects
- `GET/POST /api/v1/admin/subjects`
- `GET/PUT/PATCH/DELETE /api/v1/admin/subjects/{subject_id}`

### Sections
- `GET/POST /api/v1/admin/sections`
- `GET/PUT/PATCH/DELETE /api/v1/admin/sections/{section_id}`

### Meetings (padrão semanal)
- `GET/POST /api/v1/admin/sections/{section_id}/meetings`
- `PUT/PATCH/DELETE /api/v1/admin/meetings/{meeting_id}`

### Sessions (aulas por data)
- `GET/POST /api/v1/admin/sections/{section_id}/sessions`
- `PUT/PATCH/DELETE /api/v1/admin/sessions/{session_id}`
- `POST /api/v1/admin/terms/{term_id}/generate-sessions` (opcional aqui ou PR13)

### Students
- `GET/POST /api/v1/admin/students`
- `GET/PUT/PATCH/DELETE /api/v1/admin/students/{student_id}`

### Enrollments
- `GET/POST /api/v1/admin/enrollments`
- `DELETE /api/v1/admin/enrollments/{enrollment_id}`

### Attendance
- `GET/POST /api/v1/admin/attendance`
- `PUT/PATCH/DELETE /api/v1/admin/attendance/{attendance_id}`

### Assessments + Grades
- `GET/POST /api/v1/admin/assessments`
- `GET/PUT/PATCH/DELETE /api/v1/admin/assessments/{assessment_id}`
- `GET/POST /api/v1/admin/assessment-grades`
- `PUT/PATCH/DELETE /api/v1/admin/assessment-grades/{id}`

### Final Grades
- `GET/POST /api/v1/admin/final-grades`
- `PUT/PATCH/DELETE /api/v1/admin/final-grades/{id}`

---

## Regra UniFECAF (enrollment conflict)
Ao criar matrícula:
1) Descobrir `term_id` da section
2) Obter weekdays da section (meetings)
3) Obter enrollments atuais do aluno no mesmo term e seus weekdays
4) Se intersectar → erro `ACADEMIC_SCHEDULE_CONFLICT`

---

## Critérios de aceite
- Admin consegue montar semestre completo
- Validação impede 2 aulas no mesmo weekday
- Listas paginadas
- Teste smoke de criação (term, course, subject, section, meeting, student, enrollment)
