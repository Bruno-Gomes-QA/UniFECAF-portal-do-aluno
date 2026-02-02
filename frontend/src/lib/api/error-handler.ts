import { toast } from 'sonner';

import { ApiClientError } from '@/lib/api/errors';

export function handleApiError(error: unknown, fallbackMessage = 'Ocorreu um erro inesperado.') {
  if (error instanceof ApiClientError) {
    toast.error(error.message || fallbackMessage);
    return error.message || fallbackMessage;
  }

  if (error instanceof Error) {
    toast.error(error.message || fallbackMessage);
    return error.message || fallbackMessage;
  }

  toast.error(fallbackMessage);
  return fallbackMessage;
}
