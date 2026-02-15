/**
 * API client functions for loads
 */

import { apiClient } from '@/shared/lib/api';
import { useAuthStore } from '@/features/auth';
import type { Load, LoadListItem, LoadCreate } from './types';
import type { ParseRateconResponse } from './types/ratecon';

export const loadsApi = {
  list: async (params?: {
    status?: string;
    customer_name?: string;
    limit?: number;
    offset?: number;
  }): Promise<LoadListItem[]> => {
    const queryParams = new URLSearchParams();

    if (params) {
      if (params.status) queryParams.set('status', params.status);
      if (params.customer_name) queryParams.set('customer_name', params.customer_name);
      if (params.limit) queryParams.set('limit', params.limit.toString());
      if (params.offset) queryParams.set('offset', params.offset.toString());
    }

    const queryString = queryParams.toString();
    const url = queryString ? `/loads/?${queryString}` : '/loads/';

    return apiClient<LoadListItem[]>(url);
  },

  getById: async (loadId: string): Promise<Load> => {
    return apiClient<Load>(`/loads/${loadId}`);
  },

  create: async (data: LoadCreate): Promise<Load> => {
    return apiClient<Load>('/loads/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateStatus: async (loadId: string, status: string): Promise<Load> => {
    return apiClient<Load>(`/loads/${loadId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  duplicate: async (loadId: string): Promise<Load> => {
    return apiClient<Load>(`/loads/${loadId}/duplicate`, { method: 'POST' });
  },

  generateTrackingToken: async (loadId: string): Promise<{ tracking_token: string; tracking_url: string }> => {
    return apiClient(`/loads/${loadId}/tracking-token`, { method: 'POST' });
  },

  parseRatecon: async (file: File): Promise<ParseRateconResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const token = useAuthStore.getState().accessToken;

    const response = await fetch(`${baseUrl}/ai/documents/parse-ratecon`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to parse file' }));
      throw new Error(error.detail || error.message || 'Failed to parse rate confirmation');
    }

    return response.json();
  },
};

// Re-export legacy functions for backwards compatibility during migration
export const getLoads = loadsApi.list;
export const getLoad = loadsApi.getById;
export const createLoad = loadsApi.create;
