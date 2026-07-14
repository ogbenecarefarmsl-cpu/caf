import { useEffect, useId, useRef } from 'react';
import { AlertTriangle, Info, LoaderCircle, ShieldAlert } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;

    previousFocusRef.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => cancelRef.current?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, isOpen, onClose]);

  if (!isOpen) return null;

  const variants = {
    danger: {
      button: 'bg-red-500 text-white hover:bg-red-400 focus:ring-red-400',
      icon: 'border-red-400/20 bg-red-500/10 text-red-300',
      Icon: ShieldAlert,
    },
    warning: {
      button: 'bg-amber-400 text-primary-darker hover:bg-amber-300 focus:ring-amber-300',
      icon: 'border-amber-300/20 bg-amber-400/10 text-amber-300',
      Icon: AlertTriangle,
    },
    info: {
      button: 'bg-accent-green text-primary-dark hover:bg-accent-light focus:ring-accent-green',
      icon: 'border-accent-green/20 bg-accent-green/10 text-accent-green',
      Icon: Info,
    },
  };
  const variantConfig = variants[variant];
  const VariantIcon = variantConfig.Icon;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-sm"
        onClick={isLoading ? undefined : onClose}
        aria-label="Close confirmation"
        tabIndex={-1}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-t-3xl border border-white/10 bg-primary-dark p-5 shadow-2xl outline-none sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-start gap-4">
          <div className={`rounded-2xl border p-3 ${variantConfig.icon}`} aria-hidden="true">
            <VariantIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-bold text-white">{title}</h2>
            <p id={messageId} className="mt-2 text-sm leading-6 text-gray-300">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="min-h-11 rounded-xl border border-white/15 px-4 py-2 font-medium text-gray-200 transition-colors hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            disabled={isLoading}
            className={`min-h-11 rounded-xl px-4 py-2 font-semibold transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${variantConfig.button}`}
          >
            <span className="flex items-center justify-center gap-2">
              {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {confirmLabel}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
