import { apiClient } from '@/shared/lib/api';
import type { CustomerLoad } from './types';

export const customerApi = {
  getMyLoads: async (): Promise<CustomerLoad[]> => {
    return apiClient<CustomerLoad[]>('/customer/loads');
  },
  getLoad: async (loadId: string): Promise<CustomerLoad> => {
    return apiClient<CustomerLoad>(`/customer/loads/${loadId}`);
  },
  requestLoad: async (data: {
    pickup_address: string;
    pickup_city: string;
    pickup_state: string;
    pickup_date?: string;
    delivery_address: string;
    delivery_city: string;
    delivery_state: string;
    delivery_date?: string;
    weight_lbs: number;
    equipment_type?: string;
    commodity_type?: string;
    notes?: string;
  }): Promise<any> => {
    return apiClient('/customer/loads/request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
