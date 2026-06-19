import { Button } from './Button';

interface ErrorProps {
  message: string;
  onRetry?: () => void;
  fullScreen?: boolean;
}

export const Error = ({ message, onRetry, fullScreen = false }: ErrorProps) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4 p-6" role="alert" aria-live="assertive">
      <div className="rounded-full bg-red-500/20 p-3">
        <svg
          className="w-8 h-8 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white mb-2">Error</h3>
        <p className="text-gray-400 text-sm max-w-md">{message}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-primary-darker flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
};
