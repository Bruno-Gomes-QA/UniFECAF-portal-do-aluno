'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

export type SessionOption = {
  value: string;
  label: string;
  subLabel?: string;
};

type SessionSelectorProps = {
  options: SessionOption[];
  defaultValue?: string;
  placeholder?: string;
};

export function SessionSelector({
  options,
  defaultValue,
  placeholder = 'Selecione uma aula...',
}: SessionSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(defaultValue || '');

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string) => {
    setValue(optionValue);
    setOpen(false);

    const params = new URLSearchParams(searchParams.toString());
    if (optionValue) {
      params.set('session_id', optionValue);
    } else {
      params.delete('session_id');
    }
    params.delete('page');
    router.push(`?${params.toString()}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedOption ? (
            <div className="flex flex-col items-start text-left">
              <span className="truncate">{selectedOption.label}</span>
              {selectedOption.subLabel && (
                <span className="text-xs text-muted-foreground truncate">
                  {selectedOption.subLabel}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <ScrollArea className="h-[300px]">
          <div className="p-2">
            {options.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma aula disponível.
              </p>
            ) : (
              options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent',
                    value === option.value && 'bg-accent'
                  )}
                >
                  <Check
                    className={cn(
                      'h-4 w-4 shrink-0',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{option.label}</span>
                    {option.subLabel && (
                      <span className="text-xs text-muted-foreground truncate">
                        {option.subLabel}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
