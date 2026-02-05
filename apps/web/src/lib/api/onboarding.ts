import { apiClient } from '@/shared/lib/api';

export interface OnboardingItem {
  id: string;
  title: string;
  complete: boolean;
  metadata: Record<string, any>;
}

export interface OnboardingStatusResponse {
  overallProgress: number;
  criticalComplete: boolean;
  recommendedComplete: boolean;
  optionalComplete: boolean;
  items: {
    critical: OnboardingItem[];
    recommended: OnboardingItem[];
    optional: OnboardingItem[];
  };
}

export async function getOnboardingStatus(): Promise<OnboardingStatusResponse> {
  return apiClient<OnboardingStatusResponse>('/onboarding/status');
}
