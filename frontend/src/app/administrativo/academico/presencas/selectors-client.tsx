'use client';

import { useRouter } from 'next/navigation';
import { AsyncCombobox } from '@/components/shared/async-combobox';
import { FiltersSelect } from '@/components/shared/filters-select';
import { Label } from '@/components/ui/label';
import { GraduationCap, CalendarDays } from 'lucide-react';

type SectionOption = {
  value: string;
  label: string;
  termCode?: string;
  subjectName?: string;
};

type SessionOption = {
  value: string;
  label: string;
  date: string;
  isCanceled: boolean;
};

type SelectorsClientProps = {
  sectionId?: string;
  sessionId?: string;
  sectionOptions: SectionOption[];
  sessionOptions: SessionOption[];
  currentSection?: any;
  currentTerm?: any;
  currentSubject?: any;
  currentSession?: any;
};

export function SelectorsClient({
  sectionId,
  sessionId,
  sectionOptions,
  sessionOptions,
  currentSection,
  currentTerm,
  currentSubject,
  currentSession,
}: SelectorsClientProps) {
  const router = useRouter();

  const loadSectionOptions = async ({ search, offset, limit }: { search: string; offset: number; limit: number }) => {
    const filtered = search
      ? sectionOptions.filter(s => s.label.toLowerCase().includes(search.toLowerCase()))
      : sectionOptions;
    return {
      options: filtered.slice(offset, offset + limit),
      hasMore: filtered.length > offset + limit
    };
  };

  const handleSectionChange = (value: string) => {
    if (value) {
      router.push(`/administrativo/academico/presencas?section_id=${value}`);
    }
  };

  const handleSessionChange = (value: string) => {
    if (value && sectionId) {
      router.push(`/administrativo/academico/presencas?section_id=${sectionId}&session_id=${value}`);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Section Selector */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
          Turma
        </Label>
        <AsyncCombobox
          value={sectionId || ''}
          onValueChange={handleSectionChange}
          loadOptions={loadSectionOptions}
          placeholder="Buscar turma..."
          searchPlaceholder="Digite para buscar..."
          emptyLabel="Nenhuma turma encontrada."
        />
        {sectionId && currentSection && (
          <p className="text-xs text-muted-foreground">
            {currentTerm?.code} • {currentSubject?.name} • Turma {currentSection.code}
          </p>
        )}
      </div>

      {/* Session Selector */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          Aula
        </Label>
        {!sectionId ? (
          <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
            Selecione uma turma primeiro
          </div>
        ) : sessionOptions.length === 0 ? (
          <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
            Nenhuma aula encontrada
          </div>
        ) : (
          <FiltersSelect
            name="session_id"
            value={sessionId}
            allLabel="Selecione uma aula"
            options={sessionOptions}
            onValueChange={handleSessionChange}
          />
        )}
        {sessionId && currentSession && (
          <p className="text-xs text-muted-foreground">
            {new Date(currentSession.session_date).toLocaleDateString('pt-BR')} às {currentSession.start_time}
            {currentSession.is_canceled && <span className="text-destructive"> (Cancelada)</span>}
          </p>
        )}
      </div>
    </div>
  );
}
