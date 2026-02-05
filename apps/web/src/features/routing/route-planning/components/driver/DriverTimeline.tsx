"use client";

/**
 * Driver Timeline - Vertical timeline for mobile
 *
 * Shows chronological route flow:
 * - Start to finish
 * - Clear segment types with icons
 * - Time labels
 * - REST stop reasoning visible
 * - Mobile-first design with large touch targets
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RoutePlan, RouteSegment } from "@/lib/types/routePlan";
import { Navigation, Bed, Fuel, Building2, MapPin } from "lucide-react";

interface DriverTimelineProps {
  plan: RoutePlan;
}

export default function DriverTimeline({ plan }: DriverTimelineProps) {
  const { segments } = plan;

  // Calculate start time (assume current time for demo)
  const startTime = new Date();
  let currentTime = new Date(startTime);

  const getSegmentIcon = (type: string) => {
    switch (type) {
      case "drive":
        return Navigation;
      case "rest":
        return Bed;
      case "fuel":
        return Fuel;
      case "dock":
        return Building2;
      default:
        return MapPin;
    }
  };

  const getSegmentColor = (type: string) => {
    switch (type) {
      case "drive":
        return {
          bg: "bg-green-50 dark:bg-green-950/20",
          border: "border-green-200 dark:border-green-800",
          icon: "text-green-600 dark:text-green-400",
        };
      case "rest":
        return {
          bg: "bg-blue-50 dark:bg-blue-950/20",
          border: "border-blue-200 dark:border-blue-800",
          icon: "text-blue-600 dark:text-blue-400",
        };
      case "fuel":
        return {
          bg: "bg-orange-50 dark:bg-orange-950/20",
          border: "border-orange-200 dark:border-orange-800",
          icon: "text-orange-600 dark:text-orange-400",
        };
      case "dock":
        return {
          bg: "bg-purple-50 dark:bg-purple-950/20",
          border: "border-purple-200 dark:border-purple-800",
          icon: "text-purple-600 dark:text-purple-400",
        };
      default:
        return {
          bg: "bg-gray-50 dark:bg-gray-950/20",
          border: "border-border",
          icon: "text-muted-foreground",
        };
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getSegmentDuration = (segment: RouteSegment): number => {
    switch (segment.segment_type) {
      case "drive":
        return (segment.drive_time_hours || 0) * 60;
      case "rest":
        return (segment.rest_duration_hours || 0) * 60;
      case "fuel":
        return 15;
      case "dock":
        return (segment.dock_duration_hours || 0) * 60;
      default:
        return 0;
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg">Full Day Timeline</CardTitle>
        <p className="text-sm text-muted-foreground">
          Your complete route from start to finish
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border"></div>

          {/* Timeline items */}
          <div className="space-y-6">
            {segments.map((segment, idx) => {
              const Icon = getSegmentIcon(segment.segment_type);
              const colors = getSegmentColor(segment.segment_type);
              const segmentTime = new Date(currentTime);
              const duration = getSegmentDuration(segment);

              // Update current time for next segment
              currentTime = new Date(currentTime.getTime() + duration * 60 * 1000);

              return (
                <div key={idx} className="relative pl-16">
                  {/* Icon */}
                  <div
                    className={`absolute left-0 p-3 rounded-full ${colors.bg} border-2 ${colors.border}`}
                  >
                    <Icon className={`h-6 w-6 ${colors.icon}`} />
                  </div>

                  {/* Content */}
                  <div className="min-h-[44px]">
                    {/* Time */}
                    <div className="text-sm font-semibold text-foreground mb-1">
                      {formatTime(segmentTime)}
                    </div>

                    {/* Segment details */}
                    <div className={`p-4 rounded-lg border ${colors.border} ${colors.bg}`}>
                      <div className="space-y-2">
                        {/* Title */}
                        <div className="font-medium text-foreground">
                          {segment.segment_type === "drive" && (
                            <>🚗 Drive: {segment.from_location} → {segment.to_location}</>
                          )}
                          {segment.segment_type === "rest" && (
                            <>💤 Rest Stop ({segment.rest_duration_hours}h)</>
                          )}
                          {segment.segment_type === "fuel" && (
                            <>⛽ Fuel Stop</>
                          )}
                          {segment.segment_type === "dock" && (
                            <>🏭 {segment.customer_name}</>
                          )}
                        </div>

                        {/* Details */}
                        <div className="text-sm text-muted-foreground space-y-1">
                          {segment.segment_type === "drive" && (
                            <>
                              <div>
                                Distance: {segment.distance_miles?.toFixed(0)} miles
                              </div>
                              <div>
                                Time: {Math.floor((segment.drive_time_hours || 0) * 60)} min
                              </div>
                            </>
                          )}
                          {segment.segment_type === "rest" && (
                            <>
                              <div className="font-medium text-foreground mt-1">
                                WHY: {segment.rest_reason}
                              </div>
                              <div>
                                Type: {segment.rest_type?.replace("_", " ").toUpperCase()}
                              </div>
                            </>
                          )}
                          {segment.segment_type === "fuel" && (
                            <>
                              <div>{segment.fuel_station_name}</div>
                              <div>{segment.fuel_gallons} gallons</div>
                            </>
                          )}
                          {segment.segment_type === "dock" && (
                            <>
                              <div>
                                Dock time: {segment.dock_duration_hours} hours
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* END marker */}
            <div className="relative pl-16">
              <div className="absolute left-0 p-3 rounded-full bg-gray-50 dark:bg-gray-950/20 border-2 border-border">
                <MapPin className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="min-h-[44px]">
                <div className="text-sm font-semibold text-foreground mb-1">
                  {formatTime(currentTime)}
                </div>
                <div className="font-medium text-foreground">✓ END</div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-8 p-4 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <div className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
            HOS Summary
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <div>
              • Total Drive: {plan.compliance_report.max_drive_hours_used.toFixed(1)}h / 11h available
            </div>
            <div>
              • Total On-Duty: {plan.compliance_report.max_duty_hours_used.toFixed(1)}h / 14h available
            </div>
            <div>• Rest Periods: {plan.rest_stops.length} stops</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
