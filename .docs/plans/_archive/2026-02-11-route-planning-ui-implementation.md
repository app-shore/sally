# Route Planning UI — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build SALLY's flagship route planning UI — a single-screen, timeline-first experience that lets dispatchers go from load selection to an activated, HOS-compliant route in under 60 seconds.

**Architecture:** Two-phase single page: Phase 1 is a centered form (load picker, driver/vehicle selectors, departure time, priority). Phase 2 replaces the form with the route result (summary stats, HOS compliance card, segment timeline grouped by day, action buttons). API layer follows existing feature module pattern (api.ts + hooks + types).

**Tech Stack:** Next.js 15 (App Router), React Query, Zustand auth, Shadcn/ui components, Tailwind CSS, Lucide icons.

**Design Doc:** `.docs/plans/2026-02-11-route-planning-ui-design.md`

---

## Task 1: Install Missing Shadcn Components

**Files:**
- Modified by CLI: `apps/web/src/shared/components/ui/checkbox.tsx` (created)
- Modified by CLI: `apps/web/src/shared/components/ui/radio-group.tsx` (created)

**Step 1: Install checkbox component**

```bash
cd apps/web && npx shadcn@latest add checkbox -y
```

Expected: `checkbox.tsx` created in `src/shared/components/ui/`

**Step 2: Install radio-group component**

```bash
cd apps/web && npx shadcn@latest add radio-group -y
```

Expected: `radio-group.tsx` created in `src/shared/components/ui/`

**Step 3: Verify imports work**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: No new errors from the installed components.

**Step 4: Commit**

```bash
git add apps/web/src/shared/components/ui/checkbox.tsx apps/web/src/shared/components/ui/radio-group.tsx
git commit -m "chore: install checkbox and radio-group shadcn components"
```

---

## Task 2: Route Planning API Layer (Types + API + Hooks)

**Files:**
- Create: `apps/web/src/features/routing/route-planning/types.ts`
- Create: `apps/web/src/features/routing/route-planning/api.ts`
- Create: `apps/web/src/features/routing/route-planning/hooks/use-route-planning.ts`
- Create: `apps/web/src/features/routing/route-planning/index.ts`

**Step 1: Create TypeScript types**

Create `apps/web/src/features/routing/route-planning/types.ts`:

```typescript
/**
 * Route Planning API types
 * Matches backend POST /api/v1/routes/plan request/response
 */

// ─── Request Types ───

export interface CreateRoutePlanRequest {
  driverId: string;
  vehicleId: string;
  loadIds: string[];
  departureTime: string; // ISO 8601 datetime
  optimizationPriority?: 'minimize_time' | 'minimize_cost' | 'balance';
  dispatcherParams?: {
    dockRestStops?: Array<{
      stopId: string;
      truckParkedHours: number;
      convertToRest: boolean;
    }>;
    preferredRestType?: 'auto' | 'full' | 'split_8_2' | 'split_7_3';
    avoidTollRoads?: boolean;
    maxDetourMilesForFuel?: number;
  };
}

// ─── Response Types ───

export interface RoutePlanResult {
  planId: string;
  status: 'draft' | 'active' | 'cancelled' | 'superseded' | 'completed';
  isFeasible: boolean;
  feasibilityIssues: string[];
  totalDistanceMiles: number;
  totalDriveTimeHours: number;
  totalTripTimeHours: number;
  totalDrivingDays: number;
  totalCostEstimate: number;
  departureTime: string;
  estimatedArrival: string;
  segments: RouteSegment[];
  complianceReport: ComplianceReport;
  weatherAlerts: WeatherAlert[];
  dailyBreakdown: DayBreakdown[];
}

export interface RouteSegment {
  segmentId: string;
  sequenceOrder: number;
  segmentType: 'drive' | 'rest' | 'fuel' | 'dock' | 'break';

  // Location
  fromLocation: string;
  toLocation: string;
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;

  // Timing
  estimatedArrival: string;
  estimatedDeparture: string;
  timezone?: string;

  // Drive
  distanceMiles?: number;
  driveTimeHours?: number;
  routeGeometry?: string;

  // Rest
  restDurationHours?: number;
  restType?: string;
  restReason?: string;

  // Dock
  dockDurationHours?: number;
  customerName?: string;
  actionType?: string;
  isDocktimeConverted?: boolean;

  // Fuel
  fuelGallons?: number;
  fuelCostEstimate?: number;
  fuelStationName?: string;
  fuelPricePerGallon?: number;
  detourMiles?: number;

  // HOS state after segment
  hosStateAfter?: HOSState;

  // Weather
  weatherAlerts?: WeatherAlert[];
}

export interface HOSState {
  hoursDriven: number;
  onDutyTime: number;
  hoursSinceBreak: number;
  cycleHoursUsed: number;
}

export interface ComplianceReport {
  isFullyCompliant: boolean;
  totalRestStops: number;
  totalBreaks: number;
  total34hRestarts: number;
  totalSplitRests: number;
  dockTimeConversions: number;
  rules: Array<{
    rule: string;
    status: 'pass' | 'addressed';
  }>;
}

export interface WeatherAlert {
  lat: number;
  lon: number;
  condition: string;
  severity: 'low' | 'moderate' | 'severe';
  description: string;
  temperatureF: number;
  windSpeedMph: number;
  driveTimeMultiplier: number;
}

export interface DayBreakdown {
  day: number;
  date: string;
  driveHours: number;
  onDutyHours: number;
  segments: number;
  restStops: number;
}

// ─── List/Get Response Types ───

export interface RoutePlanListItem {
  id: number;
  planId: string;
  status: string;
  isActive: boolean;
  totalDistanceMiles: number;
  totalDriveTimeHours: number;
  totalTripTimeHours: number;
  totalCostEstimate: number;
  departureTime: string;
  estimatedArrival: string;
  isFeasible: boolean;
  createdAt: string;
  driver: { driverId: string; name: string };
  vehicle: { vehicleId: string; unitNumber: string };
  _count: { segments: number; loads: number };
}

export interface RoutePlanListResponse {
  plans: RoutePlanListItem[];
  total: number;
}
```

