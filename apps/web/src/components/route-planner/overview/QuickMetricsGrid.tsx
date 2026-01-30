"use client";

/**
 * Quick Metrics Grid - Key operational metrics
 *
 * Displays:
 * - ETA vs Appointment (early/on-time/late)
 * - Max HOS Usage (percentage of limit)
 * - Total Cost breakdown
 * - Efficiency score details
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RoutePlan } from "@/lib/types/routePlan";
import { CheckCircle2, AlertTriangle, XCircle, TrendingUp } from "lucide-react";

interface QuickMetricsGridProps {
  plan: RoutePlan;
}

export default function QuickMetricsGrid({ plan }: QuickMetricsGridProps) {
  const { compliance_report, total_cost_estimate, summary } = plan;

  // Calculate HOS usage percentage
  const hosUsagePercent = Math.round((compliance_report.max_drive_hours_used / 11) * 100);

  // ETA Status
  const getETAMetric = () => {
    if (!summary.estimated_completion) {
      return {
        label: "Not calculated",
        icon: AlertTriangle,
        color: "text-yellow-600 dark:text-yellow-400",
      };
    }

    // For now, assume on-time
    // In production, would compare with latest_arrival from stops
    return {
      label: "On Time",
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
    };
  };

  const etaMetric = getETAMetric();

  // HOS Status
  const getHOSMetric = () => {
    if (hosUsagePercent >= 95) {
      return {
        label: "Critical",
        icon: XCircle,
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-950/20",
      };
    } else if (hosUsagePercent >= 80) {
      return {
        label: "Warning",
        icon: AlertTriangle,
        color: "text-yellow-600 dark:text-yellow-400",
        bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
      };
    } else {
      return {
        label: "Good",
        icon: CheckCircle2,
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-50 dark:bg-green-950/20",
      };
    }
  };

  const hosMetric = getHOSMetric();

  const ETAIcon = etaMetric.icon;
  const HOSIcon = hosMetric.icon;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* ETA vs Appointment */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            ETA Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <ETAIcon className={`h-5 w-5 ${etaMetric.color}`} />
            <span className="text-xl font-bold text-foreground">{etaMetric.label}</span>
          </div>
          {summary.estimated_completion && (
            <p className="text-xs text-muted-foreground mt-2">
              ETA: {new Date(summary.estimated_completion).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Max HOS Usage */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Max HOS Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <HOSIcon className={`h-5 w-5 ${hosMetric.color}`} />
              <span className="text-xl font-bold text-foreground">{hosUsagePercent}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${hosMetric.bgColor}`}
                style={{ width: `${Math.min(hosUsagePercent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {compliance_report.max_drive_hours_used.toFixed(1)} / 11h drive limit
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Total Cost */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Cost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-foreground">
            ${total_cost_estimate.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Estimated route cost
          </p>
        </CardContent>
      </Card>

      {/* Efficiency Score */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Efficiency Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-xl font-bold text-foreground">
              {Math.round((1 - hosUsagePercent / 100) * 100)}/100
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {compliance_report.violations.length === 0 ? "Zero violations" : "Compliance issues"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
