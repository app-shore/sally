/**
 * React Query hook for running the optimization engine
 */

import { useMutation } from "@tanstack/react-query";
import { optimization } from "@/features/routing/optimization";
import { useEngineStore } from "@/features/routing/optimization";
import type { OptimizationResult } from "@/features/routing/optimization";

export function useEngineRun() {
  const { setResult, setLoading, setError, addToHistory } = useEngineStore();

  return useMutation({
    mutationFn: async (input: {
      driver_id: string;
      hours_driven: number;
      on_duty_time: number;
      hours_since_break: number;
      dock_duration_hours?: number;
      dock_location?: string;
      remaining_distance_miles?: number;
      destination?: string;
      appointment_time?: string;
      current_location?: string;
    }) => {
      setLoading(true);
      const result = await optimization.recommend(input);
      return { input, result };
    },
    onSuccess: ({ input, result }) => {
      setResult(result as OptimizationResult);
      addToHistory(input, result as OptimizationResult);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });
}
