/**
 * Zustand store for route planning state
 */

import { create } from 'zustand';
import type { RoutePlan, StopInput, DriverStateInput, VehicleStateInput } from '../types/routePlan';
import type { Scenario, ScenarioListItem } from '../types/scenario';
import type { Load, LoadListItem } from '../types/load';
import type { TriggerInput } from '../types/trigger';

interface RoutePlanStore {
  // Current route plan
  currentPlan: RoutePlan | null;
  isLoading: boolean;
  error: string | null;

  // Input data
  stops: StopInput[];
  driverId: string | null;
  vehicleId: string | null;
  driverState: DriverStateInput | null;
  vehicleState: VehicleStateInput | null;
  optimizationPriority: 'minimize_time' | 'minimize_cost' | 'balance';

  // TMS Integration
  selectedLoadId: string | null;
  setSelectedLoadId: (id: string | null) => void;

  // Auto-suggest state
  suggestedDriverId: string | null;
  setSuggestedDriverId: (id: string | null) => void;
  driverAssignedVehicleId: string | null;
  setDriverAssignedVehicleId: (id: string | null) => void;
  isVehicleOverridden: boolean;
  setVehicleOverridden: (overridden: boolean) => void;

  // Validation
  validationErrors: {
    load?: string;
    driver?: string;
    vehicle?: string;
  };
  isFormValid: boolean;
  validateForm: () => boolean;

  // Scenarios
  scenarios: ScenarioListItem[];
  selectedScenario: Scenario | null;

  // Loads
  loads: LoadListItem[];
  selectedLoad: Load | null;

  // Plan versions
  planVersions: RoutePlan[];
  currentVersion: number;

  // Simulation
  isSimulationMode: boolean;
  selectedTriggers: TriggerInput[];

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
  setDriverId: (id: string) => void;
  setVehicleId: (id: string) => void;
  setDriverState: (state: DriverStateInput) => void;
  setVehicleState: (state: VehicleStateInput) => void;
  setOptimizationPriority: (priority: 'minimize_time' | 'minimize_cost' | 'balance') => void;

  // Scenarios
  setScenarios: (scenarios: ScenarioListItem[]) => void;
  selectScenario: (scenario: Scenario | null) => void;

  // Loads
  setLoads: (loads: LoadListItem[]) => void;
  selectLoad: (load: Load | null) => void;

  // Plan versions
  addPlanVersion: (plan: RoutePlan) => void;
  setCurrentVersion: (version: number) => void;
  getPlanByVersion: (version: number) => RoutePlan | null;

  // Simulation
  enterSimulationMode: () => void;
  exitSimulationMode: () => void;
  addTrigger: (trigger: TriggerInput) => void;
  removeTrigger: (index: number) => void;
  clearTriggers: () => void;

  // Reset
  reset: () => void;
}

export const useRoutePlanStore = create<RoutePlanStore>((set, get) => ({
  // Initial state
  currentPlan: null,
  isLoading: false,
  error: null,
  stops: [],
  driverId: null,
  vehicleId: null,
  driverState: null,
  vehicleState: null,
  optimizationPriority: 'minimize_time',
  selectedLoadId: null,
  suggestedDriverId: null,
  driverAssignedVehicleId: null,
  isVehicleOverridden: false,
  validationErrors: {},
  isFormValid: false,
  scenarios: [],
  selectedScenario: null,
  loads: [],
  selectedLoad: null,
  planVersions: [],
  currentVersion: 1,
  isSimulationMode: false,
  selectedTriggers: [],

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
  setDriverId: (driverId) => set({ driverId }),
  setVehicleId: (vehicleId) => set({ vehicleId }),
  setDriverState: (driverState) => set({ driverState }),
  setVehicleState: (vehicleState) => set({ vehicleState }),
  setOptimizationPriority: (priority) => set({ optimizationPriority: priority }),

  // Scenarios
  setScenarios: (scenarios) => set({ scenarios }),
  selectScenario: (scenario) => set({ selectedScenario: scenario }),

  // Loads
  setLoads: (loads) => set({ loads }),
  selectLoad: (load) => set({ selectedLoad: load }),

  // Plan versions
  addPlanVersion: (plan) => set((state) => ({
    planVersions: [...state.planVersions, plan],
    currentPlan: plan,
    currentVersion: plan.plan_version || state.planVersions.length + 1,
  })),

  setCurrentVersion: (version) => {
    const plan = get().getPlanByVersion(version);
    if (plan) {
      set({ currentVersion: version, currentPlan: plan });
    }
  },

  getPlanByVersion: (version) => {
    const { planVersions } = get();
    return planVersions.find((p) => (p.plan_version || 1) === version) || null;
  },

  // Simulation
  enterSimulationMode: () => set({ isSimulationMode: true }),
  exitSimulationMode: () => set({ isSimulationMode: false, selectedTriggers: [] }),

  addTrigger: (trigger) => set((state) => ({
    selectedTriggers: [...state.selectedTriggers, trigger],
  })),

  removeTrigger: (index) => set((state) => ({
    selectedTriggers: state.selectedTriggers.filter((_, i) => i !== index),
  })),

  clearTriggers: () => set({ selectedTriggers: [] }),

  // TMS Integration
  setSelectedLoadId: (selectedLoadId) => set({ selectedLoadId }),

  // Auto-suggest
  setSuggestedDriverId: (suggestedDriverId) => set({ suggestedDriverId }),
  setDriverAssignedVehicleId: (driverAssignedVehicleId) => set({ driverAssignedVehicleId }),
  setVehicleOverridden: (isVehicleOverridden) => set({ isVehicleOverridden }),

  // Validation
  validateForm: () => {
    const state = get();
    const errors: Record<string, string> = {};

    if (!state.selectedLoadId) {
      errors.load = "Load is required";
    }

    if (!state.driverId) {
      errors.driver = "Driver is required";
    }

    if (!state.vehicleId) {
      errors.vehicle = "Vehicle is required";
    }

    if (!state.stops || state.stops.length < 2) {
      errors.load = "Load must have at least 2 stops";
    }

    const isValid = Object.keys(errors).length === 0;
    set({ validationErrors: errors, isFormValid: isValid });
    return isValid;
  },

  // Reset
  reset: () => set({
    currentPlan: null,
    isLoading: false,
    error: null,
    stops: [],
    driverState: null,
    vehicleState: null,
    optimizationPriority: 'minimize_time',
    selectedLoadId: null,
    suggestedDriverId: null,
    driverAssignedVehicleId: null,
    isVehicleOverridden: false,
    validationErrors: {},
    isFormValid: false,
    scenarios: [],
    selectedScenario: null,
    loads: [],
    selectedLoad: null,
    planVersions: [],
    currentVersion: 1,
    isSimulationMode: false,
    selectedTriggers: [],
  }),
}));
