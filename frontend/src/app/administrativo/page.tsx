'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiBrowser } from '@/lib/api/browser';
import { withQuery } from '@/lib/api/query';
import { API_V1 } from '@/lib/api/routes';
import { formatMoneyBRL } from '@/lib/formatters/money';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Receipt,
  DollarSign,
  Bell,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BookOpen,
  FileText,
  CreditCard,
  UserPlus,
  Settings,
  Calendar,
  BarChart3,
  ArrowRight,
  RefreshCw,
  Building2,
  ClipboardList,
  CalendarDays,
  UserCheck,
  Banknote,
  FileCheck,
  Send,
} from 'lucide-react';

// Types
type TermOption = {
  id: string;
  code: string;
  is_current: boolean;
};

type FinanceSummary = {
  total_invoiced: string;
  total_paid: string;
  total_pending: string;
  total_overdue: string;
  count_invoices: number;
  count_paid: number;
  count_pending: number;
  count_overdue: number;
  payment_rate: number;
};

type EnrollmentSummary = {
  total_students: number;
  total_enrollments: number;
  active_students: number;
  locked_students: number;
  graduated_students: number;
};

type NotificationSummary = {
  total_sent: number;
  total_read: number;
  total_unread: number;
  read_rate: number;
};

type RecentActivity = {
  type: string;
  description: string;
  timestamp: string;
  icon: string;
};

type DashboardStats = {
  term_id: string | null;
  term_code: string | null;
  finance: FinanceSummary;
  enrollment: EnrollmentSummary;
  notifications: NotificationSummary;
  recent_activities: RecentActivity[];
  quick_stats: Record<string, number | string>;
};

// Quick action items
const quickActions = [
  {
    title: 'Novo Usuário',
    description: 'Cadastrar usuário',
    href: '/administrativo/usuarios',
    icon: UserPlus,
    color: 'bg-blue-500',
  },
  {
    title: 'Matrículas',
    description: 'Gerenciar matrículas',
    href: '/administrativo/academico/matriculas',
    icon: ClipboardList,
    color: 'bg-green-500',
  },
  {
    title: 'Faturas',
    description: 'Gestão financeira',
    href: '/administrativo/financeiro/faturas',
    icon: Receipt,
    color: 'bg-amber-500',
  },
  {
    title: 'Notificações',
    description: 'Enviar avisos',
    href: '/administrativo/comunicacao/notificacoes',
    icon: Send,
    color: 'bg-purple-500',
  },
  {
    title: 'Negociação',
    description: 'Renegociar dívidas',
    href: '/administrativo/financeiro/faturas/negociacao',
    icon: Banknote,
    color: 'bg-emerald-500',
  },
  {
    title: 'Documentos',
    description: 'Solicitações',
    href: '/administrativo/documentos',
    icon: FileCheck,
    color: 'bg-indigo-500',
  },
];

// Navigation sections
const navSections = [
  {
    title: 'Acadêmico',
    items: [
      { label: 'Cursos', href: '/administrativo/academico/cursos', icon: BookOpen },
      { label: 'Disciplinas', href: '/administrativo/academico/disciplinas', icon: FileText },
      { label: 'Turmas', href: '/administrativo/academico/turmas', icon: Users },
      { label: 'Semestres', href: '/administrativo/academico/semestres', icon: CalendarDays },
      { label: 'Alunos', href: '/administrativo/academico/alunos', icon: GraduationCap },
      { label: 'Matrículas', href: '/administrativo/academico/matriculas', icon: ClipboardList },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { label: 'Faturas', href: '/administrativo/financeiro/faturas', icon: Receipt },
      { label: 'Pagamentos', href: '/administrativo/financeiro/pagamentos', icon: CreditCard },
      { label: 'Negociação', href: '/administrativo/financeiro/faturas/negociacao', icon: Banknote },
    ],
  },
  {
    title: 'Comunicação',
    items: [
      { label: 'Notificações', href: '/administrativo/comunicacao/notificacoes', icon: Bell },
      { label: 'Documentos', href: '/administrativo/documentos', icon: FileText },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { label: 'Usuários', href: '/administrativo/usuarios', icon: Users },
      { label: 'Auditoria', href: '/administrativo/auditoria', icon: ClipboardList },
    ],
  },
];

