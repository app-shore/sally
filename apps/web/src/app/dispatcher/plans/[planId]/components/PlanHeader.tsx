"use client";

import { ArrowLeft, User, Truck, Clock, Gauge, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
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
import { useActivateRoute, useCancelRoute } from "@/features/routing/route-planning";
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

function formatHours(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function PlanHeader({ plan }: PlanHeaderProps) {
  const router = useRouter();
  const activateRoute = useActivateRoute();
  const cancelRoute = useCancelRoute();
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

  const handleDiscard = async () => {
    try {
      await cancelRoute.mutateAsync(plan.planId);
      router.push("/dispatcher/plans");
    } catch {
      // Error handled by mutation state
    }
  };

  return (
    <div className="space-y-4">
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
          <div className="flex items-center gap-2">
            {/* Discard */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950"
                  disabled={cancelRoute.isPending}
                >
                  {cancelRoute.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Discarding...
                    </div>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      Discard
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Discard this plan?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will cancel route {plan.planId}. The loads will remain
                    available for a new plan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Plan</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDiscard}
                    className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                  >
                    Discard
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Activate */}
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
          </div>
        ) : null}
      </div>

      {/* Context card: driver, vehicle, departure, priority, preferences + stats */}
      <Card>
        <CardContent className="py-3 px-4">
          {/* Row 1: Driver · Vehicle · Departure → Arrival · Priority — spread across */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {plan.driver && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Driver</div>
                <div className="flex items-center gap-1.5 text-foreground">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{plan.driver.name}</span>
                </div>
              </div>
            )}
            {plan.vehicle && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Vehicle</div>
                <div className="flex items-center gap-1.5 text-foreground">
                  <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>#{plan.vehicle.unitNumber}</span>
                </div>
              </div>
            )}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Schedule</div>
              <div className="flex items-center gap-1.5 text-foreground">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  {new Date(plan.departureTime).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {plan.estimatedArrival && (
                    <>
                      {" → "}
                      {new Date(plan.estimatedArrival).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </>
                  )}
                </span>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Priority</div>
              <div className="flex items-center gap-1.5 text-foreground">
                <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{formatPriority(plan.optimizationPriority)}</span>
              </div>
            </div>
          </div>

          {/* Preferences pills */}
          {params && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              <Badge variant="outline" className="text-[10px] px-2 py-0 font-normal">
                {formatRestType(params.preferredRestType)}
              </Badge>
              {params.avoidTollRoads && (
                <Badge variant="outline" className="text-[10px] px-2 py-0 font-normal">
                  Avoid tolls
                </Badge>
              )}
              {params.maxDetourMilesForFuel && (
                <Badge variant="outline" className="text-[10px] px-2 py-0 font-normal">
                  Max {params.maxDetourMilesForFuel}mi fuel detour
                </Badge>
              )}
            </div>
          )}

          <Separator className="my-3" />

          {/* Stats strip — spread across */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-semibold text-foreground">
                {plan.totalDistanceMiles.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-muted-foreground ml-1">mi</span>
            </div>
            <div>
              <span className="font-semibold text-foreground">
                {formatHours(plan.totalTripTimeHours)}
              </span>
              <span className="text-muted-foreground ml-1">trip</span>
            </div>
            <div>
              <span className="font-semibold text-foreground">
                {plan.totalDrivingDays}
              </span>
              <span className="text-muted-foreground ml-1">
                {plan.totalDrivingDays === 1 ? "day" : "days"}
              </span>
            </div>
            <div>
              <span className="font-semibold text-foreground">
                ${plan.totalCostEstimate.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-muted-foreground ml-1">est.</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
