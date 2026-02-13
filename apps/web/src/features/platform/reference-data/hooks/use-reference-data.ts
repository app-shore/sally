import { useQuery } from '@tanstack/react-query';
import { referenceDataApi } from '../api';
import type { ReferenceDataMap } from '../types';

const REFERENCE_DATA_KEY = ['reference-data'] as const;

export function useReferenceData(categories?: string | string[]) {
  const categoryList = categories
    ? Array.isArray(categories)
      ? categories
      : [categories]
    : undefined;

  return useQuery<ReferenceDataMap>({
    queryKey: [...REFERENCE_DATA_KEY, categoryList?.sort().join(',') ?? 'all'],
    queryFn: () => referenceDataApi.get(categoryList),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
