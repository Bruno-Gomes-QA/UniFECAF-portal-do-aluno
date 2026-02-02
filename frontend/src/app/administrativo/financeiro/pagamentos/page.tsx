'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiltersBar } from '@/components/shared/filters-bar';
import { FiltersSelect } from '@/components/shared/filters-select';
import { Pagination } from '@/components/shared/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDateTimeBR } from '@/lib/formatters/date';
import { formatMoneyBRL } from '@/lib/formatters/money';
import { adminPaymentsApi, type PaymentSummary } from '@/features/admin/finance/payments/api';
import { CreatePaymentDialog } from '@/features/admin/finance/payments/payment-dialog';
import { DeletePaymentButton, EditPaymentSheet, SettlePaymentButton, RefundPaymentButton } from '@/features/admin/finance/payments/payment-form-sheets';
import { formatPaymentStatus } from '@/features/admin/finance/i18n';
import type { Payment } from '@/features/admin/finance/payments/types';
import { StudentAsyncFilter } from '@/components/shared/student-async-filter';
import { 
  CreditCard, Activity, Filter, Search, Lightbulb, Plus, Cog, Calendar, User, 
  DollarSign, CheckCircle2, XCircle, RefreshCw, Clock, TrendingUp, AlertTriangle
} from 'lucide-react';

