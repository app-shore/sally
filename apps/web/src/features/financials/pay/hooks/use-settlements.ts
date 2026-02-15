import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/use-toast';
import { settlementsApi } from '../api';

const SETTLEMENTS_KEY = ['settlements'] as const;

export function useSettlements(params?: { status?: string; driver_id?: string }) {
  return useQuery({
    queryKey: [...SETTLEMENTS_KEY, params],
    queryFn: () => settlementsApi.list(params),
  });
}

export function useSettlementById(settlementId: string) {
  return useQuery({
    queryKey: [...SETTLEMENTS_KEY, settlementId],
    queryFn: () => settlementsApi.getById(settlementId),
    enabled: !!settlementId,
  });
}

export function useSettlementSummary() {
  return useQuery({
    queryKey: [...SETTLEMENTS_KEY, 'summary'],
    queryFn: () => settlementsApi.getSummary(),
  });
}

export function useCalculateSettlement() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: { driver_id: string; period_start: string; period_end: string; preview?: boolean }) =>
      settlementsApi.calculate(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: SETTLEMENTS_KEY }); },
    onError: (error: Error) => { toast({ title: 'Failed to calculate settlement', description: error.message, variant: 'destructive' }); },
  });
}

export function useApproveSettlement() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (settlementId: string) => settlementsApi.approve(settlementId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: SETTLEMENTS_KEY }); },
    onError: (error: Error) => { toast({ title: 'Failed to approve settlement', description: error.message, variant: 'destructive' }); },
  });
}

export function useMarkSettlementPaid() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (settlementId: string) => settlementsApi.markPaid(settlementId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: SETTLEMENTS_KEY }); },
    onError: (error: Error) => { toast({ title: 'Failed to mark settlement as paid', description: error.message, variant: 'destructive' }); },
  });
}

export function useVoidSettlement() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (settlementId: string) => settlementsApi.void(settlementId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: SETTLEMENTS_KEY }); },
    onError: (error: Error) => { toast({ title: 'Failed to void settlement', description: error.message, variant: 'destructive' }); },
  });
}

export function useAddDeduction() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ settlementId, data }: { settlementId: string; data: { type: string; description: string; amount_cents: number } }) =>
      settlementsApi.addDeduction(settlementId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: SETTLEMENTS_KEY }); },
    onError: (error: Error) => { toast({ title: 'Failed to add deduction', description: error.message, variant: 'destructive' }); },
  });
}

export function useRemoveDeduction() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ settlementId, deductionId }: { settlementId: string; deductionId: number }) =>
      settlementsApi.removeDeduction(settlementId, deductionId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: SETTLEMENTS_KEY }); },
    onError: (error: Error) => { toast({ title: 'Failed to remove deduction', description: error.message, variant: 'destructive' }); },
  });
}
