import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { UpdatePrompt } from './components/UpdatePrompt';
import { ToastProvider } from './components/ui/Toast';
import {
  applyLiveUpdate,
  checkForLiveUpdate,
  type DownloadedUpdate,
} from './lib/live-updates';
import { router } from './routes';

function App() {
  const [availableUpdate, setAvailableUpdate] = useState<DownloadedUpdate | null>(null);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);

  useEffect(() => {
    let isMounted = true;

    checkForLiveUpdate().then((update) => {
      if (isMounted && update) {
        setAvailableUpdate(update);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleApplyUpdate = async () => {
    if (!availableUpdate) {
      return;
    }

    setIsApplyingUpdate(true);

    try {
      await applyLiveUpdate(availableUpdate.id);
    } catch (error) {
      console.warn('Failed to apply live update:', error);
      setIsApplyingUpdate(false);
    }
  };

  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
        <UpdatePrompt
          isOpen={!!availableUpdate}
          isApplying={isApplyingUpdate}
          onUpdate={handleApplyUpdate}
          onDismiss={() => setAvailableUpdate(null)}
        />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
