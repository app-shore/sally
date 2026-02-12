"use client";

import { Card, CardContent } from "@/shared/components/ui/card";
import type { RoutePlanResult } from "@/features/routing/route-planning";

interface PlanSummaryStatsProps {
  plan: RoutePlanResult;
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function PlanSummaryStats({ plan }: PlanSummaryStatsProps) {
  const stats = [
    {
      value: plan.totalDistanceMiles.toLocaleString(undefined, {
        maximumFractionDigits: 0,
      }),
      unit: "mi",
      label: "Distance",
    },
    {
      value: formatHours(plan.totalTripTimeHours),
      unit: "",
      label: "Trip Time",
    },
    {
      value: plan.totalDrivingDays.toString(),
      unit: plan.totalDrivingDays === 1 ? "day" : "days",
      label: "Driving",
    },
    {
      value: `$${plan.totalCostEstimate.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`,
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
                <span className="text-base font-normal text-muted-foreground ml-1">
                  {stat.unit}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stat.label}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
