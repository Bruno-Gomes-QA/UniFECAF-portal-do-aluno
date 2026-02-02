import type { DegreeType } from './types';

export const DEGREE_TYPE_LABELS: Record<DegreeType, string> = {
  TECNOLOGO: 'Tecnólogo',
  BACHARELADO: 'Bacharelado',
  LICENCIATURA: 'Licenciatura',
  TECNICO: 'Técnico',
  POS_GRADUACAO: 'Pós-Graduação',
};

export const formatDegreeType = (type: DegreeType): string =>
  DEGREE_TYPE_LABELS[type] || type;

export const formatDuration = (terms: number): string =>
  terms === 1 ? '1 semestre' : `${terms} semestres`;

export const formatWorkload = (credits: number): string =>
  `${credits * 20}h`;
