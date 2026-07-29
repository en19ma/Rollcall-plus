'use client';

import { useQuery } from '@tanstack/react-query';
import { User, Mail, Badge } from 'lucide-react';
import { api } from '@/lib/api';

export default function ProfilePage() {
  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/users/me')).data,
  });

  if (isLoading || !me) return <p className="text-sm text-base-50/50">Loading…</p>;

  const profile = me.student || me.lecturer;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="glass-panel p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-2xl font-display font-semibold text-accent-light">
            {me.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">{me.name}</h2>
            <p className="text-sm text-base-50/60">{me.role.charAt(0) + me.role.slice(1).toLowerCase()}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={me.email} />
          {profile && (
            <InfoRow
              icon={<Badge className="h-4 w-4" />}
              label={me.role === 'STUDENT' ? 'Student ID' : 'Staff ID'}
              value={me.role === 'STUDENT' ? profile.studentCode : profile.staffCode}
            />
          )}
          {profile?.department && (
            <InfoRow icon={<User className="h-4 w-4" />} label="Department" value={profile.department.name} />
          )}
          {me.student && (
            <>
              <InfoRow icon={<User className="h-4 w-4" />} label="Programme" value={me.student.programme} />
              <InfoRow icon={<User className="h-4 w-4" />} label="Level" value={me.student.level} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 last:border-0">
      <div className="flex items-center gap-2 text-sm text-base-50/60">
        {icon} {label}
      </div>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
