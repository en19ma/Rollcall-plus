import { Suspense } from 'react';
import { ResetPasswordForm } from './reset-password-form';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-sm text-base-50/50">Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
