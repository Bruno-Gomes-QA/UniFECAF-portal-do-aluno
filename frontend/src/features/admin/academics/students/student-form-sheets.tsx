"use client";

import { useRouter } from "next/navigation";
import { z } from "zod";
import {
  Pencil,
  Trash2,
  Lock,
  GraduationCap,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

import { adminStudentsApi } from "@/features/admin/academics/students/api";
import type { Student, StudentStatus } from "@/features/admin/academics/students/types";
import {
  STUDENT_STATUS_LABELS,
  STUDENT_STATUS_COLORS,
} from "@/features/admin/academics/students/types";
import { FormDialog } from "@/components/shared/form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AsyncCombobox } from "@/components/shared/async-combobox";
import { Combobox } from "@/components/shared/combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiBrowser } from "@/lib/api/browser";
import { API_V1 } from "@/lib/api/routes";
import type { PaginatedResponse } from "@/types/api";
import type { AdminUser } from "@/features/admin/users/types";
import { handleApiError } from "@/lib/api/error-handler";
import { cn } from "@/lib/utils";

const createSchema = z.object({
  user_id: z.string().uuid("Selecione um usuário válido."),
  ra: z.string().optional(), // Auto-generated if not provided
  full_name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres."),
  course_id: z.string().uuid("Selecione um curso válido."),
  admission_term: z.string().uuid().optional(),
  // total_progress removed - calculated automatically
});

const editSchema = z.object({
  full_name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres."),
  course_id: z.string().uuid("Selecione um curso válido."),
  admission_term: z.string().uuid().optional(),
  // total_progress removed - calculated automatically
});

type Option = { id: string; label: string };

/* -------------------------------------------------------------------------- */
/*                               StudentStatusBadge                            */
/* -------------------------------------------------------------------------- */

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  return (
    <Badge className={cn("font-medium", STUDENT_STATUS_COLORS[status])}>
      {STUDENT_STATUS_LABELS[status]}
    </Badge>
  );
}

/* -------------------------------------------------------------------------- */
/*                               CreateStudentSheet                            */
/* -------------------------------------------------------------------------- */

