"use client";

/**
 * Segment Breakdown Summary - Collapsible segment counts
 *
 * Groups segments by type and shows summary stats:
 * - Drive segments (count, total miles, total hours)
 * - Rest stops (count, total duration)
 * - Fuel stops (count)
 * - Dock stops (count, total duration)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { RoutePlan, RouteSegment } from "@/lib/types/routePlan";
import { Navigation, Bed, Fuel, Building2 } from "lucide-react";

interface SegmentBreakdownSummaryProps {
  plan: RoutePlan;
}

export default function SegmentBreakdownSummary({ plan }: SegmentBreakdownSummaryProps) {
  const { segments } = plan;

  // Group segments by type
  const driveSegments = segments.filter((s) => s.segment_type === "drive");
  const restSegments = segments.filter((s) => s.segment_type === "rest");
  const fuelSegments = segments.filter((s) => s.segment_type === "fuel");
  const dockSegments = segments.filter((s) => s.segment_type === "dock");

  // Calculate totals
  const totalDriveMiles = driveSegments.reduce((sum, s) => sum + (s.distance_miles || 0), 0);
  const totalDriveHours = driveSegments.reduce((sum, s) => sum + (s.drive_time_hours || 0), 0);

  // Rest segments include drive to rest stop + rest duration
  const totalRestDriveMiles = restSegments.reduce((sum, s) => sum + (s.distance_miles || 0), 0);
  const totalRestDriveHours = restSegments.reduce((sum, s) => sum + (s.drive_time_hours || 0), 0);
  const totalRestDurationHours = restSegments.reduce((sum, s) => sum + (s.rest_duration_hours || 0), 0);

  // Fuel segments include drive to fuel stop
  const totalFuelDriveMiles = fuelSegments.reduce((sum, s) => sum + (s.distance_miles || 0), 0);
  const totalFuelDriveHours = fuelSegments.reduce((sum, s) => sum + (s.drive_time_hours || 0), 0);

  const totalDockHours = dockSegments.reduce((sum, s) => sum + (s.dock_duration_hours || 0), 0);

  const segmentGroups = [
    {
      type: "drive",
      icon: Navigation,
      title: "Drive Segments",
      count: driveSegments.length,
      summary: `${totalDriveMiles.toFixed(0)} miles, ${totalDriveHours.toFixed(1)} hours`,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/20",
      segments: driveSegments,
    },
    {
      type: "rest",
      icon: Bed,
      title: "Rest Stops",
      count: restSegments.length,
      summary: restSegments.length > 0
        ? `${totalRestDriveMiles.toFixed(0)} mi drive, ${totalRestDurationHours.toFixed(1)}h rest`
        : "No rest stops",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      segments: restSegments,
    },
    {
      type: "fuel",
      icon: Fuel,
      title: "Fuel Stops",
      count: fuelSegments.length,
      summary: fuelSegments.length > 0
        ? `${totalFuelDriveMiles.toFixed(0)} mi drive to stations`
        : "No fuel stops",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
      segments: fuelSegments,
    },
    {
      type: "dock",
      icon: Building2,
      title: "Dock Stops",
      count: dockSegments.length,
      summary: `${totalDockHours.toFixed(1)} total hours`,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
      segments: dockSegments,
    },
  ];

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg">Segment Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {segmentGroups.map((group) => {
            const Icon = group.icon;
            return (
              <AccordionItem key={group.type} value={group.type}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 w-full">
                    <div className={`p-2 rounded-md ${group.bgColor}`}>
                      <Icon className={`h-4 w-4 ${group.color}`} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-foreground">{group.title}</div>
                      <div className="text-sm text-muted-foreground">{group.summary}</div>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{group.count}</div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-4 space-y-2">
                    {group.segments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No {group.title.toLowerCase()} in this route</p>
                    ) : (
                      <div className="space-y-2">
                        {group.segments.map((segment, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 rounded-md bg-muted/50 text-sm"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-foreground">
                                Segment #{segment.sequence_order}
                              </div>
                              <div className="text-muted-foreground">
                                {segment.segment_type === "drive" &&
                                  `${segment.from_location} → ${segment.to_location}`}
                                {segment.segment_type === "rest" &&
                                  `${segment.rest_type} (${segment.rest_duration_hours}h) - ${segment.rest_reason}`}
                                {segment.segment_type === "fuel" &&
                                  `${segment.fuel_station_name} - ${segment.fuel_gallons} gal`}
                                {segment.segment_type === "dock" &&
                                  `${segment.customer_name} - ${segment.dock_duration_hours}h`}
                              </div>
                            </div>
                            {segment.segment_type === "drive" && (
                              <div className="text-right">
                                <div className="font-medium">
                                  {segment.distance_miles != null ? `${segment.distance_miles.toFixed(0)} mi` : 'N/A'}
                                </div>
                                <div className="text-muted-foreground">
                                  {segment.drive_time_hours != null ? `${segment.drive_time_hours.toFixed(1)}h` : 'N/A'}
                                </div>
                              </div>
                            )}
                            {segment.segment_type === "rest" && (
                              <div className="text-right">
                                <div className="font-medium">
                                  {segment.distance_miles != null ? `${segment.distance_miles.toFixed(0)} mi` : '0 mi'}
                                </div>
                                <div className="text-muted-foreground">
                                  {segment.drive_time_hours != null ? `${segment.drive_time_hours.toFixed(1)}h drive` : '0h'}
                                </div>
                              </div>
                            )}
                            {segment.segment_type === "fuel" && (
                              <div className="text-right">
                                <div className="font-medium">
                                  {segment.distance_miles != null ? `${segment.distance_miles.toFixed(0)} mi` : '0 mi'}
                                </div>
                                <div className="text-muted-foreground">
                                  {segment.drive_time_hours != null ? `${segment.drive_time_hours.toFixed(1)}h drive` : '0h'}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
