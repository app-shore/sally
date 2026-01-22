/**
 * Driver-related TypeScript types
 */

export interface DriverInput {
  driver_id: string;
  hours_driven: number;
  on_duty_time: number;
  hours_since_break: number;
}

export interface RouteInput {
  remaining_distance_miles?: number;
  destination?: string;
  appointment_time?: string;
  current_location?: string;
}

export interface DockInput {
  dock_duration_hours?: number;
  dock_location?: string;
}

export interface EngineInput extends DriverInput, RouteInput, DockInput {}
