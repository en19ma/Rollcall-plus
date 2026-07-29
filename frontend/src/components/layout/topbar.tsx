'use client';

import { useRouter } from 'next/navigation';
import { Menu, LogOut, Bell } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-4 sm:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="btn-secondary !px-2.5 !py-2.5 sm:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div>
          <p className="text-xs uppercase tracking-wide text-base-50/40">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <p className="font-display text-base font-semibold sm:text-lg">Welcome back, {user?.name.split(' ')[0]}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push('/notifications')}
          className="btn-secondary !px-2.5 !py-2.5"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
        <button onClick={handleLogout} className="btn-secondary !px-2.5 !py-2.5" aria-label="Log out">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
