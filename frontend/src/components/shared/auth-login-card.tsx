'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { CheckCircle2, GraduationCap, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { apiBrowser } from '@/lib/api/browser';
import { ApiClientError } from '@/lib/api/errors';
import { API_V1 } from '@/lib/api/routes';
import type { AuthMeResponse } from '@/lib/auth/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

type LoginVariant = 'student' | 'admin';

type VariantCopy = {
  badge: string;
  heading: string;
  subheading: string;
  valuesTitle: string;
  values: string[];
  note: string;
  formTitle: string;
  formDescription: string;
  redirectTo: string;
  switchHref: string;
  switchLabel: string;
};

const COPY: Record<LoginVariant, VariantCopy> = {
  student: {
    badge: 'Bem-vindo(a) de volta às aulas',
    heading: 'Portal do Aluno',
    subheading:
      'Acesse notas, frequência, financeiro, notificações e documentos em um só lugar — com segurança e praticidade.',
    valuesTitle: 'Nossos valores na UniFECAF',
    values: ['Respeito e acolhimento', 'Excelência acadêmica', 'Inovação com propósito', 'Foco no aluno'],
    note: 'Dica: mantenha seu email atualizado para receber avisos e comunicados importantes.',
    formTitle: 'Entrar',
    formDescription: 'Use seu email e senha cadastrados para acessar o portal.',
    redirectTo: '/inicio',
    switchHref: '/login/administrativo',
    switchLabel: 'Sou administrador',
  },
  admin: {
    badge: 'Acesso restrito',
    heading: 'Painel Administrativo',
    subheading:
      'Gerencie usuários, alunos, comunicação e rotinas acadêmicas com rastreabilidade e responsabilidade.',
    valuesTitle: 'Não esqueça',
    values: [
      'Proteja dados pessoais (LGPD)',
      'Use apenas em redes confiáveis',
      'Evite compartilhar credenciais',
      'Ações podem ser auditadas',
    ],
    note: 'Se perceber algo fora do padrão, registre e comunique a coordenação imediatamente.',
    formTitle: 'Entrar',
    formDescription: 'Use suas credenciais administrativas para continuar.',
    redirectTo: '/administrativo',
    switchHref: '/login',
    switchLabel: 'Sou aluno',
  },
};

