"use client";

/**
 * Route Planning Cockpit - Main container with tabbed multi-view interface
 *
 * Provides comprehensive route planning visualization for dispatchers with:
 * - Overview: Executive summary with KPIs
 * - Timeline: Gantt-style time-based visualization
 * - Map: Geographic route visualization (Phase 2)
 * - Compliance: Audit-ready HOS compliance view
 * - Costs: Financial breakdown and efficiency metrics
 */

import { useState } from "react";
import { useRoutePlanStore } from "@/lib/store/routePlanStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import RouteHeader from "./RouteHeader";
import OverviewTab from "../overview/OverviewTab";
import TimelineTab from "../timeline/TimelineTab";
import ComplianceTab from "../compliance/ComplianceTab";
import CostsTab from "../costs/CostsTab";

type ViewTab = "overview" | "timeline" | "map" | "compliance" | "costs";

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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="map">Map</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab plan={currentPlan} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <TimelineTab plan={currentPlan} />
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

        <TabsContent value="compliance" className="mt-4">
          <ComplianceTab plan={currentPlan} />
        </TabsContent>

        <TabsContent value="costs" className="mt-4">
          <CostsTab plan={currentPlan} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
