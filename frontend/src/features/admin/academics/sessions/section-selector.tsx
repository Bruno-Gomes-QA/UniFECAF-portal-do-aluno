'use client';

import { useRouter } from 'next/navigation';
import { Combobox } from '@/components/shared/combobox';

type SectionOption = {
  value: string;
  label: string;
  code?: string;
  termCode?: string;
  subjectName?: string;
};

export function SectionSelector({
  options,
  currentValue,
  basePath = '/administrativo/academico/aulas',
}: {
  options: SectionOption[];
  currentValue?: string;
  basePath?: string;
}) {
  const router = useRouter();

  const handleChange = (value: string) => {
    if (value) {
      router.push(`${basePath}?section_id=${value}`);
    }
  };

  return (
    <Combobox
      value={currentValue || ''}
      onValueChange={handleChange}
      options={options.map(o => ({ value: o.value, label: o.label }))}
      placeholder="Selecione uma turma..."
      searchPlaceholder="Buscar turma..."
      emptyLabel="Nenhuma turma encontrada."
    />
  );
}
