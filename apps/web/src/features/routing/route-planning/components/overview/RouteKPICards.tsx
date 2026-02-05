"use client";

/**
 * Route KPI Cards - Key performance indicator cards
 *
 * Displays 6 key metrics:
 * 1. Total Distance (miles)
 * 2. Total Time (hours)
 * 3. HOS Status (compliant/violations)
 * 4. Total Cost (estimate)
 * 5. Efficiency Score (0-100)
 * 6. ETA Status (on-time/early/late)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import type { RoutePlan } from "@/features/routing/route-planning";
import {
  Navigation,
  Clock,
  Shield,
  DollarSign,
  TrendingUp,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";

interface RouteKPICardsProps {
  plan: RoutePlan;
}

export default function RouteKPICards({ plan }: RouteKPICardsProps) {
  const {
    total_distance_miles,
    total_time_hours,
    total_cost_estimate,
    compliance_report,
    summary,
  } = plan;

  // Calculate efficiency score (0-100)
  // Simple formula: considers HOS usage efficiency
  const calculateEfficiencyScore = (): number => {
    if (!compliance_report || compliance_report.max_drive_hours_used == null) return 0;

    const hosEfficiency = (1 - compliance_report.max_drive_hours_used / 11) * 100;
    const breakCompliance = compliance_report.breaks_planned >= compliance_report.breaks_required ? 100 : 50;

    return Math.round((hosEfficiency * 0.6 + breakCompliance * 0.4));
  };

  const efficiencyScore = calculateEfficiencyScore();

  // Safe number formatting
  const formatNumber = (value: number | null | undefined, decimals: number = 0): string => {
    return value != null ? value.toFixed(decimals) : 'N/A';
  };

  // Format ETA status
  const getETAStatus = (): { label: string; variant: "default" | "secondary" | "destructive" } => {
    if (!summary.estimated_completion) {
      return { label: "N/A", variant: "secondary" };
    }

    // For now, assume on-time (would compare with latest_arrival in real implementation)
    return { label: "On Time", variant: "default" };
  };

  const etaStatus = getETAStatus();

  const kpis = [
    {
      title: "Total Distance",
      value: total_distance_miles != null ? `${total_distance_miles.toFixed(0)} mi` : 'N/A',
      icon: Navigation,
      description: `${plan.segments.filter((s) => s.segment_type === "drive").length} driving segments`,
      color: "text-foreground",
    },
    {
      title: "Total Time",
      value: total_time_hours != null ? `${total_time_hours.toFixed(1)} hrs` : 'N/A',
      icon: Clock,
      description: total_time_hours != null
        ? `${Math.floor(total_time_hours)}h ${Math.round((total_time_hours % 1) * 60)}m estimated`
        : 'Not calculated',
      color: "text-foreground",
    },
    {
      title: "HOS Status",
      value: compliance_report && compliance_report.violations
        ? (compliance_report.violations.length === 0 ? "Compliant" : `${compliance_report.violations.length} Issues`)
        : "N/A",
      icon: compliance_report && compliance_report.violations && compliance_report.violations.length === 0 ? CheckCircle2 : AlertTriangle,
      description: compliance_report && compliance_report.violations
        ? (compliance_report.violations.length === 0 ? "Zero violations" : `${compliance_report.violations.length} compliance issues`)
        : "Not calculated",
      color: compliance_report && compliance_report.violations && compliance_report.violations.length === 0
        ? "text-green-600 dark:text-green-400"
        : "text-red-600 dark:text-red-400",
    },
    {
      title: "Total Cost",
      value: total_cost_estimate != null ? `$${total_cost_estimate.toFixed(2)}` : '$0.00',
      icon: DollarSign,
      description: "Estimated route cost",
      color: "text-foreground",
    },
    {
      title: "Efficiency Score",
      value: `${efficiencyScore}/100`,
      icon: TrendingUp,
      description: efficiencyScore >= 80 ? "Excellent" : efficiencyScore >= 60 ? "Good" : "Fair",
      color: efficiencyScore >= 80
        ? "text-green-600 dark:text-green-400"
        : efficiencyScore >= 60
        ? "text-orange-600 dark:text-orange-400"
        : "text-red-600 dark:text-red-400",
    },
    {
      title: "ETA Status",
      value: etaStatus.label,
      icon: Calendar,
      description: summary.estimated_completion
        ? `Est: ${new Date(summary.estimated_completion).toLocaleString()}`
        : "Not calculated",
      color: "text-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <Card key={index} className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Icon className={`h-4 w-4 ${kpi.color}`} />
                {kpi.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
