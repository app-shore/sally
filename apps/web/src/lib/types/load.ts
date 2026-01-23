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
  status: "pending" | "planned" | "active" | "completed" | "cancelled";
  weight_lbs: number;
  commodity_type: "general" | "hazmat" | "refrigerated" | "fragile";
  special_requirements?: string;
  customer_name: string;
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
}

export interface LoadStopCreate {
  stop_id: string;
  sequence_order: number;
  action_type: "pickup" | "delivery" | "both";
  earliest_arrival?: string;
  latest_arrival?: string;
  estimated_dock_hours: number;
}

export interface LoadCreate {
  load_number: string;
  weight_lbs: number;
  commodity_type: string;
  special_requirements?: string;
  customer_name: string;
  stops: LoadStopCreate[];
}
