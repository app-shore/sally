import { apiClient } from '@/shared/lib/api';
import type { MonitoringStatus, RoutePlanUpdate } from './types';

export const monitoringApi = {
  getStatus: async (planId: string): Promise<MonitoringStatus> =>
    apiClient<MonitoringStatus>(`/routes/${planId}/monitoring`),

  getUpdates: async (planId: string): Promise<RoutePlanUpdate[]> =>
    apiClient<RoutePlanUpdate[]>(`/routes/${planId}/updates`),

  reportDockTime: async (planId: string, actualDockHours: number, notes?: string): Promise<{ status: string }> =>
    apiClient<{ status: string }>(`/routes/${planId}/events/dock-time`, {
      method: 'POST',
      body: JSON.stringify({ actualDockHours, notes }),
    }),

  reportDelay: async (planId: string, delayMinutes: number, reason: string): Promise<{ status: string }> =>
    apiClient<{ status: string }>(`/routes/${planId}/events/delay`, {
      method: 'POST',
      body: JSON.stringify({ delayMinutes, reason }),
    }),
};
