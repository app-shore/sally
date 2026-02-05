import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driversApi } from '../api';
import type { Driver, CreateDriverRequest, UpdateDriverRequest } from '../types';

const DRIVERS_QUERY_KEY = ['drivers'] as const;

export function useDrivers() {
  return useQuery({
    queryKey: DRIVERS_QUERY_KEY,
    queryFn: () => driversApi.list(),
  });
}

export function useDriverById(driverId: string) {
  return useQuery({
    queryKey: [...DRIVERS_QUERY_KEY, driverId],
    queryFn: () => driversApi.getById(driverId),
    enabled: !!driverId,
  });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDriverRequest) => driversApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DRIVERS_QUERY_KEY });
    },
  });
}

export function useUpdateDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ driverId, data }: { driverId: string; data: UpdateDriverRequest }) =>
      driversApi.update(driverId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: DRIVERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...DRIVERS_QUERY_KEY, variables.driverId] });
    },
  });
}

export function useDeleteDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (driverId: string) => driversApi.delete(driverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DRIVERS_QUERY_KEY });
    },
  });
}

export function useDriverHOS(driverId: string) {
  return useQuery({
    queryKey: [...DRIVERS_QUERY_KEY, driverId, 'hos'],
    queryFn: () => driversApi.getHOS(driverId),
    enabled: !!driverId,
    refetchInterval: 60000, // Refetch every minute for live HOS data
  });
}
