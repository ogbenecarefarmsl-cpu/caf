import { useState, useEffect, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';
import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';
import { Capacitor } from '@capacitor/core';
import apiClient from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';
import { useBranchStore } from '../stores/branch-store';
import { getDefaultRouteForRole } from '../lib/role-routes';

const BIOMETRIC_TOKEN_KEY = 'biometric_token';
const BIOMETRIC_USERNAME_KEY = 'biometric_username';
const BIOMETRIC_DEVICE_ID_KEY = 'biometric_device_id';

/** Stable identifier for this device install */
async function getOrCreateDeviceId(): Promise<string> {
  const { value } = await Preferences.get({ key: 'device_id' });
  if (value) return value;
  const id = crypto.randomUUID();
  await Preferences.set({ key: 'device_id', value: id });
  return id;
}

export interface UseBiometricAuthReturn {
  /** Whether the current device supports biometric auth */
  isAvailable: boolean;
  /** Whether the user has biometric login enabled on this device */
  isEnabled: boolean;
  /** Trigger the biometric prompt and log in */
  loginWithBiometric: () => Promise<void>;
  /**
   * Call after a successful password login to let the user enable biometric.
   * Returns true if the user confirmed and biometric was registered.
   */
  promptToEnable: (username: string, accessToken: string) => Promise<boolean>;
  /** Remove stored credentials and disable biometric login */
  disable: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useBiometricAuth(
  onSuccess?: (redirectPath: string) => void,
): UseBiometricAuthReturn {
  const { setAuth } = useAuthStore();
  const { setSelectedBranch } = useBranchStore();

  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      // Biometric only works in a native Capacitor app
      if (!Capacitor.isNativePlatform()) {
        setIsAvailable(false);
        return;
      }
      try {
        const info = await BiometricAuth.checkBiometry();
        setIsAvailable(
          info.isAvailable &&
            info.biometryType !== BiometryType.none,
        );
      } catch {
        setIsAvailable(false);
      }

      // Check if already enrolled
      const { value: token } = await Preferences.get({ key: BIOMETRIC_TOKEN_KEY });
      setIsEnabled(!!token);
    }
    check();
  }, []);

  const loginWithBiometric = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const { value: username } = await Preferences.get({ key: BIOMETRIC_USERNAME_KEY });
      const { value: biometricToken } = await Preferences.get({ key: BIOMETRIC_TOKEN_KEY });
      const { value: deviceId } = await Preferences.get({ key: BIOMETRIC_DEVICE_ID_KEY });

      if (!username || !biometricToken || !deviceId) {
        throw new Error('Biometric not set up on this device');
      }

      // Trigger native biometric prompt BEFORE sending credentials to server
      await BiometricAuth.authenticate({
        reason: 'Verify your identity to sign in',
        cancelTitle: 'Use Password',
        allowDeviceCredential: false,
      });

      // Biometric passed — exchange token for session
      const response = await apiClient.post('/auth/biometric/verify', {
        username,
        deviceId,
        biometricToken,
      });

      const { user, accessToken, refreshToken, expiresIn, refreshExpiresIn } = response.data;
      setAuth(user, accessToken, refreshToken, expiresIn, undefined, refreshExpiresIn);

      if (user.branchId) {
        try {
          const branchResponse = await apiClient.get(`/branches/${user.branchId}`);
          setSelectedBranch(branchResponse.data?.data ?? branchResponse.data);
        } catch {
          // non-fatal
        }
      }

      onSuccess?.(getDefaultRouteForRole(user.role));
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Biometric authentication failed';
      // User cancelled — don't treat as error
      if (msg.includes('cancel') || msg.includes('Cancel')) {
        setError(null);
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess, setAuth, setSelectedBranch]);

  const promptToEnable = useCallback(
    async (username: string, accessToken: string): Promise<boolean> => {
      if (!isAvailable) return false;
      try {
        // Trigger biometric to confirm the user is the owner before enrolling
        await BiometricAuth.authenticate({
          reason: 'Confirm your fingerprint to enable quick sign-in',
          cancelTitle: 'Skip',
          allowDeviceCredential: false,
        });

        const deviceId = await getOrCreateDeviceId();

        // Register on backend (uses already-issued accessToken)
        const response = await apiClient.post(
          '/auth/biometric/register',
          { deviceId },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );

        const { biometricToken } = response.data;

        await Preferences.set({ key: BIOMETRIC_TOKEN_KEY, value: biometricToken });
        await Preferences.set({ key: BIOMETRIC_USERNAME_KEY, value: username });
        await Preferences.set({ key: BIOMETRIC_DEVICE_ID_KEY, value: deviceId });

        setIsEnabled(true);
        return true;
      } catch {
        // User cancelled biometric prompt — treat as "skip"
        return false;
      }
    },
    [isAvailable],
  );

  const disable = useCallback(async () => {
    await Preferences.remove({ key: BIOMETRIC_TOKEN_KEY });
    await Preferences.remove({ key: BIOMETRIC_USERNAME_KEY });
    await Preferences.remove({ key: BIOMETRIC_DEVICE_ID_KEY });
    setIsEnabled(false);
  }, []);

  return { isAvailable, isEnabled, loginWithBiometric, promptToEnable, disable, isLoading, error };
}
