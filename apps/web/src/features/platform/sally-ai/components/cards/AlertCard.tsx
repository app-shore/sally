'use client';

import { Badge } from '@/shared/components/ui/badge';
import type { MockAlert } from '../../engine/types';

const severityStyles: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

export function AlertCard({ data }: { data: Record<string, unknown> }) {
  // Single alert
  if (data.id) {
    const alert = data as unknown as MockAlert & { acknowledged?: boolean };
    return (
      <div className="rounded-lg border border-border bg-card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <Badge className={severityStyles[alert.severity]}>{alert.severity}</Badge>
          <span className="text-xs text-muted-foreground">{alert.id}</span>
        </div>
        <p className="text-sm text-foreground">{alert.message}</p>
        <div className="flex gap-3 text-xs text-muted-foreground">
          {alert.driver && <span>Driver: {alert.driver}</span>}
          <span>Route: {alert.route}</span>
        </div>
        {alert.acknowledged && (
          <Badge variant="outline" className="text-green-600 dark:text-green-400 border-green-600 dark:border-green-400">
            Acknowledged
          </Badge>
        )}
      </div>
    );
  }

  // Alert list
  const alerts = (data.alerts ?? []) as MockAlert[];
  return (
    <div className="space-y-2">
      {alerts.map(alert => (
        <div key={alert.id} className="rounded-lg border border-border bg-card p-2 flex items-center gap-3">
          <Badge className={`${severityStyles[alert.severity]} text-[10px] px-1.5 py-0.5`}>
            {alert.severity === 'critical' ? '!!!' : alert.severity === 'warning' ? '!!' : 'i'}
          </Badge>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground truncate">{alert.message}</p>
            <p className="text-[10px] text-muted-foreground">{alert.id} {alert.driver ? `\u00B7 ${alert.driver}` : ''}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
