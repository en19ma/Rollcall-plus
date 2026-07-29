'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QrCode, Lock, StopCircle, Users, MapPin, Loader2 } from 'lucide-react';
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

export function LecturerAttendance() {
  const queryClient = useQueryClient();
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [duration, setDuration] = useState(15);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/users/me')).data,
  });
  const lecturerId = me?.lecturer?.id;

  const { data: courses } = useQuery({
    queryKey: ['courses', lecturerId],
    queryFn: async () => (await api.get(`/courses?lecturerId=${lecturerId}`)).data,
    enabled: !!lecturerId,
  });

  const { data: openSessions, refetch: refetchOpenSessions } = useQuery({
    queryKey: ['lecturer-open-sessions'],
    queryFn: async () => (await api.get('/attendance/lecturer/open-sessions')).data,
    refetchInterval: 5000,
  });

  const createSession = useMutation({
    mutationFn: async () => {
      let position: GeolocationPosition;
      try {
        position = await getCurrentPosition();
      } catch {
        throw new Error(
          'Location access is required to start attendance — students must be within 30 meters to check in. Please enable location and try again.',
        );
      }
      const { data } = await api.post('/attendance/sessions', {
        courseId: selectedCourseId,
        durationMinutes: duration,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      return data;
    },
    onSuccess: (data) => {
      setActiveSessionId(data.id);
      toast.success('Attendance session started');
      refetchOpenSessions();
    },
    onError: (err: any) => toast.error(err?.message || err?.response?.data?.message || 'Could not start session'),
  });

  const { data: qr } = useQuery({
    queryKey: ['session-qr', activeSessionId],
    queryFn: async () => (await api.get(`/attendance/sessions/${activeSessionId}/qr`)).data,
    enabled: !!activeSessionId,
    refetchInterval: 5000,
  });

  const { data: roster, refetch: refetchRoster } = useQuery({
    queryKey: ['session-roster', activeSessionId],
    queryFn: async () => (await api.get(`/attendance/sessions/${activeSessionId}/roster`)).data,
    enabled: !!activeSessionId,
    refetchInterval: 4000,
  });

  const closeSession = useMutation({
    mutationFn: async (sessionId: string) => api.patch(`/attendance/sessions/${sessionId}/close`),
    onSuccess: (_data, sessionId) => {
      toast.success('Attendance ended');
      if (sessionId === activeSessionId) setActiveSessionId(null);
      refetchOpenSessions();
      queryClient.invalidateQueries({ queryKey: ['session-roster'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not end session'),
  });

  const lockSession = useMutation({
    mutationFn: async () => api.patch(`/attendance/sessions/${activeSessionId}/lock`),
    onSuccess: () => {
      toast.success('Session locked — no further edits allowed');
      refetchRoster();
    },
  });

  const markStatus = useMutation({
    mutationFn: async ({ studentId, status }: { studentId: string; status: string }) =>
      api.patch(`/attendance/sessions/${activeSessionId}/mark`, { studentId, status }),
    onSuccess: () => refetchRoster(),
  });

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <h3 className="font-display text-base font-semibold">Start attendance session</h3>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-base-50/50">
          <MapPin className="h-3.5 w-3.5" /> Your current location will be used — students must be within 30 meters to check in.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Course</label>
            <select className="input-field" value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)}>
              <option value="">Select course</option>
              {courses?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.courseCode} — {c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Duration (minutes)</label>
            <input type="number" min={1} className="input-field" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </div>
          <div className="flex items-end">
            <button
              className="btn-primary w-full"
              disabled={!selectedCourseId || createSession.isPending}
              onClick={() => createSession.mutate()}
            >
              {createSession.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
              Start session
            </button>
          </div>
        </div>
      </div>

      {openSessions && openSessions.length > 0 && (
        <div className="glass-panel p-6">
          <h3 className="font-display text-base font-semibold">Currently open</h3>
          <div className="mt-4 space-y-2">
            {openSessions.map((s: any) => (
              <div key={s.sessionId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.06] p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{s.course.courseCode} — {s.course.title}</p>
                  <p className="text-xs text-base-50/50">
                    {s.checkedInCount} checked in · <CountdownLabel expiresAt={s.expiresAt} />
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button className="btn-secondary text-xs" onClick={() => setActiveSessionId(s.sessionId)}>
                    Manage
                  </button>
                  <button
                    className="btn-secondary text-xs"
                    disabled={closeSession.isPending}
                    onClick={() => closeSession.mutate(s.sessionId)}
                  >
                    <StopCircle className="h-3.5 w-3.5" /> End
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSessionId && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="glass-panel p-6 text-center lg:col-span-1">
            <h3 className="font-display text-base font-semibold">Scan to check in</h3>
            {qr?.qrImageDataUrl && (
              <img src={qr.qrImageDataUrl} alt="Attendance QR code" className="mx-auto mt-4 h-48 w-48 rounded-xl bg-white p-2" />
            )}
            {qr?.expiresAt && (
              <p className="mt-3 font-display text-lg font-semibold tabular-nums">
                <CountdownLabel expiresAt={qr.expiresAt} prefix="" className="text-base-50" />
              </p>
            )}
            {qr?.checkInUrl && (
              <button
                className="btn-secondary mt-3 w-full text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(qr.checkInUrl);
                  toast.success('Check-in link copied');
                }}
              >
                Copy check-in link
              </button>
            )}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => closeSession.mutate(activeSessionId)}
                disabled={closeSession.isPending}
                className="btn-secondary flex-1 text-xs"
              >
                <StopCircle className="h-4 w-4" /> End attendance
              </button>
              <button onClick={() => lockSession.mutate()} className="btn-secondary flex-1 text-xs">
                <Lock className="h-4 w-4" /> Lock
              </button>
            </div>
          </div>

          <div className="glass-panel p-6 lg:col-span-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-base-50/60" />
              <h3 className="font-display text-base font-semibold">Live roster</h3>
            </div>
            <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
              {roster?.records?.map((r: any) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.06] p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.student.user.name}</p>
                    <p className="text-xs text-base-50/50">{r.student.studentCode}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={cn('badge', statusColor(r.status))}>{r.status}</span>
                    <select
                      className="input-field !w-auto !py-1.5 text-xs"
                      value={r.status}
                      onChange={(e) => markStatus.mutate({ studentId: r.studentId, status: e.target.value })}
                    >
                      {['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              {(!roster || roster.records?.length === 0) && (
                <p className="text-sm text-base-50/50">No enrolled students on this course yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
