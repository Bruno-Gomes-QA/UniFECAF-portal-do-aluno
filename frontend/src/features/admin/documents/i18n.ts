export type StudentDocumentType = 'DECLARATION' | 'STUDENT_CARD' | 'TRANSCRIPT';
export type StudentDocumentStatus = 'AVAILABLE' | 'GENERATING' | 'ERROR';

export function formatDocumentType(value: string): string {
  if (value === 'DECLARATION') return 'Declaração';
  if (value === 'STUDENT_CARD') return 'Carteirinha';
  if (value === 'TRANSCRIPT') return 'Histórico';
  return value;
}

export function formatDocumentStatus(value: string): string {
  if (value === 'AVAILABLE') return 'Disponível';
  if (value === 'GENERATING') return 'Gerando';
  if (value === 'ERROR') return 'Erro';
  return value;
}

