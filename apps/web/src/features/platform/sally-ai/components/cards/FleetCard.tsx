'use client';

import type { MockFleet } from '../../engine/types';

export function FleetCard({ data }: { data: Record<string, unknown> }) {
  const fleet = data as unknown as MockFleet;

  const stats = [
    { label: 'Active Vehicles', value: fleet.active_vehicles },
    { label: 'Active Routes', value: fleet.active_routes },
    { label: 'Pending Alerts', value: fleet.pending_alerts },
    { label: 'Driving', value: fleet.drivers_driving },
    { label: 'Available', value: fleet.drivers_available },
    { label: 'Resting', value: fleet.drivers_resting },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-sm font-medium text-foreground mb-2">Fleet Overview</p>
      <div className="grid grid-cols-3 gap-2">
        {stats.map(stat => (
          <div key={stat.label} className="text-center p-1.5 rounded bg-muted">
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
