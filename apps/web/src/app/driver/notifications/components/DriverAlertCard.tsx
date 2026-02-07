'use client';

import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Check, AlertTriangle } from 'lucide-react';
import type { Alert } from '@/features/operations/alerts/types';

interface DriverAlertCardProps {
  alert: Alert;
  onAcknowledge: (alertId: string) => void;
}

const priorityColors: Record<string, string> = {
  critical: 'border-l-red-500 dark:border-l-red-400',
  high: 'border-l-orange-500 dark:border-l-orange-400',
  medium: 'border-l-yellow-500 dark:border-l-yellow-400',
  low: 'border-l-blue-500 dark:border-l-blue-400',
};

export function DriverAlertCard({ alert, onAcknowledge }: DriverAlertCardProps) {
  const isAcknowledged = alert.status === 'acknowledged';

  return (
    <Card className={`border-l-4 ${priorityColors[alert.priority] || ''}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant={alert.priority === 'critical' ? 'destructive' : 'outline'} className="text-xs">
                {alert.priority === 'critical' && <AlertTriangle className="h-3 w-3 mr-1" />}
                {alert.priority}
              </Badge>
              {isAcknowledged && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Check className="h-3 w-3" /> Acknowledged
                </Badge>
              )}
            </div>
            <h3 className="text-base font-medium text-foreground">{alert.title}</h3>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{alert.message}</p>

        {alert.recommended_action && (
          <div className="bg-muted/50 rounded-md p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Recommended Action</p>
            <p className="text-sm text-foreground">{alert.recommended_action}</p>
          </div>
        )}

        {!isAcknowledged && (
          <Button
            className="w-full min-h-[44px]"
            onClick={() => onAcknowledge(alert.alert_id)}
          >
            <Check className="h-4 w-4 mr-2" />
            Acknowledge
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
