'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AsyncCombobox } from '@/components/shared/async-combobox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

import { adminStudentsApi } from '@/features/admin/academics/students/api';
import { adminTermsApi } from '@/features/admin/academics/terms/api';
import { adminInvoicesApi, type StudentDebtSummary, type NegotiationPlanResponse, type NegotiationInstallment } from '@/features/admin/finance/invoices/api';
import { formatMoneyBRL } from '@/lib/formatters/money';
import { formatDateBR } from '@/lib/formatters/date';

import {
  ArrowLeft,
  User,
  AlertTriangle,
  Calculator,
  CreditCard,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle2,
  Loader2,
  Receipt,
  RefreshCw,
  BookOpen,
  Info,
} from 'lucide-react';

type NegotiationMode = 'renegotiation' | 'enrollment';

export default function NegotiationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStudentId = searchParams.get('student_id') || '';

  // State
  const [studentId, setStudentId] = useState(initialStudentId);
  const [studentLabel, setStudentLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [debtSummary, setDebtSummary] = useState<StudentDebtSummary | null>(null);
  const [mode, setMode] = useState<NegotiationMode | null>(null);

  // Plan state
  const [numInstallments, setNumInstallments] = useState(6);
  const [totalAmount, setTotalAmount] = useState(0);
  const [monthlyAmount, setMonthlyAmount] = useState(522.03); // Default tuition
  const [firstDueDate, setFirstDueDate] = useState('');
  const [termId, setTermId] = useState('');
  const [cancelPending, setCancelPending] = useState(true);

  // Preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<NegotiationPlanResponse | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [executing, setExecuting] = useState(false);

  // Load student options
  const loadStudents = async ({ search, offset, limit }: { search: string; offset: number; limit: number }) => {
    try {
      const result = await adminStudentsApi.list({ search, limit, offset, status: 'ACTIVE' });
      return {
        options: result.items.map((s: any) => ({
          value: s.user_id,
          label: `${s.full_name} (${s.ra})`,
          description: s.course_name,
        })),
        hasMore: result.total > offset + limit,
      };
    } catch {
      return { options: [], hasMore: false };
    }
  };

  // Load term options
  const loadTerms = async ({ search, offset, limit }: { search: string; offset: number; limit: number }) => {
    try {
      const result = await adminTermsApi.list({ search, limit, offset });
      return {
        options: result.items.map((t: any) => ({
          value: t.id,
          label: t.code,
          description: t.is_current ? '(Atual)' : undefined,
        })),
        hasMore: result.total > offset + limit,
      };
    } catch {
      return { options: [], hasMore: false };
    }
  };

  // Fetch student debt when selected
  useEffect(() => {
    if (!studentId) {
      setDebtSummary(null);
      setMode(null);
      return;
    }

    const fetchDebt = async () => {
      setLoading(true);
      try {
        const summary = await adminInvoicesApi.getStudentDebtSummary(studentId);
        setDebtSummary(summary);
        
        // Determine mode
        if (summary.count_pending > 0) {
          setMode('renegotiation');
          setTotalAmount(Number(summary.total_pending_with_fees));
        } else {
          setMode('enrollment');
          setTotalAmount(monthlyAmount * 6);
        }
        
        // Set default first due date to next month day 10
        const now = new Date();
        const nextMonth = now.getMonth() === 11 ? 0 : now.getMonth() + 1;
        const nextYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
        const defaultDate = new Date(nextYear, nextMonth, 10);
        setFirstDueDate(defaultDate.toISOString().split('T')[0]);
      } catch (err: any) {
        toast.error(err.message || 'Erro ao carregar dados do aluno');
        setDebtSummary(null);
        setMode(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDebt();
  }, [studentId, monthlyAmount]);

  // Generate preview
  const handleGeneratePreview = async () => {
    if (!studentId || !firstDueDate) {
      toast.error('Selecione um aluno e defina a data do primeiro vencimento');
      return;
    }

    setPreviewLoading(true);
    try {
      const plan = await adminInvoicesApi.previewNegotiation({
        student_id: studentId,
        total_amount: totalAmount,
        num_installments: numInstallments,
        first_due_date: firstDueDate,
        description_prefix: mode === 'renegotiation' ? 'Renegociação' : 'Mensalidade',
        cancel_pending: cancelPending && mode === 'renegotiation',
      });
      setPreview(plan);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar prévia');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Execute negotiation
  const handleExecute = async () => {
    if (!preview || !studentId) return;

    setExecuting(true);
    try {
      const result = await adminInvoicesApi.executeNegotiation({
        student_id: studentId,
        term_id: termId || null,
        installments: preview.installments,
        cancel_pending_ids: cancelPending ? preview.pending_to_cancel : [],
        fine_rate: 2,
        interest_rate: 1,
      });

      toast.success(
        `${result.total_created} faturas criadas${result.total_canceled > 0 ? ` e ${result.total_canceled} canceladas` : ''}`
      );
      
      setShowConfirmDialog(false);
      router.push('/administrativo/financeiro/faturas');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao executar negociação');
    } finally {
      setExecuting(false);
    }
  };

  // Calculate total when mode is enrollment
  useEffect(() => {
    if (mode === 'enrollment') {
      setTotalAmount(monthlyAmount * numInstallments);
    }
  }, [mode, monthlyAmount, numInstallments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/administrativo/financeiro/faturas">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Negociação de Faturas</h1>
          <p className="text-muted-foreground">
            Renegocie débitos pendentes ou gere faturas para rematrícula
          </p>
        </div>
      </div>

      {/* Step 1: Select Student */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            1. Selecionar Aluno
          </CardTitle>
          <CardDescription>
            Busque e selecione o aluno para iniciar a negociação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <AsyncCombobox
              value={studentId}
              onValueChange={(value, option) => {
                setStudentId(value);
                setStudentLabel(option?.label || '');
                setPreview(null);
              }}
              loadOptions={loadStudents}
              placeholder="Busque pelo nome ou RA..."
              searchPlaceholder="Digite para buscar..."
              emptyLabel="Nenhum aluno encontrado"
            />
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-muted-foreground">Carregando dados do aluno...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Debt Summary / Mode Selection */}
      {debtSummary && !loading && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                2. Situação Financeira
              </CardTitle>
              <CardDescription>
                Resumo da situação financeira de {debtSummary.student_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Student Info */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{debtSummary.student_name}</p>
                  <p className="text-sm text-muted-foreground">RA: {debtSummary.student_ra}</p>
                </div>
                <Badge variant={debtSummary.has_current_term_enrollment ? 'success' : 'secondary'} className="ml-auto">
                  {debtSummary.has_current_term_enrollment ? 'Matriculado' : 'Sem matrícula atual'}
                </Badge>
              </div>

              {/* Debt Summary Cards */}
              {debtSummary.count_pending > 0 ? (
                <>
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Débitos Pendentes</AlertTitle>
                    <AlertDescription>
                      O aluno possui {debtSummary.count_pending} fatura(s) pendente(s) totalizando{' '}
                      <strong>{formatMoneyBRL(debtSummary.total_pending_with_fees)}</strong> (com multa e juros).
                    </AlertDescription>
                  </Alert>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Valor Original</p>
                      <p className="text-2xl font-bold">{formatMoneyBRL(debtSummary.total_pending_amount)}</p>
                    </div>
                    <div className="p-4 border rounded-lg border-destructive/50 bg-destructive/5">
                      <p className="text-sm text-muted-foreground">Com Multa e Juros</p>
                      <p className="text-2xl font-bold text-destructive">{formatMoneyBRL(debtSummary.total_pending_with_fees)}</p>
                    </div>
                  </div>

                  {/* Pending Invoices Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Referência</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="text-right">Valor Original</TableHead>
                          <TableHead className="text-right">Valor Atual</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {debtSummary.pending_invoices.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-mono text-xs">{inv.reference}</TableCell>
                            <TableCell>{inv.description}</TableCell>
                            <TableCell>{formatDateBR(inv.due_date)}</TableCell>
                            <TableCell className="text-right">{formatMoneyBRL(inv.amount)}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatMoneyBRL(inv.amount_due)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle>Sem Débitos Pendentes</AlertTitle>
                  <AlertDescription>
                    O aluno está em dia com as obrigações financeiras. Você pode gerar faturas para rematrícula/novo semestre.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Step 3: Configure Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                3. Configurar Parcelamento
              </CardTitle>
              <CardDescription>
                {mode === 'renegotiation'
                  ? 'Defina como os débitos serão renegociados em novas parcelas'
                  : 'Configure as faturas do semestre para rematrícula'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {/* Total Amount */}
                <div className="space-y-2">
                  <Label htmlFor="totalAmount" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    Valor Total
                  </Label>
                  {mode === 'renegotiation' ? (
                    <Input
                      id="totalAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(Number(e.target.value))}
                    />
                  ) : (
                    <div className="h-10 px-3 py-2 border rounded-md bg-muted/50 flex items-center">
                      {formatMoneyBRL(totalAmount)}
                    </div>
                  )}
                  {mode === 'renegotiation' && (
                    <p className="text-xs text-muted-foreground">
                      Sugestão: {formatMoneyBRL(debtSummary.total_pending_with_fees)}
                    </p>
                  )}
                </div>

                {/* Monthly Amount (only for enrollment) */}
                {mode === 'enrollment' && (
                  <div className="space-y-2">
                    <Label htmlFor="monthlyAmount" className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      Mensalidade
                    </Label>
                    <Input
                      id="monthlyAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={monthlyAmount}
                      onChange={(e) => setMonthlyAmount(Number(e.target.value))}
                    />
                  </div>
                )}

                {/* Number of Installments */}
                <div className="space-y-2">
                  <Label htmlFor="numInstallments" className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    Parcelas
                  </Label>
                  <Input
                    id="numInstallments"
                    type="number"
                    min="1"
                    max="24"
                    value={numInstallments}
                    onChange={(e) => setNumInstallments(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Valor por parcela: {formatMoneyBRL(totalAmount / numInstallments)}
                  </p>
                </div>

                {/* First Due Date */}
                <div className="space-y-2">
                  <Label htmlFor="firstDueDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    1º Vencimento
                  </Label>
                  <Input
                    id="firstDueDate"
                    type="date"
                    value={firstDueDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFirstDueDate(e.target.value)}
                  />
                </div>

                {/* Term (optional) */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    Período (opcional)
                  </Label>
                  <AsyncCombobox
                    value={termId}
                    onValueChange={(value) => setTermId(value)}
                    loadOptions={loadTerms}
                    placeholder="Selecione..."
                    emptyLabel="Nenhum período"
                  />
                </div>
              </div>

              {/* Cancel Pending Option */}
              {mode === 'renegotiation' && debtSummary.count_pending > 0 && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <input
                    type="checkbox"
                    id="cancelPending"
                    checked={cancelPending}
                    onChange={(e) => setCancelPending(e.target.checked)}
                    className="h-4 w-4 rounded border-amber-500 text-amber-600 focus:ring-amber-500"
                  />
                  <Label htmlFor="cancelPending" className="text-amber-800 cursor-pointer">
                    Cancelar {debtSummary.count_pending} fatura(s) pendente(s) após criar novas parcelas
                  </Label>
                </div>
              )}

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleGeneratePreview} disabled={previewLoading || !firstDueDate}>
                  {previewLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Calculator className="h-4 w-4 mr-2" />
                  )}
                  Gerar Prévia
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Step 4: Preview */}
          {preview && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  4. Prévia das Faturas
                </CardTitle>
                <CardDescription>
                  Revise as faturas que serão geradas antes de confirmar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-xl font-bold text-primary">{formatMoneyBRL(preview.total_amount)}</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Parcelas</p>
                      <p className="text-xl font-bold">{preview.num_installments}x</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Valor/Parcela</p>
                      <p className="text-xl font-bold">{formatMoneyBRL(preview.installment_amount)}</p>
                    </div>
                  </div>

                  {/* Installments Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="w-20">Parcela</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.installments.map((inst) => (
                          <TableRow key={inst.installment_number}>
                            <TableCell>
                              <Badge variant="outline">
                                {inst.installment_number}/{preview.num_installments}
                              </Badge>
                            </TableCell>
                            <TableCell>{inst.description}</TableCell>
                            <TableCell>{formatDateBR(inst.due_date)}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatMoneyBRL(inst.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Invoices to Cancel */}
                  {cancelPending && preview.pending_to_cancel.length > 0 && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>Faturas a Cancelar</AlertTitle>
                      <AlertDescription>
                        {preview.pending_to_cancel.length} fatura(s) pendente(s) serão canceladas ao confirmar.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
              <CardFooter className="justify-end gap-2">
                <Button variant="outline" onClick={() => setPreview(null)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recalcular
                </Button>
                <Button onClick={() => setShowConfirmDialog(true)}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmar e Gerar Faturas
                </Button>
              </CardFooter>
            </Card>
          )}
        </>
      )}

      {/* Confirm Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Negociação</DialogTitle>
            <DialogDescription>
              Você está prestes a criar {preview?.num_installments} nova(s) fatura(s)
              {cancelPending && preview && preview.pending_to_cancel.length > 0 && (
                <> e cancelar {preview.pending_to_cancel.length} fatura(s) pendente(s)</>
              )}.
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aluno:</span>
                <span className="font-medium">{debtSummary?.student_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-medium">{preview && formatMoneyBRL(preview.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Parcelas:</span>
                <span className="font-medium">{preview?.num_installments}x de {preview && formatMoneyBRL(preview.installment_amount)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={executing}>
              Cancelar
            </Button>
            <Button onClick={handleExecute} disabled={executing}>
              {executing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
