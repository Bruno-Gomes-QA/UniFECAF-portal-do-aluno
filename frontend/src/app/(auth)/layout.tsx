import type { ReactNode } from 'react';
import { ServerStatusBadge } from '@/components/shared/server-status-badge';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
      <ServerStatusBadge />
    </div>
  );
}

