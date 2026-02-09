'use client';

import { Progress } from '@/shared/components/ui/progress';
import type { MockDriver } from '../../engine/types';

export function HOSCard({ data }: { data: Record<string, unknown> }) {
  // Multiple drivers
  if (Array.isArray(data.drivers)) {
    const drivers = data.drivers as MockDriver[];
    return (
      <div className="space-y-2">
        {drivers.map(driver => {
          const hosPercent = (driver.hos_remaining / 11) * 100;
          const isLow = driver.hos_remaining < 3;
          return (
            <div key={driver.id} className="rounded-lg border border-border bg-card p-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{driver.name}</span>
                <span className={`text-xs font-medium ${isLow ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground'}`}>
                  {driver.hos_remaining}h
                </span>
              </div>
              <Progress value={hosPercent} className="h-1.5" />
            </div>
          );
        })}
      </div>
    );
  }

  // Single driver + next break
  const driver = data.driver as MockDriver;
  const nextBreak = data.nextBreak as string | undefined;
  const hosPercent = (driver.hos_remaining / 11) * 100;

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
      <p className="text-sm font-medium text-foreground">{driver.name} — HOS Status</p>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Drive Time Remaining</span>
          <span>{driver.hos_remaining}h / 11h</span>
        </div>
        <Progress value={hosPercent} className="h-2" />
      </div>
      {nextBreak && (
        <p className="text-xs text-muted-foreground">Next break: ~{nextBreak}</p>
      )}
    </div>
  );
}
