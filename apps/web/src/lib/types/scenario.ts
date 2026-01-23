/**
 * Scenario types for test scenario templates
 */

export interface DriverStateTemplate {
  hours_driven: number;
  on_duty_time: number;
  hours_since_break: number;
}

export interface VehicleStateTemplate {
  fuel_capacity: number;
  current_fuel: number;
  mpg: number;
}

export interface StopTemplate {
  name: string;
  city: string;
  state: string;
  action_type: "pickup" | "delivery" | "both";
  estimated_dock_hours: number;
  earliest_arrival?: string;
  latest_arrival?: string;
  distance_from_previous: number;
}

export interface Scenario {
  id: number;
  scenario_id: string;
  name: string;
  description: string;
  category: "simple" | "hos_constrained" | "fuel_constrained" | "complex";
  driver_state_template: DriverStateTemplate;
  vehicle_state_template: VehicleStateTemplate;
  stops_template: StopTemplate[];
  expected_rest_stops: number;
  expected_fuel_stops: number;
  expected_violations: string[];
  is_active: boolean;
  display_order: number;
}

export interface ScenarioListItem {
  id: number;
  scenario_id: string;
  name: string;
  description: string;
  category: string;
  expected_rest_stops: number;
  expected_fuel_stops: number;
  display_order: number;
}

/**
 * Response from scenario instantiation
 * Contains driver/vehicle IDs and states (no stops)
 * Stops always come from the selected load
 */
export interface ScenarioStateResponse {
  driver_id: string | null;
  vehicle_id: string | null;
  driver_state: DriverStateTemplate;
  vehicle_state: VehicleStateTemplate;
}
