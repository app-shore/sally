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
  Search,
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
  useTogglePinShiftNote,
  useDeleteShiftNote,
  RouteDetailSheet,
} from "@/features/operations/command-center";
import type { ActiveRoute, ShiftNote } from "@/features/operations/command-center";

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

function hosTextColor(hours: number): string {
  if (hours >= 6) return "text-green-600 dark:text-green-400";
  if (hours >= 2) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
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
  const [selectedRoute, setSelectedRoute] = useState<ActiveRoute | null>(null);
  const [routeDetailOpen, setRouteDetailOpen] = useState(false);

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

      {/* Monitoring Pulse */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span>
          Monitoring Active
          {overview?.kpis ? ` · ${overview.kpis.active_routes} route${overview.kpis.active_routes !== 1 ? "s" : ""}` : ""}
        </span>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Routes (2/3) */}
        <div className="lg:col-span-2">
          <ActiveRoutesFeed
            routes={overview?.active_routes}
            isLoading={overviewLoading}
            onRouteSelect={(route) => {
              setSelectedRoute(route);
              setRouteDetailOpen(true);
            }}
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

      {/* Route Detail Slide-Over */}
      <RouteDetailSheet
        route={selectedRoute}
        open={routeDetailOpen}
        onOpenChange={(open) => {
          setRouteDetailOpen(open);
          if (!open) setSelectedRoute(null);
        }}
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
  onRouteSelect,
}: {
  routes: ActiveRoute[] | undefined;
  isLoading: boolean;
  onRouteSelect?: (route: ActiveRoute) => void;
}) {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRoutes = useMemo(() => {
    if (!routes) return [];

    // Step 1: filter by tab
    let result: ActiveRoute[];
    if (filter === "at_risk") {
      result = routes.filter(
        (r) =>
          r.status !== "completed" &&
          (r.eta_status === "late" || r.eta_status === "at_risk" || r.hos.drive_hours_remaining < 2 || r.active_alert_count > 0)
      );
    } else {
      result = routes.filter((r) => r.status !== "completed");
    }

    // Step 2: filter by search query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((r) =>
        r.driver.name.toLowerCase().includes(q) ||
        r.vehicle.identifier.toLowerCase().includes(q) ||
        (r.load?.reference_number?.toLowerCase().includes(q)) ||
        (r.next_stop?.name.toLowerCase().includes(q)) ||
        (r.next_stop?.location.toLowerCase().includes(q))
      );
    }

    return result;
  }, [routes, filter, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-foreground shrink-0">Active Routes</h2>
        <div className="relative flex-1 max-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search driver, load, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <div className="ml-auto shrink-0">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-2.5 h-6">All</TabsTrigger>
              <TabsTrigger value="at_risk" className="text-xs px-2.5 h-6">At Risk</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
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
            <RouteCard
              key={route.route_id}
              route={route}
              onClick={() => onRouteSelect?.(route)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Route Card
// ---------------------------------------------------------------------------

function RouteCard({ route, onClick }: { route: ActiveRoute; onClick?: () => void }) {
  const etaStyle = ETA_STATUS_STYLES[route.eta_status];
  const hosColor = hosTextColor(route.hos.drive_hours_remaining);

  return (
    <Card
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Row 1: Load # + Driver + Vehicle + Status */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {route.load && (
              <>
                <span className="text-xs font-mono text-muted-foreground shrink-0">
                  {route.load.reference_number}
                </span>
                <span className="text-muted-foreground/40">·</span>
              </>
            )}
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

        {/* Row 2: Next stop + ETA badge */}
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
              className={`shrink-0 text-xs ${route.eta_status !== "late" ? etaStyle.className : ""}`}
            >
              {etaStyle.label}
            </Badge>
          </div>
        )}

        {/* Row 3: Stats line — replaces progress + HOS bars */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{route.progress.completed_stops}/{route.progress.total_stops} stops</span>
          <span>&middot;</span>
          <span>{route.progress.distance_completed_miles}/{route.progress.total_distance_miles} mi</span>
          <span>&middot;</span>
          <span className={`font-medium ${hosColor}`}>
            HOS {route.hos.drive_hours_remaining}h
          </span>
          {route.active_alert_count > 0 && (
            <>
              <span>&middot;</span>
              <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="h-3 w-3" />
                {route.active_alert_count}
              </span>
            </>
          )}
        </div>
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
          href="/dispatcher/plans/create"
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
  const togglePinMutation = useTogglePinShiftNote();
  const deleteMutation = useDeleteShiftNote();
  const [noteText, setNoteText] = useState("");
  const [pinOnCreate, setPinOnCreate] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const handleSubmit = () => {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    createMutation.mutate({ content: trimmed, isPinned: pinOnCreate });
    setNoteText("");
    setPinOnCreate(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleDeleteClick = (noteId: string) => {
    if (confirmingDeleteId === noteId) {
      deleteMutation.mutate(noteId);
      setConfirmingDeleteId(null);
    } else {
      setConfirmingDeleteId(noteId);
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
          variant={pinOnCreate ? "default" : "ghost"}
          onClick={() => setPinOnCreate(!pinOnCreate)}
          className="shrink-0 h-9 w-9 p-0"
          title={pinOnCreate ? "Will be pinned" : "Pin this note"}
        >
          <Pin className="h-3.5 w-3.5" />
        </Button>
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
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{note.content}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {note.created_by.name} &middot; {formatRelativeTime(note.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => togglePinMutation.mutate(note.note_id)}
                  disabled={togglePinMutation.isPending}
                  className="h-6 w-6 p-0"
                  title={note.is_pinned ? "Unpin note" : "Pin note"}
                >
                  <Pin className={`h-3 w-3 ${note.is_pinned ? "text-foreground" : "text-muted-foreground/40"}`} />
                </Button>
                {confirmingDeleteId === note.note_id ? (
                  <div className="flex items-center gap-0.5">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteClick(note.note_id)}
                      disabled={deleteMutation.isPending}
                      className="h-6 text-xs px-1.5"
                    >
                      Delete
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmingDeleteId(null)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteClick(note.note_id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3 text-muted-foreground/40" />
                  </Button>
                )}
              </div>
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

