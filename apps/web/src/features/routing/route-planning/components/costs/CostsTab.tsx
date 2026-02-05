"use client";

/**
 * Costs Tab - Financial breakdown view
 *
 * Cost analysis and optimization metrics:
 * - Cost breakdown chart (fuel, time, delays)
 * - Fuel stop details with alternatives
 * - Efficiency metrics
 */

import type { RoutePlan } from "@/features/routing/route-planning";
import CostBreakdownChart from "./CostBreakdownChart";
import FuelStopDetails from "./FuelStopDetails";
import EfficiencyMetrics from "./EfficiencyMetrics";

interface CostsTabProps {
  plan: RoutePlan;
}

export default function CostsTab({ plan }: CostsTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost breakdown chart */}
        <CostBreakdownChart plan={plan} />

        {/* Efficiency metrics */}
        <EfficiencyMetrics plan={plan} />
      </div>

      {/* Fuel stop details */}
      <FuelStopDetails plan={plan} />
    </div>
  );
}
