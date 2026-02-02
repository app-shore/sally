import type { FeatureFlag } from '../store/featureFlagsStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface FeatureFlagsResponse {
  flags: FeatureFlag[];
}

export interface FeatureFlagEnabledResponse {
  key: string;
  enabled: boolean;
}

/**
 * Fetch all feature flags
 */
export async function fetchAllFeatureFlags(): Promise<FeatureFlag[]> {
  const response = await fetch(`${API_BASE_URL}/feature-flags`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch feature flags: ${response.statusText}`);
  }

  const data: FeatureFlagsResponse = await response.json();
  return data.flags;
}

/**
 * Fetch a specific feature flag by key
 */
export async function fetchFeatureFlag(key: string): Promise<FeatureFlag> {
  const response = await fetch(`${API_BASE_URL}/feature-flags/${key}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch feature flag '${key}': ${response.statusText}`);
  }

  return response.json();
}

/**
 * Check if a specific feature is enabled
 */
export async function checkFeatureEnabled(key: string): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/feature-flags/${key}/enabled`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to check feature '${key}': ${response.statusText}`);
  }

  const data: FeatureFlagEnabledResponse = await response.json();
  return data.enabled;
}
