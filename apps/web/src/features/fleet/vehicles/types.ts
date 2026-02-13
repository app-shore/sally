export type VehicleStatus = 'AVAILABLE' | 'ASSIGNED' | 'IN_SHOP' | 'OUT_OF_SERVICE';

export type EquipmentType = 'DRY_VAN' | 'FLATBED' | 'REEFER' | 'STEP_DECK' | 'POWER_ONLY' | 'OTHER';

export interface Vehicle {
  id: string;
  vehicle_id: string;
  unit_number: string;
  vin: string;
  equipment_type: EquipmentType;
  status: VehicleStatus;
  make?: string;
  model?: string;
  year?: number;
  license_plate?: string;
  license_plate_state?: string;
  has_sleeper_berth?: boolean;
  gross_weight_lbs?: number;
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
  vin: string;
  equipment_type: EquipmentType;
  fuel_capacity_gallons: number;
  mpg?: number;
  status?: VehicleStatus;
  make?: string;
  model?: string;
  year?: number;
  license_plate?: string;
  license_plate_state?: string;
  has_sleeper_berth?: boolean;
  gross_weight_lbs?: number;
  current_fuel_gallons?: number;
}

export interface UpdateVehicleRequest {
  unit_number?: string;
  vin?: string;
  equipment_type?: EquipmentType;
  fuel_capacity_gallons?: number;
  mpg?: number;
  status?: VehicleStatus;
  make?: string;
  model?: string;
  year?: number;
  license_plate?: string;
  license_plate_state?: string;
  has_sleeper_berth?: boolean;
  gross_weight_lbs?: number;
  current_fuel_gallons?: number;
}
