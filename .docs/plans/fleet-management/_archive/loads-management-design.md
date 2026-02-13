# Loads Management & TMS Integration - Design Specification

**Status:** Implemented (Core) | Partial (TMS Sync) | Designed (Advanced Intake)
**Domain:** Fleet Management > Loads
**Last Validated Against Code:** 2026-02-12
**Source Plans:** `_archive/2026-02-06-loads-management-tms-integration.md`, `_archive/2026-02-06-loads-tms-integration-nodejs.md`

---

## Current State

| Capability | Status |
|---|---|
| Load CRUD (create, read, list, update status) | Implemented |
| Load model with all schema fields | Implemented |
| LoadStop model with stop relationships | Implemented |
| Inline stop creation on load create | Implemented |
| TMS sync service (drivers, vehicles, loads) | Implemented |
| TMS adapter interface + McLeod/Project44 adapters | Implemented |
| Cron-based load sync job (every 15 min) | Implemented |
| Cron-based driver/vehicle sync jobs | Implemented |
| Status mapping TMS -> SALLY | Implemented |
| Multi-tenant scoping on all queries | Implemented |
| Load duplicate | Implemented |
| Driver/vehicle assignment on loads | Implemented |
| Tracking token generation | Implemented |
| Load templates (LoadTemplate table) | Not Built |
| Import mapping (ImportMapping table) | Not Built |
| CSV/Excel import | Not Built |
| Email-to-load intake | Not Built |
| DAT load board integration | Not Built |

---

## 1. Purpose

Loads are the core operational entity in SALLY. Each load represents a freight shipment with one or more stops (pickups and deliveries), assigned to a customer, and optionally linked to a driver and vehicle. Loads flow through a defined lifecycle from creation to completion, and can be ingested from multiple sources including manual entry, TMS sync, and customer portal requests.

---

## 2. Data Model (Validated Against Prisma Schema)

### Load Model

```prisma
model Load {
  id                Int             @id @default(autoincrement())
  loadId            String          @unique
  loadNumber        String
  status            String          @default("pending")
  weightLbs         Int             @default(0)
  commodityType     String          @default("general")
  specialRequirements String?
  customerName      String          @default("")
  isActive          Boolean         @default(true)
  equipmentType     String?
  intakeSource      String          @default("manual")
  intakeMetadata    Json?
  trackingToken     String?         @unique
  customerId        Int?            // FK to Customer
  driverId          Int?            // FK to Driver
  vehicleId         Int?            // FK to Vehicle
  externalLoadId    String?         @unique
  externalSource    IntegrationVendor?  // NOTE: Enum, not String
  lastSyncedAt      DateTime?
  tenantId          Int             // FK to Tenant
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  // Indexes: tenantId, status, customerId, trackingToken
}
```

**Key validation notes:**
- `externalSource` is `IntegrationVendor?` enum (not a plain String as originally planned). Values include `mcleod_tms`, `project44_tms`, `samsara_eld`, etc.
- `driverId` and `vehicleId` are direct FK references to Driver/Vehicle tables (implemented, not placeholders).
- `intakeMetadata` is a JSON field storing context about how the load was ingested.
- `customerId` is an optional FK to the Customer entity.

### LoadStop Model

```prisma
model LoadStop {
  id                Int       @id @default(autoincrement())
  loadId            Int       // FK to Load
  stopId            Int       // FK to Stop
  sequenceOrder     Int
  actionType        String    // "pickup" | "delivery" | "both"
  earliestArrival   DateTime?
  latestArrival     DateTime?
  estimatedDockHours Float    @default(1.0)
  actualDockHours   Float?
}
```

### RoutePlanLoad Junction Table

```prisma
model RoutePlanLoad {
  id     Int @id @default(autoincrement())
  planId Int // FK to RoutePlan
  loadId Int // FK to Load
}
```

This junction table connects loads to route plans, enabling the route planning engine to reference loads when generating optimized routes.

---

## 3. Load Lifecycle

```
draft --> pending --> planned --> active --> in_transit --> completed
  |         |          |          |            |
  +----+----+----+-----+----+----+----+-------+
       |              |              |
       v              v              v
    cancelled      cancelled      cancelled
```

**Status definitions:**
- `draft` - Initial state for loads from customer portal requests or incomplete entries
- `pending` - Confirmed load, ready to be planned (route not yet generated)
- `planned` - Route plan created and assigned
- `active` - In transit, driver dispatched (auto-generates tracking token if absent)
- `in_transit` - Active alias used interchangeably in some views
- `completed` - Delivery confirmed
- `cancelled` - Load cancelled at any pre-completion stage

**Auto-tracking token:** When a load status changes to `active` and no tracking token exists, one is auto-generated in the format `{loadNumber}-{random6hex}`.

---

## 4. Intake Sources

Loads enter the system through multiple channels, tracked via the `intakeSource` field:

