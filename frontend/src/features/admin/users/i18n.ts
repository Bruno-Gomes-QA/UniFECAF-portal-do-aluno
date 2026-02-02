export type UserRole = 'STUDENT' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED';

export function formatUserRole(role: string): string {
  if (role === 'STUDENT') return 'Aluno';
  if (role === 'ADMIN') return 'Administrador';
  return role;
}

export function formatUserStatus(status: string): string {
  if (status === 'ACTIVE') return 'Ativo';
  if (status === 'INVITED') return 'Convidado';
  if (status === 'SUSPENDED') return 'Suspenso';
  return status;
}

