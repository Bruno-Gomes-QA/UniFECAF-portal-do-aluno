import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { readApiError } from '@/lib/api/errors';

type ServerFetchOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  cache?: RequestCache;
  next?: { revalidate?: number };
};

const BACKEND_BASE_URL =
  process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

function cookieHeader() {
  const store = cookies();
  const parts = store.getAll().map((c) => `${c.name}=${c.value}`);
  return parts.join('; ');
}

async function serverFetch<T>(path: string, options: ServerFetchOptions = {}): Promise<T> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL.replace(/\/$/, '')}${path}`, {
      method: options.method ?? 'GET',
      cache: options.cache,
      next: options.next,
      headers: {
        'content-type': 'application/json',
        cookie: cookieHeader(),
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    if (!response.ok) {
      throw await readApiError(response);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error: any) {
    // Se for erro de conexão (backend offline), redireciona para login
    if (error?.cause?.code === 'ECONNREFUSED' || error?.code === 'ECONNREFUSED') {
      console.error('[serverFetch] Backend offline, redirecionando para login:', error.message);
      redirect('/auth/login?error=backend_offline');
    }
    throw error;
  }
}

export const apiServer = {
  get: <T>(path: string, options?: Omit<ServerFetchOptions, 'method' | 'body'>) =>
    serverFetch<T>(path, options),
  post: <T>(path: string, body?: unknown, options?: Omit<ServerFetchOptions, 'method' | 'body'>) =>
    serverFetch<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<ServerFetchOptions, 'method' | 'body'>) =>
    serverFetch<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: Omit<ServerFetchOptions, 'method' | 'body'>) =>
    serverFetch<T>(path, { ...options, method: 'DELETE' }),
};
