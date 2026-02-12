import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { routePlanningApi } from '../api';
import type { CreateRoutePlanRequest } from '../types';

const ROUTE_PLANS_KEY = ['route-plans'] as const;

/**
 * Mutation: Plan a new route
 * Invalidates route-plans list on success
 */
export function usePlanRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRoutePlanRequest) => routePlanningApi.plan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROUTE_PLANS_KEY });
    },
  });
}

/**
 * Query: List route plans
 */
export function useRoutePlans(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: [...ROUTE_PLANS_KEY, params],
    queryFn: () => routePlanningApi.list(params),
  });
}

/**
 * Query: Get a specific route plan
 */
export function useRoutePlan(planId: string | null) {
  return useQuery({
    queryKey: [...ROUTE_PLANS_KEY, planId],
    queryFn: () => routePlanningApi.getById(planId!),
    enabled: !!planId,
  });
}

/**
 * Mutation: Activate a route plan
 */
export function useActivateRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) => routePlanningApi.activate(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROUTE_PLANS_KEY });
    },
  });
}

/**
 * Mutation: Cancel a route plan
 */
export function useCancelRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) => routePlanningApi.cancel(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROUTE_PLANS_KEY });
    },
  });
}
