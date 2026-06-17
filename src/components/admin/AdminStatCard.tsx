import type { ReactNode } from 'react';

interface AdminStatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: 'neutral' | 'success' | 'danger' | 'warning' | 'info' | 'accent';
  helper?: ReactNode;
}

const toneClasses = {
  neutral: 'border-white/10 bg-primary-dark/60',
  success: 'border-green-500/20 bg-green-500/10',
  danger: 'border-red-500/20 bg-red-500/10',
  warning: 'border-amber-500/20 bg-amber-500/10',
  info: 'border-blue-500/20 bg-blue-500/10',
  accent: 'border-accent-green/20 bg-accent-green/10',
};

export function AdminStatCard({
  label,
  value,
  icon,
  tone = 'neutral',
  helper,
}: AdminStatCardProps) {
  return (
    <div className={`rounded-xl border p-4 ${toneClasses[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {label}
        </span>
        {icon ? <span className="shrink-0 text-gray-300">{icon}</span> : null}
      </div>
      <div className="mt-2 text-xl font-bold text-white">{value}</div>
      {helper ? <div className="mt-1 text-xs text-gray-400">{helper}</div> : null}
    </div>
  );
}
