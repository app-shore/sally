/**
 * TypeScript types for route planning
 */

export interface DataSourceBadge {
  label: string;
  color: string;
  tooltip: string;
}

export interface StopInput {
  stop_id: string;
  name: string;
  city?: string;
  state?: string;
  action_type?: 'pickup' | 'delivery' | 'both';
  lat: number;
  lon: number;
  location_type: 'warehouse' | 'customer' | 'distribution_center' | 'truck_stop' | 'service_area' | 'fuel_station';
  is_origin?: boolean;
  is_destination?: boolean;
  earliest_arrival?: string;
  latest_arrival?: string;
  estimated_dock_hours?: number;
  customer_name?: string;
}

export interface DriverStateInput {
  hours_driven: number;
  on_duty_time: number;
  hours_since_break: number;
}

export interface VehicleStateInput {
  fuel_capacity_gallons: number;
  current_fuel_gallons: number;
  mpg: number;
}

export interface DriverPreferencesInput {
  preferred_rest_duration: 7 | 8 | 10;
  avoid_night_driving: boolean;
}

export interface RoutePlanningRequest {
  driver_id: string;
  vehicle_id: string;
  driver_state: DriverStateInput;
  vehicle_state: VehicleStateInput;
  stops: StopInput[];
  optimization_priority: 'minimize_time' | 'minimize_cost' | 'balance';
  driver_preferences?: DriverPreferencesInput;
}

export interface RouteSegment {
  sequence_order: number;
  segment_type: 'drive' | 'rest' | 'fuel' | 'dock';
  from_location?: string;
  to_location?: string;
  distance_miles?: number;
  drive_time_hours?: number;
  rest_type?: 'full_rest' | 'partial_rest' | 'break';
  rest_duration_hours?: number;
  rest_reason?: string;
  fuel_gallons?: number;
  fuel_cost_estimate?: number;
  fuel_station_name?: string;
  dock_duration_hours?: number;
  customer_name?: string;
  hos_state_after?: {
    hours_driven: number;
    on_duty_time: number;
    hours_since_break: number;
  };
  estimated_arrival?: string;
  estimated_departure?: string;
}

export interface ComplianceReport {
  max_drive_hours_used: number;
  max_duty_hours_used: number;
  breaks_required: number;
  breaks_planned: number;
  violations: string[];
}

export interface RestStopInfo {
  location: string;
  type: 'full_rest' | 'partial_rest' | 'break';
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
  estimated_completion?: string;
}

export interface PlanInputSnapshot {
  load_id?: string;
  load_number?: string;
  customer_name?: string;
  scenario_id?: string;
  scenario_name?: string;
  driver_id: string;
  vehicle_id: string;
  driver_state: DriverStateInput;
  vehicle_state: VehicleStateInput;
  stops_count: number;
  optimization_priority: string;
  generated_at: string;
}

export interface RoutePlan {
  plan_id: string;
  plan_version: number;
  is_feasible: boolean;
  feasibility_issues: string[];
  optimized_sequence: string[];
  segments: RouteSegment[];
  total_distance_miles: number;
  total_time_hours: number;
  total_cost_estimate: number;
  rest_stops: RestStopInfo[];
  fuel_stops: FuelStopInfo[];
  summary: RouteSummary;
  compliance_report: ComplianceReport;
  data_sources?: Record<string, DataSourceBadge>;
  input_snapshot?: PlanInputSnapshot;
}

export interface RouteUpdateRequest {
  plan_id: string;
  update_type: 'traffic_delay' | 'dock_time_change' | 'load_added' | 'load_cancelled' | 'driver_rest_request' | 'hos_violation';
  segment_id?: string;
  delay_minutes?: number;
  actual_dock_hours?: number;
  new_stop?: StopInput;
  cancelled_stop_id?: string;
  rest_location?: Record<string, any>;
  triggered_by: 'system' | 'driver' | 'dispatcher';
}

export interface RouteAlert {
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
}
