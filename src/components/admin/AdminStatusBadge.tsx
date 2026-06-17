import type { ReactNode } from 'react';

export type AdminBadgeTone =
  | 'neutral'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'accent';

const toneClasses: Record<AdminBadgeTone, string> = {
  neutral: 'border-gray-500/20 bg-gray-500/10 text-gray-300',
  success: 'border-green-500/20 bg-green-500/10 text-green-400',
  danger: 'border-red-500/20 bg-red-500/10 text-red-400',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  info: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
  accent: 'border-accent-green/20 bg-accent-green/10 text-accent-green',
};

interface AdminStatusBadgeProps {
  children: ReactNode;
  tone?: AdminBadgeTone;
  className?: string;
}

export function AdminStatusBadge({
  children,
  tone = 'neutral',
  className = '',
}: AdminStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