export function CreateStudentSheet({
  courses,
  terms,
  trigger,
}: {
  courses: Option[];
  terms: Option[];
  trigger?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <FormDialog
      title="Novo aluno"
      description="Cadastre o perfil acadêmico do aluno. O RA será gerado automaticamente se não informado."
      triggerLabel="Novo aluno"
      trigger={trigger}
      schema={createSchema}
      defaultValues={{
        user_id: "",
        ra: "",
        full_name: "",
        course_id: courses[0]?.id || "",
        admission_term: terms[0]?.id || undefined,
      }}
      onSubmit={async (values) => {
        await adminStudentsApi.create({
          user_id: values.user_id,
          ra: values.ra || undefined, // Send undefined to auto-generate
          full_name: values.full_name,
          course_id: values.course_id,
          admission_term: values.admission_term || null,
          // total_progress omitted - will be calculated by backend
        });
        router.refresh();
      }}
    >
      {(form) => (
        <>
          <div className="space-y-2">
            <Label>Usuário (perfil aluno)</Label>
            <AsyncCombobox
              value={form.watch("user_id")}
              onValueChange={(v) => form.setValue("user_id", v)}
              placeholder="Selecione um usuário"
              searchPlaceholder="Buscar usuário por email..."
              loadOptions={async ({ search, offset, limit }) => {
                const params = new URLSearchParams({
                  limit: String(limit),
                  offset: String(offset),
                  role: "STUDENT",
                  status: "ACTIVE", // Only active users
                });
                if (search) params.set("email", search);
                const data = await apiBrowser.get<PaginatedResponse<AdminUser>>(
                  `${API_V1.admin.users}?${params.toString()}`
                );
                return {
                  options: data.items.map((u) => ({ value: u.id, label: u.email })),
                  hasMore: offset + limit < data.total,
                };
              }}
            />
            <p className="text-xs text-muted-foreground">
              O usuário precisa estar cadastrado com perfil STUDENT e status ACTIVE.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ra">RA (opcional)</Label>
              <Input id="ra" placeholder="Auto-gerado se vazio" {...form.register("ra")} />
              <p className="text-xs text-muted-foreground">Mínimo 6 dígitos.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_progress">Progresso (%)</Label>
              <Input
                id="total_progress"
                type="number"
                value="0"
                disabled
                className="bg-muted"
                title="O progresso é calculado automaticamente baseado nos semestres concluídos"
              />
              <p className="text-xs text-muted-foreground">Calculado automaticamente</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Nome completo</Label>
            <Input id="full_name" {...form.register("full_name")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Curso</Label>
              <Combobox
                value={form.watch("course_id")}
                onValueChange={(v) => form.setValue("course_id", v)}
                options={courses.map((c) => ({ value: c.id, label: c.label }))}
                placeholder="Selecione um curso"
                searchPlaceholder="Buscar curso..."
              />
            </div>
            <div className="space-y-2">
              <Label>Termo de admissão (opcional)</Label>
              <Combobox
                value={form.watch("admission_term") || ""}
                onValueChange={(v) => form.setValue("admission_term", v || undefined)}
                options={[
                  { value: "", label: "Não informado" },
                  ...terms.map((t) => ({ value: t.id, label: t.label })),
                ]}
                placeholder="Selecione um termo"
                searchPlaceholder="Buscar termo..."
              />
            </div>
          </div>
        </>
      )}
    </FormDialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                               EditStudentSheet                              */
/* -------------------------------------------------------------------------- */

export function EditStudentSheet({
  student,
  courses,
  terms,
}: {
  student: Student;
  courses: Option[];
  terms: Option[];
}) {
  const router = useRouter();

  // Block editing DELETED students
  if (student.status === "DELETED") {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled
        title="Reative o aluno para editar"
      >
        <Pencil className="h-3.5 w-3.5 opacity-50" />
        <span className="sr-only">Editar (bloqueado)</span>
      </Button>
    );
  }

  return (
    <FormDialog
      title="Editar aluno"
      description={student.full_name}
      trigger={
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span className="sr-only">Editar</span>
        </Button>
      }
      schema={editSchema}
      defaultValues={{
        full_name: student.full_name,
        course_id: student.course_id,
        admission_term: student.admission_term || undefined,
      }}
      onSubmit={async (values) => {
        await adminStudentsApi.update(student.user_id, {
          full_name: values.full_name,
          course_id: values.course_id,
          admission_term: values.admission_term || null,
          // total_progress omitted - will be recalculated by backend
        });
        router.refresh();
      }}
    >
      {(form) => (
        <>
          <div className="space-y-2">
            <Label>RA (não editável)</Label>
            <Input value={student.ra} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">RA não pode ser alterado após criação.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="total_progress">Progresso (%)</Label>
            <Input
              id="total_progress"
              type="number"
              value={Number(student.total_progress).toFixed(0)}
              disabled
              className="bg-muted"
              title="O progresso é calculado automaticamente baseado nos semestres concluídos"
            />
            <p className="text-xs text-muted-foreground">Calculado automaticamente</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Nome completo</Label>
            <Input id="full_name" {...form.register("full_name")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Curso</Label>
              <Combobox
                value={form.watch("course_id")}
                onValueChange={(v) => form.setValue("course_id", v)}
                options={courses.map((c) => ({ value: c.id, label: c.label }))}
                placeholder="Selecione um curso"
                searchPlaceholder="Buscar curso..."
              />
            </div>
            <div className="space-y-2">
              <Label>Termo de admissão (opcional)</Label>
              <Combobox
                value={form.watch("admission_term") || ""}
                onValueChange={(v) => form.setValue("admission_term", v || undefined)}
                options={[
                  { value: "", label: "Não informado" },
                  ...terms.map((t) => ({ value: t.id, label: t.label })),
                ]}
                placeholder="Selecione um termo"
                searchPlaceholder="Buscar termo..."
              />
            </div>
          </div>
        </>
      )}
    </FormDialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                             Action Buttons                                  */
/* -------------------------------------------------------------------------- */

export function DeleteStudentButton({
  studentId,
  label,
  currentStatus,
}: {
  studentId: string;
  label: string;
  currentStatus: StudentStatus;
}) {
  const router = useRouter();

  // Already deleted - no button
  if (currentStatus === "DELETED") {
    return null;
  }

  return (
    <ConfirmDialog
      title="Remover aluno?"
      description={`Isto marca "${label}" como excluído. Dados acadêmicos serão preservados.`}
      confirmLabel="Remover"
      onConfirm={async () => {
        try {
          await adminStudentsApi.remove(studentId);
          router.refresh();
        } catch (err) {
          handleApiError(err, "Erro ao remover aluno.");
        }
      }}
      trigger={
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-destructive/10 text-destructive/70 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="sr-only">Remover</span>
        </Button>
      }
    />
  );
}

export function LockStudentButton({
  studentId,
  label,
  currentStatus,
}: {
  studentId: string;
  label: string;
  currentStatus: StudentStatus;
}) {
  const router = useRouter();

  // Only ACTIVE students can be locked
  if (currentStatus !== "ACTIVE") {
    return null;
  }

  return (
    <ConfirmDialog
      title="Trancar matrícula?"
      description={`Isto tranca a matrícula de "${label}". O aluno não terá acesso ao portal.`}
      confirmLabel="Trancar"
      onConfirm={async () => {
        try {
          await adminStudentsApi.lock(studentId);
          router.refresh();
        } catch (err) {
          handleApiError(err, "Erro ao trancar matrícula.");
        }
      }}
      trigger={
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-yellow-600 hover:text-yellow-700"
          title="Trancar matrícula"
        >
          <Lock className="h-3.5 w-3.5" />
          <span className="sr-only">Trancar</span>
        </Button>
      }
    />
  );
}

export function GraduateStudentButton({
  studentId,
  label,
  currentStatus,
}: {
  studentId: string;
  label: string;
  currentStatus: StudentStatus;
}) {
  const router = useRouter();

  // Only ACTIVE students can be graduated
  if (currentStatus !== "ACTIVE") {
    return null;
  }

  return (
    <ConfirmDialog
      title="Marcar como formado?"
      description={`Isto marca "${label}" como formado. ⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL.`}
      confirmLabel="Marcar como formado"
      onConfirm={async () => {
        try {
          await adminStudentsApi.graduate(studentId);
          router.refresh();
        } catch (err) {
          handleApiError(err, "Erro ao marcar como formado.");
        }
      }}
      trigger={
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 hover:text-blue-700"
          title="Marcar como formado"
        >
          <GraduationCap className="h-3.5 w-3.5" />
          <span className="sr-only">Formar</span>
        </Button>
      }
    />
  );
}

export function ReactivateStudentButton({
  studentId,
  label,
  currentStatus,
}: {
  studentId: string;
  label: string;
  currentStatus: StudentStatus;
}) {
  const router = useRouter();

  // Only DELETED or LOCKED students can be reactivated
  // GRADUATED cannot be reactivated
  if (currentStatus === "ACTIVE" || currentStatus === "GRADUATED") {
    return null;
  }

  return (
    <ConfirmDialog
      title="Reativar aluno?"
      description={`Isto reativa "${label}". O aluno terá acesso ao portal novamente.`}
      confirmLabel="Reativar"
      onConfirm={async () => {
        try {
          await adminStudentsApi.reactivate(studentId);
          router.refresh();
        } catch (err) {
          handleApiError(err, "Erro ao reativar aluno.");
        }
      }}
      trigger={
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 hover:text-green-700"
          title="Reativar"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="sr-only">Reativar</span>
        </Button>
      }
    />
  );
}

/* -------------------------------------------------------------------------- */
/*                           StudentRowActions                                 */
/* -------------------------------------------------------------------------- */

/**
 * Composite component for all student row actions.
 * Shows different buttons based on current status.
 */
export function StudentRowActions({
  student,
  courses,
  terms,
}: {
  student: Student;
  courses: Option[];
  terms: Option[];
}) {
  return (
    <div className="flex items-center gap-1">
      <EditStudentSheet student={student} courses={courses} terms={terms} />
      <LockStudentButton
        studentId={student.user_id}
        label={student.full_name}
        currentStatus={student.status}
      />
      <GraduateStudentButton
        studentId={student.user_id}
        label={student.full_name}
        currentStatus={student.status}
      />
      <ReactivateStudentButton
        studentId={student.user_id}
        label={student.full_name}
        currentStatus={student.status}
      />
      <DeleteStudentButton
        studentId={student.user_id}
        label={student.full_name}
        currentStatus={student.status}
      />
    </div>
  );
}

