"use client";

import { CloudRain } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import type { WeatherAlert } from "@/features/routing/route-planning";

interface WeatherAlertsCardProps {
  alerts: WeatherAlert[];
}

function getSeverityVariant(
  severity: string
): "default" | "muted" | "destructive" | "outline" {
  switch (severity) {
    case "severe":
      return "destructive";
    case "moderate":
      return "default";
    default:
      return "muted";
  }
}

export function WeatherAlertsCard({ alerts }: WeatherAlertsCardProps) {
  if (alerts.length === 0) return null;

  return (
    <Card className="border-yellow-500/30 dark:border-yellow-400/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CloudRain className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
          {alerts.length} Weather Alert{alerts.length > 1 ? "s" : ""} Along
          Route
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {alerts.map((alert, i) => (
          <div key={i} className="flex items-start gap-3 text-sm">
            <Badge
              variant={getSeverityVariant(alert.severity)}
              className="text-xs mt-0.5"
            >
              {alert.severity}
            </Badge>
            <div>
              <span className="text-foreground capitalize">
                {alert.condition}
              </span>
              <span className="text-muted-foreground">
                {" "}
                &mdash; {alert.description}
              </span>
              {alert.driveTimeMultiplier > 1 && (
                <span className="text-muted-foreground">
                  {" "}
                  (+{Math.round((alert.driveTimeMultiplier - 1) * 100)}% drive
                  time)
                </span>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
