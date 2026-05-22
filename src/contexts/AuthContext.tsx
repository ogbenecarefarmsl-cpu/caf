import { createContext, useCallback, useContext, useEffect, type ReactNode } from 'react';
import { useAuthStore, type User } from '../stores/auth-store';
import apiClient from '../lib/api-client';

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  hasHydrated: boolean;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const {
    isAuthenticated,
    user,
    clearAuth,
    setAuth,
    accessToken,
    refreshToken,
    sessionExpiresAt,
    hasHydrated,
  } = useAuthStore();

  const expireSession = useCallback(() => {
    clearAuth();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }, [clearAuth]);

  const refreshAccessToken = useCallback(async () => {
    try {
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post('/auth/refresh', {
        refreshToken,
      });

      const {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: updatedUser,
        expiresIn,
      } = response.data;

      const nextUser = updatedUser ?? user;
      if (!nextUser || !newAccessToken) {
        throw new Error('Invalid refresh response');
      }

      setAuth(nextUser, newAccessToken, newRefreshToken || refreshToken, expiresIn);
    } catch (error) {
      console.error('Token refresh failed:', error);
      expireSession();
    }
  }, [expireSession, refreshToken, setAuth, user]);

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      expireSession();
    }
  };

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || !accessToken || !sessionExpiresAt) {
      return;
    }

    const refreshBeforeExpiryMs = 60 * 1000;
    const timeoutMs = Math.max(sessionExpiresAt - Date.now() - refreshBeforeExpiryMs, 0);

    const expiryTimeout = window.setTimeout(() => {
      void refreshAccessToken();
    }, timeoutMs);

    return () => window.clearTimeout(expiryTimeout);
  }, [accessToken, hasHydrated, isAuthenticated, refreshAccessToken, sessionExpiresAt]);

  useEffect(() => {
    const validateToken = async () => {
      if (!hasHydrated) {
        return;
      }

      if (accessToken && isAuthenticated) {
        try {
          await apiClient.get('/auth/me');
        } catch {
          await refreshAccessToken();
        }
      }
    };

    void validateToken();
  }, [accessToken, hasHydrated, isAuthenticated, refreshAccessToken]);

  const value: AuthContextType = {
    isAuthenticated,
    user,
    accessToken,
    hasHydrated,
    logout,
    refreshAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
