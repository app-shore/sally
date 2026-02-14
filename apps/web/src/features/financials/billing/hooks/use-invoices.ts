import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/use-toast';
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
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ loadId, options }: { loadId: string; options?: { payment_terms_days?: number; notes?: string } }) =>
      invoicesApi.generateFromLoad(loadId, options),
    onSuccess: () => { qc.invalidateQueries({ queryKey: INVOICES_KEY }); },
    onError: (error: Error) => { toast({ title: 'Failed to generate invoice', description: error.message, variant: 'destructive' }); },
  });
}

export function useSendInvoice() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (invoiceId: string) => invoicesApi.send(invoiceId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: INVOICES_KEY }); },
    onError: (error: Error) => { toast({ title: 'Failed to send invoice', description: error.message, variant: 'destructive' }); },
  });
}

export function useVoidInvoice() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (invoiceId: string) => invoicesApi.void(invoiceId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: INVOICES_KEY }); },
    onError: (error: Error) => { toast({ title: 'Failed to void invoice', description: error.message, variant: 'destructive' }); },
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: { amount_cents: number; payment_method?: string; reference_number?: string; payment_date: string; notes?: string } }) =>
      invoicesApi.recordPayment(invoiceId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: INVOICES_KEY }); },
    onError: (error: Error) => { toast({ title: 'Failed to record payment', description: error.message, variant: 'destructive' }); },
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: { payment_terms_days?: number; notes?: string; internal_notes?: string; adjustment_cents?: number } }) =>
      invoicesApi.update(invoiceId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: INVOICES_KEY }); },
    onError: (error: Error) => { toast({ title: 'Failed to update invoice', description: error.message, variant: 'destructive' }); },
  });
}
