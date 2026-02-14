"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
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
import { useActivateRoute } from "@/features/routing/route-planning";
import type { RoutePlanResult } from "@/features/routing/route-planning";

interface PlanHeaderProps {
  plan: RoutePlanResult;
}

function statusVariant(status: string): "default" | "muted" | "destructive" | "outline" {
  switch (status) {
    case "active": return "default";
    case "cancelled": return "destructive";
    case "completed": return "outline";
    default: return "muted";
  }
}

function formatPriority(p?: string) {
  switch (p) {
    case "minimize_time": return "Fastest";
    case "minimize_cost": return "Cheapest";
    default: return "Balanced";
  }
}

function formatRestType(type?: string) {
  switch (type) {
    case "full": return "Full rest";
    case "split_8_2": return "Split 8+2";
    case "split_7_3": return "Split 7+3";
    default: return "Auto rest";
  }
}

export function PlanHeader({ plan }: PlanHeaderProps) {
  const router = useRouter();
  const activateRoute = useActivateRoute();
  const [isActivated, setIsActivated] = useState(false);

  const currentStatus = isActivated ? "active" : plan.status;
  const params = plan.dispatcherParams;

  const handleActivate = async () => {
    try {
      await activateRoute.mutateAsync(plan.planId);
      setIsActivated(true);
    } catch {
      // Error handled by mutation state
    }
  };

  return (
    <div className="space-y-3">
      {/* Top row: back + plan ID + status + activate */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dispatcher/plans")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Route Plans
          </Button>
          <h1 className="text-lg md:text-xl font-semibold text-foreground">{plan.planId}</h1>
          <Badge variant={statusVariant(currentStatus)}>{currentStatus}</Badge>
          {!plan.isFeasible && <Badge variant="destructive">infeasible</Badge>}
        </div>

        {currentStatus === "active" ? (
          <Badge variant="default" className="bg-green-600 dark:bg-green-500 text-white">
            Activated
          </Badge>
        ) : currentStatus === "draft" ? (
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
                <AlertDialogAction onClick={handleActivate}>Activate</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>

      {/* Context row: driver, vehicle, departure, priority */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {plan.driver && (
          <span>Driver: <span className="text-foreground">{plan.driver.name}</span></span>
        )}
        {plan.vehicle && (
          <span>Vehicle: <span className="text-foreground">#{plan.vehicle.unitNumber}</span></span>
        )}
        <span>
          Departure:{" "}
          <span className="text-foreground">
            {new Date(plan.departureTime).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </span>
        <span>Priority: <span className="text-foreground">{formatPriority(plan.optimizationPriority)}</span></span>
      </div>

      {/* Preferences row */}
      {params && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground uppercase tracking-wider">
          <span>{formatRestType(params.preferredRestType)}</span>
          {params.avoidTollRoads && <span>· Avoid tolls</span>}
          {params.maxDetourMilesForFuel && <span>· Max {params.maxDetourMilesForFuel}mi fuel detour</span>}
        </div>
      )}
    </div>
  );
}
