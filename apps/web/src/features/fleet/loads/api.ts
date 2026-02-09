/**
 * API client functions for loads
 */

import { apiClient } from '@/shared/lib/api';
import type { Load, LoadListItem, LoadCreate } from './types';

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
};

// Re-export legacy functions for backwards compatibility during migration
export const getLoads = loadsApi.list;
export const getLoad = loadsApi.getById;
export const createLoad = loadsApi.create;
