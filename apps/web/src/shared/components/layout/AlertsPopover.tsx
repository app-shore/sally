'use client';

import Link from 'next/link';
import { AlertCircle, AlertTriangle, Info, Bell, ArrowRight } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Separator } from '@/shared/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { useQuery } from '@tanstack/react-query';
import { listAlerts } from '@/features/operations/alerts';
import type { Alert } from '@/features/operations/alerts';

const priorityConfig = {
  critical: { icon: AlertCircle, color: 'text-red-600 dark:text-red-400', label: 'Critical' },
  high: { icon: AlertTriangle, color: 'text-orange-600 dark:text-orange-400', label: 'High' },
  medium: { icon: Info, color: 'text-yellow-600 dark:text-yellow-400', label: 'Medium' },
  low: { icon: Info, color: 'text-blue-600 dark:text-blue-400', label: 'Low' },
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

interface AlertsPopoverProps {
  alertCount: number;
}

export function AlertsPopover({ alertCount }: AlertsPopoverProps) {
  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts', 'active'],
    queryFn: () => listAlerts({ status: 'active' }),
    refetchInterval: 30000,
  });

  // Show top 5 alerts, sorted by priority (critical first)
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const topAlerts = [...alerts]
    .sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9))
    .slice(0, 5);

  const criticalCount = alerts.filter((a) => a.priority === 'critical').length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="View alerts"
        >
          <AlertTriangle className={`h-5 w-5 ${alertCount > 0 ? 'text-red-600 dark:text-red-400' : ''}`} />
          {alertCount > 0 && (
            <>
              <span className="absolute top-1.5 right-1.5 h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              </span>
              <span className="absolute top-0.5 right-0.5 h-4 w-4 bg-red-500 dark:bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-semibold z-10">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Active Alerts</h3>
            {alertCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {alertCount}
              </Badge>
            )}
          </div>
          {criticalCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {criticalCount} critical
            </Badge>
          )}
        </div>

        {/* Alert List */}
        <ScrollArea className="max-h-80">
          {topAlerts.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No active alerts</p>
              <p className="text-xs text-muted-foreground mt-1">All systems operating normally</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {topAlerts.map((alert) => (
                <AlertRow key={alert.alert_id} alert={alert} />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <Separator />
        <div className="p-2">
          <Link
            href="/dispatcher/alerts"
            className="inline-flex items-center justify-center w-full rounded-md text-xs font-medium h-9 px-3 hover:bg-muted hover:text-foreground transition-colors"
          >
            View All Alerts
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  const config = priorityConfig[alert.priority] || priorityConfig.low;
  const Icon = config.icon;

  return (
    <Link
      href="/dispatcher/alerts"
      className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors"
    >
      <div className="mt-0.5 flex-shrink-0">
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-medium text-foreground truncate">
            {alert.title}
          </p>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {alert.message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Badge
            variant={alert.priority === 'critical' ? 'destructive' : 'outline'}
            className="text-xs h-4 px-1"
          >
            {alert.priority}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(alert.created_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default AlertsPopover;
