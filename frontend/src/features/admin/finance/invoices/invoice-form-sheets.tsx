'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { toast } from 'sonner';

import { adminInvoicesApi } from '@/features/admin/finance/invoices/api';
import type { Invoice } from '@/features/admin/finance/invoices/types';
import { FormSheet } from '@/components/shared/form-sheet';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Combobox } from '@/components/shared/combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pen, Trash2, CheckCircle2, XCircle } from 'lucide-react';

const createSchema = z.object({
  student_id: z.string().uuid('Selecione um aluno'),
  term_id: z.string().uuid().optional(),
  description: z.string().min(1, 'Descrição obrigatória'),
  due_date: z.string().min(1, 'Vencimento obrigatório'),
  amount: z.coerce.number().min(0.01, 'Valor mínimo R$ 0,01'),
  fine_rate: z.coerce.number().min(0).max(100).optional(),
  interest_rate: z.coerce.number().min(0).max(100).optional(),
  installment_number: z.coerce.number().int().min(1).optional(),
  installment_total: z.coerce.number().int().min(1).optional(),
});

const editSchema = z.object({
  term_id: z.string().uuid().optional(),
  description: z.string().min(1, 'Descrição obrigatória'),
  due_date: z.string().min(1, 'Vencimento obrigatório'),
  amount: z.coerce.number().min(0.01, 'Valor mínimo R$ 0,01'),
  fine_rate: z.coerce.number().min(0).max(100).optional(),
  interest_rate: z.coerce.number().min(0).max(100).optional(),
  installment_number: z.coerce.number().int().min(1).optional(),
  installment_total: z.coerce.number().int().min(1).optional(),
});

type Option = { id: string; label: string };

