import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { SyncService } from '../services/sync-service';

const DEFAULT_API_BASE_URL = 'https://carefam-00c1641bcdf9.herokuapp.com/api';
const API_BASE_URL = import.meta.env.VITE_API_URL?.trim() || DEFAULT_API_BASE_URL;

// Simple UUID v4 generator (no external dependency needed)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to read token from Zustand persisted storage
function getStoredToken(key: 'accessToken' | 'refreshToken'): string | null {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.[key] ?? null;
  } catch {
    return null;
  }
}

function getSessionExpiresAt(): number | null {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const value = parsed?.state?.sessionExpiresAt;
    return typeof value === 'number' ? value : null;
  } catch {
    return null;
  }
}

// Request interceptor to add auth token and idempotency keys
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 1. Add Auth Token
    const token = getStoredToken('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. Handle Idempotency for write operations
    const writeMethods = ['post', 'put', 'patch', 'delete'];
    if (config.method && writeMethods.includes(config.method.toLowerCase())) {
      if (config.headers) {
        config.headers['X-Idempotency-Key'] = generateUUID();
      }
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh and offline queuing
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const requestUrl = originalRequest.url || '';
    const isAuthEndpoint = /\/auth\/(login|refresh|logout)/.test(requestUrl);

    // Handle Offline Queuing: if network error and write operation, queue it
    if (
      !error.response &&
      !isAuthEndpoint &&
      originalRequest.method &&
      ['post', 'put', 'patch', 'delete'].includes(originalRequest.method.toLowerCase())
    ) {
      try {
        await SyncService.queueRequest({
          url: requestUrl,
          method: originalRequest.method?.toUpperCase() as any,
          payload: originalRequest.data,
          headers: originalRequest.headers as any,
        });

        // Return a custom error that the UI can interpret as "Queued for Offline Sync"
        const offlineError = new Error('Network unavailable. Request queued for offline sync.');
        (offlineError as any).isOfflineQueued = true;
        return Promise.reject(offlineError);
      } catch (queueError) {
        console.error('Failed to queue offline request:', queueError);
      }
    }

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const sessionExpiresAt = getSessionExpiresAt();
        if (sessionExpiresAt && Date.now() >= sessionExpiresAt) {
          throw new Error('Session expired');
        }

        const refreshToken = getStoredToken('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Attempt to refresh the token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        }, {
          withCredentials: true,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        // Update Zustand persisted storage
        try {
          const raw = localStorage.getItem('auth-storage');
          if (raw) {
            const parsed = JSON.parse(raw);
            parsed.state.accessToken = accessToken;
            if (newRefreshToken) parsed.state.refreshToken = newRefreshToken;
            localStorage.setItem('auth-storage', JSON.stringify(parsed));
          }
        } catch { /* ignore parse errors */ }

        // Retry the original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Email API methods
export const emailApi = {
  sendReceiptEmail: async (email: string, saleId: string): Promise<void> => {
    try {
      await apiClient.post('/email/receipt', { email, saleId });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || 'Failed to send email';
        throw new Error(message);
      }
      throw error;
    }
  },
};

export default apiClient;
