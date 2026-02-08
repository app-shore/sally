'use client';

import { Badge } from '@/shared/components/ui/badge';
import type { MockRoute } from '../../engine/types';

const statusBadge: Record<string, string> = {
  in_progress: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  planned: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
};

export function RouteCard({ data }: { data: Record<string, unknown> }) {
  // Multiple routes
  if (Array.isArray(data.routes)) {
    const routes = data.routes as MockRoute[];
    return (
      <div className="space-y-2">
        {routes.map(route => (
          <div key={route.id} className="rounded-lg border border-border bg-card p-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">{route.id}</span>
              <Badge className={`${statusBadge[route.status]} text-[10px] px-1.5 py-0`}>
                {route.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">{route.origin} → {route.destination}</p>
            <div className="flex gap-3 text-[10px] text-muted-foreground">
              <span>{route.stops} stops</span>
              <span>ETA: {route.eta}</span>
              {route.driver && <span>{route.driver}</span>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Single route
  const route = data as unknown as MockRoute;
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{route.id}</span>
        <Badge className={statusBadge[route.status]}>{route.status.replace('_', ' ')}</Badge>
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <p className="text-foreground font-medium">{route.origin} → {route.destination}</p>
        <div className="flex gap-4">
          <span>{route.stops} stops</span>
          <span>ETA: {route.eta}</span>
        </div>
        {route.driver && <p>Driver: {route.driver}</p>}
      </div>
    </div>
  );
}
