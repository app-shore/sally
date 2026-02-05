export interface FeatureFlag {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  category: string;
}

export interface FeatureFlagsResponse {
  flags: FeatureFlag[];
}

export interface FeatureFlagEnabledResponse {
  key: string;
  enabled: boolean;
}
