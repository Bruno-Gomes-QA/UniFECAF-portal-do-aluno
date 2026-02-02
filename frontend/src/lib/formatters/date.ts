const TIME_ZONE = 'America/Sao_Paulo';

export function formatDateBR(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TIME_ZONE }).format(date);
}

export function formatDateTimeBR(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIME_ZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function formatTimeBR(value: string | Date) {
  // Se for uma string de hora pura (HH:mm:ss ou HH:mm), retorna formatada diretamente
  if (typeof value === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) {
    const parts = value.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1]}`;
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatWeekdayBR(value: string | Date | number) {
  // Se for um número (weekday 0-6), retorna o nome do dia
  if (typeof value === 'number') {
    const weekdays = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    return weekdays[value] || '?';
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIME_ZONE,
    weekday: 'short',
  }).format(date);
}

export function formatWeekdayLongBR(value: string | Date | number) {
  // Se for um número (weekday 0-6), retorna o nome completo do dia
  if (typeof value === 'number') {
    const weekdays = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    return weekdays[value] || '?';
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIME_ZONE,
    weekday: 'long',
  }).format(date);
}

