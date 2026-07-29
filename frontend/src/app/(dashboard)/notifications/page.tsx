'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications')).data,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => api.patch('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold">Notifications</h2>
        <button className="btn-secondary text-xs" onClick={() => markAllRead.mutate()}>
          <Check className="h-3.5 w-3.5" /> Mark all read
        </button>
      </div>

      <div className="space-y-2">
        {isLoading && <p className="text-sm text-base-50/50">Loading…</p>}
        {!isLoading && data?.length === 0 && (
          <div className="glass-panel flex flex-col items-center gap-3 p-12 text-center">
            <BellOff className="h-8 w-8 text-base-50/30" />
            <p className="text-sm text-base-50/50">Nothing here yet — you&apos;re all caught up.</p>
          </div>
        )}
        {data?.map((n: any) => (
          <button
            key={n.id}
            onClick={() => !n.isRead && markRead.mutate(n.id)}
            className={cn(
              'glass-panel flex w-full items-start gap-3 p-4 text-left transition-opacity',
              n.isRead && 'opacity-60',
            )}
          >
            <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', n.isRead ? 'bg-white/[0.06]' : 'bg-accent/15 text-accent-light')}>
              <Bell className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{n.title}</p>
              <p className="mt-0.5 text-sm text-base-50/60">{n.message}</p>
              <p className="mt-1 text-xs text-base-50/40">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
