'use client';

import { Bell, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { PushOptIn } from '@/shared/components/PushOptIn';
import { DriverAlertCard } from './components/DriverAlertCard';
import { useAlerts, useAcknowledgeAlert } from '@/features/operations/alerts';
import {
  useNotifications,
  useNotificationCount,
  useMarkAsRead,
  useMarkAllRead,
} from '@/features/operations/notifications';
import type { Notification } from '@/features/operations/notifications';
import { useAuthStore } from '@/features/auth';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Check } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function NotificationItem({ notification, onMarkRead }: { notification: Notification; onMarkRead: (id: string) => void }) {
  return (
    <Card
      className={`${!notification.readAt ? 'border-l-2 border-l-foreground' : ''}`}
      onClick={() => {
        if (!notification.readAt) {
          onMarkRead(notification.notificationId);
        }
        if (notification.actionUrl && typeof window !== 'undefined') {
          window.location.href = notification.actionUrl;
        }
      }}
    >
      <CardContent className="p-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {notification.title && (
            <p className="text-sm font-medium text-foreground">{notification.title}</p>
          )}
          {notification.message && (
            <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
          )}
          <p className="text-xs text-muted-foreground/70 mt-1">
            {formatRelativeTime(notification.createdAt)}
          </p>
        </div>
        {!notification.readAt && (
          <div className="h-2.5 w-2.5 rounded-full bg-foreground flex-shrink-0 mt-1.5" />
        )}
      </CardContent>
    </Card>
  );
}

export default function DriverNotificationsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Driver-specific alerts
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts({
    driver_id: user?.userId,
    status: 'active',
  });
  const acknowledgeMutation = useAcknowledgeAlert();

  // Personal notifications
  const { data: notifications = [], isLoading: notifsLoading } = useNotifications({ limit: 30 });
  const { data: countData } = useNotificationCount();
  const markAsReadMutation = useMarkAsRead();
  const markAllReadMutation = useMarkAllRead();

  const unreadCount = countData?.unread ?? 0;

  // Sort alerts by priority (critical first)
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedAlerts = [...alerts].sort(
    (a, b) => (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4),
  );

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 md:h-6 md:w-6 text-foreground" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">{unreadCount} unread</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={handleRefresh} className="min-h-[44px] min-w-[44px]">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              onClick={() => markAllReadMutation.mutate(undefined)}
              disabled={markAllReadMutation.isPending}
            >
              <Check className="h-4 w-4 mr-1" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Push Opt-In */}
      <PushOptIn />

      {/* Active Alerts Section */}
      {sortedAlerts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Active Alerts</h2>
            <Badge variant="destructive" className="text-xs">{sortedAlerts.length}</Badge>
          </div>
          <div className="space-y-2">
            {sortedAlerts.map((alert) => (
              <DriverAlertCard
                key={alert.alert_id}
                alert={alert}
                onAcknowledge={(id) => acknowledgeMutation.mutate(id)}
              />
            ))}
          </div>
        </div>
      )}

      {alertsLoading && (
        <div className="flex items-center justify-center py-6">
          <p className="text-sm text-muted-foreground">Loading alerts...</p>
        </div>
      )}

      {/* Notifications Section */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Notifications</h2>
        {notifsLoading ? (
          <div className="flex items-center justify-center py-6">
            <p className="text-sm text-muted-foreground">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-2">
            <Bell className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(100vh-480px)]">
            <div className="space-y-2">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.notificationId}
                  notification={notification}
                  onMarkRead={(id) => markAsReadMutation.mutate(id)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
