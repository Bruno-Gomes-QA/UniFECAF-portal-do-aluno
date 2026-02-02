export type AuditLog = {
  id: number;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  ip: string | null;
  user_agent: string | null;
  data: Record<string, unknown>;
  created_at: string;
};

export type AuditStats = {
  period_days: number;
  total_logs: number;
  unique_actions: number;
  unique_actors: number;
  login_failures: number;
  top_actions: Array<{ action: string; count: number }>;
  top_actors: Array<{ user_id: string; email: string; count: number }>;
};
