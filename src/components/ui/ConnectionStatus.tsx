import { useWebSocket } from '../../hooks/useWebSocket';
import { SyncService } from '../../services/sync-service';
import { useEffect, useState } from 'react';

export const ConnectionStatus = () => {
  const { isConnected } = useWebSocket();
  const [queueLength, setQueueLength] = useState(0);

  useEffect(() => {
    const updateQueue = async () => {
      const length = await SyncService.getQueueLength();
      setQueueLength(length);
    };

    updateQueue();
    const interval = setInterval(updateQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-dark/80 backdrop-blur-md border border-white/10 shadow-lg transition-all" role="status" aria-live="polite">
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} aria-hidden="true" />
      <span className="text-xs font-medium text-gray-300">
        {isConnected ? 'Online' : 'Offline'}
      </span>
      {queueLength > 0 && (
        <div className="flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-accent-green/20 text-accent-green text-xs font-bold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green"></span>
          </span>
          {queueLength} Pending
        </div>
      )}
    </div>
  );
};
