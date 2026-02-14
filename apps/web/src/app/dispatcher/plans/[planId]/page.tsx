"use client";

import { use } from "react";
import { useRoutePlan } from "@/features/routing/route-planning";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { PlanHeader } from "./components/PlanHeader";
import { RouteGlance } from "./components/RouteGlance";
import { SegmentTimeline } from "./components/SegmentTimeline";
import { SallyDecisions } from "./components/SallyDecisions";
import { LoadDetails } from "./components/LoadDetails";

export default function PlanDetailPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = use(params);
  const { data: plan, isLoading, error } = useRoutePlan(planId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div>
        <Alert variant="destructive">
          <AlertDescription>
            {error ? `Failed to load plan: ${(error as Error).message}` : "Plan not found."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header: back, plan ID, status, activate + context card with stats */}
      <PlanHeader plan={plan} />

      {/* Feasibility warning */}
      {!plan.isFeasible && plan.feasibilityIssues?.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <strong>Feasibility Issues:</strong>
            <ul className="list-disc list-inside mt-1">
              {plan.feasibilityIssues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Load details — the "why" of the route */}
      {plan.loads && plan.loads.length > 0 && (
        <LoadDetails loads={plan.loads} />
      )}

      {/* Route Glance — at-a-glance node path */}
      <RouteGlance segments={plan.segments} />

      {/* Segment Timeline — the core view */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Route Segments</h2>
        <SegmentTimeline segments={plan.segments} planStatus={plan.status} />
      </div>

      {/* Bottom section: Map + SALLY decisions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map placeholder */}
        <Card className="lg:col-span-2">
          <CardContent className="flex items-center justify-center h-64 md:h-80 text-muted-foreground text-sm">
            Map view coming soon
          </CardContent>
        </Card>

        {/* SALLY decisions */}
        <SallyDecisions plan={plan} />
      </div>
    </div>
  );
}
