'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { toast } from 'sonner';

import { adminPaymentsApi } from '@/features/admin/finance/payments/api';
import type { Payment } from '@/features/admin/finance/payments/types';
import { FormSheet } from '@/components/shared/form-sheet';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPaymentStatus, type PaymentStatus } from '@/features/admin/finance/i18n';
import { Pen, Trash2, CheckCircle2, RefreshCw } from 'lucide-react';

const createSchema = z.object({
  invoice_id: z.string().uuid('ID da fatura inválido'),
  amount: z.coerce.number().min(0.01, 'Valor mínimo R$ 0,01'),
  method: z.string().optional(),
  provider: z.string().optional(),
  provider_ref: z.string().optional(),
  paid_at: z.string().optional(),
});

const editSchema = z.object({
  method: z.string().optional(),
  provider: z.string().optional(),
  provider_ref: z.string().optional(),
  paid_at: z.string().optional(),
});

function toIsoOrNull(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function CreatePaymentSheet({ trigger }: { trigger?: ReactNode }) {
  const router = useRouter();
  return (
    <FormSheet
      title="Novo Pagamento"
      description="Registre um pagamento para uma fatura."
      triggerLabel={trigger ? undefined : "Novo pagamento"}
      trigger={trigger}
      schema={createSchema}
      defaultValues={{
        invoice_id: '',
        amount: 0,
        method: '',
        provider: '',
        provider_ref: '',
        paid_at: '',
      }}
      onSubmit={async (values) => {
        await adminPaymentsApi.create({
          invoice_id: values.invoice_id,
          amount: values.amount,
          method: values.method || null,
          provider: values.provider || null,
          provider_ref: values.provider_ref || null,
          paid_at: toIsoOrNull(values.paid_at),
        });
        toast.success('Pagamento registrado com sucesso!');
        router.refresh();
      }}
    >
      {(form) => (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invoice_id">ID da Fatura *</Label>
            <Input id="invoice_id" placeholder="UUID da fatura" {...form.register('invoice_id')} />
            {form.formState.errors.invoice_id && (
              <p className="text-xs text-destructive">{form.formState.errors.invoice_id.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Copie o ID da fatura na tela de Faturas.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$) *</Label>
              <Input id="amount" type="number" step="0.01" min={0} {...form.register('amount')} />
              <p className="text-xs text-muted-foreground">Máximo: valor restante da fatura</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">Método</Label>
              <Select
                value={form.watch('method') || ''}
                onValueChange={(v) => form.setValue('method', v || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="BOLETO">Boleto</SelectItem>
                  <SelectItem value="CARTAO_CREDITO">Cartão de Crédito</SelectItem>
                  <SelectItem value="CARTAO_DEBITO">Cartão de Débito</SelectItem>
                  <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                  <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="provider">Provedor</Label>
              <Input id="provider" placeholder="Ex: PagSeguro, Stripe..." {...form.register('provider')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider_ref">Referência</Label>
              <Input id="provider_ref" placeholder="ID externo..." {...form.register('provider_ref')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paid_at">Data/Hora do Pagamento</Label>
            <Input id="paid_at" type="datetime-local" {...form.register('paid_at')} />
            <p className="text-xs text-muted-foreground">Se não informado, usa a data atual.</p>
          </div>
        </div>
      )}
    </FormSheet>
  );
}

export function EditPaymentSheet({ payment }: { payment: Payment }) {
  const router = useRouter();
  const isLocked = payment.status === 'SETTLED' || payment.status === 'REFUNDED';

  return (
    <FormSheet
      title="Editar Pagamento"
      description={`Fatura: ${payment.invoice_reference || payment.invoice_id}`}
      trigger={
        <Button variant="outline" size="icon" className="h-8 w-8">
          <Pen className="h-4 w-4" />
        </Button>
      }
      schema={editSchema}
      defaultValues={{
        method: payment.method || '',
        provider: payment.provider || '',
        provider_ref: payment.provider_ref || '',
        paid_at: '',
      }}
      onSubmit={async (values) => {
        await adminPaymentsApi.update(payment.id, {
          method: values.method || null,
          provider: values.provider || null,
          provider_ref: values.provider_ref || null,
          paid_at: toIsoOrNull(values.paid_at),
        });
        toast.success('Pagamento atualizado com sucesso!');
        router.refresh();
      }}
    >
      {(form) => (
        <div className="space-y-4">
          {isLocked && (
            <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
              Este pagamento está {payment.status === 'SETTLED' ? 'liquidado' : 'estornado'} e tem edição limitada.
            </div>
          )}
          
          {/* Fatura e Aluno (somente leitura) */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fatura</Label>
              <Input value={payment.invoice_reference || payment.invoice_id} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Aluno</Label>
              <Input value={payment.student_name || '—'} disabled className="bg-muted" />
            </div>
          </div>

          {/* Valor e Status (somente leitura) */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input value={`R$ ${Number(payment.amount).toFixed(2)}`} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">O valor não pode ser alterado.</p>
            </div>
            <div className="space-y-2">
              <Label>Situação</Label>
              <Input value={formatPaymentStatus(payment.status)} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Use Liquidar ou Estornar para alterar.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="method">Método</Label>
              <Select
                value={form.watch('method') || ''}
                onValueChange={(v) => form.setValue('method', v || undefined)}
                disabled={isLocked}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="BOLETO">Boleto</SelectItem>
                  <SelectItem value="CARTAO_CREDITO">Cartão de Crédito</SelectItem>
                  <SelectItem value="CARTAO_DEBITO">Cartão de Débito</SelectItem>
                  <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                  <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">Provedor</Label>
              <Input id="provider" placeholder="Ex: PagSeguro..." {...form.register('provider')} disabled={isLocked} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="provider_ref">Referência Externa</Label>
              <Input id="provider_ref" {...form.register('provider_ref')} disabled={isLocked} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paid_at">Data/Hora do Pagamento</Label>
              <Input id="paid_at" type="datetime-local" {...form.register('paid_at')} disabled={isLocked} />
            </div>
          </div>
        </div>
      )}
    </FormSheet>
  );
}

export function SettlePaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      title="Liquidar pagamento?"
      description="Esta ação confirma a compensação do pagamento. Se o valor total da fatura for atingido, ela será marcada como PAGA automaticamente."
      confirmLabel="Liquidar"
      onConfirm={async () => {
        await adminPaymentsApi.settle(paymentId);
        toast.success('Pagamento liquidado com sucesso!');
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

export function RefundPaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      title="Estornar pagamento?"
      description="Esta ação reverte o pagamento. A fatura será atualizada automaticamente para refletir o novo saldo."
      confirmLabel="Estornar"
      onConfirm={async () => {
        await adminPaymentsApi.refund(paymentId);
        toast.success('Pagamento estornado com sucesso!');
        router.refresh();
      }}
      trigger={
        <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
          <RefreshCw className="h-4 w-4" />
        </Button>
      }
    />
  );
}

export function DeletePaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      title="Remover pagamento?"
      description="O pagamento será removido permanentemente. Esta ação não pode ser desfeita."
      confirmLabel="Remover"
      onConfirm={async () => {
        await adminPaymentsApi.remove(paymentId);
        toast.success('Pagamento removido com sucesso!');
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
