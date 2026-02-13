import { apiClient } from '@/shared/lib/api';
import type { Invoice, InvoiceSummary } from './types';

export const invoicesApi = {
  list: async (params?: { status?: string; customer_id?: number; overdue_only?: boolean; limit?: number; offset?: number }): Promise<Invoice[]> => {
    const qp = new URLSearchParams();
    if (params?.status) qp.set('status', params.status);
    if (params?.customer_id) qp.set('customer_id', String(params.customer_id));
    if (params?.overdue_only) qp.set('overdue_only', 'true');
    if (params?.limit) qp.set('limit', String(params.limit));
    if (params?.offset) qp.set('offset', String(params.offset));
    const qs = qp.toString();
    return apiClient<Invoice[]>(qs ? `/invoices/?${qs}` : '/invoices/');
  },

  getById: async (invoiceId: string): Promise<Invoice> => {
    return apiClient<Invoice>(`/invoices/${invoiceId}`);
  },

  generateFromLoad: async (loadId: string, options?: { payment_terms_days?: number; notes?: string }): Promise<Invoice> => {
    return apiClient<Invoice>(`/invoices/generate/${loadId}`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
  },

  update: async (invoiceId: string, data: any): Promise<Invoice> => {
    return apiClient<Invoice>(`/invoices/${invoiceId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  send: async (invoiceId: string): Promise<Invoice> => {
    return apiClient<Invoice>(`/invoices/${invoiceId}/send`, { method: 'POST' });
  },

  void: async (invoiceId: string): Promise<Invoice> => {
    return apiClient<Invoice>(`/invoices/${invoiceId}/void`, { method: 'POST' });
  },

  recordPayment: async (invoiceId: string, data: { amount_cents: number; payment_method?: string; reference_number?: string; payment_date: string; notes?: string }): Promise<any> => {
    return apiClient(`/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getSummary: async (): Promise<InvoiceSummary> => {
    return apiClient<InvoiceSummary>('/invoices/summary');
  },
};
