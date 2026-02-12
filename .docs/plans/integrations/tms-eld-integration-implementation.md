# TMS/ELD Integration Implementation Plan

> **Status:** ⚠️ Partial | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-02-03-tms-eld-integration.md`, `IMPLEMENTATION_STATUS.md`, `PHASE2_PLAN.md`

---

## Overview

This document tracks the implementation status of the TMS/ELD hybrid integration, validated against the actual codebase. The original plan defined 8+ tasks. Most have been implemented but the code was refactored into a domain-based structure under `apps/backend/src/domains/integrations/` rather than the originally planned `apps/backend/src/services/sync/` path.

---

## Implementation Location

**Actual code structure** (differs from original plan):

```
apps/backend/src/domains/integrations/
  adapters/
    adapter-factory.service.ts          # Central vendor-to-adapter mapping
    adapters.module.ts                  # NestJS module
    eld/
      eld-adapter.interface.ts          # IELDAdapter interface
      samsara-eld.adapter.ts            # Samsara implementation (live)
      __tests__/
        samsara-eld-monitoring.spec.ts
    tms/
      tms-adapter.interface.ts          # ITMSAdapter interface
      project44-tms.adapter.ts          # project44 implementation (mock)
      mcleod-tms.adapter.ts             # McLeod stub (mock)
    fuel/
      fuel-adapter.interface.ts         # IFuelAdapter interface
      gasbuddy-fuel.adapter.ts          # GasBuddy stub (mock)
      fuelfinder-fuel.adapter.spec.ts   # Test file only, no adapter
    weather/
      weather-adapter.interface.ts      # IWeatherAdapter interface
      openweather.adapter.ts            # OpenWeather implementation (live)
      openweather.adapter.spec.ts
  credentials/
    credentials.service.ts              # AES-256-CBC encryption
  dto/
    create-integration.dto.ts           # Validation DTOs with enums
    update-integration.dto.ts
  services/
    integration-manager.service.ts      # Central HOS/GPS/test orchestrator
    integration-manager.service.spec.ts
  sync/
    sync.service.ts                     # Sync orchestrator (TMS->ELD ordering)
    sync.module.ts
    tms-sync.service.ts                 # TMS data pull + upsert
    eld-sync.service.ts                 # ELD enrichment + match/merge
    matching/
      vehicle-matcher.ts
      driver-matcher.ts
      __tests__/
        vehicle-matcher.spec.ts
        driver-matcher.spec.ts
    merging/
      vehicle-merger.ts
      driver-merger.ts
      __tests__/
        vehicle-merger.spec.ts
        driver-merger.spec.ts
    __tests__/
      tms-sync.service.spec.ts
      eld-sync.service.spec.ts
      sync.service.spec.ts
  integrations.controller.ts            # REST API endpoints
  integrations.service.ts               # Business logic layer
  integrations.module.ts                # NestJS module
  vendor-registry.ts                    # Vendor metadata definitions
  __tests__/
    vendor-registry.spec.ts
    integrations.controller.spec.ts
