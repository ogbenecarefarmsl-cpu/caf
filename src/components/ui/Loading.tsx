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
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  // Text-only variant
  if (variant === 'text') {
    return (
      <div className="flex items-center justify-center p-4">
        <p className="text-white text-sm">{text || 'Loading...'}</p>
      </div>
    );
  }

  // Centered variant (for full-page content areas)
  if (variant === 'centered') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div
          className={`animate-spin rounded-full border-b-2 border-accent-green ${sizeStyles[size]}`}
        />
        {text && <p className="text-white text-sm">{text}</p>}
      </div>
    );
  }

  // Default spinner variant
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      <div
        className={`animate-spin rounded-full border-b-2 border-accent-green ${sizeStyles[size]}`}
      />
      {text && <p className="text-white text-sm">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-primary-darker/90 flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
};
