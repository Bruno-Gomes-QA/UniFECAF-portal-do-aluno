/**
 * UniFECAF Portal do Aluno - API Client
 * Fetch wrapper for backend communication
 */

import type { LoginRequest, LoginResponse, HomeResponse, UserInfo, ApiError } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

/**
 * Custom error class for API errors
 */
export class ApiClientError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'ApiClientError';
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Base fetch function with credentials
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Always include cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    let detail = 'An error occurred';
    try {
      const errorData: ApiError = await response.json();
      detail = errorData.detail || detail;
    } catch {
      // Response might not be JSON
      detail = response.statusText || detail;
    }
    throw new ApiClientError(response.status, detail);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

/**
 * Auth API
 */
export const authApi = {
  login: (data: LoginRequest): Promise<LoginResponse> =>
    apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: (): Promise<void> =>
    apiFetch<void>('/auth/logout', {
      method: 'POST',
    }),

  me: (): Promise<UserInfo> =>
    apiFetch<UserInfo>('/auth/me'),
};

/**
 * Home API
 */
export const homeApi = {
  getHomeData: (): Promise<HomeResponse> =>
    apiFetch<HomeResponse>('/home'),
};

/**
 * Health API
 */
export const healthApi = {
  check: (): Promise<{ status: string; database: string; message: string }> =>
    apiFetch('/health'),
};
