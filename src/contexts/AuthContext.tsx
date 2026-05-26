import axios from 'axios';
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

const isNetworkError = (error: unknown) => axios.isAxiosError(error) && !error.response;

const isUnauthorizedError = (error: unknown) =>
  axios.isAxiosError(error) && error.response?.status === 401;

const isCredentialError = (error: unknown) =>
  axios.isAxiosError(error) && [400, 401, 403].includes(error.response?.status ?? 0);

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
    refreshExpiresAt,
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
      if (!refreshToken || (refreshExpiresAt && refreshExpiresAt <= Date.now())) {
        expireSession();
        return;
      }

      const response = await apiClient.post('/auth/refresh', {
        refreshToken,
      });

      const {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: updatedUser,
        expiresIn,
        refreshExpiresIn,
      } = response.data;

      const nextUser = updatedUser ?? user;
      if (!nextUser || !newAccessToken) {
        throw new Error('Invalid refresh response');
      }

      setAuth(nextUser, newAccessToken, newRefreshToken || refreshToken, expiresIn, undefined, refreshExpiresIn);
    } catch (error) {
      if (isNetworkError(error)) {
        console.warn('Token refresh postponed because the network is unavailable.');
        return;
      }

      if (isCredentialError(error)) {
        expireSession();
      }
    }
  }, [expireSession, refreshExpiresAt, refreshToken, setAuth, user]);

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

      if (!accessToken && isAuthenticated && refreshToken) {
        await refreshAccessToken();
        return;
      }

      if (accessToken && isAuthenticated) {
        try {
          await apiClient.get('/auth/me');
        } catch (error) {
          if (isNetworkError(error)) {
            return;
          }

          if (refreshToken) {
            await refreshAccessToken();
          } else if (isUnauthorizedError(error)) {
            expireSession();
          }
        }
      }
    };

    void validateToken();
  }, [accessToken, expireSession, hasHydrated, isAuthenticated, refreshAccessToken, refreshToken]);

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
