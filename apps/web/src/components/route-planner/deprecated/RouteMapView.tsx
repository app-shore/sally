"use client";

import { Card } from "@/components/ui/card";
import { useRoutePlanStore } from "@/lib/store/routePlanStore";
import { TimelineDrawer } from "./TimelineDrawer";

export function RouteMapView() {
  const { currentPlan } = useRoutePlanStore();

  if (!currentPlan) return null;

  return (
    <div className="relative h-[600px] w-full rounded-lg overflow-hidden">
      {/* Map Container (full height) */}
      <div className="absolute inset-0 bg-gray-100 dark:bg-gray-900">
        {/* Placeholder for map integration (Phase 4) */}
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-4xl mb-2">🗺️</div>
            <div className="text-muted-foreground">Map visualization (Phase 4)</div>
            <div className="text-xs text-muted-foreground mt-1">
              Will show route, stops, rest/fuel icons
            </div>
          </div>
        </div>
      </div>

      {/* Floating Summary Card (top-left) */}
      <div className="absolute top-4 left-4 z-10">
        <Card className="p-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-lg">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Total Distance</div>
              <div className="text-xl font-bold">{currentPlan.total_distance_miles.toFixed(0)}mi</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <div className="text-xs text-muted-foreground">Total Time</div>
              <div className="text-xl font-bold">{currentPlan.total_time_hours.toFixed(1)}h</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <div className="text-xs text-muted-foreground">HOS Status</div>
              <div className="text-xl font-bold text-green-600">✓ Compliant</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Timeline Drawer (bottom, pull up to expand) */}
      <TimelineDrawer />
    </div>
  );
}
