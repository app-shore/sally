import { useEffect, useCallback } from 'react';
import { useFeatureFlagsStore, isCacheStale } from '@/stores/featureFlagsStore';
import { fetchAllFeatureFlags } from '@/lib/api/featureFlags';

/**
 * Hook to fetch and manage feature flags
 * Automatically fetches on mount if cache is stale
 * Returns flags, loading state, error, and refetch function
 */
export function useFeatureFlags() {
  const { flags, isLoading, error, setFlags, setLoading, setError } = useFeatureFlagsStore();

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedFlags = await fetchAllFeatureFlags();
      setFlags(fetchedFlags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch feature flags');
    } finally {
      setLoading(false);
    }
  }, [setFlags, setLoading, setError]);

  useEffect(() => {
    // Only fetch if cache is stale or empty
    if (isCacheStale() || flags.length === 0) {
      fetchFlags();
    }
  }, [flags.length, fetchFlags]);

  return {
    flags,
    isLoading,
    error,
    refetch: fetchFlags,
  };
}

/**
 * Hook to check if a specific feature is enabled
 * @param key - The feature flag key
 * @returns boolean indicating if the feature is enabled
 */
export function useFeatureFlag(key: string): boolean {
  const isEnabled = useFeatureFlagsStore((state) => state.isEnabled(key));
  const { flags } = useFeatureFlags(); // Ensure flags are loaded

  return isEnabled;
}

/**
 * Hook to get a specific feature flag by key
 * @param key - The feature flag key
 * @returns The feature flag object or undefined
 */
export function useFeatureFlagDetails(key: string) {
  const getFlag = useFeatureFlagsStore((state) => state.getFlag(key));
  const { flags } = useFeatureFlags(); // Ensure flags are loaded

  return getFlag;
}

/**
 * Hook to get all feature flags for a specific category
 * @param category - The category to filter by
 * @returns Array of feature flags
 */
export function useFeatureFlagsByCategory(category: string) {
  const getFlagsByCategory = useFeatureFlagsStore((state) => state.getFlagsByCategory(category));
  const { flags } = useFeatureFlags(); // Ensure flags are loaded

  return getFlagsByCategory;
}
