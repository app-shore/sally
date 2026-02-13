import { apiClient } from '@/shared/lib/api';
import type { Settlement, SettlementSummary, DriverPayStructure } from './types';

export const settlementsApi = {
  list: async (params?: { status?: string; driver_id?: string; limit?: number; offset?: number }): Promise<Settlement[]> => {
    const qp = new URLSearchParams();
    if (params?.status) qp.set('status', params.status);
    if (params?.driver_id) qp.set('driver_id', params.driver_id);
    if (params?.limit) qp.set('limit', String(params.limit));
    if (params?.offset) qp.set('offset', String(params.offset));
    const qs = qp.toString();
    return apiClient<Settlement[]>(qs ? `/settlements/?${qs}` : '/settlements/');
  },

  getById: async (settlementId: string): Promise<Settlement> => {
    return apiClient<Settlement>(`/settlements/${settlementId}`);
  },

  calculate: async (data: { driver_id: string; period_start: string; period_end: string; preview?: boolean }): Promise<any> => {
    return apiClient(`/settlements/calculate`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  addDeduction: async (settlementId: string, data: { type: string; description: string; amount_cents: number }): Promise<any> => {
    return apiClient(`/settlements/${settlementId}/deductions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  removeDeduction: async (settlementId: string, deductionId: number): Promise<void> => {
    await apiClient(`/settlements/${settlementId}/deductions/${deductionId}`, { method: 'DELETE' });
  },

  approve: async (settlementId: string): Promise<Settlement> => {
    return apiClient<Settlement>(`/settlements/${settlementId}/approve`, { method: 'POST' });
  },

  markPaid: async (settlementId: string): Promise<Settlement> => {
    return apiClient<Settlement>(`/settlements/${settlementId}/pay`, { method: 'POST' });
  },

  void: async (settlementId: string): Promise<Settlement> => {
    return apiClient<Settlement>(`/settlements/${settlementId}/void`, { method: 'POST' });
  },

  getSummary: async (): Promise<SettlementSummary> => {
    return apiClient<SettlementSummary>('/settlements/summary');
  },
};

export const payStructuresApi = {
  getByDriverId: async (driverId: string): Promise<DriverPayStructure | null> => {
    return apiClient<DriverPayStructure | null>(`/pay-structures/${driverId}`);
  },

  upsert: async (driverId: string, data: {
    type: string;
    rate_per_mile_cents?: number;
    percentage?: number;
    flat_rate_cents?: number;
    hybrid_base_cents?: number;
    hybrid_percent?: number;
    effective_date: string;
    notes?: string;
  }): Promise<DriverPayStructure> => {
    return apiClient<DriverPayStructure>(`/pay-structures/${driverId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};
