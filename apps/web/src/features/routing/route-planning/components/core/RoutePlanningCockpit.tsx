"use client";

/**
 * Route Planning Cockpit - Main container with tabbed multi-view interface
 *
 * Provides comprehensive route planning visualization for dispatchers with:
 * - Overview: Executive summary with KPIs and timeline
 * - Route: Clean visual route flow
 * - Map: Geographic route visualization (Phase 2)
 * - Costs: Financial breakdown and efficiency metrics
 */

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRoutePlanStore } from "@/features/routing/route-planning";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Card } from "@/shared/components/ui/card";
import RouteHeader from "./RouteHeader";
import OverviewTab from "../overview/OverviewTab";
import FullyExpandedRouteTimeline from "../route/FullyExpandedRouteTimeline";

// Lazy load CostsTab to avoid loading Recharts until user clicks Costs tab
const CostsTab = dynamic(() => import("../costs/CostsTab"), {
  loading: () => (
    <Card className="p-8 text-center">
      <div className="text-muted-foreground">
        <p>Loading cost analysis...</p>
      </div>
    </Card>
  ),
  ssr: false,
});

type ViewTab = "overview" | "route" | "map" | "costs";

export default function RoutePlanningCockpit() {
  const { currentPlan } = useRoutePlanStore();
  const [activeTab, setActiveTab] = useState<ViewTab>("overview");

  if (!currentPlan) {
    return (
      <Card className="p-8 text-center">
        <div className="space-y-4">
          <div className="text-muted-foreground">
            <p>No route plan generated yet.</p>
            <p className="text-sm mt-2">
              Select a load, driver, and vehicle above, then click "Plan Route" to get started.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Route metadata header */}
      <RouteHeader plan={currentPlan} />

      {/* Tabbed interface */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ViewTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="route">Route</TabsTrigger>
          <TabsTrigger value="map">Map</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab plan={currentPlan} onViewRouteDetails={() => setActiveTab("route")} />
        </TabsContent>

        <TabsContent value="route" className="mt-4">
          <FullyExpandedRouteTimeline plan={currentPlan} />
        </TabsContent>

        <TabsContent value="map" className="mt-4">
          <Card className="p-8 text-center">
            <div className="text-muted-foreground">
              <p className="font-semibold">Geographic Map View</p>
              <p className="text-sm mt-2">Coming in Phase 2 - Mapbox integration</p>
              <p className="text-sm mt-1">Will show stop markers, route polyline, and geographic context</p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="mt-4">
          <CostsTab plan={currentPlan} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
