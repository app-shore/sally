import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { monitoringApi } from '../api';

const MONITORING_KEY = ['monitoring'] as const;

export function useMonitoringStatus(planId: string | undefined) {
  return useQuery({
    queryKey: [...MONITORING_KEY, planId],
    queryFn: () => monitoringApi.getStatus(planId!),
    enabled: !!planId,
    refetchInterval: 30000,
  });
}

export function useRouteUpdates(planId: string | undefined) {
  return useQuery({
    queryKey: [...MONITORING_KEY, planId, 'updates'],
    queryFn: () => monitoringApi.getUpdates(planId!),
    enabled: !!planId,
  });
}

export function useReportDockTime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { planId: string; actualDockHours: number; notes?: string }) =>
      monitoringApi.reportDockTime(params.planId, params.actualDockHours, params.notes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MONITORING_KEY }),
  });
}

export function useReportDelay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { planId: string; delayMinutes: number; reason: string }) =>
      monitoringApi.reportDelay(params.planId, params.delayMinutes, params.reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MONITORING_KEY }),
  });
}
