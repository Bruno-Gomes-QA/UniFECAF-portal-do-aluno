/**
 * Status do aluno.
 * ACTIVE: Aluno ativo, pode acessar portal
 * LOCKED: Matrícula trancada, acesso bloqueado
 * GRADUATED: Formado, acesso bloqueado (irreversível)
 * DELETED: Soft-delete, acesso bloqueado
 */
export type StudentStatus = "ACTIVE" | "LOCKED" | "GRADUATED" | "DELETED";

export type Student = {
  user_id: string;
  ra: string;
  full_name: string;
  course_id: string;
  admission_term: string | null;
  total_progress: number | string;
  status: StudentStatus;
  graduation_date: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Payload para criar aluno.
 * - ra: opcional (auto-gerado se não informado)
 * - user_id: deve ser usuário STUDENT ativo
 */
export type StudentCreateRequest = {
  user_id: string;
  ra?: string;
  full_name: string;
  course_id: string;
  admission_term?: string | null;
  total_progress?: number | string;
};

/**
 * Payload para atualizar aluno.
 * Não inclui status (usar endpoints específicos: lock, graduate, reactivate).
 * Não inclui user_id nem ra (imutáveis após criação).
 */
export type StudentUpdateRequest = {
  full_name?: string;
  course_id?: string;
  admission_term?: string | null;
  total_progress?: number | string;
};

/** Labels amigáveis para status */
export const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  ACTIVE: "Ativo",
  LOCKED: "Trancado",
  GRADUATED: "Formado",
  DELETED: "Excluído",
};

/** Cores para badges de status */
export const STUDENT_STATUS_COLORS: Record<StudentStatus, string> = {
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  LOCKED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  GRADUATED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  DELETED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};
