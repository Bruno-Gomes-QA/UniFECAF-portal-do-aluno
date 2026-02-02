export type Payment = {
  id: string;
  invoice_id: string;
  invoice_reference: string | null;
  student_name: string | null;
  student_ra: string | null;
  amount: number | string;
  status: string;
  method: string | null;
  provider: string | null;
  provider_ref: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

