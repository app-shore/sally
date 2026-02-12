# Scheduled Jobs Refactoring - Data-Type-Based Sync Jobs

> **Status:** ✅ Implemented (Merged) | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-02-11-scheduled-jobs-refactoring.md`

---

## Overview

Refactored scheduled sync jobs from integration-source-based organization (EldSyncJob, TmsSyncJob) to data-type-based organization. Each job now syncs one kind of data across all relevant integrations. Added VehicleTelematics model and ELD adapter extension for location data.

---

## Design Decision: Configurable Job Timing

Each job reads its cron expression from an environment variable with a sensible default:

```typescript
@Cron(process.env.SYNC_DRIVERS_CRON || '0 */15 * * * *')
```

| Variable | Default | Description |
|----------|---------|-------------|
| `SYNC_DRIVERS_CRON` | `0 */15 * * * *` | Driver roster sync (every 15 min) |
| `SYNC_VEHICLES_CRON` | `0 */15 * * * *` | Vehicle data sync (every 15 min) |
| `SYNC_LOADS_CRON` | `0 */15 * * * *` | Active loads sync (every 15 min) |
| `SYNC_HOS_CRON` | `0 */5 * * * *` | HOS hours sync (every 5 min) |
| `SYNC_TELEMATICS_CRON` | `0 */2 * * * *` | Vehicle telematics sync (every 2 min) |

---

## Job Structure (Validated against actual files)

### Jobs Directory
File location: `apps/backend/src/infrastructure/jobs/`

| Job File | Data Type | Source | Default Frequency |
|----------|-----------|--------|-------------------|
| `drivers-sync.job.ts` | Driver rosters | TMS creates, ELD enriches | 15 min |
| `vehicles-sync.job.ts` | Vehicle data | TMS creates, ELD enriches | 15 min |
| `loads-sync.job.ts` | Active loads + stops | TMS only | 15 min |
| `hos-sync.job.ts` | HOS hours per driver | ELD (via IntegrationManagerService) | 5 min |
| `telematics-sync.job.ts` | Truck location, speed, fuel, odometer | ELD (new adapter method) | 2 min |
| `fuel-price-sync.job.ts` | Fuel prices | ✅ Built (undocumented in original plan) |
| `weather-sync.job.ts` | Weather data | ✅ Built (undocumented in original plan) |
| `sync-log-cleanup.job.ts` | Cleanup old sync logs | ✅ Built (undocumented in original plan) |

### Test Files (Validated)

```
apps/backend/src/infrastructure/jobs/__tests__/
├── drivers-sync.job.spec.ts      # 4 tests
├── vehicles-sync.job.spec.ts     # 3 tests
├── loads-sync.job.spec.ts        # 3 tests
├── hos-sync.job.spec.ts          # 4 tests
├── telematics-sync.job.spec.ts   # 4 tests
└── sync-log-cleanup.job.spec.ts  # Tests for cleanup job
```

---

## What Was Changed

### Deleted
- `eld-sync.job.ts` - Old integration-source-based job
- `tms-sync.job.ts` - Old integration-source-based job
- Associated test files

### Created
- 5 new data-type-based sync jobs with tests (18+ tests total)
- `VehicleTelematics` Prisma model + migration
- `ELDVehicleLocationData` interface + `getVehicleLocations()` on IELDAdapter
- Samsara adapter mock implementation for vehicle locations

### Modified
- `sync.module.ts` - Swapped old jobs for new
- `integrations.module.ts` - Added HosSyncJob
- `.env.example` - Added SYNC_*_CRON variables

---

## New Prisma Model: VehicleTelematics

```prisma
model VehicleTelematics {
  id              Int      @id @default(autoincrement())
  vehicleId       Int      @map("vehicle_id")
  tenantId        Int      @map("tenant_id")
  latitude        Float
  longitude       Float
  speed           Float?   // mph
  heading         Float?   // degrees
  fuelLevel       Float?   // percentage
  odometer        Float?   // miles
  engineStatus    String?  @map("engine_status")
  recordedAt      DateTime @map("recorded_at")
  createdAt       DateTime @default(now())
  // Relations and indexes
}
```

---

## ELD Adapter Extension

Added to `IELDAdapter` interface:
```typescript
getVehicleLocations(credentials: Record<string, string>): Promise<ELDVehicleLocationData[]>
```

`ELDVehicleLocationData` interface:
```typescript
interface ELDVehicleLocationData {
  externalVehicleId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  fuelLevel: number;
  odometer: number;
  engineStatus: string;
  recordedAt: Date;
}
```

---

## Current State

- ✅ All 5 planned data-type jobs implemented and tested (20 tests across 6 suites)
- ✅ Additional jobs discovered: `fuel-price-sync.job.ts`, `weather-sync.job.ts`, `sync-log-cleanup.job.ts`
- ✅ VehicleTelematics Prisma model and migration
- ✅ ELD adapter extended with vehicle location support
- ✅ Zero references to deleted EldSyncJob/TmsSyncJob
- ✅ Prisma client generates clean
- ✅ Configurable cron via environment variables
- ✅ Merged to main (PR #10)
