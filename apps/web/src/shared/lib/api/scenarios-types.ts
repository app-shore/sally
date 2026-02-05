/**
 * Scenario types for testing and demonstration
 */

import type { DriverStateInput, VehicleStateInput } from '@/features/routing/route-planning';

export interface ScenarioListItem {
  id: string;
  scenario_id: string;  // Also expose as scenario_id for backwards compatibility
  name: string;
  category: string;
  description: string;
}

export interface Scenario extends ScenarioListItem {
  driver_state: DriverStateInput;
  vehicle_state: VehicleStateInput;
}

export interface ScenarioStateResponse {
  driver_id?: string;
  vehicle_id?: string;
  driver_state: DriverStateInput;
  vehicle_state: VehicleStateInput;
}
