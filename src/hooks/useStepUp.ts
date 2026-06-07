/**
 * useStepUp — request a short-lived (5 min, single-use) step-up token from
 * the server after a fresh WebAuthn ceremony. Send it as `X-Step-Up-Token`
 * header on subsequent sensitive operations.
 *
 * The api-client automatically attaches the cached step-up token to every
 * request until it's consumed (server deletes on first use) or expires.
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { webauthnApi } from '../lib/webauthn-api';
import {
  getAssertion,
  isPlatformAuthenticatorAvailable,
  isWebAuthnSupported,
} from '../lib/webauthn-client';
import { Capacitor } from '@capacitor/core';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';

const STEP_UP_HEADER = 'X-Step-Up-Token';

let cachedToken: { token: string; expiresAt: number } | null = null;

export function getCachedStepUpToken(): string | null {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5_000) {
    return cachedToken.token;
  }
  return null;
}

export function clearStepUpToken(): void {
  cachedToken = null;
}

async function promptNativeBiometric(reason: string): Promise<boolean> {
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
}

export interface UseStepUpReturn {
  /** True if the device can produce a step-up token (WebAuthn + biometric) */
  isSupported: boolean;
  /** Whether we currently hold a valid step-up token */
  hasFreshToken: boolean;
  /** Trigger a fresh WebAuthn ceremony + return a step-up token */
  acquire: (reason: string) => Promise<string | null>;
  /** When the cached token expires (ms) or 0 if no token */
  expiresAt: number;
  isLoading: boolean;
  error: string | null;
}

export function useStepUp(): UseStepUpReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [expiresAt, setExpiresAt] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function detect() {
      if (!isWebAuthnSupported()) {
        setIsSupported(false);
        return;
      }
      const platform = await isPlatformAuthenticatorAvailable();
      if (!cancelled) setIsSupported(platform);
    }
    detect();
    return () => {
      cancelled = true;
    };
  }, []);

  const acquire = useCallback(
    async (reason: string): Promise<string | null> => {
      if (inFlight.current) return null;
      if (!isSupported) {
        setError('Step-up is not supported on this device');
        return null;
      }
      inFlight.current = true;
      setIsLoading(true);
      setError(null);
      try {
        const ok = await promptNativeBiometric(
          'Verify your identity to authorise this action',
        );
        if (!ok) {
          setError('Biometric confirmation cancelled');
          return null;
        }
        // Dedicated step-up ceremony: doesn't issue new session tokens
        const start = await webauthnApi.stepUpStart(reason);
        const assertion = await getAssertion({
          challenge: start.challenge,
          timeout: start.timeout,
          rpId: start.rpId,
          allowCredentials: start.allowCredentials,
          userVerification: start.userVerification,
        });
        const { token, expiresAt: exp } = await webauthnApi.stepUpFinish(reason, {
          id: assertion.id,
          rawId: assertion.rawId,
          type: assertion.type,
          response: assertion.response,
        });
        cachedToken = { token, expiresAt: exp };
        setExpiresAt(exp);
        return token;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Step-up failed');
        return null;
      } finally {
        setIsLoading(false);
        inFlight.current = false;
      }
    },
    [isSupported],
  );

  return {
    isSupported,
    hasFreshToken: expiresAt > Date.now() + 5_000,
    acquire,
    expiresAt,
    isLoading,
    error,
  };
}

export { STEP_UP_HEADER };
