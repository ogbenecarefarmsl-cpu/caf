import { createContext, useCallback, useContext, useEffect, type ReactNode } from 'react';
import { useAuthStore, type User } from '../stores/auth-store';
import apiClient from '../lib/api-client';

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
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
  } = useAuthStore();

  const expireSession = useCallback(() => {
    clearAuth();
    window.location.href = '/login';
  }, [clearAuth]);

  const refreshAccessToken = useCallback(async () => {
    try {
      if (sessionExpiresAt && Date.now() >= sessionExpiresAt) {
        expireSession();
        return;
      }

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
      } = response.data;

      if (user && updatedUser) {
        setAuth(
          updatedUser,
          newAccessToken,
          newRefreshToken || refreshToken,
          undefined,
          sessionExpiresAt ?? undefined,
        );
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      expireSession();
    }
  }, [expireSession, refreshToken, sessionExpiresAt, setAuth, user]);

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
    if (!isAuthenticated || !accessToken || !sessionExpiresAt) {
      return;
    }

    const timeoutMs = Math.max(sessionExpiresAt - Date.now(), 0);
    if (timeoutMs === 0) {
      expireSession();
      return;
    }

    const expiryTimeout = window.setTimeout(() => {
      expireSession();
    }, timeoutMs);

    return () => window.clearTimeout(expiryTimeout);
  }, [accessToken, expireSession, isAuthenticated, sessionExpiresAt]);

  useEffect(() => {
    const validateToken = async () => {
      if (sessionExpiresAt && Date.now() >= sessionExpiresAt) {
        expireSession();
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
  }, [accessToken, expireSession, isAuthenticated, refreshAccessToken, sessionExpiresAt]);

  const value: AuthContextType = {
    isAuthenticated,
    user,
    logout,
    refreshAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
