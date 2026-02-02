'use client';

import type { ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type FiltersFormProps = {
  children: ReactNode;
};

export function FiltersForm({ children }: FiltersFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const params = new URLSearchParams(sp.toString());
    params.delete('page'); // reset pagination on filter submit

    data.forEach((value, key) => {
      const v = String(value ?? '').trim();
      if (!v) params.delete(key);
      else params.set(key, v);
    });

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
      {children}
    </form>
  );
}
