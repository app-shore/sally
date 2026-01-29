import { z } from 'zod';

export const StopInputSchema = z.object({
  stop_id: z.string().min(1),
  name: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  location_type: z.enum(['warehouse', 'customer', 'distribution_center', 'truck_stop', 'service_area', 'fuel_station']),
  is_origin: z.boolean().default(false),
  is_destination: z.boolean().default(false),
  earliest_arrival: z.string().optional(),
  latest_arrival: z.string().optional(),
  estimated_dock_hours: z.number().min(0).default(0.0),
  customer_name: z.string().optional(),
});

export type StopInput = z.infer<typeof StopInputSchema>;

export const DriverStateInputSchema = z.object({
  hours_driven: z.number().min(0).max(11),
  on_duty_time: z.number().min(0).max(14),
  hours_since_break: z.number().min(0).max(8),
});

export type DriverStateInput = z.infer<typeof DriverStateInputSchema>;

export const VehicleStateInputSchema = z.object({
  fuel_capacity_gallons: z.number().positive(),
  current_fuel_gallons: z.number().min(0),
  mpg: z.number().positive(),
});

export type VehicleStateInput = z.infer<typeof VehicleStateInputSchema>;

export const RoutePlanningRequestSchema = z.object({
  driver_id: z.string().min(1),
  vehicle_id: z.string().min(1),
  driver_state: DriverStateInputSchema,
  vehicle_state: VehicleStateInputSchema,
  stops: z.array(StopInputSchema).min(2),
  optimization_priority: z.enum(['minimize_time', 'minimize_cost', 'balance']).default('minimize_time'),
  driver_preferences: z.object({
    preferred_rest_duration: z.number().min(7).max(10).default(10),
    avoid_night_driving: z.boolean().default(false),
  }).optional(),
});

export type RoutePlanningRequest = z.infer<typeof RoutePlanningRequestSchema>;

export const RouteUpdateRequestSchema = z.object({
  plan_id: z.string().min(1),
  update_type: z.enum(['traffic_delay', 'dock_time_change', 'load_added', 'load_cancelled', 'driver_rest_request', 'hos_violation']),
  update_data: z.record(z.unknown()).optional(),
  segment_id: z.string().optional(),
  delay_minutes: z.number().optional(),
  actual_dock_hours: z.number().optional(),
  new_stop: StopInputSchema.optional(),
  cancelled_stop_id: z.string().optional(),
  rest_location: z.record(z.unknown()).optional(),
  triggered_by: z.string().default('system'),
});

export type RouteUpdateRequest = z.infer<typeof RouteUpdateRequestSchema>;

export interface RouteSegmentResponse {
  sequence_order: number;
  segment_type: string;
  from_location: string | null;
  to_location: string | null;
  distance_miles: number | null;
  drive_time_hours: number | null;
  rest_type: string | null;
  rest_duration_hours: number | null;
  rest_reason: string | null;
  fuel_gallons: number | null;
  fuel_cost_estimate: number | null;
  fuel_station_name: string | null;
  dock_duration_hours: number | null;
  customer_name: string | null;
  hos_state_after: Record<string, number> | null;
  estimated_arrival: string | null;
  estimated_departure: string | null;
}

export interface ComplianceReportResponse {
  max_drive_hours_used: number;
  max_duty_hours_used: number;
  breaks_required: number;
  breaks_planned: number;
  violations: string[];
}

export interface RestStopInfo {
  location: string;
  type: string;
  duration_hours: number;
  reason: string;
}

export interface FuelStopInfo {
  location: string;
  gallons: number;
  cost: number;
}

export interface RouteSummary {
  total_driving_segments: number;
  total_rest_stops: number;
  total_fuel_stops: number;
  total_dock_stops: number;
  estimated_completion: string | null;
}

export interface RoutePlanningResponse {
  plan_id: string;
  plan_version: number;
  is_feasible: boolean;
  feasibility_issues: string[];
  optimized_sequence: string[];
  segments: RouteSegmentResponse[];
  total_distance_miles: number;
  total_time_hours: number;
  total_cost_estimate: number;
  rest_stops: RestStopInfo[];
  fuel_stops: FuelStopInfo[];
  summary: RouteSummary;
  compliance_report: ComplianceReportResponse;
  data_sources: Record<string, { label: string; color: string; tooltip: string }>;
}

export interface RouteUpdateResponse {
  update_id: string;
  plan_id: string;
  replan_triggered: boolean;
  new_plan?: RoutePlanningResponse;
  impact_summary: Record<string, unknown>;
}

export const TriggerInputSchema = z.object({
  trigger_type: z.string().min(1),
  segment_id: z.string().optional(),
  data: z.record(z.unknown()).default({}),
});

export type TriggerInput = z.infer<typeof TriggerInputSchema>;

export interface SimulationResult {
  previous_plan_version: number;
  new_plan_version: number;
  new_plan_id: string;
  triggers_applied: number;
  impact_summary: Record<string, unknown>;
  replan_triggered: boolean;
  replan_reason: string | null;
}