export function CreateInvoiceSheet({ 
  students, 
  terms,
  trigger 
}: { 
  students: Option[]; 
  terms: Option[];
  trigger?: ReactNode;
}) {
  const router = useRouter();
  return (
    <FormSheet
      title="Nova Fatura"
      description="Crie uma fatura para cobrança."
      triggerLabel={trigger ? undefined : "Nova fatura"}
      trigger={trigger}
      schema={createSchema}
      defaultValues={{
        student_id: students[0]?.id || '',
        term_id: undefined,
        description: 'Mensalidade',
        due_date: '',
        amount: 0,
        fine_rate: 2,
        interest_rate: 1,
        installment_number: undefined,
        installment_total: undefined,
      }}
      onSubmit={async (values) => {
        await adminInvoicesApi.create({
          student_id: values.student_id,
          term_id: values.term_id || null,
          description: values.description,
          due_date: values.due_date,
          amount: values.amount,
          fine_rate: values.fine_rate,
          interest_rate: values.interest_rate,
          installment_number: values.installment_number || null,
          installment_total: values.installment_total || null,
        });
        toast.success('Fatura criada com sucesso!');
        router.refresh();
      }}
    >
      {(form) => (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Aluno *</Label>
            <Combobox
              value={form.watch('student_id')}
              onValueChange={(v) => form.setValue('student_id', v)}
              options={students.map((s) => ({ value: s.id, label: s.label }))}
              placeholder="Selecione um aluno"
              searchPlaceholder="Buscar aluno..."
            />
            {form.formState.errors.student_id && (
              <p className="text-xs text-destructive">{form.formState.errors.student_id.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Período (opcional)</Label>
            <Combobox
              value={form.watch('term_id') || ''}
              onValueChange={(v) => form.setValue('term_id', v || undefined)}
              options={[
                { value: '', label: 'Não informado' },
                ...terms.map((t) => ({ value: t.id, label: t.label })),
              ]}
              placeholder="Selecione um período"
              searchPlaceholder="Buscar período..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input id="description" {...form.register('description')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="due_date">Vencimento *</Label>
              <Input id="due_date" type="date" {...form.register('due_date')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$) *</Label>
              <Input id="amount" type="number" step="0.01" min={0} {...form.register('amount')} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fine_rate">Multa (%)</Label>
              <Input id="fine_rate" type="number" step="0.1" min={0} max={100} {...form.register('fine_rate')} />
              <p className="text-xs text-muted-foreground">Aplicada após vencimento (padrão 2%)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="interest_rate">Juros ao mês (%)</Label>
              <Input id="interest_rate" type="number" step="0.1" min={0} max={100} {...form.register('interest_rate')} />
              <p className="text-xs text-muted-foreground">Aplicado após vencimento (padrão 1%)</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="installment_number">Parcela nº</Label>
              <Input id="installment_number" type="number" min={1} {...form.register('installment_number')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="installment_total">De quantas</Label>
              <Input id="installment_total" type="number" min={1} {...form.register('installment_total')} />
            </div>
          </div>
        </div>
      )}
    </FormSheet>
  );
}

export function EditInvoiceSheet({
  invoice,
  terms,
}: {
  invoice: Invoice;
  terms: Option[];
}) {
  const router = useRouter();
  const isLocked = invoice.status === 'PAID' || invoice.status === 'CANCELED';

  return (
    <FormSheet
      title="Editar Fatura"
      description={`Referência: ${invoice.reference || invoice.id}`}
      trigger={
        <Button variant="outline" size="icon" className="h-8 w-8">
          <Pen className="h-4 w-4" />
        </Button>
      }
      schema={editSchema}
      defaultValues={{
        term_id: invoice.term_id || undefined,
        description: invoice.description,
        due_date: invoice.due_date,
        amount: Number(invoice.amount),
        fine_rate: invoice.fine_rate ? Number(invoice.fine_rate) : 2,
        interest_rate: invoice.interest_rate ? Number(invoice.interest_rate) : 1,
        installment_number: invoice.installment_number || undefined,
        installment_total: invoice.installment_total || undefined,
      }}
      onSubmit={async (values) => {
        await adminInvoicesApi.update(invoice.id, {
          term_id: values.term_id || null,
          description: values.description,
          due_date: values.due_date,
          amount: values.amount,
          fine_rate: values.fine_rate,
          interest_rate: values.interest_rate,
          installment_number: values.installment_number || null,
          installment_total: values.installment_total || null,
        });
        toast.success('Fatura atualizada com sucesso!');
        router.refresh();
      }}
    >
      {(form) => (
        <div className="space-y-4">
          {isLocked && (
            <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
              Esta fatura está {invoice.status === 'PAID' ? 'paga' : 'cancelada'} e não pode ser editada.
            </div>
          )}
          
          {/* Aluno (somente leitura) */}
          <div className="space-y-2">
            <Label>Aluno</Label>
            <Input 
              value={invoice.student_name ? `${invoice.student_name} (${invoice.student_ra || '—'})` : invoice.student_id} 
              disabled 
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">O aluno não pode ser alterado.</p>
          </div>

          <div className="space-y-2">
            <Label>Período (opcional)</Label>
            <Combobox
              value={form.watch('term_id') || ''}
              onValueChange={(v) => form.setValue('term_id', v || undefined)}
              options={[
                { value: '', label: 'Não informado' },
                ...terms.map((t) => ({ value: t.id, label: t.label })),
              ]}
              placeholder="Selecione um período"
              searchPlaceholder="Buscar período..."
              disabled={isLocked}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input id="description" {...form.register('description')} disabled={isLocked} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="due_date">Vencimento *</Label>
              <Input id="due_date" type="date" {...form.register('due_date')} disabled={isLocked} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$) *</Label>
              <Input id="amount" type="number" step="0.01" min={0} {...form.register('amount')} disabled={isLocked || (invoice.payments_count ?? 0) > 0} />
              {(invoice.payments_count ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground">Valor bloqueado (há pagamentos vinculados)</p>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fine_rate">Multa (%)</Label>
              <Input id="fine_rate" type="number" step="0.1" min={0} max={100} {...form.register('fine_rate')} disabled={isLocked} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interest_rate">Juros ao mês (%)</Label>
              <Input id="interest_rate" type="number" step="0.1" min={0} max={100} {...form.register('interest_rate')} disabled={isLocked} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="installment_number">Parcela nº</Label>
              <Input id="installment_number" type="number" min={1} {...form.register('installment_number')} disabled={isLocked} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="installment_total">De quantas</Label>
              <Input id="installment_total" type="number" min={1} {...form.register('installment_total')} disabled={isLocked} />
            </div>
          </div>
        </div>
      )}
    </FormSheet>
  );
}

export function MarkPaidButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      title="Marcar fatura como paga?"
      description="Esta ação cria um pagamento automático com o valor restante da fatura. O status será alterado para PAGA."
      confirmLabel="Confirmar Pagamento"
      onConfirm={async () => {
        const result = await adminInvoicesApi.markPaid(invoiceId);
        toast.success(`Pagamento criado: ${result.payment_id}`);
        router.refresh();
      }}
      trigger={
        <Button variant="outline" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50">
          <CheckCircle2 className="h-4 w-4" />
        </Button>
      }
    />
  );
}

export function CancelInvoiceButton({ invoiceId, reference }: { invoiceId: string; reference?: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      title="Cancelar fatura?"
      description={`A fatura ${reference || invoiceId} será cancelada permanentemente. Esta ação não pode ser desfeita e nenhum pagamento poderá ser vinculado.`}
      confirmLabel="Cancelar Fatura"
      onConfirm={async () => {
        await adminInvoicesApi.cancel(invoiceId);
        toast.success('Fatura cancelada com sucesso!');
        router.refresh();
      }}
      trigger={
        <Button variant="outline" size="icon" className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50">
          <XCircle className="h-4 w-4" />
        </Button>
      }
    />
  );
}

export function DeleteInvoiceButton({ invoiceId, reference }: { invoiceId: string; reference?: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      title="Remover fatura?"
      description={`A fatura ${reference || invoiceId} será removida permanentemente. Esta ação não pode ser desfeita.`}
      confirmLabel="Remover"
      onConfirm={async () => {
        await adminInvoicesApi.remove(invoiceId);
        toast.success('Fatura removida com sucesso!');
        router.refresh();
      }}
      trigger={
        <Button variant="destructive" size="icon" className="h-8 w-8">
          <Trash2 className="h-4 w-4" />
        </Button>
      }
    />
  );
}
