# TMS/ELD Integration Architecture Design

> **Status:** ✅ Implemented | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-02-03-tms-eld-integration.md`, `STRATEGY.md`, `IMPLEMENTATION_STATUS.md`

---

## Overview

SALLY uses a **hybrid TMS/ELD integration architecture** where TMS systems (Project44, McLeod, TMW) serve as the source of truth for operational data (drivers, vehicles, loads) and ELD systems (Samsara, KeepTruckin, Motive) enrich records with telematics and HOS data.

The architecture follows a **Hub-and-Spoke with Sync & Cache** pattern: background sync jobs pull data from external systems at configurable intervals, store results in a local cache (PostgreSQL), and all SALLY services read from the cache rather than making blocking external API calls.

---

## Architecture Pattern

### Data Flow

```
External System (TMS / ELD / Fuel / Weather)
    |
    v
[Adapter Layer] - Vendor-specific API calls + response normalization
    |
    v
[Sync Services] - TmsSyncService / EldSyncService orchestrate upsert/merge
    |
    v
[Database Cache] - PostgreSQL (IntegrationConfig, Driver, Vehicle, Load tables)
    |
    v
[SALLY Services] - Route planning, monitoring, alerts read from cached data
```

### Key Principles

1. **TMS First, ELD Second**: TMS creates records (drivers, vehicles, loads). ELD enriches existing records. ELD never creates new entities.
2. **Pull-Based Enrichment**: Background sync pulls on schedule (TMS: configurable, ELD: 5 min). Manual sync available via UI.
3. **Cache with Fallback**: Fresh cache (<5 min) served immediately. Stale cache returned with warning when external API fails.
4. **Manual Override**: Dispatchers can override ELD HOS data. Overridden records skip auto-sync until override is cleared.
5. **Vendor Abstraction**: All vendor-specific logic lives in adapter classes. Adding a new vendor requires only an adapter + registry entry.

---

## Data Model (Actual Prisma Schema)

### IntegrationType Enum

```prisma
enum IntegrationType {
  TMS          // Transportation Management System (loads, drivers, vehicles)
  HOS_ELD      // Hours of Service / Electronic Logging Device
  FUEL_PRICE   // Fuel price data
  WEATHER      // Weather data
  TELEMATICS   // Vehicle telematics
}
```

**Status:** All 5 types are defined in the schema. `TMS` and `HOS_ELD` have full sync pipelines. `FUEL_PRICE`, `WEATHER`, and `TELEMATICS` have adapter stubs but no sync pipelines.

### IntegrationVendor Enum

```prisma
enum IntegrationVendor {
  MCLEOD_TMS         // McLeod Software TMS
  TMW_TMS            // TMW Systems TMS (Trimble)
  PROJECT44_TMS      // project44 TMS (visibility platform)
  SAMSARA_ELD        // Samsara ELD
  KEEPTRUCKIN_ELD    // KeepTruckin ELD
  MOTIVE_ELD         // Motive ELD (formerly KeepTruckin)
  GASBUDDY_FUEL      // GasBuddy fuel prices
  FUELFINDER_FUEL    // FuelFinder fuel prices
  OPENWEATHER        // OpenWeatherMap weather
}
```

**Vendor Implementation Status:**

| Vendor | Enum Value | Adapter Exists | Real API Calls | Mock Mode | Notes |
|--------|-----------|---------------|---------------|-----------|-------|
| project44 | `PROJECT44_TMS` | Yes | Yes (behind flag) | `useMockData = true` | OAuth 2.0 auth, full ITMSAdapter implementation |
| McLeod | `MCLEOD_TMS` | Yes | No (TODOs) | `useMockData = true` | Stub implementation, returns mock data |
| TMW | `TMW_TMS` | No dedicated adapter | N/A | N/A | Reuses McLeod adapter via AdapterFactory mapping |
| Samsara | `SAMSARA_ELD` | Yes | Yes | `useMockData = false` | Real API calls to `api.samsara.com`, includes HOS clocks |
| KeepTruckin | `KEEPTRUCKIN_ELD` | No dedicated adapter | N/A | N/A | Reuses Samsara adapter via AdapterFactory mapping |
| Motive | `MOTIVE_ELD` | No dedicated adapter | N/A | N/A | Reuses Samsara adapter via AdapterFactory mapping |
| GasBuddy | `GASBUDDY_FUEL` | Yes | No (TODOs) | `useMockData = true` | Stub implementation, returns mock data |
| FuelFinder | `FUELFINDER_FUEL` | No adapter file | N/A | N/A | Enum exists, no adapter. Integration manager explicitly throws "not supported" |
| OpenWeather | `OPENWEATHER` | Yes | Yes | `useMockData = false` | Real API calls to `api.openweathermap.org` |

### IntegrationStatus Enum

```prisma
enum IntegrationStatus {
  NOT_CONFIGURED   // Initial state
  CONFIGURED       // Credentials saved but not tested
  ACTIVE           // Connection tested successfully
  ERROR            // Connection test or sync failed
  DISABLED         // Manually disabled by user
}
```

### IntegrationConfig Model

```prisma
model IntegrationConfig {
  id                    Int                  @id @default(autoincrement())
  integrationId         String               @unique @map("integration_id")
  tenant                Tenant               @relation(fields: [tenantId], references: [id])
  tenantId              Int                  @map("tenant_id")
  integrationType       IntegrationType      @map("integration_type")
  vendor                IntegrationVendor
  displayName           String               @map("display_name")
  isEnabled             Boolean              @default(false) @map("is_enabled")
  status                IntegrationStatus    @default(NOT_CONFIGURED)
  credentials           Json?                // AES-256-CBC encrypted (IV:ciphertext hex format)
  syncIntervalSeconds   Int?                 @map("sync_interval_seconds")
  lastSyncAt            DateTime?            @map("last_sync_at")
  lastSuccessAt         DateTime?            @map("last_success_at")
  lastErrorAt           DateTime?            @map("last_error_at")
  lastErrorMessage      String?              @map("last_error_message")
  createdAt             DateTime             @default(now()) @map("created_at")
  updatedAt             DateTime             @updatedAt @map("updated_at")
  syncLogs              IntegrationSyncLog[]

  @@unique([tenantId, integrationType, vendor])
  @@map("integration_configs")
}
```

### IntegrationSyncLog Model

```prisma
model IntegrationSyncLog {
  id                    Int                  @id @default(autoincrement())
  logId                 String               @unique @map("log_id")
  integration           IntegrationConfig    @relation(fields: [integrationId], references: [id])
  integrationId         Int                  @map("integration_id")
  syncType              String               @map("sync_type")      // 'TMS', 'ELD', 'HOS_SYNC', etc.
  startedAt             DateTime             @map("started_at")
  completedAt           DateTime?            @map("completed_at")
  status                String                                       // 'running', 'success', 'failed', 'partial'
  recordsProcessed      Int                  @default(0) @map("records_processed")
  recordsCreated        Int                  @default(0) @map("records_created")
  recordsUpdated        Int                  @default(0) @map("records_updated")
  errorDetails          Json?                @map("error_details")
  createdAt             DateTime             @default(now()) @map("created_at")

  @@index([integrationId, startedAt])
  @@map("integration_sync_logs")
}
```

### Driver Model (Integration Fields)

The Driver model includes these integration-related fields:

| Field | Type | Purpose | Status |
|-------|------|---------|--------|
| `externalDriverId` | `String?` | TMS/ELD driver ID in external system | Built |
| `externalSource` | `String?` | Source vendor (e.g., `PROJECT44_TMS`) | Built |
| `lastSyncedAt` | `DateTime?` | Timestamp of last sync from external | Built |
| `syncStatus` | `SyncStatus?` | Sync state tracking | Built |
| `hosData` | `Json?` | Cached HOS data from ELD | Built |
| `hosDataSyncedAt` | `DateTime?` | When HOS cache was last updated | Built |
| `hosDataSource` | `String?` | Which ELD vendor provided HOS data | Built |
| `hosManualOverride` | `Json?` | Manually overridden HOS values | Built |
| `hosOverrideBy` | `Int?` | User who set the override | Built |
| `hosOverrideAt` | `DateTime?` | When override was set | Built |
| `hosOverrideReason` | `String?` | Reason for override | Built |
| `eldMetadata` | `Json?` | ELD-specific metadata (vendor, settings, timezone) | Built |
| `licenseState` | `String?` | For matching across systems | Built |

### Vehicle Model (Integration Fields)

| Field | Type | Purpose | Status |
|-------|------|---------|--------|
| `externalVehicleId` | `String?` | TMS/ELD vehicle ID in external system | Built |
| `externalSource` | `String?` | Source vendor | Built |
| `lastSyncedAt` | `DateTime?` | Last sync timestamp | Built |
| `make` | `String?` | Vehicle make (TMS source of truth) | Built |
| `model` | `String?` | Vehicle model (TMS source of truth) | Built |
| `year` | `Int?` | Vehicle year | Built |
| `vin` | `String?` | VIN (primary matching key between TMS/ELD) | Built |
| `licensePlate` | `String?` | License plate (fallback matching key) | Built |
| `eldTelematicsMetadata` | `Json?` | ELD telematics data (serial, gateway, ESN) | Built |

---

## Vendor Abstraction Layer

### Adapter Pattern

All vendor-specific logic is encapsulated in adapter classes that implement standardized interfaces.

**File:** `apps/backend/src/domains/integrations/adapters/adapter-factory.service.ts`

The `AdapterFactoryService` is the single registry mapping vendor IDs to adapter instances:

```
AdapterFactoryService
  getTMSAdapter(vendor) -> ITMSAdapter | null
  getELDAdapter(vendor) -> IELDAdapter | null
