'use client';

import { FiltersAsyncCombobox, FilterAsyncOption } from '@/components/shared/filters-async-combobox';
import { adminStudentsApi } from '@/features/admin/academics/students/api';

type StudentAsyncFilterProps = {
  name?: string;
  defaultValue?: string;
  defaultLabel?: string;
  placeholder?: string;
  allLabel?: string;
  className?: string;
};

export function StudentAsyncFilter({
  name = 'student_id',
  defaultValue = '',
  defaultLabel,
  placeholder = 'Selecione um aluno',
  allLabel = 'Todos os alunos',
  className,
}: StudentAsyncFilterProps) {
  const loadOptions = async (params: { search: string; offset: number; limit: number }) => {
    const response = await adminStudentsApi.list({
      limit: params.limit,
      offset: params.offset,
      search: params.search || undefined,
    });

    const options: FilterAsyncOption[] = response.items.map((s: any) => ({
      value: s.user_id,
      label: `${s.full_name} (${s.ra})`,
    }));

    return {
      options,
      hasMore: response.total > params.offset + params.limit,
    };
  };

  return (
    <FiltersAsyncCombobox
      name={name}
      defaultValue={defaultValue}
      defaultLabel={defaultLabel}
      loadOptions={loadOptions}
      placeholder={placeholder}
      searchPlaceholder="Buscar por RA ou nome..."
      allLabel={allLabel}
      className={className}
    />
  );
}
