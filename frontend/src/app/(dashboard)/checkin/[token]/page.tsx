'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { MapPin, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

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

export default function CheckinLinkPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [result, setResult] = useState<{ status: string } | null>(null);

  const checkIn = useMutation({
    mutationFn: async () => {
      let coords: { latitude?: number; longitude?: number } = {};
      try {
        const position = await getCurrentPosition();
        coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      } catch {
        throw new Error('Location access is required to check in — please enable it and try again.');
      }
      const { data } = await api.post('/attendance/check-in', { qrToken: token, ...coords });
      return data;
    },
    onSuccess: (data) => setResult({ status: data.status }),
  });

  if (user && user.role !== 'STUDENT') {
    return (
      <div className="glass-panel mx-auto max-w-md p-8 text-center">
        <XCircle className="mx-auto h-8 w-8 text-rose" />
        <p className="mt-3 text-sm text-base-50/70">
          This check-in link is for students only. You&apos;re signed in as a {user.role.toLowerCase()}.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel mx-auto max-w-md p-8 text-center">
      {result ? (
        <>
          <CheckCircle2 className="mx-auto h-10 w-10 text-teal" />
          <h1 className="mt-4 font-display text-xl font-semibold">You&apos;re checked in</h1>
          <p className="mt-1 text-sm text-base-50/60">Marked {result.status.toLowerCase()}.</p>
          <button className="btn-secondary mt-6" onClick={() => router.push('/attendance')}>
            Go to Attendance
          </button>
        </>
      ) : (
        <>
          <MapPin className="mx-auto h-10 w-10 text-accent-light" />
          <h1 className="mt-4 font-display text-xl font-semibold">Check in to class</h1>
          <p className="mt-1 text-sm text-base-50/60">
            You&apos;ll be asked to share your location — you must be within 30 meters of class.
          </p>
          {checkIn.isError && (
            <p className="mt-3 text-sm text-rose">
              {(checkIn.error as any)?.message || (checkIn.error as any)?.response?.data?.message || 'Check-in failed'}
            </p>
          )}
          <button className="btn-primary mt-6 w-full" disabled={checkIn.isPending} onClick={() => checkIn.mutate()}>
            {checkIn.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            Check in now
          </button>
        </>
      )}
    </div>
  );
}
