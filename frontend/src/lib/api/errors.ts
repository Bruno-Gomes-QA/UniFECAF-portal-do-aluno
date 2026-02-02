export type ApiErrorEnvelope = {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
};

export class ApiClientError extends Error {
  status: number;
  code: string;
  details: Record<string, unknown>;

  constructor(args: { status: number; code: string; message: string; details?: Record<string, unknown> }) {
    super(args.message);
    this.name = 'ApiClientError';
    this.status = args.status;
    this.code = args.code;
    this.details = args.details ?? {};
  }
}

export async function readApiError(response: Response): Promise<ApiClientError> {
  const fallback = new ApiClientError({
    status: response.status,
    code: 'HTTP_ERROR',
    message: response.statusText || 'Erro ao chamar API.',
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return fallback;

  try {
    const data = await response.json();
    
    // Verificação defensiva se o objeto segue o padrão { error: { code, message, ... } }
    const errorBody = (data as any)?.error;

    if (errorBody) {
      return new ApiClientError({
        status: response.status,
        code: typeof errorBody.code === 'string' ? errorBody.code : fallback.code,
        message: typeof errorBody.message === 'string' ? errorBody.message : fallback.message,
        details: errorBody.details || fallback.details,
      });
    }
    
    return fallback;
  } catch {
    return fallback;
  }
}

