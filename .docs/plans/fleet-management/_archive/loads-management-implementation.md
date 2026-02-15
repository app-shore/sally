# Loads Management & TMS Integration - Implementation Reference

**Status:** Implemented (Core) | Partial (TMS Sync)
**Domain:** Fleet Management > Loads
**Last Validated Against Code:** 2026-02-12
**Source Plans:** `_archive/2026-02-06-loads-tms-integration-nodejs.md`, `_archive/2026-02-06-loads-tms-integration-implementation.md`

---

## 1. Backend Implementation

### Controller: `loads.controller.ts`

**File:** `apps/backend/src/domains/fleet/loads/controllers/loads.controller.ts`
**Route prefix:** `/loads`
**Auth:** All endpoints require `DISPATCHER`, `ADMIN`, or `OWNER` role.

| Method | Route | Handler | Status |
|---|---|---|---|
| POST | `/loads` | `createLoad` | Implemented |
| GET | `/loads` | `listLoads` | Implemented |
| GET | `/loads/:load_id` | `getLoad` | Implemented |
| PATCH | `/loads/:load_id/status` | `updateLoadStatus` | Implemented |
| POST | `/loads/:load_id/assign` | `assignLoad` | Implemented |
| POST | `/loads/:load_id/tracking-token` | `generateTrackingToken` | Implemented |
| POST | `/loads/:load_id/duplicate` | `duplicateLoad` | Implemented |

**Query parameters for GET /loads:**
- `status` (optional) - Filter by load status
- `customer_name` (optional) - Filter by customer name (case-insensitive contains)
- `limit` (optional, default 50)
- `offset` (optional, default 0)

### Service: `loads.service.ts`

**File:** `apps/backend/src/domains/fleet/loads/services/loads.service.ts`

**Key methods:**

| Method | Description | Status |
|---|---|---|
| `create(data)` | Create load with inline stop creation | Implemented |
| `findAll(tenantId, filters, pagination)` | List loads with filtering, tenant-scoped | Implemented |
| `findOne(loadId)` | Get single load with stops | Implemented |
| `updateStatus(loadId, status)` | Update status, auto-gen tracking token on 'active' | Implemented |
| `assignLoad(loadId, driverId, vehicleId)` | Assign driver + vehicle to load (writes FK) | Implemented |
| `findByCustomerId(customerId, tenantId)` | Customer-scoped load list with route plan data | Implemented |
| `findOneForCustomer(loadId, customerId)` | Customer-scoped single load (validates ownership) | Implemented |
| `createFromCustomerRequest(data)` | Create draft load from portal request | Implemented |
| `getPublicTracking(token)` | Public tracking data with timeline | Implemented |
| `generateTrackingToken(loadId)` | Generate and persist tracking token | Implemented |
| `duplicate(loadId, tenantId)` | Copy load and stops with new ID | Implemented |
| `buildTrackingTimeline(load)` | Generate timeline events from load state | Implemented |
| `formatLoadResponse(load)` | Normalize Prisma response to API format | Implemented |

**Implementation details for `create`:**
1. Generates `loadId` as `LOAD-{load_number}`
2. Creates Load record
3. For each stop: looks up by `stopId`, creates inline if not found (when `name` provided)
4. If stop not found and no name for inline creation, rolls back (deletes load) and throws `NotFoundException`
5. Returns formatted load with stops

**Implementation details for `updateStatus`:**
1. Validates status against whitelist: `['draft', 'pending', 'planned', 'active', 'in_transit', 'completed', 'cancelled']`
2. When transitioning to `active` and no tracking token exists: auto-generates `{loadNumber}-{random6hex}`
3. Updates `updatedAt` timestamp

**Implementation details for `assignLoad`:**
1. Looks up Load, Driver, and Vehicle by their string IDs
2. Updates Load record with `driverId: driver.id` and `vehicleId: vehicle.id` (actual database FK writes)
3. Returns confirmation with driver name and vehicle unit number

---

## 2. TMS Sync Implementation

### TMS Sync Service

**File:** `apps/backend/src/domains/integrations/sync/tms-sync.service.ts`

| Method | Description | Status |
|---|---|---|
| `syncVehicles(integrationId)` | Fetch + upsert vehicles from TMS | Implemented |
| `syncDrivers(integrationId)` | Fetch + upsert drivers from TMS | Implemented |
| `syncLoads(integrationId)` | Fetch + upsert loads with stops from TMS | Implemented |

**Load sync process:**
1. Fetches `IntegrationConfig` with tenant and vendor info
2. Gets TMS adapter from `AdapterFactoryService`
3. Decrypts credentials via `CredentialsService` using vendor registry field names
4. Calls `adapter.getActiveLoads(primary, secondary)`
5. For each TMS load:
   - Processes stops array (or falls back to pickup/delivery locations)
   - Finds or creates Stop entities by address matching
   - Upserts Load using `externalLoadId` as unique key
   - Deletes existing LoadStop records, recreates from fresh data
6. Updates `lastSyncAt` on IntegrationConfig

### Cron Jobs

**File:** `apps/backend/src/infrastructure/jobs/loads-sync.job.ts`

