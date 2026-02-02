import { Metadata } from 'next';
import { apiServer } from '@/lib/api/server';
import { API_V1 } from '@/lib/api/routes';
import { requireRole } from '@/lib/auth/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  Moon, 
  Shield, 
  User, 
  Settings, 
  Sparkles, 
  Lightbulb,
  GraduationCap,
  Mail,
  Smartphone,
  Lock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export const metadata: Metadata = {
  title: 'Configurações | Portal do Aluno',
  description: 'Configurações da sua conta',
};

type MeProfileResponse = {
  user_id: string;
  ra: string;
  full_name: string;
  email: string;
  course: {
    id: string;
    name: string;
    degree_type: string | null;
  };
  total_progress: number;
  current_term: string | null;
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
            Sobre Configurações
          </DialogTitle>
          <DialogDescription>
            Informações sobre suas preferências
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-4">
            <h4 className="font-medium text-secondary">👤 Dados Pessoais</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Para alterar dados pessoais, procure a secretaria com documento de identidade.
            </p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <h4 className="font-medium text-primary">🔔 Notificações</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Ative as notificações push para receber avisos importantes em tempo real.
            </p>
          </div>
          <div className="rounded-lg border border-warning/20 bg-warning/5 p-4">
            <h4 className="font-medium text-warning">🔒 Senha</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Use uma senha forte com letras, números e caracteres especiais.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default async function ConfiguracoesPage() {
  await requireRole('STUDENT');

  const profile = await apiServer.get<MeProfileResponse>(API_V1.me.profile, {
    next: { revalidate: 60 },
  });

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-primary/5 p-6 shadow-sm">
        <Settings className="pointer-events-none absolute -right-8 -top-8 size-48 rotate-12 text-primary opacity-5" />
        
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-secondary" />
              <span className="text-sm font-medium text-secondary">Preferências</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Configurações</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie sua conta e preferências
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className="h-10 gap-2 border-secondary/30 bg-secondary/10 px-4 font-semibold text-secondary shadow-sm"
            >
              <User className="size-4" />
              {profile.ra}
            </Badge>
            <TipsDialog />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 shadow-sm">
                <User className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Perfil</CardTitle>
                <CardDescription>Informações da conta</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
              <div>
                <p className="text-xs text-muted-foreground">Nome completo</p>
                <p className="font-medium">{profile.full_name}</p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
              <div>
                <p className="text-xs text-muted-foreground">E-mail institucional</p>
                <p className="font-medium">{profile.email}</p>
              </div>
              <Mail className="size-4 text-muted-foreground" />
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
              <div>
                <p className="text-xs text-muted-foreground">Registro Acadêmico</p>
                <p className="font-medium font-mono">{profile.ra}</p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
              <div>
                <p className="text-xs text-muted-foreground">Curso</p>
                <p className="font-medium">{profile.course.name}</p>
              </div>
              {profile.course.degree_type && (
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                  {profile.course.degree_type}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notifications Card */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-gradient-to-r from-warning/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-warning/10">
                <Bell className="size-5 text-warning" />
              </div>
              <div>
                <CardTitle className="text-base">Notificações</CardTitle>
                <CardDescription>Preferências de avisos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Mail className="size-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">E-mail</p>
                  <p className="text-sm text-muted-foreground">Receber notificações por e-mail</p>
                </div>
              </div>
              <Badge variant="outline" className="gap-1 border-secondary/30 bg-secondary/10 text-secondary">
                <CheckCircle2 className="size-3" />
                Ativo
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Smartphone className="size-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Push</p>
                  <p className="text-sm text-muted-foreground">Notificações no navegador</p>
                </div>
              </div>
              <Badge variant="outline" className="gap-1">
                <XCircle className="size-3" />
                Desativado
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Card */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-gradient-to-r from-secondary/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-secondary/10 shadow-[0_0_12px_rgba(37,185,121,0.2)]">
                <Moon className="size-5 text-secondary" />
              </div>
              <div>
                <CardTitle className="text-base">Aparência</CardTitle>
                <CardDescription>Tema e exibição</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Tema</p>
                <p className="text-sm text-muted-foreground">Modo de exibição</p>
              </div>
              <Badge variant="outline">Claro</Badge>
            </div>
            <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                🌙 Em breve: opção de tema escuro
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-gradient-to-r from-destructive/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/10">
                <Shield className="size-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-base">Segurança</CardTitle>
                <CardDescription>Senha e autenticação</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Lock className="size-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Senha</p>
                  <p className="text-sm text-muted-foreground">Última alteração: N/A</p>
                </div>
              </div>
              <Badge variant="outline">Gerenciado</Badge>
            </div>
            <div className="rounded-lg border border-warning/20 bg-warning/5 p-4">
              <p className="text-sm text-warning">
                ⚠️ Para alterar sua senha, entre em contato com a secretaria.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Academic Progress Card */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <GraduationCap className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Progresso Acadêmico</CardTitle>
                <CardDescription>
                  {profile.current_term ? `Termo atual: ${profile.current_term}` : 'Sem termo ativo'}
                </CardDescription>
              </div>
            </div>
            <Badge 
              variant="outline" 
              className="h-10 gap-2 border-secondary/30 bg-secondary/10 px-4 font-bold text-secondary"
            >
              {Number(profile.total_progress).toFixed(0)}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso no curso</span>
              <span className="font-semibold text-secondary">{Number(profile.total_progress).toFixed(0)}%</span>
            </div>
            <Progress 
              value={Number(profile.total_progress)} 
              className="h-3 [&>div]:bg-secondary"
            />
            <p className="text-xs text-muted-foreground text-center">
              Continue assim! 🎓
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
