// API
export { routePlanningApi } from './api';

// Types - Route Planning
export type {
  RoutePlan,
  RoutePlanningRequest,
  RouteUpdateRequest,
  RouteUpdateResponse,
  RouteStatusResponse,
  StopInput,
  DriverStateInput,
  VehicleStateInput,
  DriverPreferencesInput,
  RouteSegment,
  ComplianceReport,
  RestStopInfo,
  FuelStopInfo,
  RouteSummary,
  DataSourceBadge,
} from './types';

// Types - Triggers
export type {
  TriggerType,
  TriggerInput,
  TriggerImpact,
  ImpactSummary,
  SimulationResult,
  DockTimeChangeData,
  TrafficDelayData,
  DriverRestRequestData,
  FuelPriceSpikeData,
  AppointmentChangeData,
  HosViolationData,
} from './types';

// Hooks
export {
  useRouteStatus,
  useOptimizeRoute,
  useUpdateRoute,
  useSimulateTriggers,
} from './hooks/use-route-planning';

// Components
export { default as DriverStateInput } from './components/DriverStateInput';
export { default as LoadSourceSelector } from './components/LoadSourceSelector';
export { default as PlanInputSummary } from './components/PlanInputSummary';
export { default as RouteSummaryCard } from './components/RouteSummaryCard';
export { default as SimulationPanel } from './components/SimulationPanel';
export { default as StopsManager } from './components/StopsManager';
export { default as VehicleStateInput } from './components/VehicleStateInput';
export { default as VersionComparison } from './components/VersionComparison';
