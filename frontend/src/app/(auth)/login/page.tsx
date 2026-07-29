import { Suspense } from 'react';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-sm text-base-50/50">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