export default function AdminDashboardPage() {
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load terms
  useEffect(() => {
    const loadTerms = async () => {
      try {
        const data = await apiBrowser.get<TermOption[]>(API_V1.admin.dashboard.terms);
        setTerms(data);
        // Select current term by default
        const currentTerm = data.find((t) => t.is_current);
        if (currentTerm) {
          setSelectedTermId(currentTerm.id);
        } else if (data.length > 0) {
          setSelectedTermId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load terms:', err);
      }
    };
    loadTerms();
  }, []);

  // Load stats when term changes
  const loadStats = useCallback(async (termId: string, isRefresh = false) => {
    if (!termId) return;
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const data = await apiBrowser.get<DashboardStats>(
        withQuery(API_V1.admin.dashboard.stats, { term_id: termId })
      );
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTermId) {
      loadStats(selectedTermId);
    }
  }, [selectedTermId, loadStats]);

  const handleRefresh = () => {
    if (selectedTermId) {
      loadStats(selectedTermId, true);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'enrollment':
        return <UserCheck className="h-4 w-4 text-blue-500" />;
      case 'notification':
        return <Bell className="h-4 w-4 text-purple-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
              <LayoutDashboard className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">
                Visão geral do sistema administrativo
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedTermId} onValueChange={setSelectedTermId}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Selecione o semestre" />
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
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : stats ? (
        <>
          {/* Stats Cards Row 1 - Main KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Students */}
            <Card className="relative overflow-hidden">
              <div className="absolute right-0 top-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full bg-blue-500/10" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
                <GraduationCap className="h-5 w-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.enrollment.total_students}</div>
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    {stats.enrollment.active_students} ativos
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    {stats.enrollment.locked_students} trancados
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Enrollments */}
            <Card className="relative overflow-hidden">
              <div className="absolute right-0 top-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full bg-green-500/10" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Matrículas no Semestre</CardTitle>
                <ClipboardList className="h-5 w-5 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.enrollment.total_enrollments}</div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {stats.term_code && `Semestre ${stats.term_code}`}
                </p>
              </CardContent>
            </Card>

            {/* Revenue */}
            <Card className="relative overflow-hidden">
              <div className="absolute right-0 top-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full bg-emerald-500/10" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita do Semestre</CardTitle>
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatMoneyBRL(stats.finance.total_paid)}</div>
                <p className="mt-2 text-xs text-muted-foreground">
                  de {formatMoneyBRL(stats.finance.total_invoiced)} faturado
                </p>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="relative overflow-hidden">
              <div className="absolute right-0 top-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full bg-purple-500/10" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Notificações</CardTitle>
                <Bell className="h-5 w-5 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.notifications.total_sent}</div>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    {stats.notifications.read_rate}% lidas
                  </span>
                  <Progress value={stats.notifications.read_rate} className="h-1.5 flex-1" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Finance Section */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Finance Overview */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Resumo Financeiro
                </CardTitle>
                <CardDescription>Visão geral das faturas do semestre {stats.term_code}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Payment Progress */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Taxa de Adimplência</span>
                      <span className="text-2xl font-bold text-primary">{stats.finance.payment_rate}%</span>
                    </div>
                    <Progress value={stats.finance.payment_rate} className="h-3" />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>{stats.finance.count_paid} pagas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-500" />
                        <span>{stats.finance.count_pending} pendentes</span>
                      </div>
                    </div>
                  </div>

                  {/* Finance Details */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-green-50 dark:bg-green-950/30 p-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Recebido</span>
                      </div>
                      <span className="font-semibold text-green-700 dark:text-green-400">
                        {formatMoneyBRL(stats.finance.total_paid)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-600" />
                        <span className="text-sm">Pendente</span>
                      </div>
                      <span className="font-semibold text-amber-700 dark:text-amber-400">
                        {formatMoneyBRL(stats.finance.total_pending)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-red-50 dark:bg-red-950/30 p-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-sm">Vencido</span>
                      </div>
                      <span className="font-semibold text-red-700 dark:text-red-400">
                        {formatMoneyBRL(stats.finance.total_overdue)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Estatísticas Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Total de usuários</span>
                  </div>
                  <Badge variant="secondary">{stats.quick_stats.total_users}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Cursos ativos</span>
                  </div>
                  <Badge variant="secondary">{stats.quick_stats.total_courses}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Turmas no semestre</span>
                  </div>
                  <Badge variant="secondary">{stats.quick_stats.sections_term}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Faturas vencidas</span>
                  </div>
                  <Badge variant="destructive">{stats.quick_stats.invoices_overdue}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Formados</span>
                  </div>
                  <Badge variant="outline">{stats.enrollment.graduated_students}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions & Recent Activity */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Quick Actions */}
            <div className="lg:col-span-2">
              <h2 className="mb-4 text-lg font-semibold">Ações Rápidas</h2>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {quickActions.map((action) => (
                  <Link key={action.href} href={action.href}>
                    <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
                      <CardContent className="flex items-center gap-3 p-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color} text-white shadow-sm`}>
                          <action.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{action.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Atividade Recente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.recent_activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma atividade recente
                    </p>
                  ) : (
                    stats.recent_activities.slice(0, 6).map((activity, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="mt-0.5">{getActivityIcon(activity.type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimestamp(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Navigation Sections */}
          <div>
            <h2 className="mb-4 text-lg font-semibold">Navegação Rápida</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {navSections.map((section) => (
                <Card key={section.title}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {section.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {section.items.map((item) => (
                      <Link key={item.href} href={item.href}>
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-2 h-9 px-2"
                        >
                          <item.icon className="h-4 w-4 text-muted-foreground" />
                          {item.label}
                        </Button>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Não foi possível carregar os dados do dashboard.</p>
          <Button onClick={handleRefresh} variant="outline" className="mt-4">
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  );
}

// Loading skeleton
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="mt-2 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
