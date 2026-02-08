import { apiClient } from '@/shared/lib/api';
import type { Alert, AlertStats, ListAlertsParams, AlertNote } from './types';

export const alertsApi = {
  list: async (params?: ListAlertsParams): Promise<Alert[]> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
    }
    const query = queryParams.toString();
    return apiClient<Alert[]>(`/alerts${query ? `?${query}` : ''}`);
  },

  getById: async (alertId: string): Promise<Alert> => {
    return apiClient<Alert>(`/alerts/${alertId}`);
  },

  stats: async (): Promise<AlertStats> => {
    return apiClient<AlertStats>('/alerts/stats');
  },

  acknowledge: async (alertId: string): Promise<Alert> => {
    return apiClient<Alert>(`/alerts/${alertId}/acknowledge`, { method: 'POST' });
  },

  snooze: async (alertId: string, durationMinutes: number, note?: string): Promise<Alert> => {
    return apiClient<Alert>(`/alerts/${alertId}/snooze`, {
      method: 'POST',
      body: JSON.stringify({ durationMinutes, note }),
    });
  },

  resolve: async (alertId: string, resolutionNotes?: string): Promise<Alert> => {
    return apiClient<Alert>(`/alerts/${alertId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolutionNotes }),
    });
  },

  addNote: async (alertId: string, content: string): Promise<AlertNote> => {
    return apiClient<AlertNote>(`/alerts/${alertId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  bulkAcknowledge: async (alertIds: string[]): Promise<{ updated: number }> => {
    return apiClient('/alerts/bulk/acknowledge', {
      method: 'POST',
      body: JSON.stringify({ alertIds }),
    });
  },

  bulkResolve: async (alertIds: string[], resolutionNotes?: string): Promise<{ updated: number }> => {
    return apiClient('/alerts/bulk/resolve', {
      method: 'POST',
      body: JSON.stringify({ alertIds, resolutionNotes }),
    });
  },
};

// Legacy exports
export const listAlerts = alertsApi.list;
export const acknowledgeAlert = alertsApi.acknowledge;
export const resolveAlert = alertsApi.resolve;