export default function AdminPaymentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State
  const [data, setData] = useState<{ items: Payment[]; total: number }>({ items: [], total: 0 });
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters from URL
  const page = Number(searchParams.get('page')) || 1;
  const pageSize = Number(searchParams.get('pageSize')) || 20;
  const limit = pageSize;
  const offset = (page - 1) * pageSize;
  const status = searchParams.get('status') || '';
  const studentId = searchParams.get('student_id') || '';
  const search = searchParams.get('search') || '';

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [paymentsData, summaryData] = await Promise.all([
        adminPaymentsApi.list({ 
          limit, 
          offset, 
          status: status || undefined,
          student_id: studentId || undefined,
          search: search || undefined,
        }),
        adminPaymentsApi.summary(studentId ? { student_id: studentId } : undefined),
      ]);
      setData(paymentsData);
      setSummary(summaryData);
    } catch (err: any) {
      console.error('Falha ao carregar pagamentos:', err);
      setError(err.message || 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, [limit, offset, status, studentId, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const clearFilters = () => {
    router.push('/administrativo/financeiro/pagamentos');
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const searchValue = formData.get('search') as string;
    const statusValue = formData.get('status') as string;
    const studentIdValue = formData.get('student_id') as string;
    
    const params = new URLSearchParams();
    if (searchValue) params.set('search', searchValue);
    if (statusValue) params.set('status', statusValue);
    if (studentIdValue) params.set('student_id', studentIdValue);
    
    router.push(`?${params.toString()}`);
  };

  const statusOptions = [
    { value: 'AUTHORIZED', label: formatPaymentStatus('AUTHORIZED') },
    { value: 'SETTLED', label: formatPaymentStatus('SETTLED') },
    { value: 'FAILED', label: formatPaymentStatus('FAILED') },
    { value: 'REFUNDED', label: formatPaymentStatus('REFUNDED') },
  ];

  const getStatusBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'SETTLED':
        return <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" />{formatPaymentStatus(paymentStatus)}</Badge>;
      case 'FAILED':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{formatPaymentStatus(paymentStatus)}</Badge>;
      case 'REFUNDED':
        return <Badge variant="secondary" className="gap-1"><RefreshCw className="h-3 w-3" />{formatPaymentStatus(paymentStatus)}</Badge>;
      default:
        return <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" />{formatPaymentStatus(paymentStatus)}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com gradiente - Padrão Users */}
      <div className="rounded-xl border bg-gradient-to-br from-card to-secondary/5 p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <CreditCard className="h-32 w-32 text-secondary" />
        </div>
        
        <div className="space-y-1 relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Pagamentos</h1>
          <p className="text-muted-foreground">Acompanhamento e gestão de recebimentos.</p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Badge variant="secondary" className="h-10 px-4 gap-2 border-primary/20 shadow-sm font-semibold bg-background/80 backdrop-blur-md text-primary ring-1 ring-primary/10">
            <Activity className="h-4 w-4 text-secondary animate-pulse" />
            {data.total} pagamentos
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
                  Informações sobre o gerenciamento de pagamentos.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 text-sm text-muted-foreground/90 border-t border-border/50">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                    <Clock className="h-3.5 w-3.5 text-yellow-600" />
                  </div>
                  <p>
                    Pagamentos <span className="font-bold text-yellow-600 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">Autorizados</span> ainda precisam ser compensados para confirmar o recebimento.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <p>
                    Use <span className="font-bold text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">Liquidar</span> para confirmar a compensação de um pagamento autorizado.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <p>
                    <span className="font-bold text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">Estornar</span> reverte um pagamento liquidado e atualiza automaticamente a fatura.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <CreatePaymentDialog 
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

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-yellow-200 dark:border-yellow-900 bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950/30 dark:to-yellow-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Autorizados</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                {formatMoneyBRL(summary.total_authorized)}
              </div>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                {summary.count_authorized} pagamento{summary.count_authorized !== 1 ? 's' : ''} aguardando
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-900 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800 dark:text-green-200">Liquidados</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                {formatMoneyBRL(summary.total_settled)}
              </div>
              <p className="text-xs text-green-600 dark:text-green-400">
                {summary.count_settled} pagamento{summary.count_settled !== 1 ? 's' : ''} confirmado{summary.count_settled !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-900 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-800 dark:text-red-200">Falhos</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                {formatMoneyBRL(summary.total_failed)}
              </div>
              <p className="text-xs text-red-600 dark:text-red-400">
                {summary.count_failed} pagamento{summary.count_failed !== 1 ? 's' : ''} com erro
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/30 dark:to-slate-900/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-800 dark:text-slate-200">Estornados</CardTitle>
              <RefreshCw className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {formatMoneyBRL(summary.total_refunded)}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {summary.count_refunded} pagamento{summary.count_refunded !== 1 ? 's' : ''} devolvido{summary.count_refunded !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <FiltersBar>
        <TooltipProvider>
          <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4 w-full">
            <div className="grid flex-1 gap-2 min-w-[200px]">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Aluno</Label>
              </div>
              <StudentAsyncFilter
                name="student_id"
                defaultValue={studentId}
                placeholder="Buscar aluno..."
                allLabel="Todos os alunos"
              />
            </div>

            <div className="grid gap-2 min-w-[150px]">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="search" className="font-medium">Buscar</Label>
              </div>
              <Input 
                id="search" 
                name="search" 
                placeholder="Referência da fatura..." 
                defaultValue={search} 
                className="h-9"
              />
            </div>

            <div className="grid gap-2 min-w-[120px]">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Situação</Label>
              </div>
              <FiltersSelect name="status" defaultValue={status} allLabel="Todas" options={statusOptions} />
            </div>

            <Button type="submit" className="sm:ml-auto h-9 gap-2 shadow-sm">
              <Filter className="h-3.5 w-3.5" />
              Filtrar
            </Button>
            <Button type="button" variant="ghost" className="h-9" onClick={clearFilters}>
              Limpar
            </Button>
          </form>
        </TooltipProvider>
      </FiltersBar>

      {/* Tabela */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-muted-foreground bg-destructive/5 flex flex-col items-center gap-2">
            <CreditCard className="h-8 w-8 text-destructive/50 mb-2" />
            <p className="font-medium text-destructive">{error}</p>
            <p className="text-sm">Tente recarregar a página ou limpar os filtros.</p>
          </div>
        ) : loading ? (
          <div className="p-8 text-center text-muted-foreground">
            <div className="animate-pulse flex flex-col items-center gap-2">
              <CreditCard className="h-8 w-8 opacity-50" />
              <p>Carregando pagamentos...</p>
            </div>
          </div>
        ) : (
          <div className="relative">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-b border-border/60">
                  <TableHead className="w-[15%] pl-6">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                      Fatura
                    </div>
                  </TableHead>
                  <TableHead className="w-[25%]">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      Aluno
                    </div>
                  </TableHead>
                  <TableHead className="w-[12%]">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                      Valor
                    </div>
                  </TableHead>
                  <TableHead className="w-[12%]">
                    <div className="flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                      Situação
                    </div>
                  </TableHead>
                  <TableHead className="w-[15%]">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      Data
                    </div>
                  </TableHead>
                  <TableHead className="w-[18%]">Método</TableHead>
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
                        <p>Nenhum pagamento encontrado.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((p) => (
                    <TableRow key={p.id} className={`group transition-colors hover:bg-muted/30 ${p.status === 'FAILED' ? 'bg-destructive/5' : ''}`}>
                      <TableCell className="pl-6 py-3">
                        <span className="font-mono text-xs font-medium">{p.invoice_reference || p.invoice_id.substring(0, 8)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium truncate">{p.student_name || '—'}</span>
                          <span className="text-xs text-muted-foreground">{p.student_ra || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{formatMoneyBRL(p.amount)}</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(p.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {p.paid_at ? (
                            <>
                              <span className="text-sm">{formatDateTimeBR(p.paid_at).split(' ')[0]}</span>
                              <span className="text-xs text-muted-foreground">{formatDateTimeBR(p.paid_at).split(' ')[1]}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{p.method || '—'}</span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {p.status === 'AUTHORIZED' && <SettlePaymentButton paymentId={p.id} />}
                          {p.status === 'SETTLED' && <RefundPaymentButton paymentId={p.id} />}
                          <EditPaymentSheet payment={p} />
                          {p.status !== 'SETTLED' && <DeletePaymentButton paymentId={p.id} />}
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
