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
  ChevronLeft,
  ChevronRight,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import {
  useAlerts,
  useAlertStats,
  useAcknowledgeAlert,
  useSnoozeAlert,
  useResolveAlert,
} from "@/features/operations/alerts";
import { useAlertHistory } from "@/features/operations/alerts/hooks/use-alert-analytics";
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

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getResponseTime(alert: any): string {
  if (!alert.acknowledged_at && !alert.acknowledgedAt) return "\u2014";
  const ack = alert.acknowledged_at || alert.acknowledgedAt;
  const created = alert.created_at || alert.createdAt;
  if (!ack || !created) return "\u2014";
  const diff = new Date(ack).getTime() - new Date(created).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

const PRIORITY_BORDER: Record<AlertPriority, string> = {
  critical: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-yellow-500",
  low: "border-l-blue-500",
};

const PRIORITY_BADGE_VARIANT: Record<AlertPriority, "destructive" | "outline" | "muted" | "default"> = {
  critical: "destructive",
  high: "outline",
  medium: "muted",
  low: "default",
};

const HISTORY_PRIORITY_BADGE: Record<string, "destructive" | "outline" | "default"> = {
  critical: "destructive",
  high: "default",
  medium: "outline",
  low: "outline",
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
// Page
// ---------------------------------------------------------------------------

export default function AlertsPage() {
  const { data: stats } = useAlertStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Alerts
        </h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Monitor, manage, and review fleet alerts
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Active"
          value={stats?.active}
          icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          label="Critical"
          value={stats?.critical}
          icon={<AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400" />}
          valueClassName={
            stats?.critical && stats.critical > 0
              ? "text-red-600 dark:text-red-400"
              : undefined
          }
        />
        <StatCard
          label="Avg Response"
          value={stats?.avgResponseTimeMinutes != null ? `${stats.avgResponseTimeMinutes}m` : undefined}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          label="Resolved Today"
          value={stats?.resolvedToday}
          icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Active / History tabs */}
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <ActiveAlertsView />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <HistoryView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active Alerts View
// ---------------------------------------------------------------------------

function ActiveAlertsView() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: alerts = [], isLoading } = useAlerts(
    buildQueryParams(statusFilter, categoryFilter),
  );
  const acknowledgeMutation = useAcknowledgeAlert();
  const resolveMutation = useResolveAlert();
  const snoozeMutation = useSnoozeAlert();

  const filteredAlerts = useMemo(() => {
    let result = alerts;
    // "All Open" = actionable alerts only. Exclude resolved (belongs in History) and snoozed (intentionally hidden).
    if (statusFilter === "all") {
      result = result.filter((a) =>
        a.status !== "resolved" && a.status !== "auto_resolved" && a.status !== "snoozed"
      );
    }
    if (priorityFilter !== "all") {
      result = result.filter((a) => a.priority === priorityFilter);
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
  }, [alerts, statusFilter, priorityFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Filters */}
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
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Open</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="snoozed">Snoozed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
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
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alert cards */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : filteredAlerts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
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
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// History View
// ---------------------------------------------------------------------------

function HistoryView() {
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [category, setCategory] = useState("all");
  const [priority, setPriority] = useState("all");
  const [status, setStatus] = useState("all");
  const [driverId, setDriverId] = useState("");

  const params = useMemo(() => {
    const p: Record<string, string> = { page: String(page), limit: "20" };
    if (startDate) p.start_date = startDate;
    if (endDate) p.end_date = endDate;
    if (category !== "all") p.category = category;
    if (priority !== "all") p.priority = priority;
    if (status !== "all") p.status = status;
    if (driverId.trim()) p.driver_id = driverId.trim();
    return p;
  }, [page, startDate, endDate, category, priority, status, driverId]);

  const { data, isLoading } = useAlertHistory(params);

  const handleReset = () => {
    setPage(1);
    setStartDate("");
    setEndDate("");
    setCategory("all");
    setPriority("all");
    setStatus("all");
    setDriverId("");
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Start Date</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">End Date</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Category</span>
              <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="hos">HOS</SelectItem>
                  <SelectItem value="route">Route</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                  <SelectItem value="external">External</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Priority</span>
              <Select value={priority} onValueChange={(v) => { setPriority(v); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Status</span>
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="auto_resolved">Auto-resolved</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Driver</span>
              <Input
                placeholder="e.g. DRV-001"
                value={driverId}
                onChange={(e) => { setDriverId(e.target.value); setPage(1); }}
              />
            </div>
            <div className="flex items-end col-span-1 sm:col-span-2 lg:col-span-2">
              <Button variant="outline" onClick={handleReset} className="w-full sm:w-auto">
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="hidden lg:table-cell">Driver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Response</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : data?.items?.length ? (
                  data.items.map((alert: any) => (
                    <TableRow key={alert.alertId || alert.alert_id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDate(alert.createdAt || alert.created_at)}
                      </TableCell>
                      <TableCell className="text-xs font-mono max-w-[150px] truncate">
                        {alert.alertType || alert.alert_type}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="capitalize text-xs">
                          {alert.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={HISTORY_PRIORITY_BADGE[alert.priority] || "outline"} className="capitalize text-xs">
                          {alert.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {alert.driverId || alert.driver_id}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">
                          {alert.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-right text-sm text-muted-foreground">
                        {getResponseTime(alert)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No alerts found matching your filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages} ({data.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared Sub-components
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
  const isAcknowledged = alert.status === "acknowledged";
  const isResolved = alert.status === "resolved" || alert.status === "auto_resolved";
  const isSnoozed = alert.status === "snoozed";

  return (
    <Card className={`border-l-4 ${borderClass}`}>
      <CardContent className="p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={PRIORITY_BADGE_VARIANT[alert.priority]}>
                {alert.priority}
              </Badge>
              <Badge variant="outline">{CATEGORY_LABELS[alert.category]}</Badge>
              <Badge variant="muted" className="text-xs">{alert.status}</Badge>
            </div>

            <h3 className="font-semibold text-foreground leading-tight">{alert.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{alert.message}</p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Driver: {alert.driver_id}</span>
              {alert.vehicle_id && <span>Vehicle: {alert.vehicle_id}</span>}
              <span>{formatRelativeTime(alert.created_at)}</span>
            </div>

            {alert.recommended_action && (
              <p className="text-xs text-muted-foreground italic">
                Recommended: {alert.recommended_action}
              </p>
            )}

            {isSnoozed && alert.snoozed_until && (
              <p className="text-xs text-muted-foreground">
                Snoozed until {new Date(alert.snoozed_until).toLocaleTimeString()}
              </p>
            )}
          </div>

          {!isResolved && !isSnoozed && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {isActive && (
                <Button size="sm" variant="outline" onClick={onAcknowledge} disabled={isAcknowledging}>
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  Acknowledge
                </Button>
              )}
              {(isActive || isAcknowledged) && (
                <Button size="sm" variant="outline" onClick={() => onSnooze(15)} disabled={isSnoozing}>
                  <Timer className="h-3.5 w-3.5 mr-1.5" />
                  Snooze 15m
                </Button>
              )}
              <Button size="sm" variant="default" onClick={onResolve} disabled={isResolving}>
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
          No alerts match your current filters.
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
