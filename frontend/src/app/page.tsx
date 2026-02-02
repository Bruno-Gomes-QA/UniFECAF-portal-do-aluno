import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap, ShieldCheck, ArrowRight, LayoutDashboard, UserCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/server";

/**
 * Landing Page principal para escolha de acesso (Aluno ou Administrador)
 */
export default async function LandingPage() {
  const user = await getCurrentUser();

  // Redireciona se já estiver logado
  if (user) {
    if (user.role === 'STUDENT') {
      redirect('/inicio');
    } else if (user.role === 'ADMIN') {
      redirect('/administrativo');
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden text-primary">
      {/* Background Decorativo */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary via-primary to-secondary" />
      <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />

      <div className="max-w-4xl w-full space-y-12 text-center relative z-10">
        {/* Header Section */}
        <div className="space-y-6">
          <h1 className="text-5xl md:text-7xl font-extrabold text-primary tracking-tight">
            Plataforma Digital <span className="text-secondary">UniFECAF</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
            Bem-vindo ao novo ecossistema integrado da UniFECAF. Escolha seu perfil de acesso para continuar.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-8 mt-16 px-4">
          
          {/* Aluno Portal Option */}
          <Link 
            href="/login"
            className="group relative flex flex-col items-center p-10 bg-card rounded-3xl shadow-sm border border-border hover:border-secondary transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
          >
            <div className="absolute top-4 right-4 text-secondary/20 group-hover:text-secondary transition-colors">
              <UserCircle className="w-8 h-8 opacity-20" />
            </div>
            
            <div className="w-20 h-20 bg-secondary/5 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300 group-hover:bg-secondary/10">
              <GraduationCap className="w-10 h-10 text-secondary" />
            </div>
            
            <h2 className="text-3xl font-bold text-primary mb-3">Sou Aluno</h2>
            <p className="text-muted-foreground text-center mb-8 leading-relaxed">
              Consulte suas notas, frequência, históricos econômicos e realize sua rematrícula online com facilidade.
            </p>
            
            <div className="mt-auto flex items-center gap-2 py-3 px-6 bg-secondary text-secondary-foreground rounded-xl font-bold hover:bg-secondary/90 transition-colors shadow-lg shadow-secondary/20">
              Entrar no Portal <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Admin Backoffice Option */}
          <Link 
            href="/login/administrativo"
            className="group relative flex flex-col items-center p-10 bg-card rounded-3xl shadow-sm border border-border hover:border-primary transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
          >
            <div className="absolute top-4 right-4 text-primary/10 group-hover:text-primary transition-colors">
              <LayoutDashboard className="w-8 h-8 opacity-20" />
            </div>
            
            <div className="w-20 h-20 bg-primary/5 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300 group-hover:bg-primary/10">
              <ShieldCheck className="w-10 h-10 text-primary" />
            </div>
            
            <h2 className="text-3xl font-bold text-primary mb-3">Administrativo</h2>
            <p className="text-muted-foreground text-center mb-8 leading-relaxed">
              Painel completo de gestão acadêmica, controle de recebíveis, auditoria e comunicação institucional.
            </p>
            
            <div className="mt-auto flex items-center gap-2 py-3 px-6 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
              Acesso Coordenador <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

        </div>

        {/* Footer info */}
        <div className="pt-12 text-muted-foreground font-medium">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-muted-foreground uppercase tracking-widest text-xs">Sistemas Operacionais</span>
          </div>
          <p className="text-sm">© 2026 UniFECAF - Excelência em Educação Digital</p>
        </div>
      </div>
    </div>
  );
}
