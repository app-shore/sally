# Unified Seed CLI & Mock Data Layer

> **Status:** ✅ Implemented | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-02-09-unified-seed-cli-and-mock-data-layer.md`

---

## 1. Overview

The backend implements a two-part system for managing test/development data:

1. **Mock Data Layer** -- single source of truth for all runtime mock entities (`infrastructure/mock/`)
2. **Seed CLI** -- unified, environment-aware database seeding (`prisma/seeds/`)

---

## 2. Mock Data Layer

### Validated Files

| File | Path | Status |
|------|------|--------|
| `mock.config.ts` | `apps/backend/src/infrastructure/mock/mock.config.ts` | ✅ Present |
| `mock.dataset.ts` | `apps/backend/src/infrastructure/mock/mock.dataset.ts` | ✅ Present |

### mock.config.ts

Single flag controlling all runtime mocks:

```typescript
export const MOCK_MODE = process.env.MOCK_MODE !== 'false';
```

- Default: `true` (everything mocked until real services come online)
- Set `MOCK_MODE=false` when real data flows
- Grep `MOCK_MODE` to see what is still mocked

### Mock Strategy by Data Type

| Data | Strategy | Why |
|------|----------|-----|
| Command center (routes, KPIs, HOS) | Runtime mock | Display only, no user interactions |
| TMS drivers/vehicles | Runtime mock (via adapter) | Synced on demand by user |
| Alerts | DB seed | Dispatchers acknowledge, resolve, add notes |
| Notifications | DB seed | Users mark read, dismiss |
| Feature flags | DB seed | Toggled via admin UI |
| Truck stops | DB seed | Referenced by route planning |
| Super admin | DB seed | Login required |

### Migration Path to Real Data

When a real service comes online, the change is surgical:

```typescript
// BEFORE
if (MOCK_MODE) {
  return generateMockActiveRoutes(tenantId);
}

// AFTER -- route planning is live
return this.routePlanningService.getActiveRoutes(tenantId);
```

---

## 3. Seed CLI

### Validated Files

All seed files are present at `apps/backend/prisma/seeds/`:

| File | Status | Description |
|------|--------|-------------|
| `index.ts` | ✅ Present | Orchestrator with profiles, env detection, sequencing |
| `01-super-admin.seed.ts` | ✅ Present | Super admin user |
| `02-feature-flags.seed.ts` | ✅ Present | Feature flags |
| `03-truck-stops.seed.ts` | ✅ Present | 50 truck stops |
| `04-sample-alerts.seed.ts` | ✅ Present | Sample alerts |
| `05-sample-notifications.seed.ts` | ✅ Present | Sample notifications |
| `utils.ts` | ✅ Present | Env detection, confirmation prompts, logging |

Also present: `apps/backend/prisma/seed.ts` (wrapper entry point)

### Profiles

| Profile | Seeds | Use Case |
|---------|-------|----------|
| `base` | 01 -> 02 -> 03 | Production, staging, local -- essential data only |
| `demo` | 01 -> 02 -> 03 -> 04 -> 05 | Local + staging -- adds sample alerts and notifications |

### CLI Commands

```bash
pnpm run setup:base    # Run base profile seeds
pnpm run setup:demo    # Run demo profile seeds (includes sample data)
pnpm run setup:reset   # Reset and re-seed
pnpm run setup:status  # Show current seed status
```

### Environment Safety Matrix

| Command | Local | Staging | Production |
|---------|-------|---------|------------|
| `setup:base` | Runs immediately | Runs immediately | y/n confirmation |
| `setup:demo` | Runs immediately | Runs immediately | **Blocked** |
| `setup:reset` | Runs immediately | y/n confirmation | Must type DB name to confirm |
| `setup:status` | Runs immediately | Runs immediately | Runs immediately (read-only) |

### Orchestrator Behavior (index.ts)

The orchestrator (validated from actual code):

1. Parses CLI args (`--profile`, `--reset`, `--status`)
2. Detects environment from `NODE_ENV`
3. Applies safety checks via `checkSafety()` (confirm/block per matrix)
4. Runs seeds sequentially in numbered order
5. Each seed logs results via `logSeedResult()`
6. All seeds use **upsert** -- safe to re-run without duplicating

### Status Command Output

```
  SALLY Setup Status
  Database: sally

  Entity             Count    Status
  -----------------  -------  ---------------------
  Super Admin        1        seeded
  Feature Flags      13       8 on, 5 off
  Truck Stops        50       seeded
  Drivers            0        run TMS sync
  Alerts             0        run setup:demo
  Notifications      0        run setup:demo
```

### Alert Seed Dependencies

- `04-sample-alerts.seed.ts`: Queries DB for existing drivers. If no drivers exist, skips with message.
- `05-sample-notifications.seed.ts`: Queries for existing users. If only super admin exists, creates notifications for super admin.

---

## 4. Seed File Contract

Every seed file exports:

```typescript
export const seed = {
  name: 'Feature Flags',
  description: 'Creates 13 feature flags across dispatcher, driver, and admin categories',
  run: async (prisma: PrismaClient) => {
    // Uses upsert -- safe to re-run
    // Returns: { created: number, skipped: number }
  },
};
```

---

## 5. What Was Consolidated

| Item | Before | After |
|------|--------|-------|
| Super admin creation | `scripts/create-super-admin.ts` standalone | `01-super-admin.seed.ts` |
| Feature flags seeding | `prisma/seeds/feature-flags.seed.ts` (loose) | `02-feature-flags.seed.ts` (numbered) |
| Truck stops seeding | `prisma/seeds/truck-stops.seed.ts` (loose) | `03-truck-stops.seed.ts` (numbered) |
| Alert seeding | `POST /alerts/seed` public endpoint | `04-sample-alerts.seed.ts` (DB seed) |
| Notification seeding | `POST /notifications/seed` public endpoint | `05-sample-notifications.seed.ts` (DB seed) |
| Mock data | Scattered across 6+ files | `infrastructure/mock/mock.dataset.ts` |
| Mock mode flag | N/A | `infrastructure/mock/mock.config.ts` |

---

## 6. Current State

Both the Mock Data Layer and Seed CLI are fully implemented and operational. The system provides:
- Single source of truth for mock entities
- Environment-aware safety for production databases
- Discoverable seed scripts with clear numbering
- Consistent entity IDs across all mock data sources
