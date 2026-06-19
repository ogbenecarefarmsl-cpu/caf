import { useEffect } from 'react';

export const PWAUpdatePrompt = () => {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const applyUpdate = async () => {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (!reg) return;

          // If a new worker is already waiting, activate it immediately
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
            return;
          }

          // Listen for new workers being installed
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New SW installed and old one still controlling — activate it
                reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            });
          });
        } catch {
          // SW not supported or blocked — silently ignore
        }
      };

      applyUpdate();
    }
  }, []);

  // No UI — updates are applied silently
  return null;
};
