import { apiBrowser } from '@/lib/api/browser';
import { withQuery } from '@/lib/api/query';
import { API_V1 } from '@/lib/api/routes';
import type { PaginatedResponse } from '@/types/api';
import type { Payment } from './types';

export type PaymentCreatePayload = {
  invoice_id: string;
  amount: number;
  method?: string | null;
  provider?: string | null;
  provider_ref?: string | null;
  paid_at?: string | null;
};

export type PaymentUpdatePayload = Partial<{
  method: string | null;
  provider: string | null;
  provider_ref: string | null;
  paid_at: string | null;
}>;

export type PaymentSummary = {
  total_authorized: string;
  total_settled: string;
  total_failed: string;
  total_refunded: string;
  count_authorized: number;
  count_settled: number;
  count_failed: number;
  count_refunded: number;
};

export const adminPaymentsApi = {
  list: (params: {
    limit: number;
    offset: number;
    invoice_id?: string;
    student_id?: string;
    status?: string;
    search?: string;
  }) => apiBrowser.get<PaginatedResponse<Payment>>(withQuery(API_V1.admin.payments, params)),
  summary: (params?: { student_id?: string }) =>
    apiBrowser.get<PaymentSummary>(withQuery(`${API_V1.admin.payments}/summary`, params || {})),
  create: (payload: PaymentCreatePayload) =>
    apiBrowser.post<Payment>(API_V1.admin.payments, payload),
  update: (id: string, payload: PaymentUpdatePayload) =>
    apiBrowser.patch<Payment>(API_V1.admin.payment(id), payload),
  remove: (id: string) => apiBrowser.delete<void>(API_V1.admin.payment(id)),
  settle: (id: string) =>
    apiBrowser.post<Payment>(`${API_V1.admin.payment(id)}/settle`),
  refund: (id: string) =>
    apiBrowser.post<Payment>(`${API_V1.admin.payment(id)}/refund`),
};
