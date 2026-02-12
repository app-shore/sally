# Unified Seed CLI & Mock Data Layer

**Date:** 2026-02-09
**Status:** Design
**Scope:** Backend infrastructure — database seeding, mock data consolidation

---

## Problem

Mock and seed data is scattered across multiple locations with inconsistent entity IDs:

| Location | What | Driver IDs |
|----------|------|------------|
| `prisma/seed.ts` | Super admin, feature flags, truck stops | N/A |
| `prisma/seeds/feature-flags.seed.ts` | 13 feature flags | N/A |
| `prisma/seeds/truck-stops.seed.ts` | 50 truck stops | N/A |
| `POST /alerts/seed` (public endpoint) | 10 sample alerts | `DRV-001` to `DRV-005` |
| `POST /notifications/seed` (public endpoint) | Sample notifications | Uses user IDs |
| `command-center.mock.ts` | Runtime routes, KPIs, HOS | `DRV-001` to `DRV-010` |
| TMS adapters (McLeod, Project44) | Mock drivers on sync | `MCLEOD_DRV_001`, `MCLEOD_DRV_002` |
| `scripts/create-super-admin.ts` | Standalone super admin script | N/A |

**Issues:**
1. **Inconsistent IDs** — alerts reference `DRV-001`, TMS returns `MCLEOD_DRV_001`, no overlap
2. **No discoverability** — hard to know what seed scripts exist
3. **No safety** — public seed endpoints, no environment protection
4. **No single toggle** — can't tell what's mocked vs real

---

## Solution: Two Complementary Systems

### 1. Mock Data Layer — single source of truth for all mock entities
### 2. Seed CLI — unified, environment-aware database seeding

---

## Part 1: Mock Data Layer

### File Structure

```
apps/backend/src/infrastructure/mock/
├── mock.config.ts       # MOCK_MODE flag from env
├── mock.dataset.ts      # ALL mock entities — one place
```

### `mock.config.ts`

```typescript
// Single flag controlling all runtime mocks
// Default: true (everything mocked until real services come online)
// Set MOCK_MODE=false when real data flows
export const MOCK_MODE = process.env.MOCK_MODE !== 'false';
```

### `mock.dataset.ts`

Single source of truth for all mock entities:

```typescript
// ---- Drivers (10) ----
export const MOCK_DRIVERS = [
  { id: 'DRV-001', firstName: 'Mike', lastName: 'Johnson', phone: '555-0101', email: 'mike.johnson@carrier.com', licenseNumber: 'TX-CDL-20198', licenseState: 'TX' },
  { id: 'DRV-002', firstName: 'Sarah', lastName: 'Chen', ... },
  // ... 10 total
];

// ---- Vehicles (10) ----
export const MOCK_VEHICLES = [
  { id: 'VH-TRK-001', unitNumber: 'TRK-001', make: 'Freightliner', model: 'Cascadia', year: 2023, fuelCapacity: 200 },
  // ... 10 total
];

// ---- Stops (15) ----
export const MOCK_STOPS = [
  { name: 'Dallas Distribution Center', location: 'Dallas, TX', lat: 32.78, lng: -96.80 },
  // ... 15 total
];

// ---- Runtime generators (for command center) ----
export function generateMockActiveRoutes(tenantId: number): ActiveRouteDto[] { ... }
export function generateMockKPIs(...): KPIDto { ... }
export function generateMockDriverHOS(...): DriverHOSChipDto[] { ... }
export function generateMockQuickActionCounts(...): { ... }
```

### Mock Strategy by Data Type

| Data | Strategy | Why |
|------|----------|-----|
| Command center (routes, KPIs, HOS) | **Runtime mock** | Display only, no user interactions |
| TMS drivers/vehicles | **Runtime mock** (via adapter) | Synced on demand by user, not seeded |
| Alerts | **DB seed** | Dispatchers acknowledge, resolve, add notes |
| Notifications | **DB seed** | Users mark read, dismiss |
| Feature flags | **DB seed** | Toggled via admin UI |
| Truck stops | **DB seed** | Referenced by route planning |
| Super admin | **DB seed** | Login required |

### What Changes in Existing Code

| Service | Before | After |
|---------|--------|-------|
| Command center service | Imports from `command-center.mock.ts` | Imports from `infrastructure/mock/mock.dataset.ts` |
| TMS adapters (McLeod, Project44) | Own inline mock drivers | Import `MOCK_DRIVERS` from `mock.dataset.ts` |
| Alert seed | Hardcoded driver names/IDs inline | Import `MOCK_DRIVERS` from `mock.dataset.ts` |
| Notification seed | Inline data | Import from `mock.dataset.ts` |

### Migration Path to Real Data

When a real service comes online, the change is surgical:

```typescript
// BEFORE — command-center.service.ts
if (MOCK_MODE) {
  return generateMockActiveRoutes(tenantId);
}

// AFTER — route planning is live
return this.routePlanningService.getActiveRoutes(tenantId);
// Delete the MOCK_MODE check and the import
```

Grep `MOCK_MODE` to see what's still mocked. Each service flips independently.

---

## Part 2: Seed CLI

### File Structure

```
apps/backend/prisma/seeds/
├── index.ts                          # Orchestrator — profiles, env detection, sequencing
├── 01-super-admin.seed.ts            # Super admin user
├── 02-feature-flags.seed.ts          # 13 feature flags (existing, renamed)
├── 03-truck-stops.seed.ts            # 50 truck stops (existing, renamed)
├── 04-sample-alerts.seed.ts          # Alerts — imports MOCK_DRIVERS for consistent IDs
├── 05-sample-notifications.seed.ts   # Notifications — references real seeded users
└── utils.ts                          # Env detection, confirmation prompts, logging
```

