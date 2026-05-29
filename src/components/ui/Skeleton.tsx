interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle' | 'card' | 'table-row';
}

export const Skeleton = ({ className = '', variant = 'rect' }: SkeletonProps) => {
  const baseClasses = 'animate-pulse bg-white/5 rounded';

  const variantClasses = {
    text: 'h-4 w-full',
    rect: 'h-20 w-full',
    circle: 'h-10 w-10 rounded-full',
    card: 'h-32 w-full rounded-xl',
    'table-row': 'h-12 w-full',
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} aria-hidden="true" />
  );
};

export const TableSkeleton = ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => (
  <div className="bg-primary-dark rounded-xl border border-gray-700 overflow-hidden">
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="flex-1 h-10" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const CardSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} variant="card" />
    ))}
  </div>
);
