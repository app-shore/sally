/**
 * Shared utilities for route timeline components
 * Centralizes common logic to avoid code duplication
 */

import type { RouteSegment } from "@/features/routing/route-planning";
import { Navigation, Bed, Fuel, Building2, Circle, Flag } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SegmentDisplay {
  Icon: LucideIcon;
  iconColor: string;
  bgColor: string;
  borderColor: string;
}

/**
 * Format time for display
 */
export function formatTime(date: string | Date | null): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Get icon and styling for segment type
 * Used across all timeline components for consistency
 */
export function getSegmentDisplay(segment: RouteSegment, index: number, totalSegments: number): SegmentDisplay {
  const isOrigin = index === 0;
  const isDestination = index === totalSegments - 1;

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
        iconColor: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-background",
        borderColor: "border-blue-600 dark:border-blue-400",
      };
    case "fuel":
      return {
        Icon: Fuel,
        iconColor: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-background",
        borderColor: "border-orange-600 dark:border-orange-400",
      };
    case "dock":
    case "drive":
      return {
        Icon: segment.segment_type === "dock" ? Building2 : Navigation,
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
}

/**
 * Get minimal label for segment (used in compact views)
 * Returns simple type labels: "Start", "Fuel", "Rest", "Dock", "End"
 */
export function getMinimalLabel(
  segment: RouteSegment,
  index: number,
  totalSegments: number
): { primary: string; secondary?: string } {
  const isOrigin = index === 0;
  const isDestination = index === totalSegments - 1;

  if (isOrigin) {
    return { primary: "Start" };
  }

  if (isDestination) {
    return { primary: "End" };
  }

  switch (segment.segment_type) {
    case "rest":
      return { primary: "Rest" };
    case "fuel":
      return { primary: "Fuel" };
    case "dock":
      return { primary: "Dock" };
    case "drive":
      return { primary: "Drive" };
    default:
      return { primary: "Stop" };
  }
}

/**
 * Get minimal summary for segment (one-line version)
 */
export function getMinimalSummary(segment: RouteSegment, index: number, totalSegments: number): string {
  const isOrigin = index === 0;
  const isDestination = index === totalSegments - 1;

  if (isOrigin) return segment.from_location || "Start";
  if (isDestination) return segment.to_location || "End";

  switch (segment.segment_type) {
    case "drive":
      return `${segment.from_location} → ${segment.to_location}`;
    case "fuel":
      return `${segment.fuel_station_name || "Fuel Stop"} • ${segment.fuel_gallons?.toFixed(0) || "0"}gal`;
    case "rest":
      return `${segment.rest_type?.replace("_", " ") || "Rest"} • ${segment.rest_duration_hours?.toFixed(1) || "0"}h`;
    case "dock":
      return `${segment.to_location || "Dock"} • ${segment.dock_duration_hours?.toFixed(1) || "0"}h`;
    default:
      return "Stop";
  }
}
