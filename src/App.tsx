import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { UpdatePrompt } from './components/UpdatePrompt';
import { ToastProvider } from './components/ui/Toast';
import {
  checkForApkUpdate,
  openApkDownload,
  type ApkUpdate,
} from './lib/apk-updates';
import {
  applyLiveUpdate,
  checkForLiveUpdate,
  type DownloadedUpdate,
} from './lib/live-updates';
import { startPeriodicSync, stopPeriodicSync } from './services/background-sync.service';
import { useBranchStore } from './stores/branch-store';
import { useAuthStore } from './stores/auth-store';
import { router } from './routes';

type PendingUpdate =
  | { type: 'apk'; update: ApkUpdate }
  | { type: 'live'; update: DownloadedUpdate };

function App() {
  const [availableUpdate, setAvailableUpdate] = useState<PendingUpdate | null>(null);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);

  // Start periodic sync when authenticated
  useEffect(() => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    if (!isAuthenticated) return;

    const branchId = useBranchStore.getState().selectedBranch?._id;
    startPeriodicSync(branchId);

    return () => {
      stopPeriodicSync();
    };
  }, []);

  // Watch for branch changes to restart sync
  useEffect(() => {
    const unsubscribe = useBranchStore.subscribe((state) => {
      if (state.selectedBranch?._id && useAuthStore.getState().isAuthenticated) {
        stopPeriodicSync();
        startPeriodicSync(state.selectedBranch._id);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkForUpdates = async () => {
      const liveUpdate = await checkForLiveUpdate();
      if (!isMounted) {
        return;
      }

      if (liveUpdate) {
        setAvailableUpdate({ type: 'live', update: liveUpdate });
        return;
      }

      const apkUpdate = await checkForApkUpdate();
      if (isMounted && apkUpdate) {
        setAvailableUpdate({ type: 'apk', update: apkUpdate });
      }
    };

    void checkForUpdates();

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
      if (availableUpdate.type === 'apk') {
        openApkDownload(availableUpdate.update.downloadUrl);
        setIsApplyingUpdate(false);
        return;
      }

      await applyLiveUpdate(availableUpdate.update.id);
    } catch (error) {
      console.warn('Failed to apply update:', error);
      setIsApplyingUpdate(false);
    }
  };

  const isApkUpdate = availableUpdate?.type === 'apk';
  const apkUpdate = isApkUpdate ? availableUpdate.update : null;

  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
        <UpdatePrompt
          isOpen={!!availableUpdate}
          isApplying={isApplyingUpdate}
          title={isApkUpdate ? 'APK update available' : 'Update ready'}
          description={
            isApkUpdate
              ? `Version ${apkUpdate?.versionName} is ready to download.`
              : 'A new CAREFARM POS update has been downloaded.'
          }
          body={
            isApkUpdate
              ? apkUpdate?.releaseNotes ||
                'This update includes native Android changes. Download the APK, then Android will ask you to confirm the install.'
              : 'Apply it now to restart the app with the latest version, or continue working and update later.'
          }
          actionLabel={isApkUpdate ? 'Download APK' : 'Update now'}
          pendingLabel={isApkUpdate ? 'Opening...' : 'Updating...'}
          canDismiss={!apkUpdate?.mandatory}
          onUpdate={handleApplyUpdate}
          onDismiss={() => setAvailableUpdate(null)}
        />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
