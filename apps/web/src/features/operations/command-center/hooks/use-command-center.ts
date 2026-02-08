import { useQuery } from '@tanstack/react-query';
import { commandCenterApi } from '../api';

const COMMAND_CENTER_KEY = ['command-center'] as const;

export function useCommandCenterOverview() {
  return useQuery({
    queryKey: [...COMMAND_CENTER_KEY, 'overview'],
    queryFn: () => commandCenterApi.getOverview(),
    refetchInterval: 30000, // Poll every 30 seconds
  });
}
