"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { PlanSummaryStats } from "./PlanSummaryStats";
import { ComplianceCard } from "./ComplianceCard";
import { WeatherAlertsCard } from "./WeatherAlertsCard";
import { DayTimeline } from "./DayTimeline";
import { useActivateRoute } from "@/features/routing/route-planning";
import type { RoutePlanResult as RoutePlanResultType } from "@/features/routing/route-planning";

interface RoutePlanResultProps {
  plan: RoutePlanResultType;
  onNewPlan: () => void;
}

function getStatusVariant(
  status: string
): "default" | "muted" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "cancelled":
      return "destructive";
    default:
      return "muted";
  }
}

/**
 * Groups segments by day using the dailyBreakdown data.
 * Assigns segments to days based on their estimated arrival date.
 */
function groupSegmentsByDay(plan: RoutePlanResultType) {
  const days = plan.dailyBreakdown || [];
  if (days.length === 0) {
    return [
      {
        day: {
          day: 1,
          date: plan.departureTime.split("T")[0],
          driveHours: plan.totalDriveTimeHours,
          onDutyHours: plan.totalTripTimeHours,
          segments: plan.segments.length,
          restStops: 0,
        },
        segments: plan.segments,
      },
    ];
  }

  return days.map((day) => {
    const dayDate = day.date;
    const daySegments = plan.segments.filter((seg) => {
      const segDate = (seg.estimatedArrival || seg.estimatedDeparture || "").split("T")[0];
      return segDate === dayDate;
    });
    return { day, segments: daySegments };
  });
}

export function RoutePlanResult({ plan, onNewPlan }: RoutePlanResultProps) {
  const activateRoute = useActivateRoute();
  const [isActivated, setIsActivated] = useState(false);

  const dayGroups = groupSegmentsByDay(plan);

  const handleActivate = async () => {
    try {
      await activateRoute.mutateAsync(plan.planId);
      setIsActivated(true);
    } catch {
      // Error handled by mutation state
    }
  };

  const currentStatus = isActivated ? "active" : plan.status;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button variant="ghost" size="sm" onClick={onNewPlan}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          New Plan
        </Button>

        {currentStatus !== "active" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={activateRoute.isPending}>
                {activateRoute.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Activating...
                  </div>
                ) : (
                  "Activate Route"
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Activate this route?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will activate route {plan.planId} and deactivate any
                  currently active route for this driver.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleActivate}>
                  Activate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {currentStatus === "active" && (
          <Badge
            variant="default"
            className="bg-green-600 dark:bg-green-500 text-white"
          >
            Activated
          </Badge>
        )}
      </div>

      {/* Plan ID + Status */}
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-xl font-semibold text-foreground">
          {plan.planId}
        </h2>
        <Badge variant={getStatusVariant(currentStatus)}>
          {currentStatus}
        </Badge>
      </div>

      {/* Infeasible Warning */}
      {!plan.isFeasible && (
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

      {/* Activation Error */}
      {activateRoute.isError && (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to activate route. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <PlanSummaryStats plan={plan} />

      {/* Compliance */}
      <ComplianceCard report={plan.complianceReport} />

      {/* Weather Alerts */}
      <WeatherAlertsCard alerts={plan.weatherAlerts} />

      {/* Day-by-Day Timeline */}
      <div className="space-y-4">
        {dayGroups.map(({ day, segments }, index) => (
          <DayTimeline
            key={day.day}
            day={day}
            segments={segments}
            isLastDay={index === dayGroups.length - 1}
          />
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="ghost" onClick={onNewPlan}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Plan Another Route
        </Button>

        {currentStatus !== "active" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={activateRoute.isPending}>
                Activate Route
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Activate this route?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will activate route {plan.planId} and deactivate any
                  currently active route for this driver.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleActivate}>
                  Activate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