```

---

## Task-by-Task Status

### Task 1: Database Schema Enhancement

**Original Plan:** Add TMS/ELD fields to Vehicle and Driver models, add IntegrationConfig/SyncLog models.

**Status:** Built

**What was built (validated against `schema.prisma`):**

- **Vehicle model**: `make`, `model`, `year`, `vin`, `licensePlate`, `externalVehicleId`, `externalSource`, `lastSyncedAt`, `eldTelematicsMetadata` (JSONB) -- all present
- **Driver model**: `licenseState`, `externalDriverId`, `externalSource`, `lastSyncedAt`, `syncStatus`, `hosData`, `hosDataSyncedAt`, `hosDataSource`, `hosManualOverride`, `hosOverrideBy`, `hosOverrideAt`, `hosOverrideReason`, `eldMetadata` (JSONB), plus structured HOS fields (`currentHoursDriven`, `currentOnDutyTime`, `currentHoursSinceBreak`, `cycleHoursUsed`, `cycleDaysData`, `lastRestartAt`, `homeTerminalTimezone`) -- all present
- **IntegrationConfig model**: Full health monitoring with `lastSyncAt`, `lastSuccessAt`, `lastErrorAt`, `lastErrorMessage` -- present
- **IntegrationSyncLog model**: Records processed/created/updated tracking -- present
- **Indexes**: `phone`, `licenseNumber+licenseState`, `externalDriverId`, `syncStatus`, `isActive` on Driver; `externalVehicleId+tenantId` unique on Vehicle -- present

**Differences from plan:**
- Plan specified `Vehicle.externalId` as simple `String @unique` -- actual uses `externalVehicleId` with `@@unique([vehicleId, tenantId])` compound unique
- Plan specified `Vehicle.status` as `String` -- actual does not have a status field on Vehicle, uses `isActive` boolean instead
- Plan specified `Driver.firstName`/`lastName` -- actual uses single `name` field (concatenated during sync)
- Driver has additional structured HOS fields not in original plan (for direct engine reads)

---

### Task 2: Vehicle Matcher

**Original Plan:** Create `VehicleMatcher` with VIN primary, license plate fallback.

**Status:** Built

**File:** `apps/backend/src/domains/integrations/sync/matching/vehicle-matcher.ts`

**What was built:**
- `matchByVin(tenantId, vin)` -- matches by VIN
- `matchByLicensePlate(tenantId, licensePlate)` -- matches by license plate
- `match(tenantId, { vin?, licensePlate? })` -- cascading fallback strategy
- Tests exist at `sync/matching/__tests__/vehicle-matcher.spec.ts`

**Matches plan:** Yes, implementation follows planned design.

---

### Task 3: Driver Matcher

**Original Plan:** Create `DriverMatcher` with phone primary, license+state fallback.

**Status:** Built

**File:** `apps/backend/src/domains/integrations/sync/matching/driver-matcher.ts`

**What was built:**
- `matchByPhone(tenantId, phone)` -- matches by phone
- `matchByLicense(tenantId, licenseNumber, licenseState)` -- matches by license combo
- `match(tenantId, { phone?, licenseNumber?, licenseState? })` -- cascading fallback
- Tests exist at `sync/matching/__tests__/driver-matcher.spec.ts`

**Matches plan:** Yes.

---

### Task 4: Vehicle Merger

**Original Plan:** Create `VehicleMerger` with TMS-wins-operational, ELD-wins-telematics rules.

**Status:** Built

**File:** `apps/backend/src/domains/integrations/sync/merging/vehicle-merger.ts`

**What was built:**
- `merge(tmsData, eldData)` -- applies priority rules
- TMS wins: make, model, year, VIN, license plate, status
- ELD fills gaps when TMS data is missing
- Packages ELD data into `eldTelematicsMetadata` JSONB with `lastSyncAt`
- Tests exist at `sync/merging/__tests__/vehicle-merger.spec.ts`

**Matches plan:** Yes.

---

### Task 5: Driver Merger

**Original Plan:** Create `DriverMerger` with TMS-wins, admin-wins-status rules.

**Status:** Built

**File:** `apps/backend/src/domains/integrations/sync/merging/driver-merger.ts`

**What was built:**
- `merge(tmsData, eldData)` -- applies priority rules
- TMS wins: name, phone, license, status
- ELD fills gaps for phone, license
- Packages ELD data into `eldMetadata` JSONB with `lastSyncAt`
- Admin/TMS always wins on activation status
- Tests exist at `sync/merging/__tests__/driver-merger.spec.ts`

**Matches plan:** Yes.

---

### Task 6: TMS Sync Service

**Original Plan:** Create `TmsSyncService` to fetch and upsert vehicles/drivers from TMS API.

**Status:** Built (enhanced beyond plan)

**File:** `apps/backend/src/domains/integrations/sync/tms-sync.service.ts`

**What was built:**
- `syncVehicles(integrationId)` -- fetches via adapter, upserts by `externalVehicleId + tenantId`
- `syncDrivers(integrationId)` -- fetches via adapter, upserts by `driverId + tenantId`
- `syncLoads(integrationId)` -- **not in original plan** -- fetches loads, creates stops, creates load-stop associations
- Uses `AdapterFactoryService` for vendor abstraction (plan hardcoded PROJECT44_TMS)
- Uses `CredentialsService` for decryption
- Dynamic credential field extraction from vendor registry
- Tests exist at `sync/__tests__/tms-sync.service.spec.ts`

**Differences from plan:**
- Plan used `HttpService` directly; actual uses adapter factory pattern
- Plan hardcoded `PROJECT44_TMS` vendor check; actual is vendor-agnostic
- Actual adds `syncLoads()` which was not in original plan
- Actual handles stop creation (find-or-create pattern) for loads

---

### Task 7: ELD Sync Service

**Original Plan:** Create `EldSyncService` for enrichment-only sync using matchers and mergers.

**Status:** Built

**File:** `apps/backend/src/domains/integrations/sync/eld-sync.service.ts`

**What was built:**
- `syncVehicles(integrationId)` -- enrichment only, matches then merges ELD telematics metadata
- `syncDrivers(integrationId)` -- enrichment only, matches then merges ELD metadata
- Uses `AdapterFactoryService` for vendor abstraction
- Logs matched vs unmatched counts
- Never creates new records (enrichment only)
- Tests exist at `sync/__tests__/eld-sync.service.spec.ts`

**Differences from plan:**
- Plan used `HttpService` directly and hardcoded Samsara API; actual uses adapter factory
- Actual only writes `eldTelematicsMetadata` (vehicle) and `eldMetadata` (driver), not full merge result

---

### Task 8: Sync Orchestrator

**Original Plan:** Create `SyncService` to coordinate TMS-first, ELD-second sync order.

**Status:** Built

**File:** `apps/backend/src/domains/integrations/sync/sync.service.ts`

**What was built:**
- `syncIntegration(integrationId)` -- routes to TMS or ELD sync, creates sync log entries
- `syncFleet(tenantId)` -- syncs all enabled integrations (TMS first, then ELD)
- Creates `IntegrationSyncLog` entries with timing and record counts
- Error handling with sync log failure recording
- Tests exist at `sync/__tests__/sync.service.spec.ts`

**Matches plan:** Yes, plus additional sync logging.

---

### Additional Built Components (Beyond Original Plan)

#### Adapter Factory

**File:** `apps/backend/src/domains/integrations/adapters/adapter-factory.service.ts`

Not in original plan. Provides clean vendor-to-adapter mapping. Single source of truth for which adapter handles which vendor.

#### Integration Manager Service

**File:** `apps/backend/src/domains/integrations/services/integration-manager.service.ts`

Partially in strategy doc, fully built:
- HOS fetch with 4-tier fallback (override -> cache -> live -> stale)
- Vehicle GPS location fetch
- Connection testing for all 9 vendors
- HOS sync with retry (exponential backoff via RetryService)
- Failure tracking and alert generation (3+ failures in 60 min)
- Bulk driver sync with `Promise.allSettled`

#### Credentials Service

**File:** `apps/backend/src/domains/integrations/credentials/credentials.service.ts`

Built as designed: AES-256-CBC, IV:ciphertext hex format, env-based key.

#### Vendor Registry

**File:** `apps/backend/src/domains/integrations/vendor-registry.ts`

Built: 8 vendors with credential field definitions, display names, help URLs.

#### Integration Controller + Service

**File:** `apps/backend/src/domains/integrations/integrations.controller.ts`

Full CRUD + test + sync + sync-history + sync-stats endpoints built.

---

## Testing Coverage

| Component | Unit Tests | Integration Tests | Notes |
|-----------|-----------|-------------------|-------|
| VehicleMatcher | Yes | No | `vehicle-matcher.spec.ts` |
| DriverMatcher | Yes | No | `driver-matcher.spec.ts` |
| VehicleMerger | Yes | No | `vehicle-merger.spec.ts` |
| DriverMerger | Yes | No | `driver-merger.spec.ts` |
| TmsSyncService | Yes | No | `tms-sync.service.spec.ts` |
| EldSyncService | Yes | No | `eld-sync.service.spec.ts` |
| SyncService | Yes | No | `sync.service.spec.ts` |
| IntegrationManager | Yes | No | `integration-manager.service.spec.ts` |
| IntegrationsController | Yes | No | `integrations.controller.spec.ts` |
| VendorRegistry | Yes | No | `vendor-registry.spec.ts` |
| SamsaraELDAdapter | Partial | No | `samsara-eld-monitoring.spec.ts` (monitoring only) |
| OpenWeatherAdapter | Yes | No | `openweather.adapter.spec.ts` |
| FuelFinderAdapter | Spec file only | No | `fuelfinder-fuel.adapter.spec.ts` exists but no adapter implementation |

**E2E tests:** None. No tests against real external APIs.

---

## What Remains To Build

### Phase 2: Real API Integration

These tasks require switching `useMockData` flags and implementing real API calls:

| Task | Status | Effort | Notes |
|------|--------|--------|-------|
| Project44 TMS real API calls | Designed, not yet built | Medium | OAuth 2.0 token flow is coded but behind mock flag |
| McLeod TMS real API calls | Designed, not yet built | High | All methods are TODOs, need McLeod API docs |
| TMW TMS dedicated adapter | Designed, not yet built | High | Currently reuses McLeod adapter which may not be accurate |
| KeepTruckin dedicated adapter | Designed, not yet built | Medium | Currently reuses Samsara adapter - API differences not handled |
| Motive dedicated adapter | Designed, not yet built | Medium | Currently reuses Samsara adapter |
| GasBuddy real API calls | Designed, not yet built | Medium | All methods are TODOs |
| FuelFinder adapter | Designed, not yet built | Medium | Enum exists, no adapter file |

### Phase 3: Infrastructure Enhancements

| Task | Status | Notes |
|------|--------|-------|
| Webhook receivers (inbound) | Designed, not yet built | For real-time push from external systems |
| Circuit breaker pattern | Designed, not yet built | Only retry exists currently |
| External API rate limiting | Designed, not yet built | No rate limit tracking |
| Batch sync optimization | Designed, not yet built | Currently loops with individual upserts |
| Sync history UI (frontend) | Designed, not yet built | Backend endpoints exist |
| Real-time sync progress | Designed, not yet built | No WebSocket/SSE for progress |
| OAuth flow UI (frontend) | Designed, not yet built | Currently API key only in frontend |
| Field mapping UI | Designed, not yet built | For custom vendor field mappings |

---

## Code Patterns Used

### Upsert Pattern (TMS Sync)

```typescript
await this.prisma.vehicle.upsert({
  where: {
    externalVehicleId_tenantId: {
      externalVehicleId: tmsVehicle.vehicle_id,
      tenantId,
    },
  },
  update: { make, model, year, vin, licensePlate, externalSource: vendor, lastSyncedAt: new Date() },
  create: { externalVehicleId, vehicleId, unitNumber, tenantId, make, model, year, vin, licensePlate, externalSource: vendor, lastSyncedAt: new Date() },
});
```

### Match-and-Merge Pattern (ELD Sync)

```typescript
const dbVehicle = await this.vehicleMatcher.match(tenantId, { vin, licensePlate });
if (dbVehicle) {
  const mergedData = this.vehicleMerger.merge(dbVehicle, { eldVendor, eldId, serial, gateway, esn });
  await this.prisma.vehicle.update({
    where: { id: dbVehicle.id },
    data: { eldTelematicsMetadata: mergedData.eldTelematicsMetadata },
  });
}
```

### Credential Extraction Pattern

```typescript
private getVendorCredentials(credentials: any, vendor: string): { primary: string; secondary: string } {
  const vendorMeta = VENDOR_REGISTRY[vendor];
  const primaryField = vendorMeta.credentialFields[0]?.name;
  const secondaryField = vendorMeta.credentialFields[1]?.name;
  return {
    primary: this.credentials.decrypt(credentials[primaryField]),
    secondary: secondaryField ? this.credentials.decrypt(credentials[secondaryField]) : '',
  };
}
```

### HOS Fallback Pattern

```typescript
// 1. Manual override -> return override
// 2. Fresh cache (<5min) -> return cached
// 3. Fetch from ELD with retry -> update cache
// 4. Stale cache on error -> return with warning
```

---

## Known Issues and Gaps

1. **FUELFINDER_FUEL enum orphan**: Exists in Prisma enum and DTO, not in vendor registry, no adapter file. Integration manager throws explicit error if someone tries to test connection.

2. **Vendor adapter reuse assumptions**: TMW reuses McLeod adapter, KeepTruckin/Motive reuse Samsara adapter. These vendors have different APIs in production -- the reuse is a development shortcut that will need dedicated adapters.

3. **Driver name handling**: Plan specified `firstName`/`lastName` fields. Actual schema uses single `name` field. TMS sync concatenates: `name = "${first_name} ${last_name}"`. No way to parse back to individual fields.

4. **Vehicle status**: Plan specified `status: String` on Vehicle. Actual uses `isActive: Boolean`. Status mapping from TMS adapters (`ACTIVE`, `INACTIVE`, `IN_SERVICE`, `OUT_OF_SERVICE`) is not persisted to the Vehicle model.

5. **Load tenant scoping**: TMS sync creates loads with `tenantId` from integration config. The `externalLoadId` unique constraint is not tenant-scoped (no compound unique), which could cause conflicts if multiple tenants have the same external load IDs.

6. **No scheduled background sync for TMS**: The integration manager has scheduled HOS sync (5 min), but TMS data (vehicles, drivers, loads) sync only happens via manual trigger. No cron job for TMS refresh.
