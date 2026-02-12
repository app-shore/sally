/**
 * Load and LoadStop types for freight shipments
 */

export interface LoadStop {
  id: number;
  stop_id: number;
  sequence_order: number;
  action_type: "pickup" | "delivery" | "both";
  earliest_arrival?: string;
  latest_arrival?: string;
  estimated_dock_hours: number;
  actual_dock_hours?: number;

  // Stop details (joined from stops table)
  stop_name?: string;
  stop_city?: string;
  stop_state?: string;
  stop_address?: string;
}

export interface Load {
  id: number;
  load_id: string;
  load_number: string;
  status: "draft" | "pending" | "assigned" | "in_transit" | "delivered" | "cancelled";
  weight_lbs: number;
  commodity_type: string;
  equipment_type?: string;
  special_requirements?: string;
  customer_name: string;
  customer_id?: number;
  intake_source: string;
  tracking_token?: string;
  driver_id?: number;
  vehicle_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Relationships
  stops: LoadStop[];
}

export interface LoadListItem {
  id: number;
  load_id: string;
  load_number: string;
  status: string;
  customer_name: string;
  stop_count: number;
  weight_lbs: number;
  commodity_type: string;
  equipment_type?: string;
  intake_source?: string;
  external_load_id?: string;
  external_source?: string;
  last_synced_at?: string;
}

export interface LoadStopCreate {
  stop_id: string;
  sequence_order: number;
  action_type: "pickup" | "delivery" | "both";
  earliest_arrival?: string;
  latest_arrival?: string;
  estimated_dock_hours: number;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
}

export interface LoadCreate {
  load_number: string;
  weight_lbs: number;
  commodity_type: string;
  equipment_type?: string;
  special_requirements?: string;
  customer_name: string;
  customer_id?: number;
  intake_source?: string;
  status?: string;
  stops: LoadStopCreate[];
}
