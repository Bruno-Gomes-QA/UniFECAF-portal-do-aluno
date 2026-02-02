import { apiBrowser } from '@/lib/api/browser';
import { withQuery } from '@/lib/api/query';
import { API_V1 } from '@/lib/api/routes';
import type { PaginatedResponse } from '@/types/api';
import type { Invoice } from './types';

export type InvoiceCreatePayload = {
  student_id: string;
  term_id?: string | null;
  description: string;
  due_date: string;
  amount: number;
  fine_rate?: number;
  interest_rate?: number;
  installment_number?: number | null;
  installment_total?: number | null;
};

export type InvoiceUpdatePayload = Partial<{
  term_id: string | null;
  description: string;
  due_date: string;
  amount: number;
  fine_rate: number;
  interest_rate: number;
  installment_number: number | null;
  installment_total: number | null;
}>;

// Negotiation types
export type StudentDebtSummary = {
  student_id: string;
  student_name: string;
  student_ra: string;
  pending_invoices: Invoice[];
  total_pending_amount: string;
  total_pending_with_fees: string;
  count_pending: number;
  has_current_term_enrollment: boolean;
};

export type NegotiationInstallment = {
  installment_number: number;
  due_date: string;
  amount: string;
  description: string;
};

export type NegotiationPlanRequest = {
  student_id: string;
  total_amount: number;
  num_installments: number;
  first_due_date: string;
  description_prefix?: string;
  cancel_pending?: boolean;
};

export type NegotiationPlanResponse = {
  student_id: string;
  total_amount: string;
  installment_amount: string;
  num_installments: number;
  installments: NegotiationInstallment[];
  pending_to_cancel: string[];
};

export type NegotiationExecuteRequest = {
  student_id: string;
  term_id?: string | null;
  installments: NegotiationInstallment[];
  cancel_pending_ids?: string[];
  fine_rate?: number;
  interest_rate?: number;
};

export type NegotiationExecuteResponse = {
  student_id: string;
  created_invoices: Invoice[];
  canceled_invoices: string[];
  total_created: number;
  total_canceled: number;
};

export const adminInvoicesApi = {
  list: (params: {
    limit: number;
    offset: number;
    student_id?: string;
    status?: string;
    due_date_from?: string;
    due_date_to?: string;
    search?: string;
  }) => apiBrowser.get<PaginatedResponse<Invoice>>(withQuery(API_V1.admin.invoices, params)),
  create: (payload: InvoiceCreatePayload) =>
    apiBrowser.post<Invoice>(API_V1.admin.invoices, payload),
  update: (id: string, payload: InvoiceUpdatePayload) =>
    apiBrowser.patch<Invoice>(API_V1.admin.invoice(id), payload),
  remove: (id: string) => apiBrowser.delete<void>(API_V1.admin.invoice(id)),
  markPaid: (id: string) =>
    apiBrowser.post<{ invoice_id: string; payment_id: string; status: string; paid_at: string }>(API_V1.admin.markInvoicePaid(id)),
  cancel: (id: string) =>
    apiBrowser.post<Invoice>(`${API_V1.admin.invoice(id)}/cancel`),
  
  // Negotiation endpoints
  getStudentDebtSummary: (studentId: string) =>
    apiBrowser.get<StudentDebtSummary>(`${API_V1.admin.students}/${studentId}/debt-summary`),
  previewNegotiation: (payload: NegotiationPlanRequest) =>
    apiBrowser.post<NegotiationPlanResponse>(`${API_V1.admin.invoices}/negotiation/preview`, payload),
  executeNegotiation: (payload: NegotiationExecuteRequest) =>
    apiBrowser.post<NegotiationExecuteResponse>(`${API_V1.admin.invoices}/negotiation/execute`, payload),
  generateTermInvoices: (params: {
    student_id: string;
    term_id?: string;
    num_installments: number;
    monthly_amount: number;
    first_due_date: string;
  }) => {
    const { student_id, ...queryParams } = params;
    return apiBrowser.post<NegotiationExecuteResponse>(
      withQuery(`${API_V1.admin.students}/${student_id}/generate-term-invoices`, queryParams)
    );
  },
};
