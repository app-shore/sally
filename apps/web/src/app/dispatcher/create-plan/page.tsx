"use client";

/**
 * Route Planning — SALLY's flagship feature
 *
 * Two-phase single screen:
 * Phase 1: Planning form (load, driver, vehicle, departure, priority)
 * Phase 2: Route result (summary, compliance, timeline, activation)
 */

import { useState } from "react";
import { FeatureGuard } from "@/features/platform/feature-flags";
import { RoutePlanningForm } from "./components/RoutePlanningForm";
import { PlanningAnimation } from "./components/PlanningAnimation";
import { RoutePlanResult } from "./components/RoutePlanResult";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { usePlanRoute } from "@/features/routing/route-planning";
import type {
  CreateRoutePlanRequest,
  RoutePlanResult as RoutePlanResultType,
} from "@/features/routing/route-planning";

type Phase = "form" | "planning" | "result";

export default function CreatePlanPage() {
  const [phase, setPhase] = useState<Phase>("form");
  const [planResult, setPlanResult] = useState<RoutePlanResultType | null>(null);
  const planRoute = usePlanRoute();

  const handleSubmit = async (data: CreateRoutePlanRequest) => {
    setPhase("planning");

    // Ensure animation shows for at least 3 seconds
    const minDelay = new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      const [result] = await Promise.all([
        planRoute.mutateAsync(data),
        minDelay,
      ]);
      setPlanResult(result);
      setPhase("result");
    } catch {
      // Error — go back to form
      setPhase("form");
    }
  };

  const handleNewPlan = () => {
    setPlanResult(null);
    planRoute.reset();
    setPhase("form");
  };

  return (
    <FeatureGuard featureKey="route_planning_enabled">
      <div className="min-h-[calc(100vh-120px)] py-6 px-4 md:px-6">
        {/* Phase 1: Form */}
        {phase === "form" && (
          <div className="space-y-6">
            <div className="max-w-2xl mx-auto">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                Create Route Plan
              </h1>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                Plan optimized routes with zero HOS violations and automatic
                rest stop insertion
              </p>
            </div>

            {/* API Error */}
            {planRoute.isError && (
              <div className="max-w-2xl mx-auto">
                <Alert variant="destructive">
                  <AlertDescription>
                    {(planRoute.error as Error)?.message ||
                      "Failed to plan route. Please check your inputs and try again."}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <RoutePlanningForm
              onSubmit={handleSubmit}
              isSubmitting={planRoute.isPending}
            />
          </div>
        )}

        {/* Phase 1.5: Planning Animation */}
        {phase === "planning" && <PlanningAnimation />}

        {/* Phase 2: Result */}
        {phase === "result" && planResult && (
          <RoutePlanResult plan={planResult} onNewPlan={handleNewPlan} />
        )}
      </div>
    </FeatureGuard>
  );
}
