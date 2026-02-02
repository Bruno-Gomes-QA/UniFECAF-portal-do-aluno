'use client';

import { useRouter } from 'next/navigation';
import { AsyncCombobox } from '@/components/shared/async-combobox';
import { adminSectionsApi } from '@/features/admin/academics/sections/api';
import { adminTermsApi } from '@/features/admin/academics/terms/api';
import { adminSubjectsApi } from '@/features/admin/academics/subjects/api';
import { useEffect, useState } from 'react';

type AsyncSectionSelectorProps = {
  currentValue?: string;
  basePath?: string;
  termId?: string;
};

export function AsyncSectionSelector({
  currentValue,
  basePath = '/administrativo/academico/aulas',
  termId,
}: AsyncSectionSelectorProps) {
  const router = useRouter();
  const [termMap, setTermMap] = useState<Map<string, string>>(new Map());
  const [subjectMap, setSubjectMap] = useState<Map<string, string>>(new Map());
  const [mapsLoaded, setMapsLoaded] = useState(false);

  // Load term and subject maps on mount
  useEffect(() => {
    async function loadMaps() {
      try {
        const [terms, subjects] = await Promise.all([
          adminTermsApi.list({ limit: 100, offset: 0 }),
          adminSubjectsApi.list({ limit: 200, offset: 0 }),
        ]);
        setTermMap(new Map(terms.items.map((t: any) => [t.id, t.code])));
        setSubjectMap(new Map(subjects.items.map((s: any) => [s.id, s.name])));
        setMapsLoaded(true);
      } catch (error) {
        console.error('Failed to load term/subject maps:', error);
        setMapsLoaded(true); // Still mark as loaded to not block
      }
    }
    loadMaps();
  }, []);

  const loadSections = async ({ search, offset, limit }: { search: string; offset: number; limit: number }) => {
    try {
      const result = await adminSectionsApi.list({ 
        limit, 
        offset,
        term_id: termId,
      });
      
      const filtered = search
        ? result.items.filter((s: any) => {
            const termCode = termMap.get(s.term_id) || '';
            const subjectName = subjectMap.get(s.subject_id) || '';
            const label = `${termCode} ${subjectName} ${s.code}`.toLowerCase();
            return label.includes(search.toLowerCase());
          })
        : result.items;

      return {
        options: filtered.map((s: any) => ({
          value: s.id,
          label: `${termMap.get(s.term_id) || '?'} • ${subjectMap.get(s.subject_id) || '?'} • ${s.code}`,
          description: s.room_default ? `Sala ${s.room_default}` : undefined,
        })),
        hasMore: result.total > offset + limit
      };
    } catch (error) {
      console.error('Failed to load sections:', error);
      return { options: [], hasMore: false };
    }
  };

  const handleChange = (value: string) => {
    if (value) {
      router.push(`${basePath}?section_id=${value}`);
    }
  };

  if (!mapsLoaded) {
    return (
      <div className="h-10 w-full animate-pulse bg-muted rounded-md" />
    );
  }

  return (
    <AsyncCombobox
      value={currentValue || ''}
      onValueChange={handleChange}
      loadOptions={loadSections}
      placeholder="Buscar turma..."
      searchPlaceholder="Digite para buscar..."
      emptyLabel="Nenhuma turma encontrada."
    />
  );
}
