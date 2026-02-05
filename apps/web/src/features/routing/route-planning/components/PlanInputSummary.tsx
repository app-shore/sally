"use client";

import { Card } from "@/shared/components/ui/card";
import { useRoutePlanStore } from "@/features/routing/route-planning";

/**
 * Displays the input values that were used to generate the current plan
 * This provides audit trail and helps understand what parameters produced this route
 */
export function PlanInputSummary() {
  const { currentPlan } = useRoutePlanStore();

  if (!currentPlan?.input_snapshot) {
    return null;
  }

  const snapshot = currentPlan.input_snapshot;

  return (
    <Card className="p-4 bg-muted border-border">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Plan Input Summary</h4>
          <span className="text-xs text-muted-foreground">
            Generated {new Date(snapshot.generated_at).toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {/* Load Information */}
          {snapshot.load_id && (
            <div className="col-span-2 p-2 bg-background rounded border border-border">
              <div className="text-xs text-muted-foreground mb-1">Load</div>
              <div className="font-medium text-foreground">
                {snapshot.load_number} - {snapshot.customer_name}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{snapshot.stops_count} stops</div>
            </div>
          )}

          {/* Scenario Information */}
          {snapshot.scenario_id && (
            <div className="col-span-2 p-2 bg-blue-50 dark:bg-blue-900 rounded border border-blue-200 dark:border-blue-700">
              <div className="text-xs text-blue-700 dark:text-blue-300 mb-1">Scenario</div>
              <div className="font-medium text-blue-900 dark:text-blue-100">{snapshot.scenario_name}</div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{snapshot.scenario_id}</div>
            </div>
          )}

          {/* Driver Information */}
          <div className="p-2 bg-background rounded border border-border">
            <div className="text-xs text-muted-foreground mb-1">Driver</div>
            <div className="font-medium text-foreground">{snapshot.driver_id}</div>
            <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
              <div>Driven: {snapshot.driver_state.hours_driven.toFixed(1)}h</div>
              <div>On-Duty: {snapshot.driver_state.on_duty_time.toFixed(1)}h</div>
              <div>Since Break: {snapshot.driver_state.hours_since_break.toFixed(1)}h</div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="p-2 bg-background rounded border border-border">
            <div className="text-xs text-muted-foreground mb-1">Vehicle</div>
            <div className="font-medium text-foreground">{snapshot.vehicle_id}</div>
            <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
              <div>
                Fuel: {snapshot.vehicle_state.current_fuel_gallons.toFixed(0)} /{" "}
                {snapshot.vehicle_state.fuel_capacity_gallons.toFixed(0)} gal
              </div>
              <div>MPG: {snapshot.vehicle_state.mpg.toFixed(1)}</div>
              <div>
                Range: ~
                {(
                  snapshot.vehicle_state.current_fuel_gallons * snapshot.vehicle_state.mpg
                ).toFixed(0)}{" "}
                mi
              </div>
            </div>
          </div>

          {/* Optimization Priority */}
          <div className="col-span-2 p-2 bg-background rounded border border-border">
            <div className="text-xs text-muted-foreground mb-1">Optimization</div>
            <div className="font-medium text-foreground capitalize">
              {snapshot.optimization_priority.replace("_", " ")}
            </div>
          </div>
        </div>

        {/* No Scenario Notice */}
        {!snapshot.scenario_id && (
          <div className="text-xs text-muted-foreground italic">
            Generated with manual driver/vehicle entry (no scenario used)
          </div>
        )}
      </div>
    </Card>
  );
}

export default PlanInputSummary;
