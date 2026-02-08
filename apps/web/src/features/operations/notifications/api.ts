import { apiClient } from '@/shared/lib/api';
import type { Notification, NotificationCount, ListNotificationsParams } from './types';

export const notificationsApi = {
  list: async (params?: ListNotificationsParams): Promise<Notification[]> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });
    }
    const query = queryParams.toString();
    return apiClient<Notification[]>(`/notifications${query ? `?${query}` : ''}`);
  },

  getUnreadCount: async (): Promise<NotificationCount> => {
    return apiClient<NotificationCount>('/notifications/count');
  },

  markAsRead: async (notificationId: string): Promise<Notification> => {
    return apiClient<Notification>(`/notifications/${notificationId}/read`, { method: 'POST' });
  },

  dismiss: async (notificationId: string): Promise<Notification> => {
    return apiClient<Notification>(`/notifications/${notificationId}/dismiss`, { method: 'POST' });
  },

  markAllRead: async (category?: string): Promise<{ updated: number }> => {
    return apiClient('/notifications/mark-all-read', {
      method: 'POST',
      body: JSON.stringify({ category }),
    });
  },

  dismissAllRead: async (): Promise<{ updated: number }> => {
    return apiClient('/notifications/dismiss-all-read', { method: 'POST' });
  },
};
