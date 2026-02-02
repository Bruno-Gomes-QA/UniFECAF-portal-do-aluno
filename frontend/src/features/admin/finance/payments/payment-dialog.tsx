'use client';

import { ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { adminPaymentsApi } from '@/features/admin/finance/payments/api';
import { adminInvoicesApi } from '@/features/admin/finance/invoices/api';
import { AsyncCombobox } from '@/components/shared/async-combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Receipt, 
  DollarSign,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Search,
  CheckCircle2,
  Banknote,
  Calendar
} from 'lucide-react';

const createSchema = z.object({
  invoice_id: z.string().uuid('Selecione uma fatura'),
  amount: z.coerce.number().min(0.01, 'Valor mínimo R$ 0,01'),
  method: z.string().min(1, 'Método obrigatório'),
  provider: z.string().optional(),
  provider_ref: z.string().optional(),
  paid_at: z.string().optional(),
});

type CreateFormData = z.infer<typeof createSchema>;

const PAYMENT_METHODS = [
  { value: 'PIX', label: 'PIX', icon: '⚡' },
  { value: 'CREDIT_CARD', label: 'Cartão de Crédito', icon: '💳' },
  { value: 'DEBIT_CARD', label: 'Cartão de Débito', icon: '💳' },
  { value: 'BANK_TRANSFER', label: 'Transferência Bancária', icon: '🏦' },
  { value: 'BOLETO', label: 'Boleto', icon: '📄' },
  { value: 'CASH', label: 'Dinheiro', icon: '💵' },
  { value: 'CHECK', label: 'Cheque', icon: '📝' },
];

const PROVIDERS = [
  'Mercado Pago',
  'PagSeguro',
  'Cielo',
  'Stone',
  'PayPal',
  'Stripe',
  'Banco do Brasil',
  'Itaú',
  'Bradesco',
  'Santander',
  'Caixa Econômica',
];

const STEPS = [
  {
    id: 1,
    title: 'Selecionar Fatura',
    description: 'Busque a fatura para receber o pagamento',
    icon: Search,
  },
  {
    id: 2,
    title: 'Valor e Método',
    description: 'Configure os detalhes do pagamento',
    icon: CreditCard,
  },
  {
    id: 3,
    title: 'Informações Extras',
    description: 'Dados adicionais (opcional)',
    icon: Receipt,
  }
];

