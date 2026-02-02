export type NotificationType = 'ACADEMIC' | 'FINANCIAL' | 'ADMIN';
export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS';
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH';

export function formatNotificationType(value: string): string {
  if (value === 'ACADEMIC') return 'Acadêmico';
  if (value === 'FINANCIAL') return 'Financeiro';
  if (value === 'ADMIN') return 'Administrativo';
  return value;
}

export function formatNotificationChannel(value: string): string {
  if (value === 'IN_APP') return 'No app';
  if (value === 'EMAIL') return 'Email';
  if (value === 'SMS') return 'SMS';
  return value;
}

export function formatNotificationPriority(value: string): string {
  if (value === 'LOW') return 'Baixa';
  if (value === 'NORMAL') return 'Normal';
  if (value === 'HIGH') return 'Alta';
  return value;
}

