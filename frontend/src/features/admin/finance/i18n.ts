export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELED';
export type PaymentStatus = 'AUTHORIZED' | 'SETTLED' | 'FAILED' | 'REFUNDED';

export function formatInvoiceStatus(status: string): string {
  if (status === 'PENDING') return 'Pendente';
  if (status === 'PAID') return 'Paga';
  if (status === 'OVERDUE') return 'Em atraso';
  if (status === 'CANCELED') return 'Cancelada';
  return status;
}

export function formatPaymentStatus(status: string): string {
  if (status === 'AUTHORIZED') return 'Autorizado';
  if (status === 'SETTLED') return 'Liquidado';
  if (status === 'FAILED') return 'Falhou';
  if (status === 'REFUNDED') return 'Estornado';
  return status;
}

