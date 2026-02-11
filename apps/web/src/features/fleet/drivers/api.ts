import { apiClient } from '@/shared/lib/api';
import type { Driver, CreateDriverRequest, UpdateDriverRequest, DriverHOS, ActivateAndInviteResponse } from './types';

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
   */
  getHOS: async (driverId: string): Promise<DriverHOS> => {
    return apiClient(`/api/v1/drivers/${driverId}/hos`, {
      method: 'GET',
    });
  },

  /**
   * Activate a driver AND send SALLY invitation in one step
   */
  activateAndInvite: async (driverId: string, email?: string): Promise<ActivateAndInviteResponse> => {
    return apiClient<ActivateAndInviteResponse>(`/drivers/${driverId}/activate-and-invite`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Get pending activation drivers
   */
  getPending: async (): Promise<any[]> => {
    return apiClient<any[]>('/drivers/pending/list');
  },

  /**
   * Get inactive drivers
   */
  getInactive: async (): Promise<any[]> => {
    return apiClient<any[]>('/drivers/inactive/list');
  },

  /**
   * Activate a pending driver (fleet activation only, no SALLY invite)
   */
  activate: async (driverId: string): Promise<any> => {
    return apiClient(`/drivers/${driverId}/activate`, { method: 'POST' });
  },

  /**
   * Deactivate a driver
   */
  deactivate: async (driverId: string, reason?: string): Promise<any> => {
    return apiClient(`/drivers/${driverId}/deactivate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Reactivate an inactive driver
   */
  reactivate: async (driverId: string): Promise<any> => {
    return apiClient(`/drivers/${driverId}/reactivate`, { method: 'POST' });
  },
};

// Re-export legacy functions for backwards compatibility during migration
export const listDrivers = driversApi.list;
export const getDriver = driversApi.getById;
export const createDriver = driversApi.create;
export const updateDriver = driversApi.update;
export const deleteDriver = driversApi.delete;
export const getDriverHOS = driversApi.getHOS;
