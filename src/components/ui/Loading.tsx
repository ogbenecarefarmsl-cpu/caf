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
  variant = 'spinner',
}: LoadingProps) => {
  const label = text || 'Loading…';

  if (variant === 'text') {
    return (
      <div className="flex items-center justify-center gap-2 p-4 text-sm text-gray-300" role="status" aria-live="polite">
        <span className="h-2 w-2 animate-pulse rounded-full bg-accent-green" aria-hidden="true" />
        <span>{label}</span>
      </div>
    );
  }

  if (variant === 'centered') {
    return (
      <div className="min-h-72 space-y-5 px-1 py-4" role="status" aria-live="polite" aria-busy="true">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-44 animate-pulse rounded-lg bg-white/10" />
            <div className="h-3 w-64 max-w-[65vw] animate-pulse rounded bg-white/5" />
          </div>
          <div className="h-10 w-28 animate-pulse rounded-xl bg-white/10" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-2xl border border-white/5 bg-white/[0.04]" />
          ))}
        </div>
        <div className="space-y-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="flex gap-4">
              <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-white/10" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 w-2/5 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  const skeleton = (
    <div className="w-full space-y-3" role="status" aria-live="polite" aria-busy="true">
      <div className="h-5 w-1/3 animate-pulse rounded-md bg-white/10" />
      <div className="h-3 w-4/5 animate-pulse rounded bg-white/5" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-white/5" />
      <div className={`${size === 'sm' ? 'h-12' : size === 'lg' ? 'h-32' : 'h-20'} animate-pulse rounded-xl border border-white/5 bg-white/[0.04]`} />
      <span className="sr-only">{label}</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-primary-darker/85 backdrop-blur-sm">
        <div className="w-full max-w-3xl px-6">{skeleton}</div>
      </div>
    );
  }

  return skeleton;
};
