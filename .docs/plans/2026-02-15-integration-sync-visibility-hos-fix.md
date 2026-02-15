# Integration Sync Visibility & HOS Bug Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the HOS structured fields bug (all drivers showing 11h), rename HOS_ELD→ELD across the stack, add integration health visibility to fleet pages, enable ad-hoc sync from operational screens, add enable/disable toggle, enforce one-per-type integration limit, categorize integrations on Settings page, and surface unmatched asset alerts.

**Architecture:** Four-phase approach: (0) Rename HOS_ELD→ELD across schema/backend/frontend; (1) Backend fixes — HOS field population, fleet sync endpoint, health endpoint, driver list HOS enrichment; (2) Fleet page UX — integration health strip with sync controls, data freshness badges, enable/disable toggle, one-per-type enforcement, Settings page category headers; (3) Unmatched asset tracking and visibility.

**Tech Stack:** NestJS backend, Prisma ORM, Next.js 15 App Router, React Query, Shadcn/ui, Tailwind CSS, Zustand

---

## Design Decisions

### Integration Type Segregation

Integrations fall into two operational categories:

| Category | Types | Purpose | Visibility |
|----------|-------|---------|------------|
| **Fleet Data Pipeline** | TMS, ELD | Creates entities + live HOS/telematics. Has dependency chain: TMS must sync before ELD can match. | Fleet page health strip |
| **Operational Data Feeds** | FUEL_PRICE, WEATHER, ACCOUNTING | Used by route engine / accounting. No entity creation. | Settings page only (Phase 3 stubs) |

The health strip on fleet/command center pages shows **Fleet Data Pipeline** integrations only. Operational feeds are managed in Settings > Integrations.

### One Integration Per Type Per Tenant

Real-world: carriers run one TMS and one ELD provider. The schema already has `@@unique([tenantId, integrationType, vendor])` but the UI currently allows adding multiple TMS or ELD integrations with different vendors. We enforce **one per type** in the UI:
- When a TMS is already configured, the "Add TMS" option is disabled with "TMS already connected"
- Same for ELD
- Backend `syncFleet()` already handles multiples safely (loops), so no backend constraint needed — UI-only enforcement

### HOS_ELD → ELD Rename

The `IntegrationType` enum value `HOS_ELD` is misleading — it covers both HOS **and** telematics data from ELD providers. Renaming to `ELD` is more accurate and simpler. This is a Phase 0 refactoring task that touches ~23 files but is straightforward find-and-replace plus one Prisma migration.

### Settings Page Integration Categorization

The Settings > Integrations page currently shows all 4 integration type cards in a flat grid. We add section headers to group them:
- **Fleet Data Pipeline** — TMS, ELD (these create and enrich fleet entities, have automated cron jobs)
- **Operational Data Feeds** — Fuel Prices, Weather (used by route engine, no entity creation)

### "Sync Fleet" Semantics

The "Sync Fleet" button on the fleet page triggers the **full pipeline**:
1. TMS sync (creates/updates drivers, vehicles, loads)
2. ELD enrichment (matches ELD metadata to TMS entities)
3. HOS sync (fetches live HOS clocks — happens via separate 5-min cron, not part of fleet sync)

The tooltip explains: "Sync all data: TMS (drivers, vehicles, loads) → ELD (HOS, telematics)"

---

## Current State Summary

### What's Broken

1. **HOS fields always 0** — `integration-manager.service.ts` stores HOS response in `hosData` JSON but never writes to `currentHoursDriven`, `currentOnDutyTime`, `currentHoursSinceBreak`, `cycleHoursUsed`. The UI calculates `11 - 0 = 11h` for every driver.

2. **Driver list API missing `current_hos`** — `GET /drivers` returns structured fields (always 0) but never includes the `current_hos` object. The fleet table reads `driver.current_hos?.drive_remaining` which is always `undefined`, falling back to `11 - 0 = 11`.

3. **Samsara HOS driver matching broken** — HOS sync matches by `driverId` string (e.g. `TMS-DRV-001`) but Samsara returns its own IDs (e.g. `53207939`). Match fails silently.

### What's Missing

4. **No `POST /fleet/sync` endpoint** — Backend `syncFleet()` service exists but no controller exposes it. Frontend `syncFleet()` API function exists but calls a non-existent endpoint.

5. **Fleet page "Sync Now" is fake** — Button on fleet page just calls `onRefresh()` (re-fetches list from DB). Doesn't trigger actual TMS/ELD sync.

6. **No enable/disable toggle in UI** — Backend fully supports `is_enabled` field, all cron jobs filter by it, but no UI toggle exists.

7. **No sync-in-progress visibility** — No way to see if a sync is currently running.

8. **No integration health on fleet pages** — Sync status only visible deep in Settings > Integrations > Configure > Sync History tab.

9. **No empty state** — When no integrations are configured, fleet page shows nothing about integrations. No prompt to set up.

10. **No one-per-type enforcement** — UI allows adding multiple TMS or ELD integrations.

---

## Phase 0: HOS_ELD → ELD Rename (Schema Refactoring)

### Task 0A: Prisma Schema Enum Rename + Migration

