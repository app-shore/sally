import { apiClient } from '@/shared/lib/api';
import type { Customer, CustomerCreate, CustomerInvite, CustomerInviteResponse } from './types';

export const customersApi = {
  list: async (): Promise<Customer[]> => apiClient<Customer[]>('/customers/'),
  getById: async (id: string): Promise<Customer> => apiClient<Customer>(`/customers/${id}`),
  create: async (data: CustomerCreate): Promise<Customer> =>
    apiClient<Customer>('/customers/', { method: 'POST', body: JSON.stringify(data) }),
  update: async (id: string, data: Partial<CustomerCreate>): Promise<Customer> =>
    apiClient<Customer>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  invite: async (customerId: string, data: CustomerInvite): Promise<CustomerInviteResponse> =>
    apiClient<CustomerInviteResponse>(`/customers/${customerId}/invite`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
