export type StudentDocument = {
  id: string;
  student_id: string;
  student_name: string | null;
  student_ra: string | null;
  doc_type: string;
  status: string;
  title: string | null;
  description: string | null;
  file_url: string | null;
  file_size: number | null;
  file_type: string | null;
  generated_at: string | null;
  requested_at: string | null;
  requested_by: string | null;
  requested_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentStats = {
  total_documents: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  generating_count: number;
  error_count: number;
  recent_requests: number;
};

