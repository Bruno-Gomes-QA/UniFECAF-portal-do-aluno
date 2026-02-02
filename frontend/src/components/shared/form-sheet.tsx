'use client';

import * as React from 'react';
import { useForm, type DefaultValues, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { z } from 'zod';

import { ApiClientError } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

type FormSheetProps<TSchema extends z.ZodTypeAny> = {
  title: string;
  description?: string;
  triggerLabel?: string;
  triggerVariant?: React.ComponentProps<typeof Button>['variant'];
  trigger?: React.ReactNode;
  submitLabel?: string;
  schema: TSchema;
  defaultValues: DefaultValues<z.infer<TSchema>>;
  onSubmit: (values: z.infer<TSchema>) => Promise<void>;
  children: (form: UseFormReturn<z.infer<TSchema>>) => React.ReactNode;
};

export function FormSheet<TSchema extends z.ZodTypeAny>({
  title,
  description,
  triggerLabel,
  triggerVariant = 'default',
  trigger,
  submitLabel = 'Salvar',
  schema,
  defaultValues,
  onSubmit,
  children,
}: FormSheetProps<TSchema>) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const form = useForm<z.infer<TSchema>>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await onSubmit(values);
      toast.success('Salvo com sucesso.');
      setOpen(false);
      form.reset(values);
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error('Erro ao salvar.');
      }
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button variant={triggerVariant}>{triggerLabel || 'Abrir'}</Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[50vw]">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {children(form)}
          <SheetFooter className="pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : submitLabel}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
