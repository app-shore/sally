import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { featureFlagsApi } from '../api';

const FEATURE_FLAGS_QUERY_KEY = ['feature-flags'] as const;

export function useFeatureFlags() {
  return useQuery({
    queryKey: FEATURE_FLAGS_QUERY_KEY,
    queryFn: () => featureFlagsApi.list(),
  });
}

export function useFeatureFlag(key: string) {
  return useQuery({
    queryKey: [...FEATURE_FLAGS_QUERY_KEY, key],
    queryFn: () => featureFlagsApi.getByKey(key),
    enabled: !!key,
  });
}

export function useFeatureFlagEnabled(key: string) {
  return useQuery({
    queryKey: [...FEATURE_FLAGS_QUERY_KEY, key, 'enabled'],
    queryFn: () => featureFlagsApi.isEnabled(key),
    enabled: !!key,
  });
}

export function useUpdateFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      featureFlagsApi.update(key, enabled),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: FEATURE_FLAGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...FEATURE_FLAGS_QUERY_KEY, variables.key] });
    },
  });
}
