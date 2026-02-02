'use client';

import { ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { adminInvoicesApi } from '@/features/admin/finance/invoices/api';
import { adminStudentsApi } from '@/features/admin/academics/students/api';
import { adminTermsApi } from '@/features/admin/academics/terms/api';
import { AsyncCombobox } from '@/components/shared/async-combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User2, 
  Calendar, 
  DollarSign, 
  Receipt, 
  Settings2, 
  ChevronRight,
  ChevronLeft,
  UserCheck,
  BookOpen,
  FileText,
  CreditCard,
  AlertTriangle,
  Percent
} from 'lucide-react';

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

type CreateFormData = z.infer<typeof createSchema>;

const STEPS = [
  {
    id: 1,
    title: 'Aluno e Período',
    description: 'Selecione o aluno e período acadêmico',
    icon: UserCheck,
    fields: ['student_id', 'term_id']
  },
  {
    id: 2,
    title: 'Detalhes da Fatura',
    description: 'Informações sobre vencimento e valor',
    icon: FileText,
    fields: ['description', 'due_date', 'amount']
  },
  {
    id: 3,
    title: 'Configurações',
    description: 'Multa, juros e parcelas (opcional)',
    icon: Settings2,
    fields: ['fine_rate', 'interest_rate', 'installment_number', 'installment_total']
  }
];

