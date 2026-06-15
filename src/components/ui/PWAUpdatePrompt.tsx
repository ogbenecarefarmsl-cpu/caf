import { useState, useEffect } from 'react';

export const PWAUpdatePrompt = () => {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => void) | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      let swRegistration: ServiceWorkerRegistration | null = null;

      const trackRegistration = async () => {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          swRegistration = reg || null;

          if (swRegistration?.waiting) {
            setNeedRefresh(true);
          }

          swRegistration?.addEventListener('updatefound', () => {
            const newWorker = swRegistration?.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setNeedRefresh(true);
              }
            });
          });
        } catch {
          // SW not supported or blocked
        }
      };

      trackRegistration();

      const handleUpdate = () => {
        if (swRegistration?.waiting) {
          swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
          setNeedRefresh(false);
          window.location.reload();
        }
      };

      setUpdateSW(() => handleUpdate);

      return () => {
        swRegistration?.removeEventListener('updatefound', () => {});
      };
    }
  }, []);

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm p-4 rounded-xl bg-primary-dark border border-accent-green/30 shadow-2xl" role="alert" aria-live="assertive">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-full bg-accent-green/20 p-2">
          <svg className="w-5 h-5 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Update Available</p>
          <p className="mt-1 text-xs text-gray-400">A new version is ready. Reload to update.</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => updateSW?.(true)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent-green text-primary-dark hover:bg-accent-light transition-colors focus:outline-none focus:ring-2 focus:ring-accent-green/50"
            >
              Reload
            </button>
            <button
              onClick={() => setNeedRefresh(false)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
