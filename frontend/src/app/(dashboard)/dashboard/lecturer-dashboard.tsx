'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Clock, BookOpen, QrCode } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { StatCard } from '@/components/ui/stat-card';

export function LecturerDashboard() {
  const user = useAuthStore((s) => s.user);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/users/me')).data,
  });

  const lecturerId = me?.lecturer?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['lecturer-dashboard', lecturerId],
    queryFn: async () => (await api.get(`/analytics/lecturers/${lecturerId}/dashboard`)).data,
    enabled: !!lecturerId,
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Assigned courses" value={data?.courses?.length ?? 0} icon={<BookOpen className="h-4 w-4" />} />
        <StatCard label="Today's classes" value={data?.todaysSessions?.length ?? 0} icon={<Clock className="h-4 w-4" />} accent="teal" />
        <StatCard label="Pending attendance" value={data?.todaysSessions?.filter((s: any) => s.status === 'OPEN')?.length ?? 0} icon={<QrCode className="h-4 w-4" />} accent="amber" />
      </div>

      <div className="glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-base font-semibold">Today&apos;s classes</h3>
          <Link href="/attendance" className="text-sm text-accent-light hover:underline">Take attendance →</Link>
        </div>
        <div className="mt-4 space-y-3">
          {isLoading && <p className="text-sm text-base-50/50">Loading…</p>}
          {!isLoading && data?.todaysSessions?.length === 0 && (
            <p className="text-sm text-base-50/50">No sessions scheduled for today. Start one from the Attendance page.</p>
          )}
          {data?.todaysSessions?.map((session: any) => (
            <div key={session.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{session.course.courseCode} — {session.course.title}</p>
                <p className="text-xs text-base-50/50">Status: {session.status}</p>
              </div>
              <Link href="/attendance" className="btn-secondary shrink-0 text-xs">Manage</Link>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel p-6">
        <h3 className="font-display text-base font-semibold">Your courses</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {data?.courses?.map((course: any) => (
            <div key={course.id} className="rounded-xl border border-white/[0.06] p-4">
              <p className="text-sm font-medium">{course.courseCode}</p>
              <p className="text-xs text-base-50/60">{course.title}</p>
              <p className="mt-2 text-xs text-base-50/40">{course._count?.enrollments ?? 0} students enrolled</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