**Why:** `HOS_ELD` is misleading — ELD covers both HOS and telematics. Rename to `ELD` across the entire stack, starting with the database.

**Files:**
- Modify: `prisma/schema.prisma` (enum `IntegrationType`)
- Create: New Prisma migration

**Step 1: Update the Prisma enum**

In `prisma/schema.prisma`, find:
```prisma
enum IntegrationType {
  TMS
  HOS_ELD
  FUEL_PRICE
  WEATHER
  TELEMATICS
  ACCOUNTING
}
```

Change `HOS_ELD` to `ELD`.

**Step 2: Create a manual migration**

```bash
cd apps/backend
mkdir -p prisma/migrations/$(date +%Y%m%d%H%M%S)_rename_hos_eld_to_eld
```

Create `migration.sql`:
```sql
-- Rename HOS_ELD to ELD in the IntegrationType enum
ALTER TYPE "IntegrationType" RENAME VALUE 'ELD' TO 'ELD';
```

**Step 3: Apply the migration**

```bash
pnpm prisma migrate deploy
pnpm prisma generate
```

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "refactor: rename IntegrationType HOS_ELD to ELD in schema and migration"
```

---

### Task 0B: Rename HOS_ELD → ELD in Backend Code

**Why:** All backend references to `HOS_ELD` must change to `ELD` after the schema migration.

**Files (~15 backend files):**
- `src/domains/integrations/dto/create-integration.dto.ts`
- `src/domains/integrations/services/integration-manager.service.ts`
- `src/domains/integrations/sync/sync.service.ts`
- `src/domains/integrations/vendor-registry.ts`
- `src/domains/platform/onboarding/onboarding.service.ts`
- `src/infrastructure/jobs/drivers-sync.job.ts`
- `src/infrastructure/jobs/hos-sync.job.ts`
- `src/infrastructure/jobs/telematics-sync.job.ts`
- `src/infrastructure/jobs/vehicles-sync.job.ts`
- `src/shared/utils/data-sources.ts`
- Test files: `*.spec.ts`, `*.e2e-spec.ts`

**Step 1: Find-and-replace across all backend files**

In every file above, replace:
- `'ELD'` → `'ELD'`
- `HOS_ELD` (as enum value) → `ELD`
- Keep `hos_eld_api` as data source string if used (or rename to `eld_api` for consistency)

The `FLEET_PIPELINE_TYPES` arrays in the plan already use `'ELD'`.

**Step 2: Verify build compiles**

```bash
cd apps/backend && pnpm build
```

**Step 3: Run tests**

```bash
cd apps/backend && pnpm test
```

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: rename HOS_ELD to ELD in all backend services, jobs, and tests"
```

---

### Task 0C: Rename HOS_ELD → ELD in Frontend Code

**Why:** Frontend type definitions and UI components reference `HOS_ELD`.

**Files (~5 frontend files):**
- `apps/web/src/features/integrations/api.ts` (type + label function)
- `apps/web/src/features/integrations/components/ConnectionsTab.tsx` (category definition + references)
- `apps/web/src/features/integrations/components/ConfigureIntegrationForm.tsx`
- `apps/web/src/features/integrations/components/IntegrationCard.tsx`

**Step 1: Update the TypeScript type**

In `api.ts`:
```typescript
// Before
export type IntegrationType = 'TMS' | 'ELD' | 'FUEL_PRICE' | 'WEATHER' | 'TELEMATICS';

// After
export type IntegrationType = 'TMS' | 'ELD' | 'FUEL_PRICE' | 'WEATHER' | 'TELEMATICS';
```

Update label function:
```typescript
// Before
HOS_ELD: 'Hours of Service (ELD)',

// After
ELD: 'ELD (HOS & Telematics)',
```

**Step 2: Update ConnectionsTab category definition**

In `ConnectionsTab.tsx`, find the category for `HOS_ELD` and rename to `ELD`. Update the label from "Hours of Service (ELD)" to "ELD (HOS & Telematics)".

**Step 3: Update remaining frontend references**

In `ConfigureIntegrationForm.tsx` and `IntegrationCard.tsx`, replace `HOS_ELD` → `ELD`.

**Step 4: Verify frontend builds**

```bash
cd apps/web && pnpm build
```

**Step 5: Commit**

```bash
git add apps/web/
git commit -m "refactor: rename HOS_ELD to ELD in frontend types and components"
```

---

### Task 0D: Update Documentation References

**Files:**
- `apps/docs/pages/developer-guide/architecture/database.mdx`
- `apps/docs/pages/developer-guide/backend/scheduled-jobs.mdx`

**Step 1: Replace `HOS_ELD` with `ELD` in documentation**

**Step 2: Commit**

```bash
git add apps/docs/
git commit -m "docs: update HOS_ELD to ELD in developer guide"
```

---

## Phase 1: Backend Fixes (High Impact, No UI Changes)

### Task 1: Fix HOS Structured Field Population

**Why:** This is the root cause of "11h for everyone". After this fix, the route planning engine and fleet UI will show real HOS data.

**Files:**
- Modify: `apps/backend/src/domains/integrations/services/integration-manager.service.ts:140-148`

