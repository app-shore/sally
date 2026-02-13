// API
export {
  vehiclesApi,
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from './api';

// Types
export type { Vehicle, CreateVehicleRequest, UpdateVehicleRequest, VehicleStatus, EquipmentType } from './types';

// Hooks
export {
  useVehicles,
  useVehicleById,
  useCreateVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
} from './hooks/use-vehicles';
