"use client";

/**
 * Driver HOS Summary - Simple HOS summary for drivers
 *
 * Shows:
 * - Simple 3-bar progress (drive, on-duty, since-break)
 * - Large text for readability
 * - Warnings if approaching limits
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import type { RoutePlan } from "@/features/routing/route-planning";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface DriverHOSSummaryProps {
  plan: RoutePlan;
}

export default function DriverHOSSummary({ plan }: DriverHOSSummaryProps) {
  const { compliance_report } = plan;

  const driveHours = compliance_report.max_drive_hours_used;
  const driveLimit = 11;
  const drivePercent = (driveHours / driveLimit) * 100;

  const onDutyHours = compliance_report.max_duty_hours_used;
  const onDutyLimit = 14;
  const onDutyPercent = (onDutyHours / onDutyLimit) * 100;

  // Placeholder for since break
  const sinceBreakHours = 0;
  const sinceBreakLimit = 8;
  const sinceBreakPercent = (sinceBreakHours / sinceBreakLimit) * 100;

  const getStatusColor = (percent: number): string => {
    if (percent >= 90) return "bg-red-600 dark:bg-red-700";
    if (percent >= 75) return "bg-yellow-500 dark:bg-yellow-600";
    return "bg-green-600 dark:bg-green-700";
  };

  const getWarning = (percent: number) => {
    if (percent >= 90) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Limit Approaching
        </Badge>
      );
    }
    if (percent >= 75) {
      return (
        <Badge className="flex items-center gap-1 bg-yellow-500 dark:bg-yellow-600">
          <AlertTriangle className="h-3 w-3" />
          Watch Limit
        </Badge>
      );
    }
    return (
      <Badge className="flex items-center gap-1 bg-green-600 dark:bg-green-700">
        <CheckCircle2 className="h-3 w-3" />
        Good
      </Badge>
    );
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg">Hours of Service</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Drive Hours */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-medium text-foreground">Drive Hours</span>
            {getWarning(drivePercent)}
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-6">
            <div
              className={`h-6 rounded-full transition-all ${getStatusColor(drivePercent)}`}
              style={{ width: `${Math.min(drivePercent, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {driveHours.toFixed(1)} / {driveLimit} hours
            </span>
            <span className="font-semibold text-foreground">{Math.round(drivePercent)}%</span>
          </div>
        </div>

        {/* On-Duty Time */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-medium text-foreground">On-Duty Time</span>
            {getWarning(onDutyPercent)}
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-6">
            <div
              className={`h-6 rounded-full transition-all ${getStatusColor(onDutyPercent)}`}
              style={{ width: `${Math.min(onDutyPercent, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {onDutyHours.toFixed(1)} / {onDutyLimit} hours
            </span>
            <span className="font-semibold text-foreground">{Math.round(onDutyPercent)}%</span>
          </div>
        </div>

        {/* Since Break */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-medium text-foreground">Time Since Break</span>
            {getWarning(sinceBreakPercent)}
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-6">
            <div
              className={`h-6 rounded-full transition-all ${getStatusColor(sinceBreakPercent)}`}
              style={{ width: `${Math.min(sinceBreakPercent, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {sinceBreakHours.toFixed(1)} / {sinceBreakLimit} hours
            </span>
            <span className="font-semibold text-foreground">{Math.round(sinceBreakPercent)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
