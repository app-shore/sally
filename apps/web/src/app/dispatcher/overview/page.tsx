"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  Truck,
  ArrowRight,
  Plus,
  MapPin,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Separator } from "@/shared/components/ui/separator";
import { FeatureGuard } from "@/features/platform/feature-flags";
import {
  useAlerts,
  useAlertStats,
  useAcknowledgeAlert,
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
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

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
// Main content - Multi-section operational hub
// ---------------------------------------------------------------------------

function CommandCenterContent() {
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts({ status: "active" });
  const { data: stats } = useAlertStats();
  const acknowledgeMutation = useAcknowledgeAlert();
  const resolveMutation = useResolveAlert();

  // Top alerts: critical + high first, max 6
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const topAlerts = useMemo(() => {
    return [...alerts]
      .sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9))
      .slice(0, 6);
  }, [alerts]);

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Command Center
        </h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Operational overview of your fleet
        </p>
      </div>

      {/* ---- Stats Overview ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Alerts"
          value={stats?.active}
          icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
          href="/dispatcher/alerts"
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
          href="/dispatcher/alerts"
        />
        <StatCard
          label="Avg Response"
          value={stats?.avgResponseTimeMinutes != null ? `${stats.avgResponseTimeMinutes} min` : undefined}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          label="Resolved Today"
          value={stats?.resolvedToday}
          icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* ---- Two-column layout: Alerts + Quick Actions ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Recent Alerts (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Recent Alerts</h2>
            <Link
              href="/dispatcher/alerts"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 border border-input bg-background hover:bg-muted hover:text-foreground transition-colors"
            >
              View All
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </div>

          {alertsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-14" />
                    </div>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : topAlerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500 dark:text-green-400 mb-3" />
                <h3 className="font-semibold text-foreground">All Clear</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  No active alerts. Your fleet is running smoothly.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
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

        {/* Right column: Quick Actions + Fleet Status (1/3 width) */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-3">
              <Link
                href="/dispatcher/create-plan"
                className="flex items-center justify-start h-auto py-3 px-4 rounded-md border border-input bg-background hover:bg-muted transition-colors"
              >
                <Plus className="h-4 w-4 mr-3 shrink-0" />
                <div className="text-left">
                  <div className="text-sm font-medium">Plan New Route</div>
                  <div className="text-xs text-muted-foreground">Create optimized route</div>
                </div>
              </Link>
              <Link
                href="/dispatcher/active-routes"
                className="flex items-center justify-start h-auto py-3 px-4 rounded-md border border-input bg-background hover:bg-muted transition-colors"
              >
                <MapPin className="h-4 w-4 mr-3 shrink-0" />
                <div className="text-left">
                  <div className="text-sm font-medium">Live Routes</div>
                  <div className="text-xs text-muted-foreground">Track active routes</div>
                </div>
              </Link>
              <Link
                href="/dispatcher/fleet"
                className="flex items-center justify-start h-auto py-3 px-4 rounded-md border border-input bg-background hover:bg-muted transition-colors"
              >
                <Truck className="h-4 w-4 mr-3 shrink-0" />
                <div className="text-left">
                  <div className="text-sm font-medium">Fleet Overview</div>
                  <div className="text-xs text-muted-foreground">View assets & drivers</div>
                </div>
              </Link>
              <Link
                href="/dispatcher/analytics"
                className="flex items-center justify-start h-auto py-3 px-4 rounded-md border border-input bg-background hover:bg-muted transition-colors"
              >
                <Activity className="h-4 w-4 mr-3 shrink-0" />
                <div className="text-left">
                  <div className="text-sm font-medium">Analytics</div>
                  <div className="text-xs text-muted-foreground">Alert trends & reports</div>
                </div>
              </Link>
            </div>
          </div>

          <Separator />

          {/* Fleet Status Placeholder */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Fleet Status</h2>
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm text-foreground">Drivers On-Duty</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">--</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-sm text-foreground">Active Routes</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">--</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    <span className="text-sm text-foreground">Pending Loads</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">--</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-gray-400" />
                    <span className="text-sm text-foreground">Off-Duty Drivers</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">--</span>
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground text-center">
                  Live fleet data coming soon
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
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
  href,
}: {
  label: string;
  value: number | string | undefined;
  icon: React.ReactNode;
  valueClassName?: string;
  href?: string;
}) {
  const content = (
    <Card className={href ? "hover:bg-muted/50 transition-colors cursor-pointer" : ""}>
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

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

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
      <CardContent className="p-3 md:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex-1 min-w-0">
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
            <h3 className="text-sm font-medium text-foreground truncate">
              {alert.title}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {alert.message}
            </p>
          </div>

          {isActive && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={onAcknowledge}
                disabled={isAcknowledging}
                className="h-7 text-xs"
              >
                Acknowledge
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={onResolve}
                disabled={isResolving}
                className="h-7 text-xs"
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
