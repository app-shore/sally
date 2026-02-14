import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/use-toast';
import { payStructuresApi } from '../api';
import type { PayStructureType } from '../types';

const PAY_STRUCTURE_KEY = ['pay-structures'] as const;

export function usePayStructure(driverId: string) {
  return useQuery({
    queryKey: [...PAY_STRUCTURE_KEY, driverId],
    queryFn: () => payStructuresApi.getByDriverId(driverId),
    enabled: !!driverId,
  });
}

export function useUpsertPayStructure() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ driverId, data }: {
      driverId: string;
      data: {
        type: PayStructureType;
        rate_per_mile_cents?: number;
        percentage?: number;
        flat_rate_cents?: number;
        hybrid_base_cents?: number;
        hybrid_percent?: number;
        effective_date: string;
        notes?: string;
      };
    }) => payStructuresApi.upsert(driverId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: PAY_STRUCTURE_KEY }); },
    onError: (error: Error) => { toast({ title: 'Failed to save pay structure', description: error.message, variant: 'destructive' }); },
  });
}
