import { apiClient } from '@/shared/lib/api';
import type { Vehicle, CreateVehicleRequest, UpdateVehicleRequest } from './types';

export const vehiclesApi = {
  list: async (): Promise<Vehicle[]> => {
    return apiClient<Vehicle[]>('/vehicles');
  },

  getById: async (vehicleId: string): Promise<Vehicle> => {
    return apiClient<Vehicle>(`/vehicles/${vehicleId}`);
  },

  create: async (data: CreateVehicleRequest): Promise<Vehicle> => {
    return apiClient<Vehicle>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (vehicleId: string, data: UpdateVehicleRequest): Promise<Vehicle> => {
    return apiClient<Vehicle>(`/vehicles/${vehicleId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (vehicleId: string): Promise<void> => {
    return apiClient<void>(`/vehicles/${vehicleId}`, {
      method: 'DELETE',
    });
  },
};

// Re-export legacy functions for backwards compatibility during migration
export const listVehicles = vehiclesApi.list;
export const getVehicle = vehiclesApi.getById;
export const createVehicle = vehiclesApi.create;
export const updateVehicle = vehiclesApi.update;
export const deleteVehicle = vehiclesApi.delete;
