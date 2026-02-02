import type { ReactNode } from 'react';

import { requireRole } from '@/lib/auth/server';
import { StudentShell } from '@/components/shell/student-shell';

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const user = await requireRole('STUDENT');
  return <StudentShell user={user}>{children}</StudentShell>;
}

