'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, GraduationCap, BookOpen, TrendingUp, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '@/lib/api';
import { StatCard } from '@/components/ui/stat-card';

export function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: async () => (await api.get('/analytics/admin/overview')).data,
  });

  const trendData = [
    { day: 'Mon', rate: 88 },
    { day: 'Tue', rate: 91 },
    { day: 'Wed', rate: 84 },
    { day: 'Thu', rate: 93 },
    { day: 'Fri', rate: 79 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total students" value={isLoading ? '—' : data?.totalStudents ?? 0} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Total lecturers" value={isLoading ? '—' : data?.totalLecturers ?? 0} icon={<GraduationCap className="h-4 w-4" />} accent="teal" />
        <StatCard label="Active courses" value={isLoading ? '—' : data?.totalCourses ?? 0} icon={<BookOpen className="h-4 w-4" />} accent="amber" />
        <StatCard label="Attendance rate" value={isLoading ? '—' : `${data?.attendanceRate ?? 0}%`} icon={<TrendingUp className="h-4 w-4" />} accent="teal" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass-panel p-6 lg:col-span-2">
          <h3 className="font-display text-base font-semibold">Weekly attendance trend</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} />
                <Tooltip contentStyle={{ background: '#151F32', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                <Line type="monotone" dataKey="rate" stroke="#6366F1" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose" />
            <h3 className="font-display text-base font-semibold">Low attendance alerts</h3>
          </div>
          <p className="mt-3 text-3xl font-display font-semibold text-rose">
            {isLoading ? '—' : data?.lowAttendanceCount ?? 0}
          </p>
          <p className="mt-1 text-sm text-base-50/60">students currently below threshold</p>
        </div>
      </div>

      <div className="glass-panel p-6">
        <h3 className="font-display text-base font-semibold">Recent activity</h3>
        <div className="mt-4 space-y-3">
          {isLoading && <p className="text-sm text-base-50/50">Loading…</p>}
          {!isLoading && data?.recentActivity?.length === 0 && (
            <p className="text-sm text-base-50/50">No recent activity yet.</p>
          )}
          {data?.recentActivity?.map((log: any) => (
            <div key={log.id} className="flex items-center justify-between gap-2 border-b border-white/[0.04] pb-3 last:border-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{log.action.replaceAll('_', ' ')}</p>
                <p className="truncate text-xs text-base-50/50">{log.user?.name ?? 'System'} · {log.entity}</p>
              </div>
              <span className="shrink-0 text-xs text-base-50/40">{new Date(log.createdAt).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
