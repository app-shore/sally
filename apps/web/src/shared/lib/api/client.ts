/**
 * API client with JWT authentication and automatic token refresh
 */

import { useAuthStore } from '@/stores/auth-store';

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
  // Get token from authStore directly (not a React hook, so use store access)
  const authState = useAuthStore.getState();
  const accessToken = authState.accessToken;

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

  // Handle 401 (token expired) - redirect to login
  // Firebase handles token refresh automatically, so if we get 401, session is invalid
  if (response.status === 401) {
    const authState = useAuthStore.getState();
    await authState.signOut();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new ApiError(401, 'Session expired. Please login again.');
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
