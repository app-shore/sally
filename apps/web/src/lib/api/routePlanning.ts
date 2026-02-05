/**
 * @deprecated This file is deprecated. Import from '@/features/routing/route-planning' instead.
 * This re-export is provided for backwards compatibility during migration.
 */

export {
  routePlanningApi,
  optimizeRoute,
  updateRoute,
  getRouteStatus,
  simulateTriggers,
} from '@/features/routing/route-planning/api';

export type {
  RoutePlan,
  RoutePlanningRequest,
  RouteUpdateRequest,
  RouteUpdateResponse,
  RouteStatusResponse,
} from '@/features/routing/route-planning/types';