```

**TMS Adapter Mapping (actual code):**
- `PROJECT44_TMS` -> `Project44TMSAdapter`
- `MCLEOD_TMS` -> `McLeodTMSAdapter`
- `TMW_TMS` -> `McLeodTMSAdapter` (reused - "TMW uses similar API to McLeod")

**ELD Adapter Mapping (actual code):**
- `SAMSARA_ELD` -> `SamsaraELDAdapter`
- `KEEPTRUCKIN_ELD` -> `SamsaraELDAdapter` (reused - "KeepTruckin API is similar to Samsara")
- `MOTIVE_ELD` -> `SamsaraELDAdapter` (reused - "Motive formerly KeepTruckin")

**Note:** `GASBUDDY_FUEL`, `FUELFINDER_FUEL`, and `OPENWEATHER` are NOT in the AdapterFactory. They are handled directly by the `IntegrationManagerService` for test-connection only. They have no sync pipeline.

### Adapter Interfaces

**ITMSAdapter** (`adapters/tms/tms-adapter.interface.ts`):
- `getVehicles(apiKey, apiSecret) -> VehicleData[]`
- `getDrivers(apiKey, apiSecret) -> DriverData[]`
- `getLoad(apiKey, apiSecret, loadId) -> LoadData`
- `getActiveLoads(apiKey, apiSecret) -> LoadData[]`
- `testConnection(apiKey, apiSecret?) -> boolean`
- `syncAllLoads?(apiKey, apiSecret?) -> string[]`

**IELDAdapter** (`adapters/eld/eld-adapter.interface.ts`):
- `getVehicles(apiToken) -> ELDVehicleData[]`
- `getDrivers(apiToken) -> ELDDriverData[]`
- `getVehicleLocations(apiToken) -> ELDVehicleLocationData[]`
- `testConnection(apiToken) -> boolean`

**IFuelAdapter** (`adapters/fuel/fuel-adapter.interface.ts`):
- `findStations(apiKey, query) -> FuelStation[]`
- `getStationPrice(apiKey, stationId) -> FuelStation`
- `testConnection(apiKey) -> boolean`

**IWeatherAdapter** (`adapters/weather/weather-adapter.interface.ts`):
- `getCurrentWeather(apiKey, lat, lon) -> WeatherData`
- `getRouteForecast(apiKey, waypoints) -> WeatherData[]`
- `testConnection(apiKey) -> boolean`

### Vendor Registry

**File:** `apps/backend/src/domains/integrations/vendor-registry.ts`

The `VENDOR_REGISTRY` is a static record mapping vendor IDs to metadata including display names, descriptions, credential field definitions (name, label, type, required, helpText), and help URLs. This drives the frontend dynamically -- no UI changes needed when adding a new vendor.

**8 vendors defined** (FUELFINDER_FUEL is NOT in the vendor registry despite being in the Prisma enum):
- `PROJECT44_TMS` - OAuth 2.0 (clientId + clientSecret)
- `SAMSARA_ELD` - API Token
- `MCLEOD_TMS` - API Key + Base URL
- `TMW_TMS` - API Key + Base URL
- `KEEPTRUCKIN_ELD` - API Token
- `MOTIVE_ELD` - API Token
- `GASBUDDY_FUEL` - API Key
- `OPENWEATHER` - API Key

---

## Sync Mechanism

### Sync Architecture

```
SyncService (orchestrator)
  |-- syncIntegration(id) -- routes to appropriate sub-service
  |   |-- TMS type -> TmsSyncService
  |   |-- ELD type -> EldSyncService
  |
  |-- syncFleet(tenantId) -- syncs all integrations for tenant
      |-- TMS integrations first (source of truth)
      |-- ELD integrations second (enrichment)
