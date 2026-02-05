import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { routePlanningApi } from '../api';
import type { RoutePlanningRequest, RouteUpdateRequest, TriggerInput } from '../types';

const ROUTE_PLANNING_QUERY_KEY = ['route-planning'] as const;

export function useRouteStatus(driverId: string) {
  return useQuery({
    queryKey: [...ROUTE_PLANNING_QUERY_KEY, 'status', driverId],
    queryFn: () => routePlanningApi.getStatus(driverId),
    enabled: !!driverId,
  });
}

export function useOptimizeRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RoutePlanningRequest) => routePlanningApi.optimize(request),
    onSuccess: (data) => {
      // Invalidate route status for the driver
      if (data.driver_id) {
        queryClient.invalidateQueries({
          queryKey: [...ROUTE_PLANNING_QUERY_KEY, 'status', data.driver_id],
        });
      }
    },
  });
}

export function useUpdateRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RouteUpdateRequest) => routePlanningApi.update(request),
    onSuccess: (_, variables) => {
      // Invalidate route status
      queryClient.invalidateQueries({
        queryKey: [...ROUTE_PLANNING_QUERY_KEY, 'status', variables.driver_id],
      });
    },
  });
}

export function useSimulateTriggers() {
  return useMutation({
    mutationFn: ({ planId, triggers }: { planId: string; triggers: TriggerInput[] }) =>
      routePlanningApi.simulateTriggers(planId, triggers),
  });
}
