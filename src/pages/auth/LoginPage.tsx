import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../stores/auth-store';
import { useBranchStore } from '../../stores/branch-store';
import { useBiometricAuth } from '../../hooks/useBiometricAuth';
import { useWebAuthn } from '../../hooks/useWebAuthn';
import { useToast } from '../../hooks/useToast';
import { webauthnApi } from '../../lib/webauthn-api';
import apiClient from '../../lib/api-client';
import { getErrorMessage } from '../../lib/error-utils';
import { getDefaultRouteForRole } from '../../lib/role-routes';

const getLoginErrorMessage = (error: unknown) => {
  const message = getErrorMessage(error, 'Invalid username or password');
  return message.toLowerCase().includes('invalid credentials')
    ? 'Invalid username or password. Use the username, not the email address.'
    : message;
};

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth, isAuthenticated, user } = useAuthStore();
  const { setSelectedBranch } = useBranchStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    password?: string;
    branch?: string;
  }>({});
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [showRecoveryCode, setShowRecoveryCode] = useState(false);

  const biometric = useBiometricAuth((path: string) => {
    navigate(path, { replace: true });
  });
  const webauthn = useWebAuthn();
  const { showError } = useToast();

  // Check for cached credentials for offline login
  const [hasCachedCredentials, setHasCachedCredentials] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth-storage');
      if (raw) {
        const parsed = JSON.parse(raw);
        setHasCachedCredentials(!!parsed?.state?.user && !!parsed?.state?.accessToken);
      }
    } catch {
      setHasCachedCredentials(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      const locationState = location.state as { from?: { pathname?: string } } | null;
      const defaultPath = getDefaultRouteForRole(user.role);
      const from = locationState?.from?.pathname || defaultPath;
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location]);

  const validateForm = (): boolean => {
    const errors: { username?: string; password?: string } = {};

    if (!username.trim()) {
      errors.username = 'Username is required';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/auth/login', {
        username: username.trim(),
        password,
      });
      return response.data;
    },
    onSuccess: async (data) => {
      const { user, accessToken, refreshToken, expiresIn, refreshExpiresIn } = data;

      setAuth(user, accessToken, refreshToken, expiresIn, undefined, refreshExpiresIn);

      if (user.branchId) {
        try {
          const branchResponse = await apiClient.get(`/branches/${user.branchId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          setSelectedBranch(branchResponse.data?.data ?? branchResponse.data);
        } catch (branchError) {
          setFieldErrors((prev) => ({
            ...prev,
            branch:
              'Login worked, but your assigned branch could not be loaded. Please refresh or contact an administrator.',
          }));
          return;
        }
      }

      navigate(getDefaultRouteForRole(user.role));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-darker">
      <div className="max-w-md w-full p-8 bg-primary-dark rounded-lg shadow-xl">
        <h1 className="text-3xl font-bold text-white mb-2 text-center">
          CAREFARM POS
        </h1>
        <p className="text-gray-400 text-center mb-8">
          Sign in to your account
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Username"
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setFieldErrors((prev) => ({ ...prev, username: undefined }));
            }}
            error={fieldErrors.username}
            placeholder="Enter your username"
            required
            disabled={loginMutation.isPending}
            autoComplete="username"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={fieldErrors.password}
            placeholder="Enter your password"
            required
            disabled={loginMutation.isPending}
            autoComplete="current-password"
          />

          {loginMutation.isError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/50">
              <p className="text-sm text-red-500">
                {getLoginErrorMessage(loginMutation.error)}
              </p>
            </div>
          )}

          {fieldErrors.branch && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/50">
              <p className="text-sm text-yellow-300">{fieldErrors.branch}</p>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={loginMutation.isPending}
            disabled={loginMutation.isPending}
          >
            Sign In
          </Button>
        </form>

        {/* Biometric Login */}
        {(webauthn.isSupported || webauthn.isPlatformAuthenticatorAvailable || biometric.isAvailable || hasCachedCredentials) && (
          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-primary-dark text-gray-400">Or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                if (hasCachedCredentials && !navigator.onLine) {
                  // Offline login with cached credentials
                  try {
                    const raw = localStorage.getItem('auth-storage');
                    if (raw) {
                      const parsed = JSON.parse(raw);
                      if (parsed?.state?.user && parsed?.state?.accessToken) {
                        setAuth(
                          parsed.state.user,
                          parsed.state.accessToken,
                          parsed.state.refreshToken,
                          undefined,
                          parsed.state.sessionExpiresAt,
                        );
                        navigate(getDefaultRouteForRole(parsed.state.user.role), { replace: true });
                      }
                    }
                  } catch {
                    // Cached credentials invalid, require online login
                  }
                } else if (webauthn.isSupported) {
                  await webauthn.login(username.trim() || undefined);
                } else if (biometric.isAvailable) {
                  await biometric.loginWithBiometric();
                }
              }}
              disabled={webauthn.isLoading || biometric.isLoading}
              className="mt-4 w-full py-3 bg-primary-darker border border-gray-600 rounded-xl text-white font-medium flex items-center justify-center gap-3 hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {(webauthn.isLoading || biometric.isLoading) ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                </svg>
              )}
              {!navigator.onLine && hasCachedCredentials
                ? 'Sign In Offline'
                : webauthn.isSupported
                  ? 'Sign In with Passkey'
                  : 'Sign In with Biometric'}
            </button>

            {(webauthn.error || biometric.error) && (
              <p className="mt-2 text-sm text-red-400 text-center">
                {webauthn.error || biometric.error}
              </p>
            )}
          </div>
        )}

        <div className="mt-4 text-center">
          <button
            type="button"
            className="text-sm text-gray-400 hover:text-white underline underline-offset-4"
            onClick={() => setShowRecoveryCode((s) => !s)}
          >
            {showRecoveryCode ? 'Use password instead' : 'Lost your device? Use a recovery code'}
          </button>
        </div>

        {showRecoveryCode && (
          <RecoveryCodeForm
            initialUsername={username}
            onSuccess={(user, accessToken, refreshToken, expiresIn, refreshExpiresIn) => {
              setAuth(user, accessToken, refreshToken, expiresIn, undefined, refreshExpiresIn);
              if (user.branchId) {
                apiClient
                  .get(`/branches/${user.branchId}`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                  })
                  .then((br) => {
                    setSelectedBranch(br.data?.data ?? br.data);
                  })
                  .catch(() => undefined);
              }
              showError && showError('Signed in with recovery code. Register a new passkey to restore biometric login.');
              navigate(getDefaultRouteForRole(user.role), { replace: true });
            }}
          />
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Contact your administrator for account access
          </p>
        </div>
      </div>
    </div>
  );
};

interface RecoveryCodeFormProps {
  initialUsername: string;
  onSuccess: (
    user: { id: string; username: string; email: string; firstName: string; lastName: string; role: 'super_admin' | 'branch_manager' | 'cashier' | 'auditor' | 'marketer' | 'finance_manager'; branchId?: string },
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    refreshExpiresIn: number,
  ) => void;
}

const RecoveryCodeForm = ({ initialUsername, onSuccess }: RecoveryCodeFormProps) => {
  const [username, setUsername] = useState(initialUsername);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const data = await webauthnApi.loginWithRecoveryCode(username.trim(), code.trim());
      return data as {
        user: { id: string; username: string; email: string; firstName: string; lastName: string; role: 'super_admin' | 'branch_manager' | 'cashier' | 'auditor' | 'marketer' | 'finance_manager'; branchId?: string };
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        refreshExpiresIn: number;
      };
    },
    onSuccess: (data) => {
      onSuccess(
        data.user,
        data.accessToken,
        data.refreshToken,
        data.expiresIn,
        data.refreshExpiresIn,
      );
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Invalid code';
      setError(msg.toLowerCase().includes('invalid') ? msg : 'Invalid recovery code');
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
      className="mt-4 space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"
    >
      <p className="text-sm text-amber-100/90">
        Sign in with a single-use recovery code. Each code works once and is
        consumed immediately.
      </p>
      <Input
        label="Username"
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
        required
      />
      <Input
        label="Recovery code"
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="K7D9-PXQR-VBNM"
        autoComplete="one-time-code"
        required
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button
        type="submit"
        variant="secondary"
        className="w-full"
        isLoading={mutation.isPending}
        disabled={mutation.isPending || !username || !code}
      >
        Sign In with Recovery Code
      </Button>
    </form>
  );
};