### Each Seed File Contract

```typescript
// Every seed file exports:
export const seed = {
  name: 'Feature Flags',
  description: 'Creates 13 feature flags across dispatcher, driver, and admin categories',
  run: async (prisma: PrismaClient) => {
    // Uses upsert — safe to re-run
    // Returns: { created: number, skipped: number }
  },
};
```

### Profiles

| Profile | Seeds | Use Case |
|---------|-------|----------|
| `base` | 01 → 02 → 03 | Production, staging, local — essential data only |
| `demo` | 01 → 02 → 03 → 04 → 05 | Local + staging — adds sample alerts & notifications |

### npm Scripts

```json
{
  "setup:base":   "ts-node prisma/seeds/index.ts --profile base",
  "setup:demo":   "ts-node prisma/seeds/index.ts --profile demo",
  "setup:reset":  "ts-node prisma/seeds/index.ts --reset",
  "setup:status": "ts-node prisma/seeds/index.ts --status"
}
```

### Environment Safety

| Command | Local | Staging | Production |
|---------|-------|---------|------------|
| `setup:base` | Runs immediately | Runs immediately | y/n confirmation |
| `setup:demo` | Runs immediately | Runs immediately | **Blocked** |
| `setup:reset` | Runs immediately | y/n confirmation | Must type DB name to confirm |
| `setup:status` | Runs immediately | Runs immediately | Runs immediately (read-only) |

### `setup:status` Output

```
┌──────────────────┬───────┬─────────────────────┐
│ Entity           │ Count │ Status              │
├──────────────────┼───────┼─────────────────────┤
│ Super Admin      │ 1     │ seeded              │
│ Feature Flags    │ 13    │ 8 on, 5 off         │
│ Truck Stops      │ 50    │ seeded              │
│ Drivers          │ 0     │ run TMS sync        │
│ Alerts           │ 0     │ run setup:demo      │
│ Notifications    │ 0     │ run setup:demo      │
└──────────────────┴───────┴─────────────────────┘
```

### Orchestrator (`index.ts`) Behavior

1. Parse CLI args (`--profile`, `--reset`, `--status`)
2. Detect environment from `NODE_ENV`
3. Apply safety checks (confirm/block per matrix above)
4. Run seeds sequentially in numbered order
5. Each seed logs: `[02-feature-flags] 13 created, 0 skipped`
6. Print summary table at end
7. All seeds use **upsert** — safe to re-run without duplicating

### Alert Seed Dependency

`04-sample-alerts.seed.ts` queries the DB for existing drivers:
- If drivers exist (from TMS sync) → creates alerts referencing those real driver IDs
- If no drivers exist → skips with message: `"No drivers found. Sync a TMS integration first, then re-run setup:demo."`

`05-sample-notifications.seed.ts` queries for existing users:
- If users exist → creates notifications for those users
- If only super admin exists → creates notifications for super admin

---

## Data Flow Diagram

```
                    ┌─────────────────────────┐
                    │   mock.dataset.ts       │
                    │   (Single Source of      │
                    │    Truth for Mock Data)  │
                    └────────┬────────────────┘
                             │
              ┌──────────────┼──────────────────┐
              │              │                  │
              ▼              ▼                  ▼
     ┌────────────┐  ┌──────────────┐  ┌──────────────────┐
     │  CLI Seeds  │  │  Runtime     │  │  TMS Adapters    │
     │  (DB setup) │  │  Services    │  │  (mock mode)     │
     │             │  │              │  │                  │
     │ 04-alerts   │  │ Command Ctr  │  │ McLeod adapter   │
     │ 05-notifs   │  │ Sally AI     │  │ Project44 adapter│
     └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘
            │                │                   │
            │           ┌────┴────┐              │
            │           │MOCK_MODE│              │
            │           │ check   │              │
            │           └────┬────┘              │
            ▼                ▼                   ▼
     ┌─────────────────────────────────────────────┐
     │              PostgreSQL                     │
     │  (Consistent IDs everywhere)                │
     └─────────────────────────────────────────────┘
```

---

## What Gets Deleted

| Item | Action |
|------|--------|
| `POST /alerts/seed` endpoint | Delete from `alerts.controller.ts` |
| `POST /notifications/seed` endpoint | Delete from `notifications.controller.ts` |
| `command-center.mock.ts` | Delete — logic moves to `mock.dataset.ts` |
| `scripts/create-super-admin.ts` | Delete — consolidated into `01-super-admin.seed.ts` |
| Inline mock data in TMS adapters | Replace with import from `mock.dataset.ts` |
| `prisma/seed.ts` (old) | Replace — becomes thin wrapper calling `setup:base` |

---

## Implementation Order

```
Step 1:  Create mock.dataset.ts — consolidate all mock entity data
Step 2:  Create mock.config.ts — MOCK_MODE env flag
Step 3:  Update command center service — import from mock.dataset, delete command-center.mock.ts
Step 4:  Update TMS adapters — import MOCK_DRIVERS from mock.dataset
Step 5:  Reorganize seed files — 01 through 05, all importing from mock.dataset
Step 6:  Create orchestrator — index.ts with profile/env/safety logic
Step 7:  Create utils.ts — env detection, confirmation prompts, logging
Step 8:  Add npm scripts — setup:base, setup:demo, setup:reset, setup:status
Step 9:  Delete old endpoints — alerts/seed, notifications/seed
Step 10: Delete old scripts — create-super-admin.ts
Step 11: Update prisma/seed.ts — thin wrapper calling orchestrator with profile=base
```

---

## Open Questions (None)

All decisions resolved during brainstorming session.
