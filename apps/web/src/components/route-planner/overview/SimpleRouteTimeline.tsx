"use client";

/**
 * Simple Route Timeline - Clean, easy-to-read chronological route display
 *
 * Inspired by landing page animation - shows route in a simple vertical timeline:
 * - Each segment displayed with time, location, distance, duration
 * - Clear icons for segment types (drive, rest, fuel, dock)
 * - HOS state and reasoning shown inline
 * - Professional, minimal design
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RoutePlan, RouteSegment } from "@/lib/types/routePlan";
import { Navigation, Bed, Fuel, Building2, Clock, MapPin } from "lucide-react";

interface SimpleRouteTimelineProps {
  plan: RoutePlan;
}

export default function SimpleRouteTimeline({ plan }: SimpleRouteTimelineProps) {
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

  // Get icon and color for segment type
  const getSegmentDisplay = (segment: RouteSegment) => {
    switch (segment.segment_type) {
      case "drive":
        return {
          icon: Navigation,
          color: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-50 dark:bg-green-950/20",
          borderColor: "border-green-200 dark:border-green-800",
        };
      case "rest":
        return {
          icon: Bed,
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-950/20",
          borderColor: "border-blue-200 dark:border-blue-800",
        };
      case "fuel":
        return {
          icon: Fuel,
          color: "text-orange-600 dark:text-orange-400",
          bgColor: "bg-orange-50 dark:bg-orange-950/20",
          borderColor: "border-orange-200 dark:border-orange-800",
        };
      case "dock":
        return {
          icon: Building2,
          color: "text-purple-600 dark:text-purple-400",
          bgColor: "bg-purple-50 dark:bg-purple-950/20",
          borderColor: "border-purple-200 dark:border-purple-800",
        };
      default:
        return {
          icon: MapPin,
          color: "text-gray-600 dark:text-gray-400",
          bgColor: "bg-gray-50 dark:bg-gray-950/20",
          borderColor: "border-gray-200 dark:border-gray-800",
        };
    }
  };

  // Get segment description
  const getSegmentDescription = (segment: RouteSegment): string => {
    switch (segment.segment_type) {
      case "drive":
        return `${segment.from_location} → ${segment.to_location}`;
      case "rest":
        return `${segment.rest_type?.replace("_", " ").toUpperCase()} - ${segment.rest_reason}`;
      case "fuel":
        return `${segment.fuel_station_name} - ${segment.fuel_gallons != null ? segment.fuel_gallons.toFixed(0) : "N/A"} gallons`;
      case "dock":
        return `${segment.customer_name || segment.to_location} - Loading/Unloading`;
      default:
        return "Unknown segment";
    }
  };

  // Get segment stats
  const getSegmentStats = (segment: RouteSegment): string => {
    const stats: string[] = [];

    if (segment.distance_miles != null && segment.distance_miles > 0) {
      stats.push(`${segment.distance_miles.toFixed(0)} mi`);
    }

    if (segment.drive_time_hours != null && segment.drive_time_hours > 0) {
      const hours = Math.floor(segment.drive_time_hours);
      const minutes = Math.round((segment.drive_time_hours % 1) * 60);
      if (hours > 0) stats.push(`${hours}h ${minutes}m drive`);
      else stats.push(`${minutes}m drive`);
    }

    if (segment.rest_duration_hours != null && segment.rest_duration_hours > 0) {
      stats.push(`${segment.rest_duration_hours.toFixed(1)}h rest`);
    }

    if (segment.dock_duration_hours != null && segment.dock_duration_hours > 0) {
      stats.push(`${segment.dock_duration_hours.toFixed(1)}h dock`);
    }

    if (segment.fuel_cost_estimate != null && segment.fuel_cost_estimate > 0) {
      stats.push(`$${segment.fuel_cost_estimate.toFixed(2)}`);
    }

    return stats.length > 0 ? stats.join(" • ") : "No duration";
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

          {/* Timeline items */}
          <div className="space-y-6">
            {segments.map((segment, index) => {
              const display = getSegmentDisplay(segment);
              const Icon = display.icon;

              return (
                <div key={index} className="relative flex items-start gap-4">
                  {/* Timeline dot */}
                  <div className="relative z-10 flex-shrink-0">
                    <div
                      className={`w-12 h-12 rounded-full border-2 ${display.borderColor} ${display.bgColor} flex items-center justify-center`}
                    >
                      <Icon className={`w-5 h-5 ${display.color}`} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1">
                    {/* Time and sequence */}
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        {formatTime(segment.estimated_arrival)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        (Segment #{segment.sequence_order})
                      </span>
                    </div>

                    {/* Segment type label */}
                    <div className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${display.color} ${display.bgColor}`}>
                      {segment.segment_type.toUpperCase()}
                    </div>

                    {/* Description */}
                    <div className="text-sm font-medium text-foreground mb-1">
                      {getSegmentDescription(segment)}
                    </div>

                    {/* Stats */}
                    <div className="text-sm text-muted-foreground">
                      {getSegmentStats(segment)}
                    </div>

                    {/* HOS State (optional) */}
                    {segment.hos_state_after && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span className="font-medium">HOS after:</span>{" "}
                        {segment.hos_state_after.hours_driven != null
                          ? `${segment.hos_state_after.hours_driven.toFixed(1)}h driven`
                          : "N/A"}
                        {" • "}
                        {segment.hos_state_after.on_duty_time != null
                          ? `${segment.hos_state_after.on_duty_time.toFixed(1)}h on-duty`
                          : "N/A"}
                      </div>
                    )}

                    {/* Estimated departure (if different from arrival) */}
                    {segment.estimated_departure && segment.estimated_departure !== segment.estimated_arrival && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Depart: {formatTime(segment.estimated_departure)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary footer */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-foreground">
                {segments.length}
              </div>
              <div className="text-xs text-muted-foreground">Total Segments</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {plan.total_distance_miles != null
                  ? `${plan.total_distance_miles.toFixed(0)}`
                  : "N/A"}
              </div>
              <div className="text-xs text-muted-foreground">Miles</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {plan.total_time_hours != null
                  ? `${plan.total_time_hours.toFixed(1)}`
                  : "N/A"}
              </div>
              <div className="text-xs text-muted-foreground">Hours</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {segments.filter((s) => s.segment_type === "rest").length}
              </div>
              <div className="text-xs text-muted-foreground">Rest Stops</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
