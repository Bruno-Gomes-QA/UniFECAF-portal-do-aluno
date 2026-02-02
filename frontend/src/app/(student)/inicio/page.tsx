'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDateBR, formatDateTimeBR } from '@/lib/formatters/date';
import { formatMoneyBRL } from '@/lib/formatters/money';
import { apiBrowser } from '@/lib/api/browser';
import { withQuery } from '@/lib/api/query';
import { API_V1 } from '@/lib/api/routes';
import type { PaginatedResponse } from '@/types/api';
import { 
  GraduationCap, 
  Calendar, 
  Clock, 
  MapPin, 
  Wallet, 
  AlertTriangle, 
  Bell, 
  BookOpen,
  TrendingUp,
  ChevronRight,
  Sparkles,
  Activity,
  Lightbulb,
  FileText,
  CreditCard,
  Download,
  RefreshCw,
  IdCard,
  History,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type TermOption = {
  id: string;
  code: string;
  is_current: boolean;
};

type MeProfileResponse = {
  user_id: string;
  ra: string;
  full_name: string;
  email: string;
  course: { id: string; name: string; degree_type: string | null };
  total_progress: number | string;
  current_term: string | null;
};

type MeTodayClassResponse = {
  class_info: {
    session_id: string;
    subject_id: string;
    subject_code: string;
    subject_name: string;
    session_date: string;
    start_time: string;
    end_time: string;
    room: string | null;
  } | null;
  warnings: string[];
};

type MeAcademicSummaryResponse = {
  current_term: string;
  subjects: Array<{
    subject_id: string;
    subject_code: string;
    subject_name: string;
    final_score: number | string | null;
    absences_count: number;
    absences_pct: number | string;
    status: string;
    has_absence_alert: boolean;
  }>;
  average_score: number | string | null;
  subjects_at_risk: number;
};

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

type MeUnreadCountResponse = { unread_count: number };

type MeNotificationInfo = {
  id: string;
  notification_id: string;
  type: string;
  priority: string;
  title: string | null;
  body: string;
  delivered_at: string;
  read_at: string | null;
  archived_at: string | null;
  is_read: boolean;
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
            Dicas Importantes
          </DialogTitle>
          <DialogDescription>
            Informações úteis para você acompanhar seu desempenho acadêmico
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-4">
            <h4 className="font-medium text-secondary">📚 Frequência Mínima</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Você precisa ter no mínimo <strong>75% de presença</strong> em cada disciplina para ser aprovado.
            </p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <h4 className="font-medium text-primary">📊 Média de Aprovação</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              A nota mínima para aprovação é <strong>6,0</strong>. Fique atento às avaliações!
            </p>
          </div>
          <div className="rounded-lg border border-warning/20 bg-warning/5 p-4">
            <h4 className="font-medium text-warning">💰 Boletos</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Mantenha seus boletos em dia para evitar bloqueio de matrícula e acesso ao sistema.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 p-4">
              <Skeleton className="size-12 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function StudentHomePage() {
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [profile, setProfile] = useState<MeProfileResponse | null>(null);
  const [todayClass, setTodayClass] = useState<MeTodayClassResponse | null>(null);
  const [academic, setAcademic] = useState<MeAcademicSummaryResponse | null>(null);
  const [financial, setFinancial] = useState<MeFinancialSummaryResponse | null>(null);
  const [unread, setUnread] = useState<MeUnreadCountResponse>({ unread_count: 0 });
  const [notifications, setNotifications] = useState<PaginatedResponse<MeNotificationInfo>>({ items: [], total: 0, limit: 5, offset: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data on mount
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Load profile first to get current term
        const profileData = await apiBrowser.get<MeProfileResponse>(API_V1.me.profile);
        setProfile(profileData);

        // Try to load terms for dropdown (optional - may fail if student doesn't have access)
        try {
          const termsData = await apiBrowser.get<TermOption[]>(API_V1.admin.dashboard.terms);
          setTerms(termsData);
          
          // Select current term by default
          const currentTerm = termsData.find((t) => t.is_current);
          if (currentTerm) {
            setSelectedTermId(currentTerm.id);
          } else if (termsData.length > 0) {
            setSelectedTermId(termsData[0].id);
          }
        } catch (termsErr) {
          console.warn('Could not load terms list (using current term only):', termsErr);
          // If we can't load terms, just use current term from profile
          // We'll create a minimal term list with just the current term
          if (profileData.current_term) {
            const currentTermOption: TermOption = {
              id: profileData.current_term,
              code: profileData.current_term,
              is_current: true,
            };
            setTerms([currentTermOption]);
            setSelectedTermId(profileData.current_term);
          }
        }

        // Load dashboard data (without term filter initially)
        const [todayData, academicData, financialData, unreadData, notificationsData] = await Promise.all([
          apiBrowser.get<MeTodayClassResponse>(API_V1.me.todayClass),
          apiBrowser.get<MeAcademicSummaryResponse>(API_V1.me.academicSummary),
          apiBrowser.get<MeFinancialSummaryResponse>(API_V1.me.financialSummary),
          apiBrowser.get<MeUnreadCountResponse>(API_V1.me.unreadCount),
          apiBrowser.get<PaginatedResponse<MeNotificationInfo>>(`${API_V1.me.notifications}?limit=5&offset=0`),
        ]);

        setTodayClass(todayData);
        setAcademic(academicData);
        setFinancial(financialData);
        setUnread(unreadData);
        setNotifications(notificationsData);
      } catch (err: any) {
        console.error('Failed to load dashboard data:', err);
        if (err?.code === 'STUDENT_INACTIVE') {
          setError('STUDENT_INACTIVE');
        } else {
          setError('Failed to load data');
        }
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Reload data when term changes (only after initial load)
  const loadDataForTerm = useCallback(async (termId: string) => {
    if (!termId || !profile) return;
    
    setRefreshing(true);
    setError(null);

    try {
      // Load data with term filter
      const academicUrl = withQuery(API_V1.me.academicSummary, { term_id: termId });
      const financialUrl = withQuery(API_V1.me.financialSummary, { term_id: termId });

      const [academicData, financialData] = await Promise.all([
        apiBrowser.get<MeAcademicSummaryResponse>(academicUrl),
        apiBrowser.get<MeFinancialSummaryResponse>(financialUrl),
      ]);

      setAcademic(academicData);
      setFinancial(financialData);
    } catch (err: any) {
      console.error('Failed to load term data:', err);
      setError('Failed to load data');
    } finally {
      setRefreshing(false);
    }
  }, [profile]);

  // Watch for term selection changes
  useEffect(() => {
    if (selectedTermId && profile && !loading) {
      loadDataForTerm(selectedTermId);
    }
  }, [selectedTermId, profile, loading, loadDataForTerm]);

  const handleRefresh = () => {
    if (selectedTermId && profile) {
      loadDataForTerm(selectedTermId);
    }
  };

  // Error states
  if (error === 'STUDENT_INACTIVE') {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-10 text-center shadow-sm">
        <Badge variant="destructive">Cadastro desativado</Badge>
        <h1 className="text-2xl font-semibold tracking-tight">Seu acesso está temporariamente indisponível</h1>
        <p className="text-sm text-muted-foreground">
          Seu cadastro foi desativado. Por favor, entre em contato com a secretaria para regularizar o acesso.
        </p>
      </div>
    );
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!profile || !academic || !financial) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <AlertTriangle className="size-12 text-destructive" />
        <h2 className="text-xl font-semibold">Erro ao carregar dados</h2>
        <p className="text-muted-foreground">Não foi possível carregar as informações do dashboard.</p>
        <Button onClick={handleRefresh}>Tentar novamente</Button>
      </div>
    );
  }

  const firstName = profile.full_name.split(' ')[0];
  const greeting = new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  const courseProgress = Number(profile.total_progress);

  // Quick actions menu
  const quickActions = [
    {
      title: 'Declaração de Matrícula',
      description: 'Baixar documento',
      icon: FileText,
      color: 'bg-blue-500',
      href: '/documentos',
    },
    {
      title: 'Carteirinha Digital',
      description: 'Visualizar carteira',
      icon: IdCard,
      color: 'bg-green-500',
      href: '/carteirinha',
    },
    {
      title: 'Histórico Acadêmico',
      description: 'Consultar histórico',
      icon: History,
      color: 'bg-purple-500',
      href: '/historico',
    },
    {
      title: 'Boletos',
      description: 'Ver todos os boletos',
      icon: CreditCard,
      color: 'bg-amber-500',
      href: '/financeiro',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Header with Progress */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-secondary/5 p-6 shadow-sm">
        <GraduationCap className="pointer-events-none absolute -right-8 -top-8 size-48 rotate-12 text-secondary opacity-5" />
        
        <div className="relative space-y-4">
          {/* Top row: Greeting + Controls */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-secondary" />
                <span className="text-sm font-medium text-secondary">{greeting}</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{firstName}</h1>
              <p className="text-sm text-muted-foreground">
                RA <span className="font-medium">{profile.ra}</span> • {profile.course.name}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {terms.length > 1 && (
                <Select value={selectedTermId} onValueChange={setSelectedTermId}>
                  <SelectTrigger className="h-10 w-[160px] border-primary/20 bg-background/80 backdrop-blur-sm">
                    <Calendar className="mr-2 size-4 text-muted-foreground" />
                    <SelectValue placeholder="Semestre" />
                  </SelectTrigger>
                  <SelectContent>
                    {terms.map((term) => (
                      <SelectItem key={term.id} value={term.id}>
                        <span className="flex items-center gap-2">
                          {term.code}
                          {term.is_current && (
                            <Badge variant="secondary" className="text-xs">
                              Atual
                            </Badge>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
                className="size-10 border-primary/20 bg-background/80 backdrop-blur-sm"
              >
                <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>

              <Badge 
                variant="outline" 
                className={`h-10 gap-2 px-4 font-semibold shadow-sm backdrop-blur-sm ${
                  unread.unread_count > 0 
                    ? 'border-warning/30 bg-warning/10 text-warning' 
                    : 'border-primary/20 bg-background/80'
                }`}
              >
                <Activity className={`size-4 ${unread.unread_count > 0 ? 'animate-pulse' : ''}`} />
                {unread.unread_count} {unread.unread_count === 1 ? 'notificação' : 'notificações'}
              </Badge>
              <TipsDialog />
            </div>
          </div>

          {/* Course Progress Bar */}
          <div className="space-y-2 rounded-xl border border-primary/20 bg-background/50 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                <span className="text-sm font-medium">Progresso do Curso</span>
              </div>
              <span className="text-lg font-bold text-primary">{courseProgress.toFixed(1)}%</span>
            </div>
            <Progress value={courseProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {courseProgress >= 75 
                ? '🎉 Você está próximo da conclusão!' 
                : courseProgress >= 50 
                  ? '📚 Continue assim, você está no caminho certo!' 
                  : '💪 Mantenha o foco nos estudos!'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions Menu */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Ações Rápidas</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${action.color} text-white shadow-sm`}>
                    <action.icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{action.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-secondary bg-gradient-to-r from-secondary/5 to-transparent">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-secondary/10 shadow-[0_0_12px_rgba(37,185,121,0.2)]">
              <TrendingUp className="size-6 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Média Geral</p>
              <p className="text-2xl font-bold">
                {academic.average_score !== null ? Number(academic.average_score).toFixed(1) : '-'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Disciplinas</p>
              <p className="text-2xl font-bold">{academic.subjects.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 bg-gradient-to-r to-transparent ${
          academic.subjects_at_risk > 0 ? 'border-l-warning from-warning/5' : 'border-l-secondary from-secondary/5'
        }`}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className={`flex size-12 items-center justify-center rounded-xl ${
              academic.subjects_at_risk > 0 ? 'bg-warning/10' : 'bg-secondary/10'
            }`}>
              <AlertTriangle className={`size-6 ${
                academic.subjects_at_risk > 0 ? 'text-warning' : 'text-secondary'
              }`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Em Risco</p>
              <p className="text-2xl font-bold">{academic.subjects_at_risk}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 bg-gradient-to-r to-transparent ${
          financial.has_overdue ? 'border-l-destructive from-destructive/5' : 'border-l-secondary from-secondary/5'
        }`}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className={`flex size-12 items-center justify-center rounded-xl ${
              financial.has_overdue ? 'bg-destructive/10' : 'bg-secondary/10'
            }`}>
              <Wallet className={`size-6 ${
                financial.has_overdue ? 'text-destructive' : 'text-secondary'
              }`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pendente</p>
              <p className="text-lg font-bold">{formatMoneyBRL(financial.total_pending)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Class Card */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <Calendar className="size-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Próxima Aula</CardTitle>
                  <CardDescription>Hoje</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-primary">
                <Link href="/horarios">
                  Ver horários
                  <ChevronRight className="ml-1 size-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            {todayClass?.class_info ? (
              <div className="space-y-4">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="font-semibold text-foreground">
                    {todayClass.class_info.subject_name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {todayClass.class_info.subject_code}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
                    <Clock className="size-3.5" />
                    {todayClass.class_info.start_time.slice(0, 5)} – {todayClass.class_info.end_time.slice(0, 5)}
                  </Badge>
                  <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
                    <MapPin className="size-3.5" />
                    {todayClass.class_info.room || 'Sala não definida'}
                  </Badge>
                </div>
                {todayClass.warnings && todayClass.warnings.length > 0 && (
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                    {todayClass.warnings.map((w) => (
                      <p key={w} className="text-sm text-warning">⚠️ {w}</p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-muted">
                  <Calendar className="size-7 text-muted-foreground" />
                </div>
                <p className="font-medium text-muted-foreground">Nenhuma aula hoje</p>
                <p className="mt-1 text-sm text-muted-foreground">Aproveite para estudar!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Summary Card */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-gradient-to-r from-secondary/5 to-transparent pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-secondary/10">
                  <Wallet className="size-5 text-secondary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Financeiro</CardTitle>
                  <CardDescription>Resumo de pagamentos</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-secondary">
                <Link href="/financeiro">
                  Ver boletos
                  <ChevronRight className="ml-1 size-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Pendente</p>
                  <p className="text-xl font-bold">{formatMoneyBRL(financial.total_pending)}</p>
                </div>
                {financial.has_overdue && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="size-3" />
                    Em atraso
                  </Badge>
                )}
              </div>
              
              {financial.next_invoice ? (
                <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{financial.next_invoice.description}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Vencimento: {formatDateBR(financial.next_invoice.due_date)}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-secondary">
                      {formatMoneyBRL(financial.next_invoice.amount)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-secondary/20 bg-secondary/5 p-4 text-secondary">
                  <Sparkles className="size-4" />
                  <span className="font-medium">Nenhum boleto pendente!</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grades Table */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Desempenho Acadêmico</CardTitle>
                <CardDescription>Termo {academic.current_term}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {academic.subjects_at_risk > 0 ? (
                <Badge variant="warning" className="gap-1">
                  <AlertTriangle className="size-3" />
                  {academic.subjects_at_risk} em risco
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 border-secondary/30 bg-secondary/10 text-secondary">
                  <Sparkles className="size-3" />
                  Tudo OK
                </Badge>
              )}
              <Button variant="ghost" size="sm" asChild className="text-primary">
                <Link href="/notas">
                  Ver detalhes
                  <ChevronRight className="ml-1 size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Disciplina</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-5 text-right">Nota Final</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {academic.subjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <BookOpen className="size-10 text-muted-foreground/50" />
                      <p className="text-muted-foreground">Nenhuma disciplina cadastrada</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                academic.subjects.map((s) => (
                  <TableRow key={s.subject_id} className="group">
                    <TableCell className="pl-5">
                      <div className="font-medium group-hover:text-primary transition-colors">
                        {s.subject_name}
                      </div>
                      <div className="text-xs text-muted-foreground">{s.subject_code}</div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={s.has_absence_alert ? 'warning' : 'outline'}
                        className={!s.has_absence_alert ? 'border-muted-foreground/30' : ''}
                      >
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <span className={`text-lg font-bold ${
                        s.final_score !== null && Number(s.final_score) >= 6 
                          ? 'text-secondary' 
                          : s.final_score !== null && Number(s.final_score) < 6 
                            ? 'text-destructive' 
                            : ''
                      }`}>
                        {s.final_score === null ? '-' : Number(s.final_score).toFixed(1)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-warning/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-warning/10">
                <Bell className="size-5 text-warning" />
              </div>
              <div>
                <CardTitle className="text-lg">Notificações Recentes</CardTitle>
                <CardDescription>Últimas atualizações do sistema</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-warning">
              <Link href="/notificacoes">
                Ver todas
                <ChevronRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {notifications.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-muted">
                <Bell className="size-7 text-muted-foreground" />
              </div>
              <p className="font-medium text-muted-foreground">Nenhuma notificação</p>
              <p className="mt-1 text-sm text-muted-foreground">Você está em dia!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.items.map((n) => (
                <div 
                  key={n.id} 
                  className={`rounded-xl border p-4 transition-colors ${
                    n.is_read 
                      ? 'bg-muted/30' 
                      : 'border-primary/20 bg-primary/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        {!n.is_read && (
                          <span className="size-2 rounded-full bg-primary animate-pulse" />
                        )}
                        <p className="font-medium truncate">{n.title || n.type}</p>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{n.body}</p>
                    </div>
                    <Badge 
                      variant={n.priority === 'HIGH' || n.priority === 'URGENT' ? 'warning' : 'outline'}
                      className="shrink-0"
                    >
                      {n.priority === 'HIGH' || n.priority === 'URGENT' ? '🔥' : ''} {n.priority}
                    </Badge>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {formatDateTimeBR(n.delivered_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