**Step 2: Create API functions**

Create `apps/web/src/features/routing/route-planning/api.ts`:

```typescript
/**
 * Route Planning API client
 * Endpoints: POST /routes/plan, GET /routes, GET /routes/:planId,
 *            POST /routes/:planId/activate, POST /routes/:planId/cancel
 */

import { apiClient } from '@/shared/lib/api';
import type {
  CreateRoutePlanRequest,
  RoutePlanResult,
  RoutePlanListResponse,
} from './types';

export const routePlanningApi = {
  /**
   * Plan a new route
   * POST /api/v1/routes/plan
   */
  plan: async (data: CreateRoutePlanRequest): Promise<RoutePlanResult> => {
    return apiClient<RoutePlanResult>('/routes/plan', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * List route plans with optional filters
   * GET /api/v1/routes
   */
  list: async (params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<RoutePlanListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set('status', params.status);
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());

    const queryString = queryParams.toString();
    const url = queryString ? `/routes?${queryString}` : '/routes';

    return apiClient<RoutePlanListResponse>(url);
  },

  /**
   * Get a specific route plan by planId
   * GET /api/v1/routes/:planId
   */
  getById: async (planId: string): Promise<RoutePlanResult> => {
    return apiClient<RoutePlanResult>(`/routes/${planId}`);
  },

  /**
   * Activate a route plan
   * POST /api/v1/routes/:planId/activate
   */
  activate: async (planId: string): Promise<RoutePlanResult> => {
    return apiClient<RoutePlanResult>(`/routes/${planId}/activate`, {
      method: 'POST',
    });
  },

  /**
   * Cancel a route plan
   * POST /api/v1/routes/:planId/cancel
   */
  cancel: async (planId: string): Promise<RoutePlanResult> => {
    return apiClient<RoutePlanResult>(`/routes/${planId}/cancel`, {
      method: 'POST',
    });
  },
};
```

**Step 3: Create React Query hooks**

Create `apps/web/src/features/routing/route-planning/hooks/use-route-planning.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { routePlanningApi } from '../api';
import type { CreateRoutePlanRequest } from '../types';

const ROUTE_PLANS_KEY = ['route-plans'] as const;

/**
 * Mutation: Plan a new route
 * Invalidates route-plans list on success
 */
export function usePlanRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRoutePlanRequest) => routePlanningApi.plan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROUTE_PLANS_KEY });
    },
  });
}

/**
 * Query: List route plans
 */
export function useRoutePlans(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: [...ROUTE_PLANS_KEY, params],
    queryFn: () => routePlanningApi.list(params),
  });
}

/**
 * Query: Get a specific route plan
 */
export function useRoutePlan(planId: string | null) {
  return useQuery({
    queryKey: [...ROUTE_PLANS_KEY, planId],
    queryFn: () => routePlanningApi.getById(planId!),
    enabled: !!planId,
  });
}

/**
 * Mutation: Activate a route plan
 */
export function useActivateRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) => routePlanningApi.activate(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROUTE_PLANS_KEY });
    },
  });
}

/**
 * Mutation: Cancel a route plan
 */
export function useCancelRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) => routePlanningApi.cancel(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROUTE_PLANS_KEY });
    },
  });
}
```

**Step 4: Create barrel export**

Create `apps/web/src/features/routing/route-planning/index.ts`:

```typescript
// API
export { routePlanningApi } from './api';

// Types
export type {
  CreateRoutePlanRequest,
  RoutePlanResult,
  RouteSegment,
  ComplianceReport,
  WeatherAlert,
  DayBreakdown,
  HOSState,
  RoutePlanListItem,
  RoutePlanListResponse,
} from './types';

// Hooks
export {
  usePlanRoute,
  useRoutePlans,
  useRoutePlan,
  useActivateRoute,
  useCancelRoute,
} from './hooks/use-route-planning';
```

**Step 5: Verify compilation**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: No new errors.

**Step 6: Commit**

```bash
git add apps/web/src/features/routing/route-planning/
git commit -m "feat(routing): add route planning API layer with types, api client, and React Query hooks"
```

---

## Task 3: Load Selector Component

**Files:**
- Create: `apps/web/src/app/dispatcher/create-plan/components/LoadSelector.tsx`

**Step 1: Create LoadSelector component**

This is the multi-select searchable load picker. Shows unplanned loads with customer name, origin → destination, weight. Checkbox multi-select.