**Step 1: Update the driver cache write in `getDriverHOS`**

Find the block at lines 140-148 that updates the driver after fetching HOS:

```typescript
// CURRENT (broken) — only stores JSON blob
await this.prisma.driver.update({
  where: { id: driver.id },
  data: {
    hosData: hosData as any,
    hosDataSyncedAt: new Date(),
    hosDataSource: hosData.data_source,
    lastSyncedAt: new Date(),
  },
});
```

Replace with:

```typescript
// Convert Samsara remaining-time (ms) to hours-used for structured fields
const MS_TO_HOURS = 1 / (1000 * 60 * 60);
const driveRemaining = (hosData.driveTimeRemainingMs ?? 0) * MS_TO_HOURS;
const shiftRemaining = (hosData.shiftTimeRemainingMs ?? 0) * MS_TO_HOURS;
const cycleRemaining = (hosData.cycleTimeRemainingMs ?? 0) * MS_TO_HOURS;
const breakRemaining = (hosData.timeUntilBreakMs ?? 0) * MS_TO_HOURS;

await this.prisma.driver.update({
  where: { id: driver.id },
  data: {
    hosData: hosData as any,
    hosDataSyncedAt: new Date(),
    hosDataSource: hosData.data_source,
    lastSyncedAt: new Date(),
    // Populate structured fields (hours USED = max - remaining)
    currentHoursDriven: Math.max(0, 11 - driveRemaining),
    currentOnDutyTime: Math.max(0, 14 - shiftRemaining),
    currentHoursSinceBreak: Math.max(0, 8 - breakRemaining),
    cycleHoursUsed: Math.max(0, 70 - cycleRemaining),
  },
});
```

**Step 2: Verify by running the app and checking a driver's HOS endpoint**

```bash
curl http://localhost:3001/api/v1/drivers/TMS-DRV-001/hos
```

Expected: Response includes `driveTimeRemainingMs` with a non-zero value, and after refresh, `current_hours_driven` in driver list is non-zero.

**Step 3: Commit**

```bash
git add apps/backend/src/domains/integrations/services/integration-manager.service.ts
git commit -m "fix: populate HOS structured fields from Samsara remaining-time values"
```

---

### Task 2: Fix HOS Driver Matching (Samsara ID → SALLY ID)

**Why:** HOS sync matches on `driverId` string but Samsara returns its own numeric IDs. The match at line 117 (`hosClocks.find(c => c.driverId === driverId)`) always fails because `"TMS-DRV-001" !== "53207939"`.

**Files:**
- Modify: `apps/backend/src/domains/integrations/services/integration-manager.service.ts:110-120`

**Step 1: Update the matching logic to use `eldMetadata.eldId`**

Find the block around lines 110-120:

```typescript
// CURRENT (broken) — matches on mismatched ID systems
const hosClocks = await this.samsaraAdapter.getHOSClocks(apiToken);
const driverClock = hosClocks.find((c) => c.driverId === driverId);
```

Replace with:

```typescript
const hosClocks = await this.samsaraAdapter.getHOSClocks(apiToken);

// Match by ELD ID stored during ELD enrichment, fall back to name match
const eldId = driver.eldMetadata
  ? (driver.eldMetadata as any).eldId
  : null;

const driverClock = eldId
  ? hosClocks.find((c) => c.driverId === eldId)
  : hosClocks.find((c) =>
      c.driverName?.toLowerCase().includes(driver.name?.toLowerCase().split(' ')[0] ?? '')
    );

if (!driverClock) {
  this.logger.debug(
    `No HOS clock match for driver ${driverId} (eldId: ${eldId ?? 'not set'})`,
  );
}
```

**Note:** The `driver` object is already fetched earlier in the method (line 60-66) with no `select`, so `eldMetadata` and `name` are available.

**Step 2: Commit**

```bash
git add apps/backend/src/domains/integrations/services/integration-manager.service.ts
git commit -m "fix: match HOS clocks using ELD ID from driver metadata instead of TMS ID"
```

---

### Task 3: Enrich Driver List API with `current_hos`

**Why:** The fleet table reads `driver.current_hos?.drive_remaining` but the list API only returns structured fields. We need to derive `current_hos` from the cached `hosData` JSON.

**Files:**
- Modify: `apps/backend/src/domains/fleet/drivers/controllers/drivers.controller.ts:71-96`

**Step 1: Add HOS derivation to the driver list response**

In the `listDrivers` method, after line 86 (`cycle_hours_used`), add `current_hos` derived from `hosData`:

```typescript
return {
  id: driver.id,
  driver_id: driver.driverId,
  name: driver.name,
  // ... existing fields ...
  current_hours_driven: driver.currentHoursDriven,
  current_on_duty_time: driver.currentOnDutyTime,
  current_hours_since_break: driver.currentHoursSinceBreak,
  cycle_hours_used: driver.cycleHoursUsed,
  // ADD: Derived current_hos from cached hosData
  current_hos: driver.hosData ? {
    drive_remaining: ((driver.hosData as any).driveTimeRemainingMs ?? 0) / 3600000,
    shift_remaining: ((driver.hosData as any).shiftTimeRemainingMs ?? 0) / 3600000,
    cycle_remaining: ((driver.hosData as any).cycleTimeRemainingMs ?? 0) / 3600000,
    break_required: ((driver.hosData as any).timeUntilBreakMs ?? 0) / 3600000 < 0.5,
    data_source: (driver.hosData as any).data_source ?? driver.hosDataSource,
    last_updated: driver.hosDataSyncedAt?.toISOString(),
  } : null,
  // ADD: HOS metadata for freshness display
  hos_data_source: driver.hosDataSource,
  hos_data_synced_at: driver.hosDataSyncedAt?.toISOString(),
  external_driver_id: driver.externalDriverId,
  // ... rest of existing fields ...
};
```

**Step 2: Make sure `hosData`, `hosDataSource`, `hosDataSyncedAt` are included in the findAll query**

Check `apps/backend/src/domains/fleet/drivers/services/drivers.service.ts` — the `findAll` method. If it uses `select`, add these fields. If it fetches all fields (no `select`), no change needed.

**Step 3: Commit**

```bash
git add apps/backend/src/domains/fleet/drivers/controllers/drivers.controller.ts
git commit -m "feat: include current_hos derived from cached hosData in driver list API"
```

---

### Task 4: Expose `POST /fleet/sync` Endpoint

**Why:** Frontend already has `syncFleet()` API function but no backend endpoint. This enables the fleet page "Sync Fleet" to trigger real sync.

**Files:**
- Modify: `apps/backend/src/domains/integrations/integrations.controller.ts`

**Step 1: Add the fleet sync endpoint**

Add to `IntegrationsController` **BEFORE any `:integrationId` param routes** (otherwise Express interprets `fleet` as an integrationId):

```typescript
@Post('fleet/sync')
@ApiOperation({ summary: 'Trigger fleet-wide sync (TMS first, then ELD) for current tenant' })
async syncFleet(@CurrentUser() user: any) {
  const tenant = await this.prisma.tenant.findFirst({
    where: { users: { some: { id: user.id } } },
  });

  if (!tenant) {
    throw new NotFoundException('Tenant not found');
  }

  // Run sync asynchronously — return immediately
  this.syncService.syncFleet(tenant.id).catch((err) => {
    this.logger.error(`Fleet sync failed for tenant ${tenant.id}`, err.stack);
  });

  return {
    success: true,
    message: 'Fleet sync started. TMS data will sync first, then ELD enrichment.',
  };
}
```

**Important:** Check if `IntegrationsController` already has `PrismaService` and `SyncService` injected. If not, add them to the constructor.

**Step 2: Commit**

```bash
git add apps/backend/src/domains/integrations/integrations.controller.ts
git commit -m "feat: add POST /integrations/fleet/sync endpoint for fleet-wide sync"
```

---

### Task 5: Add Integration Health Summary Endpoint

**Why:** Fleet pages need a lightweight endpoint to show sync health without fetching full integration configs. Returns one TMS + one ELD (one-per-type model).

**Files:**
- Modify: `apps/backend/src/domains/integrations/integrations.controller.ts`
- Modify: `apps/backend/src/domains/integrations/integrations.service.ts`

**Step 1: Add service method**

In `integrations.service.ts`, add:

```typescript
/**
 * Get integration health summary for a tenant.
 *
 * Groups integrations into two categories:
 * - Fleet Data Pipeline (TMS, HOS_ELD) — shown on fleet pages
 * - Operational Data Feeds (FUEL_PRICE, WEATHER, ACCOUNTING) — settings only
 *
 * One-per-type model: returns singular tms/eld objects (first found per type).
 */
async getHealthSummary(tenantId: number) {
  const integrations = await this.prisma.integrationConfig.findMany({
    where: { tenantId },
    select: {
      integrationId: true,
      integrationType: true,
      vendor: true,
      displayName: true,
      isEnabled: true,
      status: true,
      lastSyncAt: true,
      lastSuccessAt: true,
      lastErrorAt: true,
      lastErrorMessage: true,
    },
  });

  // Check for any in-progress syncs
  const activeSyncs = await this.prisma.integrationSyncLog.findMany({
    where: {
      integration: { tenantId },
      completedAt: null,
      startedAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
    },
    select: {
      integration: { select: { integrationType: true, vendor: true } },
      syncType: true,
      startedAt: true,
    },
  });

  const FLEET_PIPELINE_TYPES = ['TMS', 'ELD'];

  const tms = integrations.find((i) => i.integrationType === 'TMS');
  const eld = integrations.find((i) => i.integrationType === 'ELD');
  const fleetPipeline = integrations.filter((i) => FLEET_PIPELINE_TYPES.includes(i.integrationType));
  const dataFeeds = integrations.filter((i) => !FLEET_PIPELINE_TYPES.includes(i.integrationType));

  const formatIntegration = (i: typeof integrations[0]) => ({
    id: i.integrationId,
    vendor: i.vendor,
    display_name: i.displayName,
    is_enabled: i.isEnabled,
    status: i.status,
    last_sync_at: i.lastSyncAt?.toISOString() ?? null,
    last_success_at: i.lastSuccessAt?.toISOString() ?? null,
    has_error: !!i.lastErrorAt && (!i.lastSuccessAt || i.lastErrorAt > i.lastSuccessAt),
    last_error_message: i.lastErrorMessage,
  });

  return {
    has_integrations: integrations.length > 0,
    has_fleet_pipeline: fleetPipeline.length > 0,
    tms: tms ? formatIntegration(tms) : null,
    eld: eld ? formatIntegration(eld) : null,
    active_syncs: activeSyncs.map((s) => ({
      type: s.integration.integrationType,
      vendor: s.integration.vendor,
      sync_type: s.syncType,
      started_at: s.startedAt.toISOString(),
    })),
    // Existing integration types (for one-per-type enforcement on Settings page)
    configured_types: integrations.map((i) => i.integrationType),
    data_feeds: dataFeeds.map(formatIntegration),
  };
}
```