export function AuthLoginCard({ variant, backendOffline }: { variant: LoginVariant; backendOffline?: boolean }) {
  const router = useRouter();
  const copy = useMemo(() => COPY[variant], [variant]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiBrowser.post<void>(API_V1.auth.login, { email, password });

      const me = await apiBrowser.get<AuthMeResponse>(API_V1.auth.me);
      const isStudent = me.role === 'STUDENT';
      const isAdminish = me.role === 'ADMIN';

      if (variant === 'student' && !isStudent) {
        await apiBrowser.post<void>(API_V1.auth.logout).catch(() => undefined);
        toast.error(
          <span>
            Este usuário é administrador do sistema, por favor entrar pelo{' '}
            <Link
              href="/login/administrativo"
              className="font-semibold underline decoration-2 underline-offset-4"
            >
              Painel Administrativo
            </Link>
            .
          </span>,
          { duration: 15000 },
        );
        setPassword('');
        return;
      }

      if (variant === 'admin' && !isAdminish) {
        await apiBrowser.post<void>(API_V1.auth.logout).catch(() => undefined);
        toast.error(
          <span>
            Este usuário é aluno, por favor entrar pelo{' '}
            <Link href="/login" className="font-semibold underline decoration-2 underline-offset-4">
              Portal do Aluno
            </Link>
            .
          </span>,
          { duration: 15000 },
        );
        setPassword('');
        return;
      }

      router.replace(copy.redirectTo);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else if (err instanceof TypeError && err.message.includes('fetch')) {
        // Erro de conexão - backend offline
        toast.error(
          <div className="space-y-2">
            <p className="font-semibold">Servidor temporariamente indisponível</p>
            <p className="text-sm">Não foi possível conectar ao servidor. Verifique o badge de status no canto inferior esquerdo.</p>
            <p className="text-sm">Entre em contato com o suporte: <span className="font-mono font-semibold">(11) 94722-9703</span></p>
          </div>,
          { duration: 10000 }
        );
      } else {
        toast.error('Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const Icon = variant === 'admin' ? ShieldCheck : GraduationCap;

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-secondary-foreground">
      <div className="mx-auto flex min-h-[100dvh] max-w-7xl items-center justify-center px-4 py-10">
        <Card className="w-full max-w-5xl overflow-hidden border-border/60 shadow-2xl">
          <div className="grid md:grid-cols-2">
            <div className="relative flex flex-col bg-primary p-8 md:p-12 text-white min-h-fit md:min-h-[600px] justify-center">
              <div className="relative z-10 space-y-10 py-10 md:py-0">
                <div className="flex flex-col items-center gap-6 md:flex-row md:gap-5">
                  <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl border border-secondary/30 bg-secondary/10 text-secondary shadow-[0_0_25px_rgba(37,185,121,0.25)] md:h-14 md:w-14">
                    <Icon className="h-10 w-10 md:h-7 md:w-7" />
                  </div>
                  <h1 className="text-center text-3xl font-bold tracking-tight md:text-left md:text-4xl">{copy.heading}</h1>
                </div>

                <div className="space-y-3">
                  <p className="mx-auto max-w-md text-center text-base leading-relaxed text-white/70 md:mx-0 md:text-left">{copy.subheading}</p>
                </div>

                <Separator className="bg-white/10" />

                <div className="space-y-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-secondary text-left">{copy.valuesTitle}</p>
                  <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
                    {copy.values.map((value) => (
                      <li key={value} className="flex items-center gap-3 justify-start">
                        <div className="flex-shrink-0 rounded-full bg-secondary/20 p-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-secondary drop-shadow-[0_0_8px_rgba(37,185,121,0.6)]" />
                        </div>
                        <span className="text-sm font-medium text-white/90 leading-none">{value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 text-center text-[10px] font-semibold uppercase tracking-widest text-white/30 md:absolute md:bottom-8 md:left-12 md:mt-0 md:text-left">
                UniFECAF — Portal do Aluno
              </div>
            </div>

            <div className="flex flex-col justify-center bg-primary-foreground p-8 md:p-12 min-h-fit md:min-h-[600px]">
              <div className="mb-8 items-start justify-start flex">
                <Badge className="w-fit border-secondary/30 bg-secondary text-white shadow-[0_0_15px_rgba(37,185,121,0.45)] hover:bg-secondary/90 px-4 py-1">
                  {copy.badge}
                </Badge>
              </div>

              {/* Backend Offline Alert */}
              {backendOffline && (
                <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-red-900">Servidor temporariamente indisponível</p>
                    <p className="text-red-700 mt-1 mb-2">
                      Não foi possível conectar ao servidor backend. Por favor, aguarde alguns instantes 
                      e tente novamente.
                    </p>
                    <p className="text-red-700">
                      Se o problema persistir, entre em contato com o suporte: <span className="font-mono font-semibold">(11) 94722-9703</span>
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">{copy.formTitle}</h2>
                <p className="text-sm text-muted-foreground">{copy.formDescription}</p>
              </div>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="nome.sobrenome.ra@a.fecaf.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-secondary text-white shadow-lg transition-all duration-300 hover:bg-secondary/90 hover:shadow-[0_0_20px_rgba(37,185,121,0.5)] active:scale-[0.98]" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>

              <Separator className="my-6" />

              <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-muted-foreground">
                  Problemas para acessar?{' '}
                  <a 
                    href="https://wa.me/5511947229703" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-bold text-secondary transition-all hover:text-secondary/80 hover:underline decoration-2 underline-offset-4"
                  >
                    Procure a secretaria.
                  </a>
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
