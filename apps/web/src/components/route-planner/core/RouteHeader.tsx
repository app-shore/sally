"use client";

/**
 * Route Header - Plan metadata banner
 *
 * Displays key plan information:
 * - Load number and customer
 * - Driver name
 * - Vehicle identifier
 * - Plan status badges
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { RoutePlan } from "@/lib/types/routePlan";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface RouteHeaderProps {
  plan: RoutePlan;
}

export default function RouteHeader({ plan }: RouteHeaderProps) {
  const { input_snapshot, is_feasible, feasibility_issues, plan_version } = plan;

  // Status badge
  const StatusBadge = () => {
    if (!is_feasible) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Not Feasible
        </Badge>
      );
    }

    if (feasibility_issues.length > 0) {
      return (
        <Badge className="flex items-center gap-1 bg-yellow-500 dark:bg-yellow-600">
          <AlertTriangle className="h-3 w-3" />
          Warnings
        </Badge>
      );
    }

    return (
      <Badge className="flex items-center gap-1 bg-green-600 dark:bg-green-700">
        <CheckCircle2 className="h-3 w-3" />
        Feasible
      </Badge>
    );
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left: Plan metadata */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">
                {input_snapshot?.load_number ? (
                  <>
                    Load <span className="text-primary">#{input_snapshot.load_number}</span>
                  </>
                ) : (
                  <>Route Plan</>
                )}
              </h2>
              <StatusBadge />
              {plan_version > 1 && (
                <Badge variant="outline">Version {plan_version}</Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {input_snapshot?.customer_name && (
                <div>
                  <span className="font-medium">Customer:</span> {input_snapshot.customer_name}
                </div>
              )}
              {input_snapshot?.driver_id && (
                <div>
                  <span className="font-medium">Driver:</span> {input_snapshot.driver_id}
                </div>
              )}
              {input_snapshot?.vehicle_id && (
                <div>
                  <span className="font-medium">Vehicle:</span> {input_snapshot.vehicle_id}
                </div>
              )}
            </div>
          </div>

          {/* Right: Quick stats */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {plan.total_distance_miles.toFixed(0)}
              </div>
              <div className="text-muted-foreground">Miles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {plan.total_time_hours.toFixed(1)}
              </div>
              <div className="text-muted-foreground">Hours</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {plan.rest_stops.length}
              </div>
              <div className="text-muted-foreground">Rest Stops</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
