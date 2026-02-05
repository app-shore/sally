import { apiClient } from '@/shared/lib/api';
import type {
  Alert,
  ListAlertsParams,
  AcknowledgeAlertResponse,
  ResolveAlertResponse,
} from './types';

export const alertsApi = {
  /**
   * List alerts with optional filters
   */
  list: async (params?: ListAlertsParams): Promise<Alert[]> => {
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value);
        }
      });
    }

    const query = queryParams.toString();
    const url = `/alerts${query ? `?${query}` : ''}`;

    return apiClient<Alert[]>(url);
  },

  /**
   * Get alert by ID
   */
  getById: async (alertId: string): Promise<Alert> => {
    return apiClient<Alert>(`/api/v1/alerts/${alertId}`);
  },

  /**
   * Acknowledge an alert
   */
  acknowledge: async (alertId: string): Promise<AcknowledgeAlertResponse> => {
    return apiClient<AcknowledgeAlertResponse>(`/api/v1/alerts/${alertId}/acknowledge`, {
      method: 'POST',
    });
  },

  /**
   * Resolve an alert
   */
  resolve: async (alertId: string): Promise<ResolveAlertResponse> => {
    return apiClient<ResolveAlertResponse>(`/api/v1/alerts/${alertId}/resolve`, {
      method: 'POST',
    });
  },
};

// Re-export legacy functions for backwards compatibility during migration
export const listAlerts = alertsApi.list;
export const getAlert = alertsApi.getById;
export const acknowledgeAlert = alertsApi.acknowledge;
export const resolveAlert = alertsApi.resolve;
