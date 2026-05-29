import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
        expiresInSeconds = 14 * 60 * 60,
        sessionExpiresAt,
        refreshExpiresInSeconds = 7 * 24 * 60 * 60,
      ) => {
        const sessionExp = sessionExpiresAt ?? Date.now() + expiresInSeconds * 1000;
        const refreshExp = Date.now() + refreshExpiresInSeconds * 1000;

        set({
          user,
          accessToken,
          refreshToken,
          sessionExpiresAt: sessionExp,
          refreshExpiresAt: refreshExp,
          isAuthenticated: true,
        });

        // Schedule proactive logout before token expiry (2 minutes before)
        const timeUntilExpiry = sessionExp - Date.now() - 120_000;
        if (timeUntilExpiry > 0) {
          setTimeout(() => {
            const state = get();
            if (state.isAuthenticated && state.sessionExpiresAt && Date.now() >= state.sessionExpiresAt - 60_000) {
              set({
                user: null,
                accessToken: null,
                refreshToken: null,
                sessionExpiresAt: null,
                refreshExpiresAt: null,
                isAuthenticated: false,
              });
              if (window.location.pathname !== '/login') {
                window.location.href = '/login';
              }
            }
          }, timeUntilExpiry);
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
