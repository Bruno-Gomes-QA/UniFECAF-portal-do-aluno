import { apiBrowser } from '@/lib/api/browser';
import { API_V1 } from '@/lib/api/routes';
import type { Notification, NotificationStats } from './types';

export const adminNotificationsApi = {
  create: (payload: { type: string; channel: string; priority: string; title?: string | null; body: string }) =>
    apiBrowser.post<Notification>(API_V1.admin.notifications, payload),
  update: (id: string, payload: Partial<{ type: string; channel: string; priority: string; title: string | null; body: string; is_archived: boolean }>) =>
    apiBrowser.patch<Notification>(API_V1.admin.notification(id), payload),
  remove: (id: string) => apiBrowser.delete<void>(API_V1.admin.notification(id)),
  deliver: (id: string, payload: { all_students: boolean; user_ids: string[] }) =>
    apiBrowser.post<{ notification_id: string; delivered: number; skipped_existing: number }>(API_V1.admin.deliverNotification(id), payload),
  archive: (id: string) =>
    apiBrowser.post<Notification>(`${API_V1.admin.notification(id)}/archive`, {}),
  unarchive: (id: string) =>
    apiBrowser.post<Notification>(`${API_V1.admin.notification(id)}/unarchive`, {}),
  stats: () =>
    apiBrowser.get<NotificationStats>(`${API_V1.admin.notifications}/stats`),
};