**Step 2: Add controller endpoint**

In `integrations.controller.ts`, add **BEFORE any param routes**:

```typescript
@Get('health')
@ApiOperation({ summary: 'Get integration health summary for current tenant' })
async getHealthSummary(@CurrentUser() user: any) {
  const tenant = await this.prisma.tenant.findFirst({
    where: { users: { some: { id: user.id } } },
  });
  if (!tenant) {
    throw new NotFoundException('Tenant not found');
  }
  return this.integrationsService.getHealthSummary(tenant.id);
}
```

**Step 3: Commit**

```bash
git add apps/backend/src/domains/integrations/integrations.controller.ts apps/backend/src/domains/integrations/integrations.service.ts
git commit -m "feat: add GET /integrations/health endpoint with fleet pipeline / data feeds segregation"
```

---

### Task 6: Verify Enable/Disable Backend Support

**Why:** Confirm the backend already handles enable/disable correctly before building the UI toggle.

**Files:**
- Verify: `apps/backend/src/domains/integrations/integrations.service.ts:201-240` (updateIntegration)
- Verify: All sync jobs filter by `isEnabled: true`

**Step 1: Verify**

The `updateIntegration` method at line 227 already accepts `isEnabled: dto.is_enabled`. All 4 active cron jobs (vehicles-sync, drivers-sync, telematics-sync, hos-sync) plus loads-sync all filter by `isEnabled: true, status: 'ACTIVE'`.

**No backend changes needed** — gap is frontend-only (Task 9).

---

## Phase 2: Fleet Page UX (Frontend)

### Task 7: Add Integration Health API to Frontend

**Files:**
- Modify: `apps/web/src/features/integrations/api.ts`
- Create: `apps/web/src/features/integrations/hooks/use-integration-health.ts`

**Step 1: Add API types and function**

In `api.ts`, add:

```typescript
// Integration Health Types
export interface IntegrationHealthItem {
  id: string;
  vendor: string;
  display_name: string;
  is_enabled: boolean;
  status: string;
  last_sync_at: string | null;
  last_success_at: string | null;
  has_error: boolean;
  last_error_message: string | null;
}

export interface IntegrationHealthSummary {
  has_integrations: boolean;
  has_fleet_pipeline: boolean;
  tms: IntegrationHealthItem | null;
  eld: IntegrationHealthItem | null;
  active_syncs: {
    type: string;
    vendor: string;
    sync_type: string;
    started_at: string;
  }[];
  configured_types: string[];
  data_feeds: IntegrationHealthItem[];
  unmatched_assets: number;
}

export async function getIntegrationHealth(): Promise<IntegrationHealthSummary> {
  return apiClient<IntegrationHealthSummary>('/integrations/health');
}
```

Also update the existing `syncFleet` function path to match the new endpoint:

```typescript
export async function syncFleet(): Promise<{ success: boolean; message: string }> {
  return apiClient<{ success: boolean; message: string }>('/integrations/fleet/sync', {
    method: 'POST',
  });
}
```

**Step 2: Create React Query hook**

Create `apps/web/src/features/integrations/hooks/use-integration-health.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getIntegrationHealth, syncFleet } from '../api';

export const INTEGRATION_HEALTH_KEY = ['integration-health'];

export function useIntegrationHealth() {
  return useQuery({
    queryKey: INTEGRATION_HEALTH_KEY,
    queryFn: getIntegrationHealth,
    refetchInterval: 30000, // Poll every 30s for sync status
    staleTime: 10000,
  });
}

export function useSyncFleet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncFleet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTEGRATION_HEALTH_KEY });
    },
  });
}
```

**Step 3: Commit**

```bash
git add apps/web/src/features/integrations/api.ts apps/web/src/features/integrations/hooks/use-integration-health.ts
git commit -m "feat: add integration health API client and React Query hooks"
```

---

### Task 8: Create Integration Health Strip Component

**Why:** This is the primary operational visibility component — shows sync health inline on fleet pages. Only shows Fleet Data Pipeline integrations (TMS, ELD).

**Files:**
- Create: `apps/web/src/features/integrations/components/IntegrationHealthStrip.tsx`

**Step 1: Build the component**

