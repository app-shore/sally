/**
 * @deprecated This file is deprecated. Import from '@/features/operations/alerts' instead.
 * This re-export is provided for backwards compatibility during migration.
 */

export {
  alertsApi,
  listAlerts,
  getAlert,
  acknowledgeAlert,
  resolveAlert,
} from '@/features/operations/alerts/api';

export type {
  AlertPriority,
  AlertStatus,
  AlertCategory,
  Alert,
  ListAlertsParams,
  AcknowledgeAlertResponse,
  ResolveAlertResponse,
} from '@/features/operations/alerts/types';
