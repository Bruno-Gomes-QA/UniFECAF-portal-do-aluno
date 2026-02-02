export type AdminUser = {
  id: string;
  email: string;
  role: 'ADMIN' | 'STUDENT';
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  is_superadmin: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
};

export type AdminUserCreateRequest = {
  email: string;
  password: string;
  role: 'ADMIN' | 'STUDENT';
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
};

export type AdminUserUpdateRequest = {
  password?: string;
  role?: 'ADMIN' | 'STUDENT';
  status?: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
};

