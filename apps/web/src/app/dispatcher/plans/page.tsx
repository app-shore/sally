"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Route, Search, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { useRoutePlans, useCancelRoute } from "@/features/routing/route-planning";
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

/** Extract unique customer names from plan loads */
function getCustomerNames(plan: RoutePlanListItem): string[] {
  if (!plan.loads || plan.loads.length === 0) return [];
  const names = [...new Set(plan.loads.map((l) => l.load.customerName))];
  return names;
}

/** Get origin → destination from dock segments */
function getRoute(plan: RoutePlanListItem): { origin: string; destination: string } | null {
  if (!plan.segments || plan.segments.length === 0) return null;
  const sorted = [...plan.segments].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const origin = sorted[0]?.toLocation?.split(",")[0] || "";
  const destination = sorted[sorted.length - 1]?.toLocation?.split(",")[0] || "";
  if (!origin && !destination) return null;
  return { origin, destination };
}

/** Get load numbers for display */
function getLoadNumbers(plan: RoutePlanListItem): string[] {
  if (!plan.loads || plan.loads.length === 0) return [];
  return plan.loads.map((l) => l.load.loadNumber);
}

function PlanRow({ plan, onClick, onDiscard }: { plan: RoutePlanListItem; onClick: () => void; onDiscard?: () => void }) {
  const customers = getCustomerNames(plan);
  const route = getRoute(plan);
  const loadNumbers = getLoadNumbers(plan);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        className="w-full p-4 pr-12 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-left"
      >
        {/* Row 1: Customer(s) + Status + Cost */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-sm font-semibold text-foreground truncate">
              {customers.length > 0 ? customers.join(", ") : "No customer"}
            </span>
            <Badge variant={statusVariant(plan.status)} className="text-[10px] px-1.5 py-0">
              {plan.status}
            </Badge>
            {!plan.isFeasible && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">infeasible</Badge>
            )}
          </div>
          <span className="text-sm font-semibold text-foreground flex-shrink-0">
            ${plan.totalCostEstimate.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>

        {/* Row 2: Origin → Dest | Load numbers */}
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
          {route && (
            <>
              <span>{route.origin} → {route.destination}</span>
              <span>&middot;</span>
            </>
          )}
          {loadNumbers.length > 0 && (
            <span>{loadNumbers.join(", ")}</span>
          )}
        </div>

        {/* Row 3: Driver · Vehicle · Distance · Time · Departure → Arrival */}
        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
          <span>{plan.driver.name}</span>
          <span>&middot;</span>
          <span>#{plan.vehicle.unitNumber}</span>
          <span>&middot;</span>
          <span>{formatDistance(plan.totalDistanceMiles)}</span>
          <span>&middot;</span>
          <span>{formatHours(plan.totalTripTimeHours)}</span>
          <span>&middot;</span>
          <span>
            {formatDate(plan.departureTime)}
            {plan.estimatedArrival && ` → ${formatDate(plan.estimatedArrival)}`}
          </span>
        </div>
      </button>
      {plan.status === "draft" && onDiscard && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
              onClick={(e) => e.stopPropagation()}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard this plan?</AlertDialogTitle>
              <AlertDialogDescription>
                This will cancel route {plan.planId}. The loads will remain
                available for a new plan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Plan</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.stopPropagation();
                  onDiscard();
                }}
                className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
              >
                Discard
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

export default function PlansListPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading } = useRoutePlans(
    statusFilter === "all" ? undefined : { status: statusFilter }
  );
  const cancelRoute = useCancelRoute();

  const plans = data?.plans ?? [];

  // Client-side search across customer, driver, load number, plan ID, vehicle
  const filteredPlans = useMemo(() => {
    if (!searchQuery.trim()) return plans;
    const q = searchQuery.toLowerCase();
    return plans.filter((plan) => {
      // Plan ID
      if (plan.planId.toLowerCase().includes(q)) return true;
      // Driver name
      if (plan.driver.name.toLowerCase().includes(q)) return true;
      // Vehicle unit number
      if (plan.vehicle.unitNumber.toLowerCase().includes(q)) return true;
      // Customer names
      const customers = getCustomerNames(plan);
      if (customers.some((c) => c.toLowerCase().includes(q))) return true;
      // Load numbers
      const loads = getLoadNumbers(plan);
      if (loads.some((l) => l.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [plans, searchQuery]);

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

      {/* Search + Tabs row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customer, driver, load..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Drafts</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Route className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? `No plans match "${searchQuery}"`
                : statusFilter === "all"
                  ? "No route plans yet. Create your first plan to get started."
                  : `No ${statusFilter} plans.`}
            </p>
            {!searchQuery && statusFilter === "all" && (
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
          {filteredPlans.map((plan) => (
            <PlanRow
              key={plan.planId}
              plan={plan}
              onClick={() => router.push(`/dispatcher/plans/${plan.planId}`)}
              onDiscard={() => cancelRoute.mutate(plan.planId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
