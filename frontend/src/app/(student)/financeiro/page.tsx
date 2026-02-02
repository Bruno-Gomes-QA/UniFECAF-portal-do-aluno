import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FiltersBar } from '@/components/shared/filters-bar';
import { FiltersForm } from '@/components/shared/filters-form';
import { FiltersSelect } from '@/components/shared/filters-select';
import { Pagination } from '@/components/shared/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiServer } from '@/lib/api/server';
import { API_V1 } from '@/lib/api/routes';
import { getPagination } from '@/lib/pagination';
import type { PaginatedResponse } from '@/types/api';
import type { MeTermOption } from '@/types/portal';
import { formatDateBR } from '@/lib/formatters/date';
import { formatMoneyBRL } from '@/lib/formatters/money';
import { PayMockButton } from '@/features/student/finance/pay-mock-button';
import { requireRole } from '@/lib/auth/server';
import { formatInvoiceStatus, type InvoiceStatus } from '@/features/admin/finance/i18n';
import { 
  Wallet, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Lightbulb,
  TrendingDown,
  CreditCard,
  CalendarDays,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type MeInvoiceInfo = {
  id: string;
  description: string;
  due_date: string;
  amount: number | string;
  status: string;
  is_overdue: boolean;
};

type MeFinancialSummaryResponse = {
  next_invoice: MeInvoiceInfo | null;
  last_paid_invoice: MeInvoiceInfo | null;
  total_pending: number | string;
  total_overdue: number | string;
  has_pending: boolean;
  has_overdue: boolean;
};

function TipsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="size-10 shrink-0 rounded-full border-secondary/30 bg-secondary/10 text-secondary shadow-[0_0_12px_rgba(37,185,121,0.25)] hover:bg-secondary/20 hover:text-secondary"
        >
          <Lightbulb className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-secondary" />
            Informações Financeiras
          </DialogTitle>
          <DialogDescription>
            Dicas importantes sobre seus pagamentos
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-4">
            <h4 className="font-medium text-secondary">💳 Formas de Pagamento</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Boletos podem ser pagos em qualquer banco, lotérica ou via PIX usando o código de barras.
            </p>
          </div>
          <div className="rounded-lg border border-warning/20 bg-warning/5 p-4">
            <h4 className="font-medium text-warning">⚠️ Atrasos</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Boletos em atraso geram multa de <strong>2%</strong> + juros de <strong>1% ao mês</strong>.
            </p>
          </div>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <h4 className="font-medium text-destructive">🔒 Bloqueio</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Débitos em atraso por mais de 30 dias podem bloquear o acesso ao portal e à matrícula.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default async function StudentFinancePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  await requireRole('STUDENT');

  const { page, pageSize, limit, offset } = getPagination(searchParams);
  const status = Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status;
  const termId = Array.isArray(searchParams.term_id) ? searchParams.term_id[0] : searchParams.term_id;

  // Build query string for invoices
  const invoiceParams = new URLSearchParams();
  invoiceParams.set('limit', String(limit));
  invoiceParams.set('offset', String(offset));
  if (status) invoiceParams.set('status', status);
  if (termId) invoiceParams.set('term_id', termId);

  const [data, summary, terms] = await Promise.all([
    apiServer.get<PaginatedResponse<MeInvoiceInfo>>(
      `${API_V1.me.financialInvoices}?${invoiceParams.toString()}`,
      { next: { revalidate: 15 } }
    ),
    apiServer.get<MeFinancialSummaryResponse>(API_V1.me.financialSummary, { next: { revalidate: 15 } }),
    apiServer.get<MeTermOption[]>(API_V1.me.terms, { next: { revalidate: 300 } }),
  ]);

  const pendingCount = data.items.filter(i => i.status === 'PENDING').length;
  const overdueCount = data.items.filter(i => i.is_overdue).length;
  const currentTerm = terms.find(t => t.is_current);
  const selectedTerm = termId ? terms.find(t => t.id === termId) : null;
  const isFilteringByTerm = !!termId;

  // Build term options for the select
  const termOptions = [
    { value: '', label: 'Todos os períodos' },
    ...terms.map(t => ({
      value: t.id,
      label: t.is_current ? `${t.code} (Atual)` : t.code,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-secondary/5 p-6 shadow-sm">
        <Wallet className="pointer-events-none absolute -right-8 -top-8 size-48 rotate-12 text-secondary opacity-5" />
        
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-secondary" />
              <span className="text-sm font-medium text-secondary">Área Financeira</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Financeiro</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie seus boletos e pagamentos
            </p>
          </div>

          <div className="flex items-center gap-2">
            {summary.has_overdue ? (
              <Badge 
                variant="destructive" 
                className="h-10 gap-2 px-4 font-semibold shadow-sm"
              >
                <AlertTriangle className="size-4" />
                {formatMoneyBRL(summary.total_overdue)} em atraso
              </Badge>
            ) : summary.has_pending ? (
              <Badge 
                variant="outline" 
                className="h-10 gap-2 border-warning/30 bg-warning/10 px-4 font-semibold text-warning shadow-sm"
              >
                <Clock className="size-4" />
                {formatMoneyBRL(summary.total_pending)} pendente
              </Badge>
            ) : (
              <Badge 
                variant="outline" 
                className="h-10 gap-2 border-secondary/30 bg-secondary/10 px-4 font-semibold text-secondary shadow-sm"
              >
                <CheckCircle2 className="size-4" />
                Tudo em dia!
              </Badge>
            )}
            <TipsDialog />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden border-l-4 border-l-warning">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-warning/10">
              <Clock className="size-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Pendente</p>
              <p className="text-xl font-bold">{formatMoneyBRL(summary.total_pending)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={`overflow-hidden border-l-4 ${summary.has_overdue ? 'border-l-destructive' : 'border-l-secondary'}`}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className={`flex size-12 items-center justify-center rounded-xl ${summary.has_overdue ? 'bg-destructive/10' : 'bg-secondary/10'}`}>
              <TrendingDown className={`size-6 ${summary.has_overdue ? 'text-destructive' : 'text-secondary'}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Em Atraso</p>
              <p className={`text-xl font-bold ${summary.has_overdue ? 'text-destructive' : ''}`}>
                {formatMoneyBRL(summary.total_overdue)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-primary">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
              <CreditCard className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Boletos Pendentes</p>
              <p className="text-xl font-bold">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-secondary">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-secondary/10 shadow-[0_0_12px_rgba(37,185,121,0.2)]">
              <CheckCircle2 className="size-6 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className={`text-lg font-bold ${summary.has_overdue ? 'text-destructive' : summary.has_pending ? 'text-warning' : 'text-secondary'}`}>
                {summary.has_overdue ? 'Irregular' : summary.has_pending ? 'Pendente' : 'Regular'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Wallet className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Boletos</CardTitle>
              <CardDescription>Filtrar e gerenciar seus boletos</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <FiltersBar>
            <FiltersForm>
              <div className="grid gap-2">
                <Label>Período</Label>
                <FiltersSelect
                  name="term_id"
                  defaultValue={termId || ''}
                  allLabel="Todos os períodos"
                  options={terms.map(t => ({
                    value: t.id,
                    label: t.is_current ? `${t.code} (Atual)` : t.code,
                  }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <FiltersSelect
                  name="status"
                  defaultValue={status || ''}
                  allLabel="Todos"
                  options={[
                    { value: 'PENDING', label: formatInvoiceStatus('PENDING') },
                    { value: 'PAID', label: formatInvoiceStatus('PAID') },
                    { value: 'CANCELED', label: formatInvoiceStatus('CANCELED') },
                  ]}
                />
              </div>
              <Button type="submit" className="sm:ml-auto">
                Aplicar
              </Button>
            </FiltersForm>
          </FiltersBar>

          {/* Historical notice */}
          {isFilteringByTerm && selectedTerm && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              <CalendarDays className="size-4" />
              <span>Exibindo boletos do período <strong>{selectedTerm.code}</strong></span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card className="overflow-hidden">
        {/* Desktop Table View - hidden on mobile */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Vencimento</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-5 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                        <Wallet className="size-7 text-muted-foreground" />
                      </div>
                      <p className="font-medium text-muted-foreground">Nenhum boleto encontrado</p>
                      <p className="text-sm text-muted-foreground">Tente ajustar os filtros</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((i) => (
                  <TableRow key={i.id} className="group">
                    <TableCell className="pl-5">
                      <span className={i.is_overdue ? 'text-destructive font-medium' : ''}>
                        {formatDateBR(i.due_date)}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium group-hover:text-primary transition-colors">
                      {i.description}
                    </TableCell>
                    <TableCell className="font-semibold">{formatMoneyBRL(i.amount)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          i.status === 'PAID'
                            ? 'outline'
                            : i.is_overdue
                              ? 'destructive'
                              : 'warning'
                        }
                        className={
                          i.status === 'PAID' 
                            ? 'border-secondary/30 bg-secondary/10 text-secondary gap-1' 
                            : 'gap-1'
                        }
                      >
                        {i.status === 'PAID' && <CheckCircle2 className="size-3" />}
                        {i.is_overdue && <AlertTriangle className="size-3" />}
                        {i.status === 'PENDING' && !i.is_overdue && <Clock className="size-3" />}
                        {formatInvoiceStatus((i.is_overdue ? 'OVERDUE' : i.status) as InvoiceStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      {i.status === 'PENDING' ? <PayMockButton invoiceId={i.id} /> : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden divide-y">
          {data.items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 px-4 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                <Wallet className="size-7 text-muted-foreground" />
              </div>
              <p className="font-medium text-muted-foreground">Nenhum boleto encontrado</p>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros</p>
            </div>
          ) : (
            data.items.map((i) => (
              <div key={i.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-sm">{i.description}</p>
                    <p className={`text-xs ${i.is_overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      Vencimento: {formatDateBR(i.due_date)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      i.status === 'PAID'
                        ? 'outline'
                        : i.is_overdue
                          ? 'destructive'
                          : 'warning'
                    }
                    className={
                      i.status === 'PAID' 
                        ? 'border-secondary/30 bg-secondary/10 text-secondary gap-1 shrink-0' 
                        : 'gap-1 shrink-0'
                    }
                  >
                    {i.status === 'PAID' && <CheckCircle2 className="size-3" />}
                    {i.is_overdue && <AlertTriangle className="size-3" />}
                    {i.status === 'PENDING' && !i.is_overdue && <Clock className="size-3" />}
                    {formatInvoiceStatus((i.is_overdue ? 'OVERDUE' : i.status) as InvoiceStatus)}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t">
                  <p className="text-lg font-bold">{formatMoneyBRL(i.amount)}</p>
                  {i.status === 'PENDING' && (
                    <PayMockButton invoiceId={i.id} />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t p-4 bg-muted/30">
          <Pagination page={page} pageSize={pageSize} total={data.total} />
        </div>
      </Card>
    </div>
  );
}
