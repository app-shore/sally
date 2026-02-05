import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loadsApi } from '../api';
import type { Load, LoadListItem, LoadCreate } from '../types';

const LOADS_QUERY_KEY = ['loads'] as const;

export function useLoads(params?: {
  status?: string;
  customer_name?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: [...LOADS_QUERY_KEY, params],
    queryFn: () => loadsApi.list(params),
  });
}

export function useLoadById(loadId: string) {
  return useQuery({
    queryKey: [...LOADS_QUERY_KEY, loadId],
    queryFn: () => loadsApi.getById(loadId),
    enabled: !!loadId,
  });
}

export function useCreateLoad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoadCreate) => loadsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOADS_QUERY_KEY });
    },
  });
}
