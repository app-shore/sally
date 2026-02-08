export type NotificationCategory = 'SYSTEM' | 'TEAM' | 'OPERATIONS' | 'COMMUNICATIONS';
export type NotificationStatus = 'unread' | 'read' | 'dismissed';

export interface Notification {
  id: number;
  notificationId: string;
  type: string;
  category: NotificationCategory | null;
  title: string | null;
  message: string | null;
  actionUrl: string | null;
  actionLabel: string | null;
  iconType: string | null;
  status: string;
  readAt: string | null;
  dismissedAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface NotificationCount {
  unread: number;
}

export interface ListNotificationsParams {
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
}