```

### TmsSyncService

**File:** `apps/backend/src/domains/integrations/sync/tms-sync.service.ts`

- `syncVehicles(integrationId)` - Fetches vehicles via adapter, upserts by `externalVehicleId + tenantId`
- `syncDrivers(integrationId)` - Fetches drivers via adapter, upserts by `driverId + tenantId`
- `syncLoads(integrationId)` - Fetches loads via adapter, upserts by `externalLoadId`, creates Stop records, creates LoadStop join records

Uses dynamic credential extraction based on vendor registry field definitions.

### EldSyncService

**File:** `apps/backend/src/domains/integrations/sync/eld-sync.service.ts`

- `syncVehicles(integrationId)` - Fetches ELD vehicles, matches by VIN/license plate, merges ELD telematics metadata
- `syncDrivers(integrationId)` - Fetches ELD drivers, matches by phone/license, merges ELD metadata

**Important:** ELD sync is enrichment-only. It never creates new records. Unmatched ELD entities are logged as warnings.

### Matching Services

**VehicleMatcher** (`sync/matching/vehicle-matcher.ts`):
- Primary: Match by VIN
- Fallback: Match by license plate

**DriverMatcher** (`sync/matching/driver-matcher.ts`):
- Primary: Match by phone number
- Fallback: Match by license number + license state

### Merging Services

**VehicleMerger** (`sync/merging/vehicle-merger.ts`):
- TMS wins: operational data (make, model, year, VIN, license plate, status)
- ELD wins: telematics data (serial, gateway, ESN)
- ELD fills gaps when TMS data is missing
- Packages ELD data into `eldTelematicsMetadata` JSONB

**DriverMerger** (`sync/merging/driver-merger.ts`):
- TMS wins: operational data (name, phone, license, status)
- ELD wins: HOS data (eldSettings, timezone)
- Admin wins: activation status (overrides both)
- Packages ELD data into `eldMetadata` JSONB

---

## API Endpoints

### Integration Management

| Method | Endpoint | Status | Purpose |
|--------|----------|--------|---------|
| `GET` | `/integrations` | Built | List all integrations for tenant |
| `GET` | `/integrations/vendors` | Built | Get vendor registry metadata (drives frontend dynamically) |
| `GET` | `/integrations/:id` | Built | Get integration details |
| `POST` | `/integrations` | Built | Create new integration (validates vendor + credentials) |
| `PATCH` | `/integrations/:id` | Built | Update integration (re-encrypt credentials) |
| `DELETE` | `/integrations/:id` | Built | Delete integration |
| `POST` | `/integrations/:id/test` | Built | Test connection (delegates to adapter) |
| `POST` | `/integrations/:id/sync` | Built | Trigger manual sync |
| `GET` | `/integrations/:id/sync-history` | Built | Get sync log entries (paginated) |
| `GET` | `/integrations/:id/sync-history/stats` | Built | Get sync statistics (total, success, failure counts) |

All endpoints require JWT authentication via `JwtAuthGuard`.

---

## Credential Security

**File:** `apps/backend/src/domains/integrations/credentials/credentials.service.ts`

- AES-256-CBC encryption for all credential fields
- Format: `IV:ciphertext` (hex-encoded)
- Key source: `CREDENTIALS_ENCRYPTION_KEY` env variable (64-char hex)
- Development fallback: hardcoded default key (with console warning)
- All credential fields encrypted individually before storage
- Decryption happens at adapter call time, not at read time

---

## Integration Manager Service

**File:** `apps/backend/src/domains/integrations/services/integration-manager.service.ts`

Central orchestration service with these capabilities:

1. **HOS Data Fetch** (`getDriverHOS`) - 4-tier fallback: manual override -> fresh cache -> live ELD fetch (with retry) -> stale cache
2. **Vehicle Location** (`getVehicleLocation`) - Fetches GPS via Samsara adapter
3. **Connection Testing** (`testConnection`) - Routes to appropriate adapter based on vendor
4. **HOS Sync** (`syncDriverHOS`) - Syncs individual driver, records failures, sends alerts on 3+ failures in 60 min
5. **Bulk Driver Sync** (`syncAllDriversForTenant`) - Parallel sync of all active, non-overridden drivers

Uses `RetryService` for exponential backoff (3 attempts, 1s-10s delay) and `AlertService` for failure notifications.

---

## Current State Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Prisma schema (enums, models) | Built | All 5 IntegrationTypes, 9 IntegrationVendors |
| IntegrationConfig + SyncLog models | Built | Full health monitoring fields |
| Driver integration fields | Built | External sync, HOS cache, manual override, ELD metadata |
| Vehicle integration fields | Built | External sync, TMS fields, ELD telematics metadata |
| Vendor registry | Built | 8 vendors with dynamic credential fields |
| Adapter factory | Built | Maps vendor IDs to adapter instances |
| ITMSAdapter interface | Built | Vehicles, drivers, loads, test, sync |
| IELDAdapter interface | Built | Vehicles, drivers, locations, test |
| IFuelAdapter interface | Built | Find stations, get price, test |
| IWeatherAdapter interface | Built | Current weather, route forecast, test |
| Project44 TMS adapter | Built (mock mode) | Full implementation, real API behind flag |
| McLeod TMS adapter | Built (mock mode) | Stub with TODO for real API |
| Samsara ELD adapter | Built (live) | Real API calls, `useMockData = false` |
| GasBuddy fuel adapter | Built (mock mode) | Stub with TODO for real API |
| OpenWeather adapter | Built (live) | Real API calls, `useMockData = false` |
| TmsSyncService | Built | Vehicles, drivers, loads upsert with adapter factory |
| EldSyncService | Built | Enrichment-only with matching + merging |
| VehicleMatcher / DriverMatcher | Built | VIN/plate and phone/license matching |
| VehicleMerger / DriverMerger | Built | TMS-wins priority merge rules |
| SyncService (orchestrator) | Built | Routes to TMS/ELD sync, creates sync logs |
| IntegrationManagerService | Built | HOS fetch, GPS, test connection, retry + alerts |
| CredentialsService | Built | AES-256-CBC encrypt/decrypt |
| Integration controller | Built | Full CRUD + test + sync + history endpoints |
| Background scheduler | Built | 5-min HOS sync for active drivers |
| FuelFinder adapter | Not built | Enum exists, no adapter file, throws "not supported" |
| KeepTruckin dedicated adapter | Not built | Reuses Samsara adapter |
| Motive dedicated adapter | Not built | Reuses Samsara adapter |
| TMW dedicated adapter | Not built | Reuses McLeod adapter |
| Webhook receivers | Not built | Designed only |
| Circuit breaker | Not built | Only retry logic exists |
| Rate limiting (external APIs) | Not built | Designed only |
