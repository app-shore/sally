"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Route, Clock, CheckCircle2, XCircle, FileText } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useRoutePlans } from "@/features/routing/route-planning";
import type { RoutePlanListItem } from "@/features/routing/route-planning";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDistance(miles: number) {
  return `${miles.toLocaleString(undefined, { maximumFractionDigits: 0 })} mi`;
}

function formatHours(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function statusVariant(status: string): "default" | "muted" | "destructive" | "outline" {
  switch (status) {
    case "active": return "default";
    case "cancelled": return "destructive";
    case "completed": return "outline";
    default: return "muted";
  }
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "active": return <Route className="h-4 w-4 text-green-600 dark:text-green-400" />;
    case "completed": return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />;
    case "cancelled": return <XCircle className="h-4 w-4 text-destructive" />;
    default: return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
}

function PlanRow({ plan, onClick }: { plan: RoutePlanListItem; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-left"
    >
      <StatusIcon status={plan.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{plan.planId}</span>
          <Badge variant={statusVariant(plan.status)} className="text-xs">
            {plan.status}
          </Badge>
          {!plan.isFeasible && (
            <Badge variant="destructive" className="text-xs">infeasible</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span>{plan.driver.name}</span>
          <span>&middot;</span>
          <span>{plan.vehicle.unitNumber}</span>
          <span>&middot;</span>
          <span>{formatDistance(plan.totalDistanceMiles)}</span>
          <span>&middot;</span>
          <span>{formatHours(plan.totalTripTimeHours)}</span>
        </div>
      </div>
      <div className="text-xs text-muted-foreground text-right flex-shrink-0">
        <div>{formatDate(plan.departureTime)}</div>
        <div className="mt-0.5">{plan._count.loads} load{plan._count.loads !== 1 ? "s" : ""}</div>
      </div>
    </button>
  );
}

export default function PlansListPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data, isLoading } = useRoutePlans(
    statusFilter === "all" ? undefined : { status: statusFilter }
  );

  const plans = data?.plans ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Route Plans
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Plan, review, and activate routes for your drivers
          </p>
        </div>
        <Button onClick={() => router.push("/dispatcher/plans/create")}>
          <Plus className="h-4 w-4 mr-2" />
          Create Plan
        </Button>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Route className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {statusFilter === "all"
                ? "No route plans yet. Create your first plan to get started."
                : `No ${statusFilter} plans.`}
            </p>
            {statusFilter === "all" && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => router.push("/dispatcher/plans/create")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Plan
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {plans.map((plan) => (
            <PlanRow
              key={plan.planId}
              plan={plan}
              onClick={() => router.push(`/dispatcher/plans/${plan.planId}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
