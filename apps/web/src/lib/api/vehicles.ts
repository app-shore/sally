import { apiClient } from './client';

export interface Vehicle {
  id: string;
  unit_number: string;
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  fuel_capacity_gallons: number;
  current_fuel_gallons?: number;
  mpg?: number;
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

export async function listVehicles(): Promise<Vehicle[]> {
  return apiClient<Vehicle[]>('/vehicles');
}

export async function getVehicle(vehicleId: string): Promise<Vehicle> {
  return apiClient<Vehicle>(`/vehicles/${vehicleId}`);
}

export async function createVehicle(data: CreateVehicleRequest): Promise<Vehicle> {
  return apiClient<Vehicle>('/vehicles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateVehicle(vehicleId: string, data: UpdateVehicleRequest): Promise<Vehicle> {
  return apiClient<Vehicle>(`/vehicles/${vehicleId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteVehicle(vehicleId: string): Promise<void> {
  return apiClient<void>(`/vehicles/${vehicleId}`, {
    method: 'DELETE',
  });
}
