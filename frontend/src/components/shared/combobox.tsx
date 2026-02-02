'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

export type ComboboxOption = {
  value: string;
  label: string;
  description?: string;
};

type ComboboxProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  className?: string;
  disabled?: boolean;
};

export function Combobox({
  value,
  onValueChange,
  options,
  placeholder = 'Selecione',
  searchPlaceholder = 'Buscar...',
  emptyLabel = 'Nenhum resultado.',
  className,
  disabled,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const selected = options.find((o) => o.value === value);
  const filtered = React.useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q));
  }, [options, query]);

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
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="mb-2"
        />
        <ScrollArea className="max-h-56">
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">{emptyLabel}</p>
          ) : (
            <div className="space-y-1">
              {filtered.map((opt) => {
                const active = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onValueChange(opt.value);
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
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

