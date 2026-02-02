'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Option = { value: string; label: string };

type FiltersSelectProps = {
  name: string;
  defaultValue?: string;
  value?: string;
  allLabel: string;
  options: Option[];
  placeholder?: string;
  className?: string;
  onValueChange?: (value: string) => void;
};

const ALL = '__all__';

export function FiltersSelect({
  name,
  defaultValue,
  value: controlledValue,
  allLabel,
  options,
  placeholder = 'Selecione',
  className,
  onValueChange,
}: FiltersSelectProps) {
  // Filter out options with empty values (Radix Select doesn't allow empty values)
  const validOptions = options.filter((o) => o.value && o.value.trim() !== '');
  
  const initial = defaultValue && validOptions.some((o) => o.value === defaultValue) ? defaultValue : ALL;
  const [internalValue, setInternalValue] = React.useState<string>(initial);
  
  // Support controlled mode
  const isControlled = controlledValue !== undefined;
  const value = isControlled 
    ? (controlledValue && validOptions.some((o) => o.value === controlledValue) ? controlledValue : ALL)
    : internalValue;

  const handleChange = (newValue: string) => {
    if (!isControlled) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue === ALL ? '' : newValue);
  };

  return (
    <div className={cn('min-w-44', className)}>
      <input type="hidden" name={name} value={value === ALL ? '' : value} />
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {validOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

