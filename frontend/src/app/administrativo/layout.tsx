import type { ReactNode } from 'react';

import { requireRole } from '@/lib/auth/server';
import { AdminShell } from '@/components/shell/admin-shell';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireRole(['ADMIN'], { loginPath: '/login/administrativo' });
  return <AdminShell user={user}>{children}</AdminShell>;
}
