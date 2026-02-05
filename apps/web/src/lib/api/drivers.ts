/**
 * @deprecated This file is deprecated. Import from '@/features/fleet/drivers' instead.
 * This re-export is provided for backwards compatibility during migration.
 */

export {
  driversApi,
  listDrivers,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
  getDriverHOS,
} from '@/features/fleet/drivers/api';

export type {
  Driver,
  CreateDriverRequest,
  UpdateDriverRequest,
  DriverHOS,
} from '@/features/fleet/drivers/types';
