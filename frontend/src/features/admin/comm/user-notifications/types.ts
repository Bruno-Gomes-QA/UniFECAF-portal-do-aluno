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

