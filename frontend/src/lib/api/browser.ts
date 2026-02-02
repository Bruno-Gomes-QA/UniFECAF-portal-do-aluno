'use client';

import { readApiError } from '@/lib/api/errors';

type BrowserFetchOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

async function browserFetch<T>(path: string, options: BrowserFetchOptions = {}): Promise<T> {
  const response = await fetch(`/api/proxy${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    throw await readApiError(response);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const apiBrowser = {
  get: <T>(path: string) => browserFetch<T>(path),
  post: <T>(path: string, body?: unknown) => browserFetch<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => browserFetch<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => browserFetch<T>(path, { method: 'DELETE' }),
};

