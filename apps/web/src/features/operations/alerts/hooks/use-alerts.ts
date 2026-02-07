import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '../api';
import type { ListAlertsParams } from '../types';

const ALERTS_QUERY_KEY = ['alerts'] as const;

export function useAlerts(params?: ListAlertsParams) {
  return useQuery({
    queryKey: [...ALERTS_QUERY_KEY, params],
    queryFn: () => alertsApi.list(params),
  });
}

export function useAlertById(alertId: string | undefined) {
  return useQuery({
    queryKey: [...ALERTS_QUERY_KEY, alertId],
    queryFn: () => alertsApi.getById(alertId!),
    enabled: !!alertId,
  });
}

export function useAlertStats() {
  return useQuery({
    queryKey: [...ALERTS_QUERY_KEY, 'stats'],
    queryFn: () => alertsApi.stats(),
    refetchInterval: 30000,
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => alertsApi.acknowledge(alertId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY }),
  });
}

export function useSnoozeAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ alertId, durationMinutes, note }: { alertId: string; durationMinutes: number; note?: string }) =>
      alertsApi.snooze(alertId, durationMinutes, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY }),
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ alertId, resolutionNotes }: { alertId: string; resolutionNotes?: string }) =>
      alertsApi.resolve(alertId, resolutionNotes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY }),
  });
}

export function useAddAlertNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ alertId, content }: { alertId: string; content: string }) =>
      alertsApi.addNote(alertId, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY }),
  });
}

export function useBulkAcknowledge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertIds: string[]) => alertsApi.bulkAcknowledge(alertIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY }),
  });
}

export function useBulkResolve() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ alertIds, resolutionNotes }: { alertIds: string[]; resolutionNotes?: string }) =>
      alertsApi.bulkResolve(alertIds, resolutionNotes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY }),
  });
}
