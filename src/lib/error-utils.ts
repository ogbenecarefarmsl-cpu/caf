import axios from 'axios';

/**
 * Extracts error message from various error types
 * @param error - The error object (axios error, Error, or unknown)
 * @param defaultMessage - Fallback message if extraction fails
 * @returns Extracted or default error message
 */
export const getErrorMessage = (error: unknown, defaultMessage: string): string => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as
      | { message?: string | string[]; error?: string }
      | undefined;

    if (Array.isArray(payload?.message) && payload.message.length > 0) {
      return payload.message.join(', ');
    }

    if (typeof payload?.message === 'string' && payload.message.trim()) {
      return payload.message;
    }

    if (typeof payload?.error === 'string' && payload.error.trim()) {
      return payload.error;
    }

    if (error.response?.status) {
      return `${defaultMessage} (HTTP ${error.response.status})`;
    }

    return defaultMessage;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return defaultMessage;
};
