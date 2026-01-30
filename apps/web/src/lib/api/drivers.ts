import { apiClient } from './client';

export interface Driver {
  id: string;
  name: string;
  license_number: string;
  phone?: string;
  email?: string;
  current_hos?: {
    drive_remaining: number;
    shift_remaining: number;
    cycle_remaining: number;
    break_required: boolean;
  };
  // External sync metadata
  external_driver_id?: string;
  external_source?: string;
  hos_data_source?: string;
  hos_data_synced_at?: string;
  hos_manual_override?: boolean;
  last_synced_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateDriverRequest {
  name: string;
  license_number: string;
  phone?: string;
  email?: string;
}

export interface UpdateDriverRequest {
  name?: string;
  license_number?: string;
  phone?: string;
  email?: string;
}

export async function listDrivers(): Promise<Driver[]> {
  return apiClient<Driver[]>('/drivers');
}

export async function getDriver(driverId: string): Promise<Driver> {
  return apiClient<Driver>(`/drivers/${driverId}`);
}

export async function createDriver(data: CreateDriverRequest): Promise<Driver> {
  return apiClient<Driver>('/drivers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDriver(driverId: string, data: UpdateDriverRequest): Promise<Driver> {
  return apiClient<Driver>(`/drivers/${driverId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteDriver(driverId: string): Promise<void> {
  return apiClient<void>(`/drivers/${driverId}`, {
    method: 'DELETE',
  });
}

/**
 * Fetch live HOS data for a driver from external integration
 * Falls back to cached data if integration is unavailable
 */
export async function getDriverHOS(driverId: string): Promise<{
  driver_id: string;
  hours_driven: number;
  on_duty_time: number;
  hours_since_break: number;
  duty_status: string;
  last_updated: string;
  data_source: string;
  cached?: boolean;
  stale?: boolean;
  cache_age_seconds?: number;
}> {
  return apiClient(`/api/v1/drivers/${driverId}/hos`, {
    method: 'GET',
  });
}
