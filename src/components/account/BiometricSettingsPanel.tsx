import { Button } from '../ui/Button';
import { useBiometricAuth } from '../../hooks/useBiometricAuth';
import { useToast } from '../../hooks/useToast';
import { useAuthStore } from '../../stores/auth-store';

export const BiometricSettingsPanel = () => {
  const biometric = useBiometricAuth();
  const { showSuccess, showError } = useToast();
  const { user, accessToken } = useAuthStore();

  const handleRegister = async () => {
    if (!user?.username || !accessToken) {
      showError('Sign in again before registering fingerprint');
      return;
    }

    const registered = await biometric.promptToEnable(user.username, accessToken);
    if (registered) {
      showSuccess('Fingerprint registered');
    } else {
      showError('Fingerprint was not registered');
    }
  };

  const handleRemove = async () => {
    await biometric.disable();
    showSuccess('Fingerprint removed');
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-white">Fingerprint sign in</h3>
          <p className="text-sm text-gray-400 leading-6">
            {biometric.isAvailable
              ? biometric.isEnabled
                ? 'Fingerprint is registered on this device. You can use it to sign in quickly.'
                : 'Register this device so you can sign in without typing your password.'
              : 'Fingerprint sign-in works in the mobile app on devices with biometric support.'}
          </p>
        </div>

        {biometric.isEnabled ? (
          <Button type="button" variant="secondary" onClick={handleRemove}>
            Remove Fingerprint
          </Button>
        ) : (
          <Button
            type="button"
            disabled={!biometric.isAvailable || !accessToken || biometric.isLoading}
            onClick={handleRegister}
          >
            {biometric.isLoading ? 'Registering...' : 'Register Fingerprint'}
          </Button>
        )}
      </div>

      {biometric.error ? <p className="text-sm text-red-400">{biometric.error}</p> : null}
      {!biometric.isAvailable ? (
        <p className="text-xs text-gray-500">
          On the web browser this setting is shown for awareness, but registration must happen in the installed mobile app.
        </p>
      ) : null}
    </div>
  );
};
