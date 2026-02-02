// ==================== Status Types ====================
export type EnrollmentStatus = 'ENROLLED' | 'LOCKED' | 'DROPPED' | 'COMPLETED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED';
export type FinalGradeStatus = 'IN_PROGRESS' | 'APPROVED' | 'FAILED';
export type AssessmentKind = 'EXAM' | 'ASSIGNMENT' | 'PROJECT' | 'QUIZ' | 'PRESENTATION' | 'PARTICIPATION';

// ==================== Status Formatters ====================
export function formatEnrollmentStatus(status: string): string {
  const map: Record<string, string> = {
    ENROLLED: 'Matriculado',
    LOCKED: 'Trancado',
    DROPPED: 'Cancelado',
    COMPLETED: 'Concluído',
  };
  return map[status] || status;
}

export function formatAttendanceStatus(status: string): string {
  const map: Record<string, string> = {
    PRESENT: 'Presente',
    ABSENT: 'Ausente',
    EXCUSED: 'Justificado',
  };
  return map[status] || status;
}

export function formatFinalGradeStatus(status: string): string {
  const map: Record<string, string> = {
    IN_PROGRESS: 'Em andamento',
    APPROVED: 'Aprovado',
    FAILED: 'Reprovado',
  };
  return map[status] || status;
}

export function formatAssessmentKind(kind: string): string {
  const map: Record<string, string> = {
    EXAM: 'Prova',
    ASSIGNMENT: 'Trabalho',
    PROJECT: 'Projeto',
    QUIZ: 'Quiz',
    PRESENTATION: 'Apresentação',
    PARTICIPATION: 'Participação',
  };
  return map[kind] || kind;
}

// ==================== Weekday Formatters ====================
export function formatWeekday(day: number): string {
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return days[day] || `Dia ${day}`;
}

export function formatWeekdayShort(day: number): string {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return days[day] || `D${day}`;
}

// ==================== Options for Selects ====================
export const enrollmentStatusOptions = [
  { value: 'ENROLLED', label: 'Matriculado' },
  { value: 'LOCKED', label: 'Trancado' },
  { value: 'DROPPED', label: 'Cancelado' },
  { value: 'COMPLETED', label: 'Concluído' },
];

export const attendanceStatusOptions = [
  { value: 'PRESENT', label: 'Presente' },
  { value: 'ABSENT', label: 'Ausente' },
  { value: 'EXCUSED', label: 'Justificado' },
];

export const finalGradeStatusOptions = [
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'APPROVED', label: 'Aprovado' },
  { value: 'FAILED', label: 'Reprovado' },
];

export const assessmentKindOptions = [
  { value: 'EXAM', label: 'Prova' },
  { value: 'ASSIGNMENT', label: 'Trabalho' },
  { value: 'PROJECT', label: 'Projeto' },
  { value: 'QUIZ', label: 'Quiz' },
  { value: 'PRESENTATION', label: 'Apresentação' },
  { value: 'PARTICIPATION', label: 'Participação' },
];

export const weekdayOptions = [
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Segunda-feira' },
  { value: '2', label: 'Terça-feira' },
  { value: '3', label: 'Quarta-feira' },
  { value: '4', label: 'Quinta-feira' },
  { value: '5', label: 'Sexta-feira' },
  { value: '6', label: 'Sábado' },
];

