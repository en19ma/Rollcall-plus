'use client';

import { useQuery } from '@tanstack/react-query';
import { TrendingUp, BookOpen, Bell } from 'lucide-react';
import { api } from '@/lib/api';
import { StatCard } from '@/components/ui/stat-card';
import { statusColor, cn } from '@/lib/utils';

export function StudentDashboard() {
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/users/me')).data,
  });

  const studentId = me?.student?.id;

  const { data: summary } = useQuery({
    queryKey: ['student-summary', studentId],
    queryFn: async () => (await api.get(`/attendance/students/${studentId}/summary`)).data,
    enabled: !!studentId,
  });

  const { data: dash } = useQuery({
    queryKey: ['student-dashboard', studentId],
    queryFn: async () => (await api.get(`/analytics/students/${studentId}/dashboard`)).data,
    enabled: !!studentId,
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Overall attendance" value={`${summary?.overall ?? 0}%`} icon={<TrendingUp className="h-4 w-4" />} accent="teal" />
        <StatCard label="Enrolled courses" value={dash?.enrollments?.length ?? 0} icon={<BookOpen className="h-4 w-4" />} />
        <StatCard label="Unread notifications" value={dash?.notifications?.filter((n: any) => !n.isRead)?.length ?? 0} icon={<Bell className="h-4 w-4" />} accent="amber" />
      </div>

      <div className="glass-panel p-6">
        <h3 className="font-display text-base font-semibold">Course progress</h3>
        <div className="mt-4 space-y-4">
          {summary?.perCourse?.map((c: any) => (
            <div key={c.course.id}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate font-medium">{c.course.courseCode} — {c.course.title}</span>
                <span className={cn('badge shrink-0', c.percentage < 75 ? 'bg-rose/15 text-rose' : 'bg-teal/15 text-teal')}>
                  {c.percentage}%
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={cn('h-full rounded-full', c.percentage < 75 ? 'bg-rose' : 'bg-teal')}
                  style={{ width: `${Math.min(c.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))}
          {(!summary || summary.perCourse?.length === 0) && (
            <p className="text-sm text-base-50/50">No course data yet.</p>
          )}
        </div>
      </div>

      <div className="glass-panel p-6">
        <h3 className="font-display text-base font-semibold">Recent notifications</h3>
        <div className="mt-4 space-y-3">
          {dash?.notifications?.length === 0 && <p className="text-sm text-base-50/50">You&apos;re all caught up.</p>}
          {dash?.notifications?.map((n: any) => (
            <div key={n.id} className="rounded-xl border border-white/[0.06] p-4">
              <p className="text-sm font-medium">{n.title}</p>
              <p className="mt-1 text-xs text-base-50/60">{n.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
