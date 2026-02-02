import { useFeatureFlag } from './useFeatureFlags';
import { useFeatureFlagsStore } from '../store/featureFlagsStore';

export interface FeatureGuardResult {
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook that combines feature flag checking with loading/error states
 * Useful for conditional rendering based on feature availability
 *
 * @param featureKey - The feature flag key to check
 * @returns Object with isEnabled, isLoading, and error properties
 *
 * @example
 * const { isEnabled, isLoading } = useFeatureGuard('route_planning_enabled');
 *
 * if (isLoading) return <Skeleton />;
 * if (!isEnabled) return <ComingSoonBanner />;
 * return <RoutePlanningPage />;
 */
export function useFeatureGuard(featureKey: string): FeatureGuardResult {
  const isEnabled = useFeatureFlag(featureKey);
  const isLoading = useFeatureFlagsStore((state) => state.isLoading);
  const error = useFeatureFlagsStore((state) => state.error);

  return {
    isEnabled,
    isLoading,
    error,
  };
}
