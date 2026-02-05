"use client";

/**
 * Driver Current Status - Current location and next stop
 *
 * Shows:
 * - Current location indicator
 * - Next stop details (name, distance, ETA)
 * - On-time vs delayed status
 */

import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import type { RoutePlan } from "@/features/routing/route-planning";
import { MapPin, Navigation, Clock, CheckCircle2 } from "lucide-react";

interface DriverCurrentStatusProps {
  plan: RoutePlan;
}

export default function DriverCurrentStatus({ plan }: DriverCurrentStatusProps) {
  const { segments } = plan;

  // For demo: assume we're at segment 2 (first dock stop)
  const currentSegmentIndex = 2;
  const currentSegment = segments[currentSegmentIndex];
  const nextSegment = segments[currentSegmentIndex + 1];

  if (!currentSegment || !nextSegment) {
    return null;
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Current Location */}
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-full bg-green-50 dark:bg-green-950/20">
              <MapPin className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">Current Location</div>
              <div className="text-lg font-semibold text-foreground">
                {currentSegment.segment_type === "dock"
                  ? currentSegment.customer_name
                  : currentSegment.to_location || "En Route"}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Segment {currentSegment.sequence_order} of {segments.length}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border"></div>

          {/* Next Stop */}
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-950/20">
              <Navigation className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">Next Stop</div>
              <div className="text-lg font-semibold text-foreground">
                {nextSegment.segment_type === "dock"
                  ? nextSegment.customer_name
                  : nextSegment.segment_type === "rest"
                  ? "Rest Stop"
                  : nextSegment.segment_type === "fuel"
                  ? nextSegment.fuel_station_name
                  : nextSegment.to_location}
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm">
                {nextSegment.distance_miles && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Navigation className="h-4 w-4" />
                    {nextSegment.distance_miles.toFixed(0)} miles
                  </div>
                )}
                {nextSegment.drive_time_hours && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {(nextSegment.drive_time_hours * 60).toFixed(0)} min
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center justify-between p-4 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="font-medium text-green-800 dark:text-green-200">On Time</span>
            </div>
            {nextSegment.estimated_arrival && (
              <span className="text-sm text-green-700 dark:text-green-300">
                ETA: {new Date(nextSegment.estimated_arrival).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
