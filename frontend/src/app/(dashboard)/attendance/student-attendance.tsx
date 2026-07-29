'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { QrCode, MapPin, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { statusColor, cn } from '@/lib/utils';
import { CountdownLabel } from '@/components/ui/countdown-label';

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Your browser does not support location access'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 8000,
    });
  });
}

export function StudentAttendance() {
  const [checkingInSessionId, setCheckingInSessionId] = useState<string | null>(null);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/users/me')).data,
  });
  const studentId = me?.student?.id;

  const { data: openSessions, refetch: refetchOpenSessions } = useQuery({
    queryKey: ['my-open-sessions'],
    queryFn: async () => (await api.get('/attendance/my/open-sessions')).data,
    refetchInterval: 5000,
  });

  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ['student-history', studentId],
    queryFn: async () => (await api.get(`/attendance/students/${studentId}/history`)).data,
    enabled: !!studentId,
  });

  const checkIn = useMutation({
    mutationFn: async (sessionId: string) => {
      setCheckingInSessionId(sessionId);
      let coords: { latitude?: number; longitude?: number } = {};
      try {
        const position = await getCurrentPosition();
        coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      } catch {
        throw new Error('Location access is required to check in — please enable it and try again.');
      }
      const { data } = await api.post('/attendance/check-in-session', { sessionId, ...coords });
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Marked ${data.status.toLowerCase()} — you're checked in`);
      refetchOpenSessions();
      refetchHistory();
    },
    onError: (err: any) => toast.error(err?.message || err?.response?.data?.message || 'Check-in failed'),
    onSettled: () => setCheckingInSessionId(null),
  });

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-accent-light" />
          <h3 className="font-display text-base font-semibold">Check in</h3>
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-base-50/60">
          <MapPin className="h-3.5 w-3.5" /> You must be within 30 meters of class to check in.
        </p>

        <div className="mt-4 space-y-2">
          {openSessions?.map((s: any) => (
            <div key={s.sessionId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.06] p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{s.course.courseCode} — {s.course.title}</p>
                <p className="text-xs text-base-50/50"><CountdownLabel expiresAt={s.expiresAt} prefix="closes in" /></p>
              </div>
              {s.alreadyCheckedIn ? (
                <span className="badge shrink-0 bg-teal/15 text-teal">
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Checked in
                </span>
              ) : (
                <button
                  className="btn-primary shrink-0 text-xs"
                  disabled={checkIn.isPending && checkingInSessionId === s.sessionId}
                  onClick={() => checkIn.mutate(s.sessionId)}
                >
                  {checkIn.isPending && checkingInSessionId === s.sessionId ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <MapPin className="h-3.5 w-3.5" />
                  )}
                  Check in
                </button>
              )}
            </div>
          ))}
          {(!openSessions || openSessions.length === 0) && (
            <p className="text-sm text-base-50/50">
              No attendance is currently open for your courses. Check back once your lecturer starts a session.
            </p>
          )}
        </div>
      </div>

      <div className="glass-panel p-6">
        <h3 className="font-display text-base font-semibold">Attendance history</h3>
        <div className="mt-4 space-y-2">
          {history?.map((r: any) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.06] p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.session.course.courseCode} — {r.session.course.title}</p>
                <p className="text-xs text-base-50/50">{new Date(r.session.sessionDate).toLocaleDateString()}</p>
              </div>
              <span className={cn('badge shrink-0', statusColor(r.status))}>{r.status}</span>
            </div>
          ))}
          {(!history || history.length === 0) && <p className="text-sm text-base-50/50">No attendance records yet.</p>}
        </div>
      </div>
    </div>
  );
}
