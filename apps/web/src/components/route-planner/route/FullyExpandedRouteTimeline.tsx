"use client";

/**
 * Fully Expanded Route Timeline - Always shows all details
 *
 * For Route Tab - Everything visible by default:
 * - Large icons in circles (like the image)
 * - All information expanded
 * - No clicking needed
 * - Vertical layout with full details
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RoutePlan, RouteSegment } from "@/lib/types/routePlan";
import { Navigation, Bed, Fuel, Building2, Circle, Flag, Clock } from "lucide-react";

interface FullyExpandedRouteTimelineProps {
  plan: RoutePlan;
}

export default function FullyExpandedRouteTimeline({ plan }: FullyExpandedRouteTimelineProps) {
  const { segments } = plan;

  // Format time for display
  const formatTime = (date: string | Date | null): string => {
    if (!date) return "N/A";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Get icon and styling for segment type
  const getSegmentDisplay = (segment: RouteSegment, index: number) => {
    const isOrigin = index === 0;
    const isDestination = index === segments.length - 1;

    if (isOrigin || isDestination) {
      return {
        Icon: isOrigin ? Circle : Flag,
        iconColor: "text-foreground",
        bgColor: "bg-background",
        borderColor: "border-foreground",
      };
    }

    switch (segment.segment_type) {
      case "rest":
        return {
          Icon: Bed,
          iconColor: "text-foreground",
          bgColor: "bg-background",
          borderColor: "border-foreground",
        };
      case "fuel":
        return {
          Icon: Fuel,
          iconColor: "text-foreground",
          bgColor: "bg-background",
          borderColor: "border-foreground",
        };
      case "dock":
        return {
          Icon: Building2,
          iconColor: "text-foreground",
          bgColor: "bg-background",
          borderColor: "border-foreground",
        };
      case "drive":
        return {
          Icon: Navigation,
          iconColor: "text-foreground",
          bgColor: "bg-background",
          borderColor: "border-foreground",
        };
      default:
        return {
          Icon: Circle,
          iconColor: "text-muted-foreground",
          bgColor: "bg-background",
          borderColor: "border-muted-foreground",
        };
    }
  };

  // Get full details for segment
  const getFullDetails = (segment: RouteSegment, index: number): React.ReactNode => {
    const isOrigin = index === 0;
    const isDestination = index === segments.length - 1;

    if (isOrigin || isDestination) {
      return (
        <div>
          <div className="font-medium text-foreground mb-1">
            {isOrigin ? segment.from_location || "Start" : segment.to_location || "End"}
          </div>
        </div>
      );
    }

    switch (segment.segment_type) {
      case "drive":
        return (
          <div className="space-y-2">
            <div className="font-medium text-foreground">
              {segment.from_location} → {segment.to_location}
            </div>
            {(segment.distance_miles != null || segment.drive_time_hours != null) && (
              <div className="text-sm text-muted-foreground">
                {segment.distance_miles != null && segment.distance_miles > 0
                  ? `${segment.distance_miles.toFixed(0)} miles`
                  : "No distance"}
                {segment.drive_time_hours != null && segment.drive_time_hours > 0 && (
                  <> • {segment.drive_time_hours.toFixed(1)}h drive</>
                )}
              </div>
            )}
            {segment.hos_state_after && (
              <div className="text-sm text-muted-foreground">
                HOS after: {segment.hos_state_after.hours_driven?.toFixed(1) || "0.0"}h driven
                {" • "}
                {segment.hos_state_after.on_duty_time?.toFixed(1) || "0.0"}h on-duty
              </div>
            )}
          </div>
        );

      case "fuel":
        return (
          <div className="space-y-2">
            <div className="font-medium text-foreground">
              {segment.fuel_station_name || "Fuel Stop"}
            </div>
            {segment.fuel_gallons != null && (
              <div className="text-sm text-muted-foreground">
                {segment.fuel_gallons.toFixed(0)} gallons
                {segment.fuel_cost_estimate != null && (
                  <> • ${segment.fuel_cost_estimate.toFixed(2)}</>
                )}
              </div>
            )}
            <div className="text-sm text-muted-foreground">~15 minutes fueling time</div>
            {segment.estimated_departure && (
              <div className="text-sm text-muted-foreground">
                Depart: {formatTime(segment.estimated_departure)}
              </div>
            )}
          </div>
        );

      case "rest":
        return (
          <div className="space-y-2">
            <div className="font-medium text-foreground">
              {segment.rest_type?.replace("_", " ").toUpperCase() || "Rest Stop"}
            </div>
            {segment.rest_duration_hours != null && (
              <div className="text-sm text-muted-foreground">
                {segment.rest_duration_hours.toFixed(1)}h rest
              </div>
            )}
            {segment.rest_reason && (
              <div className="text-sm text-muted-foreground">{segment.rest_reason}</div>
            )}
            {segment.hos_state_after && (
              <div className="text-sm text-muted-foreground">
                HOS after: {segment.hos_state_after.hours_driven?.toFixed(1) || "0.0"}h driven
                {" • "}
                {segment.hos_state_after.on_duty_time?.toFixed(1) || "0.0"}h on-duty
              </div>
            )}
            {segment.estimated_departure && (
              <div className="text-sm text-muted-foreground">
                Depart: {formatTime(segment.estimated_departure)}
              </div>
            )}
          </div>
        );

      case "dock":
        return (
          <div className="space-y-2">
            <div className="font-medium text-foreground">
              {segment.to_location || "Dock Stop"} - Loading/Unloading
            </div>
            {segment.customer_name && (
              <div className="text-sm text-muted-foreground">{segment.customer_name}</div>
            )}
            {segment.dock_duration_hours != null && (
              <div className="text-sm text-muted-foreground">
                {segment.dock_duration_hours.toFixed(1)}h dock
              </div>
            )}
            {segment.hos_state_after && (
              <div className="text-sm text-muted-foreground">
                HOS after: {segment.hos_state_after.hours_driven?.toFixed(1) || "0.0"}h driven
                {" • "}
                {segment.hos_state_after.on_duty_time?.toFixed(1) || "0.0"}h on-duty
              </div>
            )}
            {segment.estimated_departure && (
              <div className="text-sm text-muted-foreground">
                Depart: {formatTime(segment.estimated_departure)}
              </div>
            )}
          </div>
        );

      default:
        return <div className="text-sm text-muted-foreground">Unknown segment</div>;
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg">Route Timeline</CardTitle>
        <p className="text-sm text-muted-foreground">
          Chronological route breakdown with times, distances, and stops
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-border" />

          {/* Timeline items - Always expanded */}
          <div className="space-y-4">
            {segments.map((segment, index) => {
              const display = getSegmentDisplay(segment, index);
              const Icon = display.Icon;

              return (
                <div key={index} className="relative flex items-start gap-4">
                  {/* Icon in Circle - Same size as Overview */}
                  <div className="relative z-10 flex-shrink-0">
                    <div
                      className={`w-12 h-12 rounded-full ${display.bgColor} border-2 ${display.borderColor}
                        flex items-center justify-center`}
                    >
                      <Icon className={`w-6 h-6 ${display.iconColor}`} />
                    </div>
                  </div>

                  {/* Content - Always Expanded */}
                  <div className="flex-1 min-w-0 pt-1">
                    {/* Time and segment number */}
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        {formatTime(segment.estimated_arrival || null)}
                      </span>
                      <span className="text-xs text-muted-foreground">(Segment #{segment.sequence_order})</span>
                    </div>

                    {/* Segment type badge */}
                    <div className="inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 bg-muted text-foreground">
                      {segment.segment_type.toUpperCase()}
                    </div>

                    {/* Full details - Always visible */}
                    {getFullDetails(segment, index)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
