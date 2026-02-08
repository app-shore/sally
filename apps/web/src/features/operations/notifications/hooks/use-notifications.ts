import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api';
import type { ListNotificationsParams } from '../types';

const NOTIFICATIONS_KEY = ['notifications'] as const;

export function useNotifications(params?: ListNotificationsParams) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, params],
    queryFn: () => notificationsApi.list(params),
  });
}

export function useNotificationCount() {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30000,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.markAsRead(notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export function useDismissNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.dismiss(notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (category?: string) => notificationsApi.markAllRead(category),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}
