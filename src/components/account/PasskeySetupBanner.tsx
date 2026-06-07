import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { useWebAuthn } from '../../hooks/useWebAuthn';
import { useToast } from '../../hooks/useToast';
import { webauthnApi } from '../../lib/webauthn-api';

const SNOOZE_KEY = 'passkey-setup-snooze-until';
const SNOOZE_DURATION_MS = 24 * 60 * 60 * 1000; // 1 day

/**
 * Banner that appears on every authenticated page until the user registers
 * a passkey. Dismissing it only snoozes for 24h — this is the "enterprise"
 * nudge that ensures every staff member has a passkey + can be recovered
 * via admin reset or recovery codes if their device is lost.
 */
export const PasskeySetupBanner = () => {
  const webauthn = useWebAuthn();
  const { showSuccess, showError } = useToast();
  const [dismissed, setDismissed] = useState(true); // start hidden until we know
  const [registering, setRegistering] = useState(false);

  const checkSnooze = useCallback(() => {
    try {
      const until = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
      return until > Date.now();
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (webauthn.hasRegisteredCredential) {
      setDismissed(true);
      return;
    }
    setDismissed(checkSnooze());
  }, [webauthn.hasRegisteredCredential, checkSnooze]);

  const handleRegister = async () => {
    setRegistering(true);
    try {
      const ok = await webauthn.register();
      if (ok) {
        showSuccess('Passkey registered');
      } else if (webauthn.error) {
        showError(webauthn.error);
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleSnooze = () => {
    try {
      localStorage.setItem(
        SNOOZE_KEY,
        String(Date.now() + SNOOZE_DURATION_MS),
      );
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  if (dismissed || !webauthn.isSupported || webauthn.hasRegisteredCredential) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-accent-green/40 bg-accent-green/10 p-4 sm:p-5 shadow-lg shadow-accent-green/10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="hidden sm:flex w-10 h-10 items-center justify-center rounded-full bg-accent-green/20 text-accent-green">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">
              Register a passkey for your account
            </p>
            <p className="text-sm text-gray-300 leading-6">
              Use your fingerprint, face, or screen lock to sign in next time — no
              password to type or forget. Passkeys are phishing-resistant and
              required by your organisation\u2019s security policy.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          <Button
            type="button"
            onClick={handleRegister}
            disabled={registering || webauthn.isLoading}
          >
            {registering || webauthn.isLoading ? 'Registering\u2026' : 'Register Now'}
          </Button>
          <Button type="button" variant="secondary" onClick={handleSnooze}>
            Remind me tomorrow
          </Button>
        </div>
      </div>
    </div>
  );
};

// Avoid an unused warning if webauthnApi isn't directly referenced
void webauthnApi;
