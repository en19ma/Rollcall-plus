import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  icon,
  accent = 'accent',
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: 'accent' | 'teal' | 'amber' | 'rose';
}) {
  const accentClasses: Record<string, string> = {
    accent: 'bg-accent/15 text-accent-light',
    teal: 'bg-teal/15 text-teal',
    amber: 'bg-amber/15 text-amber',
    rose: 'bg-rose/15 text-rose',
  };

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-base-50/60">{label}</p>
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', accentClasses[accent])}>
          {icon}
        </div>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold">{value}</p>
    </div>
  );
}
