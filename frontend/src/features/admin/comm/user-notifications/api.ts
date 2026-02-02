import 'server-only';

import { apiServer } from '@/lib/api/server';
import { withQuery } from '@/lib/api/query';
import { API_V1 } from '@/lib/api/routes';
import type { PaginatedResponse } from '@/types/api';
import type { UserNotification } from './types';

type ListParams = {
  limit: number;
  offset: number;
  user_id?: string;
  notification_id?: string;
  unread_only?: boolean;
  search?: string;
};

export const adminUserNotificationsApi = {
  list: (params: ListParams) =>
    apiServer.get<PaginatedResponse<UserNotification>>(withQuery(API_V1.admin.userNotifications, params), { cache: 'no-store' }),
};
