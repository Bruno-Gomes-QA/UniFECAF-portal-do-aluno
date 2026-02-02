'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

export type AsyncComboboxOption = {
  value: string;
  label: string;
  description?: string;
  data?: any; // For additional data (like full object)
};

type LoadResult = {
  options: AsyncComboboxOption[];
  hasMore: boolean;
};

type AsyncComboboxProps = {
  value: string;
  onValueChange: (value: string, option?: AsyncComboboxOption) => void;
  loadOptions: (params: { search: string; offset: number; limit: number }) => Promise<LoadResult>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  className?: string;
  disabled?: boolean;
  pageSize?: number;
};

export function AsyncCombobox({
  value,
  onValueChange,
  loadOptions,
  placeholder = 'Selecione',
  searchPlaceholder = 'Buscar...',
  emptyLabel = 'Nenhum resultado.',
  className,
  disabled,
  pageSize = 20,
}: AsyncComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [options, setOptions] = React.useState<AsyncComboboxOption[]>([]);
  const [offset, setOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const selected = options.find((o) => o.value === value);

  const fetchOptions = React.useCallback(
    async (nextSearch: string, nextOffset: number, reset = false) => {
      setLoading(true);
      try {
        const result = await loadOptions({ search: nextSearch, offset: nextOffset, limit: pageSize });
        setOptions((prev) => (reset ? result.options : [...prev, ...result.options]));
        setHasMore(result.hasMore);
        setOffset(nextOffset + pageSize);
      } finally {
        setLoading(false);
      }
    },
    [loadOptions, pageSize]
  );

  React.useEffect(() => {
    if (!open) return;
    setOptions([]);
    setOffset(0);
    fetchOptions(search, 0, true);
  }, [open, search, fetchOptions]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn('w-full justify-between', className)}
          aria-expanded={open}
        >
          <span className={cn('truncate text-left', !selected && 'text-muted-foreground')}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="mb-2"
        />
        <ScrollArea className="max-h-56">
          {options.length === 0 && !loading ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">{emptyLabel}</p>
          ) : (
            <div className="space-y-1">
              {options.map((opt) => {
                const active = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onValueChange(opt.value, opt);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-md px-2 py-2 text-sm transition-colors',
                      active ? 'bg-secondary/20 text-secondary' : 'hover:bg-muted'
                    )}
                  >
                    <div className="flex flex-col text-left">
                      <span className="truncate">{opt.label}</span>
                      {opt.description ? (
                        <span className="text-xs text-muted-foreground">{opt.description}</span>
                      ) : null}
                    </div>
                    {active ? <Check className="h-4 w-4 text-secondary" /> : null}
                  </button>
                );
              })}
              {loading ? (
                <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Carregando...
                </div>
              ) : null}
              {!loading && hasMore ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-center"
                  onClick={() => fetchOptions(search, offset)}
                >
                  Carregar mais
                </Button>
              ) : null}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}