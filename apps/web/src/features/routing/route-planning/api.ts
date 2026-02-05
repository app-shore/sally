/**
 * API client for route planning endpoints
 */

import { apiClient } from '@/shared/lib/api';
import type {
  RoutePlan,
  RoutePlanningRequest,
  RouteUpdateRequest,
  RouteUpdateResponse,
  RouteStatusResponse,
  TriggerInput,
  SimulationResult,
} from './types';

export const routePlanningApi = {
  /**
   * Optimize route with multiple stops
   */
  optimize: async (request: RoutePlanningRequest): Promise<RoutePlan> => {
    return apiClient<RoutePlan>('/route-planning/optimize', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * Update route dynamically
   */
  update: async (request: RouteUpdateRequest): Promise<RouteUpdateResponse> => {
    return apiClient<RouteUpdateResponse>('/route-planning/update', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * Get current route status for a driver
   */
  getStatus: async (driverId: string): Promise<RouteStatusResponse> => {
    return apiClient<RouteStatusResponse>(`/route-planning/status/${driverId}`);
  },

  /**
   * Simulate triggers on a route plan
   */
  simulateTriggers: async (planId: string, triggers: TriggerInput[]): Promise<SimulationResult> => {
    return apiClient<SimulationResult>('/route-planning/simulate-triggers', {
      method: 'POST',
      body: JSON.stringify({
        plan_id: planId,
        triggers,
      }),
    });
  },
};

// Re-export legacy functions for backwards compatibility during migration
export const optimizeRoute = routePlanningApi.optimize;
export const updateRoute = routePlanningApi.update;
export const getRouteStatus = routePlanningApi.getStatus;
export const simulateTriggers = routePlanningApi.simulateTriggers;
