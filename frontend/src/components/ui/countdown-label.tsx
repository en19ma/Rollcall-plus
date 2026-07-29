'use client';

import { useCountdown } from '@/hooks/use-countdown';
import { cn } from '@/lib/utils';

export function CountdownLabel({
  expiresAt,
  prefix = 'expires in',
  className,
}: {
  expiresAt: string | Date | null | undefined;
  prefix?: string;
  className?: string;
}) {
  const { label, expired } = useCountdown(expiresAt);

  return (
    <span className={cn(expired ? 'text-rose' : undefined, className)}>
      {expired ? 'Expired' : prefix ? `${prefix} ${label}` : label}
    </span>
  );
}
