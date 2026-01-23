/**
 * API client functions for drivers
 */

export interface Driver {
  id: number;
  driver_id: string;
  name: string;
  hours_driven_today: number;
  on_duty_time_today: number;
  hours_since_break: number;
  current_duty_status: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function getDrivers(status?: string): Promise<Driver[]> {
  const url = new URL(`${API_BASE}/drivers/`);
  if (status) {
    url.searchParams.set("status", status);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Failed to fetch drivers: ${response.statusText}`);
  }

  return response.json();
}
