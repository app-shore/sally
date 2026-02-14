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

function PlanStats({ plan }: { plan: { totalDistanceMiles: number; totalTripTimeHours: number; totalDrivingDays: number; totalCostEstimate: number } }) {
  function formatHours(hours: number) {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  const stats = [
    {
      value: plan.totalDistanceMiles.toLocaleString(undefined, { maximumFractionDigits: 0 }),
      unit: "mi",
      label: "Distance",
    },
    { value: formatHours(plan.totalTripTimeHours), unit: "", label: "Trip Time" },
    {
      value: plan.totalDrivingDays.toString(),
      unit: plan.totalDrivingDays === 1 ? "day" : "days",
      label: "Duration",
    },
    {
      value: `$${plan.totalCostEstimate.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      unit: "",
      label: "Est. Cost",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">
              {stat.value}
              {stat.unit && (
                <span className="text-base font-normal text-muted-foreground ml-1">{stat.unit}</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function PlanDetailPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = use(params);
  const { data: plan, isLoading, error } = useRoutePlan(planId);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-6 px-4 md:px-6 space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="max-w-5xl mx-auto py-6 px-4 md:px-6">
        <Alert variant="destructive">
          <AlertDescription>
            {error ? `Failed to load plan: ${(error as Error).message}` : "Plan not found."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 md:px-6 space-y-6">
      {/* Header: back, plan ID, status, activate, driver/vehicle/preferences */}
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

      {/* Stats row */}
      <PlanStats plan={plan} />

      {/* Route Glance — at-a-glance node path */}
      <RouteGlance segments={plan.segments} />

      {/* Segment Timeline — the core view */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Route Segments</h2>
        <SegmentTimeline segments={plan.segments} />
      </div>

      {/* Bottom section: Map placeholder + SALLY decisions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Map placeholder */}
        <Card>
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
