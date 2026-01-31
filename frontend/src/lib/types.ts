/**
 * UniFECAF Portal do Aluno - API Types
 * Types matching the backend Pydantic schemas
 */

// ============== Auth ==============

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user_id: string;
  email: string;
}

export interface UserInfo {
  id: string;
  email: string;
  role: 'STUDENT' | 'STAFF' | 'ADMIN';
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
}

// ============== Student Info ==============

export interface CourseInfo {
  id: string;
  name: string;
  degree_type: string | null;
  campus_name: string | null;
}

export interface StudentInfo {
  user_id: string;
  ra: string;
  full_name: string;
  email: string;
  course: CourseInfo;
  total_progress: number;
  current_term: string | null;
}

// ============== Grades ==============

export interface SubjectGrade {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  final_score: number | null;
  absences_count: number;
  absences_pct: number;
  status: 'IN_PROGRESS' | 'APPROVED' | 'FAILED';
  has_absence_alert: boolean;
}

export interface GradeSummary {
  current_term: string;
  subjects: SubjectGrade[];
  average_score: number | null;
  subjects_at_risk: number;
}

// ============== Financial ==============

export interface InvoiceInfo {
  id: string;
  description: string;
  due_date: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELED';
  is_overdue: boolean;
}

export interface FinancialSummary {
  invoices: InvoiceInfo[];
  total_pending: number;
  total_overdue: number;
  has_pending: boolean;
  has_overdue: boolean;
}

// ============== Agenda ==============

export interface ClassInfo {
  session_id: string;
  subject_name: string;
  subject_code: string;
  start_time: string;
  end_time: string;
  room: string | null;
  is_next: boolean;
}

export interface TodayAgenda {
  date: string;
  classes: ClassInfo[];
  total_classes: number;
  next_class: ClassInfo | null;
}

// ============== Notifications ==============

export interface NotificationInfo {
  id: string;
  notification_id: string;
  type: 'ACADEMIC' | 'FINANCIAL' | 'ADMIN';
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  title: string | null;
  body: string;
  delivered_at: string;
  read_at: string | null;
  is_read: boolean;
}

// ============== Quick Actions ==============

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  href: string;
  description: string | null;
}

// ============== Home Response ==============

export interface HomeResponse {
  student: StudentInfo;
  grades: GradeSummary;
  financial: FinancialSummary;
  today_agenda: TodayAgenda;
  notifications: NotificationInfo[];
  unread_notifications_count: number;
  quick_actions: QuickAction[];
  generated_at: string;
}

// ============== API Error ==============

export interface ApiError {
  detail: string;
}
