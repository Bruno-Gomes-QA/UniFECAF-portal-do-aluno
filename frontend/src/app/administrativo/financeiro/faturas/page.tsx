import { FiltersBar } from '@/components/shared/filters-bar';
import { FiltersForm } from '@/components/shared/filters-form';
import { FiltersSelect } from '@/components/shared/filters-select';
import { StudentAsyncFilter } from '@/components/shared/student-async-filter';
import { Pagination } from '@/components/shared/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getPagination } from '@/lib/pagination';
import { formatDateBR } from '@/lib/formatters/date';
import { formatMoneyBRL } from '@/lib/formatters/money';
import { adminInvoicesServer } from '@/features/admin/finance/invoices/api.server';
import { CreateInvoiceDialog } from '@/features/admin/finance/invoices/invoice-dialog';
import { DeleteInvoiceButton, EditInvoiceSheet, MarkPaidButton, CancelInvoiceButton } from '@/features/admin/finance/invoices/invoice-form-sheets';
import { adminStudentsServer } from '@/features/admin/academics/students/api.server';
import { adminTermsServer } from '@/features/admin/academics/terms/api.server';
import { formatInvoiceStatus } from '@/features/admin/finance/i18n';
import type { Invoice } from '@/features/admin/finance/invoices/types';
import { Wallet, Activity, Filter, Search, Lightbulb, Plus, Cog, Calendar, User, DollarSign, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';

// Helper to format date as YYYY-MM-DD
function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Get default date range: 3 months back from today
function getDefaultDateRange(): { from: string; to: string } {
  const today = new Date();
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return {
    from: formatDateISO(threeMonthsAgo),
    to: formatDateISO(today),
  };
}

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { page, pageSize, limit, offset } = getPagination(searchParams);
  const studentId = Array.isArray(searchParams.student_id) ? searchParams.student_id[0] : searchParams.student_id;
  const status = Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status;
  const search = Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search;
  
  // Use default date range (3 months) if no dates provided
  const defaultDates = getDefaultDateRange();
  const dueDateFromParam = Array.isArray(searchParams.due_date_from) ? searchParams.due_date_from[0] : searchParams.due_date_from;
  const dueDateToParam = Array.isArray(searchParams.due_date_to) ? searchParams.due_date_to[0] : searchParams.due_date_to;
  const dueDateFrom = dueDateFromParam ?? defaultDates.from;
  const dueDateTo = dueDateToParam ?? defaultDates.to;

  let data: { items: Invoice[]; total: number } = { items: [], total: 0 };
  let summary = { total_pending: 0, total_overdue: 0, total_paid: 0, count_pending: 0, count_overdue: 0, count_paid: 0 };
  let terms: { items: any[]; total: number } = { items: [], total: 0 };
  let selectedStudent: { user_id: string; full_name: string; ra: string } | null = null;
  let error: string | null = null;

  try {
    const [dataResult, summaryResult, termsResult] = await Promise.all([
      adminInvoicesServer.list({
        limit,
        offset,
        student_id: studentId || undefined,
        status: status || undefined,
        due_date_from: dueDateFrom || undefined,
        due_date_to: dueDateTo || undefined,
        search: search || undefined,
      }),
      adminInvoicesServer.summary({
        student_id: studentId || undefined,
        due_date_from: dueDateFrom || undefined,
        due_date_to: dueDateTo || undefined,
      }),
      adminTermsServer.list({ limit: 50, offset: 0 }),
    ]);
    data = dataResult;
    summary = summaryResult as typeof summary;
    terms = termsResult;

    // Se há um student_id selecionado, buscar os dados do aluno para exibir o label
    if (studentId) {
      const studentResult = await adminStudentsServer.list({ limit: 1, offset: 0, user_id: studentId });
      if (studentResult.items.length > 0) {
        selectedStudent = studentResult.items[0];
      }
    }
  } catch (err: any) {
    console.error('Falha ao carregar faturas:', err);
    error = err.message || 'Erro ao carregar dados.';
  }

  const termOptions = terms.items.map((t: any) => ({ id: t.id, label: t.code }));
  const selectedStudentLabel = selectedStudent ? `${selectedStudent.full_name} (${selectedStudent.ra})` : undefined;

  const statusOptions = [
    { value: 'PENDING', label: formatInvoiceStatus('PENDING') },
    { value: 'PAID', label: formatInvoiceStatus('PAID') },
    { value: 'OVERDUE', label: formatInvoiceStatus('OVERDUE') },
    { value: 'CANCELED', label: formatInvoiceStatus('CANCELED') },
  ];

  const getStatusBadge = (invoiceStatus: string) => {
    switch (invoiceStatus) {
      case 'PAID':
        return <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" />{formatInvoiceStatus(invoiceStatus)}</Badge>;
      case 'OVERDUE':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{formatInvoiceStatus(invoiceStatus)}</Badge>;
      case 'CANCELED':
        return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" />{formatInvoiceStatus(invoiceStatus)}</Badge>;
      default:
        return <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" />{formatInvoiceStatus(invoiceStatus)}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com gradiente - Padrão Users */}
      <div className="rounded-xl border bg-gradient-to-br from-card to-secondary/5 p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Wallet className="h-32 w-32 text-secondary" />
        </div>
        
        <div className="space-y-1 relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Faturas</h1>
          <p className="text-muted-foreground">Controle de cobranças e vencimentos.</p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Badge variant="secondary" className="h-10 px-4 gap-2 border-primary/20 shadow-sm font-semibold bg-background/80 backdrop-blur-md text-primary ring-1 ring-primary/10">
            <Activity className="h-4 w-4 text-secondary animate-pulse" />
            {data.total} faturas
          </Badge>
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-secondary border-none shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 group active:scale-95"
              >
                <Lightbulb className="h-5 w-5 fill-secondary/10 group-hover:fill-secondary/20 transition-all" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-primary font-bold">
                  <Lightbulb className="h-6 w-6 text-secondary fill-secondary/10" />
                  Dica Rápida
                </DialogTitle>
                <DialogDescription>
                  Informações sobre o gerenciamento de faturas.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 text-sm text-muted-foreground/90 border-t border-border/50">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                    <Clock className="h-3.5 w-3.5 text-yellow-600" />
                  </div>
                  <p>
                    Faturas <span className="font-bold text-yellow-600 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">Pendentes</span> mudam automaticamente para &quot;Em Atraso&quot; após o vencimento.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  </div>
                  <p>
                    Faturas <span className="font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded border border-destructive/20">Em Atraso</span> aplicam multa de 2% e juros de 1% ao mês automaticamente.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <p>
                    Use <span className="font-bold text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">Marcar Paga</span> para baixa manual. Um pagamento será criado automaticamente.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button 
            asChild
            variant="outline" 
            className="h-10 gap-2 shadow-sm"
          >
            <Link href="/administrativo/financeiro/faturas/negociacao">
              <DollarSign className="h-4 w-4" />
              Negociação
            </Link>
          </Button>
          <CreateInvoiceDialog 
            trigger={
              <Button 
                size="icon" 
                className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-secondary border-none shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 active:scale-95 group"
              >
                <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
              </Button>
            }
          />
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm border-l-4 border-l-yellow-500">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pendentes</p>
              <p className="text-xl font-bold text-yellow-600">{formatMoneyBRL(summary.total_pending)}</p>
              <p className="text-xs text-muted-foreground">{summary.count_pending} faturas</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm border-l-4 border-l-destructive">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Em Atraso</p>
              <p className="text-xl font-bold text-destructive">{formatMoneyBRL(summary.total_overdue)}</p>
              <p className="text-xs text-muted-foreground">{summary.count_overdue} faturas</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm border-l-4 border-l-green-500">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pagas</p>
              <p className="text-xl font-bold text-green-600">{formatMoneyBRL(summary.total_paid)}</p>
              <p className="text-xs text-muted-foreground">{summary.count_paid} faturas</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm border-l-4 border-l-primary">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Geral</p>
              <p className="text-xl font-bold text-primary">{formatMoneyBRL(Number(summary.total_pending) + Number(summary.total_overdue) + Number(summary.total_paid))}</p>
              <p className="text-xs text-muted-foreground">{data.total} faturas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <FiltersBar>
        <TooltipProvider>
          <FiltersForm>
            <div className="grid flex-1 gap-2">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="search" className="font-medium">Buscar</Label>
              </div>
              <Input 
                id="search" 
                name="search" 
                placeholder="Referência ou descrição..." 
                defaultValue={search || ''} 
                className="h-9"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Aluno</Label>
              </div>
              <StudentAsyncFilter 
                name="student_id" 
                defaultValue={studentId} 
                defaultLabel={selectedStudentLabel}
                allLabel="Todos os alunos" 
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Situação</Label>
              </div>
              <FiltersSelect name="status" defaultValue={status} allLabel="Todas" options={statusOptions} />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="due_date_from" className="font-medium">De</Label>
              </div>
              <Input id="due_date_from" name="due_date_from" type="date" defaultValue={dueDateFrom || ''} className="h-9" />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="due_date_to" className="font-medium">Até</Label>
              </div>
              <Input id="due_date_to" name="due_date_to" type="date" defaultValue={dueDateTo || ''} className="h-9" />
            </div>

            <Button type="submit" className="sm:ml-auto h-9 gap-2 shadow-sm">
              <Filter className="h-3.5 w-3.5" />
              Filtrar
            </Button>
            <Button asChild variant="ghost" className="h-9">
              <Link href="/administrativo/financeiro/faturas">Limpar</Link>
            </Button>
          </FiltersForm>
        </TooltipProvider>
      </FiltersBar>

      {/* Tabela */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-muted-foreground bg-destructive/5 flex flex-col items-center gap-2">
            <Wallet className="h-8 w-8 text-destructive/50 mb-2" />
            <p className="font-medium text-destructive">{error}</p>
            <p className="text-sm">Tente recarregar a página ou limpar os filtros.</p>
          </div>
        ) : (
          <div className="relative">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-b border-border/60">
                  <TableHead className="w-[12%] pl-6">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                      Referência
                    </div>
                  </TableHead>
                  <TableHead className="w-[25%]">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      Aluno
                    </div>
                  </TableHead>
                  <TableHead className="w-[18%]">Descrição</TableHead>
                  <TableHead className="w-[10%]">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      Vencimento
                    </div>
                  </TableHead>
                  <TableHead className="w-[10%]">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                      Valor
                    </div>
                  </TableHead>
                  <TableHead className="w-[10%]">
                    <div className="flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                      Situação
                    </div>
                  </TableHead>
                  <TableHead className="text-right pr-6">
                    <Cog className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Search className="h-8 w-8 opacity-20" />
                        <p>Nenhuma fatura encontrada.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((i) => (
                    <TableRow key={i.id} className={`group transition-colors hover:bg-muted/30 ${i.status === 'OVERDUE' ? 'bg-destructive/5' : ''}`}>
                      <TableCell className="pl-6 py-3">
                        <span className="font-mono text-xs font-medium">{i.reference}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium truncate">{i.student_name || '—'}</span>
                          <span className="text-xs text-muted-foreground">{i.student_ra || i.student_id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="truncate">{i.description}</span>
                          {i.installment_number && i.installment_total && (
                            <span className="text-xs text-muted-foreground">Parcela {i.installment_number}/{i.installment_total}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDateBR(i.due_date)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{formatMoneyBRL(i.amount)}</span>
                          {i.status === 'OVERDUE' && Number(i.amount_due) > Number(i.amount) && (
                            <span className="text-xs text-destructive">+ {formatMoneyBRL(Number(i.amount_due) - Number(i.amount))}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(i.status)}</TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {(i.status === 'PENDING' || i.status === 'OVERDUE') && (
                            <>
                              <MarkPaidButton invoiceId={i.id} />
                              <CancelInvoiceButton invoiceId={i.id} reference={i.reference} />
                            </>
                          )}
                          <EditInvoiceSheet invoice={i} terms={termOptions} />
                          {i.payments_count === 0 && i.status !== 'PAID' && (
                            <DeleteInvoiceButton invoiceId={i.id} reference={i.reference} />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="border-t p-4">
              <Pagination page={page} pageSize={pageSize} total={data.total} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
