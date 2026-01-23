/**
 * API client functions for vehicles
 */

export interface Vehicle {
  id: number;
  vehicle_id: string;
  unit_number: string;
  fuel_capacity_gallons: number | null;
  current_fuel_gallons: number | null;
  mpg: number | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function getVehicles(): Promise<Vehicle[]> {
  const url = new URL(`${API_BASE}/vehicles/`);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Failed to fetch vehicles: ${response.statusText}`);
  }

  return response.json();
}
