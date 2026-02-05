import { useMutation } from '@tanstack/react-query';
import { optimizationApi } from '../api';
import type { RestRecommendationRequest } from '../types';

export function useRestRecommendation() {
  return useMutation({
    mutationFn: (request: RestRecommendationRequest) => optimizationApi.recommend(request),
  });
}
