// API
export { vehiclesApi } from './api';

// Types
export type { Vehicle, CreateVehicleRequest, UpdateVehicleRequest } from './types';

// Hooks
export {
  useVehicles,
  useVehicleById,
  useCreateVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
} from './hooks/use-vehicles';
