'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
};

export function Pagination({ page, pageSize, total }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const canPrev = page > 1;
  const canNext = page < pageCount;

  const rangeLabel = useMemo(() => {
    const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const end = Math.min(total, page * pageSize);
    return `${start}-${end} de ${total}`;
  }, [page, pageSize, total]);

  const go = (nextPage: number) => {
    const params = new URLSearchParams(sp.toString());
    params.set('page', String(nextPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">{rangeLabel}</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => go(page - 1)} disabled={!canPrev}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Anterior
        </Button>
        <span className="text-sm">
          {page} / {pageCount}
        </span>
        <Button variant="outline" size="sm" onClick={() => go(page + 1)} disabled={!canNext}>
          Próxima
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

