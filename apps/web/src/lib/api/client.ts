/**
 * API client with JWT authentication and automatic token refresh
 */

import { useSessionStore } from '@/lib/store/sessionStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiClient<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const { accessToken, refreshToken } = useSessionStore.getState();

  // Add Authorization header
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...options.headers,
  };

  let response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
    credentials: 'include', // Include httpOnly cookies
  });

  // Handle 401 (token expired) - try to refresh
  if (response.status === 401 && accessToken) {
    try {
      // Refresh access token
      await refreshToken();

      // Retry original request with new token
      const newToken = useSessionStore.getState().accessToken;
      response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
          ...headers,
          Authorization: `Bearer ${newToken}`,
        },
        credentials: 'include',
      });
    } catch (refreshError) {
      // Refresh failed - redirect to login
      useSessionStore.getState().logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      throw new ApiError(401, 'Session expired. Please login again.');
    }
  }

  // Handle other errors
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: `Request failed with status ${response.status}`,
    }));
    throw new ApiError(
      response.status,
      error.message || error.detail || 'Request failed',
      error
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Convenience methods
const apiMethods = {
  get: <T = any>(url: string, options?: RequestInit) =>
    apiClient<T>(url, { ...options, method: 'GET' }),

  post: <T = any>(url: string, data?: any, options?: RequestInit) =>
    apiClient<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = any>(url: string, data?: any, options?: RequestInit) =>
    apiClient<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = any>(url: string, options?: RequestInit) =>
    apiClient<T>(url, { ...options, method: 'DELETE' }),
};

// Import sub-modules
import { optimization, hosRules, prediction } from './optimization';

// Export combined API object
export const api = {
  ...apiMethods,
  optimization,
  hos: hosRules,
  prediction,
};