function toIsoOrNull(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function CreatePaymentDialog({ trigger }: { trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const router = useRouter();

  const form = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      invoice_id: '',
      amount: 0,
      method: '',
      provider: '',
      provider_ref: '',
      paid_at: '',
    },
  });

  const onSubmit = async (values: CreateFormData) => {
    try {
      await adminPaymentsApi.create({
        invoice_id: values.invoice_id,
        amount: values.amount,
        method: values.method,
        provider: values.provider || null,
        provider_ref: values.provider_ref || null,
        paid_at: toIsoOrNull(values.paid_at),
      });
      toast.success('Pagamento registrado com sucesso!');
      setOpen(false);
      setCurrentStep(1);
      setSelectedInvoice(null);
      form.reset();
      router.refresh();
    } catch (error) {
      toast.error('Erro ao registrar pagamento');
    }
  };

  const loadInvoices = async ({ search, offset, limit }: { search: string; offset: number; limit: number }) => {
    try {
      const result = await adminInvoicesApi.list({ 
        search,
        limit, 
        offset,
        status: 'PENDING,OVERDUE' // Apenas faturas que podem receber pagamento
      });
      return {
        options: result.items.map(invoice => ({
          value: invoice.id,
          label: `${invoice.reference || invoice.id.substring(0, 8)} - ${invoice.student_name}`,
          description: `R$ ${Number(invoice.amount_due || invoice.amount).toFixed(2)} • Vence em ${invoice.due_date}`,
          data: invoice
        })),
        hasMore: result.total > offset + limit
      };
    } catch (error) {
      return { options: [], hasMore: false };
    }
  };

  const canGoNext = () => {
    const values = form.getValues();
    
    if (currentStep === 1) {
      return values.invoice_id && selectedInvoice;
    }
    if (currentStep === 2) {
      return values.amount > 0 && values.method;
    }
    return true; // Step 3 todos os campos são opcionais
  };

  const resetForm = () => {
    setOpen(false);
    setCurrentStep(1);
    setSelectedInvoice(null);
    form.reset();
  };

  // Auto-fill amount when invoice is selected
  const handleInvoiceChange = (value: string, option: any) => {
    form.setValue('invoice_id', value);
    if (option?.data) {
      const invoice = option.data;
      setSelectedInvoice(invoice);
      const amountDue = Number(invoice.amount_due || invoice.amount);
      form.setValue('amount', amountDue);
    }
  };

  const currentStepData = STEPS.find(step => step.id === currentStep);
  const StepIcon = currentStepData?.icon || Receipt;

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      else setOpen(open);
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <CreditCard className="h-4 w-4" />
            Novo Pagamento
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <StepIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-lg font-semibold">{currentStepData?.title}</div>
              <div className="text-sm text-muted-foreground">{currentStepData?.description}</div>
            </div>
          </DialogTitle>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-2 pt-4">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                  currentStep === step.id 
                    ? 'bg-green-600 text-white' 
                    : currentStep > step.id 
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {step.id}
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-12 h-1 mx-2 rounded transition-colors ${
                    currentStep > step.id ? 'bg-green-500' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        <Separator />

        <div className="flex-1 overflow-auto">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
            {/* Step 1: Selecionar Fatura */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-green-600" />
                    <Label className="text-sm font-medium">Buscar Fatura *</Label>
                  </div>
                  <AsyncCombobox
                    value={form.watch('invoice_id')}
                    onValueChange={handleInvoiceChange}
                    loadOptions={loadInvoices}
                    placeholder="Digite a referência ou nome do aluno..."
                    searchPlaceholder="Ex: INV-202602-001 ou João Silva"
                    emptyLabel="Nenhuma fatura encontrada"
                    className="w-full"
                  />
                  {form.formState.errors.invoice_id && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {form.formState.errors.invoice_id.message}
                    </p>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Mostrando apenas faturas pendentes ou em atraso que podem receber pagamento.
                  </p>
                </div>

                {selectedInvoice && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-900">Fatura selecionada</span>
                    </div>
                    
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Referência:</span>
                        <span className="font-mono">{selectedInvoice.reference || selectedInvoice.id.substring(0, 8)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Aluno:</span>
                        <span className="font-medium">{selectedInvoice.student_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor total:</span>
                        <span className="font-medium">R$ {Number(selectedInvoice.amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor devido:</span>
                        <span className="font-bold text-green-600">
                          R$ {Number(selectedInvoice.amount_due || selectedInvoice.amount).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Vencimento:</span>
                        <span className={`font-medium ${
                          new Date(selectedInvoice.due_date) < new Date() ? 'text-red-600' : 'text-orange-600'
                        }`}>
                          {selectedInvoice.due_date}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className={`font-medium ${
                          selectedInvoice.status === 'OVERDUE' ? 'text-red-600' : 'text-orange-600'
                        }`}>
                          {selectedInvoice.status === 'OVERDUE' ? 'Em atraso' : 'Pendente'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Valor e Método */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <Label htmlFor="amount" className="text-sm font-medium">Valor do Pagamento (R$) *</Label>
                  </div>
                  <Input 
                    id="amount" 
                    type="number" 
                    step="0.01" 
                    min={0}
                    max={selectedInvoice ? Number(selectedInvoice.amount_due || selectedInvoice.amount) : undefined}
                    placeholder="0,00"
                    {...form.register('amount')} 
                  />
                  {selectedInvoice && (
                    <p className="text-xs text-muted-foreground">
                      Valor máximo: R$ {Number(selectedInvoice.amount_due || selectedInvoice.amount).toFixed(2)} 
                      (valor devido da fatura)
                    </p>
                  )}
                  {form.formState.errors.amount && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {form.formState.errors.amount.message}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-green-600" />
                    <Label className="text-sm font-medium">Método de Pagamento *</Label>
                  </div>
                  <Select
                    value={form.watch('method')}
                    onValueChange={(v) => form.setValue('method', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o método de pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          <div className="flex items-center gap-2">
                            <span>{method.icon}</span>
                            <span>{method.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.method && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {form.formState.errors.method.message}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <Label htmlFor="paid_at" className="text-sm font-medium">Data do Pagamento</Label>
                  </div>
                  <Input 
                    id="paid_at" 
                    type="datetime-local"
                    {...form.register('paid_at')} 
                  />
                  <p className="text-xs text-muted-foreground">
                    Deixe em branco para usar a data/hora atual.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Informações Extras */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-green-600" />
                    <Label htmlFor="provider" className="text-sm font-medium">Provedor/Operadora</Label>
                  </div>
                  <Select
                    value={form.watch('provider') || ''}
                    onValueChange={(v) => form.setValue('provider', v || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o provedor (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((provider) => (
                        <SelectItem key={provider} value={provider}>
                          {provider}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Ex: Mercado Pago, PagSeguro, banco utilizado, etc.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-green-600" />
                    <Label htmlFor="provider_ref" className="text-sm font-medium">ID/Referência Externa</Label>
                  </div>
                  <Input 
                    id="provider_ref" 
                    placeholder="Ex: TXN123456789"
                    {...form.register('provider_ref')} 
                  />
                  <p className="text-xs text-muted-foreground">
                    ID da transação no provedor, número do comprovante, etc.
                  </p>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Revisão:</strong> Você está registrando um pagamento de 
                    <strong> R$ {Number(form.watch('amount')).toFixed(2)}</strong> via 
                    <strong> {PAYMENT_METHODS.find(m => m.value === form.watch('method'))?.label}</strong> 
                    {selectedInvoice && (
                      <> para a fatura <strong>{selectedInvoice.reference || selectedInvoice.id.substring(0, 8)}</strong></>
                    )}.
                  </p>
                </div>
              </div>
            )}
          </form>
        </div>

        <Separator />
        
        <DialogFooter className="flex-shrink-0">
          <div className="flex justify-between w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>

            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancelar
              </Button>
              
              {currentStep < STEPS.length ? (
                <Button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={!canGoNext()}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={!form.formState.isValid || form.formState.isSubmitting}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <CreditCard className="h-4 w-4" />
                  Registrar Pagamento
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}