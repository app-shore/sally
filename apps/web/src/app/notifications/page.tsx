'use client';

import { useState } from 'react';
import { Bell, Truck, Users, Link2, MessageSquare, Check, X, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import {
  useNotifications,
  useNotificationCount,
  useMarkAsRead,
  useDismissNotification,
  useMarkAllRead,
} from '@/features/operations/notifications';
import type { Notification } from '@/features/operations/notifications';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'SYSTEM', label: 'System' },
  { key: 'TEAM', label: 'Team' },
  { key: 'OPERATIONS', label: 'Operations' },
  { key: 'COMMUNICATIONS', label: 'Comms' },
];

function getNotificationIcon(iconType: string | null) {
  switch (iconType) {
    case 'route':
      return <Truck className="h-5 w-5 text-muted-foreground" />;
    case 'user':
    case 'team':
      return <Users className="h-5 w-5 text-muted-foreground" />;
    case 'integration':
      return <Link2 className="h-5 w-5 text-muted-foreground" />;
    case 'message':
      return <MessageSquare className="h-5 w-5 text-muted-foreground" />;
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" />;
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
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
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

function NotificationList({
  category,
}: {
  category: string;
}) {
  const [statusFilter] = useState<'unread' | 'all'>('all');
  const params = {
    status: statusFilter,
    limit: 50,
    ...(category !== 'all' && { category }),
  };
  const { data: notifications = [], isLoading } = useNotifications(params);
  const markAsReadMutation = useMarkAsRead();
  const dismissMutation = useDismissNotification();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.readAt) {
      markAsReadMutation.mutate(notification.notificationId);
    }
    if (notification.actionUrl && typeof window !== 'undefined') {
      window.location.href = notification.actionUrl;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Loading notifications...</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-2">
        <Bell className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          {category === 'all' ? 'No notifications yet' : `No ${category.toLowerCase()} notifications`}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[calc(100vh-280px)]">
      <div className="space-y-2">
        {notifications.map((notification) => (
          <Card
            key={notification.notificationId}
            className={`cursor-pointer transition-colors hover:bg-accent/50 ${
              !notification.readAt ? 'border-l-2 border-l-foreground' : ''
            }`}
            onClick={() => handleNotificationClick(notification)}
          >
            <CardContent className="flex items-start gap-3 p-4">
              {/* Unread indicator */}
              <div className="mt-1 flex-shrink-0">
                {!notification.readAt ? (
                  <div className="h-2.5 w-2.5 rounded-full bg-foreground" />
                ) : (
                  <div className="h-2.5 w-2.5" />
                )}
              </div>

              {/* Icon */}
              <div className="mt-0.5 flex-shrink-0">
                {getNotificationIcon(notification.iconType)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {notification.title && (
                    <p className="text-sm font-medium text-foreground">{notification.title}</p>
                  )}
                  {getCategoryBadge(notification.category)}
                </div>
                {notification.message && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <p className="text-xs text-muted-foreground/70">
                    {formatRelativeTime(notification.createdAt)}
                  </p>
                  {notification.actionUrl && notification.actionLabel && (
                    <Button variant="ghost" size="sm" className="h-auto p-0 text-xs underline">
                      {notification.actionLabel}
                    </Button>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-1 flex-shrink-0">
                {!notification.readAt && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsReadMutation.mutate(notification.notificationId);
                    }}
                    title="Mark as read"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissMutation.mutate(notification.notificationId);
                  }}
                  title="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

export default function NotificationsPage() {
  const { data: countData } = useNotificationCount();
  const markAllReadMutation = useMarkAllRead();

  const unreadCount = countData?.unread ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-foreground" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">{unreadCount} unread</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate(undefined)}
              disabled={markAllReadMutation.isPending}
            >
              <Check className="h-4 w-4 mr-1" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.key} value={cat.key}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map((cat) => (
          <TabsContent key={cat.key} value={cat.key} className="mt-4">
            <NotificationList category={cat.key} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
