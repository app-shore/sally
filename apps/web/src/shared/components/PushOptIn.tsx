'use client';

import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { usePushNotifications } from '@/shared/hooks/use-push-notifications';

export function PushOptIn() {
  const { permission, isSubscribed, isSupported, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) return null;
  if (permission === 'denied') return null;

  if (isSubscribed) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-foreground" />
            <span className="text-sm text-foreground">Push notifications enabled</span>
          </div>
          <Button variant="ghost" size="sm" onClick={unsubscribe}>
            <BellOff className="h-4 w-4 mr-1" />
            Disable
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Enable push notifications</p>
          <p className="text-xs text-muted-foreground">Get alerts even when the app is closed</p>
        </div>
        <Button size="sm" onClick={subscribe}>
          <Bell className="h-4 w-4 mr-1" />
          Enable
        </Button>
      </CardContent>
    </Card>
  );
}
