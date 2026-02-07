"use client";

import { useState, useMemo } from "react";
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  Search,
  BellOff,
  Eye,
  Timer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { FeatureGuard } from "@/features/platform/feature-flags";
import {
  useAlerts,
  useAlertStats,
  useAcknowledgeAlert,
  useSnoozeAlert,
  useResolveAlert,
} from "@/features/operations/alerts";
import type { Alert, AlertPriority, AlertCategory } from "@/features/operations/alerts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays} days ago`;
}

const PRIORITY_BORDER: Record<AlertPriority, string> = {
  critical: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-yellow-500",
  low: "border-l-blue-500",
};

const PRIORITY_BADGE_VARIANT: Record<AlertPriority, "destructive" | "outline" | "secondary" | "default"> = {
  critical: "destructive",
  high: "outline",
  medium: "secondary",
  low: "default",
};

const CATEGORY_LABELS: Record<AlertCategory, string> = {
  hos: "HOS",
  route: "Route",
  driver: "Driver",
  vehicle: "Vehicle",
  external: "External",
  system: "System",
};

// ---------------------------------------------------------------------------
// Page wrapper
// ---------------------------------------------------------------------------

export default function DispatcherOverviewPage() {
  return (
    <FeatureGuard featureKey="command_center_enabled">
      <CommandCenterContent />
    </FeatureGuard>
  );
}

// ---------------------------------------------------------------------------
// Main content
// ---------------------------------------------------------------------------

function CommandCenterContent() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityTab, setPriorityTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Data fetching
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts(
    buildQueryParams(statusFilter, categoryFilter),
  );
  const { data: stats } = useAlertStats();
  const acknowledgeMutation = useAcknowledgeAlert();
  const resolveMutation = useResolveAlert();
  const snoozeMutation = useSnoozeAlert();

  // Client-side filtering by priority tab + search
  const filteredAlerts = useMemo(() => {
    let result = alerts;
    if (priorityTab !== "all") {
      result = result.filter((a) => a.priority === priorityTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.message.toLowerCase().includes(q) ||
          a.driver_id.toLowerCase().includes(q),
      );
    }
    return result;
  }, [alerts, priorityTab, searchQuery]);

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Command Center
        </h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Monitor and manage fleet alerts in real-time
        </p>
      </div>

      {/* ---- Stats Bar ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Alerts"
          value={stats?.active}
          icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          label="Critical Alerts"
          value={stats?.critical}
          icon={<AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400" />}
          valueClassName={
            stats?.critical && stats.critical > 0
              ? "text-red-600 dark:text-red-400"
              : undefined
          }
        />
        <StatCard
          label="Avg Response Time"
          value={stats?.avgResponseTimeMinutes != null ? `${stats.avgResponseTimeMinutes} min` : undefined}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          label="Resolved Today"
          value={stats?.resolvedToday}
          icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* ---- Filters Row ---- */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search alerts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="snoozed">Snoozed</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="hos">HOS</SelectItem>
            <SelectItem value="route">Route</SelectItem>
            <SelectItem value="driver">Driver</SelectItem>
            <SelectItem value="vehicle">Vehicle</SelectItem>
            <SelectItem value="external">External</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ---- Priority Tabs ---- */}
      <Tabs value={priorityTab} onValueChange={setPriorityTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="critical">Critical</TabsTrigger>
          <TabsTrigger value="high">High</TabsTrigger>
          <TabsTrigger value="medium">Medium</TabsTrigger>
          <TabsTrigger value="low">Low</TabsTrigger>
        </TabsList>

        {/* Shared content for every tab value */}
        {["all", "critical", "high", "medium", "low"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4 space-y-3">
            {alertsLoading ? (
              <LoadingSkeleton />
            ) : filteredAlerts.length === 0 ? (
              <EmptyState />
            ) : (
              filteredAlerts.map((alert) => (
                <AlertCard
                  key={alert.alert_id}
                  alert={alert}
                  onAcknowledge={() => acknowledgeMutation.mutate(alert.alert_id)}
                  onResolve={() => resolveMutation.mutate({ alertId: alert.alert_id })}
                  onSnooze={(mins) =>
                    snoozeMutation.mutate({ alertId: alert.alert_id, durationMinutes: mins })
                  }
                  isAcknowledging={acknowledgeMutation.isPending}
                  isResolving={resolveMutation.isPending}
                  isSnoozing={snoozeMutation.isPending}
                />
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon,
  valueClassName,
}: {
  label: string;
  value: number | string | undefined;
  icon: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {value != null ? (
          <div className={`text-2xl font-bold ${valueClassName ?? ""}`}>{value}</div>
        ) : (
          <Skeleton className="h-8 w-16" />
        )}
      </CardContent>
    </Card>
  );
}

function AlertCard({
  alert,
  onAcknowledge,
  onResolve,
  onSnooze,
  isAcknowledging,
  isResolving,
  isSnoozing,
}: {
  alert: Alert;
  onAcknowledge: () => void;
  onResolve: () => void;
  onSnooze: (mins: number) => void;
  isAcknowledging: boolean;
  isResolving: boolean;
  isSnoozing: boolean;
}) {
  const borderClass = PRIORITY_BORDER[alert.priority];
  const isActive = alert.status === "active";
  const isResolved = alert.status === "resolved" || alert.status === "auto_resolved";

  return (
    <Card className={`border-l-4 ${borderClass}`}>
      <CardContent className="p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          {/* Left section */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={PRIORITY_BADGE_VARIANT[alert.priority]}>
                {alert.priority}
              </Badge>
              <Badge variant="outline">{CATEGORY_LABELS[alert.category]}</Badge>
              <Badge variant="secondary" className="text-xs">
                {alert.status}
              </Badge>
            </div>

            <h3 className="font-semibold text-foreground leading-tight">
              {alert.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {alert.message}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Driver: {alert.driver_id}</span>
              {alert.vehicle_id && <span>Vehicle: {alert.vehicle_id}</span>}
              <span>{formatRelativeTime(alert.created_at)}</span>
            </div>

            {alert.recommended_action && (
              <p className="text-xs text-muted-foreground italic mt-1">
                Recommended: {alert.recommended_action}
              </p>
            )}
          </div>

          {/* Right section - actions */}
          {!isResolved && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {isActive && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onAcknowledge}
                  disabled={isAcknowledging}
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  Acknowledge
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSnooze(15)}
                disabled={isSnoozing}
              >
                <Timer className="h-3.5 w-3.5 mr-1.5" />
                Snooze 15m
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={onResolve}
                disabled={isResolving}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Resolve
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <BellOff className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="font-semibold text-foreground">No alerts found</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          There are no alerts matching your current filters. Adjust the filters above or
          check back later.
        </p>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4 md:p-5 space-y-3">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-14" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-1/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function buildQueryParams(status: string, category: string) {
  const params: Record<string, string> = {};
  if (status !== "all") params.status = status;
  if (category !== "all") params.category = category;
  return Object.keys(params).length > 0 ? params : undefined;
}
