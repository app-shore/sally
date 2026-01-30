"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRoutePlanStore } from "@/lib/store/routePlanStore";
import { SegmentCard } from "./SegmentsTimeline";
import { cn } from "@/lib/utils";

export function TimelineDrawer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { currentPlan } = useRoutePlanStore();

  if (!currentPlan) return null;

  const dockStops = currentPlan.segments.filter((s) => s.segment_type === 'dock').length;
  const restStops = currentPlan.segments.filter((s) => s.segment_type === 'rest').length;
  const fuelStops = currentPlan.segments.filter((s) => s.segment_type === 'fuel').length;

  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 z-20 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl transition-all duration-300",
        isExpanded ? "h-[500px]" : "h-[120px]"
      )}
    >
      {/* Drag Handle */}
      <div
        className="flex items-center justify-center py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-t-2xl"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
      </div>

      {/* Collapsed View - Summary */}
      {!isExpanded && (
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">
                {dockStops} stops
              </div>
              <div className="text-xs text-muted-foreground">
                {restStops} rest stops • {fuelStops} fuel stops
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(true)}>
              View Timeline ▲
            </Button>
          </div>
        </div>
      )}

      {/* Expanded View - Full Timeline */}
      {isExpanded && (
        <div className="px-6 pb-6 h-[calc(100%-40px)] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Route Timeline</h3>
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
              Collapse ▼
            </Button>
          </div>

          {/* Segments with inline REST recommendations */}
          <div className="space-y-3">
            {currentPlan.segments.map((segment, idx) => (
              <SegmentCard key={idx} segment={segment} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
