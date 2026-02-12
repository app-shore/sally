# Scheduled Jobs Refactoring — Data-Type-Based Sync Jobs (Updated)

**Date:** February 11, 2026
**Status:** Completed (Merged)
**Branch:** `feature/scheduled-jobs-refactoring`
**PR:** https://github.com/app-shore/sally/pull/10

---

## Context

The first implementation organized jobs by **integration source** (EldSyncJob, TmsSyncJob) — each calling `SyncService.syncIntegration(id)` which is the same full sync as the manual "Sync Now" button. This is wrong.

Jobs should be organized by **data type** — each job syncs one kind of data across all relevant integrations. Manual "Sync Now" via `SyncService.syncIntegration()` stays unchanged.

This plan replaced `EldSyncJob` and `TmsSyncJob` with proper data-type jobs, added a new `VehicleTelematics` Prisma model, extended the ELD adapter for location data, and created a telematics sync job.

---

## Design Decision: Configurable Job Timing

**Approach:** `.env` defaults via `process.env` in `@Cron()` decorators.

Each job reads its cron expression from an environment variable with a sensible default:

```typescript
@Cron(process.env.SYNC_DRIVERS_CRON || '0 */15 * * * *')
```

**Environment Variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `SYNC_DRIVERS_CRON` | `0 */15 * * * *` | Driver roster sync (every 15 min) |
| `SYNC_VEHICLES_CRON` | `0 */15 * * * *` | Vehicle data sync (every 15 min) |
| `SYNC_LOADS_CRON` | `0 */15 * * * *` | Active loads sync (every 15 min) |
| `SYNC_HOS_CRON` | `0 */5 * * * *` | HOS hours sync (every 5 min) |
| `SYNC_TELEMATICS_CRON` | `0 */2 * * * *` | Vehicle telematics sync (every 2 min) |

**Rationale:**
- Simple, global, ops-friendly
- Matches existing `ConfigModule` pattern (env vars loaded before module init)
- `process.env` is available at decorator evaluation time
- Per-tenant config can be added later if needed (via `SchedulerRegistry` dynamic approach)
- The existing `syncIntervalSeconds` field on `IntegrationConfig` remains unused for now

---

## New Job Structure

| Job | Default Frequency | Data | Source | Dependencies |
|-----|-------------------|------|--------|-------------|
| DriversSyncJob | 15 min | Driver rosters | TMS creates → ELD enriches | TmsSyncService, EldSyncService |
| VehiclesSyncJob | 15 min | Vehicle data | TMS creates → ELD enriches | TmsSyncService, EldSyncService |
| LoadsSyncJob | 15 min | Active loads + stops | TMS only | TmsSyncService |
| HosSyncJob | 5 min | HOS hours per driver | ELD (via IntegrationManagerService) | IntegrationManagerService |
| TelematicsSyncJob | 2 min | Truck location, speed, fuel, odometer | ELD (new adapter method) | AdapterFactoryService, CredentialsService |

---

## What Was Implemented

### Deleted
- `eld-sync.job.ts`, `tms-sync.job.ts` + tests

### Created
- `drivers-sync.job.ts` + 4 tests
- `vehicles-sync.job.ts` + 3 tests
- `loads-sync.job.ts` + 3 tests
- `hos-sync.job.ts` + 4 tests
- `telematics-sync.job.ts` + 4 tests
- `VehicleTelematics` Prisma model + migration
- `ELDVehicleLocationData` interface + `getVehicleLocations()` on IELDAdapter
- Samsara adapter mock implementation

### Modified
- `sync.module.ts` — swapped old jobs for new
- `integrations.module.ts` — added HosSyncJob
- `.env.example` — added SYNC_*_CRON variables
- `scheduled-jobs.mdx` — updated documentation

### Verification
- 20 tests pass across 6 suites
- Zero references to deleted EldSyncJob/TmsSyncJob
- Prisma client generates clean
