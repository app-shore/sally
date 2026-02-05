"use client";

/**
 * Cost Breakdown Chart - Recharts pie chart
 *
 * Shows cost distribution:
 * - Fuel costs (sum of fuel_cost_estimate)
 * - Time costs (total_time_hours × $25/hr configurable rate)
 * - Delay costs (if applicable)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import type { RoutePlan } from "@/features/routing/route-planning";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface CostBreakdownChartProps {
  plan: RoutePlan;
}

// Configurable cost rates
const HOURLY_RATE = 25; // $/hour for driver time
const DELAY_COST_PER_HOUR = 50; // $/hour for delays

export default function CostBreakdownChart({ plan }: CostBreakdownChartProps) {
  const { segments, total_time_hours, total_cost_estimate } = plan;

  // Calculate cost breakdown
  const fuelCost = segments
    .filter((s) => s.segment_type === "fuel")
    .reduce((sum, s) => sum + (s.fuel_cost_estimate || 0), 0);

  const timeCost = total_time_hours * HOURLY_RATE;

  // Delay cost (placeholder - would come from trigger impacts)
  const delayCost = 0;

  const data = [
    {
      name: "Fuel",
      value: fuelCost,
      color: "#f97316", // orange
    },
    {
      name: "Driver Time",
      value: timeCost,
      color: "#3b82f6", // blue
    },
    ...(delayCost > 0
      ? [
          {
            name: "Delays",
            value: delayCost,
            color: "#ef4444", // red
          },
        ]
      : []),
  ];

  const COLORS = data.map((d) => d.color);

  // Custom label
  const renderLabel = (entry: any) => {
    const percent = ((entry.value / total_cost_estimate) * 100).toFixed(0);
    return `${percent}%`;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg">Cost Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Total */}
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground">
              ${total_cost_estimate.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">Total Estimated Cost</div>
          </div>

          {/* Pie Chart */}
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => `$${value.toFixed(2)}`}
                contentStyle={{
                  backgroundColor: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>

          {/* Cost Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-md bg-orange-50 dark:bg-orange-950/20">
              <span className="text-sm font-medium text-foreground">Fuel Costs</span>
              <span className="text-sm font-bold text-foreground">${fuelCost.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-blue-50 dark:bg-blue-950/20">
              <span className="text-sm font-medium text-foreground">
                Driver Time ({total_time_hours.toFixed(1)}h × ${HOURLY_RATE}/h)
              </span>
              <span className="text-sm font-bold text-foreground">${timeCost.toFixed(2)}</span>
            </div>
            {delayCost > 0 && (
              <div className="flex items-center justify-between p-3 rounded-md bg-red-50 dark:bg-red-950/20">
                <span className="text-sm font-medium text-foreground">Delay Costs</span>
                <span className="text-sm font-bold text-foreground">${delayCost.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
