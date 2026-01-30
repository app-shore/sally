"use client";

/**
 * Timeline Tab - Gantt-style time-based visualization
 *
 * Shows route execution over time with:
 * - Horizontal timeline with auto-scaling time axis
 * - Color-coded segment bars (drive, rest, fuel, dock)
 * - HOS overlay showing hours consumed
 * - Interactive click and hover
 */

import type { RoutePlan } from "@/lib/types/routePlan";
import RouteTimelineVisualizer from "./RouteTimelineVisualizer";

interface TimelineTabProps {
  plan: RoutePlan;
}

export default function TimelineTab({ plan }: TimelineTabProps) {
  return (
    <div className="space-y-4">
      <RouteTimelineVisualizer plan={plan} />
    </div>
  );
}
