import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api';
import type { UserLookupRequest, LoginRequest } from '../types';

const AUTH_QUERY_KEY = ['auth'] as const;

export function useUserLookup() {
  return useMutation({
    mutationFn: (request: UserLookupRequest) => authApi.lookupUser(request),
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: LoginRequest) => authApi.login(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...AUTH_QUERY_KEY, 'profile'] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useProfile() {
  return useQuery({
    queryKey: [...AUTH_QUERY_KEY, 'profile'],
    queryFn: () => authApi.getProfile(),
    retry: false,
  });
}

export function useRefreshToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.refreshToken(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...AUTH_QUERY_KEY, 'profile'] });
    },
  });
}