export function CreateInvoiceDialog({ trigger }: { trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');
  const router = useRouter();

  const form = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      student_id: '',
      term_id: undefined,
      description: 'Mensalidade',
      due_date: '',
      amount: 0,
      fine_rate: 2,
      interest_rate: 1,
      installment_number: undefined,
      installment_total: undefined,
    },
  });

  const onSubmit = async (values: CreateFormData) => {
    try {
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
      setOpen(false);
      setCurrentStep(1);
      form.reset();
      router.refresh();
    } catch (error) {
      toast.error('Erro ao criar fatura');
    }
  };

  const loadStudents = async ({ search, offset, limit }: { search: string; offset: number; limit: number }) => {
    try {
      const result = await adminStudentsApi.list({ 
        search,
        limit, 
        offset 
      });
      return {
        options: result.items.map(student => ({
          value: student.user_id,
          label: `${student.full_name} (${student.ra})`,
          description: `Status: ${student.status} • Progresso: ${student.total_progress}%`
        })),
        hasMore: result.total > offset + limit
      };
    } catch (error) {
      return { options: [], hasMore: false };
    }
  };

  const loadTerms = async ({ search, offset, limit }: { search: string; offset: number; limit: number }) => {
    try {
      const result = await adminTermsApi.list({ 
        search,
        limit, 
        offset 
      });
      return {
        options: result.items.map(term => ({
          value: term.id,
          label: term.code,
          description: `${term.start_date} - ${term.end_date}`
        })),
        hasMore: result.total > offset + limit
      };
    } catch (error) {
      return { options: [], hasMore: false };
    }
  };

  const canGoNext = () => {
    const currentStepFields = STEPS.find(step => step.id === currentStep)?.fields || [];
    const values = form.getValues();
    
    if (currentStep === 1) {
      return values.student_id; // student_id é obrigatório
    }
    if (currentStep === 2) {
      return values.description && values.due_date && values.amount > 0;
    }
    return true; // Step 3 todos os campos são opcionais
  };

  const resetForm = () => {
    setOpen(false);
    setCurrentStep(1);
    setSelectedStudent('');
    setSelectedStudentName('');
    form.reset();
  };

  const currentStepData = STEPS.find(step => step.id === currentStep);
  const StepIcon = currentStepData?.icon || FileText;

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      else setOpen(open);
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Receipt className="h-4 w-4" />
            Nova Fatura
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <StepIcon className="h-5 w-5 text-primary" />
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
                    ? 'bg-primary text-primary-foreground' 
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
            {/* Step 1: Aluno e Período */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User2 className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-medium">Aluno *</Label>
                  </div>
                  <AsyncCombobox
                    value={form.watch('student_id')}
                    onValueChange={(value, option) => {
                      form.setValue('student_id', value);
                      setSelectedStudent(value);
                      if (option) setSelectedStudentName(option.label);
                    }}
                    loadOptions={loadStudents}
                    placeholder="Busque pelo nome ou RA..."
                    searchPlaceholder="Digite para buscar alunos..."
                    emptyLabel="Nenhum aluno encontrado"
                    className="w-full"
                  />
                  {form.formState.errors.student_id && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {form.formState.errors.student_id.message}
                    </p>
                  )}
                  
                  {selectedStudent && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <UserCheck className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-900">Aluno selecionado:</span>
                        <span className="text-green-700">{selectedStudentName}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-medium">Período (opcional)</Label>
                  </div>
                  <AsyncCombobox
                    value={form.watch('term_id') || ''}
                    onValueChange={(value) => form.setValue('term_id', value || undefined)}
                    loadOptions={loadTerms}
                    placeholder="Selecione um período..."
                    searchPlaceholder="Digite para buscar períodos..."
                    emptyLabel="Nenhum período encontrado"
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    O período é opcional e pode ser usado para organizar faturas.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Detalhes */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <Label htmlFor="description" className="text-sm font-medium">Descrição *</Label>
                  </div>
                  <Textarea 
                    id="description" 
                    placeholder="Ex: Mensalidade de Março 2026"
                    className="resize-none"
                    {...form.register('description')} 
                  />
                  {form.formState.errors.description && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {form.formState.errors.description.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <Label htmlFor="due_date" className="text-sm font-medium">Vencimento *</Label>
                    </div>
                    <Input 
                      id="due_date" 
                      type="date" 
                      {...form.register('due_date')} 
                    />
                    {form.formState.errors.due_date && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {form.formState.errors.due_date.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <Label htmlFor="amount" className="text-sm font-medium">Valor (R$) *</Label>
                    </div>
                    <Input 
                      id="amount" 
                      type="number" 
                      step="0.01" 
                      min={0}
                      placeholder="0,00"
                      {...form.register('amount')} 
                    />
                    {form.formState.errors.amount && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {form.formState.errors.amount.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Configurações */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-orange-500" />
                      <Label htmlFor="fine_rate" className="text-sm font-medium">Multa (%)</Label>
                    </div>
                    <Input 
                      id="fine_rate" 
                      type="number" 
                      step="0.1" 
                      min={0} 
                      max={100}
                      placeholder="2.0"
                      {...form.register('fine_rate')} 
                    />
                    <p className="text-xs text-muted-foreground">
                      Aplicada após vencimento (padrão 2%)
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-red-500" />
                      <Label htmlFor="interest_rate" className="text-sm font-medium">Juros ao mês (%)</Label>
                    </div>
                    <Input 
                      id="interest_rate" 
                      type="number" 
                      step="0.1" 
                      min={0} 
                      max={100}
                      placeholder="1.0"
                      {...form.register('interest_rate')} 
                    />
                    <p className="text-xs text-muted-foreground">
                      Aplicado mensalmente após vencimento (padrão 1%)
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-blue-500" />
                      <Label htmlFor="installment_number" className="text-sm font-medium">Parcela nº</Label>
                    </div>
                    <Input 
                      id="installment_number" 
                      type="number" 
                      min={1}
                      placeholder="1"
                      {...form.register('installment_number')} 
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-blue-500" />
                      <Label htmlFor="installment_total" className="text-sm font-medium">De quantas</Label>
                    </div>
                    <Input 
                      id="installment_total" 
                      type="number" 
                      min={1}
                      placeholder="12"
                      {...form.register('installment_total')} 
                    />
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Dica:</strong> Os campos de parcela são opcionais e servem apenas para organização.
                    Use quando a fatura faz parte de um parcelamento (ex: 3/12).
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
                  className="gap-2"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={!form.formState.isValid || form.formState.isSubmitting}
                  className="gap-2"
                >
                  <Receipt className="h-4 w-4" />
                  Criar Fatura
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}