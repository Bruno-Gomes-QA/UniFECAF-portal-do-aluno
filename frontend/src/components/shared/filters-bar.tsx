import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function FiltersBar({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-end', className)}>
      {children}
    </div>
  );
}

