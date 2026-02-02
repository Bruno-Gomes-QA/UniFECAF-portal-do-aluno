export type UserRole = 'STUDENT' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED';

export type AuthMeResponse = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  last_login_at: string | null;
};

