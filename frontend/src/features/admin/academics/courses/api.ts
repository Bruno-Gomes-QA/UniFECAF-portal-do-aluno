import { apiBrowser } from '@/lib/api/browser';
import { API_V1 } from '@/lib/api/routes';
import type { PaginatedResponse } from '@/types/api';
import type { Course, CourseCreateRequest, CourseUpdateRequest } from './types';
import type { Subject } from '../subjects/types';

export const adminCoursesApi = {
  create: (payload: CourseCreateRequest) => 
    apiBrowser.post<Course>(API_V1.admin.courses, payload),
  
  update: (id: string, payload: CourseUpdateRequest) =>
    apiBrowser.patch<Course>(`${API_V1.admin.courses}/${id}`, payload),
  
  remove: (id: string) => 
    apiBrowser.delete<void>(`${API_V1.admin.courses}/${id}`),
  
  deactivate: (id: string) =>
    apiBrowser.patch<void>(`${API_V1.admin.courses}/${id}/deactivate`, {}),
  
  activate: (id: string) =>
    apiBrowser.patch<void>(`${API_V1.admin.courses}/${id}/activate`, {}),

  listSubjects: (courseId: string) =>
    apiBrowser.get<PaginatedResponse<Subject>>(
      `${API_V1.admin.courses}/${courseId}/subjects?limit=100`,
    ),
};
