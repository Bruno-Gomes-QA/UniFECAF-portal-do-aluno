export type Invoice = {
  id: string;
  reference: string;
  student_id: string;
  student_name: string | null;
  student_ra: string | null;
  term_id: string | null;
  term_code: string | null;
  description: string;
  due_date: string;
  amount: number | string;
  fine_rate: number | string;
  interest_rate: number | string;
  amount_due: number | string;
  installment_number: number | null;
  installment_total: number | null;
  status: string;
  payments_count: number;
  created_at: string;
  updated_at: string;
};

export type InvoiceSummary = {
  total_pending: number | string;
  total_overdue: number | string;
  total_paid: number | string;
  total_canceled: number | string;
  count_pending: number;
  count_overdue: number;
  count_paid: number;
  count_canceled: number;
};

