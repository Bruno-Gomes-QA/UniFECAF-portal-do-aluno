'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { toast } from 'sonner';

import { adminTermsApi } from '@/features/admin/academics/terms/api';
import type { Term } from '@/features/admin/academics/terms/types';
import { FormDialog } from '@/components/shared/form-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { handleApiError } from '@/lib/api/error-handler';
import { Pencil, Trash2, Calendar, Star } from 'lucide-react';
import type { ReactNode } from 'react';

// Component for Switch with confirmation dialog
function CurrentTermSwitch({ 
  checked, 
  onCheckedChange 
}: { 
  checked: boolean; 
  onCheckedChange: (value: boolean) => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingValue, setPendingValue] = useState(false);

  const handleChange = (value: boolean) => {
    if (value) {
      // Show confirmation before marking as current
      setPendingValue(value);
      setShowConfirm(true);
    } else {
      // Can uncheck without confirmation
      onCheckedChange(value);
    }
  };

  const handleConfirm = () => {
    onCheckedChange(pendingValue);
    setShowConfirm(false);
  };

  return (
    <>
      <Switch checked={checked} onCheckedChange={handleChange} />
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Definir como semestre atual?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao marcar este semestre como atual, o semestre atual existente será automaticamente desmarcado. 
              Apenas um semestre pode ser o atual de cada vez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirm(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const schema = z.object({
  code: z.string().min(1, 'Código é obrigatório'),
  start_date: z.string().min(1, 'Data de início é obrigatória'),
  end_date: z.string().min(1, 'Data de fim é obrigatória'),
  is_current: z.boolean(),
});

const generateSchema = z.object({
  date_from: z.string().min(1, 'Data inicial é obrigatória'),
  date_to: z.string().min(1, 'Data final é obrigatória'),
});

export function CreateTermSheet({ trigger }: { trigger?: ReactNode }) {
  const router = useRouter();
  return (
    <FormDialog
      title="Novo Semestre"
      description="Cadastre um novo período letivo."
      trigger={trigger}
      triggerLabel={trigger ? undefined : "Novo Semestre"}
      schema={schema}
      defaultValues={{ code: '', start_date: '', end_date: '', is_current: false }}
      onSubmit={async (values) => {
        await adminTermsApi.create(values);
        toast.success('Semestre criado com sucesso!');
        router.refresh();
      }}
    >
      {(form) => (
        <>
          <div className="space-y-2">
            <Label htmlFor="code">Código</Label>
            <Input id="code" placeholder="2025-1" {...form.register('code')} />
            <p className="text-xs text-muted-foreground">Formato recomendado: ANO-SEMESTRE (ex: 2025-1, 2025-2)</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_date">Data de Início</Label>
              <Input id="start_date" type="date" {...form.register('start_date')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Data de Fim</Label>
              <Input id="end_date" type="date" {...form.register('end_date')} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
            <div>
              <p className="text-sm font-medium">Semestre atual</p>
              <p className="text-xs text-muted-foreground">Marque para definir como período vigente.</p>
            </div>
            <CurrentTermSwitch checked={form.watch('is_current')} onCheckedChange={(v) => form.setValue('is_current', v)} />
          </div>
        </>
      )}
    </FormDialog>
  );
}

export function EditTermSheet({ term }: { term: Term }) {
  const router = useRouter();
  return (
    <FormDialog
      title="Editar Semestre"
      description={`Editando: ${term.code}`}
      trigger={
        <Button variant="ghost" size="sm" className="h-8 px-2">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      }
      schema={schema}
      defaultValues={{
        code: term.code,
        start_date: term.start_date,
        end_date: term.end_date,
        is_current: term.is_current,
      }}
      onSubmit={async (values) => {
        await adminTermsApi.update(term.id, values);
        toast.success('Semestre atualizado com sucesso!');
        router.refresh();
      }}
    >
      {(form) => (
        <>
          <div className="space-y-2">
            <Label htmlFor="code">Código</Label>
            <Input id="code" {...form.register('code')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_date">Data de Início</Label>
              <Input id="start_date" type="date" {...form.register('start_date')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Data de Fim</Label>
              <Input id="end_date" type="date" {...form.register('end_date')} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
            <div>
              <p className="text-sm font-medium">Semestre atual</p>
              <p className="text-xs text-muted-foreground">Ao marcar, os demais são desmarcados automaticamente.</p>
            </div>
            <CurrentTermSwitch checked={form.watch('is_current')} onCheckedChange={(v) => form.setValue('is_current', v)} />
          </div>
        </>
      )}
    </FormDialog>
  );
}

export function DeleteTermButton({ termId, code }: { termId: string; code: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      title="Remover Semestre?"
      description={`Esta ação irá remover o semestre "${code}". Semestres com turmas vinculadas não podem ser removidos.`}
      confirmLabel="Remover"
      onConfirm={async () => {
        try {
          await adminTermsApi.remove(termId);
          toast.success('Semestre removido com sucesso!');
          router.refresh();
        } catch (error) {
          handleApiError(error, 'Erro ao remover semestre');
        }
      }}
      trigger={
        <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      }
    />
  );
}

export function SetCurrentTermButton({ termId, code }: { termId: string; code: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      title="Definir como Atual?"
      description={`Deseja definir "${code}" como o semestre atual? Os demais semestres serão desmarcados.`}
      confirmLabel="Definir"
      onConfirm={async () => {
        try {
          await adminTermsApi.setCurrent(termId);
          toast.success(`${code} definido como semestre atual!`);
          router.refresh();
        } catch (error) {
          handleApiError(error, 'Erro ao definir semestre atual');
        }
      }}
      trigger={
        <Button variant="ghost" size="sm" className="h-8 px-2">
          <Star className="h-3.5 w-3.5" />
        </Button>
      }
    />
  );
}

export function GenerateSessionsSheet({ term }: { term: Term }) {
  const router = useRouter();
  return (
    <FormDialog
      title="Gerar Aulas"
      description={`Gera aulas automaticamente para todas as turmas do semestre ${term.code}, baseado nos horários cadastrados.`}
      trigger={
        <Button variant="ghost" size="sm" className="h-8 px-2">
          <Calendar className="h-3.5 w-3.5" />
        </Button>
      }
      schema={generateSchema}
      defaultValues={{ date_from: term.start_date, date_to: term.end_date }}
      submitLabel="Gerar Aulas"
      onSubmit={async (values) => {
        try {
          const result = await adminTermsApi.generateSessions(term.id, values);
          toast.success(`Aulas geradas: ${result.created} criadas, ${result.skipped} ignoradas (já existiam)`);
          router.refresh();
        } catch (error) {
          handleApiError(error, 'Erro ao gerar aulas');
        }
      }}
    >
      {(form) => (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            O sistema criará uma aula para cada dia da semana definido nos horários das turmas, dentro do período especificado.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date_from">Data Inicial</Label>
              <Input id="date_from" type="date" {...form.register('date_from')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_to">Data Final</Label>
              <Input id="date_to" type="date" {...form.register('date_to')} />
            </div>
          </div>
        </div>
      )}
    </FormDialog>
  );
}
