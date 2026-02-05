/**
 * @deprecated This file is deprecated. Import from '@/features/platform/feature-flags' instead.
 * This re-export is provided for backwards compatibility during migration.
 */

export {
  featureFlagsApi,
  fetchAllFeatureFlags,
  fetchFeatureFlag,
  checkFeatureEnabled,
  updateFeatureFlag,
} from '@/features/platform/feature-flags/api';

export type {
  FeatureFlag,
  FeatureFlagsResponse,
  FeatureFlagEnabledResponse,
} from '@/features/platform/feature-flags/types';
