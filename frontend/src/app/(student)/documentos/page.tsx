import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiServer } from '@/lib/api/server';
import { API_V1 } from '@/lib/api/routes';
import { formatDateTimeBR } from '@/lib/formatters/date';
import { RequestDocumentButton } from '@/features/student/documents/request-document-button';
import { requireRole } from '@/lib/auth/server';
import { 
  FileText, 
  Download, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  Lightbulb,
  FileCheck,
  CreditCard,
  ScrollText,
  AlertTriangle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type MeDocumentInfo = {
  id: string;
  doc_type: string;
  status: string;
  title: string | null;
  file_url: string | null;
  generated_at: string | null;
};

const DOC_TYPES = ['DECLARATION', 'STUDENT_CARD', 'TRANSCRIPT'] as const;

const DOC_LABELS: Record<string, { title: string; description: string; icon: typeof FileText }> = {
  DECLARATION: {
    title: 'Declaração de Matrícula',
    description: 'Comprova que você está regularmente matriculado',
    icon: FileCheck,
  },
  STUDENT_CARD: {
    title: 'Carteirinha de Estudante',
    description: 'Documento de identificação estudantil',
    icon: CreditCard,
  },
  TRANSCRIPT: {
    title: 'Histórico Escolar',
    description: 'Registro de todas as suas notas e disciplinas',
    icon: ScrollText,
  },
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
            Sobre Documentos
          </DialogTitle>
          <DialogDescription>
            Informações sobre solicitação de documentos
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-4">
            <h4 className="font-medium text-secondary">📄 Declaração de Matrícula</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Documento que comprova seu vínculo com a instituição. Gerado automaticamente.
            </p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <h4 className="font-medium text-primary">🪪 Carteirinha</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Válida nacionalmente para meia-entrada. Solicite a versão digital aqui.
            </p>
          </div>
          <div className="rounded-lg border border-warning/20 bg-warning/5 p-4">
            <h4 className="font-medium text-warning">📊 Histórico</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Registro oficial de notas. Para fins de transferência, solicite via secretaria.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getStatusBadge(status: string | undefined) {
  switch (status) {
    case 'AVAILABLE':
      return (
        <Badge variant="outline" className="gap-1 border-secondary/30 bg-secondary/10 text-secondary">
          <CheckCircle2 className="size-3" />
          Disponível
        </Badge>
      );
    case 'PENDING':
      return (
        <Badge variant="warning" className="gap-1">
          <Clock className="size-3" />
          Processando
        </Badge>
      );
    case 'ERROR':
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="size-3" />
          Erro
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="size-3" />
          Não solicitado
        </Badge>
      );
  }
}

export default async function StudentDocumentsPage() {
  await requireRole('STUDENT');

  const docs = await apiServer.get<MeDocumentInfo[]>(API_V1.me.documents, { next: { revalidate: 15 } });
  const byType = new Map(docs.map((d) => [d.doc_type, d]));

  const availableCount = docs.filter(d => d.status === 'AVAILABLE').length;

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-primary/5 p-6 shadow-sm">
        <FileText className="pointer-events-none absolute -right-8 -top-8 size-48 rotate-12 text-primary opacity-5" />
        
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-secondary" />
              <span className="text-sm font-medium text-secondary">Central de Documentos</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Documentos</h1>
            <p className="text-sm text-muted-foreground">
              Solicite e baixe seus documentos acadêmicos
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className="h-10 gap-2 border-secondary/30 bg-secondary/10 px-4 font-semibold text-secondary shadow-sm"
            >
              <FileCheck className="size-4" />
              {availableCount} disponível{availableCount !== 1 ? 'is' : ''}
            </Badge>
            <TipsDialog />
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {DOC_TYPES.map((t) => {
          const doc = byType.get(t);
          const docInfo = DOC_LABELS[t];
          const IconComponent = docInfo.icon;

          return (
            <Card key={t} className="overflow-hidden transition-all hover:shadow-md">
              <CardHeader className={`border-b ${
                doc?.status === 'AVAILABLE' 
                  ? 'bg-gradient-to-r from-secondary/10 to-transparent' 
                  : 'bg-gradient-to-r from-muted/50 to-transparent'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex size-10 items-center justify-center rounded-lg ${
                      doc?.status === 'AVAILABLE' 
                        ? 'bg-secondary/20 shadow-[0_0_12px_rgba(37,185,121,0.2)]' 
                        : 'bg-muted'
                    }`}>
                      <IconComponent className={`size-5 ${
                        doc?.status === 'AVAILABLE' ? 'text-secondary' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{docInfo.title}</CardTitle>
                      <CardDescription className="text-xs">{docInfo.description}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {getStatusBadge(doc?.status)}
                </div>

                {doc?.generated_at ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Gerado em</span>
                    <span className="font-medium">{formatDateTimeBR(doc.generated_at)}</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Solicite para gerar o documento.
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <RequestDocumentButton docType={t} />
                  {doc?.file_url ? (
                    <Button asChild variant="outline" size="sm" className="gap-1.5">
                      <Link href={`/api/proxy${doc.file_url}`} target="_blank">
                        <Download className="size-4" />
                        Baixar
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
