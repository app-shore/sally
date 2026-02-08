// API
export {
  alertsApi,
  listAlerts,
  acknowledgeAlert,
  resolveAlert,
} from './api';

export { alertAnalyticsApi } from './api-analytics';

// Types
export type {
  AlertPriority,
  AlertStatus,
  AlertCategory,
  Alert,
  AlertNote,
  AlertStats,
  ListAlertsParams,
} from './types';

// Hooks
export {
  useAlerts,
  useAlertById,
  useAlertStats,
  useAcknowledgeAlert,
  useSnoozeAlert,
  useResolveAlert,
  useAddAlertNote,
  useBulkAcknowledge,
  useBulkResolve,
} from './hooks/use-alerts';

export {
  useAlertVolume,
  useResponseTimeTrend,
  useResolutionRates,
  useTopAlertTypes,
  useAlertHistory,
} from './hooks/use-alert-analytics';
