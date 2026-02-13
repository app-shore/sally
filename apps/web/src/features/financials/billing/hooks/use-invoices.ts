import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '../api';

const INVOICES_KEY = ['invoices'] as const;

export function useInvoices(params?: { status?: string; customer_id?: number; overdue_only?: boolean }) {
  return useQuery({
    queryKey: [...INVOICES_KEY, params],
    queryFn: () => invoicesApi.list(params),
  });
}

export function useInvoiceById(invoiceId: string) {
  return useQuery({
    queryKey: [...INVOICES_KEY, invoiceId],
    queryFn: () => invoicesApi.getById(invoiceId),
    enabled: !!invoiceId,
  });
}

export function useInvoiceSummary() {
  return useQuery({
    queryKey: [...INVOICES_KEY, 'summary'],
    queryFn: () => invoicesApi.getSummary(),
  });
}

export function useGenerateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ loadId, options }: { loadId: string; options?: { payment_terms_days?: number; notes?: string } }) =>
      invoicesApi.generateFromLoad(loadId, options),
    onSuccess: () => { qc.invalidateQueries({ queryKey: INVOICES_KEY }); },
  });
}

export function useSendInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => invoicesApi.send(invoiceId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: INVOICES_KEY }); },
  });
}

export function useVoidInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => invoicesApi.void(invoiceId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: INVOICES_KEY }); },
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: { amount_cents: number; payment_method?: string; reference_number?: string; payment_date: string; notes?: string } }) =>
      invoicesApi.recordPayment(invoiceId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: INVOICES_KEY }); },
  });
}
