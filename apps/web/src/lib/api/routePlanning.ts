/**
 * API client for route planning endpoints
 */

import { apiClient } from '@/shared/lib/api';
import type {
  RoutePlan,
  RoutePlanningRequest,
  RouteUpdateRequest,
  RouteUpdateResponse,
  RouteStatusResponse
} from '@/lib/types/routePlan';
import type { TriggerInput, SimulationResult } from '@/lib/types/trigger';

/**
 * Optimize route with multiple stops
 */
export async function optimizeRoute(request: RoutePlanningRequest): Promise<RoutePlan> {
  return apiClient<RoutePlan>('/route-planning/optimize', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Update route dynamically
 */
export async function updateRoute(request: RouteUpdateRequest): Promise<RouteUpdateResponse> {
  return apiClient<RouteUpdateResponse>('/route-planning/update', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Get current route status for a driver
 */
export async function getRouteStatus(driverId: string): Promise<RouteStatusResponse> {
  return apiClient<RouteStatusResponse>(`/route-planning/status/${driverId}`);
}

/**
 * Simulate triggers on a route plan
 */
export async function simulateTriggers(
  planId: string,
  triggers: TriggerInput[]
): Promise<SimulationResult> {
  return apiClient<SimulationResult>('/route-planning/simulate-triggers', {
    method: 'POST',
    body: JSON.stringify({
      plan_id: planId,
      triggers,
    }),
  });
}
