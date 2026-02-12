/**
 * Route Planning API client
 * Endpoints: POST /routes/plan, GET /routes, GET /routes/:planId,
 *            POST /routes/:planId/activate, POST /routes/:planId/cancel
 */

import { apiClient } from '@/shared/lib/api';
import type {
  CreateRoutePlanRequest,
  RoutePlanResult,
  RoutePlanListResponse,
} from './types';

export const routePlanningApi = {
  /**
   * Plan a new route
   * POST /api/v1/routes/plan
   */
  plan: async (data: CreateRoutePlanRequest): Promise<RoutePlanResult> => {
    return apiClient<RoutePlanResult>('/routes/plan', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * List route plans with optional filters
   * GET /api/v1/routes
   */
  list: async (params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<RoutePlanListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set('status', params.status);
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());

    const queryString = queryParams.toString();
    const url = queryString ? `/routes?${queryString}` : '/routes';

    return apiClient<RoutePlanListResponse>(url);
  },

  /**
   * Get a specific route plan by planId
   * GET /api/v1/routes/:planId
   */
  getById: async (planId: string): Promise<RoutePlanResult> => {
    return apiClient<RoutePlanResult>(`/routes/${planId}`);
  },

  /**
   * Activate a route plan
   * POST /api/v1/routes/:planId/activate
   */
  activate: async (planId: string): Promise<RoutePlanResult> => {
    return apiClient<RoutePlanResult>(`/routes/${planId}/activate`, {
      method: 'POST',
    });
  },

  /**
   * Cancel a route plan
   * POST /api/v1/routes/:planId/cancel
   */
  cancel: async (planId: string): Promise<RoutePlanResult> => {
    return apiClient<RoutePlanResult>(`/routes/${planId}/cancel`, {
      method: 'POST',
    });
  },
};
