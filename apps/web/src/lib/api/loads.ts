/**
 * @deprecated This file is deprecated. Import from '@/features/fleet/loads' instead.
 * This re-export is provided for backwards compatibility during migration.
 */

export {
  loadsApi,
  getLoads,
  getLoad,
  createLoad,
} from '@/features/fleet/loads/api';

export type {
  Load,
  LoadListItem,
  LoadCreate,
  LoadStop,
  LoadStopCreate,
} from '@/features/fleet/loads/types';
