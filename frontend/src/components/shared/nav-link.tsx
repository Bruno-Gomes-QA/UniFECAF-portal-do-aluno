'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

type NavLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  exact?: boolean;
};

export function NavLink({ href, children, className, exact }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-white/10 text-white'
          : 'text-white/80 hover:bg-white/10 hover:text-white',
        className
      )}
    >
      {children}
    </Link>
  );
}
