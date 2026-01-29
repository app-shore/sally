/**
 * Custom hooks for route planning
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { optimizeRoute, simulateTriggers } from '@/lib/api/routePlanning';
import { getScenarios, getScenario, instantiateScenario } from '@/lib/api/scenarios';
import { getLoads, getLoad } from '@/lib/api/loads';
import { useRoutePlanStore } from '@/lib/store/routePlanStore';
import type { RoutePlanningRequest } from '@/lib/types/routePlan';
import type { TriggerInput } from '@/lib/types/trigger';

/**
 * Hook for route planning operations
 */
export function useRoutePlanning() {
  const {
    setCurrentPlan,
    setLoading,
    setError,
    addPlanVersion,
    selectedLoad,
    selectedScenario,
  } = useRoutePlanStore();

  const { mutate, isPending, data, error } = useMutation({
    mutationFn: (request: RoutePlanningRequest) => optimizeRoute(request),
    onMutate: () => {
      setLoading(true);
      setError(null);
    },
    onSuccess: (plan) => {
      // Create input snapshot to track what values were used for this plan
      const store = useRoutePlanStore.getState();
      const inputSnapshot = {
        load_id: store.selectedLoad?.load_id,
        load_number: store.selectedLoad?.load_number,
        customer_name: store.selectedLoad?.customer_name,
        scenario_id: store.selectedScenario?.scenario_id,
        scenario_name: store.selectedScenario?.name,
        driver_id: store.driverId!,
        vehicle_id: store.vehicleId!,
        driver_state: store.driverState!,
        vehicle_state: store.vehicleState!,
        stops_count: store.stops.length,
        optimization_priority: store.optimizationPriority,
        generated_at: new Date().toISOString(),
      };

      // Attach snapshot to plan
      const planWithSnapshot = {
        ...plan,
        input_snapshot: inputSnapshot,
      };

      setCurrentPlan(planWithSnapshot);
      addPlanVersion(planWithSnapshot);
      setLoading(false);
    },
    onError: (err: Error) => {
      setError(err.message);
      setLoading(false);
    },
  });

  return {
    optimizeRoute: mutate,
    isOptimizing: isPending,
    plan: data,
    error,
  };
}

/**
 * Hook for trigger simulation
 */
export function useTriggerSimulation() {
  const { addPlanVersion, setLoading, setError, clearTriggers, exitSimulationMode } =
    useRoutePlanStore();

  const { mutate, isPending, data, error } = useMutation({
    mutationFn: ({ planId, triggers }: { planId: string; triggers: TriggerInput[] }) =>
      simulateTriggers(planId, triggers),
    onMutate: () => {
      setLoading(true);
      setError(null);
    },
    onSuccess: (result) => {
      // The result contains the new plan ID, but we'd need to fetch the full plan
      // For now, we'll just update the version tracking
      setLoading(false);
      clearTriggers();
      exitSimulationMode();
    },
    onError: (err: Error) => {
      setError(err.message);
      setLoading(false);
    },
  });

  return {
    applyTriggers: mutate,
    isApplying: isPending,
    result: data,
    error,
  };
}

/**
 * Hook for loading scenarios
 */
export function useScenarios(category?: string) {
  const query = useQuery({
    queryKey: ['scenarios', category],
    queryFn: () => getScenarios(category),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return query;
}

/**
 * Hook for loading a specific scenario
 */
export function useScenario(scenarioId: string | null) {
  const query = useQuery({
    queryKey: ['scenario', scenarioId],
    queryFn: () => (scenarioId ? getScenario(scenarioId) : null),
    enabled: !!scenarioId,
    staleTime: 5 * 60 * 1000,
  });

  return query;
}

/**
 * Hook for instantiating a scenario
 * IMPORTANT: Scenarios provide driver/vehicle IDs and states, NOT stops
 * Stops always come from the selected load
 */
export function useInstantiateScenario() {
  const { setDriverId, setVehicleId, setDriverState, setVehicleState } = useRoutePlanStore();

  const { mutate, isPending, data, error } = useMutation({
    mutationFn: (scenarioId: string) => instantiateScenario(scenarioId),
    onSuccess: (response) => {
      // Populate driver/vehicle IDs and states (NO stops)
      // Stops come from the load, not the scenario
      if (response.driver_id) setDriverId(response.driver_id);
      if (response.vehicle_id) setVehicleId(response.vehicle_id);
      setDriverState(response.driver_state as any);
      setVehicleState(response.vehicle_state as any);
    },
  });

  return {
    instantiate: mutate,
    isInstantiating: isPending,
    response: data,
    error,
  };
}

/**
 * Hook for loading loads
 */
export function useLoads(params?: {
  status?: string;
  customer_name?: string;
  limit?: number;
  offset?: number;
}) {
  const query = useQuery({
    queryKey: ['loads', params],
    queryFn: () => getLoads(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return query;
}

/**
 * Hook for loading a specific load
 */
export function useLoad(loadId: string | null) {
  const query = useQuery({
    queryKey: ['load', loadId],
    queryFn: () => (loadId ? getLoad(loadId) : null),
    enabled: !!loadId,
    staleTime: 2 * 60 * 1000,
  });

  return query;
}
