import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { secureSession } from '../lib/secure-session';

/** 14h sliding-window session policy:
 *  - access token: 15 minutes (auto-refreshed by the api-client)
 *  - refresh token: 14 hours; every successful refresh resets the 14h clock
 *    (sliding). Once 14h of inactivity elapses, the user must log in again
 *    with password or biometric.
 */
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 14 * 60 * 60;

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'branch_manager' | 'cashier' | 'auditor' | 'marketer' | 'finance_manager';
  branchId?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  sessionExpiresAt: number | null;
  refreshExpiresAt: number | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;

  // Actions
  setAuth: (
    user: User,
    accessToken: string,
    refreshToken: string,
    expiresInSeconds?: number,
    sessionExpiresAt?: number,
    refreshExpiresInSeconds?: number,
  ) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  /** Called by the api-client after a successful token refresh */
  refreshSession: (
    accessToken: string,
    refreshToken: string,
    expiresInSeconds: number,
    refreshExpiresInSeconds: number,
  ) => void;
}

let expiryTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleAbsoluteLogout(expiresAt: number): void {
  if (expiryTimer) clearTimeout(expiryTimer);
  const delay = expiresAt - Date.now() - 60_000; // 1min grace
  if (delay <= 0) return;
  expiryTimer = setTimeout(() => {
    const state = useAuthStore.getState();
    if (state.isAuthenticated && state.refreshExpiresAt && Date.now() >= state.refreshExpiresAt) {
      useAuthStore.getState().clearAuth();
      secureSession.clear().catch(() => undefined);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }, delay);
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      sessionExpiresAt: null,
      refreshExpiresAt: null,
      isAuthenticated: false,
      hasHydrated: false,

      setAuth: (
        user,
        accessToken,
        refreshToken,
        expiresInSeconds = ACCESS_TOKEN_TTL_SECONDS,
        _sessionExpiresAt,
        refreshExpiresInSeconds = REFRESH_TOKEN_TTL_SECONDS,
      ) => {
        const sessionExp = Date.now() + expiresInSeconds * 1000;
        const refreshExp = Date.now() + refreshExpiresInSeconds * 1000;

        set({
          user,
          accessToken,
          refreshToken,
          sessionExpiresAt: sessionExp,
          refreshExpiresAt: refreshExp,
          isAuthenticated: true,
        });

        // Mirror to encrypted IndexedDB for offline/biometric re-auth
        secureSession
          .save({
            refreshToken,
            expiresAt: refreshExp,
            userId: user.id,
            username: user.username,
          })
          .catch((err) => {
            console.warn('Failed to persist secure session:', err);
          });

        scheduleAbsoluteLogout(refreshExp);
      },

      refreshSession: (
        accessToken,
        refreshToken,
        expiresInSeconds,
        refreshExpiresInSeconds,
      ) => {
        const sessionExp = Date.now() + expiresInSeconds * 1000;
        const refreshExp = Date.now() + refreshExpiresInSeconds * 1000;

        set({
          accessToken,
          refreshToken,
          sessionExpiresAt: sessionExp,
          refreshExpiresAt: refreshExp,
          isAuthenticated: true,
        });

        const { user } = get();
        if (user) {
          secureSession
            .save({
              refreshToken,
              expiresAt: refreshExp,
              userId: user.id,
              username: user.username,
            })
            .catch((err) => {
              console.warn('Failed to update secure session:', err);
            });
        }

        scheduleAbsoluteLogout(refreshExp);
      },

      clearAuth: () => {
        if (expiryTimer) {
          clearTimeout(expiryTimer);
          expiryTimer = null;
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          sessionExpiresAt: null,
          refreshExpiresAt: null,
          isAuthenticated: false,
        });
        secureSession.clear().catch(() => undefined);
      },

      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),

      setHasHydrated: (hasHydrated) => {
        set({ hasHydrated });
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        if (state?.refreshExpiresAt && state.refreshExpiresAt > Date.now()) {
          scheduleAbsoluteLogout(state.refreshExpiresAt);
        }
      },
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        sessionExpiresAt: state.sessionExpiresAt,
        refreshExpiresAt: state.refreshExpiresAt,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
