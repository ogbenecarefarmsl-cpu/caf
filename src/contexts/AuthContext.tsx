import { createContext, useContext, useEffect, useCallback, type ReactNode } from 'react';
import { useAuthStore, type User } from '../stores/auth-store';
import apiClient from '../lib/api-client';

// AuthContext interface and hook
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
  const { isAuthenticated, user, clearAuth, setAuth, accessToken, refreshToken } = useAuthStore();

  // Token refresh logic
  const refreshAccessToken = useCallback(async () => {
    try {
      const storedRefreshToken = refreshToken || localStorage.getItem('refreshToken');
      
      if (!storedRefreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post('/auth/refresh', {
        refreshToken: storedRefreshToken,
      });

      const { accessToken: newAccessToken, user: updatedUser } = response.data;
      
      // Update the store with new token
      if (user && updatedUser) {
        setAuth(updatedUser, newAccessToken, storedRefreshToken);
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearAuth();
      window.location.href = '/login';
    }
  }, [refreshToken, user, setAuth, clearAuth]);

  // Logout function
  const logout = async () => {
    try {
      // Call logout endpoint to invalidate tokens on server
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear auth state regardless of API call result
      clearAuth();
      window.location.href = '/login';
    }
  };

  // Set up token refresh interval
  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      return;
    }

    // Refresh token before the 12 hour session expires.
    const refreshInterval = setInterval(() => {
      refreshAccessToken();
    }, 11.5 * 60 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated, accessToken, refreshAccessToken]);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      const storedAccessToken = accessToken;
      
      if (storedAccessToken && isAuthenticated) {
        try {
          // Validate token by making a test request
          await apiClient.get('/auth/me');
        } catch {
          // Token is invalid, try to refresh
          await refreshAccessToken();
        }
      }
    };

    validateToken();
  }, [accessToken, isAuthenticated, refreshAccessToken]);

  const value: AuthContextType = {
    isAuthenticated,
    user,
    logout,
    refreshAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
