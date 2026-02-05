/**
 * @deprecated This file is deprecated. Import from '@/features/fleet/vehicles' instead.
 * This re-export is provided for backwards compatibility during migration.
 */

export {
  vehiclesApi,
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from '@/features/fleet/vehicles/api';

export type {
  Vehicle,
  CreateVehicleRequest,
  UpdateVehicleRequest,
} from '@/features/fleet/vehicles/types';
