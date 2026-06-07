import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { useWebAuthn } from '../../hooks/useWebAuthn';
import { useToast } from '../../hooks/useToast';
import { webauthnApi, type CredentialSummary } from '../../lib/webauthn-api';

const TRANSPORT_LABELS: Record<string, string> = {
  usb: 'USB',
  nfc: 'NFC',
  ble: 'Bluetooth',
  internal: 'Built-in',
  hybrid: 'Phone',
  smart_card: 'Smart Card',
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'never';
  return new Date(iso).toLocaleString();
}

function transportLabel(t: string): string {
  return TRANSPORT_LABELS[t] ?? t;
}

export const PasskeySettingsPanel = () => {
  const webauthn = useWebAuthn();
  const { showSuccess, showError } = useToast();
  const [credentials, setCredentials] = useState<CredentialSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await webauthnApi.listCredentials();
      setCredentials(list.filter((c) => !c.revoked));
    } catch {
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (webauthn.isSupported) {
      refresh();
    }
  }, [webauthn.isSupported, refresh]);

  const handleRegister = async () => {
    const ok = await webauthn.register();
    if (ok) {
      showSuccess('Passkey registered');
      refresh();
    } else if (webauthn.error) {
      showError(webauthn.error);
    }
  };

  const handleRevoke = async (id: string) => {
    setPendingRevoke(id);
    try {
      await webauthnApi.revokeCredential(id);
      showSuccess('Passkey removed');
      refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to remove passkey');
    } finally {
      setPendingRevoke(null);
    }
  };

  if (!webauthn.isSupported) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-base font-semibold text-white">Passkey (WebAuthn)</h3>
        <p className="mt-2 text-sm text-gray-400 leading-6">
          This browser doesn't support passkeys. Try Chrome, Edge, Safari 16+, or Firefox 122+ to
          enable fingerprint / Face ID / Windows Hello sign-in.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-white">Passkey sign in</h3>
          <p className="text-sm text-gray-400 leading-6">
            {webauthn.isPlatformAuthenticatorAvailable
              ? 'Register a passkey using your device\u2019s fingerprint, face, or screen lock to sign in securely without a password.'
              : 'Use a security key (YubiKey, etc.) to sign in without a password.'}
          </p>
        </div>
        <Button
          type="button"
          onClick={handleRegister}
          disabled={webauthn.isLoading}
        >
          {webauthn.isLoading ? 'Registering\u2026' : 'Register New Passkey'}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading passkeys\u2026</p>
      ) : credentials.length === 0 ? (
        <p className="text-sm text-gray-400">No passkeys registered yet.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {credentials.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium text-white">{c.friendlyName}</p>
                <p className="text-xs text-gray-400">
                  {c.transports?.map(transportLabel).join(' \u00b7 ') || 'Unknown transport'}
                  {' \u00b7 last used '}
                  {formatDate(c.lastUsedAt)}
                </p>
                {c.backupEligible ? (
                  <p className="text-xs text-gray-500">
                    Backup-eligible{c.backupState ? ' (synced to cloud)' : ''}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleRevoke(c.id)}
                disabled={pendingRevoke === c.id}
              >
                {pendingRevoke === c.id ? 'Removing\u2026' : 'Remove'}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {webauthn.error ? <p className="text-sm text-red-400">{webauthn.error}</p> : null}
    </div>
  );
};
