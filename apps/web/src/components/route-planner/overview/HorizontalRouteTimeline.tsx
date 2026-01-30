"use client";

/**
 * Horizontal Route Timeline - Compact overview with clickable icons
 *
 * Shows route in horizontal flow (left to right):
 * - Smaller Lucide icons for each stop
 * - Minimal inline text below icons
 * - CLICKABLE icons - Click to see expanded details
 * - Compact horizontal layout for overview
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { RoutePlan } from "@/lib/types/routePlan";
import { ArrowRight, X } from "lucide-react";
import { formatTime, getSegmentDisplay, getMinimalLabel } from "../utils/routeTimelineUtils";
import { getExpandedDetails } from "../utils/segmentDetails";

interface HorizontalRouteTimelineProps {
  plan: RoutePlan;
  onViewDetails?: () => void;
  showHeader?: boolean;
}

export default function HorizontalRouteTimeline({ plan, onViewDetails, showHeader = true }: HorizontalRouteTimelineProps) {
  const { segments } = plan;
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <Card className="bg-card border-border">
      {showHeader && (
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg">Route Overview</CardTitle>
            <p className="text-sm text-muted-foreground">
              Click any stop icon to see details
            </p>
          </div>
          {onViewDetails && (
            <Button variant="outline" size="sm" onClick={onViewDetails}>
              View Full Route
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </CardHeader>
      )}
      <CardContent className={showHeader ? "" : "pt-6"}>
        {/* Horizontal scrollable container */}
        <div className="w-full overflow-x-auto pb-4 overflow-visible">
          <div className="flex items-start gap-4 min-w-max px-4 pb-32">
            {segments.map((segment, index) => {
              const display = getSegmentDisplay(segment, index, segments.length);
              const label = getMinimalLabel(segment, index, segments.length);
              const isLast = index === segments.length - 1;
              const isExpanded = expandedIndex === index;

              return (
                <div key={index} className="flex items-start gap-4">
                  {/* Stop */}
                  <div className="flex flex-col items-center gap-2 min-w-[120px] relative">
                    {/* Time */}
                    <div className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                      {formatTime(segment.estimated_arrival || null)}
                    </div>

                    {/* Clickable Icon */}
                    <button
                      onClick={() => toggleExpand(index)}
                      className={`w-10 h-10 rounded-full ${display.bgColor} border-2 ${display.borderColor}
                        flex items-center justify-center transition-all duration-200 hover:scale-110 focus:outline-none
                        ${isExpanded ? 'ring-2 ring-offset-2 ring-offset-background' : ''}`}
                      aria-label={`Toggle details for ${label.primary}`}
                    >
                      <display.Icon className={`w-5 h-5 ${display.iconColor}`} />
                    </button>

                    {/* Primary Label */}
                    <div className="text-xs font-medium text-foreground text-center">
                      {label.primary}
                    </div>

                    {/* Secondary Label (context-specific) */}
                    {label.secondary && (
                      <div className="text-xs text-muted-foreground text-center">
                        {label.secondary}
                      </div>
                    )}

                    {/* Expanded Details - Dropdown below icon */}
                    {isExpanded && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 min-w-[220px] max-w-[280px]">
                        <Card className="shadow-xl border-2 border-border bg-card">
                          <CardContent className="p-4 relative">
                            <button
                              onClick={() => setExpandedIndex(null)}
                              className="absolute top-2 right-2 p-1 hover:bg-muted rounded-sm transition-colors"
                              aria-label="Close details"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <div className="pr-6">
                              {getExpandedDetails(segment)}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>

                  {/* Arrow between stops */}
                  {!isLast && (
                    <div className="flex flex-col items-center gap-1 min-w-[80px] pt-10">
                      <div className="h-0.5 w-full bg-muted-foreground/40" />
                      {segment.distance_miles != null && segment.distance_miles > 0 && (
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {segment.distance_miles.toFixed(0)} mi
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-foreground">{segments.length}</div>
              <div className="text-xs text-muted-foreground">Total Stops</div>
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">
                {segments.filter((s) => s.segment_type === "dock").length}
              </div>
              <div className="text-xs text-muted-foreground">Deliveries</div>
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">
                {segments.filter((s) => s.segment_type === "fuel").length}
              </div>
              <div className="text-xs text-muted-foreground">Fuel Stops</div>
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">
                {segments.filter((s) => s.segment_type === "rest").length}
              </div>
              <div className="text-xs text-muted-foreground">Rest Stops</div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 justify-center text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-foreground" />
            <span>Origin/Destination/Dock</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-600 dark:bg-orange-400" />
            <span>Fuel</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-600 dark:bg-blue-400" />
            <span>Rest</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
