'use client';

import { ReactNode } from 'react';
import { useFeatureGuard } from '@/lib/hooks/useFeatureGuard';
import { ComingSoonBanner } from './ComingSoonBanner';
import { comingSoonContent } from '@/lib/config/comingSoonContent';
import { useFeatureFlagsStore } from '@/stores/featureFlagsStore';

export interface FeatureGuardProps {
  featureKey: string;
  children: ReactNode;
  loadingFallback?: ReactNode;
}

/**
 * Component that conditionally renders children based on feature flag status
 * Shows coming soon banner if feature is disabled
 * Shows loading skeleton while fetching flags
 *
 * @example
 * <FeatureGuard featureKey="route_planning_enabled">
 *   <RoutePlanningPage />
 * </FeatureGuard>
 */
export function FeatureGuard({ featureKey, children, loadingFallback }: FeatureGuardProps) {
  const { isEnabled, isLoading, error } = useFeatureGuard(featureKey);
  const getFlag = useFeatureFlagsStore((state) => state.getFlag);

  // Show loading state
  if (isLoading) {
    if (loadingFallback) {
      return <>{loadingFallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground" />
      </div>
    );
  }

  // Show error state (but don't block access - fail open)
  if (error) {
    console.error(`Feature flag error for '${featureKey}':`, error);
    // Fail open: allow access if we can't check the flag
    return <>{children}</>;
  }

  // Feature is disabled - show coming soon banner
  if (!isEnabled) {
    const content = comingSoonContent[featureKey];
    const flag = getFlag(featureKey);

    if (!content) {
      console.warn(`No coming soon content found for feature key: ${featureKey}`);
      return (
        <ComingSoonBanner
          title={flag?.name || 'Coming Soon'}
          description={flag?.description || 'This feature is currently under development.'}
          category={flag?.category}
        />
      );
    }

    return (
      <ComingSoonBanner
        {...content}
        category={flag?.category}
      />
    );
  }

  // Feature is enabled - render children
  return <>{children}</>;
}
