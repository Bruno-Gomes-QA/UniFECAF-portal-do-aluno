/**
 * Types for Portal do Aluno API responses
 */

// =========== Schedule / Horários ===========

export type MeScheduleClassInfo = {
  session_id: string;
  subject_id: string;
  subject_code: string;
  subject_name: string;
  section_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  room: string | null;
  is_canceled: boolean;
  weekday: number;
};

export type MeScheduleTodayResponse = {
  date: string;
  classes: MeScheduleClassInfo[];
  total_classes: number;
};

export type MeScheduleWeekResponse = {
  week_start: string;
  week_end: string;
  days: {
    monday: MeScheduleClassInfo[];
    tuesday: MeScheduleClassInfo[];
    wednesday: MeScheduleClassInfo[];
    thursday: MeScheduleClassInfo[];
    friday: MeScheduleClassInfo[];
    saturday: MeScheduleClassInfo[];
    sunday: MeScheduleClassInfo[];
  };
  total_classes: number;
};

// =========== Enrollments / Matrículas ===========

export type MeEnrollmentInfo = {
  enrollment_id: string;
  section_id: string;
  subject_id: string;
  subject_code: string;
  subject_name: string;
  credits: number;
  term_code: string | null;
  professor_name: string | null;
  status: string;
  enrolled_at: string | null;
};

export type MeEnrollmentsResponse = {
  term_code: string | null;
  enrollments: MeEnrollmentInfo[];
  total_credits: number;
};

// =========== Terms / Semestres ===========

export type MeTermOption = {
  id: string;
  code: string;
  is_current: boolean;
};

// =========== Grades / Notas ===========

export type MeGradeComponentInfo = {
  id: string;
  label: string;
  weight: number;
  max_score: number;
  score: number | null;
  graded_at: string | null;
};

export type MeGradeDetailInfo = {
  section_id: string;
  subject_id: string;
  subject_code: string;
  subject_name: string;
  term_code: string | null;
  components: MeGradeComponentInfo[];
  final_score: number | null;
  status: string;
  needs_exam: boolean;
};

export type MeGradesResponse = {
  term_code: string | null;
  grades: MeGradeDetailInfo[];
  average: number | null;
};

// =========== Attendance / Frequência ===========

export type MeAttendanceSessionInfo = {
  session_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  status: 'PRESENT' | 'ABSENT' | 'JUSTIFIED' | 'LATE';
};

export type MeAttendanceSubjectInfo = {
  section_id: string;
  subject_id: string;
  subject_code: string;
  subject_name: string;
  total_sessions: number;
  attended_sessions: number;
  absences_count: number;
  absences_pct: number;
  has_alert: boolean;
  sessions: MeAttendanceSessionInfo[];
};

export type MeAttendanceResponse = {
  term_code: string | null;
  subjects: MeAttendanceSubjectInfo[];
  overall_attendance_pct: number | null;
};

// =========== Transcript / Histórico ===========

export type MeTranscriptSubjectInfo = {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  credits: number;
  final_score: number | null;
  status: 'APPROVED' | 'FAILED' | 'IN_PROGRESS' | 'DROPPED';
  term_code: string;
};

export type MeTranscriptTermInfo = {
  term_code: string;
  term_name: string | null;
  subjects: MeTranscriptSubjectInfo[];
  term_average: number | null;
  term_credits: number;
};

export type MeTranscriptResponse = {
  student_name: string;
  ra: string;
  course_name: string;
  terms: MeTranscriptTermInfo[];
  total_credits_completed: number;
  total_credits_required: number;
  cumulative_average: number | null;
  progress_pct: number;
};

// =========== Profile ===========

export type MeProfileResponse = {
  user_id: string;
  ra: string;
  full_name: string;
  email: string;
  course: {
    id: string;
    name: string;
    degree_type: string | null;
  };
  total_progress: number;
  current_term: string | null;
};

// =========== Financial ===========

export type MeInvoiceInfo = {
  id: string;
  description: string;
  due_date: string;
  amount: number;
  status: string;
  is_overdue: boolean;
};

export type MeFinancialSummaryResponse = {
  next_invoice: MeInvoiceInfo | null;
  last_paid_invoice: MeInvoiceInfo | null;
  total_pending: number;
  total_overdue: number;
  has_pending: boolean;
  has_overdue: boolean;
};

// =========== Notifications ===========

export type MeNotificationInfo = {
  id: string;
  notification_id: string;
  type: string;
  priority: string;
  title: string | null;
  body: string;
  delivered_at: string;
  read_at: string | null;
  archived_at: string | null;
  is_read: boolean;
};

export type MeUnreadCountResponse = {
  unread_count: number;
};

// =========== Documents ===========

export type MeDocumentInfo = {
  id: string;
  doc_type: string;
  status: string;
  title: string | null;
  file_url: string | null;
  generated_at: string | null;
};
