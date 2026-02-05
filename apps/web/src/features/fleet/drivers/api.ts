import { apiClient } from '@/shared/lib/api';
import type { Driver, CreateDriverRequest, UpdateDriverRequest, DriverHOS } from './types';

export const driversApi = {
  list: async (): Promise<Driver[]> => {
    return apiClient<Driver[]>('/drivers');
  },

  getById: async (driverId: string): Promise<Driver> => {
    return apiClient<Driver>(`/drivers/${driverId}`);
  },

  create: async (data: CreateDriverRequest): Promise<Driver> => {
    return apiClient<Driver>('/drivers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (driverId: string, data: UpdateDriverRequest): Promise<Driver> => {
    return apiClient<Driver>(`/drivers/${driverId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (driverId: string): Promise<void> => {
    return apiClient<void>(`/drivers/${driverId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Fetch live HOS data for a driver from external integration
   * Falls back to cached data if integration is unavailable
   */
  getHOS: async (driverId: string): Promise<DriverHOS> => {
    return apiClient(`/api/v1/drivers/${driverId}/hos`, {
      method: 'GET',
    });
  },
};

// Re-export legacy functions for backwards compatibility during migration
export const listDrivers = driversApi.list;
export const getDriver = driversApi.getById;
export const createDriver = driversApi.create;
export const updateDriver = driversApi.update;
export const deleteDriver = driversApi.delete;
export const getDriverHOS = driversApi.getHOS;
