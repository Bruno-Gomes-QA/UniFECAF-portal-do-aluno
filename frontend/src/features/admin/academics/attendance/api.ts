import { apiBrowser } from '@/lib/api/browser';
import { API_V1 } from '@/lib/api/routes';
import type { Attendance } from './types';

export const adminAttendanceApi = {
  create: (payload: { session_id: string; student_id: string; status: string }) =>
    apiBrowser.post<Attendance>(API_V1.admin.attendance, payload),
  update: (id: string, payload: { status: string }) =>
    apiBrowser.patch<Attendance>(API_V1.admin.attendanceItem(id), payload),
  remove: (id: string) => apiBrowser.delete<void>(API_V1.admin.attendanceItem(id)),
};
