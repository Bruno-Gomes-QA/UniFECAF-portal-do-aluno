import { apiBrowser } from '@/lib/api/browser';
import { API_V1 } from '@/lib/api/routes';
import type { ClassSession } from './types';

export const adminSessionsApi = {
  createForSection: (
    sectionId: string,
    payload: {
      session_date: string;
      start_time: string;
      end_time: string;
      room?: string | null;
      is_canceled?: boolean;
    }
  ) => apiBrowser.post<ClassSession>(API_V1.admin.sectionSessions(sectionId), payload),
  update: (sessionId: string, payload: Partial<Omit<ClassSession, 'id' | 'section_id' | 'created_at' | 'updated_at'>>) =>
    apiBrowser.patch<ClassSession>(API_V1.admin.session(sessionId), payload),
  remove: (sessionId: string) => apiBrowser.delete<void>(API_V1.admin.session(sessionId)),
};
