"use client";

import { useRoutePlanStore } from "@/lib/store/routePlanStore";
import { Card } from "@/components/ui/card";

export function SegmentsTimeline() {
  const { currentPlan } = useRoutePlanStore();

  if (!currentPlan?.segments || currentPlan.segments.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        No segments available
      </Card>
    );
  }

  const getSegmentIcon = (type: string) => {
    switch (type) {
      case "drive": return "🚗";
      case "rest": return "😴";
      case "fuel": return "⛽";
      case "dock": return "🏭";
      default: return "📍";
    }
  };

  return (
    <div className="space-y-3">
      {currentPlan.segments.map((segment, idx) => (
        <Card key={idx} className="p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">{getSegmentIcon(segment.segment_type)}</div>
            <div className="flex-1">
              <div className="font-medium">
                {segment.segment_type.charAt(0).toUpperCase() + segment.segment_type.slice(1)}:
                {segment.from_location && ` ${segment.from_location}`}
                {segment.to_location && segment.to_location !== segment.from_location && ` → ${segment.to_location}`}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {segment.drive_time_hours && `${segment.drive_time_hours.toFixed(1)}h`}
                {segment.distance_miles && ` | ${segment.distance_miles.toFixed(0)} miles`}
                {segment.rest_duration_hours && `${segment.rest_duration_hours.toFixed(1)}h rest`}
                {segment.dock_duration_hours && `${segment.dock_duration_hours.toFixed(1)}h dock`}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
