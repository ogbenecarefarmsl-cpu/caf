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
    (set) => ({
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
        set({
          user,
          accessToken,
          refreshToken,
          sessionExpiresAt: sessionExpiresAt ?? Date.now() + expiresInSeconds * 1000,
          refreshExpiresAt: Date.now() + refreshExpiresInSeconds * 1000,
          isAuthenticated: true,
        });
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
