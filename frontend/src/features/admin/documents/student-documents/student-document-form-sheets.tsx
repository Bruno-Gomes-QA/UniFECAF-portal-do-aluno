'use client';

import { useRouter } from 'next/navigation';
import { z } from 'zod';

import { adminStudentDocumentsApi } from '@/features/admin/documents/student-documents/api';
import type { StudentDocument } from '@/features/admin/documents/student-documents/types';
import { FormSheet } from '@/components/shared/form-sheet';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Combobox } from '@/components/shared/combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDocumentStatus, formatDocumentType, type StudentDocumentStatus, type StudentDocumentType } from '@/features/admin/documents/i18n';

const createSchema = z.object({
  student_id: z.string().uuid(),
  doc_type: z.enum(['DECLARATION', 'STUDENT_CARD', 'TRANSCRIPT']),
  status: z.enum(['AVAILABLE', 'GENERATING', 'ERROR']),
  title: z.string().optional(),
  file_url: z.string().optional(),
  generated_at: z.string().optional(),
});

const updateSchema = z.object({
  status: z.enum(['AVAILABLE', 'GENERATING', 'ERROR']).optional(),
  title: z.string().optional(),
  file_url: z.string().optional(),
  generated_at: z.string().optional(),
});

type Option = { id: string; label: string };

type CreateStudentDocumentSheetProps = {
  students: Option[];
  trigger?: React.ReactNode;
};

export function CreateStudentDocumentSheet({ students, trigger }: CreateStudentDocumentSheetProps) {
  const router = useRouter();
  return (
    <FormSheet
      title="Novo documento"
      description="Documento de aluno (student+doc_type é único)."
      trigger={trigger}
      triggerLabel={trigger ? undefined : "Novo documento"}
      schema={createSchema}
      defaultValues={{
        student_id: '',
        doc_type: 'DECLARATION',
        status: 'AVAILABLE',
        title: '',
        file_url: '',
        generated_at: '',
      }}
      onSubmit={async (values) => {
        await adminStudentDocumentsApi.create({
          student_id: values.student_id,
          doc_type: values.doc_type,
          status: values.status,
          title: values.title || null,
          file_url: values.file_url || null,
          generated_at: values.generated_at ? new Date(values.generated_at).toISOString() : null,
        });
        router.refresh();
      }}
    >
      {(form) => (
        <>
          <div className="space-y-2">
            <Label>Aluno</Label>
            <Combobox
              value={form.watch('student_id')}
              onValueChange={(v) => form.setValue('student_id', v)}
              options={students.map((s) => ({ value: s.id, label: s.label }))}
              placeholder="Selecione um aluno"
              searchPlaceholder="Buscar aluno..."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.watch('doc_type')}
                onValueChange={(v) => form.setValue('doc_type', v as StudentDocumentType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(['DECLARATION', 'STUDENT_CARD', 'TRANSCRIPT'] as const).map((value) => (
                    <SelectItem key={value} value={value}>
                      {formatDocumentType(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Situação</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(v) => form.setValue('status', v as StudentDocumentStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(['AVAILABLE', 'GENERATING', 'ERROR'] as const).map((value) => (
                    <SelectItem key={value} value={value}>
                      {formatDocumentStatus(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Título (opcional)</Label>
            <Input id="title" {...form.register('title')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file_url">URL (opcional)</Label>
            <Input id="file_url" {...form.register('file_url')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="generated_at">Gerado em (opcional)</Label>
            <Input id="generated_at" type="datetime-local" {...form.register('generated_at')} />
          </div>
        </>
      )}
    </FormSheet>
  );
}

export function EditStudentDocumentSheet({ doc }: { doc: StudentDocument }) {
  const router = useRouter();
  return (
    <FormSheet
      title="Editar documento"
      description={doc.id}
      trigger={
        <Button variant="outline" size="sm">
          Editar
        </Button>
      }
      schema={updateSchema}
      defaultValues={{
        status: doc.status as 'AVAILABLE' | 'GENERATING' | 'ERROR',
        title: doc.title || '',
        file_url: doc.file_url || '',
        generated_at: '',
      }}
      onSubmit={async (values) => {
        await adminStudentDocumentsApi.update(doc.id, {
          status: values.status,
          title: values.title || null,
          file_url: values.file_url || null,
          generated_at: values.generated_at ? new Date(values.generated_at).toISOString() : null,
        });
        router.refresh();
      }}
    >
      {(form) => (
        <>
          <div className="space-y-2">
            <Label>Situação</Label>
            <Select
              value={form.watch('status') ?? '__unchanged__'}
              onValueChange={(v) =>
                form.setValue('status', (v === '__unchanged__' ? undefined : v) as StudentDocumentStatus | undefined)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unchanged__">Não alterar</SelectItem>
                {(['AVAILABLE', 'GENERATING', 'ERROR'] as const).map((value) => (
                  <SelectItem key={value} value={value}>
                    {formatDocumentStatus(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" {...form.register('title')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file_url">URL</Label>
            <Input id="file_url" {...form.register('file_url')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="generated_at">Gerado em</Label>
            <Input id="generated_at" type="datetime-local" {...form.register('generated_at')} />
          </div>
        </>
      )}
    </FormSheet>
  );
}

export function DeleteStudentDocumentButton({ docId }: { docId: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      title="Remover documento?"
      description={docId}
      confirmLabel="Remover"
      onConfirm={async () => {
        await adminStudentDocumentsApi.remove(docId);
        router.refresh();
      }}
      trigger={
        <Button variant="destructive" size="sm">
          Remover
        </Button>
      }
    />
  );
}
