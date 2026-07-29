'use client';

import { useAuthStore } from '@/store/auth-store';
import { LecturerAttendance } from './lecturer-attendance';
import { StudentAttendance } from './student-attendance';

export default function AttendancePage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  if (user.role === 'LECTURER') return <LecturerAttendance />;
  if (user.role === 'STUDENT') return <StudentAttendance />;
  return (
    <div className="glass-panel p-6">
      <p className="text-sm text-base-50/60">
        Administrators manage attendance rules under Settings. Session-level detail is available from a course&apos;s Reports page.
      </p>
    </div>
  );
}
