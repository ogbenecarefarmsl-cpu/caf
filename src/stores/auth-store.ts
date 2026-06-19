import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { secureSession } from '../lib/secure-session';

/** Session policy:
 *  - access token: 15 minutes (auto-refreshed by the api-client)
 *  - refresh token: refreshed continuously so the user stays logged in forever
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
      },

      clearAuth: () => {
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
