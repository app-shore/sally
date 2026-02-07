import { apiClient } from '@/shared/lib/api';

export interface VolumeData {
  byCategory: { category: string; count: number }[];
  byPriority: { priority: string; count: number }[];
}

export interface ResponseTimeEntry {
  date: string;
  avgResponseMinutes: number;
  alertCount: number;
}

export interface ResolutionData {
  total: number;
  resolved: number;
  autoResolved: number;
  escalated: number;
  resolutionRate: number;
  escalationRate: number;
}

export interface TopAlertType {
  alertType: string;
  count: number;
}

export interface HistoryResult {
  items: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const alertAnalyticsApi = {
  getVolume: async (days = 7) =>
    apiClient<VolumeData>(`/alerts/analytics/volume?days=${days}`),

  getResponseTime: async (days = 7) =>
    apiClient<ResponseTimeEntry[]>(`/alerts/analytics/response-time?days=${days}`),

  getResolution: async (days = 7) =>
    apiClient<ResolutionData>(`/alerts/analytics/resolution?days=${days}`),

  getTopTypes: async (days = 7) =>
    apiClient<TopAlertType[]>(`/alerts/analytics/top-types?days=${days}`),

  getHistory: async (params: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return apiClient<HistoryResult>(`/alerts/history?${query}`);
  },
};
