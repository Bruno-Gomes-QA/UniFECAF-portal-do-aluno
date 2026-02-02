import 'server-only';

import { redirect } from 'next/navigation';
import { cache } from 'react';

import { apiServer } from '@/lib/api/server';
import { ApiClientError } from '@/lib/api/errors';
import { API_V1 } from '@/lib/api/routes';
import type { AuthMeResponse, UserRole } from '@/lib/auth/types';

type RequireAuthOptions = {
  loginPath?: string;
};

export const getCurrentUser = cache(async (): Promise<AuthMeResponse | null> => {
  try {
    return await apiServer.get<AuthMeResponse>(API_V1.auth.me, { cache: 'no-store' });
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 401) return null;
    throw err;
  }
});

export async function requireAuth(options: RequireAuthOptions = {}): Promise<AuthMeResponse> {
  const { loginPath = '/login' } = options;
  const user = await getCurrentUser();
  if (!user) redirect(loginPath);
  return user;
}

export async function requireRole(
  roles: UserRole | UserRole[],
  options?: RequireAuthOptions,
): Promise<AuthMeResponse> {
  const user = await requireAuth(options);
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(user.role)) {
    if (user.role === 'ADMIN') redirect('/administrativo');
    redirect('/');
  }
  return user;
}
