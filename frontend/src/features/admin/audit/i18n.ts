const actionLabels: Record<string, string> = {
  // Auth
  USER_LOGIN: 'Login realizado',
  USER_LOGIN_FAILED: 'Falha no login',
  USER_LOGOUT: 'Logout realizado',
  
  // Users
  USER_CREATED: 'Usuário criado',
  USER_UPDATED: 'Usuário atualizado',
  USER_DELETED: 'Usuário excluído',
  USER_PASSWORD_CHANGED: 'Senha alterada',
  
  // Students
  STUDENT_CREATED: 'Aluno criado',
  STUDENT_UPDATED: 'Aluno atualizado',
  STUDENT_DELETED: 'Aluno excluído',
  
  // Academics
  COURSE_CREATED: 'Curso criado',
  COURSE_UPDATED: 'Curso atualizado',
  COURSE_DELETED: 'Curso excluído',
  SUBJECT_CREATED: 'Disciplina criada',
  SUBJECT_UPDATED: 'Disciplina atualizada',
  SUBJECT_DELETED: 'Disciplina excluída',
  TERM_CREATED: 'Semestre criado',
  TERM_UPDATED: 'Semestre atualizado',
  TERM_DELETED: 'Semestre excluído',
  SECTION_CREATED: 'Turma criada',
  SECTION_UPDATED: 'Turma atualizada',
  SECTION_DELETED: 'Turma excluída',
  ENROLLMENT_CREATED: 'Matrícula criada',
  ENROLLMENT_UPDATED: 'Matrícula atualizada',
  ENROLLMENT_DELETED: 'Matrícula excluída',
  GRADE_CREATED: 'Nota registrada',
  GRADE_UPDATED: 'Nota atualizada',
  
  // Finance
  INVOICE_CREATED: 'Fatura criada',
  INVOICE_UPDATED: 'Fatura atualizada',
  INVOICE_DELETED: 'Fatura excluída',
  PAYMENT_CREATED: 'Pagamento registrado',
  PAYMENT_UPDATED: 'Pagamento atualizado',
  PAYMENT_DELETED: 'Pagamento excluído',
  
  // Comm
  NOTIFICATION_CREATED: 'Notificação criada',
  NOTIFICATION_UPDATED: 'Notificação atualizada',
  NOTIFICATION_DELETED: 'Notificação excluída',
  NOTIFICATION_DELIVERED: 'Notificação entregue',
  
  // Documents
  DOCUMENT_CREATED: 'Documento criado',
  DOCUMENT_UPDATED: 'Documento atualizado',
  DOCUMENT_DELETED: 'Documento excluído',
  
  // Audit
  AUDIT_LOG_VIEWED: 'Log de auditoria visualizado',
  AUDIT_LOGS_LISTED: 'Logs de auditoria listados',
};

const entityLabels: Record<string, string> = {
  user: 'Usuário',
  student: 'Aluno',
  course: 'Curso',
  subject: 'Disciplina',
  term: 'Semestre',
  section: 'Turma',
  enrollment: 'Matrícula',
  grade: 'Nota',
  invoice: 'Fatura',
  payment: 'Pagamento',
  notification: 'Notificação',
  user_notification: 'Entrega de Notificação',
  document: 'Documento',
  audit_log: 'Log de Auditoria',
};

export const formatAuditAction = (action: string): string => {
  return actionLabels[action] || action;
};

export const formatEntityType = (entityType: string | null): string => {
  if (!entityType) return '-';
  return entityLabels[entityType.toLowerCase()] || entityType;
};
