export type Notification = {
  id: string;
  type: string;
  channel: string;
  priority: string;
  title: string | null;
  body: string;
  is_archived: boolean;
  delivered_count: number;
  read_count: number;
  created_at: string;
};

export type UserNotification = {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  notification_id: string;
  notification_title: string | null;
  delivered_at: string;
  read_at: string | null;
  archived_at: string | null;
  action_url: string | null;
  action_label: string | null;
};

export type NotificationStats = {
  total_notifications: number;
  active_notifications: number;
  archived_notifications: number;
  total_deliveries: number;
  total_reads: number;
  read_rate: number;
  by_type: Record<string, number>;
  by_channel: Record<string, number>;
  by_priority: Record<string, number>;
};

