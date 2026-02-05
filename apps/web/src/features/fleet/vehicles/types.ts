export interface Vehicle {
  id: string;
  vehicle_id: string;  // The actual vehicle ID used in API calls
  unit_number: string;
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  fuel_capacity_gallons: number;
  current_fuel_gallons?: number;
  mpg?: number;
  external_vehicle_id?: string;
  external_source?: string;
  last_synced_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateVehicleRequest {
  unit_number: string;
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  fuel_capacity_gallons: number;
  current_fuel_gallons?: number;
  mpg?: number;
}

export interface UpdateVehicleRequest {
  unit_number?: string;
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  fuel_capacity_gallons?: number;
  current_fuel_gallons?: number;
  mpg?: number;
}
