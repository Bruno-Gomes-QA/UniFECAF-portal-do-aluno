'use client';

import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Pencil, Trash2 } from 'lucide-react';
import { ReactNode } from 'react';
import { toast } from 'sonner';

import { adminSectionsApi } from '@/features/admin/academics/sections/api';
import type { Section } from '@/features/admin/academics/sections/types';
import { FormDialog } from '@/components/shared/form-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Combobox } from '@/components/shared/combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  term_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  code: z.string().min(1),
  room_default: z.string().optional(),
  capacity: z.coerce.number().int().min(0).optional(),
});

type Option = { id: string; label: string };

export function CreateSectionSheet({ 
  terms, 
  subjects,
  trigger,
}: { 
  terms: Option[]; 
  subjects: Option[];
  trigger?: ReactNode;
}) {
  const router = useRouter();
  return (
    <FormDialog
      title="Nova turma"
      description="Cadastre uma turma."
      triggerLabel={trigger ? undefined : "Nova turma"}
      trigger={trigger}
      schema={schema}
      defaultValues={{
        term_id: terms[0]?.id || '',
        subject_id: subjects[0]?.id || '',
        code: 'A',
        room_default: '',
        capacity: 60,
      }}
      onSubmit={async (values) => {
        await adminSectionsApi.create({
          term_id: values.term_id,
          subject_id: values.subject_id,
          code: values.code,
          room_default: values.room_default || null,
          capacity: values.capacity ?? null,
        });
        router.refresh();
      }}
    >
      {(form) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Semestre</Label>
              <Combobox
                value={form.watch('term_id')}
                onValueChange={(v) => form.setValue('term_id', v)}
                options={terms.map((t) => ({ value: t.id, label: t.label }))}
                placeholder="Selecione um semestre"
                searchPlaceholder="Buscar semestre..."
              />
            </div>
            <div className="space-y-2">
              <Label>Disciplina</Label>
              <Combobox
                value={form.watch('subject_id')}
                onValueChange={(v) => form.setValue('subject_id', v)}
                options={subjects.map((s) => ({ value: s.id, label: s.label }))}
                placeholder="Selecione uma disciplina"
                searchPlaceholder="Buscar disciplina..."
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input id="code" placeholder="A" {...form.register('code')} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="room_default">Sala padrão</Label>
              <Input id="room_default" placeholder="Sala 1" {...form.register('room_default')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Capacidade</Label>
            <Input id="capacity" type="number" min={0} {...form.register('capacity')} />
          </div>
        </>
      )}
    </FormDialog>
  );
}

export function EditSectionSheet({ section, terms, subjects }: { section: Section; terms: Option[]; subjects: Option[] }) {
  const router = useRouter();
  return (
    <FormDialog
      title="Editar turma"
      description={`Turma ${section.code}`}
      trigger={
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Editar
        </Button>
      }
      schema={schema}
      defaultValues={{
        term_id: section.term_id,
        subject_id: section.subject_id,
        code: section.code,
        room_default: section.room_default || '',
        capacity: section.capacity ?? 0,
      }}
      onSubmit={async (values) => {
        await adminSectionsApi.update(section.id, {
          term_id: values.term_id,
          subject_id: values.subject_id,
          code: values.code,
          room_default: values.room_default || null,
          capacity: values.capacity ?? null,
        });
        router.refresh();
      }}
    >
      {(form) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Semestre</Label>
              <Combobox
                value={form.watch('term_id')}
                onValueChange={(v) => form.setValue('term_id', v)}
                options={terms.map((t) => ({ value: t.id, label: t.label }))}
                placeholder="Selecione um semestre"
                searchPlaceholder="Buscar semestre..."
              />
            </div>
            <div className="space-y-2">
              <Label>Disciplina</Label>
              <Combobox
                value={form.watch('subject_id')}
                onValueChange={(v) => form.setValue('subject_id', v)}
                options={subjects.map((s) => ({ value: s.id, label: s.label }))}
                placeholder="Selecione uma disciplina"
                searchPlaceholder="Buscar disciplina..."
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input id="code" {...form.register('code')} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="room_default">Sala padrão</Label>
              <Input id="room_default" {...form.register('room_default')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Capacidade</Label>
            <Input id="capacity" type="number" min={0} {...form.register('capacity')} />
          </div>
        </>
      )}
    </FormDialog>
  );
}

export function DeleteSectionButton({ sectionId, label }: { sectionId: string; label: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      title="Remover turma?"
      description={`Isto remove "${label}". Turmas com matrículas, aulas, avaliações ou notas não podem ser removidas.`}
      confirmLabel="Remover"
      onConfirm={async () => {
        try {
          await adminSectionsApi.remove(sectionId);
          toast.success('Turma removida com sucesso!');
          router.refresh();
        } catch (error: any) {
          const message = error?.message || 'Erro ao remover turma';
          toast.error(message);
        }
      }}
      trigger={
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Remover
        </Button>
      }
    />
  );
}
