'use client';

import { apiBrowser } from '@/lib/api/browser';
import type { AuditLog, AuditStats } from './types';

export const adminAuditApi = {
  getById: (logId: number) =>
    apiBrowser.get<AuditLog>(`/api/v1/admin/audit-logs/${logId}`),
};
