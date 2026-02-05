import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUserPreferences,
  updateUserPreferences,
  getOperationsSettings,
  updateOperationsSettings,
  getDriverPreferences,
  updateDriverPreferences,
  resetToDefaults,
} from '../api';
import type { UserPreferences, OperationsSettings, DriverPreferences } from '../api';

const PREFERENCES_QUERY_KEY = ['preferences'] as const;

export function useUserPreferences() {
  return useQuery({
    queryKey: [...PREFERENCES_QUERY_KEY, 'user'],
    queryFn: () => getUserPreferences(),
  });
}

export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<UserPreferences>) => updateUserPreferences(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...PREFERENCES_QUERY_KEY, 'user'] });
    },
  });
}

export function useOperationsSettings() {
  return useQuery({
    queryKey: [...PREFERENCES_QUERY_KEY, 'operations'],
    queryFn: () => getOperationsSettings(),
  });
}

export function useUpdateOperationsSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<OperationsSettings>) => updateOperationsSettings(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...PREFERENCES_QUERY_KEY, 'operations'] });
    },
  });
}

export function useDriverPreferences() {
  return useQuery({
    queryKey: [...PREFERENCES_QUERY_KEY, 'driver'],
    queryFn: () => getDriverPreferences(),
  });
}

export function useUpdateDriverPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<DriverPreferences>) => updateDriverPreferences(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...PREFERENCES_QUERY_KEY, 'driver'] });
    },
  });
}

export function useResetPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scope: 'user' | 'operations' | 'driver') => resetToDefaults(scope),
    onSuccess: (_, scope) => {
      queryClient.invalidateQueries({ queryKey: [...PREFERENCES_QUERY_KEY, scope] });
    },
  });
}