Design principles:
- Sits at top of fleet/command center pages
- 3 states: (a) no integrations → setup prompt, (b) healthy → green timestamps, (c) issues → amber/red indicators
- Shows: TMS status, ELD status, active sync indicator, "Sync Fleet" button
- "Sync Fleet" tooltip explains the pipeline: "TMS (drivers, vehicles, loads) → ELD (HOS, telematics)"
- Settings gear icon links to Settings > Integrations for config
- Must follow dark theme, responsive, Shadcn components per CLAUDE.md

```tsx
'use client';

import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Settings, Loader2, Plug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIntegrationHealth, useSyncFleet } from '../hooks/use-integration-health';
import Link from 'next/link';

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'never';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function freshnessColor(dateStr: string | null): string {
  if (!dateStr) return 'text-muted-foreground';
  const age = Date.now() - new Date(dateStr).getTime();
  if (age < 5 * 60 * 1000) return 'text-green-600 dark:text-green-400';
  if (age < 30 * 60 * 1000) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

export function IntegrationHealthStrip() {
  const { data: health, isLoading } = useIntegrationHealth();
  const syncFleet = useSyncFleet();

  if (isLoading) return null;
  if (!health) return null;

  // State: No fleet pipeline integrations configured
  if (!health.has_fleet_pipeline) {
    return (
      <Alert className="bg-muted border-border">
        <AlertDescription className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-muted-foreground" />
            <span>
              <span className="font-medium">No integrations configured</span>
              {' '}— Connect your TMS and ELD to sync drivers, vehicles, and HOS data automatically.
            </span>
          </span>
          <Button size="sm" variant="outline" asChild>
            <Link href="/settings/integrations">
              <Settings className="h-3 w-3 mr-1" />
              Set Up
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const isSyncing = syncFleet.isPending || health.active_syncs.length > 0;
  const hasError = health.tms?.has_error || health.eld?.has_error;
  const tmsDisabled = health.tms && !health.tms.is_enabled;
  const eldDisabled = health.eld && !health.eld.is_enabled;

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 bg-muted/50 border border-border rounded-lg text-sm">
      <div className="flex items-center gap-4 flex-wrap">
        {/* TMS Status */}
        {health.tms && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                {health.tms.has_error ? (
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                ) : tmsDisabled ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                )}
                <span className="text-muted-foreground">TMS:</span>
                <span className={freshnessColor(health.tms.last_success_at)}>
                  {tmsDisabled ? 'paused' : timeAgo(health.tms.last_success_at)}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{health.tms.display_name}</p>
              {health.tms.has_error && <p className="text-red-400">{health.tms.last_error_message}</p>}
              {tmsDisabled && <p className="text-yellow-400">Integration is disabled</p>}
            </TooltipContent>
          </Tooltip>
        )}

        {/* ELD/HOS Status */}
        {health.eld && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                {health.eld.has_error ? (
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                ) : eldDisabled ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                )}
                <span className="text-muted-foreground">ELD:</span>
                <span className={freshnessColor(health.eld.last_success_at)}>
                  {eldDisabled ? 'paused' : timeAgo(health.eld.last_success_at)}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{health.eld.display_name}</p>
              {health.eld.has_error && <p className="text-red-400">{health.eld.last_error_message}</p>}
              {eldDisabled && <p className="text-yellow-400">Integration is disabled</p>}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Active sync indicator */}
        {isSyncing && (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Syncing...
          </Badge>
        )}

        {/* Error indicator */}
        {hasError && !isSyncing && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Sync error
          </Badge>
        )}

        {/* Unmatched assets indicator */}
        {health.unmatched_assets > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="gap-1 text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700">
                <AlertTriangle className="h-3 w-3" />
                {health.unmatched_assets} unmatched
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{health.unmatched_assets} ELD assets have no matching TMS record.</p>
              <p className="text-muted-foreground">Check Settings → Integrations for details.</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              onClick={() => syncFleet.mutate()}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync Fleet
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Sync all data: TMS (drivers, vehicles, loads) → ELD (HOS, telematics)</p>
          </TooltipContent>
        </Tooltip>

        <Button size="sm" variant="ghost" asChild>
          <Link href="/settings/integrations">
            <Settings className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/integrations/components/IntegrationHealthStrip.tsx
git commit -m "feat: create IntegrationHealthStrip component for fleet pages"
```

---

### Task 9: Add Enable/Disable Toggle + One-Per-Type Enforcement to Settings

**Why:** Dispatchers need to pause sync without deleting config, and we need to prevent adding duplicate TMS/ELD integrations.

**Files:**
- Modify: `apps/web/src/features/integrations/components/ConnectionsTab.tsx`

**Step 1: Add toggle to integration card actions**

In `ConnectionsTab.tsx`, find the per-integration action buttons area (around lines 456-508). Add a toggle switch before the Test button:

```tsx
import { Switch } from '@/components/ui/switch';

// Inside the integration card actions area, before the Test button:
<div className="flex items-center gap-1 mr-2">
  <Switch
    checked={integration.is_enabled}
    onCheckedChange={async (enabled) => {
      try {
        await updateIntegration(integration.id, { is_enabled: enabled });
        setIntegrations(prev =>
          prev.map(int =>
            int.id === integration.id ? { ...int, is_enabled: enabled } : int
          )
        );
        toast({
          title: enabled ? 'Integration enabled' : 'Integration paused',
          description: enabled
            ? 'Sync jobs will resume on next schedule.'
            : 'All sync jobs paused. Data will not update until re-enabled.',
        });
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: err instanceof Error ? err.message : 'Failed to update integration',
        });
      }
    }}
  />
  <span className="text-xs text-muted-foreground">
    {integration.is_enabled ? 'Active' : 'Paused'}
  </span>
</div>
```

