'use client';

import { useAuthStore } from '@/store/auth-store';
import { AdminDashboard } from './admin-dashboard';
import { LecturerDashboard } from './lecturer-dashboard';
import { StudentDashboard } from './student-dashboard';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  if (user.role === 'ADMIN') return <AdminDashboard />;
  if (user.role === 'LECTURER') return <LecturerDashboard />;
  return <StudentDashboard />;
}
