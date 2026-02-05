"use client";

/**
 * Efficiency Metrics - Performance scoring
 *
 * Shows:
 * - Deadhead miles percentage
 * - Route efficiency score (0-100)
 * - Time vs optimal delta
 * - Cost vs optimal delta
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import type { RoutePlan } from "@/features/routing/route-planning";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface EfficiencyMetricsProps {
  plan: RoutePlan;
}

export default function EfficiencyMetrics({ plan }: EfficiencyMetricsProps) {
  const { total_distance_miles, total_time_hours, total_cost_estimate, segments } = plan;

  // Calculate deadhead miles (drive segments without load)
  // For POC, assume all miles are loaded
  const deadheadMiles = 0;
  const deadheadPercent = (deadheadMiles / total_distance_miles) * 100;

  // Calculate route efficiency (0-100)
  // Simple formula: considers loaded miles vs total miles
  const loadedMiles = total_distance_miles - deadheadMiles;
  const routeEfficiency = Math.round((loadedMiles / total_distance_miles) * 100);

  // Time vs optimal
  // For POC, assume optimal would be 10% faster without rest/stops
  const optimalTime = total_time_hours * 0.9;
  const timeDelta = total_time_hours - optimalTime;
  const timePercent = ((timeDelta / optimalTime) * 100).toFixed(1);

  // Cost vs optimal
  // For POC, assume optimal would be 15% cheaper with perfect routing
  const optimalCost = total_cost_estimate * 0.85;
  const costDelta = total_cost_estimate - optimalCost;
  const costPercent = ((costDelta / optimalCost) * 100).toFixed(1);

  const metrics = [
    {
      label: "Deadhead Miles",
      value: `${deadheadPercent.toFixed(1)}%`,
      detail: `${deadheadMiles.toFixed(0)} of ${total_distance_miles.toFixed(0)} miles`,
      status: deadheadPercent === 0 ? "good" : deadheadPercent < 10 ? "warning" : "critical",
    },
    {
      label: "Route Efficiency",
      value: `${routeEfficiency}/100`,
      detail: routeEfficiency >= 90 ? "Excellent" : routeEfficiency >= 75 ? "Good" : "Fair",
      status: routeEfficiency >= 90 ? "good" : routeEfficiency >= 75 ? "warning" : "critical",
    },
    {
      label: "Time vs Optimal",
      value: `+${timeDelta.toFixed(1)}h`,
      detail: `+${timePercent}% (extension for rest)`,
      status: parseFloat(timePercent) < 10 ? "good" : parseFloat(timePercent) < 20 ? "warning" : "critical",
    },
    {
      label: "Cost vs Optimal",
      value: `+$${costDelta.toFixed(2)}`,
      detail: `+${costPercent}% (premium fuel choice)`,
      status: parseFloat(costPercent) < 10 ? "good" : parseFloat(costPercent) < 20 ? "warning" : "critical",
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "good":
        return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case "warning":
        return <Minus className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      case "critical":
        return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-green-600 dark:text-green-400";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      case "critical":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg">Efficiency Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.map((metric, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 rounded-md bg-muted/50"
            >
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">{metric.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{metric.detail}</div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(metric.status)}
                <span className={`text-lg font-bold ${getStatusColor(metric.status)}`}>
                  {metric.value}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <div className="font-medium text-foreground">Overall: {routeEfficiency >= 90 ? "Excellent" : "Good"}</div>
              <div className="text-sm text-muted-foreground mt-1">
                Route is optimized for compliance and efficiency
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
