import { LoaderCircle } from 'lucide-react';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
  variant?: 'spinner' | 'text' | 'centered';
}

export const Loading = ({ 
  size = 'md', 
  text, 
  fullScreen = false,
  variant = 'spinner'
}: LoadingProps) => {
  const sizeStyles = {
    sm: 'h-4 w-4',
    md: 'h-7 w-7',
    lg: 'h-10 w-10',
  };

  const label = text || 'Loading…';

  // Text-only variant
  if (variant === 'text') {
    return (
      <div className="flex items-center justify-center gap-2 p-4 text-sm text-gray-300" role="status" aria-live="polite">
        <LoaderCircle className="h-4 w-4 animate-spin text-accent-green" aria-hidden="true" />
        <span>{label}</span>
      </div>
    );
  }

  // Centered variant (for full-page content areas)
  if (variant === 'centered') {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 text-center" role="status" aria-live="polite">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-lg shadow-black/10">
          <LoaderCircle className={`animate-spin text-accent-green ${sizeStyles[size]}`} aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-gray-300">{label}</p>
      </div>
    );
  }

  // Default spinner variant
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      <LoaderCircle className={`animate-spin text-accent-green ${sizeStyles[size]}`} aria-hidden="true" />
      <span className={text ? 'text-sm text-gray-300' : 'sr-only'}>{label}</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-primary-darker/85 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
};
