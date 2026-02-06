"use client";

/**
 * Consolidated Route Planning Wizard - Single-screen, map-first experience
 * Flow: Load → Driver (auto-suggested) → Vehicle (auto-suggested) → Generate Plan → Map View
 */

import { FeatureGuard } from "@/features/platform/feature-flags";


export default function CreatePlanPage() {
  return (
    <FeatureGuard featureKey="route_planning_enabled">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Create Route Plan
        </h1>
        <p className="text-muted-foreground mt-1">
          Plan optimized routes with zero HOS violations and automatic rest stop
          insertion
        </p>
      </div>
      </FeatureGuard>
  );
}
