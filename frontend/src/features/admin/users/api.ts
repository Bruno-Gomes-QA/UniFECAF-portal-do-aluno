import { apiBrowser } from '@/lib/api/browser';
import { API_V1 } from '@/lib/api/routes';
import type { AdminUser, AdminUserCreateRequest, AdminUserUpdateRequest } from './types';

export const adminUsersApi = {
  create: (payload: AdminUserCreateRequest) =>
    apiBrowser.post<AdminUser>(API_V1.admin.users, payload),
  update: (id: string, payload: AdminUserUpdateRequest) =>
    apiBrowser.patch<AdminUser>(`${API_V1.admin.users}/${id}`, payload),
  remove: (id: string) => apiBrowser.delete<void>(`${API_V1.admin.users}/${id}`),
};
