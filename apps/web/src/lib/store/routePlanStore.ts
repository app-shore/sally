/**
 * Zustand store for route planning state
 */

import { create } from 'zustand';
import type { RoutePlan, StopInput, DriverStateInput, VehicleStateInput } from '../types/routePlan';

interface RoutePlanStore {
  // Current route plan
  currentPlan: RoutePlan | null;
  isLoading: boolean;
  error: string | null;

  // Input data
  stops: StopInput[];
  driverState: DriverStateInput | null;
  vehicleState: VehicleStateInput | null;
  optimizationPriority: 'minimize_time' | 'minimize_cost' | 'balance';

  // Actions
  setCurrentPlan: (plan: RoutePlan | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Stops management
  addStop: (stop: StopInput) => void;
  removeStop: (stopId: string) => void;
  updateStop: (stopId: string, updates: Partial<StopInput>) => void;
  reorderStops: (fromIndex: number, toIndex: number) => void;
  setStops: (stops: StopInput[]) => void;

  // Driver/Vehicle state
  setDriverState: (state: DriverStateInput) => void;
  setVehicleState: (state: VehicleStateInput) => void;
  setOptimizationPriority: (priority: 'minimize_time' | 'minimize_cost' | 'balance') => void;

  // Reset
  reset: () => void;
}

export const useRoutePlanStore = create<RoutePlanStore>((set) => ({
  // Initial state
  currentPlan: null,
  isLoading: false,
  error: null,
  stops: [],
  driverState: null,
  vehicleState: null,
  optimizationPriority: 'minimize_time',

  // Actions
  setCurrentPlan: (plan) => set({ currentPlan: plan }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // Stops management
  addStop: (stop) => set((state) => ({ stops: [...state.stops, stop] })),

  removeStop: (stopId) => set((state) => ({
    stops: state.stops.filter((s) => s.stop_id !== stopId),
  })),

  updateStop: (stopId, updates) => set((state) => ({
    stops: state.stops.map((s) => (s.stop_id === stopId ? { ...s, ...updates } : s)),
  })),

  reorderStops: (fromIndex, toIndex) => set((state) => {
    const newStops = [...state.stops];
    const [removed] = newStops.splice(fromIndex, 1);
    newStops.splice(toIndex, 0, removed);
    return { stops: newStops };
  }),

  setStops: (stops) => set({ stops }),

  // Driver/Vehicle state
  setDriverState: (driverState) => set({ driverState }),
  setVehicleState: (vehicleState) => set({ vehicleState }),
  setOptimizationPriority: (priority) => set({ optimizationPriority: priority }),

  // Reset
  reset: () => set({
    currentPlan: null,
    isLoading: false,
    error: null,
    stops: [],
    driverState: null,
    vehicleState: null,
    optimizationPriority: 'minimize_time',
  }),
}));