Create `apps/web/src/app/dispatcher/create-plan/components/LoadSelector.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import { Package, Search } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Label } from "@/shared/components/ui/label";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { useLoads } from "@/features/fleet/loads";
import type { LoadListItem } from "@/features/fleet/loads/types";

interface LoadSelectorProps {
  selectedLoadIds: string[];
  onSelectionChange: (loadIds: string[]) => void;
}

export function LoadSelector({
  selectedLoadIds,
  onSelectionChange,
}: LoadSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: loads, isLoading, error } = useLoads({ status: "pending" });

  const filteredLoads = useMemo(() => {
    if (!loads) return [];
    if (!searchQuery.trim()) return loads;

    const query = searchQuery.toLowerCase();
    return loads.filter(
      (load) =>
        load.load_number.toLowerCase().includes(query) ||
        load.customer_name.toLowerCase().includes(query) ||
        load.load_id.toLowerCase().includes(query)
    );
  }, [loads, searchQuery]);

  const toggleLoad = (loadId: string) => {
    if (selectedLoadIds.includes(loadId)) {
      onSelectionChange(selectedLoadIds.filter((id) => id !== loadId));
    } else {
      onSelectionChange([...selectedLoadIds, loadId]);
    }
  };

  if (error) {
    return (
      <div className="text-sm text-destructive">
        Failed to load loads. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-foreground">
          Select Loads
        </Label>
        {selectedLoadIds.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {selectedLoadIds.length} selected
          </Badge>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by load number, customer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[220px] rounded-md border border-border">
        {isLoading ? (
          <div className="p-3 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-4 w-4 mt-1 rounded" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredLoads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <Package className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? "No loads match your search"
                : "No unplanned loads available"}
            </p>
            {!searchQuery && (
              <p className="text-xs text-muted-foreground mt-1">
                Create loads in Fleet Management first
              </p>
            )}
          </div>
        ) : (
          <div className="p-1">
            {filteredLoads.map((load) => (
              <LoadRow
                key={load.load_id}
                load={load}
                isSelected={selectedLoadIds.includes(load.load_id)}
                onToggle={() => toggleLoad(load.load_id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function LoadRow({
  load,
  isSelected,
  onToggle,
}: {
  load: LoadListItem;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-start gap-3 p-3 rounded-md text-left transition-colors hover:bg-muted/50 ${
        isSelected ? "bg-muted/70" : ""
      }`}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggle}
        className="mt-0.5"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {load.load_number}
          </span>
          <span className="text-xs text-muted-foreground">
            {load.customer_name}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {load.stop_count} stops
          </span>
          <span className="text-xs text-muted-foreground">
            {load.weight_lbs?.toLocaleString()} lbs
          </span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {load.commodity_type}
          </Badge>
        </div>
      </div>
    </button>
  );
}
```

**Step 2: Verify compilation**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: No new errors.

**Step 3: Commit**

```bash
git add apps/web/src/app/dispatcher/create-plan/components/LoadSelector.tsx
git commit -m "feat(routing-ui): add LoadSelector component with search and multi-select"
```

---

## Task 4: Driver and Vehicle Selector Components

**Files:**
- Create: `apps/web/src/app/dispatcher/create-plan/components/DriverSelector.tsx`
- Create: `apps/web/src/app/dispatcher/create-plan/components/VehicleSelector.tsx`

**Step 1: Create DriverSelector component**

Shows drivers with HOS context — drive hours remaining, color-coded status.

Create `apps/web/src/app/dispatcher/create-plan/components/DriverSelector.tsx`:

```tsx
"use client";

import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useDrivers } from "@/features/fleet/drivers";

interface DriverSelectorProps {
  value: string;
  onChange: (driverId: string) => void;
}

function getHosColor(driveRemaining: number): string {
  if (driveRemaining >= 6) return "bg-green-500 dark:bg-green-400";
  if (driveRemaining >= 2) return "bg-yellow-500 dark:bg-yellow-400";
  return "bg-red-500 dark:bg-red-400";
}

function getHosLabel(driveRemaining: number): string {
  return `${driveRemaining.toFixed(1)}h drive left`;
}

