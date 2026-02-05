# Frontend Domain Architecture Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate SALLY frontend from feature-based structure to domain-aligned feature modules that mirror backend domain organization while maintaining Next.js best practices.

**Architecture:** Adopt hybrid architecture (Option 2) with domain-aligned `features/` directory containing business logic, components, and API clients, while keeping Next.js `app/` directory route-based for pages. This provides consistency with backend mental model without sacrificing frontend composability.

**Tech Stack:** Next.js 15, TypeScript, Zustand, React Query, Tailwind CSS, Shadcn/ui

**Reading Time:** 35 minutes

---

## Table of Contents

1. [Overview](#overview)
2. [Target Architecture](#target-architecture)
3. [Migration Principles](#migration-principles)
4. [Phase 1: Setup Infrastructure](#phase-1-setup-infrastructure)
5. [Phase 2: Fleet Domain](#phase-2-fleet-domain)
6. [Phase 3: Routing Domain](#phase-3-routing-domain)
7. [Phase 4: Operations Domain](#phase-4-operations-domain)
8. [Phase 5: Platform Domain](#phase-5-platform-domain)
9. [Phase 6: Shared Components](#phase-6-shared-components)
10. [Phase 7: Cleanup](#phase-7-cleanup)
11. [Testing Strategy](#testing-strategy)
12. [Rollback Plan](#rollback-plan)

---

## Overview

### Current Structure

```
src/
├── app/                    # Next.js pages (route-based)
├── components/             # Mixed feature components
│   ├── route-planner/
│   ├── drivers/
│   ├── auth/
│   ├── users/
│   ├── settings/
│   └── ui/
├── lib/
│   ├── api/               # Flat API clients
│   ├── types/             # Flat type definitions
│   └── hooks/
└── stores/                # Flat stores
```

### Target Structure

```
src/
├── app/                           # Next.js pages (unchanged)
│
├── features/                      # Domain-aligned feature modules
│   ├── fleet/
│   │   ├── drivers/
│   │   │   ├── components/       # Driver UI components
│   │   │   ├── hooks/            # useDrivers, useDriverById
│   │   │   ├── api.ts            # driversApi
│   │   │   ├── store.ts          # driversStore (if needed)
│   │   │   ├── types.ts          # Driver types
│   │   │   └── index.ts          # Barrel export
│   │   ├── vehicles/
│   │   └── loads/
│   │
│   ├── routing/
│   │   ├── route-planning/
│   │   │   ├── components/       # Route planner components
│   │   │   ├── hooks/
│   │   │   ├── api.ts
│   │   │   ├── store.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── optimization/
│   │   └── hos-compliance/
│   │
│   ├── operations/
│   │   ├── alerts/
│   │   └── monitoring/
│   │
│   └── platform/
│       ├── auth/
│       ├── users/
│       ├── preferences/
│       ├── feature-flags/
│       └── onboarding/
│
├── shared/                        # Cross-domain shared code
│   ├── components/
│   │   ├── ui/                   # Shadcn UI components
│   │   ├── layout/               # Layout components
│   │   └── common/               # Common business components
│   ├── hooks/                    # Shared hooks
│   ├── lib/
│   │   ├── api/                  # Base API client
│   │   └── utils/
│   └── types/                    # Shared types
│
└── config/                       # App configuration
```

### Domain Alignment with Backend

| Frontend Feature | Backend Domain | Notes |
|------------------|----------------|-------|
| `features/fleet/drivers` | `domains/fleet/drivers` | Driver management |
| `features/fleet/vehicles` | `domains/fleet/vehicles` | Vehicle management |
| `features/fleet/loads` | `domains/fleet/loads` | Load management |
| `features/routing/route-planning` | `domains/routing/route-planning` | Route planning engine |
| `features/routing/optimization` | `domains/routing/optimization` | REST optimization |
| `features/routing/hos-compliance` | `domains/routing/hos-compliance` | HOS rules |
| `features/operations/alerts` | `domains/operations/alerts` | Alert system |
| `features/platform/auth` | `auth/` | Authentication |
| `features/platform/users` | `domains/platform/users` | User management |
| `features/platform/preferences` | `domains/platform/preferences` | User preferences |

---

## Migration Principles

### 1. Zero Breaking Changes
- All functionality must continue to work during migration
- Pages can continue using old imports while migration is in progress
- Both old and new paths work during transition

### 2. Incremental Migration
- Migrate one domain at a time
- Each domain can be migrated independently
- Team members can work on different domains in parallel

### 3. Barrel Exports for Clean APIs
- Each feature exports a public API via `index.ts`
- Internal implementation details are hidden
- Clean imports: `import { DriversList, useDrivers } from '@/features/fleet/drivers'`

### 4. Feature Co-location
- Related code lives together (components, hooks, API, types, store)
- Reduces cognitive load ("where does this code live?")
- Easier to understand feature boundaries

### 5. Testability
- Each feature module is independently testable
- Tests co-located with features
- Shared test utilities in `shared/lib/test-utils`

---

## Phase 1: Setup Infrastructure

### Task 1.1: Create Directory Structure

**Files:**
- Create: `src/features/` (new directory)
- Create: `src/shared/` (new directory)

**Step 1: Create feature domains**

```bash
mkdir -p src/features/fleet/{drivers,vehicles,loads}
mkdir -p src/features/routing/{route-planning,optimization,hos-compliance}
mkdir -p src/features/operations/{alerts,monitoring}
mkdir -p src/features/platform/{auth,users,preferences,feature-flags,onboarding}
```

**Step 2: Create shared directories**

```bash
mkdir -p src/shared/components/{ui,layout,common}
mkdir -p src/shared/hooks
mkdir -p src/shared/lib/{api,utils,test-utils}
mkdir -p src/shared/types
```

**Step 3: Create subdirectories for each feature**

```bash
# Fleet features
for feature in drivers vehicles loads; do
  mkdir -p src/features/fleet/$feature/{components,hooks,__tests__}
done

# Routing features
for feature in route-planning optimization hos-compliance; do
  mkdir -p src/features/routing/$feature/{components,hooks,__tests__}
done

# Operations features
for feature in alerts monitoring; do
  mkdir -p src/features/operations/$feature/{components,hooks,__tests__}
done

# Platform features
for feature in auth users preferences feature-flags onboarding; do
  mkdir -p src/features/platform/$feature/{components,hooks,__tests__}
done
```

**Step 4: Verify directory structure**

Run: `tree -L 4 src/features/`

Expected output should show domain-aligned structure.

**Step 5: Commit**

```bash
git add src/features src/shared
git commit -m "feat: create domain-aligned directory structure for features and shared code"
```

---

### Task 1.2: Update TypeScript Path Aliases

**Files:**
- Modify: `tsconfig.json`

**Step 1: Add path aliases for new structure**

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/features/*": ["./src/features/*"],
      "@/shared/*": ["./src/shared/*"],
      "@/config/*": ["./src/config/*"]
    }
  }
}
```

**Step 2: Verify TypeScript config**

Run: `npm run type-check`

Expected: No errors (no code moved yet, but aliases registered)

**Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "feat: add TypeScript path aliases for domain architecture"
```

---

### Task 1.3: Create Base API Client in Shared

**Files:**
- Move: `src/lib/api/client.ts` → `src/shared/lib/api/client.ts`

**Step 1: Move base API client**

```bash
mv src/lib/api/client.ts src/shared/lib/api/client.ts
```

**Step 2: Create barrel export**

Create: `src/shared/lib/api/index.ts`

```typescript
export { apiClient, setAuthToken, clearAuthToken } from './client';
export type { ApiError, ApiResponse } from './client';
```

**Step 3: Update imports in existing API files**

```bash
# Update all imports of the old path
find src/lib/api -type f -name "*.ts" -exec sed -i '' 's|from '\''\.\/client'\''|from '\''@/shared/lib/api'\''|g' {} +
```

**Step 4: Test that app still builds**

Run: `npm run build`

Expected: Success (all imports still resolve)

**Step 5: Commit**

```bash
git add src/shared/lib/api src/lib/api
git commit -m "refactor: move base API client to shared/lib/api"
```

---

## Phase 2: Fleet Domain

### Task 2.1: Migrate Drivers Feature

**Files:**
- Move: `src/components/drivers/*` → `src/features/fleet/drivers/components/`
- Move: `src/lib/api/drivers.ts` → `src/features/fleet/drivers/api.ts`
- Move: `src/lib/types/driver.ts` → `src/features/fleet/drivers/types.ts`
- Create: `src/features/fleet/drivers/hooks/use-drivers.ts`
- Create: `src/features/fleet/drivers/index.ts` (barrel export)

**Step 1: Move driver components**

```bash
mv src/components/drivers/driver-list.tsx src/features/fleet/drivers/components/
mv src/components/drivers/driver-activation-dialog.tsx src/features/fleet/drivers/components/
```

**Step 2: Move driver API client**

```bash
mv src/lib/api/drivers.ts src/features/fleet/drivers/api.ts
```

**Step 3: Update import in api.ts**

Modify: `src/features/fleet/drivers/api.ts`

```typescript
// Change import
import { apiClient } from '@/shared/lib/api';

// Export as named export
export const driversApi = {
  list: async (params?: { page?: number; limit?: number }) => {
    // ... existing code
  },
  getById: async (driverId: string) => {
    // ... existing code
  },
  create: async (data: CreateDriverRequest) => {
    // ... existing code
  },
  update: async (driverId: string, data: UpdateDriverRequest) => {
    // ... existing code
  },
  delete: async (driverId: string) => {
    // ... existing code
  },
  activate: async (driverId: string) => {
    // ... existing code
  },
};
```

**Step 4: Move driver types**

```bash
mv src/lib/types/driver.ts src/features/fleet/drivers/types.ts
```

**Step 5: Create useDrivers hook**

Create: `src/features/fleet/drivers/hooks/use-drivers.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driversApi } from '../api';
import type { Driver, CreateDriverRequest, UpdateDriverRequest } from '../types';

const QUERY_KEY = ['fleet', 'drivers'];

export function useDrivers(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...QUERY_KEY, params],
    queryFn: () => driversApi.list(params),
  });
}

export function useDriver(driverId: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, driverId],
    queryFn: () => driversApi.getById(driverId),
    enabled: !!driverId,
  });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDriverRequest) => driversApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ driverId, data }: { driverId: string; data: UpdateDriverRequest }) =>
      driversApi.update(driverId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, variables.driverId] });
    },
  });
}

export function useDeleteDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (driverId: string) => driversApi.delete(driverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useActivateDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (driverId: string) => driversApi.activate(driverId),
    onSuccess: (_, driverId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, driverId] });
    },
  });
}
```

**Step 6: Create barrel export**

Create: `src/features/fleet/drivers/index.ts`

```typescript
// Components
export { default as DriverList } from './components/driver-list';
export { default as DriverActivationDialog } from './components/driver-activation-dialog';

// Hooks
export {
  useDrivers,
  useDriver,
  useCreateDriver,
  useUpdateDriver,
  useDeleteDriver,
  useActivateDriver,
} from './hooks/use-drivers';

// API
export { driversApi } from './api';

// Types
export type {
  Driver,
  CreateDriverRequest,
  UpdateDriverRequest,
  DriverStatus,
  HOSStatus,
} from './types';
```

**Step 7: Update component imports**

Modify: `src/features/fleet/drivers/components/driver-list.tsx`

```typescript
// Update imports
import { useDrivers, useDeleteDriver } from '../hooks/use-drivers';
import type { Driver } from '../types';
```

Modify: `src/features/fleet/drivers/components/driver-activation-dialog.tsx`

```typescript
// Update imports
import { useActivateDriver } from '../hooks/use-drivers';
import type { Driver } from '../types';
```

**Step 8: Create compatibility re-exports (temporary)**

Create: `src/lib/api/drivers.ts` (temporary compatibility)

```typescript
// Temporary re-export for backward compatibility
export * from '@/features/fleet/drivers';
```

Create: `src/lib/types/driver.ts` (temporary compatibility)

```typescript
// Temporary re-export for backward compatibility
export * from '@/features/fleet/drivers';
```

Create: `src/components/drivers/driver-list.tsx` (temporary compatibility)

```typescript
// Temporary re-export for backward compatibility
export { default } from '@/features/fleet/drivers';
```

Create: `src/components/drivers/driver-activation-dialog.tsx` (temporary compatibility)

```typescript
// Temporary re-export for backward compatibility
export { DriverActivationDialog as default } from '@/features/fleet/drivers';
```

**Step 9: Test that app still works**

Run: `npm run dev`

Expected: App starts successfully, driver pages work correctly

**Step 10: Test type checking**

Run: `npm run type-check`

Expected: No TypeScript errors

**Step 11: Commit**

```bash
git add src/features/fleet/drivers src/lib/api/drivers.ts src/lib/types/driver.ts src/components/drivers
git commit -m "refactor(fleet): migrate drivers feature to domain architecture

- Move components to features/fleet/drivers/components
- Move API client to features/fleet/drivers/api.ts
- Move types to features/fleet/drivers/types.ts
- Create React Query hooks for driver operations
- Add barrel export for clean imports
- Add temporary re-exports for backward compatibility"
```

---

### Task 2.2: Migrate Vehicles Feature

**Files:**
- Move: `src/lib/api/vehicles.ts` → `src/features/fleet/vehicles/api.ts`
- Move: `src/lib/types/vehicle.ts` → `src/features/fleet/vehicles/types.ts` (if exists)
- Create: `src/features/fleet/vehicles/hooks/use-vehicles.ts`
- Create: `src/features/fleet/vehicles/index.ts`

**Step 1: Move vehicle API client**

```bash
mv src/lib/api/vehicles.ts src/features/fleet/vehicles/api.ts
```

**Step 2: Update import in api.ts**

Modify: `src/features/fleet/vehicles/api.ts`

```typescript
import { apiClient } from '@/shared/lib/api';

export const vehiclesApi = {
  list: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get('/vehicles', { params });
    return response.data;
  },
  getById: async (vehicleId: string) => {
    const response = await apiClient.get(`/vehicles/${vehicleId}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await apiClient.post('/vehicles', data);
    return response.data;
  },
  update: async (vehicleId: string, data: any) => {
    const response = await apiClient.put(`/vehicles/${vehicleId}`, data);
    return response.data;
  },
  delete: async (vehicleId: string) => {
    const response = await apiClient.delete(`/vehicles/${vehicleId}`);
    return response.data;
  },
};
```

**Step 3: Create vehicle types**

Create: `src/features/fleet/vehicles/types.ts`

```typescript
export interface Vehicle {
  id: string;
  vehicleId: string;
  make?: string;
  model?: string;
  year?: number;
  licensePlate?: string;
  vin?: string;
  fuelType?: 'DIESEL' | 'GASOLINE' | 'ELECTRIC' | 'HYBRID';
  fuelCapacity?: number;
  currentFuelLevel?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  externalSource?: string;
  externalId?: string;
  tenantId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleRequest {
  vehicleId: string;
  make?: string;
  model?: string;
  year?: number;
  licensePlate?: string;
  vin?: string;
  fuelType?: 'DIESEL' | 'GASOLINE' | 'ELECTRIC' | 'HYBRID';
  fuelCapacity?: number;
  currentFuelLevel?: number;
}

export interface UpdateVehicleRequest extends Partial<CreateVehicleRequest> {}
```

**Step 4: Create useVehicles hook**

Create: `src/features/fleet/vehicles/hooks/use-vehicles.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehiclesApi } from '../api';
import type { Vehicle, CreateVehicleRequest, UpdateVehicleRequest } from '../types';

const QUERY_KEY = ['fleet', 'vehicles'];

export function useVehicles(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...QUERY_KEY, params],
    queryFn: () => vehiclesApi.list(params),
  });
}

export function useVehicle(vehicleId: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, vehicleId],
    queryFn: () => vehiclesApi.getById(vehicleId),
    enabled: !!vehicleId,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVehicleRequest) => vehiclesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vehicleId, data }: { vehicleId: string; data: UpdateVehicleRequest }) =>
      vehiclesApi.update(vehicleId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, variables.vehicleId] });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vehicleId: string) => vehiclesApi.delete(vehicleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
```

**Step 5: Create barrel export**

Create: `src/features/fleet/vehicles/index.ts`

```typescript
// Hooks
export {
  useVehicles,
  useVehicle,
  useCreateVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
} from './hooks/use-vehicles';

// API
export { vehiclesApi } from './api';

// Types
export type {
  Vehicle,
  CreateVehicleRequest,
  UpdateVehicleRequest,
} from './types';
```

**Step 6: Create compatibility re-export**

Create: `src/lib/api/vehicles.ts` (temporary)

```typescript
export * from '@/features/fleet/vehicles';
```

**Step 7: Test app**

Run: `npm run dev`

Expected: App works, vehicle-related features functional

**Step 8: Commit**

```bash
git add src/features/fleet/vehicles src/lib/api/vehicles.ts
git commit -m "refactor(fleet): migrate vehicles feature to domain architecture

- Move API client to features/fleet/vehicles/api.ts
- Create vehicle types
- Create React Query hooks for vehicle operations
- Add barrel export
- Add backward compatibility re-export"
```

---

### Task 2.3: Migrate Loads Feature

**Files:**
- Move: `src/lib/api/loads.ts` → `src/features/fleet/loads/api.ts`
- Move: `src/lib/types/load.ts` → `src/features/fleet/loads/types.ts`
- Create: `src/features/fleet/loads/hooks/use-loads.ts`
- Create: `src/features/fleet/loads/index.ts`

**Step 1: Move loads API client**

```bash
mv src/lib/api/loads.ts src/features/fleet/loads/api.ts
```

**Step 2: Update import in api.ts**

Modify: `src/features/fleet/loads/api.ts`

```typescript
import { apiClient } from '@/shared/lib/api';

export const loadsApi = {
  list: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get('/loads', { params });
    return response.data;
  },
  getById: async (loadId: string) => {
    const response = await apiClient.get(`/loads/${loadId}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await apiClient.post('/loads', data);
    return response.data;
  },
  update: async (loadId: string, data: any) => {
    const response = await apiClient.put(`/loads/${loadId}`, data);
    return response.data;
  },
  delete: async (loadId: string) => {
    const response = await apiClient.delete(`/loads/${loadId}`);
    return response.data;
  },
};
```

**Step 3: Move load types**

```bash
mv src/lib/types/load.ts src/features/fleet/loads/types.ts
```

**Step 4: Create useLoads hook**

Create: `src/features/fleet/loads/hooks/use-loads.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loadsApi } from '../api';
import type { Load, CreateLoadRequest, UpdateLoadRequest } from '../types';

const QUERY_KEY = ['fleet', 'loads'];

export function useLoads(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...QUERY_KEY, params],
    queryFn: () => loadsApi.list(params),
  });
}

export function useLoad(loadId: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, loadId],
    queryFn: () => loadsApi.getById(loadId),
    enabled: !!loadId,
  });
}

export function useCreateLoad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLoadRequest) => loadsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateLoad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ loadId, data }: { loadId: string; data: UpdateLoadRequest }) =>
      loadsApi.update(loadId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, variables.loadId] });
    },
  });
}

export function useDeleteLoad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (loadId: string) => loadsApi.delete(loadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
```

**Step 5: Create barrel export**

Create: `src/features/fleet/loads/index.ts`

```typescript
// Hooks
export {
  useLoads,
  useLoad,
  useCreateLoad,
  useUpdateLoad,
  useDeleteLoad,
} from './hooks/use-loads';

// API
export { loadsApi } from './api';

// Types
export type {
  Load,
  LoadStop,
  CreateLoadRequest,
  UpdateLoadRequest,
} from './types';
```

**Step 6: Create compatibility re-exports**

Create: `src/lib/api/loads.ts` (temporary)

```typescript
export * from '@/features/fleet/loads';
```

Create: `src/lib/types/load.ts` (temporary)

```typescript
export * from '@/features/fleet/loads';
```

**Step 7: Test app**

Run: `npm run dev`

Expected: Load-related features work correctly

**Step 8: Commit**

```bash
git add src/features/fleet/loads src/lib/api/loads.ts src/lib/types/load.ts
git commit -m "refactor(fleet): migrate loads feature to domain architecture

- Move API client and types to features/fleet/loads
- Create React Query hooks for load operations
- Add barrel export
- Add backward compatibility re-exports"
```

---

### Task 2.4: Create Fleet Domain Aggregate

**Files:**
- Create: `src/features/fleet/index.ts`

**Step 1: Create fleet barrel export**

Create: `src/features/fleet/index.ts`

```typescript
// Drivers
export * from './drivers';

// Vehicles
export * from './vehicles';

// Loads
export * from './loads';
```

**Step 2: Test imports from aggregate**

Create a test file to verify exports work:

```typescript
// Verify this works:
import {
  useDrivers,
  useVehicles,
  useLoads,
  driversApi,
  vehiclesApi,
  loadsApi,
  type Driver,
  type Vehicle,
  type Load,
} from '@/features/fleet';
```

**Step 3: Commit**

```bash
git add src/features/fleet/index.ts
git commit -m "feat(fleet): create fleet domain aggregate export"
```

---

## Phase 3: Routing Domain

### Task 3.1: Migrate Route Planning Feature

**Files:**
- Move: `src/components/route-planner/*` → `src/features/routing/route-planning/components/`
- Move: `src/lib/api/routePlanning.ts` → `src/features/routing/route-planning/api.ts`
- Move: `src/lib/types/routePlan.ts` → `src/features/routing/route-planning/types.ts`
- Move: `src/stores/routePlanStore.ts` → `src/features/routing/route-planning/store.ts`
- Create: `src/features/routing/route-planning/hooks/use-route-planning.ts`
- Create: `src/features/routing/route-planning/index.ts`

**Step 1: Move route planner components**

```bash
# Move all route-planner components
mv src/components/route-planner/* src/features/routing/route-planning/components/
```

**Step 2: Move API client**

```bash
mv src/lib/api/routePlanning.ts src/features/routing/route-planning/api.ts
```

**Step 3: Update imports in api.ts**

Modify: `src/features/routing/route-planning/api.ts`

```typescript
import { apiClient } from '@/shared/lib/api';

export const routePlanningApi = {
  planRoute: async (request: any) => {
    const response = await apiClient.post('/route-planning/plan', request);
    return response.data;
  },
  getRoutePlan: async (planId: string) => {
    const response = await apiClient.get(`/route-planning/${planId}`);
    return response.data;
  },
  updateRoute: async (planId: string, triggers: any) => {
    const response = await apiClient.post(`/route-planning/${planId}/update`, triggers);
    return response.data;
  },
};
```

**Step 4: Move types**

```bash
mv src/lib/types/routePlan.ts src/features/routing/route-planning/types.ts
```

**Step 5: Move store**

```bash
mv src/stores/routePlanStore.ts src/features/routing/route-planning/store.ts
```

**Step 6: Update store imports**

Modify: `src/features/routing/route-planning/store.ts`

```typescript
import { create } from 'zustand';
import type { RoutePlan } from './types';
// ... rest of store implementation
```

**Step 7: Create React Query hooks**

Create: `src/features/routing/route-planning/hooks/use-route-planning.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { routePlanningApi } from '../api';
import type { RoutePlanRequest, RoutePlan } from '../types';

const QUERY_KEY = ['routing', 'route-planning'];

export function useRoutePlan(planId: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, planId],
    queryFn: () => routePlanningApi.getRoutePlan(planId),
    enabled: !!planId,
  });
}

export function usePlanRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RoutePlanRequest) => routePlanningApi.planRoute(request),
    onSuccess: (data) => {
      queryClient.setQueryData([...QUERY_KEY, data.planId], data);
    },
  });
}

export function useUpdateRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, triggers }: { planId: string; triggers: any }) =>
      routePlanningApi.updateRoute(planId, triggers),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, variables.planId] });
    },
  });
}
```

**Step 8: Update component imports**

Update all component files in `src/features/routing/route-planning/components/` to use relative imports:

```typescript
// Update imports in each component
import { useRoutePlanStore } from '../store';
import { usePlanRoute, useRoutePlan } from '../hooks/use-route-planning';
import type { RoutePlan, RouteSegment } from '../types';
```

**Step 9: Create barrel export**

Create: `src/features/routing/route-planning/index.ts`

```typescript
// Components
export { default as RoutePlanningCockpit } from './components/core/RoutePlanningCockpit';
export { default as RouteHeader } from './components/core/RouteHeader';
export { default as FullyExpandedRouteTimeline } from './components/route/FullyExpandedRouteTimeline';
export { default as DriverSelector } from './components/shared/DriverSelector';
export { default as VehicleSelector } from './components/shared/VehicleSelector';
export { default as LoadSelector } from './components/shared/LoadSelector';
export { default as ComplianceStatus } from './components/shared/ComplianceStatus';
export { default as CostsTab } from './components/costs/CostsTab';
export { default as OverviewTab } from './components/overview/OverviewTab';
// ... export other components

// Hooks
export {
  useRoutePlan,
  usePlanRoute,
  useUpdateRoute,
} from './hooks/use-route-planning';

// Store
export { useRoutePlanStore } from './store';

// API
export { routePlanningApi } from './api';

// Types
export type {
  RoutePlan,
  RouteSegment,
  RoutePlanRequest,
  // ... other types
} from './types';
```

**Step 10: Create compatibility re-exports**

Create: `src/components/route-planner/index.ts` (temporary)

```typescript
export * from '@/features/routing/route-planning';
```

Create: `src/lib/api/routePlanning.ts` (temporary)

```typescript
export * from '@/features/routing/route-planning';
```

Create: `src/lib/types/routePlan.ts` (temporary)

```typescript
export * from '@/features/routing/route-planning';
```

Create: `src/stores/routePlanStore.ts` (temporary)

```typescript
export * from '@/features/routing/route-planning';
```

**Step 11: Test app**

Run: `npm run dev`

Navigate to route planning pages and test functionality.

Expected: Route planning features work correctly

**Step 12: Commit**

```bash
git add src/features/routing/route-planning src/components/route-planner src/lib/api/routePlanning.ts src/lib/types/routePlan.ts src/stores/routePlanStore.ts
git commit -m "refactor(routing): migrate route-planning feature to domain architecture

- Move all route planner components to features/routing/route-planning
- Move API client, types, and store
- Create React Query hooks
- Update all internal imports
- Add barrel export
- Add backward compatibility re-exports"
```

---

### Task 3.2: Migrate Optimization Feature

**Files:**
- Move: `src/lib/api/optimization.ts` → `src/features/routing/optimization/api.ts`
- Create: `src/features/routing/optimization/types.ts`
- Create: `src/features/routing/optimization/hooks/use-optimization.ts`
- Create: `src/features/routing/optimization/index.ts`

**Step 1: Move optimization API client**

```bash
mv src/lib/api/optimization.ts src/features/routing/optimization/api.ts
```

**Step 2: Update imports in api.ts**

Modify: `src/features/routing/optimization/api.ts`

```typescript
import { apiClient } from '@/shared/lib/api';

export const optimizationApi = {
  recommend: async (request: any) => {
    const response = await apiClient.post('/optimization/recommend', request);
    return response.data;
  },
};
```

**Step 3: Create types**

Create: `src/features/routing/optimization/types.ts`

```typescript
export interface OptimizationRequest {
  driverId: string;
  currentLocation: {
    lat: number;
    lng: number;
  };
  hoursRemaining: number;
  hoursNeeded: number;
  nextStop: {
    lat: number;
    lng: number;
    dockDuration: number;
  };
}

export interface OptimizationRecommendation {
  restType: 'FULL_REST' | 'PARTIAL_REST' | 'NO_REST';
  restDuration: number;
  reasoning: string;
  compliance: {
    isCompliant: boolean;
    violations: string[];
  };
}
```

**Step 4: Create hooks**

Create: `src/features/routing/optimization/hooks/use-optimization.ts`

```typescript
import { useMutation } from '@tanstack/react-query';
import { optimizationApi } from '../api';
import type { OptimizationRequest, OptimizationRecommendation } from '../types';

export function useOptimizationRecommendation() {
  return useMutation({
    mutationFn: (request: OptimizationRequest) => optimizationApi.recommend(request),
  });
}
```

**Step 5: Create barrel export**

Create: `src/features/routing/optimization/index.ts`

```typescript
// Hooks
export { useOptimizationRecommendation } from './hooks/use-optimization';

// API
export { optimizationApi } from './api';

// Types
export type {
  OptimizationRequest,
  OptimizationRecommendation,
} from './types';
```

**Step 6: Create compatibility re-export**

Create: `src/lib/api/optimization.ts` (temporary)

```typescript
export * from '@/features/routing/optimization';
```

**Step 7: Commit**

```bash
git add src/features/routing/optimization src/lib/api/optimization.ts
git commit -m "refactor(routing): migrate optimization feature to domain architecture"
```

---

### Task 3.3: Migrate HOS Compliance Feature

**Files:**
- Create: `src/features/routing/hos-compliance/api.ts`
- Create: `src/features/routing/hos-compliance/types.ts`
- Create: `src/features/routing/hos-compliance/hooks/use-hos-compliance.ts`
- Create: `src/features/routing/hos-compliance/index.ts`

**Step 1: Create HOS compliance API client**

Create: `src/features/routing/hos-compliance/api.ts`

```typescript
import { apiClient } from '@/shared/lib/api';

export const hosComplianceApi = {
  check: async (request: any) => {
    const response = await apiClient.post('/hos-rules/check', request);
    return response.data;
  },
  validate: async (driverId: string, route: any) => {
    const response = await apiClient.post(`/hos-rules/validate/${driverId}`, { route });
    return response.data;
  },
};
```

**Step 2: Create types**

Create: `src/features/routing/hos-compliance/types.ts`

```typescript
export interface HOSCheckRequest {
  driverId: string;
  currentDutyStatus: 'ON_DUTY' | 'OFF_DUTY' | 'DRIVING' | 'SLEEPER';
  hoursWorked: number;
  lastBreakDuration: number;
}

export interface HOSCheckResponse {
  isCompliant: boolean;
  violations: string[];
  recommendations: string[];
  hoursRemaining: {
    driving: number;
    onDuty: number;
  };
}
```

**Step 3: Create hooks**

Create: `src/features/routing/hos-compliance/hooks/use-hos-compliance.ts`

```typescript
import { useMutation } from '@tanstack/react-query';
import { hosComplianceApi } from '../api';
import type { HOSCheckRequest, HOSCheckResponse } from '../types';

export function useHOSCheck() {
  return useMutation({
    mutationFn: (request: HOSCheckRequest) => hosComplianceApi.check(request),
  });
}

export function useHOSValidation() {
  return useMutation({
    mutationFn: ({ driverId, route }: { driverId: string; route: any }) =>
      hosComplianceApi.validate(driverId, route),
  });
}
```

**Step 4: Create barrel export**

Create: `src/features/routing/hos-compliance/index.ts`

```typescript
// Hooks
export { useHOSCheck, useHOSValidation } from './hooks/use-hos-compliance';

// API
export { hosComplianceApi } from './api';

// Types
export type {
  HOSCheckRequest,
  HOSCheckResponse,
} from './types';
```

**Step 5: Commit**

```bash
git add src/features/routing/hos-compliance
git commit -m "feat(routing): create hos-compliance feature module"
```

---

### Task 3.4: Create Routing Domain Aggregate

**Files:**
- Create: `src/features/routing/index.ts`

**Step 1: Create routing barrel export**

Create: `src/features/routing/index.ts`

```typescript
// Route Planning
export * from './route-planning';

// Optimization
export * from './optimization';

// HOS Compliance
export * from './hos-compliance';
```

**Step 2: Commit**

```bash
git add src/features/routing/index.ts
git commit -m "feat(routing): create routing domain aggregate export"
```

---

## Phase 4: Operations Domain

### Task 4.1: Migrate Alerts Feature

**Files:**
- Move: `src/lib/api/alerts.ts` → `src/features/operations/alerts/api.ts`
- Create: `src/features/operations/alerts/types.ts`
- Create: `src/features/operations/alerts/hooks/use-alerts.ts`
- Create: `src/features/operations/alerts/index.ts`

**Step 1: Move alerts API**

```bash
mv src/lib/api/alerts.ts src/features/operations/alerts/api.ts
```

**Step 2: Update imports**

Modify: `src/features/operations/alerts/api.ts`

```typescript
import { apiClient } from '@/shared/lib/api';

export const alertsApi = {
  list: async (params?: { status?: string; type?: string }) => {
    const response = await apiClient.get('/alerts', { params });
    return response.data;
  },
  getById: async (alertId: string) => {
    const response = await apiClient.get(`/alerts/${alertId}`);
    return response.data;
  },
  acknowledge: async (alertId: string) => {
    const response = await apiClient.post(`/alerts/${alertId}/acknowledge`);
    return response.data;
  },
  resolve: async (alertId: string) => {
    const response = await apiClient.post(`/alerts/${alertId}/resolve`);
    return response.data;
  },
};
```

**Step 3: Create types**

Create: `src/features/operations/alerts/types.ts`

```typescript
export type AlertType =
  | 'HOS_VIOLATION'
  | 'DELAY'
  | 'ROUTE_DEVIATION'
  | 'FUEL_LOW'
  | 'DRIVER_NOT_MOVING';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface Alert {
  id: string;
  alertId: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  driverId?: string;
  routePlanId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}
```

**Step 4: Create hooks**

Create: `src/features/operations/alerts/hooks/use-alerts.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '../api';
import type { Alert } from '../types';

const QUERY_KEY = ['operations', 'alerts'];

export function useAlerts(params?: { status?: string; type?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEY, params],
    queryFn: () => alertsApi.list(params),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useAlert(alertId: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, alertId],
    queryFn: () => alertsApi.getById(alertId),
    enabled: !!alertId,
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => alertsApi.acknowledge(alertId),
    onSuccess: (_, alertId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, alertId] });
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => alertsApi.resolve(alertId),
    onSuccess: (_, alertId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, alertId] });
    },
  });
}
```

**Step 5: Create barrel export**

Create: `src/features/operations/alerts/index.ts`

```typescript
// Hooks
export {
  useAlerts,
  useAlert,
  useAcknowledgeAlert,
  useResolveAlert,
} from './hooks/use-alerts';

// API
export { alertsApi } from './api';

// Types
export type {
  Alert,
  AlertType,
  AlertSeverity,
  AlertStatus,
} from './types';
```

**Step 6: Create compatibility re-export**

Create: `src/lib/api/alerts.ts` (temporary)

```typescript
export * from '@/features/operations/alerts';
```

**Step 7: Commit**

```bash
git add src/features/operations/alerts src/lib/api/alerts.ts
git commit -m "refactor(operations): migrate alerts feature to domain architecture"
```

---

### Task 4.2: Create Operations Domain Aggregate

**Files:**
- Create: `src/features/operations/index.ts`

**Step 1: Create operations barrel export**

Create: `src/features/operations/index.ts`

```typescript
// Alerts
export * from './alerts';

// Monitoring (placeholder for future)
// export * from './monitoring';
```

**Step 2: Commit**

```bash
git add src/features/operations/index.ts
git commit -m "feat(operations): create operations domain aggregate export"
```

---

## Phase 5: Platform Domain

### Task 5.1: Migrate Auth Feature

**Files:**
- Move: `src/components/auth/*` → `src/features/platform/auth/components/`
- Move: `src/lib/api/auth.ts` → `src/features/platform/auth/api.ts`
- Move: `src/stores/auth-store.ts` → `src/features/platform/auth/store.ts`
- Move: `src/hooks/use-auth.ts` → `src/features/platform/auth/hooks/use-auth.ts`
- Create: `src/features/platform/auth/types.ts`
- Create: `src/features/platform/auth/index.ts`

**Step 1: Move auth components**

```bash
mv src/components/auth/registration-form.tsx src/features/platform/auth/components/
mv src/components/auth/accept-invitation-form.tsx src/features/platform/auth/components/
mv src/components/auth/login-form.tsx src/features/platform/auth/components/
mv src/components/auth/LoginScreen.tsx src/features/platform/auth/components/
```

**Step 2: Move API client**

```bash
mv src/lib/api/auth.ts src/features/platform/auth/api.ts
```

**Step 3: Update imports in api.ts**

Modify: `src/features/platform/auth/api.ts`

```typescript
import { apiClient } from '@/shared/lib/api';
// ... rest of implementation
```

**Step 4: Move auth store**

```bash
mv src/stores/auth-store.ts src/features/platform/auth/store.ts
```

**Step 5: Move auth hook**

```bash
mv src/hooks/use-auth.ts src/features/platform/auth/hooks/use-auth.ts
```

**Step 6: Create auth types**

Create: `src/features/platform/auth/types.ts`

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'DISPATCHER' | 'DRIVER' | 'SUPER_ADMIN';
  tenantId: string;
  tenantName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  companyName: string;
}
```

**Step 7: Update component imports**

Update all auth component files to use relative imports:

```typescript
import { useAuth } from '../hooks/use-auth';
import { authApi } from '../api';
import type { LoginRequest, User } from '../types';
```

**Step 8: Create barrel export**

Create: `src/features/platform/auth/index.ts`

```typescript
// Components
export { default as LoginForm } from './components/login-form';
export { default as RegistrationForm } from './components/registration-form';
export { default as AcceptInvitationForm } from './components/accept-invitation-form';
export { default as LoginScreen } from './components/LoginScreen';

// Hooks
export { useAuth } from './hooks/use-auth';

// Store
export { useAuthStore } from './store';

// API
export { authApi } from './api';

// Types
export type {
  User,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
} from './types';
```

**Step 9: Create compatibility re-exports**

Create: `src/components/auth/index.ts` (temporary)

```typescript
export * from '@/features/platform/auth';
```

Create: `src/lib/api/auth.ts` (temporary)

```typescript
export * from '@/features/platform/auth';
```

Create: `src/stores/auth-store.ts` (temporary)

```typescript
export * from '@/features/platform/auth';
```

Create: `src/hooks/use-auth.ts` (temporary)

```typescript
export * from '@/features/platform/auth';
```

**Step 10: Test app**

Run: `npm run dev`

Test login, registration, and authentication flows.

**Step 11: Commit**

```bash
git add src/features/platform/auth src/components/auth src/lib/api/auth.ts src/stores/auth-store.ts src/hooks/use-auth.ts
git commit -m "refactor(platform): migrate auth feature to domain architecture

- Move auth components, API, store, and hooks
- Create auth types
- Update all internal imports
- Add barrel export
- Add backward compatibility re-exports"
```

---

### Task 5.2: Migrate Users Feature

**Files:**
- Move: `src/components/users/*` → `src/features/platform/users/components/`
- Create: `src/features/platform/users/api.ts`
- Create: `src/features/platform/users/types.ts`
- Create: `src/features/platform/users/hooks/use-users.ts`
- Create: `src/features/platform/users/index.ts`

**Step 1: Move user components**

```bash
mv src/components/users/invite-user-dialog.tsx src/features/platform/users/components/
mv src/components/users/user-list.tsx src/features/platform/users/components/
```

**Step 2: Create users API**

Create: `src/features/platform/users/api.ts`

```typescript
import { apiClient } from '@/shared/lib/api';

export const usersApi = {
  list: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get('/users', { params });
    return response.data;
  },
  getById: async (userId: string) => {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  },
  invite: async (email: string, role: string) => {
    const response = await apiClient.post('/invitations', { email, role });
    return response.data;
  },
  update: async (userId: string, data: any) => {
    const response = await apiClient.put(`/users/${userId}`, data);
    return response.data;
  },
  delete: async (userId: string) => {
    const response = await apiClient.delete(`/users/${userId}`);
    return response.data;
  },
};
```

**Step 3: Create types**

Create: `src/features/platform/users/types.ts`

```typescript
export type UserRole = 'ADMIN' | 'DISPATCHER' | 'DRIVER' | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InviteUserRequest {
  email: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
}
```

**Step 4: Create hooks**

Create: `src/features/platform/users/hooks/use-users.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api';
import type { User, InviteUserRequest, UpdateUserRequest } from '../types';

const QUERY_KEY = ['platform', 'users'];

export function useUsers(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...QUERY_KEY, params],
    queryFn: () => usersApi.list(params),
  });
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, userId],
    queryFn: () => usersApi.getById(userId),
    enabled: !!userId,
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, role }: InviteUserRequest) => usersApi.invite(email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateUserRequest }) =>
      usersApi.update(userId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, variables.userId] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => usersApi.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
```

**Step 5: Update component imports**

Update components to use relative imports:

```typescript
import { useUsers, useInviteUser } from '../hooks/use-users';
import type { User } from '../types';
```

**Step 6: Create barrel export**

Create: `src/features/platform/users/index.ts`

```typescript
// Components
export { default as UserList } from './components/user-list';
export { default as InviteUserDialog } from './components/invite-user-dialog';

// Hooks
export {
  useUsers,
  useUser,
  useInviteUser,
  useUpdateUser,
  useDeleteUser,
} from './hooks/use-users';

// API
export { usersApi } from './api';

// Types
export type {
  User,
  UserRole,
  InviteUserRequest,
  UpdateUserRequest,
} from './types';
```

**Step 7: Create compatibility re-export**

Create: `src/components/users/index.ts` (temporary)

```typescript
export * from '@/features/platform/users';
```

**Step 8: Commit**

```bash
git add src/features/platform/users src/components/users
git commit -m "refactor(platform): migrate users feature to domain architecture"
```

---

### Task 5.3: Migrate Preferences Feature

**Files:**
- Move: `src/lib/api/preferences.ts` → `src/features/platform/preferences/api.ts`
- Move: `src/lib/types/preferences.ts` → `src/features/platform/preferences/types.ts`
- Move: `src/stores/preferencesStore.ts` → `src/features/platform/preferences/store.ts`
- Create: `src/features/platform/preferences/hooks/use-preferences.ts`
- Create: `src/features/platform/preferences/index.ts`

**Step 1: Move files**

```bash
mv src/lib/api/preferences.ts src/features/platform/preferences/api.ts
mv src/lib/types/preferences.ts src/features/platform/preferences/types.ts
mv src/stores/preferencesStore.ts src/features/platform/preferences/store.ts
```

**Step 2: Update imports**

Modify: `src/features/platform/preferences/api.ts`

```typescript
import { apiClient } from '@/shared/lib/api';
// ... rest
```

**Step 3: Create hooks**

Create: `src/features/platform/preferences/hooks/use-preferences.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { preferencesApi } from '../api';
import type { UserPreferences } from '../types';

const QUERY_KEY = ['platform', 'preferences'];

export function usePreferences() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => preferencesApi.get(),
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<UserPreferences>) => preferencesApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
```

**Step 4: Create barrel export**

Create: `src/features/platform/preferences/index.ts`

```typescript
// Hooks
export { usePreferences, useUpdatePreferences } from './hooks/use-preferences';

// Store
export { usePreferencesStore } from './store';

// API
export { preferencesApi } from './api';

// Types
export type { UserPreferences } from './types';
```

**Step 5: Create compatibility re-exports**

```bash
# Create temporary re-exports
echo "export * from '@/features/platform/preferences';" > src/lib/api/preferences.ts
echo "export * from '@/features/platform/preferences';" > src/lib/types/preferences.ts
echo "export * from '@/features/platform/preferences';" > src/stores/preferencesStore.ts
```

**Step 6: Commit**

```bash
git add src/features/platform/preferences src/lib/api/preferences.ts src/lib/types/preferences.ts src/stores/preferencesStore.ts
git commit -m "refactor(platform): migrate preferences feature to domain architecture"
```

---

### Task 5.4: Migrate Feature Flags

**Files:**
- Move: `src/lib/api/featureFlags.ts` → `src/features/platform/feature-flags/api.ts`
- Move: `src/stores/featureFlagsStore.ts` → `src/features/platform/feature-flags/store.ts`
- Move: `src/components/feature-flags/*` → `src/features/platform/feature-flags/components/`
- Create: `src/features/platform/feature-flags/types.ts`
- Create: `src/features/platform/feature-flags/hooks/use-feature-flags.ts`
- Create: `src/features/platform/feature-flags/index.ts`

**Step 1: Move files**

```bash
mv src/lib/api/featureFlags.ts src/features/platform/feature-flags/api.ts
mv src/stores/featureFlagsStore.ts src/features/platform/feature-flags/store.ts
mv src/components/feature-flags/* src/features/platform/feature-flags/components/ 2>/dev/null || true
```

**Step 2: Update imports in api.ts**

Modify: `src/features/platform/feature-flags/api.ts`

```typescript
import { apiClient } from '@/shared/lib/api';
// ... rest
```

**Step 3: Create types**

Create: `src/features/platform/feature-flags/types.ts`

```typescript
export interface FeatureFlag {
  id: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateFeatureFlagRequest {
  isEnabled: boolean;
}
```

**Step 4: Create hooks**

Create: `src/features/platform/feature-flags/hooks/use-feature-flags.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { featureFlagsApi } from '../api';
import type { FeatureFlag } from '../types';

const QUERY_KEY = ['platform', 'feature-flags'];

export function useFeatureFlags() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => featureFlagsApi.list(),
  });
}

export function useFeatureFlag(flagName: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, flagName],
    queryFn: () => featureFlagsApi.get(flagName),
    enabled: !!flagName,
  });
}

export function useUpdateFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ flagId, isEnabled }: { flagId: string; isEnabled: boolean }) =>
      featureFlagsApi.update(flagId, { isEnabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
```

**Step 5: Create barrel export**

Create: `src/features/platform/feature-flags/index.ts`

```typescript
// Hooks
export {
  useFeatureFlags,
  useFeatureFlag,
  useUpdateFeatureFlag,
} from './hooks/use-feature-flags';

// Store
export { useFeatureFlagsStore } from './store';

// API
export { featureFlagsApi } from './api';

// Types
export type { FeatureFlag, UpdateFeatureFlagRequest } from './types';
```

**Step 6: Create compatibility re-exports**

```bash
echo "export * from '@/features/platform/feature-flags';" > src/lib/api/featureFlags.ts
echo "export * from '@/features/platform/feature-flags';" > src/stores/featureFlagsStore.ts
```

**Step 7: Commit**

```bash
git add src/features/platform/feature-flags src/lib/api/featureFlags.ts src/stores/featureFlagsStore.ts
git commit -m "refactor(platform): migrate feature-flags to domain architecture"
```

---

### Task 5.5: Migrate Onboarding Feature

**Files:**
- Move: `src/lib/api/onboarding.ts` → `src/features/platform/onboarding/api.ts`
- Move: `src/stores/onboardingStore.ts` → `src/features/platform/onboarding/store.ts`
- Move: `src/components/onboarding/*` → `src/features/platform/onboarding/components/`
- Create: `src/features/platform/onboarding/types.ts`
- Create: `src/features/platform/onboarding/hooks/use-onboarding.ts`
- Create: `src/features/platform/onboarding/index.ts`

**Step 1: Move files**

```bash
mv src/lib/api/onboarding.ts src/features/platform/onboarding/api.ts
mv src/stores/onboardingStore.ts src/features/platform/onboarding/store.ts
mv src/components/onboarding/* src/features/platform/onboarding/components/ 2>/dev/null || true
```

**Step 2: Update imports**

```typescript
// Update api.ts
import { apiClient } from '@/shared/lib/api';
```

**Step 3: Create types**

Create: `src/features/platform/onboarding/types.ts`

```typescript
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
}

export interface OnboardingProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
}
```

**Step 4: Create hooks**

Create: `src/features/platform/onboarding/hooks/use-onboarding.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { onboardingApi } from '../api';

const QUERY_KEY = ['platform', 'onboarding'];

export function useOnboardingProgress() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => onboardingApi.getProgress(),
  });
}

export function useCompleteOnboardingStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stepId: string) => onboardingApi.completeStep(stepId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
```

**Step 5: Create barrel export**

Create: `src/features/platform/onboarding/index.ts`

```typescript
// Hooks
export {
  useOnboardingProgress,
  useCompleteOnboardingStep,
} from './hooks/use-onboarding';

// Store
export { useOnboardingStore } from './store';

// API
export { onboardingApi } from './api';

// Types
export type { OnboardingStep, OnboardingProgress } from './types';
```

**Step 6: Create compatibility re-exports**

```bash
echo "export * from '@/features/platform/onboarding';" > src/lib/api/onboarding.ts
echo "export * from '@/features/platform/onboarding';" > src/stores/onboardingStore.ts
```

**Step 7: Commit**

```bash
git add src/features/platform/onboarding src/lib/api/onboarding.ts src/stores/onboardingStore.ts
git commit -m "refactor(platform): migrate onboarding feature to domain architecture"
```

---

### Task 5.6: Create Platform Domain Aggregate

**Files:**
- Create: `src/features/platform/index.ts`

**Step 1: Create platform barrel export**

Create: `src/features/platform/index.ts`

```typescript
// Auth
export * from './auth';

// Users
export * from './users';

// Preferences
export * from './preferences';

// Feature Flags
export * from './feature-flags';

// Onboarding
export * from './onboarding';
```

**Step 2: Commit**

```bash
git add src/features/platform/index.ts
git commit -m "feat(platform): create platform domain aggregate export"
```

---

## Phase 6: Shared Components

### Task 6.1: Move UI Components to Shared

**Files:**
- Move: `src/components/ui/*` → `src/shared/components/ui/`

**Step 1: Move UI components**

```bash
mv src/components/ui src/shared/components/
```

**Step 2: Create barrel export**

Create: `src/shared/components/ui/index.ts`

```typescript
// Export all UI components
export * from './button';
export * from './card';
export * from './input';
export * from './label';
export * from './dialog';
export * from './dropdown-menu';
export * from './select';
export * from './tabs';
export * from './table';
export * from './badge';
export * from './alert';
export * from './toast';
export * from './toaster';
export * from './tooltip';
export * from './popover';
export * from './separator';
export * from './switch';
export * from './textarea';
export * from './skeleton';
export * from './progress';
export * from './scroll-area';
export * from './sheet';
export * from './avatar';
export * from './command';
export * from './accordion';
export * from './collapsible';
export * from './alert-dialog';
```

**Step 3: Create compatibility re-export**

Create: `src/components/ui/index.ts` (temporary)

```typescript
export * from '@/shared/components/ui';
```

**Step 4: Update path alias references**

All imports like `@/components/ui/button` should still work because of the re-export.

**Step 5: Commit**

```bash
git add src/shared/components/ui src/components/ui
git commit -m "refactor(shared): move UI components to shared/components/ui

- Move all Shadcn UI components to shared
- Add barrel export for clean imports
- Add backward compatibility re-export"
```

---

### Task 6.2: Move Layout Components to Shared

**Files:**
- Move: `src/components/layout/*` → `src/shared/components/layout/`

**Step 1: Move layout components**

```bash
mv src/components/layout src/shared/components/
```

**Step 2: Create barrel export**

Create: `src/shared/components/layout/index.ts`

```typescript
// Export all layout components
export { default as Sidebar } from './Sidebar';
export { default as Header } from './Header';
export { default as AppShell } from './AppShell';
// ... export other layout components
```

**Step 3: Create compatibility re-export**

Create: `src/components/layout/index.ts` (temporary)

```typescript
export * from '@/shared/components/layout';
```

**Step 4: Commit**

```bash
git add src/shared/components/layout src/components/layout
git commit -m "refactor(shared): move layout components to shared"
```

---

### Task 6.3: Move Shared Utilities

**Files:**
- Move: `src/lib/utils/*` → `src/shared/lib/utils/`
- Move: `src/lib/utils.ts` → `src/shared/lib/utils/cn.ts`

**Step 1: Move utilities**

```bash
mkdir -p src/shared/lib/utils
mv src/lib/utils.ts src/shared/lib/utils/cn.ts
mv src/lib/utils/* src/shared/lib/utils/ 2>/dev/null || true
```

**Step 2: Create barrel export**

Create: `src/shared/lib/utils/index.ts`

```typescript
export * from './cn';
// Export other utilities
```

**Step 3: Create compatibility re-export**

Create: `src/lib/utils.ts` (temporary)

```typescript
export * from '@/shared/lib/utils';
```

**Step 4: Commit**

```bash
git add src/shared/lib/utils src/lib/utils.ts
git commit -m "refactor(shared): move utilities to shared/lib/utils"
```

---

### Task 6.4: Create Shared Module Aggregate

**Files:**
- Create: `src/shared/index.ts`

**Step 1: Create shared barrel export**

Create: `src/shared/index.ts`

```typescript
// Components
export * from './components/ui';
export * from './components/layout';

// Hooks
export * from './hooks';

// Lib
export * from './lib/api';
export * from './lib/utils';

// Types
export * from './types';
```

**Step 2: Commit**

```bash
git add src/shared/index.ts
git commit -m "feat(shared): create shared module aggregate export"
```

---

## Phase 7: Cleanup

### Task 7.1: Update Page Imports to Use New Structure

**Files:**
- Modify: All files in `src/app/**/*.tsx`

**Step 1: Create script to find old imports**

Create: `scripts/find-old-imports.sh`

```bash
#!/bin/bash

echo "Finding old import patterns..."

echo "\n=== Old component imports ==="
grep -r "from '@/components/" src/app --include="*.tsx" --include="*.ts" | grep -v "from '@/components/ui'" | grep -v node_modules

echo "\n=== Old lib/api imports ==="
grep -r "from '@/lib/api/" src/app --include="*.tsx" --include="*.ts" | grep -v node_modules

echo "\n=== Old stores imports ==="
grep -r "from '@/stores/" src/app --include="*.tsx" --include="*.ts" | grep -v node_modules

echo "\n=== Old lib/types imports ==="
grep -r "from '@/lib/types/" src/app --include="*.tsx" --include="*.ts" | grep -v node_modules
```

**Step 2: Make script executable and run**

```bash
chmod +x scripts/find-old-imports.sh
./scripts/find-old-imports.sh > old-imports.txt
```

**Step 3: Update imports manually or with sed**

Example for drivers page:

```typescript
// Before
import { DriverList } from '@/components/drivers/driver-list';
import { driversApi } from '@/lib/api/drivers';

// After
import { DriverList, driversApi, useDrivers } from '@/features/fleet/drivers';
```

**Step 4: Test each page after updating**

Run: `npm run dev`

Navigate through all pages and verify functionality.

**Step 5: Commit in small batches**

```bash
# Update dispatcher pages
git add src/app/dispatcher
git commit -m "refactor: update dispatcher pages to use new feature imports"

# Update driver pages
git add src/app/driver
git commit -m "refactor: update driver pages to use new feature imports"

# Continue for each section...
```

---

### Task 7.2: Remove Temporary Compatibility Re-exports

**Files:**
- Delete: All temporary re-export files in `src/components/`, `src/lib/api/`, `src/lib/types/`, `src/stores/`

**Step 1: Verify all pages use new imports**

Run: `npm run type-check`

Expected: No TypeScript errors

**Step 2: Remove compatibility files**

```bash
# Remove component re-exports
rm -f src/components/drivers/driver-list.tsx
rm -f src/components/drivers/driver-activation-dialog.tsx
rm -f src/components/auth/*.tsx
rm -f src/components/users/*.tsx

# Remove API re-exports
rm -f src/lib/api/drivers.ts
rm -f src/lib/api/vehicles.ts
rm -f src/lib/api/loads.ts
rm -f src/lib/api/auth.ts
rm -f src/lib/api/alerts.ts
rm -f src/lib/api/preferences.ts
rm -f src/lib/api/featureFlags.ts
rm -f src/lib/api/onboarding.ts
rm -f src/lib/api/optimization.ts
rm -f src/lib/api/routePlanning.ts

# Remove type re-exports
rm -f src/lib/types/driver.ts
rm -f src/lib/types/load.ts
rm -f src/lib/types/preferences.ts
rm -f src/lib/types/routePlan.ts

# Remove store re-exports
rm -f src/stores/auth-store.ts
rm -f src/stores/preferencesStore.ts
rm -f src/stores/featureFlagsStore.ts
rm -f src/stores/onboardingStore.ts
rm -f src/stores/routePlanStore.ts

# Remove hook re-exports
rm -f src/hooks/use-auth.ts
```

**Step 3: Remove empty directories**

```bash
# Check if directories are empty and remove
rmdir src/components/drivers 2>/dev/null || true
rmdir src/components/auth 2>/dev/null || true
rmdir src/components/users 2>/dev/null || true
rmdir src/components/feature-flags 2>/dev/null || true
rmdir src/components/onboarding 2>/dev/null || true
rmdir src/components/route-planner 2>/dev/null || true
```

**Step 4: Verify app still works**

Run: `npm run dev`

Test all major features.

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove temporary compatibility re-exports

- Remove all temporary re-export files
- Remove empty directories
- Clean up old structure"
```

---

### Task 7.3: Update Documentation

**Files:**
- Modify: `apps/web/README.md`
- Create: `apps/web/ARCHITECTURE.md`

**Step 1: Update README.md**

Modify: `apps/web/README.md`

Update the "Project Structure" section:

```markdown
### Project Structure

\`\`\`
src/
├── app/                           # Next.js pages (route-based)
│   ├── dispatcher/               # Dispatcher role pages
│   ├── driver/                   # Driver role pages
│   ├── admin/                    # Admin pages
│   └── settings/                 # Settings pages
│
├── features/                      # Domain-aligned feature modules
│   ├── fleet/                    # Fleet management domain
│   │   ├── drivers/             # Driver management
│   │   ├── vehicles/            # Vehicle management
│   │   └── loads/               # Load management
│   ├── routing/                  # Routing domain
│   │   ├── route-planning/      # Route planning engine
│   │   ├── optimization/        # REST optimization
│   │   └── hos-compliance/      # HOS rules
│   ├── operations/               # Operations domain
│   │   └── alerts/              # Alert system
│   └── platform/                 # Platform domain
│       ├── auth/                # Authentication
│       ├── users/               # User management
│       ├── preferences/         # User preferences
│       ├── feature-flags/       # Feature flags
│       └── onboarding/          # Onboarding
│
├── shared/                        # Shared across domains
│   ├── components/
│   │   ├── ui/                  # Shadcn UI components
│   │   └── layout/              # Layout components
│   ├── hooks/                   # Shared React hooks
│   └── lib/                     # Shared utilities
│
└── config/                       # App configuration
\`\`\`

### Domain Architecture

The frontend is organized into domain-aligned feature modules that mirror the backend domain structure:

- **Fleet Domain**: Driver, vehicle, and load management
- **Routing Domain**: Route planning, optimization, HOS compliance
- **Operations Domain**: Alerts and monitoring
- **Platform Domain**: Auth, users, preferences, feature flags

Each feature module contains:
- `components/` - React components
- `hooks/` - React Query hooks
- `api.ts` - API client functions
- `types.ts` - TypeScript types
- `store.ts` - Zustand store (if needed)
- `index.ts` - Barrel export (public API)

### Importing from Features

Use clean barrel exports:

\`\`\`typescript
// Import from fleet domain
import {
  DriverList,
  useDrivers,
  driversApi,
  type Driver
} from '@/features/fleet/drivers';

// Import from routing domain
import {
  RoutePlanningCockpit,
  usePlanRoute,
  routePlanningApi,
  type RoutePlan
} from '@/features/routing/route-planning';

// Import from shared UI
import { Button, Card, Input } from '@/shared/components/ui';
\`\`\`
```

**Step 2: Create ARCHITECTURE.md**

Create: `apps/web/ARCHITECTURE.md`

```markdown
# Frontend Architecture

## Overview

The SALLY frontend uses a domain-aligned feature architecture that mirrors the backend domain structure. This provides consistency across the full stack and makes it easy to understand domain boundaries.

## Architecture Pattern: Hybrid Domain + Route-Based

**Domain-Aligned Features** (`features/`)
- Business logic organized by domain (fleet, routing, operations, platform)
- Each feature is self-contained with components, hooks, API clients, and types
- Features expose clean public APIs via barrel exports

**Route-Based Pages** (`app/`)
- Next.js App Router pages organized by user role and route
- Pages compose features from multiple domains
- Stay flexible for cross-domain UI composition

**Shared Code** (`shared/`)
- UI components (Shadcn)
- Layout components
- Shared hooks and utilities
- Cross-domain types

## Domain Alignment with Backend

| Frontend Feature | Backend Domain |
|------------------|----------------|
| `features/fleet/drivers` | `domains/fleet/drivers` |
| `features/fleet/vehicles` | `domains/fleet/vehicles` |
| `features/fleet/loads` | `domains/fleet/loads` |
| `features/routing/route-planning` | `domains/routing/route-planning` |
| `features/routing/optimization` | `domains/routing/optimization` |
| `features/routing/hos-compliance` | `domains/routing/hos-compliance` |
| `features/operations/alerts` | `domains/operations/alerts` |
| `features/platform/auth` | `auth/` |
| `features/platform/users` | `domains/platform/users` |
| `features/platform/preferences` | `domains/platform/preferences` |

## Feature Module Structure

Each feature follows this standard structure:

\`\`\`
features/[domain]/[feature]/
├── components/          # React components
│   ├── FeatureList.tsx
│   └── FeatureDetail.tsx
├── hooks/              # React Query hooks
│   └── use-feature.ts
├── api.ts              # API client functions
├── types.ts            # TypeScript types
├── store.ts            # Zustand store (optional)
├── __tests__/          # Tests
└── index.ts            # Barrel export (public API)
\`\`\`

### Barrel Exports (index.ts)

Each feature exports a clean public API:

\`\`\`typescript
// features/fleet/drivers/index.ts
export { DriverList, DriverDetail } from './components';
export { useDrivers, useDriver, useCreateDriver } from './hooks/use-drivers';
export { driversApi } from './api';
export type { Driver, CreateDriverRequest } from './types';
\`\`\`

### React Query Hooks

Features use React Query for server state management:

\`\`\`typescript
// features/fleet/drivers/hooks/use-drivers.ts
export function useDrivers(params?: ListParams) {
  return useQuery({
    queryKey: ['fleet', 'drivers', params],
    queryFn: () => driversApi.list(params),
  });
}
\`\`\`

### API Clients

API clients are organized by feature:

\`\`\`typescript
// features/fleet/drivers/api.ts
import { apiClient } from '@/shared/lib/api';

export const driversApi = {
  list: async (params) => {
    const response = await apiClient.get('/drivers', { params });
    return response.data;
  },
  // ... other methods
};
\`\`\`

## Benefits

1. **Consistency**: Frontend domains mirror backend domains
2. **Scalability**: Clear ownership boundaries for team growth
3. **Maintainability**: Related code co-located
4. **Testability**: Features independently testable
5. **Discoverability**: Easy to find code by domain
6. **Flexibility**: Pages can compose multiple features

## Best Practices

### Import Patterns

✅ **Good: Import from feature barrel exports**

\`\`\`typescript
import { DriverList, useDrivers } from '@/features/fleet/drivers';
\`\`\`

❌ **Bad: Import from internal feature files**

\`\`\`typescript
import { DriverList } from '@/features/fleet/drivers/components/DriverList';
\`\`\`

### Cross-Domain Composition

Pages can freely compose features from multiple domains:

\`\`\`typescript
// app/dispatcher/create-plan/page.tsx
import { DriverSelector } from '@/features/fleet/drivers';
import { VehicleSelector } from '@/features/fleet/vehicles';
import { LoadSelector } from '@/features/fleet/loads';
import { RoutePlanningCockpit } from '@/features/routing/route-planning';

export default function CreatePlanPage() {
  return (
    <RoutePlanningCockpit>
      <DriverSelector />
      <VehicleSelector />
      <LoadSelector />
    </RoutePlanningCockpit>
  );
}
\`\`\`

### State Management

- **Server State**: React Query (in feature hooks)
- **Client State**: Zustand stores (co-located in features)
- **Form State**: React Hook Form
- **URL State**: Next.js routing

### Testing

Tests are co-located with features:

\`\`\`
features/fleet/drivers/
├── __tests__/
│   ├── components/
│   │   └── DriverList.test.tsx
│   ├── hooks/
│   │   └── use-drivers.test.ts
│   └── api.test.ts
\`\`\`

## Migration Notes

This architecture was implemented through an incremental migration:

1. **Phase 1**: Setup infrastructure and directory structure
2. **Phase 2**: Migrate Fleet domain (drivers, vehicles, loads)
3. **Phase 3**: Migrate Routing domain (route-planning, optimization, hos-compliance)
4. **Phase 4**: Migrate Operations domain (alerts)
5. **Phase 5**: Migrate Platform domain (auth, users, preferences, feature-flags, onboarding)
6. **Phase 6**: Move shared components
7. **Phase 7**: Cleanup and remove compatibility re-exports

Backward compatibility was maintained during migration using temporary re-exports.

## References

- [Feature-Sliced Design](https://feature-sliced.design/)
- [Next.js Project Organization](https://nextjs.org/docs/app/building-your-application/routing/colocation)
- [React Query Best Practices](https://tkdodo.eu/blog/practical-react-query)
```

**Step 3: Commit**

```bash
git add apps/web/README.md apps/web/ARCHITECTURE.md
git commit -m "docs: update documentation for new domain architecture

- Update README with new structure
- Add ARCHITECTURE.md with detailed explanation
- Document domain alignment and best practices"
```

---

### Task 7.4: Final Verification

**Step 1: Run all checks**

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build
npm run build

# Tests (if any)
npm run test
```

**Step 2: Manual testing checklist**

Test all major features:

- [ ] Login/Logout
- [ ] Driver management (list, create, edit, delete)
- [ ] Vehicle management
- [ ] Load management
- [ ] Route planning
- [ ] Alerts
- [ ] User management
- [ ] Settings/Preferences
- [ ] Onboarding flow

**Step 3: Performance check**

Compare before/after bundle sizes:

```bash
npm run build
# Check .next/static output
```

**Step 4: Create final summary commit**

```bash
git add .
git commit -m "feat: complete frontend domain architecture migration

Summary of changes:
- Migrated all features to domain-aligned structure
- Fleet: drivers, vehicles, loads
- Routing: route-planning, optimization, hos-compliance
- Operations: alerts
- Platform: auth, users, preferences, feature-flags, onboarding
- Moved shared components to shared/
- Updated all page imports
- Removed compatibility re-exports
- Updated documentation

Benefits:
- Consistent mental model with backend
- Clear domain boundaries
- Better code organization
- Easier to find and maintain code
- Prepared for team scaling

BREAKING CHANGES: None (all imports updated)"
```

---

## Testing Strategy

### Automated Testing

**1. Type Safety**
```bash
npm run type-check
```
- Verifies all imports resolve correctly
- Catches missing types
- Ensures type compatibility

**2. Build Verification**
```bash
npm run build
```
- Ensures no circular dependencies
- Verifies barrel exports work
- Checks for unused code

**3. Linting**
```bash
npm run lint
```
- Catches import issues
- Verifies code style consistency

### Manual Testing

**Test each domain after migration:**

1. **Fleet Domain**
   - [ ] List drivers
   - [ ] Create new driver
   - [ ] Edit driver
   - [ ] Delete driver
   - [ ] Activate driver
   - [ ] Same for vehicles and loads

2. **Routing Domain**
   - [ ] Create route plan
   - [ ] View route details
   - [ ] Simulate route changes
   - [ ] Check HOS compliance
   - [ ] View optimization recommendations

3. **Operations Domain**
   - [ ] View alerts list
   - [ ] Acknowledge alert
   - [ ] Resolve alert
   - [ ] Filter alerts by type

4. **Platform Domain**
   - [ ] Login
   - [ ] Logout
   - [ ] Register new tenant
   - [ ] Invite user
   - [ ] Update preferences
   - [ ] Toggle feature flags
   - [ ] Complete onboarding

### Integration Testing

**Cross-domain workflows:**

1. **Route Planning Flow**
   - Select driver (Fleet)
   - Select vehicle (Fleet)
   - Select load (Fleet)
   - Plan route (Routing)
   - View alerts (Operations)

2. **User Management Flow**
   - Login (Platform/Auth)
   - View users (Platform/Users)
   - Update preferences (Platform/Preferences)

---

## Rollback Plan

### If Migration Fails

**Option 1: Revert Specific Domain**

If one domain has issues:

```bash
# Revert specific commits
git log --oneline | grep "refactor(fleet)"
git revert <commit-hash>

# Restore from backup
git checkout HEAD~10 -- src/components/drivers
git checkout HEAD~10 -- src/lib/api/drivers.ts
```

**Option 2: Full Rollback**

If major issues occur:

```bash
# Create backup branch
git branch migration-backup

# Revert to pre-migration state
git reset --hard <commit-before-migration>

# Keep new directory structure for future attempt
git cherry-pick <infrastructure-setup-commit>
```

**Option 3: Keep Compatibility Layer**

If pages need more time to update:

```bash
# Don't delete compatibility re-exports yet
# Keep both old and new paths working
# Gradually update pages over time
```

### Rollback Testing

After rollback:

```bash
npm run type-check
npm run build
npm run dev
# Test all major features
```

---

## Post-Migration Checklist

- [ ] All TypeScript checks pass
- [ ] Build succeeds without errors
- [ ] All pages load correctly
- [ ] All features work as expected
- [ ] No console errors
- [ ] Performance is similar or better
- [ ] Documentation is updated
- [ ] Team is trained on new structure
- [ ] Compatibility re-exports removed
- [ ] Old directories cleaned up

---

## Benefits Summary

### Developer Experience

1. **Easier to Navigate**: Code organized by domain (same as backend)
2. **Clearer Ownership**: Teams can own domains end-to-end
3. **Better Discoverability**: "Where does driver code live?" → `features/fleet/drivers`
4. **Reduced Cognitive Load**: Related code co-located

### Code Quality

1. **Better Separation of Concerns**: Clear domain boundaries
2. **Reusability**: Features expose clean APIs
3. **Testability**: Features independently testable
4. **Maintainability**: Changes contained within domains

### Team Scalability

1. **Parallel Development**: Teams work on different domains
2. **Clear Boundaries**: Reduced merge conflicts
3. **Onboarding**: New devs understand structure quickly
4. **Microservices Ready**: Can extract domains to separate apps

---

## Timeline Estimate

**Single Developer:**
- Phase 1 (Setup): 2 hours
- Phase 2 (Fleet): 4 hours
- Phase 3 (Routing): 6 hours
- Phase 4 (Operations): 1 hour
- Phase 5 (Platform): 5 hours
- Phase 6 (Shared): 2 hours
- Phase 7 (Cleanup): 4 hours
- **Total: ~24 hours (3 days)**

**Team of 3 (Parallel):**
- Phase 1 (Setup): 2 hours
- Phases 2-5 (Parallel): 6 hours
- Phase 6 (Shared): 2 hours
- Phase 7 (Cleanup): 4 hours
- **Total: ~14 hours (2 days)**

---

## Execution Options

**Plan complete and saved to `.docs/plans/2026-02-05-frontend-domain-architecture-migration.md`.**

Two execution options:

**1. Subagent-Driven (this session)**
- I dispatch fresh subagent per task
- Review between tasks
- Fast iteration with oversight

**2. Parallel Session (separate)**
- Open new session with executing-plans
- Batch execution with checkpoints
- More autonomous execution

**Which approach would you prefer?**
