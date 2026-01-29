const API_BASE_URL = 'http://localhost:8000';

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
  const response = await fetch(`${API_BASE_URL}/api/v1/vehicles`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to fetch vehicles' }));
    throw new Error(error.detail || 'Failed to fetch vehicles');
  }

  return response.json();
}

export async function getVehicle(vehicleId: string): Promise<Vehicle> {
  const response = await fetch(`${API_BASE_URL}/api/v1/vehicles/${vehicleId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to fetch vehicle' }));
    throw new Error(error.detail || 'Failed to fetch vehicle');
  }

  return response.json();
}

export async function createVehicle(data: CreateVehicleRequest): Promise<Vehicle> {
  const response = await fetch(`${API_BASE_URL}/api/v1/vehicles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to create vehicle' }));
    throw new Error(error.detail || 'Failed to create vehicle');
  }

  return response.json();
}

export async function updateVehicle(vehicleId: string, data: UpdateVehicleRequest): Promise<Vehicle> {
  const response = await fetch(`${API_BASE_URL}/api/v1/vehicles/${vehicleId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to update vehicle' }));
    throw new Error(error.detail || 'Failed to update vehicle');
  }

  return response.json();
}

export async function deleteVehicle(vehicleId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/vehicles/${vehicleId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to delete vehicle' }));
    throw new Error(error.detail || 'Failed to delete vehicle');
  }
}
