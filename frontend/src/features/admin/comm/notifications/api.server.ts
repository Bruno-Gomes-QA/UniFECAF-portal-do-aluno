import 'server-only';

import { apiServer } from '@/lib/api/server';
import { withQuery } from '@/lib/api/query';
import { API_V1 } from '@/lib/api/routes';
import type { PaginatedResponse } from '@/types/api';
import type { Notification, NotificationStats } from './types';

type ListParams = {
  limit: number;
  offset: number;
  type?: string;
  channel?: string;
  priority?: string;
  is_archived?: boolean;
  search?: string;
};

export const adminNotificationsServer = {
  list: (params: ListParams) =>
    apiServer.get<PaginatedResponse<Notification>>(withQuery(API_V1.admin.notifications, params), { cache: 'no-store' }),
  stats: () =>
    apiServer.get<NotificationStats>(`${API_V1.admin.notifications}/stats`, { cache: 'no-store' }),
};