```typescript
@Cron(process.env.SYNC_LOADS_CRON || '0 */15 * * * *')
async syncLoads() {
  // Finds all active TMS integrations
  // Calls tmsSyncService.syncLoads per integration
  // Errors logged per-integration, batch continues
}
```

Similar jobs exist for drivers and vehicles sync.

### TMS Adapters

**Interface:** `apps/backend/src/domains/integrations/adapters/tms/tms-adapter.interface.ts`
**Implementations:**
- `apps/backend/src/domains/integrations/adapters/tms/mcleod-tms.adapter.ts` (McLeod)
- `apps/backend/src/domains/integrations/adapters/tms/project44-tms.adapter.ts` (Project44)

---

## 3. DTO: `CreateLoadDto`

**File:** `apps/backend/src/domains/fleet/loads/dto/`

Used by the POST /loads endpoint. Accepts:
- `load_number` (required)
- `weight_lbs` (required)
- `commodity_type` (required)
- `customer_name` (required)
- `equipment_type` (optional)
- `special_requirements` (optional)
- `customer_id` (optional)
- `intake_source` (optional)
- `status` (optional)
- `stops[]` - Array of stop objects with stop_id, sequence_order, action_type, estimated_dock_hours, plus optional name/address/city/state for inline creation

---

## 4. Frontend Implementation

### Types

**File:** `apps/web/src/features/fleet/loads/types.ts`

```typescript
// Full load with stops (from GET /loads/:id)
interface Load {
  id: number;
  load_id: string;
  load_number: string;
  status: "draft" | "pending" | "planned" | "active" | "in_transit" | "completed" | "cancelled";
  weight_lbs: number;
  commodity_type: string;
  equipment_type?: string;
  special_requirements?: string;
  customer_name: string;
  customer_id?: number;
  intake_source: string;
  tracking_token?: string;
  driver_id?: number;
  vehicle_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  stops: LoadStop[];
}

// List item (from GET /loads)
interface LoadListItem {
  id: number;
  load_id: string;
  load_number: string;
  status: string;
  customer_name: string;
  stop_count: number;
  weight_lbs: number;
  commodity_type: string;
  equipment_type?: string;
  intake_source?: string;
  external_load_id?: string;
  external_source?: string;
  last_synced_at?: string;
}

// Create payload
interface LoadCreate {
  load_number: string;
  weight_lbs: number;
  commodity_type: string;
  equipment_type?: string;
  special_requirements?: string;
  customer_name: string;
  customer_id?: number;
  intake_source?: string;
  status?: string;
  stops: LoadStopCreate[];
}
```

### API Client

**File:** `apps/web/src/features/fleet/loads/api.ts`

Provides `loadsApi` object with methods:
- `list(filters?)` - GET /loads
- `getById(loadId)` - GET /loads/:load_id
- `create(data)` - POST /loads
- `updateStatus(loadId, status)` - PATCH /loads/:load_id/status
- `duplicate(loadId)` - POST /loads/:load_id/duplicate
- `generateTrackingToken(loadId)` - POST /loads/:load_id/tracking-token

---

## 5. File Index

| File | Purpose |
|---|---|
| `apps/backend/src/domains/fleet/loads/controllers/loads.controller.ts` | Load CRUD endpoints |
| `apps/backend/src/domains/fleet/loads/services/loads.service.ts` | Load business logic |
| `apps/backend/src/domains/fleet/loads/dto/` | Request validation DTOs |
| `apps/backend/src/domains/integrations/sync/tms-sync.service.ts` | TMS sync service |
| `apps/backend/src/domains/integrations/adapters/tms/tms-adapter.interface.ts` | TMS adapter interface |
| `apps/backend/src/domains/integrations/adapters/tms/mcleod-tms.adapter.ts` | McLeod adapter |
| `apps/backend/src/domains/integrations/adapters/tms/project44-tms.adapter.ts` | Project44 adapter |
| `apps/backend/src/infrastructure/jobs/loads-sync.job.ts` | Loads sync cron job |
| `apps/backend/src/infrastructure/jobs/drivers-sync.job.ts` | Drivers sync cron job |
| `apps/backend/src/infrastructure/jobs/vehicles-sync.job.ts` | Vehicles sync cron job |
| `apps/web/src/features/fleet/loads/types.ts` | Frontend type definitions |
| `apps/web/src/features/fleet/loads/api.ts` | Frontend API client |

---

## 6. What Is Not Built

The following items from the original plans have NOT been implemented:

1. **LoadTemplate table and endpoints** - Planned for template-based load creation
2. **ImportMapping table and endpoints** - Planned for CSV column mapping
3. **CSV/Excel import endpoint** - No file upload or parsing
4. **Email-to-load ingestion** - No email parsing service
5. **DAT load board adapter** - No DAT API integration
6. **Seed data script** - The original plan called for 7 seed loads; current state uses TMS sync or manual creation instead
7. **Mock TMS endpoint** - The original plan proposed a mock TMS controller at `/api/v1/mock/tms/loads`; the actual implementation uses real adapter pattern with mock data in adapter implementations
