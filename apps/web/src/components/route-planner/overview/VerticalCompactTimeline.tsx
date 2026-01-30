"use client";

/**
 * Vertical Compact Timeline - Clickable vertical timeline for Overview
 *
 * For Overview Tab (Vertical Mode):
 * - Smaller icons in circles (12x12)
 * - Minimal info by default
 * - Click to expand details
 * - Matches Route tab styling but compact
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { RoutePlan, RouteSegment } from "@/lib/types/routePlan";
import { Navigation, Bed, Fuel, Building2, Circle, Flag, Clock, ChevronDown, ChevronUp } from "lucide-react";

interface VerticalCompactTimelineProps {
  plan: RoutePlan;
}

export default function VerticalCompactTimeline({ plan }: VerticalCompactTimelineProps) {
  const { segments } = plan;
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

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

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  // Get minimal summary
  const getMinimalSummary = (segment: RouteSegment, index: number): string => {
    const isOrigin = index === 0;
    const isDestination = index === segments.length - 1;

    if (isOrigin) return segment.from_location || "Start";
    if (isDestination) return segment.to_location || "End";

    switch (segment.segment_type) {
      case "drive":
        return `${segment.from_location} → ${segment.to_location}`;
      case "fuel":
        return `${segment.fuel_station_name || "Fuel Stop"} • ${segment.fuel_gallons?.toFixed(0) || ""}gal`;
      case "rest":
        return `${segment.rest_type?.replace("_", " ") || "Rest"} • ${segment.rest_duration_hours?.toFixed(1) || ""}h`;
      case "dock":
        return `${segment.to_location || "Dock"} • ${segment.dock_duration_hours?.toFixed(1) || ""}h`;
      default:
        return "Stop";
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-6">
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-5 top-4 bottom-4 w-0.5 bg-border" />

          {/* Timeline items - Clickable */}
          <div className="space-y-4">
            {segments.map((segment, index) => {
              const display = getSegmentDisplay(segment, index);
              const Icon = display.Icon;
              const isExpanded = expandedIndex === index;

              return (
                <div key={index} className="relative flex items-start gap-4">
                  {/* Smaller Clickable Icon */}
                  <button
                    onClick={() => toggleExpand(index)}
                    className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ${display.bgColor} border-2 ${display.borderColor}
                      flex items-center justify-center transition-all duration-200 hover:scale-110 focus:outline-none
                      ${isExpanded ? 'ring-2 ring-offset-2 ring-offset-background' : ''}`}
                    aria-label={`Toggle details for ${getMinimalSummary(segment, index)}`}
                  >
                    <Icon className={`w-5 h-5 ${display.iconColor}`} />
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1">
                    {/* Time and expand indicator */}
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        {formatTime(segment.estimated_arrival || null)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                        #{segment.sequence_order}
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </span>
                    </div>

                    {/* Minimal summary - Always visible */}
                    <div className="text-sm font-medium text-foreground">
                      {getMinimalSummary(segment, index)}
                    </div>

                    {/* Expanded details - Shown when clicked */}
                    {isExpanded && (
                      <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                        {getFullDetails(segment, index)}
                      </div>
                    )}
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
