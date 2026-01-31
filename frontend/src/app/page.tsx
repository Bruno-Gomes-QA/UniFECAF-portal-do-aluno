'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { homeApi, authApi, ApiClientError } from '@/lib/api';
import type { HomeResponse } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const [data, setData] = useState<HomeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const homeData = await homeApi.getHomeData();
        setData(homeData);
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) {
          router.push('/login');
          return;
        }
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, [router]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
      router.push('/login');
    } catch {
      // Even if logout fails, redirect to login
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card text-center max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Erro</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { student, grades, financial, today_agenda, notifications, unread_notifications_count, quick_actions } = data;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">Portal do Aluno</h1>
              <p className="text-blue-200 text-sm">UniFECAF</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-medium">{student.full_name}</p>
                <p className="text-blue-200 text-sm">RA: {student.ra}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded text-sm"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Student Info Card */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Informações do Aluno</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Curso:</span>
                  <p className="font-medium">{student.course.name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Campus:</span>
                  <p className="font-medium">{student.course.campus_name || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Período Atual:</span>
                  <p className="font-medium">{student.current_term || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Progresso:</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${student.total_progress}%` }}
                      />
                    </div>
                    <span className="font-medium">{student.total_progress.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Grades Card */}
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Notas - {grades.current_term}</h2>
                {grades.subjects_at_risk > 0 && (
                  <span className="badge badge-warning">
                    {grades.subjects_at_risk} disciplina(s) em risco
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {grades.subjects.map((subject) => (
                  <div
                    key={subject.subject_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded"
                  >
                    <div>
                      <p className="font-medium text-sm">{subject.subject_name}</p>
                      <p className="text-xs text-gray-500">{subject.subject_code}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`badge ${
                          subject.status === 'APPROVED'
                            ? 'badge-success'
                            : subject.status === 'FAILED'
                            ? 'badge-error'
                            : 'badge-info'
                        }`}
                      >
                        {subject.final_score !== null ? subject.final_score.toFixed(1) : '-'}
                      </span>
                      {subject.has_absence_alert && (
                        <span className="badge badge-warning text-xs">
                          Faltas: {subject.absences_pct.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {grades.average_score !== null && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-right">
                    Média Geral: <span className="font-bold text-lg">{grades.average_score.toFixed(1)}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Today's Agenda */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">
                Agenda de Hoje - {new Date(today_agenda.date).toLocaleDateString('pt-BR')}
              </h2>
              {today_agenda.classes.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nenhuma aula hoje</p>
              ) : (
                <div className="space-y-3">
                  {today_agenda.classes.map((classInfo) => (
                    <div
                      key={classInfo.session_id}
                      className={`p-3 rounded border-l-4 ${
                        classInfo.is_next
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-300 bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{classInfo.subject_name}</p>
                          <p className="text-xs text-gray-500">{classInfo.subject_code}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {classInfo.start_time} - {classInfo.end_time}
                          </p>
                          {classInfo.room && (
                            <p className="text-xs text-gray-500">Sala: {classInfo.room}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Financial Card */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Financeiro</h2>
              {financial.has_overdue && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-red-700 text-sm font-medium">
                    ⚠️ Você possui faturas em atraso
                  </p>
                  <p className="text-red-600 text-lg font-bold">
                    R$ {financial.total_overdue.toFixed(2)}
                  </p>
                </div>
              )}
              {financial.has_pending && !financial.has_overdue && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-yellow-700 text-sm">
                    Faturas pendentes: R$ {financial.total_pending.toFixed(2)}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                {financial.invoices.slice(0, 3).map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex justify-between items-center p-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{invoice.description}</p>
                      <p className="text-xs text-gray-500">
                        Venc: {new Date(invoice.due_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">R$ {invoice.amount.toFixed(2)}</p>
                      <span
                        className={`badge text-xs ${
                          invoice.status === 'PAID'
                            ? 'badge-success'
                            : invoice.is_overdue
                            ? 'badge-error'
                            : 'badge-warning'
                        }`}
                      >
                        {invoice.status === 'PAID'
                          ? 'Pago'
                          : invoice.is_overdue
                          ? 'Atrasado'
                          : 'Pendente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notifications Card */}
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Notificações</h2>
                {unread_notifications_count > 0 && (
                  <span className="badge badge-info">{unread_notifications_count} novas</span>
                )}
              </div>
              {notifications.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nenhuma notificação</p>
              ) : (
                <div className="space-y-3">
                  {notifications.slice(0, 5).map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded text-sm ${
                        notification.is_read ? 'bg-gray-50' : 'bg-blue-50'
                      }`}
                    >
                      {notification.title && (
                        <p className="font-medium">{notification.title}</p>
                      )}
                      <p className="text-gray-600">{notification.body}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notification.delivered_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions Card */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Acesso Rápido</h2>
              <div className="grid grid-cols-2 gap-2">
                {quick_actions.map((action) => (
                  <a
                    key={action.id}
                    href={action.href}
                    className="p-3 text-center bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-2xl">{action.icon}</span>
                    <p className="text-xs mt-1 font-medium">{action.label}</p>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
