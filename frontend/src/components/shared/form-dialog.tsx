'use client';

import * as React from 'react';
import { useForm, type DefaultValues, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { z } from 'zod';

import { handleApiError } from '@/lib/api/error-handler';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type FormDialogProps<TSchema extends z.ZodTypeAny> = {
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

export function FormDialog<TSchema extends z.ZodTypeAny>({
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
}: FormDialogProps<TSchema>) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<z.infer<TSchema>>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  // Atualiza o form quando defaultValues mudar (importante para Edit)
  React.useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [open, defaultValues, form]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      // Reset para limpar erros quando fechar
      form.clearErrors();
    }
  };

  const handleSubmit = form.handleSubmit(
    async (values) => {
    setSubmitting(true);
    try {
      await onSubmit(values);
      toast.success('Salvo com sucesso.');
      handleOpenChange(false);
      form.reset(defaultValues);
    } catch (err) {
      handleApiError(err, 'Erro ao salvar.');
    } finally {
      setSubmitting(false);
    }
    },
    (errors) => {
      const firstError = Object.values(errors)[0] as { message?: string } | undefined;
      toast.error(firstError?.message || 'Revise os campos obrigatórios.');
    }
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ? trigger : <Button variant={triggerVariant}>{triggerLabel || 'Abrir'}</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {children(form)}
          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={submitting}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

