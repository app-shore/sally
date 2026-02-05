"use client";

/**
 * Overview Tab - Executive summary view with timeline toggle
 *
 * Answers dispatcher's first question: "Can this work?"
 *
 * Components:
 * - KPI Cards: Distance, Time, HOS Status, Cost, Efficiency, ETA
 * - Route Timeline: Horizontal (default) or Vertical view with toggle
 */

import { useState } from "react";
import type { RoutePlan } from "@/features/routing/route-planning";
import RouteKPICards from "./RouteKPICards";
import HorizontalRouteTimeline from "./HorizontalRouteTimeline";
import VerticalCompactTimeline from "./VerticalCompactTimeline";
import { Button } from "@/shared/components/ui/button";
import { LayoutGrid, List } from "lucide-react";

interface OverviewTabProps {
  plan: RoutePlan;
  onViewRouteDetails?: () => void;
}

export default function OverviewTab({ plan, onViewRouteDetails }: OverviewTabProps) {
  const [viewMode, setViewMode] = useState<"horizontal" | "vertical">("horizontal");

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <RouteKPICards plan={plan} />

      {/* Route Timeline with View Toggle */}
      <div className="space-y-4">
        {/* Header with Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Route Timeline</h3>
            <p className="text-sm text-muted-foreground">
              {viewMode === "horizontal"
                ? "Quick visual flow - Click 'View Full Route' for details"
                : "Detailed chronological view"
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Toggle View Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === "horizontal" ? "vertical" : "horizontal")}
            >
              {viewMode === "horizontal" ? (
                <>
                  <List className="w-4 h-4 mr-2" />
                  Vertical
                </>
              ) : (
                <>
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  Horizontal
                </>
              )}
            </Button>

            {/* View Full Route Button */}
            {onViewRouteDetails && (
              <Button
                variant="default"
                size="sm"
                onClick={onViewRouteDetails}
              >
                View Full Route
              </Button>
            )}
          </div>
        </div>

        {/* Timeline Views */}
        {viewMode === "horizontal" ? (
          <HorizontalRouteTimeline plan={plan} showHeader={false} />
        ) : (
          <VerticalCompactTimeline plan={plan} />
        )}
      </div>
    </div>
  );
}
