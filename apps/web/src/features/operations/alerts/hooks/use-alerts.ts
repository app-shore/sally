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

export function useAlertById(alertId: string) {
  return useQuery({
    queryKey: [...ALERTS_QUERY_KEY, alertId],
    queryFn: () => alertsApi.getById(alertId),
    enabled: !!alertId,
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => alertsApi.acknowledge(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY });
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => alertsApi.resolve(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY });
    },
  });
}
