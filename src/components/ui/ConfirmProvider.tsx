import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ConfirmContext, type ConfirmOptions } from '../../contexts/ConfirmContext';
import { ConfirmDialog } from './ConfirmDialog';

interface ConfirmProviderProps {
  children: ReactNode;
}

export const ConfirmProvider = ({ children }: ConfirmProviderProps) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const settle = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const requestConfirmation = useCallback((nextOptions: ConfirmOptions) => {
    resolverRef.current?.(false);
    setOptions(nextOptions);

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  useEffect(() => () => resolverRef.current?.(false), []);

  const contextValue = useMemo(() => requestConfirmation, [requestConfirmation]);

  return (
    <ConfirmContext.Provider value={contextValue}>
      {children}
      <ConfirmDialog
        isOpen={options !== null}
        title={options?.title ?? ''}
        message={options?.message ?? ''}
        confirmLabel={options?.confirmLabel}
        cancelLabel={options?.cancelLabel}
        variant={options?.variant}
        onClose={() => settle(false)}
        onConfirm={() => settle(true)}
      />
    </ConfirmContext.Provider>
  );
};
