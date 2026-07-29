import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function statusColor(status: string) {
  switch (status) {
    case 'PRESENT':
      return 'bg-teal/15 text-teal';
    case 'LATE':
      return 'bg-amber/15 text-amber';
    case 'ABSENT':
      return 'bg-rose/15 text-rose';
    case 'EXCUSED':
      return 'bg-accent/15 text-accent-light';
    default:
      return 'bg-white/10 text-white/70';
  }
}
