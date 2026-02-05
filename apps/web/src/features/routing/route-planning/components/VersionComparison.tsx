"use client";

import { useRoutePlanStore } from "@/features/routing/route-planning";
import { Card } from "@/shared/components/ui/card";

export function VersionComparison() {
  const { planVersions, currentVersion } = useRoutePlanStore();

  if (planVersions.length < 2) return null;

  const currentPlan = planVersions.find((p) => (p.plan_version || 1) === currentVersion);
  const previousPlan = planVersions.find((p) => (p.plan_version || 1) === currentVersion - 1);

  if (!currentPlan || !previousPlan) return null;

  const calcChange = (current: number, previous: number) => {
    const diff = current - previous;
    return {
      value: diff,
      formatted: diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1),
      color: diff > 0 ? "text-red-600" : diff < 0 ? "text-green-600" : "text-muted-foreground",
    };
  };

  const distanceChange = calcChange(
    currentPlan.total_distance_miles || 0,
    previousPlan.total_distance_miles || 0
  );

  const driveTimeChange = calcChange(
    currentPlan.total_time_hours || 0,
    previousPlan.total_time_hours || 0
  );

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-6">Version Comparison</h2>

      <div className="grid grid-cols-2 gap-6">
        {/* Plan v1 */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Plan v{previousPlan.plan_version || 1}</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Distance</span>
              <span className="font-medium">{previousPlan.total_distance_miles?.toFixed(0)} mi</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Time</span>
              <span className="font-medium">{previousPlan.total_time_hours?.toFixed(1)}h</span>
            </div>
          </div>
        </Card>

        {/* Plan v2 (Current) */}
        <Card className="p-6 border-2 border-blue-500">
          <h3 className="font-semibold mb-4">Plan v{currentPlan.plan_version || 2} (Current)</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Distance</span>
              <div className="text-right">
                <span className="font-medium">{currentPlan.total_distance_miles?.toFixed(0)} mi</span>
                <span className={`ml-2 text-xs ${distanceChange.color}`}>
                  {distanceChange.formatted}
                </span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Time</span>
              <div className="text-right">
                <span className="font-medium">{currentPlan.total_time_hours?.toFixed(1)}h</span>
                <span className={`ml-2 text-xs ${driveTimeChange.color}`}>
                  {driveTimeChange.formatted}h
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Changes Summary</h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Total ETA change: {driveTimeChange.formatted}h</li>
          <li>• Distance: {distanceChange.formatted} miles</li>
        </ul>
      </div>
    </div>
  );
}

export default VersionComparison;
