import { apiBrowser } from "@/lib/api/browser";
import { withQuery } from '@/lib/api/query';
import { API_V1 } from "@/lib/api/routes";
import type { PaginatedResponse } from '@/types/api';
import type { Student, StudentCreateRequest, StudentUpdateRequest } from "./types";

export const adminStudentsApi = {
  /** Listar estudantes com filtros */
  list: (params: {
    limit: number;
    offset: number;
    search?: string;
    status?: string;
    course_id?: string;
  }) => apiBrowser.get<PaginatedResponse<Student>>(withQuery(API_V1.admin.students, params)),

  /** Criar perfil de aluno */
  create: (payload: StudentCreateRequest) =>
    apiBrowser.post<Student>(API_V1.admin.students, payload),

  /** Atualizar dados do aluno (exceto status) */
  update: (id: string, payload: StudentUpdateRequest) =>
    apiBrowser.patch<Student>(`${API_V1.admin.students}/${id}`, payload),

  /** Soft-delete: marca como DELETED */
  remove: (id: string) => apiBrowser.delete<void>(`${API_V1.admin.students}/${id}`),

  /** Trancar matrícula: ACTIVE → LOCKED */
  lock: (id: string) => apiBrowser.post<void>(`${API_V1.admin.students}/${id}/lock`, {}),

  /** Marcar como formado: ACTIVE → GRADUATED (irreversível) */
  graduate: (id: string) => apiBrowser.post<void>(`${API_V1.admin.students}/${id}/graduate`, {}),

  /** Reativar: DELETED/LOCKED → ACTIVE */
  reactivate: (id: string) =>
    apiBrowser.post<void>(`${API_V1.admin.students}/${id}/reactivate`, {}),
};
