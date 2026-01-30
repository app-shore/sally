"use client";

/**
 * Fully Expanded Route Timeline - Always shows all details
 *
 * For Route Tab - Everything visible by default:
 * - Icons in circles (12x12 - same as Overview)
 * - All information expanded
 * - No clicking needed
 * - Vertical layout with full details
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RoutePlan } from "@/lib/types/routePlan";
import { Clock } from "lucide-react";
import { formatTime, getSegmentDisplay } from "../utils/routeTimelineUtils";
import { getFullDetails } from "../utils/segmentDetails";

interface FullyExpandedRouteTimelineProps {
  plan: RoutePlan;
}

export default function FullyExpandedRouteTimeline({ plan }: FullyExpandedRouteTimelineProps) {
  const { segments } = plan;

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
              const display = getSegmentDisplay(segment, index, segments.length);
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
                    {getFullDetails(segment, index, segments.length)}
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