**Step 2: Add one-per-type enforcement**

In the ConnectionsTab, when rendering category cards, check if the integration type already has a configured integration. If so, disable the "+" add button:

```tsx
// Derive which types are already configured
const configuredTypes = new Set(integrations.map(i => i.integration_type));

// In the category card "Add" button:
const FLEET_PIPELINE_TYPES = ['TMS', 'ELD'];
const isOnePerType = FLEET_PIPELINE_TYPES.includes(category.type);
const alreadyConfigured = configuredTypes.has(category.type);
const addDisabled = isOnePerType && alreadyConfigured;

<Tooltip>
  <TooltipTrigger asChild>
    <span> {/* span wrapper needed for disabled button tooltip */}
      <Button
        size="icon"
        variant="ghost"
        disabled={addDisabled}
        onClick={() => handleAddIntegration(category)}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </span>
  </TooltipTrigger>
  {addDisabled && (
    <TooltipContent>
      <p>{category.label} already connected. Remove existing to switch providers.</p>
    </TooltipContent>
  )}
</Tooltip>
```

**Step 3: Ensure Switch component is installed**

```bash
cd apps/web && npx shadcn@latest add switch
```

**Step 4: Commit**

```bash
git add apps/web/src/features/integrations/components/ConnectionsTab.tsx
git commit -m "feat: add enable/disable toggle and one-per-type enforcement to integrations"
```

---

### Task 10: Wire IntegrationHealthStrip into Fleet Page

**Why:** This surfaces sync visibility directly where dispatchers work.

**Files:**
- Modify: `apps/web/src/app/dispatcher/fleet/page.tsx`

**Step 1: Import and add the health strip**

At the top of the fleet page, add the health strip above the tabs:

```tsx
import { IntegrationHealthStrip } from '@/features/integrations/components/IntegrationHealthStrip';

// Inside the page component, before the Tabs component:
<div className="px-6 pt-4">
  <IntegrationHealthStrip />
</div>
```

**Step 2: Simplify existing per-tab sync banners**

Since the IntegrationHealthStrip now handles sync controls globally, remove the "Sync Now" button from the per-tab alert banners to avoid confusion (two sync buttons). Keep the read-only notice:

```tsx
{drivers.some(d => d.external_source) && (
  <div className="mx-6 mt-4 mb-2">
    <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
      <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
        <span className="font-medium">🔗 TMS integration active</span>
        {' '}— Some drivers are synced from your TMS. Synced drivers are read-only.
      </AlertDescription>
    </Alert>
  </div>
)}
```

Apply same simplification to the vehicles tab banner.

**Step 3: Remove unused `handleSyncDrivers`/`handleSyncVehicles` handlers** if they only called `onRefresh()`. Keep `onRefresh()` itself — it's still useful for re-fetching the list after sync completes.

**Step 4: Commit**

```bash
git add apps/web/src/app/dispatcher/fleet/page.tsx
git commit -m "feat: add IntegrationHealthStrip to fleet page, simplify per-tab sync banners"
```

---

### Task 11: Add HOS Freshness Badge to Driver Table

**Why:** Dispatchers need to know if a driver's HOS data is fresh or stale at a glance.

**Files:**
- Modify: `apps/web/src/app/dispatcher/fleet/page.tsx`

**Step 1: Add utility functions at top of file**

```tsx
function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'never';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function freshnessColor(dateStr: string | null): string {
  if (!dateStr) return 'text-muted-foreground';
  const age = Date.now() - new Date(dateStr).getTime();
  if (age < 5 * 60 * 1000) return 'text-green-600 dark:text-green-400';
  if (age < 30 * 60 * 1000) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}
```

**Step 2: Add freshness indicator next to HOS display**

In the drivers table HOS column (around lines 340-346):

```tsx
<TableCell className="text-center">
  <div className="flex items-center gap-2 justify-center">
    <Progress value={hosPercent} className="h-2 w-16" />
    <span className="text-xs text-muted-foreground whitespace-nowrap">
      {driveRemaining.toFixed(1)}h
    </span>
    {driver.hos_data_synced_at && (
      <Tooltip>
        <TooltipTrigger>
          <span className={`text-[10px] ${freshnessColor(driver.hos_data_synced_at)}`}>
            •
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>HOS synced {timeAgo(driver.hos_data_synced_at)}</p>
          {driver.hos_data_source && <p className="text-muted-foreground">Source: {driver.hos_data_source}</p>}
        </TooltipContent>
      </Tooltip>
    )}
  </div>
</TableCell>
```

**Step 3: Commit**

```bash
git add apps/web/src/app/dispatcher/fleet/page.tsx
git commit -m "feat: add HOS freshness badge with tooltip to driver table"
```

