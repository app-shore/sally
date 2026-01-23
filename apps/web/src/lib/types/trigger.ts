/**
 * Trigger types for route plan simulation
 */

export type TriggerType =
  | "dock_time_change"
  | "traffic_delay"
  | "driver_rest_request"
  | "fuel_price_spike"
  | "appointment_change"
  | "hos_violation";

export interface TriggerInput {
  trigger_type: TriggerType;
  segment_id?: string;
  data: Record<string, unknown>;
}

export interface TriggerImpact {
  type: TriggerType;
  segment?: string;
  description: string;
  eta_change_hours: number;
}

export interface ImpactSummary {
  total_eta_change_hours: number;
  rest_stops_added: number;
  fuel_stops_added: number;
  compliance_issues: string[];
  trigger_impacts: TriggerImpact[];
}

export interface SimulationResult {
  previous_plan_version: number;
  new_plan_version: number;
  new_plan_id: string;
  triggers_applied: number;
  impact_summary: ImpactSummary;
  replan_triggered: boolean;
  replan_reason?: string;
}

// Trigger form data types
export interface DockTimeChangeData {
  estimated_dock_hours: number;
  actual_dock_hours: number;
}

export interface TrafficDelayData {
  delay_minutes: number;
}

export interface DriverRestRequestData {
  location: string;
  reason: string;
}

export interface FuelPriceSpikeData {
  station: string;
  old_price: number;
  new_price: number;
}

export interface AppointmentChangeData {
  old_appointment: string;
  new_appointment: string;
}

export interface HosViolationData {
  violation_type: string;
}
