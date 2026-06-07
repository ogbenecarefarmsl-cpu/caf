/**
 * useWebAuthn — true FIDO2 biometric login & registration.
 *
 * On a Capacitor native app we delegate the biometric prompt to the OS via
 * `@aparajita/capacitor-biometric-auth` and use the WebView's
 * `navigator.credentials` for the actual WebAuthn ceremony (Android WebView
 * and iOS WKWebView both implement it).
 *
 * On a regular browser (or PWA install), we use the browser's WebAuthn API
 * directly with platform authenticators (Windows Hello, Touch ID, Android
 * fingerprint, etc.).
 *
 * This hook works alongside the legacy `useBiometricAuth` token-based flow;
 * legacy tokens remain valid for older app versions.
 */

import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  BiometricAuth,
} from '@aparajita/capacitor-biometric-auth';
import { useAuthStore } from '../stores/auth-store';
import { useBranchStore } from '../stores/branch-store';
import { getDefaultRouteForRole } from '../lib/role-routes';
import {
  createCredential,
  getAssertion,
  isPlatformAuthenticatorAvailable,
  isWebAuthnSupported,
} from '../lib/webauthn-client';
import { webauthnApi } from '../lib/webauthn-api';
import apiClient from '../lib/api-client';

export interface UseWebAuthnReturn {
  /** Browser/Capacitor WebView supports PublicKeyCredential */
  isSupported: boolean;
  /** A platform authenticator (fingerprint, face) is enrolled */
  isPlatformAuthenticatorAvailable: boolean;
  /** The current user has at least one registered WebAuthn credential */
  hasRegisteredCredential: boolean;
  /** Register a new credential (after first password login) */
  register: (friendlyName?: string) => Promise<boolean>;
  /** Trigger biometric login (passkey) */
  login: (username?: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  /** Trigger native biometric prompt only — returns true on success */
  ensureBiometric: (reason: string) => Promise<boolean>;
}

async function nativeBiometricCheck(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    await BiometricAuth.authenticate({
      reason: 'Verify your identity',
      cancelTitle: 'Cancel',
      allowDeviceCredential: true,
    });
    return true;
  } catch {
    return false;
  }
}

export function useWebAuthn(): UseWebAuthnReturn {
  const { user, accessToken, setAuth } = useAuthStore();
  const { setSelectedBranch } = useBranchStore();

  const [isSupported, setIsSupported] = useState(false);
  const [isPlatform, setIsPlatform] = useState(false);
  const [hasRegistered, setHasRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function detect() {
      const supported = isWebAuthnSupported();
      const platform = supported ? await isPlatformAuthenticatorAvailable() : false;
      if (!cancelled) {
        setIsSupported(supported);
        setIsPlatform(platform);
      }
    }
    detect();
    return () => {
      cancelled = true;
    };
  }, []);

  // Probe whether the logged-in user has any registered credentials
  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!user || !accessToken) {
        setHasRegistered(false);
        return;
      }
      try {
        const list = await webauthnApi.listCredentials();
        if (!cancelled) {
          setHasRegistered(list.some((c) => !c.revoked));
        }
      } catch {
        if (!cancelled) setHasRegistered(false);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [user, accessToken]);

  const ensureBiometric = useCallback(
    async (reason: string): Promise<boolean> => {
      if (!Capacitor.isNativePlatform()) return true;
      try {
        await BiometricAuth.authenticate({
          reason,
          cancelTitle: 'Cancel',
          allowDeviceCredential: true,
        });
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const register = useCallback(
    async (friendlyName?: string): Promise<boolean> => {
      if (!isSupported) {
        setError('WebAuthn not supported on this device');
        return false;
      }
      setError(null);
      setIsLoading(true);
      try {
        const ok = await ensureBiometric('Confirm biometric to enable passkey');
        if (!ok) {
          setError('Biometric confirmation cancelled');
          return false;
        }

        const start = await webauthnApi.registrationStart();
        const cred = await createCredential(start.options);
        await webauthnApi.registrationFinish({
          id: cred.id,
          rawId: cred.rawId,
          type: cred.type,
          response: cred.response,
          clientExtensionResults: cred.clientExtensionResults,
          friendlyName: friendlyName ?? deviceLabel(),
        });
        setHasRegistered(true);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'WebAuthn registration failed');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [isSupported, ensureBiometric],
  );

  const login = useCallback(
    async (username?: string): Promise<boolean> => {
      if (!isSupported) {
        setError('WebAuthn not supported on this device');
        return false;
      }
      setError(null);
      setIsLoading(true);
      try {
        const ok = await ensureBiometric('Verify your identity to sign in');
        if (!ok) {
          setError('Biometric cancelled');
          return false;
        }

        const start = await webauthnApi.loginStart(username);
        const assertion = await getAssertion({
          challenge: start.challenge,
          timeout: start.timeout,
          rpId: start.rpId,
          allowCredentials: start.allowCredentials,
          userVerification: start.userVerification,
        });
        const data = await webauthnApi.loginFinish({
          id: assertion.id,
          rawId: assertion.rawId,
          type: assertion.type,
          response: assertion.response,
          username: username ?? start.username,
          clientExtensionResults: assertion.clientExtensionResults,
        });

        const resp = data as {
          user: unknown;
          accessToken: string;
          refreshToken: string;
          expiresIn?: number;
          refreshExpiresIn?: number;
        };
        setAuth(
          resp.user as never,
          resp.accessToken,
          resp.refreshToken,
          resp.expiresIn,
          undefined,
          resp.refreshExpiresIn,
        );

        const u = resp.user as { branchId?: string; role?: import('../stores/auth-store').User['role'] };
        if (u?.branchId) {
          try {
            const br = await apiClient.get(`/branches/${u.branchId}`);
            const branchData = (br.data as { data?: unknown })?.data ?? br.data;
            setSelectedBranch(branchData as never);
          } catch {
            // non-fatal
          }
        }
        if (u?.role) {
          window.location.assign(getDefaultRouteForRole(u.role));
        }
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'WebAuthn login failed');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [isSupported, ensureBiometric, setAuth, setSelectedBranch],
  );

  return {
    isSupported,
    isPlatformAuthenticatorAvailable: isPlatform,
    hasRegisteredCredential: hasRegistered,
    register,
    login,
    isLoading,
    error,
    ensureBiometric,
  };
}

function deviceLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return 'iOS Device';
  if (/Android/.test(ua)) return 'Android Device';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  return 'Device';
}
