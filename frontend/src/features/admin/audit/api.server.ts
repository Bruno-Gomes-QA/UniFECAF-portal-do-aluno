import 'server-only';

import { apiServer } from '@/lib/api/server';
import { withQuery } from '@/lib/api/query';
import type { PaginatedResponse } from '@/types/api';
import type { AuditLog, AuditStats } from './types';

type ListParams = {
  limit?: number;
  offset?: number;
  actor_user_id?: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  ip?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
};

export const adminAuditServer = {
  list: (params: ListParams = {}) =>
    apiServer.get<PaginatedResponse<AuditLog>>(withQuery('/api/v1/admin/audit-logs', params), { cache: 'no-store' }),

  getById: (logId: number) =>
    apiServer.get<AuditLog>(`/api/v1/admin/audit-logs/${logId}`, { cache: 'no-store' }),

  stats: (period_days: number = 30) =>
    apiServer.get<AuditStats>(withQuery('/api/v1/admin/audit-logs/stats/summary', { period_days }), { cache: 'no-store' }),

  getActions: () =>
    apiServer.get<string[]>('/api/v1/admin/audit-logs/actions', { cache: 'no-store' }),

  getEntityTypes: () =>
    apiServer.get<string[]>('/api/v1/admin/audit-logs/entity-types', { cache: 'no-store' }),
};
