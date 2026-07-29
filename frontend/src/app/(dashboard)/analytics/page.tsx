'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function AnalyticsPage() {
  const { data: lowAttendance, isLoading } = useQuery({
    queryKey: ['low-attendance'],
    queryFn: async () => (await api.get('/analytics/admin/low-attendance')).data,
  });

  const chartData = lowAttendance?.slice(0, 8).map((s: any) => ({ name: s.studentCode, percentage: s.percentage })) ?? [];

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <h3 className="font-display text-base font-semibold">Students below threshold</h3>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} />
              <Tooltip contentStyle={{ background: '#151F32', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
              <Bar dataKey="percentage" fill="#F43F5E" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-panel p-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose" />
          <h3 className="font-display text-base font-semibold">Flagged students</h3>
        </div>
        <div className="mt-4 space-y-2">
          {isLoading && <p className="text-sm text-base-50/50">Loading…</p>}
          {lowAttendance?.map((s: any) => (
            <div key={s.studentId} className="flex items-center justify-between rounded-xl border border-white/[0.06] p-3">
              <div>
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-base-50/50">{s.studentCode}</p>
              </div>
              <span className={cn('badge', s.percentage < 60 ? 'bg-rose/15 text-rose' : 'bg-amber/15 text-amber')}>
                {s.percentage}%
              </span>
            </div>
          ))}
          {!isLoading && lowAttendance?.length === 0 && (
            <p className="text-sm text-base-50/50">No students are currently below the attendance threshold.</p>
          )}
        </div>
      </div>
    </div>
  );
}
