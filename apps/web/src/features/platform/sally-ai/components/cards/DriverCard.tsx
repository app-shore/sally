'use client';

import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import type { MockDriver } from '../../engine/types';

const statusStyles: Record<string, string> = {
  driving: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  at_dock: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  resting: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  off_duty: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
};

export function DriverCard({ data }: { data: Record<string, unknown> }) {
  // Multiple drivers
  if (Array.isArray(data.drivers)) {
    const drivers = data.drivers as MockDriver[];
    return (
      <div className="space-y-2">
        {drivers.map(driver => (
          <div key={driver.id} className="rounded-lg border border-border bg-card p-2 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-foreground">
              {driver.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">{driver.name}</p>
              <div className="flex items-center gap-2">
                <Badge className={`${statusStyles[driver.status]} text-[10px] px-1.5 py-0`}>
                  {driver.status.replace('_', ' ')}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{driver.hos_remaining}h HOS</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Single driver
  const driver = data as unknown as MockDriver;
  const hosPercent = (driver.hos_remaining / 11) * 100;

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-foreground">
          {driver.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{driver.name}</p>
          <Badge className={statusStyles[driver.status]}>{driver.status.replace('_', ' ')}</Badge>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>HOS Remaining</span>
          <span>{driver.hos_remaining}h / 11h</span>
        </div>
        <Progress value={hosPercent} className="h-2" />
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Vehicle: {driver.vehicle}</span>
        {driver.current_route && <span>Route: {driver.current_route}</span>}
      </div>
    </div>
  );
}
