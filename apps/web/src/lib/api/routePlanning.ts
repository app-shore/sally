/**
 * API client for route planning endpoints
 */

import type { RoutePlan, RoutePlanningRequest, RouteUpdateRequest } from '../types/routePlan';
import type { TriggerInput, SimulationResult } from '../types/trigger';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class RoutePlanningAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = 'RoutePlanningAPIError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new RoutePlanningAPIError(
      error.detail || `HTTP ${response.status}`,
      response.status,
      error
    );
  }
  return response.json();
}

/**
 * Optimize route with multiple stops
 */
export async function optimizeRoute(request: RoutePlanningRequest): Promise<RoutePlan> {
  const response = await fetch(`${API_BASE_URL}/route-planning/optimize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  return handleResponse<RoutePlan>(response);
}

/**
 * Update route dynamically
 */
export async function updateRoute(request: RouteUpdateRequest): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/route-planning/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  return handleResponse<any>(response);
}

/**
 * Get current route status for a driver
 */
export async function getRouteStatus(driverId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/route-planning/status/${driverId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return handleResponse<any>(response);
}

/**
 * Simulate triggers on a route plan
 */
export async function simulateTriggers(
  planId: string,
  triggers: TriggerInput[]
): Promise<SimulationResult> {
  const response = await fetch(`${API_BASE_URL}/route-planning/simulate-triggers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan_id: planId,
      triggers,
    }),
  });

  return handleResponse<SimulationResult>(response);
}
