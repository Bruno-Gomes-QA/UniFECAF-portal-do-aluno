import { apiBrowser } from '@/lib/api/browser';
import { API_V1 } from '@/lib/api/routes';
import type { Enrollment } from './types';

export const adminEnrollmentsApi = {
  create: (payload: { student_id: string; section_id: string; status: string }) =>
    apiBrowser.post<Enrollment>(API_V1.admin.enrollments, payload),
  remove: (id: string) => apiBrowser.delete<void>(API_V1.admin.enrollment(id)),
  updateStatus: (id: string, status: string) =>
    apiBrowser.patch<Enrollment>(API_V1.admin.enrollment(id), { status }),
};
