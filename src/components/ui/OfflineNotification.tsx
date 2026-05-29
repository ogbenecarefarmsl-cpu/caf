import { SyncService } from '../../services/sync-service';
import { useEffect, useState } from 'react';

export const OfflineNotification = () => {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const checkQueue = async () => {
      const count = await SyncService.getQueueLength();
      setPendingCount(count);
    };

    checkQueue();
    const interval = setInterval(checkQueue, 10000);
    return () => clearInterval(interval);
  }, []);

  if (pendingCount === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-accent-green/90 backdrop-blur-sm text-primary-dark font-bold text-sm shadow-2xl border border-white/20 transition-all" role="status" aria-live="polite">
      {pendingCount} operation(s) pending synchronization
    </div>
  );
};
