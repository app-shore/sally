"use client";

import { useRoutePlanStore } from "@/lib/store/routePlanStore";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { RouteSegment } from "@/lib/types/routePlan";
import { cn } from "@/lib/utils";

interface SegmentCardProps {
  segment: RouteSegment;
}

export function SegmentCard({ segment }: SegmentCardProps) {
  const getSegmentIcon = (type: string) => {
    switch (type) {
      case "drive": return "🚗";
      case "rest": return "💤";
      case "fuel": return "⛽";
      case "dock": return "🏭";
      default: return "📍";
    }
  };

  // Special styling for REST segments
  const isRestSegment = segment.segment_type === "rest";

  return (
    <Card
      className={cn(
        "p-4",
        isRestSegment && "border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">{getSegmentIcon(segment.segment_type)}</div>

        <div className="flex-1">
          {/* Segment header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">
              {segment.segment_type === "drive" && segment.from_location && segment.to_location &&
                `${segment.from_location} → ${segment.to_location}`}
              {segment.segment_type === "rest" &&
                `Rest Stop${segment.rest_type ? ` (${segment.rest_type.replace("_", " ")})` : ""}`}
              {segment.segment_type === "fuel" &&
                `Fuel Stop${segment.fuel_station_name ? ` - ${segment.fuel_station_name}` : ""}`}
              {segment.segment_type === "dock" &&
                `${segment.customer_name || "Dock Stop"}`}
            </span>

            {/* REST optimization badge + popover */}
            {isRestSegment && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                  >
                    💡
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
                  <div className="space-y-2">
                    <div className="font-semibold text-sm text-blue-700 dark:text-blue-300">
                      💡 REST Optimization Recommendation
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {segment.rest_reason || "HOS compliance requires rest stop at this location."}
                    </p>

                    {/* Show optimization details if partial rest */}
                    {segment.rest_type?.includes("partial") && (
                      <div className="bg-blue-100 dark:bg-blue-900/30 rounded p-2 text-xs">
                        <div className="font-medium mb-1">Why Partial Rest?</div>
                        <ul className="space-y-1 ml-3 text-muted-foreground">
                          <li>• Next dock has {segment.dock_duration_hours || 0}h available</li>
                          <li>• Combining rest + dock = 10h total off-duty</li>
                          <li>• Saves ~3h compared to full 10h rest stop</li>
                          <li>• Maintains 100% HOS compliance</li>
                        </ul>
                      </div>
                    )}

                    {segment.rest_type === "full_rest" && (
                      <div className="bg-blue-100 dark:bg-blue-900/30 rounded p-2 text-xs">
                        <div className="font-medium mb-1">Why Full Rest?</div>
                        <ul className="space-y-1 ml-3 text-muted-foreground">
                          <li>• 10-hour break required for HOS reset</li>
                          <li>• No suitable dock time available for partial rest</li>
                          <li>• Ensures driver returns to 11h drive time</li>
                          <li>• Maintains 100% HOS compliance</li>
                        </ul>
                      </div>
                    )}

                    {segment.rest_type === "break" && (
                      <div className="bg-blue-100 dark:bg-blue-900/30 rounded p-2 text-xs">
                        <div className="font-medium mb-1">Why 30-Minute Break?</div>
                        <ul className="space-y-1 ml-3 text-muted-foreground">
                          <li>• 8 hours of drive time reached</li>
                          <li>• 30-minute break required by HOS</li>
                          <li>• Allows driver to continue driving</li>
                          <li>• Maintains 100% HOS compliance</li>
                        </ul>
                      </div>
                    )}

                    {/* Override actions (future enhancement) */}
                    <div className="flex gap-2 pt-2 border-t border-border">
                      <Button variant="outline" size="sm" className="text-xs" disabled>
                        Change to Full Rest
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs text-red-600" disabled>
                        Remove
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Segment details */}
          <div className="text-sm text-muted-foreground">
            {segment.segment_type === "drive" && (
              <>
                {segment.drive_time_hours && `${segment.drive_time_hours.toFixed(1)}h drive`}
                {segment.distance_miles && ` • ${segment.distance_miles.toFixed(0)} miles`}
              </>
            )}
            {segment.segment_type === "rest" && segment.rest_duration_hours && (
              `${segment.rest_duration_hours.toFixed(1)}h rest`
            )}
            {segment.segment_type === "dock" && segment.dock_duration_hours && (
              `${segment.dock_duration_hours.toFixed(1)}h dock`
            )}
            {segment.segment_type === "fuel" && segment.fuel_gallons && (
              ` • ${segment.fuel_gallons.toFixed(0)}gal${segment.fuel_cost_estimate ? ` ($${segment.fuel_cost_estimate.toFixed(2)})` : ""}`
            )}
          </div>

          {/* Arrival/departure times */}
          {segment.estimated_arrival && (
            <div className="text-xs text-muted-foreground mt-1">
              Arrive: {new Date(segment.estimated_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {segment.estimated_departure && (
                <> • Depart: {new Date(segment.estimated_departure).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
              )}
            </div>
          )}

          {/* HOS state after segment */}
          {segment.hos_state_after && (
            <div className="mt-2 flex gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                Drive: {segment.hos_state_after.hours_driven.toFixed(1)}h
              </Badge>
              <Badge variant="outline" className="text-xs">
                On-Duty: {segment.hos_state_after.on_duty_time.toFixed(1)}h
              </Badge>
              <Badge variant="outline" className="text-xs">
                Since Break: {segment.hos_state_after.hours_since_break.toFixed(1)}h
              </Badge>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function SegmentsTimeline() {
  const { currentPlan } = useRoutePlanStore();

  if (!currentPlan?.segments || currentPlan.segments.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        No segments available
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {currentPlan.segments.map((segment, idx) => (
        <SegmentCard key={idx} segment={segment} />
      ))}
    </div>
  );
}
