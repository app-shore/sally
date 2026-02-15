"use client";

import {
  MapPin,
  Truck,
  Moon,
  Fuel,
  Coffee,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  useAcknowledgeAlert,
  useResolveAlert,
  useSnoozeAlert,
  useAlerts,
} from "@/features/operations/alerts";
import {
  useRoutePlan,
} from "@/features/routing/route-planning";
import type { RouteSegment, DayBreakdown } from "@/features/routing/route-planning";
import type { ActiveRoute } from "../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ETA_STATUS_CONFIG = {
  on_time: { label: "On Time", className: "text-green-600 dark:text-green-400" },
  at_risk: { label: "At Risk", className: "text-yellow-600 dark:text-yellow-400" },
  late: { label: "Late", className: "text-red-600 dark:text-red-400" },
};

const ROUTE_STATUS_LABELS: Record<string, string> = {
  in_transit: "In Transit",
  at_dock: "At Dock",
  resting: "Resting",
  completed: "Completed",
};

const PRIORITY_BORDER: Record<string, string> = {
  critical: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-yellow-500",
  low: "border-l-blue-500",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hosBarColor(hours: number): string {
  if (hours >= 6) return "bg-green-500 dark:bg-green-400";
  if (hours >= 2) return "bg-yellow-500 dark:bg-yellow-400";
  return "bg-red-500 dark:bg-red-400";
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface RouteDetailSheetProps {
  route: ActiveRoute | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RouteDetailSheet({ route, open, onOpenChange }: RouteDetailSheetProps) {
  const { data: plan, isLoading: planLoading } = useRoutePlan(
    open && route ? route.plan_id : null,
  );
  const { data: alerts = [] } = useAlerts(
    route ? { status: "active", driver_id: route.driver.driver_id } : undefined,
  );
  const acknowledgeMutation = useAcknowledgeAlert();
  const resolveMutation = useResolveAlert();
  const snoozeMutation = useSnoozeAlert();

  const routeAlerts = route
    ? alerts.filter((a) => a.driver_id === route.driver.driver_id)
    : [];

  if (!route) return null;

  const etaConfig = ETA_STATUS_CONFIG[route.eta_status];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            <span className="truncate">{route.driver.name}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {route.vehicle.identifier}
            </span>
            <Badge variant="outline" className="text-xs ml-auto shrink-0">
              {ROUTE_STATUS_LABELS[route.status]}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          {/* Summary Stats — mirrors plan view */}
          {planLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : plan ? (
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                value={`${plan.totalDistanceMiles.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                unit="mi"
                label="Distance"
              />
              <StatCard
                value={formatDuration(plan.totalTripTimeHours)}
                label="Trip Time"
              />
              <StatCard
                value={
                  <span className={etaConfig.className}>
                    {etaConfig.label}
                  </span>
                }
                label="ETA Status"
              />
              <StatCard
                value={`${route.progress.completed_stops}/${route.progress.total_stops}`}
                label="Stops"
              />
            </div>
          ) : (
            /* Fallback when plan can't be loaded — use route data */
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                value={`${route.progress.distance_completed_miles}/${route.progress.total_distance_miles}`}
                unit="mi"
                label="Distance"
              />
              <StatCard
                value={`${route.progress.completed_stops}/${route.progress.total_stops}`}
                label="Stops"
              />
              <StatCard
                value={
                  <span className={etaConfig.className}>
                    {etaConfig.label}
                  </span>
                }
                label="ETA Status"
              />
              <StatCard
                value={`${route.hos.drive_hours_remaining}h`}
                label="HOS Remaining"
              />
            </div>
          )}

          {/* Next stop callout */}
          {route.next_stop && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Next: {route.next_stop.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {route.next_stop.location} · ETA {formatTime(route.next_stop.eta)}
                </p>
              </div>
            </div>
          )}

          {/* HOS Compliance */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              HOS Compliance
            </h3>
            <div className="space-y-2">
              <HOSBar label="Drive" hours={route.hos.drive_hours_remaining} maxHours={11} />
              <HOSBar label="Duty" hours={route.hos.duty_hours_remaining} maxHours={14} />
              <HOSBar label="Cycle" hours={route.hos.cycle_hours_remaining} maxHours={70} />
            </div>
          </div>

          <Separator />

          {/* Timeline — mirrors plan view with progress */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Route Timeline
            </h3>

            {planLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : plan && plan.dailyBreakdown.length > 0 ? (
              <div className="space-y-4">
                {plan.dailyBreakdown.map((day) => {
                  const daySegments = plan.segments.filter((seg) => {
                    const segDate = (seg.estimatedArrival || seg.estimatedDeparture || "").split("T")[0];
                    return segDate === day.date;
                  });
                  return (
                    <LiveDayTimeline
                      key={day.day}
                      day={day}
                      segments={daySegments.length > 0 ? daySegments : plan.segments}
                      completedStops={route.progress.completed_stops}
                    />
                  );
                })}
              </div>
            ) : plan && plan.segments.length > 0 ? (
              /* Fallback: no daily breakdown but have segments */
              <div className="space-y-1">
                {plan.segments
                  .filter((s) => s.segmentType !== "drive")
                  .map((segment, idx) => (
                    <TimelineStop
                      key={segment.segmentId}
                      segment={segment}
                      isCompleted={idx < route.progress.completed_stops}
                    />
                  ))}
              </div>
            ) : (
              /* No plan data — show basic from/to */
              <div className="text-sm text-muted-foreground text-center py-4">
                Timeline unavailable — plan data not loaded
              </div>
            )}
          </div>

          {/* Alerts */}
          {routeAlerts.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Alerts ({routeAlerts.length})
                </h3>
                <div className="space-y-2">
                  {routeAlerts.map((alert) => (
                    <Card
                      key={alert.alert_id}
                      className={`border-l-4 ${PRIORITY_BORDER[alert.priority] ?? "border-l-gray-500"}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Badge
                            variant={alert.priority === "critical" ? "destructive" : "outline"}
                            className="text-xs"
                          >
                            {alert.priority}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {alert.title}
                        </p>
                        {alert.message && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {alert.message}
                          </p>
                        )}
                        {alert.status === "active" && (
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => acknowledgeMutation.mutate(alert.alert_id)}
                              disabled={acknowledgeMutation.isPending}
                              className="h-6 text-xs px-2"
                            >
                              Ack
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                snoozeMutation.mutate({ alertId: alert.alert_id, durationMinutes: 30 })
                              }
                              disabled={snoozeMutation.isPending}
                              className="h-6 text-xs px-2"
                            >
                              Snooze
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() =>
                                resolveMutation.mutate({ alertId: alert.alert_id })
                              }
                              disabled={resolveMutation.isPending}
                              className="h-6 text-xs px-2"
                            >
                              Resolve
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  value,
  unit,
  label,
}: {
  value: string | React.ReactNode;
  unit?: string;
  label: string;
}) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <div className="text-lg font-bold text-foreground">
          {value}
          {unit && (
            <span className="text-sm font-normal text-muted-foreground ml-0.5">
              {unit}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function HOSBar({
  label,
  hours,
  maxHours,
}: {
  label: string;
  hours: number;
  maxHours: number;
}) {
  const percent = Math.min((hours / maxHours) * 100, 100);

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground shrink-0 w-10">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${hosBarColor(hours)}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs font-medium text-foreground shrink-0 w-16 text-right">
        {hours}/{maxHours}h
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline (mirrors DayTimeline from plan view, with live progress)
// ---------------------------------------------------------------------------

function SegmentIcon({ type }: { type: string }) {
  const cls = "h-3.5 w-3.5";
  switch (type) {
    case "dock": return <MapPin className={cls} />;
    case "rest": return <Moon className={cls} />;
    case "fuel": return <Fuel className={cls} />;
    case "break": return <Coffee className={cls} />;
    case "drive": return <Truck className={cls} />;
    default: return <Clock className={cls} />;
  }
}

function getSegmentIconBg(type: string, isCompleted: boolean): string {
  if (isCompleted) return "bg-green-600 dark:bg-green-500 text-white";
  switch (type) {
    case "dock": return "bg-foreground text-background";
    case "rest": return "bg-gray-600 dark:bg-gray-400 text-white dark:text-black";
    case "fuel": return "bg-gray-500 text-white";
    case "break": return "bg-gray-400 dark:bg-gray-600 text-white dark:text-gray-200";
    default: return "bg-muted text-muted-foreground";
  }
}

function LiveDayTimeline({
  day,
  segments,
  completedStops,
}: {
  day: DayBreakdown;
  segments: RouteSegment[];
  completedStops: number;
}) {
  let stopIndex = 0;

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>Day {day.day} — {formatDate(day.date)}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {formatDuration(day.driveHours)} driving
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-4 pb-3">
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[14px] top-0 bottom-0 w-px bg-border" />

          {segments.map((segment) => {
            if (segment.segmentType === "drive") {
              return (
                <div
                  key={segment.segmentId}
                  className="flex items-center gap-2 py-1.5 pl-[30px] text-xs text-muted-foreground"
                >
                  <div className="flex-1 border-t border-dashed border-border" />
                  <span>
                    {segment.distanceMiles?.toLocaleString(undefined, { maximumFractionDigits: 0 })} mi
                    {" · "}
                    {formatDuration(segment.driveTimeHours || 0)}
                  </span>
                  <div className="flex-1 border-t border-dashed border-border" />
                </div>
              );
            }

            const isCompleted = stopIndex < completedStops;
            stopIndex++;

            return (
              <TimelineStop
                key={segment.segmentId}
                segment={segment}
                isCompleted={isCompleted}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function TimelineStop({
  segment,
  isCompleted,
}: {
  segment: RouteSegment;
  isCompleted: boolean;
}) {
  const time = segment.estimatedArrival ? formatTime(segment.estimatedArrival) : "";

  return (
    <div className="flex items-start gap-2 py-1.5 group">
      {/* Icon */}
      <div
        className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 z-10 ${getSegmentIconBg(segment.segmentType, isCompleted)}`}
      >
        {isCompleted ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <SegmentIcon type={segment.segmentType} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        {segment.segmentType === "dock" && (
          <>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 uppercase tracking-wider"
              >
                {segment.actionType || "stop"}
              </Badge>
              <span className={`text-sm font-medium truncate ${isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}>
                {segment.toLocation}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {time && `${time} · `}
              {formatDuration(segment.dockDurationHours || 0)} dock
              {segment.customerName && ` · ${segment.customerName}`}
            </div>
          </>
        )}

        {segment.segmentType === "rest" && (
          <>
            <span className={`text-sm font-medium ${isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}>
              {segment.toLocation || "Rest Stop"}
            </span>
            <div className="text-xs text-muted-foreground mt-0.5">
              {time && `${time} · `}
              {formatDuration(segment.restDurationHours || 0)}{" "}
              {segment.restType?.replace(/_/g, " ")}
            </div>
          </>
        )}

        {segment.segmentType === "fuel" && (
          <>
            <span className={`text-sm font-medium ${isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}>
              {segment.fuelStationName || segment.toLocation || "Fuel Stop"}
            </span>
            <div className="text-xs text-muted-foreground mt-0.5">
              {time && `${time} · `}
              {segment.fuelGallons} gal
              {segment.fuelCostEstimate && ` · $${segment.fuelCostEstimate.toFixed(0)}`}
            </div>
          </>
        )}

        {segment.segmentType === "break" && (
          <>
            <span className={`text-sm font-medium ${isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}>
              Mandatory Break
            </span>
            <div className="text-xs text-muted-foreground mt-0.5">
              {time && `${time} · `}
              {formatDuration(segment.restDurationHours || 0.5)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