---

## Phase 3: Unmatched Asset Tracking

### Task 12: Track Unmatched Assets in ELD Sync

**Why:** Dispatchers need to know when Samsara has assets that don't match TMS records (e.g. new truck added in Samsara but not in TMS).

**Files:**
- Modify: `apps/backend/src/domains/integrations/sync/eld-sync.service.ts`
- Modify: `apps/backend/src/domains/integrations/sync/sync.service.ts`

**Step 1: Return unmatched details from ELD sync**

Update `syncVehicles` and `syncDrivers` in `eld-sync.service.ts` to return sync results with unmatched details:

```typescript
interface EldSyncResult {
  matched: number;
  unmatched: number;
  unmatchedItems: { id: string; name: string; matchField: string }[];
}
```

For `syncVehicles`, collect unmatched items in the else branch:

```typescript
unmatchedItems.push({
  id: eldVehicle.id,
  name: eldVehicle.vin || eldVehicle.id,
  matchField: eldVehicle.vin ? `VIN: ${eldVehicle.vin}` : `ID: ${eldVehicle.id}`,
});
```

Return `{ matched: matchedCount, unmatched: unmatchedCount, unmatchedItems }`.

Apply same pattern to `syncDrivers`.

**Step 2: Store unmatched details in sync log**

In `sync.service.ts`, when the ELD sync completes, update the sync log with unmatched data:

```typescript
if (result.unmatched > 0) {
  await this.prisma.integrationSyncLog.update({
    where: { id: syncLog.id },
    data: {
      errorDetails: {
        unmatched_count: result.unmatched,
        unmatched_items: result.unmatchedItems,
      },
    },
  });
}
```

**Step 3: Commit**

```bash
git add apps/backend/src/domains/integrations/sync/eld-sync.service.ts apps/backend/src/domains/integrations/sync/sync.service.ts
git commit -m "feat: track and store unmatched ELD assets in sync logs"
```

---

### Task 13: Add Unmatched Count to Health Summary

**Files:**
- Modify: `apps/backend/src/domains/integrations/integrations.service.ts` (in `getHealthSummary`)

**Step 1: Query recent unmatched counts**

Add to the `getHealthSummary` method:

```typescript
// Get unmatched asset counts from most recent ELD sync logs
const recentEldLogs = await this.prisma.integrationSyncLog.findMany({
  where: {
    integration: {
      tenantId,
      integrationType: 'ELD',
    },
    status: 'success',
    errorDetails: { not: null },
  },
  orderBy: { startedAt: 'desc' },
  take: 1,
  select: { errorDetails: true },
});

const unmatchedCount = recentEldLogs[0]
  ? ((recentEldLogs[0].errorDetails as any)?.unmatched_count ?? 0)
  : 0;
```

Add `unmatched_assets: unmatchedCount` to the return object.

**Step 2: Commit**

```bash
git add apps/backend/src/domains/integrations/integrations.service.ts
git commit -m "feat: include unmatched asset count in integration health summary"
```

---

## Phase Summary

| Phase | Tasks | Impact | Effort |
|-------|-------|--------|--------|
| **Phase 1** | Tasks 1-6 | Fixes HOS bug, enables real sync, backend foundation | Backend-only, ~2-3 hours |
| **Phase 2** | Tasks 7-11 | Health strip, sync controls, enable/disable, one-per-type | Frontend + backend, ~3-4 hours |
| **Phase 3** | Tasks 12-13 | Unmatched asset visibility | Backend + frontend, ~1 hour |

### Dependencies

```
Task 1 (HOS fields) ──→ Task 3 (driver list enrichment) ──→ Task 11 (freshness badge)
Task 2 (HOS matching) ─┘
Task 4 (fleet sync EP) ──→ Task 7 (frontend API) ──→ Task 8 (health strip) ──→ Task 10 (wire to fleet page)
Task 5 (health EP) ──────┘
Task 6 (verify enable/disable) ──→ Task 9 (toggle + one-per-type UI)
Task 12 (track unmatched) ──→ Task 13 (show unmatched in health)
```

### Testing Checklist

After all phases:

1. **HOS data is real** — Driver detail page shows actual remaining drive hours (not 11h for everyone)
2. **Fleet page shows health strip** — TMS and ELD status with freshness timestamps
3. **Sync Fleet works** — Button triggers TMS→ELD sync, shows spinner while running
4. **No integrations state** — Fleet page shows "Set Up" prompt when no fleet pipeline integrations configured
5. **Enable/disable toggle** — Pausing an integration stops its cron jobs, shows "paused" in health strip
6. **One-per-type** — Cannot add second TMS or second ELD on Settings page, "+" button disabled with tooltip
7. **Freshness badges** — Green dot (<5m), yellow (<30m), red (>30m) on HOS data in driver table
8. **Unmatched badge** — Shows count in health strip when ELD assets don't match TMS
9. **Dark mode** — All new components work in both light and dark themes
10. **Responsive** — Health strip wraps properly on mobile
11. **Integration categories** — Fleet Data Pipeline (TMS, ELD) shown on fleet page; Operational Data Feeds (fuel, weather, accounting) stay in Settings only
