import { useQuery } from '@tanstack/react-query';
import { onboardingApi } from '../api';

const ONBOARDING_QUERY_KEY = ['onboarding'] as const;

export function useOnboardingStatus() {
  return useQuery({
    queryKey: [...ONBOARDING_QUERY_KEY, 'status'],
    queryFn: () => onboardingApi.getStatus(),
  });
}
