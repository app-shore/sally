"use client";

import { useRoutePlanStore } from "@/lib/store/routePlanStore";
import { Card } from "@/components/ui/card";

export function RouteSummaryCard() {
  const { currentPlan, currentVersion } = useRoutePlanStore();

  if (!currentPlan) return null;

  const version = currentPlan.plan_version || currentVersion;
  const isFeasible = currentPlan.is_feasible !== false;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Route Plan v{version}</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${isFeasible ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {isFeasible ? "✓ Feasible" : "✗ Not Feasible"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-gray-500">Total Distance</div>
          <div className="text-lg font-semibold">{currentPlan.total_distance_miles?.toFixed(0) || 0} miles</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Total Time</div>
          <div className="text-lg font-semibold">{(currentPlan.total_drive_time_hours + (currentPlan.total_on_duty_time_hours - currentPlan.total_drive_time_hours)).toFixed(1)}h</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Drive Time</div>
          <div className="text-lg font-semibold">{currentPlan.total_drive_time_hours?.toFixed(1) || 0}h</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">On-Duty Time</div>
          <div className="text-lg font-semibold">{currentPlan.total_on_duty_time_hours?.toFixed(1) || 0}h</div>
        </div>
      </div>

      {currentPlan.total_cost_estimate && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">Estimated Cost</div>
          <div className="text-xl font-bold text-gray-900">${currentPlan.total_cost_estimate.toFixed(2)}</div>
        </div>
      )}
    </Card>
  );
}