export function DriverSelector({ value, onChange }: DriverSelectorProps) {
  const { data: drivers, isLoading } = useDrivers();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Driver</Label>
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">Driver</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select driver" />
        </SelectTrigger>
        <SelectContent>
          {drivers && drivers.length > 0 ? (
            drivers.map((driver) => {
              const driveRemaining =
                driver.current_hos?.drive_remaining ?? 11;
              return (
                <SelectItem key={driver.driver_id} value={driver.driver_id}>
                  <div className="flex items-center gap-2">
                    <span>{driver.name}</span>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <div
                        className={`h-2 w-2 rounded-full ${getHosColor(driveRemaining)}`}
                      />
                      <span className="text-xs text-muted-foreground">
                        {getHosLabel(driveRemaining)}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              );
            })
          ) : (
            <div className="p-2 text-sm text-muted-foreground text-center">
              No drivers available
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
```

**Step 2: Create VehicleSelector component**

Shows vehicles with fuel level context.

Create `apps/web/src/app/dispatcher/create-plan/components/VehicleSelector.tsx`:

```tsx
"use client";

import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useVehicles } from "@/features/fleet/vehicles";

interface VehicleSelectorProps {
  value: string;
  onChange: (vehicleId: string) => void;
}

function getFuelPercent(
  current?: number | null,
  capacity?: number | null
): number | null {
  if (!current || !capacity || capacity === 0) return null;
  return Math.round((current / capacity) * 100);
}

export function VehicleSelector({ value, onChange }: VehicleSelectorProps) {
  const { data: vehicles, isLoading } = useVehicles();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Vehicle</Label>
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">Vehicle</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select vehicle" />
        </SelectTrigger>
        <SelectContent>
          {vehicles && vehicles.length > 0 ? (
            vehicles.map((vehicle) => {
              const fuelPct = getFuelPercent(
                vehicle.current_fuel_gallons,
                vehicle.fuel_capacity_gallons
              );
              const label = [vehicle.make, vehicle.model]
                .filter(Boolean)
                .join(" ");
              return (
                <SelectItem
                  key={vehicle.vehicle_id}
                  value={vehicle.vehicle_id}
                >
                  <div className="flex items-center gap-2">
                    <span>{vehicle.unit_number}</span>
                    {label && (
                      <span className="text-xs text-muted-foreground">
                        {label}
                      </span>
                    )}
                    {fuelPct !== null && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {fuelPct}% fuel
                      </span>
                    )}
                  </div>
                </SelectItem>
              );
            })
          ) : (
            <div className="p-2 text-sm text-muted-foreground text-center">
              No vehicles available
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
```

**Step 3: Verify compilation**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

**Step 4: Commit**

```bash
git add apps/web/src/app/dispatcher/create-plan/components/DriverSelector.tsx apps/web/src/app/dispatcher/create-plan/components/VehicleSelector.tsx
git commit -m "feat(routing-ui): add DriverSelector and VehicleSelector with HOS/fuel context"
```

---

## Task 5: Planning Form (Phase 1)

**Files:**
- Create: `apps/web/src/app/dispatcher/create-plan/components/RoutePlanningForm.tsx`

**Step 1: Create the planning form component**

This is the main Phase 1 form — assembles all selectors, departure time, priority, advanced options.

Create `apps/web/src/app/dispatcher/create-plan/components/RoutePlanningForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { LoadSelector } from "./LoadSelector";
import { DriverSelector } from "./DriverSelector";
import { VehicleSelector } from "./VehicleSelector";
import type { CreateRoutePlanRequest } from "@/features/routing/route-planning";

interface RoutePlanningFormProps {
  onSubmit: (data: CreateRoutePlanRequest) => void;
  isSubmitting: boolean;
}

function getDefaultDepartureTime(): string {
  const now = new Date();
  now.setHours(now.getHours() + 1);
  // Round to nearest 15 min
  now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
  // Format as datetime-local value
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function RoutePlanningForm({
  onSubmit,
  isSubmitting,
}: RoutePlanningFormProps) {
  const [selectedLoadIds, setSelectedLoadIds] = useState<string[]>([]);
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [departureTime, setDepartureTime] = useState(getDefaultDepartureTime());
  const [priority, setPriority] = useState<string>("balance");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [preferredRestType, setPreferredRestType] = useState("auto");
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [maxFuelDetour, setMaxFuelDetour] = useState("15");

  const isValid =
    selectedLoadIds.length > 0 && driverId !== "" && vehicleId !== "";

  const handleSubmit = () => {
    if (!isValid) return;

    const request: CreateRoutePlanRequest = {
      driverId,
      vehicleId,
      loadIds: selectedLoadIds,
      departureTime: new Date(departureTime).toISOString(),
      optimizationPriority: priority as CreateRoutePlanRequest["optimizationPriority"],
      dispatcherParams: {
        preferredRestType: preferredRestType as "auto" | "full" | "split_8_2" | "split_7_3",
        avoidTollRoads: avoidTolls,
        maxDetourMilesForFuel: Number(maxFuelDetour) || 15,
      },
    };

    onSubmit(request);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Load Selection */}
      <LoadSelector
        selectedLoadIds={selectedLoadIds}
        onSelectionChange={setSelectedLoadIds}
      />

      {/* Driver + Vehicle row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DriverSelector value={driverId} onChange={setDriverId} />
        <VehicleSelector value={vehicleId} onChange={setVehicleId} />
      </div>

      {/* Departure Time */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">
          Departure Time
        </Label>
        <Input
          type="datetime-local"
          value={departureTime}
          onChange={(e) => setDepartureTime(e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
          className="max-w-[260px]"
        />
      </div>

      {/* Optimization Priority */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">
          Optimization Priority
        </Label>
        <RadioGroup
          value={priority}
          onValueChange={setPriority}
          className="flex gap-1"
        >
          {[
            { value: "minimize_time", label: "Fastest" },
            { value: "balance", label: "Balanced" },
            { value: "minimize_cost", label: "Cheapest" },
          ].map((option) => (
            <Label
              key={option.value}
              htmlFor={`priority-${option.value}`}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border cursor-pointer transition-colors text-sm ${
                priority === option.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              <RadioGroupItem
                value={option.value}
                id={`priority-${option.value}`}
                className="sr-only"
              />
              {option.label}
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* Advanced Options */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          {advancedOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Advanced Options
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-4 pl-5 border-l border-border">
          <div className="space-y-2">
            <Label className="text-sm text-foreground">
              Rest Preference
            </Label>
            <Select
              value={preferredRestType}
              onValueChange={setPreferredRestType}
            >
              <SelectTrigger className="max-w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (recommended)</SelectItem>
                <SelectItem value="full">Full rest only</SelectItem>
                <SelectItem value="split_8_2">Split 8+2</SelectItem>
                <SelectItem value="split_7_3">Split 7+3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="avoid-tolls"
              checked={avoidTolls}
              onCheckedChange={(checked) => setAvoidTolls(checked === true)}
            />
            <Label
              htmlFor="avoid-tolls"
              className="text-sm text-foreground cursor-pointer"
            >
              Avoid toll roads
            </Label>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-foreground">
              Max fuel detour (miles)
            </Label>
            <Input
              type="number"
              value={maxFuelDetour}
              onChange={(e) => setMaxFuelDetour(e.target.value)}
              min={0}
              max={50}
              className="max-w-[120px]"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={!isValid || isSubmitting}
        className="w-full h-12 text-base"
        size="lg"
      >
        {isSubmitting ? (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Planning...
          </div>
        ) : (
          "Plan Route"
        )}
      </Button>
    </div>
  );
}
```

**Step 2: Verify compilation**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add apps/web/src/app/dispatcher/create-plan/components/RoutePlanningForm.tsx
git commit -m "feat(routing-ui): add RoutePlanningForm with load/driver/vehicle selectors, priority, and advanced options"
```

---

## Task 6: Planning Animation Component

**Files:**
- Create: `apps/web/src/app/dispatcher/create-plan/components/PlanningAnimation.tsx`

**Step 1: Create the planning animation**

Shows animated progress steps while the API call is in-flight.

Create `apps/web/src/app/dispatcher/create-plan/components/PlanningAnimation.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";

const PLANNING_STEPS = [
  "Optimizing stop sequence",
  "Simulating HOS compliance",
  "Finding optimal fuel stops",
  "Checking weather conditions",
  "Building route plan",
];

const STEP_DELAY_MS = 800;

export function PlanningAnimation() {
  const [completedSteps, setCompletedSteps] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCompletedSteps((prev) => {
        if (prev >= PLANNING_STEPS.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, STEP_DELAY_MS);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-8">
      {/* Spinner */}
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-foreground" />

      {/* Title */}
      <div className="text-center">
        <h2 className="text-lg font-semibold text-foreground">
          SALLY is planning your route
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          This usually takes a few seconds
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-3 w-full max-w-xs">
        {PLANNING_STEPS.map((step, index) => {
          const isCompleted = index < completedSteps;
          const isCurrent = index === completedSteps;

          return (
            <div
              key={step}
              className={`flex items-center gap-3 transition-opacity duration-300 ${
                index <= completedSteps ? "opacity-100" : "opacity-0"
              }`}
            >
              {isCompleted ? (
                <div className="h-5 w-5 rounded-full bg-foreground flex items-center justify-center flex-shrink-0">
                  <Check className="h-3 w-3 text-background" />
                </div>
              ) : isCurrent ? (
                <div className="h-5 w-5 rounded-full border-2 border-foreground flex items-center justify-center flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-foreground animate-pulse" />
                </div>
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-muted flex-shrink-0" />
              )}
              <span
                className={`text-sm ${
                  isCompleted
                    ? "text-foreground"
                    : isCurrent
                      ? "text-foreground"
                      : "text-muted-foreground"
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/dispatcher/create-plan/components/PlanningAnimation.tsx
git commit -m "feat(routing-ui): add PlanningAnimation with animated step progress"
```

---

## Task 7: Route Result — Summary Stats + Compliance Card

**Files:**
- Create: `apps/web/src/app/dispatcher/create-plan/components/PlanSummaryStats.tsx`
- Create: `apps/web/src/app/dispatcher/create-plan/components/ComplianceCard.tsx`
- Create: `apps/web/src/app/dispatcher/create-plan/components/WeatherAlertsCard.tsx`

**Step 1: Create PlanSummaryStats**

Create `apps/web/src/app/dispatcher/create-plan/components/PlanSummaryStats.tsx`:

```tsx
"use client";

import { Card, CardContent } from "@/shared/components/ui/card";
import type { RoutePlanResult } from "@/features/routing/route-planning";

interface PlanSummaryStatsProps {
  plan: RoutePlanResult;
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function PlanSummaryStats({ plan }: PlanSummaryStatsProps) {
  const stats = [
    {
      value: plan.totalDistanceMiles.toLocaleString(undefined, {
        maximumFractionDigits: 0,
      }),
      unit: "mi",
      label: "Distance",
    },
    {
      value: formatHours(plan.totalTripTimeHours),
      unit: "",
      label: "Trip Time",
    },
    {
      value: plan.totalDrivingDays.toString(),
      unit: plan.totalDrivingDays === 1 ? "day" : "days",
      label: "Driving",
    },
    {
      value: `$${plan.totalCostEstimate.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`,
      unit: "",
      label: "Est. Cost",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">
              {stat.value}
              {stat.unit && (
                <span className="text-base font-normal text-muted-foreground ml-1">
                  {stat.unit}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stat.label}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**Step 2: Create ComplianceCard**

Create `apps/web/src/app/dispatcher/create-plan/components/ComplianceCard.tsx`:

```tsx
"use client";

import { Check, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import type { ComplianceReport } from "@/features/routing/route-planning";

interface ComplianceCardProps {
  report: ComplianceReport;
}

export function ComplianceCard({ report }: ComplianceCardProps) {
  const summaryParts: string[] = [];
  if (report.totalRestStops > 0)
    summaryParts.push(
      `${report.totalRestStops} rest stop${report.totalRestStops > 1 ? "s" : ""}`
    );
  if (report.totalBreaks > 0)
    summaryParts.push(
      `${report.totalBreaks} break${report.totalBreaks > 1 ? "s" : ""}`
    );
  if (report.total34hRestarts > 0)
    summaryParts.push(`${report.total34hRestarts} restart`);
  if (report.totalSplitRests > 0)
    summaryParts.push(`${report.totalSplitRests} split rest`);
  if (report.dockTimeConversions > 0)
    summaryParts.push(`${report.dockTimeConversions} dock conversion`);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {report.isFullyCompliant ? (
            <>
              <div className="h-5 w-5 rounded-full bg-green-500 dark:bg-green-400 flex items-center justify-center">
                <Check className="h-3 w-3 text-white dark:text-black" />
              </div>
              <span>HOS Fully Compliant</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
              <span>HOS Requires Attention</span>
            </>
          )}
        </CardTitle>
        {summaryParts.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {summaryParts.join(" \u00B7 ")}
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {report.rules.map((rule) => (
            <div key={rule.rule} className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-green-500 dark:text-green-400 flex-shrink-0" />
              <span className="text-sm text-muted-foreground">{rule.rule}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 3: Create WeatherAlertsCard**

Create `apps/web/src/app/dispatcher/create-plan/components/WeatherAlertsCard.tsx`:

```tsx
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
): "default" | "secondary" | "destructive" | "outline" {
  switch (severity) {
    case "severe":
      return "destructive";
    case "moderate":
      return "default";
    default:
      return "secondary";
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
          <div
            key={i}
            className="flex items-start gap-3 text-sm"
          >
            <Badge variant={getSeverityVariant(alert.severity)} className="text-xs mt-0.5">
              {alert.severity}
            </Badge>
            <div>
              <span className="text-foreground capitalize">
                {alert.condition}
              </span>
              <span className="text-muted-foreground">
                {" "}
                — {alert.description}
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
```

**Step 4: Verify compilation**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

**Step 5: Commit**

```bash
git add apps/web/src/app/dispatcher/create-plan/components/PlanSummaryStats.tsx apps/web/src/app/dispatcher/create-plan/components/ComplianceCard.tsx apps/web/src/app/dispatcher/create-plan/components/WeatherAlertsCard.tsx
git commit -m "feat(routing-ui): add PlanSummaryStats, ComplianceCard, and WeatherAlertsCard components"
```

---

## Task 8: Route Result — Segment Timeline

**Files:**
- Create: `apps/web/src/app/dispatcher/create-plan/components/DayTimeline.tsx`

**Step 1: Create the DayTimeline component**

This is the core visual — the segment-by-segment timeline grouped by day. Each segment type gets its own visual treatment.

Create `apps/web/src/app/dispatcher/create-plan/components/DayTimeline.tsx`:

```tsx
"use client";

import {
  MapPin,
  Moon,
  Fuel,
  Coffee,
  Truck,
  Clock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import type {
  RouteSegment,
  DayBreakdown,
} from "@/features/routing/route-planning";

interface DayTimelineProps {
  day: DayBreakdown;
  segments: RouteSegment[];
  isLastDay: boolean;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
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

function SegmentIcon({ type }: { type: string }) {
  const iconClass = "h-4 w-4";
  switch (type) {
    case "dock":
      return <MapPin className={iconClass} />;
    case "rest":
      return <Moon className={iconClass} />;
    case "fuel":
      return <Fuel className={iconClass} />;
    case "break":
      return <Coffee className={iconClass} />;
    case "drive":
      return <Truck className={iconClass} />;
    default:
      return <Clock className={iconClass} />;
  }
}

function getSegmentIconBg(type: string): string {
  switch (type) {
    case "dock":
      return "bg-foreground text-background";
    case "rest":
      return "bg-gray-600 dark:bg-gray-400 text-white dark:text-black";
    case "fuel":
      return "bg-gray-500 dark:bg-gray-500 text-white";
    case "break":
      return "bg-gray-400 dark:bg-gray-600 text-white dark:text-gray-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function DriveInfo({ segment }: { segment: RouteSegment }) {
  return (
    <div className="flex items-center gap-2 py-3 pl-11 text-sm text-muted-foreground">
      <div className="flex-1 border-t border-dashed border-border" />
      <span>
        {segment.distanceMiles?.toLocaleString(undefined, {
          maximumFractionDigits: 0,
        })}{" "}
        mi
      </span>
      <span>&middot;</span>
      <span>{formatDuration(segment.driveTimeHours || 0)}</span>
      <div className="flex-1 border-t border-dashed border-border" />
    </div>
  );
}

function StopNode({ segment }: { segment: RouteSegment }) {
  const time = segment.estimatedArrival
    ? formatTime(segment.estimatedArrival)
    : "";

  return (
    <div className="flex items-start gap-3 py-2 group hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors">
      {/* Time */}
      <div className="w-[72px] text-right flex-shrink-0 pt-0.5">
        <span className="text-xs text-muted-foreground tabular-nums">
          {time}
        </span>
      </div>

      {/* Icon */}
      <div
        className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${getSegmentIconBg(segment.segmentType)}`}
      >
        <SegmentIcon type={segment.segmentType} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        {segment.segmentType === "dock" && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 uppercase tracking-wider"
              >
                {segment.actionType || "stop"}
              </Badge>
              <span className="text-sm font-medium text-foreground truncate">
                {segment.toLocation}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {formatDuration(segment.dockDurationHours || 0)} dock
              {segment.customerName && ` \u00B7 ${segment.customerName}`}
              {segment.isDocktimeConverted && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1 py-0 ml-2"
                >
                  counts as rest
                </Badge>
              )}
            </div>
          </>
        )}

        {segment.segmentType === "rest" && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {segment.toLocation || "Rest Stop"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {formatDuration(segment.restDurationHours || 0)}{" "}
              {segment.restType
                ?.replace(/_/g, " ")
                .replace("full rest", "full rest")
                .replace("restart 34h", "34h restart")}
            </div>
            {segment.restReason && (
              <div className="text-xs text-muted-foreground mt-0.5 italic">
                {segment.restReason}
              </div>
            )}
          </>
        )}

        {segment.segmentType === "fuel" && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {segment.fuelStationName || segment.toLocation || "Fuel Stop"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {segment.fuelGallons} gal @ ${segment.fuelPricePerGallon?.toFixed(2)}/gal
              {segment.fuelCostEstimate &&
                ` = $${segment.fuelCostEstimate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              {segment.detourMiles && segment.detourMiles > 0 && (
                <span>
                  {" "}
                  &middot; {segment.detourMiles.toFixed(1)} mi detour
                </span>
              )}
            </div>
          </>
        )}

        {segment.segmentType === "break" && (
          <>
            <div className="text-sm font-medium text-foreground">
              Mandatory Break
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {formatDuration(segment.restDurationHours || 0.5)}
              {segment.restReason && ` \u00B7 ${segment.restReason}`}
            </div>
          </>
        )}

        {/* HOS state indicator for rest/break */}
        {(segment.segmentType === "rest" ||
          segment.segmentType === "break") &&
          segment.hosStateAfter && (
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                HOS after:
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {segment.hosStateAfter.hoursDriven.toFixed(1)}h driven
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {segment.hosStateAfter.onDutyTime.toFixed(1)}h on-duty
              </span>
            </div>
          )}
      </div>
    </div>
  );
}

export function DayTimeline({ day, segments, isLastDay }: DayTimelineProps) {
  // Separate drives from stops for rendering
  const stopSegments = segments.filter((s) => s.segmentType !== "drive");
  const driveSegments = segments.filter((s) => s.segmentType === "drive");

  // Build interleaved display: stop, drive, stop, drive, stop...
  // Pair each drive with the stop before it
  const renderItems: Array<
    { type: "stop"; segment: RouteSegment } | { type: "drive"; segment: RouteSegment }
  > = [];

  // Walk through all segments in order and build render list
  for (const segment of segments) {
    if (segment.segmentType === "drive") {
      renderItems.push({ type: "drive", segment });
    } else {
      renderItems.push({ type: "stop", segment });
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>
            Day {day.day} — {formatDate(day.date)}
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {formatDuration(day.driveHours)} driving &middot;{" "}
            {formatDuration(day.onDutyHours)} on-duty &middot; {day.segments}{" "}
            segments
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[99px] top-0 bottom-0 w-px bg-border" />

          {renderItems.map((item, index) => {
            if (item.type === "drive") {
              return <DriveInfo key={item.segment.segmentId} segment={item.segment} />;
            }
            return <StopNode key={item.segment.segmentId} segment={item.segment} />;
          })}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Verify compilation**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add apps/web/src/app/dispatcher/create-plan/components/DayTimeline.tsx
git commit -m "feat(routing-ui): add DayTimeline component with segment-by-segment route visualization"
```

---

## Task 9: Route Result Container

**Files:**
- Create: `apps/web/src/app/dispatcher/create-plan/components/RoutePlanResult.tsx`

**Step 1: Create RoutePlanResult container**

Assembles all result sub-components into the Phase 2 view.

Create `apps/web/src/app/dispatcher/create-plan/components/RoutePlanResult.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
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
import { PlanSummaryStats } from "./PlanSummaryStats";
import { ComplianceCard } from "./ComplianceCard";
import { WeatherAlertsCard } from "./WeatherAlertsCard";
import { DayTimeline } from "./DayTimeline";
import { useActivateRoute } from "@/features/routing/route-planning";
import type { RoutePlanResult as RoutePlanResultType } from "@/features/routing/route-planning";

interface RoutePlanResultProps {
  plan: RoutePlanResultType;
  onNewPlan: () => void;
}

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
}

/**
 * Groups segments by day using the dailyBreakdown data.
 * Assigns segments to days based on their estimated arrival date.
 */
function groupSegmentsByDay(plan: RoutePlanResultType) {
  const days = plan.dailyBreakdown || [];
  if (days.length === 0) {
    // Fallback: single day with all segments
    return [
      {
        day: {
          day: 1,
          date: plan.departureTime.split("T")[0],
          driveHours: plan.totalDriveTimeHours,
          onDutyHours: plan.totalTripTimeHours,
          segments: plan.segments.length,
          restStops: 0,
        },
        segments: plan.segments,
      },
    ];
  }

  return days.map((day) => {
    const dayDate = day.date;
    const daySegments = plan.segments.filter((seg) => {
      const segDate = (seg.estimatedArrival || seg.estimatedDeparture || "").split("T")[0];
      return segDate === dayDate;
    });
    return { day, segments: daySegments };
  });
}

export function RoutePlanResult({ plan, onNewPlan }: RoutePlanResultProps) {
  const activateRoute = useActivateRoute();
  const [isActivated, setIsActivated] = useState(false);

  const dayGroups = groupSegmentsByDay(plan);

  const handleActivate = async () => {
    try {
      await activateRoute.mutateAsync(plan.planId);
      setIsActivated(true);
    } catch (err) {
      // Error handled by mutation state
    }
  };

  const currentStatus = isActivated ? "active" : plan.status;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onNewPlan}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            New Plan
          </Button>
        </div>

        {currentStatus !== "active" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={activateRoute.isPending}
              >
                {activateRoute.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Activating...
                  </div>
                ) : (
                  "Activate Route"
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Activate this route?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will activate route {plan.planId} and deactivate any
                  currently active route for this driver.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleActivate}>
                  Activate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {currentStatus === "active" && (
          <Badge
            variant="default"
            className="bg-green-600 dark:bg-green-500 text-white"
          >
            Activated
          </Badge>
        )}
      </div>

      {/* Plan ID + Status */}
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-xl font-semibold text-foreground">
          {plan.planId}
        </h2>
        <Badge variant={getStatusVariant(currentStatus)}>
          {currentStatus}
        </Badge>
      </div>

      {/* Infeasible Warning */}
      {!plan.isFeasible && (
        <Alert variant="destructive">
          <AlertDescription>
            <strong>Feasibility Issues:</strong>
            <ul className="list-disc list-inside mt-1">
              {plan.feasibilityIssues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Activation Error */}
      {activateRoute.isError && (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to activate route. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <PlanSummaryStats plan={plan} />

      {/* Compliance */}
      <ComplianceCard report={plan.complianceReport} />

      {/* Weather Alerts */}
      <WeatherAlertsCard alerts={plan.weatherAlerts} />

      {/* Day-by-Day Timeline */}
      <div className="space-y-4">
        {dayGroups.map(({ day, segments }, index) => (
          <DayTimeline
            key={day.day}
            day={day}
            segments={segments}
            isLastDay={index === dayGroups.length - 1}
          />
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="ghost" onClick={onNewPlan}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Plan Another Route
        </Button>

        {currentStatus !== "active" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={activateRoute.isPending}>
                Activate Route
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Activate this route?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will activate route {plan.planId} and deactivate any
                  currently active route for this driver.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleActivate}>
                  Activate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify compilation**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add apps/web/src/app/dispatcher/create-plan/components/RoutePlanResult.tsx
git commit -m "feat(routing-ui): add RoutePlanResult container with activation flow and day-grouped timeline"
```

---

## Task 10: Wire Up the Main Page

**Files:**
- Modify: `apps/web/src/app/dispatcher/create-plan/page.tsx`

**Step 1: Rewrite the create-plan page**

Replace the stub with the full two-phase experience.

Rewrite `apps/web/src/app/dispatcher/create-plan/page.tsx`:

```tsx
"use client";

/**
 * Route Planning — SALLY's flagship feature
 *
 * Two-phase single screen:
 * Phase 1: Planning form (load, driver, vehicle, departure, priority)
 * Phase 2: Route result (summary, compliance, timeline, activation)
 */

import { useState } from "react";
import { FeatureGuard } from "@/features/platform/feature-flags";
import { RoutePlanningForm } from "./components/RoutePlanningForm";
import { PlanningAnimation } from "./components/PlanningAnimation";
import { RoutePlanResult } from "./components/RoutePlanResult";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { usePlanRoute } from "@/features/routing/route-planning";
import type {
  CreateRoutePlanRequest,
  RoutePlanResult as RoutePlanResultType,
} from "@/features/routing/route-planning";

type Phase = "form" | "planning" | "result";

export default function CreatePlanPage() {
  const [phase, setPhase] = useState<Phase>("form");
  const [planResult, setPlanResult] = useState<RoutePlanResultType | null>(null);
  const planRoute = usePlanRoute();

  const handleSubmit = async (data: CreateRoutePlanRequest) => {
    setPhase("planning");

    // Ensure animation shows for at least 3 seconds
    const minDelay = new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      const [result] = await Promise.all([
        planRoute.mutateAsync(data),
        minDelay,
      ]);
      setPlanResult(result);
      setPhase("result");
    } catch {
      // Error — go back to form
      setPhase("form");
    }
  };

  const handleNewPlan = () => {
    setPlanResult(null);
    planRoute.reset();
    setPhase("form");
  };

  return (
    <FeatureGuard featureKey="route_planning_enabled">
      <div className="min-h-[calc(100vh-120px)] py-6 px-4 md:px-6">
        {/* Phase 1: Form */}
        {phase === "form" && (
          <div className="space-y-6">
            <div className="max-w-2xl mx-auto">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                Create Route Plan
              </h1>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                Plan optimized routes with zero HOS violations and automatic
                rest stop insertion
              </p>
            </div>

            {/* API Error */}
            {planRoute.isError && (
              <div className="max-w-2xl mx-auto">
                <Alert variant="destructive">
                  <AlertDescription>
                    {(planRoute.error as any)?.message ||
                      "Failed to plan route. Please check your inputs and try again."}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <RoutePlanningForm
              onSubmit={handleSubmit}
              isSubmitting={planRoute.isPending}
            />
          </div>
        )}

        {/* Phase 1.5: Planning Animation */}
        {phase === "planning" && <PlanningAnimation />}

        {/* Phase 2: Result */}
        {phase === "result" && planResult && (
          <RoutePlanResult plan={planResult} onNewPlan={handleNewPlan} />
        )}
      </div>
    </FeatureGuard>
  );
}
```

**Step 2: Verify compilation**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Verify the app builds**

```bash
cd /Users/ajay-admin/sally && pnpm --filter web build 2>&1 | tail -20
```

Expected: Build succeeds.

**Step 4: Commit**

```bash
git add apps/web/src/app/dispatcher/create-plan/page.tsx
git commit -m "feat(routing-ui): wire up create-plan page with form → animation → result flow"
```

---

## Task 11: Visual Polish and Responsive Testing

**Files:**
- May modify: any component from Tasks 3-10

**Step 1: Start the dev server and test**

```bash
cd /Users/ajay-admin/sally && pnpm dev
```

**Step 2: Test in browser**

Navigate to `http://localhost:3000/dispatcher/create-plan` and verify:

- [ ] Form renders with all selectors (loads, driver, vehicle, departure, priority)
- [ ] Load search and multi-select works
- [ ] Driver dropdown shows HOS context
- [ ] Vehicle dropdown shows fuel context
- [ ] Advanced options expand/collapse
- [ ] Priority radio chips highlight correctly
- [ ] Plan Route button disabled when fields empty, enabled when valid
- [ ] Planning animation appears and steps animate in
- [ ] Result view shows summary stats, compliance, weather (if any), timeline
- [ ] Activate Route shows confirmation dialog
- [ ] "New Plan" button resets to form
- [ ] Dark mode: toggle theme and verify all elements render correctly
- [ ] Responsive: test at 375px, 768px, and 1440px widths

**Step 3: Fix any visual issues found**

Adjust spacing, colors, responsive breakpoints as needed.

**Step 4: Commit**

```bash
git add -A
git commit -m "fix(routing-ui): visual polish and responsive adjustments"
```

---

## Task 12: Final Verification

**Step 1: Run full TypeScript check**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: Zero errors.

**Step 2: Run build**

```bash
cd /Users/ajay-admin/sally && pnpm --filter web build
```

Expected: Build succeeds with zero errors.

**Step 3: Final commit (if any remaining changes)**

```bash
git status
```

If clean, this task is complete.

---

## Summary

| Task | Component | Description |
|------|-----------|-------------|
| 1 | Shadcn installs | Install checkbox, radio-group |
| 2 | API layer | Types, api client, React Query hooks for route planning |
| 3 | LoadSelector | Multi-select searchable load picker |
| 4 | DriverSelector + VehicleSelector | Dropdowns with HOS/fuel context |
| 5 | RoutePlanningForm | Main form assembling all selectors + options |
| 6 | PlanningAnimation | Animated loading state during API call |
| 7 | Summary + Compliance + Weather | Result header cards |
| 8 | DayTimeline | Segment-by-segment route visualization |
| 9 | RoutePlanResult | Result container with activation flow |
| 10 | page.tsx | Wire up form → animation → result phases |
| 11 | Visual polish | Browser testing + responsive + dark mode fixes |
| 12 | Final verification | TypeScript + build check |
