"use client";

import { useState, useEffect } from "react";
import { Activity, AlertTriangle, Clock, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { useCommandCenterOverview } from "@/features/operations/command-center";
import type { ActiveRoute } from "@/features/operations/command-center";
import type { MonitoringTriggerEvent, MonitoringCycleEvent } from "@/features/operations/monitoring";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ETA_STATUS_STYLES = {
  on_time: { label: "On Time", className: "text-green-600 dark:text-green-400" },
  at_risk: { label: "At Risk", className: "text-yellow-600 dark:text-yellow-400" },
  late: { label: "Late", className: "text-red-600 dark:text-red-400" },
} as const;

const SEVERITY_STYLES = {
  critical: "text-red-600 dark:text-red-400",
  high: "text-yellow-600 dark:text-yellow-400",
  medium: "text-yellow-600 dark:text-yellow-400",
  low: "text-blue-600 dark:text-blue-400",
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TriggerFeedEntry {
  id: string;
  time: string;
  triggerType: string;
  severity: string;
  driverName: string;
  detail: string;
  requiresReplan: boolean;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MonitoringPage() {
  const { data: overview, isLoading } = useCommandCenterOverview();
  const [lastCycle, setLastCycle] = useState<MonitoringCycleEvent | null>(null);
  const [triggerFeed, setTriggerFeed] = useState<TriggerFeedEntry[]>([]);

  // Listen for SSE events via CustomEvent dispatched by use-sse
  useEffect(() => {
    const handleCycle = ((event: CustomEvent<MonitoringCycleEvent>) => {
      setLastCycle(event.detail);
    }) as EventListener;

    const handleTrigger = ((event: CustomEvent<MonitoringTriggerEvent>) => {
      const entry: TriggerFeedEntry = {
        id: `${Date.now()}-${Math.random()}`,
        time: new Date(event.detail.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        triggerType: event.detail.triggerType,
        severity: event.detail.severity,
        driverName: (event.detail.params?.driverName as string) ?? "Unknown",
        detail: formatTriggerDetail(event.detail),
        requiresReplan: event.detail.requiresReplan,
      };
      setTriggerFeed((prev) => [entry, ...prev].slice(0, 50));
    }) as EventListener;

    window.addEventListener("monitoring:cycle_complete", handleCycle);
    window.addEventListener("monitoring:trigger_fired", handleTrigger);
    return () => {
      window.removeEventListener("monitoring:cycle_complete", handleCycle);
      window.removeEventListener("monitoring:trigger_fired", handleTrigger);
    };
  }, []);

  const activeRoutes = overview?.active_routes ?? [];
  const routeCount = activeRoutes.length;

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <h1 className="text-xl md:text-2xl font-semibold text-foreground">Monitoring</h1>

      {/* Section 1: Pulse Strip */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
              </span>
              <span className="font-medium text-foreground">Monitoring Active</span>
              <Separator orientation="vertical" className="h-5 hidden sm:block" />
              <span className="text-sm text-muted-foreground">{routeCount} routes</span>
              <span className="text-sm text-muted-foreground">14 checks</span>
              {lastCycle && (
                <span className="text-sm text-muted-foreground">
                  Last: {formatTimeSince(lastCycle.timestamp)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-sm text-muted-foreground">Samsara ELD: Connected</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 2: Recent Triggers Feed */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] md:h-[500px]">
                {triggerFeed.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Activity className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No triggers yet</p>
                    <p className="text-xs">Waiting for monitoring cycle...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {triggerFeed.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-2 py-2 border-b border-border last:border-0">
                        <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">{entry.time}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-medium ${SEVERITY_STYLES[entry.severity as keyof typeof SEVERITY_STYLES] ?? ""}`}>
                              {entry.triggerType}
                            </span>
                            {entry.requiresReplan && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">replan</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{entry.driverName} — {entry.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Section 3: Route Health Cards */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Route Health</CardTitle>
            </CardHeader>
            <CardContent>
              {activeRoutes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Truck className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No active routes</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeRoutes.map((route) => (
                    <RouteHealthCard key={route.route_id} route={route} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function RouteHealthCard({ route }: { route: ActiveRoute }) {
  const etaStyle = ETA_STATUS_STYLES[route.eta_status];

  return (
    <Card className="border">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm text-foreground truncate">
            {route.driver.name}
          </span>
          <span className={`text-xs font-medium ${etaStyle.className}`}>
            {etaStyle.label}
          </span>
        </div>

        <div className="text-xs text-muted-foreground">
          Segment {route.progress.completed_stops}/{route.progress.total_stops} · {route.status.replace("_", " ")}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>HOS: {route.hos.drive_hours_remaining.toFixed(1)}h drive remaining</span>
        </div>

        {route.active_alert_count > 0 && (
          <div className="flex items-center gap-1 text-xs">
            <AlertTriangle className="h-3 w-3 text-yellow-500" />
            <span className="text-yellow-600 dark:text-yellow-400">
              {route.active_alert_count} alert{route.active_alert_count !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Progress bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
          <div
            className="bg-foreground h-1.5 rounded-full transition-all"
            style={{ width: `${Math.round((route.progress.completed_stops / Math.max(route.progress.total_stops, 1)) * 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimeSince(timestamp: string): string {
  const seconds = Math.round((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
}

function formatTriggerDetail(event: MonitoringTriggerEvent): string {
  const p = event.params;
  switch (event.triggerType) {
    case "HOS_APPROACHING_LIMIT":
      return `${p.remainingMinutes}m ${p.hoursType} remaining`;
    case "HOS_VIOLATION":
      return `${p.hoursType} limit exceeded`;
    case "BREAK_REQUIRED":
      return "30-min break required";
    case "ROUTE_DELAY":
      return `ETA +${p.delayMinutes}min`;
    case "DRIVER_NOT_MOVING":
      return `Stopped ${p.stoppedMinutes}min`;
    case "FUEL_LOW":
      return `${p.fuelPercent}% remaining`;
    case "DOCK_TIME_EXCEEDED":
      return `+${p.excessMinutes}min at dock`;
    default:
      return event.triggerType.replace(/_/g, " ").toLowerCase();
  }
}
