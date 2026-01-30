"use client";

/**
 * Overview Tab - Executive summary view
 *
 * Answers dispatcher's first question: "Can this work?"
 *
 * Components:
 * - KPI Cards: Distance, Time, HOS Status, Cost, Efficiency, ETA
 * - Segment Breakdown: Collapsible segment counts
 * - Quick Metrics Grid: Key operational metrics
 */

import type { RoutePlan } from "@/lib/types/routePlan";
import RouteKPICards from "./RouteKPICards";
import SegmentBreakdownSummary from "./SegmentBreakdownSummary";
import QuickMetricsGrid from "./QuickMetricsGrid";
import SimpleRouteTimeline from "./SimpleRouteTimeline";

interface OverviewTabProps {
  plan: RoutePlan;
}

export default function OverviewTab({ plan }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <RouteKPICards plan={plan} />

      {/* Simple Route Timeline - Clear chronological view */}
      <SimpleRouteTimeline plan={plan} />

      {/* Segment Breakdown */}
      <SegmentBreakdownSummary plan={plan} />

      {/* Quick Metrics */}
      <QuickMetricsGrid plan={plan} />
    </div>
  );
}
