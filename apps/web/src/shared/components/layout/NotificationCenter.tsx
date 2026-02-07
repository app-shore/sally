'use client';

import { Bell, Truck, Users, Link2, MessageSquare, X, Check, Settings } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Separator } from '@/shared/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import {
  useNotifications,
  useNotificationCount,
  useMarkAsRead,
  useDismissNotification,
  useMarkAllRead,
} from '@/features/operations/notifications';
import type { Notification } from '@/features/operations/notifications';

function getNotificationIcon(iconType: string | null) {
  switch (iconType) {
    case 'route':
      return <Truck className="h-4 w-4 text-muted-foreground" />;
    case 'user':
    case 'team':
      return <Users className="h-4 w-4 text-muted-foreground" />;
    case 'integration':
      return <Link2 className="h-4 w-4 text-muted-foreground" />;
    case 'message':
      return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

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
  return `${diffDays}d ago`;
}

function getCategoryBadge(category: string | null) {
  if (!category) return null;
  const labels: Record<string, string> = {
    SYSTEM: 'System',
    TEAM: 'Team',
    OPERATIONS: 'Operations',
    COMMUNICATIONS: 'Comms',
  };
  return (
    <Badge variant="outline" className="text-xs">
      {labels[category] || category}
    </Badge>
  );
}

export function NotificationCenter() {
  const { data: countData } = useNotificationCount();
  const { data: notifications = [], isLoading } = useNotifications({ status: 'unread', limit: 10 });
  const markAsReadMutation = useMarkAsRead();
  const dismissMutation = useDismissNotification();
  const markAllReadMutation = useMarkAllRead();

  const unreadCount = countData?.unread ?? 0;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.readAt) {
      markAsReadMutation.mutate(notification.notificationId);
    }
    if (notification.actionUrl && typeof window !== 'undefined') {
      window.location.href = notification.actionUrl;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="View notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 bg-foreground text-background text-xs rounded-full flex items-center justify-center font-semibold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => markAllReadMutation.mutate(undefined)}
              disabled={markAllReadMutation.isPending}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark All Read
            </Button>
          )}
        </div>

        {/* Notification List */}
        <ScrollArea className="max-h-80">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.notificationId}
                  className="flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors group"
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* Unread indicator */}
                  <div className="mt-1.5 flex-shrink-0">
                    {!notification.readAt ? (
                      <div className="h-2 w-2 rounded-full bg-foreground" />
                    ) : (
                      <div className="h-2 w-2" />
                    )}
                  </div>

                  {/* Icon */}
                  <div className="mt-0.5 flex-shrink-0">
                    {getNotificationIcon(notification.iconType)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {notification.title && (
                        <p className="text-sm font-medium text-foreground truncate">
                          {notification.title}
                        </p>
                      )}
                      {getCategoryBadge(notification.category)}
                    </div>
                    {notification.message && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                  </div>

                  {/* Dismiss */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissMutation.mutate(notification.notificationId);
                    }}
                    aria-label="Dismiss notification"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2 flex justify-center">
              <Button variant="ghost" size="sm" className="text-xs w-full">
                View All Notifications
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default NotificationCenter;
