"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Route,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Shield,
  Plus,
  Package,
  Users,
  ArrowRight,
  Truck,
  MapPin,
  X,
  Pin,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Separator } from "@/shared/components/ui/separator";
import { Input } from "@/shared/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { FeatureGuard } from "@/features/platform/feature-flags";
import {
  useAlerts,
  useAcknowledgeAlert,
  useResolveAlert,
} from "@/features/operations/alerts";
import type { Alert, AlertPriority, AlertCategory } from "@/features/operations/alerts";
import {
  useCommandCenterOverview,
  useShiftNotes,
  useCreateShiftNote,
  useDeleteShiftNote,
} from "@/features/operations/command-center";
import type { ActiveRoute, DriverHOSChip, ShiftNote } from "@/features/operations/command-center";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIORITY_BORDER: Record<AlertPriority, string> = {
  critical: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-yellow-500",
  low: "border-l-blue-500",
};

const CATEGORY_LABELS: Record<AlertCategory, string> = {
  hos: "HOS",
  route: "Route",
  driver: "Driver",
  vehicle: "Vehicle",
  external: "External",
  system: "System",
};

const ETA_STATUS_STYLES = {
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

const ROUTE_STATUS_DOT: Record<string, string> = {
  in_transit: "bg-green-500",
  at_dock: "bg-blue-500",
  resting: "bg-gray-400",
  completed: "bg-gray-300 dark:bg-gray-600",
};

const HOS_STATUS_DOT: Record<string, string> = {
  driving: "bg-green-500",
  on_duty: "bg-blue-500",
  sleeper: "bg-gray-400",
  off_duty: "bg-gray-400",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function hosBarColor(hours: number): string {
  if (hours >= 6) return "bg-green-500 dark:bg-green-400";
  if (hours >= 2) return "bg-yellow-500 dark:bg-yellow-400";
  return "bg-red-500 dark:bg-red-400";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DispatcherOverviewPage() {
  return (
    <FeatureGuard featureKey="command_center_enabled">
      <CommandCenterContent />
    </FeatureGuard>
  );
}

// ---------------------------------------------------------------------------
// Main Content
// ---------------------------------------------------------------------------

function CommandCenterContent() {
  const { data: overview, isLoading: overviewLoading } = useCommandCenterOverview();
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts({ status: "active" });
  const acknowledgeMutation = useAcknowledgeAlert();
  const resolveMutation = useResolveAlert();

  const topAlerts = useMemo(() => {
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...alerts]
      .sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9))
      .slice(0, 5);
  }, [alerts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Command Center
        </h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Operational overview of your fleet
        </p>
      </div>

      {/* KPI Strip */}
      <KPIStrip kpis={overview?.kpis} isLoading={overviewLoading} />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Routes (2/3) */}
        <div className="lg:col-span-2">
          <ActiveRoutesFeed
            routes={overview?.active_routes}
            isLoading={overviewLoading}
          />
        </div>

        {/* Right: Alerts + Quick Actions + Shift Notes (1/3) */}
        <div className="space-y-6">
          {/* Alert Feed */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Active Alerts</h2>
              <Link
                href="/dispatcher/alerts"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View All
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </div>
            {alertsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}><CardContent className="p-3"><Skeleton className="h-16 w-full" /></CardContent></Card>
                ))}
              </div>
            ) : topAlerts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500 dark:text-green-400 mb-2" />
                  <p className="text-sm font-medium text-foreground">All Clear</p>
                  <p className="text-xs text-muted-foreground mt-1">No active alerts</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {topAlerts.map((alert) => (
                  <CompactAlertCard
                    key={alert.alert_id}
                    alert={alert}
                    onAcknowledge={() => acknowledgeMutation.mutate(alert.alert_id)}
                    onResolve={() => resolveMutation.mutate({ alertId: alert.alert_id })}
                    isAcknowledging={acknowledgeMutation.isPending}
                    isResolving={resolveMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Quick Actions */}
          <QuickActionsPanel counts={overview?.quick_action_counts} />

          <Separator />

          {/* Shift Notes */}
          <ShiftNotesPanel />
        </div>
      </div>

      {/* HOS Driver Strip */}
      <HOSDriverStrip
        drivers={overview?.driver_hos_strip}
        isLoading={overviewLoading}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Strip
// ---------------------------------------------------------------------------

function KPIStrip({
  kpis,
  isLoading,
}: {
  kpis: CommandCenterOverviewKPIs | undefined;
  isLoading: boolean;
}) {
  const onTimeColor = kpis
    ? kpis.on_time_percentage >= 95
      ? "text-green-600 dark:text-green-400"
      : kpis.on_time_percentage >= 85
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400"
    : "";

  const hosColor = kpis
    ? kpis.hos_violations === 0
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400"
    : "";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
      <KPICard
        label="Active Routes"
        value={kpis?.active_routes}
        icon={<Route className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />
      <KPICard
        label="On-Time"
        value={kpis ? `${kpis.on_time_percentage}%` : undefined}
        icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        valueClassName={onTimeColor}
        isLoading={isLoading}
      />
      <KPICard
        label="HOS Compliance"
        value={kpis ? (kpis.hos_violations === 0 ? "0 violations" : `${kpis.hos_violations} violation${kpis.hos_violations > 1 ? "s" : ""}`) : undefined}
        icon={<Shield className="h-4 w-4 text-muted-foreground" />}
        valueClassName={hosColor}
        isLoading={isLoading}
      />
      <Link href="/dispatcher/alerts">
        <KPICard
          label="Active Alerts"
          value={kpis?.active_alerts}
          icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
          clickable
        />
      </Link>
      <KPICard
        label="Avg Response"
        value={kpis ? `${kpis.avg_response_time_minutes} min` : undefined}
        icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />
    </div>
  );
}

// Helper type to avoid complex inline type
type CommandCenterOverviewKPIs = {
  active_routes: number;
  on_time_percentage: number;
  hos_violations: number;
  active_alerts: number;
  avg_response_time_minutes: number;
};

function KPICard({
  label,
  value,
  icon,
  valueClassName,
  isLoading,
  clickable,
}: {
  label: string;
  value: number | string | undefined;
  icon: React.ReactNode;
  valueClassName?: string;
  isLoading: boolean;
  clickable?: boolean;
}) {
  return (
    <Card className={clickable ? "hover:bg-muted/50 transition-colors cursor-pointer" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading || value == null ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <div className={`text-lg sm:text-2xl font-bold ${valueClassName ?? ""}`}>{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Active Routes Feed
// ---------------------------------------------------------------------------

function ActiveRoutesFeed({
  routes,
  isLoading,
}: {
  routes: ActiveRoute[] | undefined;
  isLoading: boolean;
}) {
  const [filter, setFilter] = useState("all");

  const filteredRoutes = useMemo(() => {
    if (!routes) return [];
    switch (filter) {
      case "at_risk":
        return routes.filter(
          (r) => r.eta_status === "late" || r.eta_status === "at_risk" || r.hos.drive_hours_remaining < 2 || r.active_alert_count > 0
        );
      case "on_time":
        return routes.filter((r) => r.eta_status === "on_time" && r.status !== "completed");
      case "completed":
        return routes.filter((r) => r.status === "completed");
      default:
        return routes;
    }
  }, [routes, filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Active Routes</h2>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs px-2.5 h-6">All</TabsTrigger>
            <TabsTrigger value="at_risk" className="text-xs px-2.5 h-6">At Risk</TabsTrigger>
            <TabsTrigger value="on_time" className="text-xs px-2.5 h-6">On Time</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs px-2.5 h-6">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRoutes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Truck className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-foreground">No routes found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filter === "all" ? "No active routes at this time" : `No ${filter.replace("_", " ")} routes`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRoutes.map((route) => (
            <RouteCard key={route.route_id} route={route} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Route Card
// ---------------------------------------------------------------------------

function RouteCard({ route }: { route: ActiveRoute }) {
  const progressPercent = route.progress.total_stops > 0
    ? (route.progress.completed_stops / route.progress.total_stops) * 100
    : 0;

  const hosPercent = Math.min((route.hos.drive_hours_remaining / 11) * 100, 100);
  const etaStyle = ETA_STATUS_STYLES[route.eta_status];

  return (
    <Card>
      <CardContent className="p-4">
        {/* Row 1: Driver + Status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">
              {route.driver.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {route.vehicle.identifier}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`h-2 w-2 rounded-full ${ROUTE_STATUS_DOT[route.status]}`} />
            <span className="text-xs text-muted-foreground">
              {ROUTE_STATUS_LABELS[route.status]}
            </span>
          </div>
        </div>

        {/* Row 2: Route progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">
              {route.progress.completed_stops}/{route.progress.total_stops} stops
            </span>
            <span className="text-xs text-muted-foreground">
              {route.progress.distance_completed_miles}/{route.progress.total_distance_miles} mi
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Row 3: Next stop + ETA status */}
        {route.next_stop && (
          <div className="flex items-start justify-between mb-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground truncate">
                  {route.next_stop.name}
                </span>
              </div>
              <span className="text-xs text-muted-foreground ml-[18px]">
                {route.next_stop.location} &middot; ETA {formatTime(route.next_stop.eta)}
              </span>
            </div>
            <Badge
              variant={route.eta_status === "late" ? "destructive" : "outline"}
              className={`shrink-0 text-xs ${etaStyle.className}`}
            >
              {etaStyle.label}
            </Badge>
          </div>
        )}

        {/* Row 4: HOS bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground shrink-0 w-8">HOS</span>
          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${hosBarColor(route.hos.drive_hours_remaining)}`}
              style={{ width: `${hosPercent}%` }}
            />
          </div>
          <span className="text-xs font-medium text-foreground shrink-0 w-12 text-right">
            {route.hos.drive_hours_remaining}h
          </span>
        </div>

        {/* Row 5: Alert badge (if any) */}
        {route.active_alert_count > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-yellow-500 dark:text-yellow-400" />
            <span className="text-xs text-yellow-600 dark:text-yellow-400">
              {route.active_alert_count} active alert{route.active_alert_count > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Compact Alert Card
// ---------------------------------------------------------------------------

function CompactAlertCard({
  alert,
  onAcknowledge,
  onResolve,
  isAcknowledging,
  isResolving,
}: {
  alert: Alert;
  onAcknowledge: () => void;
  onResolve: () => void;
  isAcknowledging: boolean;
  isResolving: boolean;
}) {
  const borderClass = PRIORITY_BORDER[alert.priority];
  const isActive = alert.status === "active";

  return (
    <Card className={`border-l-4 ${borderClass}`}>
      <CardContent className="p-3">
        <div className="flex flex-col gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant={alert.priority === "critical" ? "destructive" : "outline"}
                className="text-xs"
              >
                {alert.priority}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {CATEGORY_LABELS[alert.category]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(alert.created_at)}
              </span>
            </div>
            <h3 className="text-sm font-medium text-foreground truncate">{alert.title}</h3>
          </div>
          {isActive && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onAcknowledge}
                disabled={isAcknowledging}
                className="h-6 text-xs px-2"
              >
                Ack
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={onResolve}
                disabled={isResolving}
                className="h-6 text-xs px-2"
              >
                Resolve
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Quick Actions Panel
// ---------------------------------------------------------------------------

function QuickActionsPanel({
  counts,
}: {
  counts?: { unassigned_loads: number; available_drivers: number };
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-3">Quick Actions</h2>
      <div className="space-y-2">
        <Link
          href="/dispatcher/create-plan"
          className="flex items-center justify-between py-2.5 px-3 rounded-md border border-input bg-background hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Plus className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Plan New Route</span>
          </div>
        </Link>
        <Link
          href="/dispatcher/fleet"
          className="flex items-center justify-between py-2.5 px-3 rounded-md border border-input bg-background hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Unassigned Loads</span>
          </div>
          {counts && counts.unassigned_loads > 0 && (
            <Badge variant="outline" className="text-xs">
              {counts.unassigned_loads}
            </Badge>
          )}
        </Link>
        <Link
          href="/dispatcher/fleet"
          className="flex items-center justify-between py-2.5 px-3 rounded-md border border-input bg-background hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Drivers Available</span>
          </div>
          {counts && counts.available_drivers > 0 && (
            <Badge variant="outline" className="text-xs">
              {counts.available_drivers}
            </Badge>
          )}
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shift Notes Panel
// ---------------------------------------------------------------------------

function ShiftNotesPanel() {
  const { data: notesData, isLoading } = useShiftNotes();
  const createMutation = useCreateShiftNote();
  const deleteMutation = useDeleteShiftNote();
  const [noteText, setNoteText] = useState("");

  const handleSubmit = () => {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    createMutation.mutate({ content: trimmed });
    setNoteText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-3">Shift Notes</h2>

      {/* Input */}
      <div className="flex gap-2 mb-3">
        <Input
          placeholder="Leave a note for next shift..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-sm"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleSubmit}
          disabled={createMutation.isPending || !noteText.trim()}
          className="shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Notes list */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : notesData?.notes && notesData.notes.length > 0 ? (
        <div className="space-y-2">
          {notesData.notes.slice(0, 5).map((note: ShiftNote) => (
            <div
              key={note.note_id}
              className="flex items-start gap-2 p-2 rounded-md bg-muted/50"
            >
              {note.is_pinned && (
                <Pin className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{note.content}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {note.created_by.name} &middot; {formatRelativeTime(note.created_at)}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteMutation.mutate(note.note_id)}
                disabled={deleteMutation.isPending}
                className="h-6 w-6 p-0 shrink-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-3">
          No shift notes. Add one above.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HOS Driver Strip
// ---------------------------------------------------------------------------

function HOSDriverStrip({
  drivers,
  isLoading,
}: {
  drivers: DriverHOSChip[] | undefined;
  isLoading: boolean;
}) {
  const approachingLimit = drivers?.filter((d) => d.drive_hours_remaining < 2).length ?? 0;
  const activeCount = drivers?.length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-foreground">Driver HOS</h2>
        <span className="text-xs text-muted-foreground">
          {activeCount} active{approachingLimit > 0 && (
            <> &middot; <span className="text-red-600 dark:text-red-400">{approachingLimit} approaching limit</span></>
          )}
        </span>
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-16 w-24 shrink-0 rounded-lg" />
          ))}
        </div>
      ) : drivers && drivers.length > 0 ? (
        <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2">
          {drivers.map((driver) => (
            <DriverChip key={driver.driver_id} driver={driver} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">No active drivers</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DriverChip({ driver }: { driver: DriverHOSChip }) {
  const hosPercent = Math.min((driver.drive_hours_remaining / 11) * 100, 100);

  return (
    <Card className="shrink-0 w-[100px] md:w-[110px]">
      <CardContent className="p-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold text-foreground">{driver.initials}</span>
          <span className={`h-2 w-2 rounded-full ${HOS_STATUS_DOT[driver.status]}`} />
        </div>
        <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-1">
          <div
            className={`h-full rounded-full ${hosBarColor(driver.drive_hours_remaining)}`}
            style={{ width: `${hosPercent}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">{driver.drive_hours_remaining}h</span>
      </CardContent>
    </Card>
  );
}
