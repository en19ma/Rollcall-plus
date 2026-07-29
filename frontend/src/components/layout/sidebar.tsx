'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import {
  LayoutDashboard,
  QrCode,
  BookOpen,
  Users,
  GraduationCap as LecturerIcon,
  FileBarChart,
  BarChart3,
  Bell,
  User,
  Settings,
  GraduationCap,
  ScrollText,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/store/auth-store';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navByRole: Record<UserRole, NavItem[]> = {
  ADMIN: [
    { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Students', href: '/students', icon: <Users className="h-4 w-4" /> },
    { label: 'Lecturers', href: '/lecturers', icon: <LecturerIcon className="h-4 w-4" /> },
    { label: 'Courses', href: '/courses', icon: <BookOpen className="h-4 w-4" /> },
    { label: 'Analytics', href: '/analytics', icon: <BarChart3 className="h-4 w-4" /> },
    { label: 'Reports', href: '/reports', icon: <FileBarChart className="h-4 w-4" /> },
    { label: 'Audit Log', href: '/audit-log', icon: <ScrollText className="h-4 w-4" /> },
    { label: 'Notifications', href: '/notifications', icon: <Bell className="h-4 w-4" /> },
    { label: 'Settings', href: '/settings', icon: <Settings className="h-4 w-4" /> },
  ],
  LECTURER: [
    { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Attendance', href: '/attendance', icon: <QrCode className="h-4 w-4" /> },
    { label: 'Courses', href: '/courses', icon: <BookOpen className="h-4 w-4" /> },
    { label: 'Reports', href: '/reports', icon: <FileBarChart className="h-4 w-4" /> },
    { label: 'Notifications', href: '/notifications', icon: <Bell className="h-4 w-4" /> },
    { label: 'Profile', href: '/profile', icon: <User className="h-4 w-4" /> },
  ],
  STUDENT: [
    { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Attendance', href: '/attendance', icon: <QrCode className="h-4 w-4" /> },
    { label: 'Courses', href: '/courses', icon: <BookOpen className="h-4 w-4" /> },
    { label: 'Reports', href: '/reports', icon: <FileBarChart className="h-4 w-4" /> },
    { label: 'Notifications', href: '/notifications', icon: <Bell className="h-4 w-4" /> },
    { label: 'Profile', href: '/profile', icon: <User className="h-4 w-4" /> },
  ],
};

interface SidebarProps {
  role: UserRole;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ role, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const items = navByRole[role];

  // Close the mobile drawer automatically whenever the route changes.
  useEffect(() => {
    onMobileClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const navContent = (
    <>
      <div className="flex items-center justify-between gap-2 px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          <span className="font-display text-base font-semibold">RollCall+</span>
        </div>
        <button onClick={onMobileClose} className="text-base-50/50 hover:text-base-50 sm:hidden" aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-accent/15 text-accent-light'
                  : 'text-base-50/60 hover:bg-white/[0.04] hover:text-base-50',
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-6 text-xs text-base-50/30">RollCall+ v1.0</div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar — always visible at sm breakpoint and up */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.06] bg-base-900/40 backdrop-blur-xl sm:flex">
        {navContent}
      </aside>

      {/* Mobile drawer — backdrop + slide-in panel, only rendered on small screens */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={onMobileClose} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-white/[0.06] bg-base-900 shadow-2xl">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