| Source | Value | Status |
|---|---|---|
| Manual entry (dispatcher) | `manual` | Implemented |
| Customer portal request | `portal` | Implemented |
| TMS sync | `tms_sync` | Implemented |
| Load duplication | `manual` (copy) | Implemented |
| CSV/Excel import | `import` | Not Built |
| Email-to-load | `email` | Not Built |
| DAT load board | `dat` | Not Built |
| Template | `template` | Not Built |

---

## 5. TMS Integration Architecture

### Adapter Pattern

The TMS integration uses an adapter factory pattern that decouples SALLY from specific TMS vendors.

```
IntegrationConfig (per tenant)
    |
    v
AdapterFactoryService.getTMSAdapter(vendor)
    |
    v
ITMSAdapter interface
    |-- McLeodTmsAdapter
    |-- Project44TmsAdapter
    |-- (future adapters)
```

**ITMSAdapter interface methods (validated):**
- `getVehicles(apiKey, apiSecret)` -> `VehicleData[]`
- `getDrivers(apiKey, apiSecret)` -> `DriverData[]`
- `getLoad(apiKey, apiSecret, loadId)` -> `LoadData`
- `getActiveLoads(apiKey, apiSecret)` -> `LoadData[]`
- `testConnection(apiKey, apiSecret?)` -> `boolean`
- `syncAllLoads?(apiKey, apiSecret?)` -> `string[]`

### Standardized Data Format

All TMS adapters transform vendor-specific formats into standard SALLY interfaces:

```typescript
interface LoadData {
  load_id: string;
  load_number: string;
  customer_name: string;
  weight_lbs: number;
  commodity_type: string;
  pickup_location: { address, city, state, zip, latitude, longitude };
  delivery_location: { address, city, state, zip, latitude, longitude };
  stops?: Array<{ sequence, address, city, state, zip, latitude, longitude, type }>;
  status: 'UNASSIGNED' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
}
```

### TMS Status Mapping

| TMS Status | SALLY Status |
|---|---|
| UNASSIGNED | pending |
| ASSIGNED | pending |
| IN_TRANSIT | in_transit |
| DELIVERED | completed |
| CANCELLED | cancelled |

### Sync Process (Validated: `tms-sync.service.ts`)

1. Load `IntegrationConfig` for integration ID
2. Get adapter from `AdapterFactoryService` based on vendor
3. Decrypt credentials via `CredentialsService`
4. Fetch data from TMS via adapter
5. Upsert loads using `externalLoadId` as unique key
6. For each load, find or create Stop entities from address data
7. Delete and recreate LoadStop records for the load
8. Update `lastSyncAt` on IntegrationConfig

### Cron Schedule (Validated: `loads-sync.job.ts`)

- Runs on `SYNC_LOADS_CRON` env var or default every 15 minutes (`0 */15 * * * *`)
- Iterates all active TMS integrations (`integrationType: 'TMS', isEnabled: true, status: 'ACTIVE'`)
- Calls `tmsSyncService.syncLoads(integration.id)` per integration
- Errors are logged per-integration but do not halt batch

---

## 6. Route Planning Integration

Loads connect to route plans via the `RoutePlanLoad` junction table. When a load status is `pending`, the dispatcher can initiate route planning, which:

1. Takes the load's stops as input waypoints
2. Runs TSP optimization for stop sequencing
3. Performs HOS simulation with rest stop insertion
4. Creates a RoutePlan linked to the Load via RoutePlanLoad
5. Updates load status to `planned`

The frontend "Plan Route" action on pending loads navigates to `/dispatcher/create-plan?load_id={loadId}`.

---

## 7. Design Decisions

1. **Upsert on sync:** TMS loads use `externalLoadId` as the unique merge key, preventing duplicates while allowing updates.
2. **Delete-and-recreate stops on sync:** Each sync cycle deletes existing LoadStop records and recreates them from TMS data, ensuring stop sequences stay accurate.
3. **IntegrationVendor enum:** External source tracking uses a Prisma enum rather than free-text strings, providing type safety and migration control.
4. **Inline stop creation:** When creating loads manually, stops that don't exist yet are created inline (by name/address), avoiding a separate stop management workflow.
5. **Tracking token format:** `{loadNumber}-{random6hex}` provides human-readable tokens that are still sufficiently unique.

---

## 8. Future Features (Designed, Not Built)

### Load Templates
Allow dispatchers to save common load configurations for quick reuse. Would require:
- `LoadTemplate` table (not in current schema)
- Template CRUD endpoints
- "Create from template" UI action

### CSV/Excel Import
Bulk load creation from spreadsheet upload. Would require:
- `ImportMapping` table for column mapping configurations
- File upload endpoint with parsing
- Validation and preview step before commit

### Email-to-Load
Parse incoming emails to auto-create load drafts. Would require:
- Email ingestion service
- NLP/regex parsing for load details
- Manual review queue for parsed results

### DAT Load Board Integration
Search and import loads from DAT marketplace. Would require:
- DAT API adapter
- Search UI with filtering
- Import action creating loads with `intake_source: 'dat'`
