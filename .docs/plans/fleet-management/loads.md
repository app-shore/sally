# Loads — Design & Implementation

> **Last updated:** 2026-02-13 | **Status:** Implemented

## Overview

Load management handles the full lifecycle of freight loads — from creation through assignment, transit, and delivery. Loads contain ordered stops (pickups/deliveries) with time windows and dock hours. Loads can be created manually, via customer portal requests, or imported from TMS. Public tracking is available via generated tokens.

---

## Data Model

### loads
**Table:** `loads` (multi-tenant, scoped by `tenantId`)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `loadId` | string | auto-gen | Unique identifier |
| `loadNumber` | string | auto-gen | Format: `LD-YYYYMMDD-###` (3-digit daily sequence) |
| `tenantId` | FK | yes | Multi-tenant |
| `customerId` | FK | no | Links to customer |
| `driverId` | FK | no | Assigned driver |
| `vehicleId` | FK | no | Assigned vehicle |
| `status` | enum | yes | draft, pending, assigned, in_transit, delivered, cancelled |
| `weightLbs` | float | no | Freight weight |
| `commodityType` | string | no | general, dry_goods, refrigerated, frozen, hazmat, fragile, oversized, other |
| `equipmentType` | string | no | Required equipment (from reference data) |
| `specialRequirements` | string | no | |
| `pieces` | int | no | |
| `referenceNumber` | string | no | PO or customer reference |
| `rateCents` | int | no | Rate in cents (e.g., 245000 = $2,450.00) |
| `trackingToken` | string | no | UUID for public tracking portal |
| `intakeSource` | enum | no | manual, portal, tms_sync |
| `intakeMetadata` | JSON | no | Source-specific metadata |
| `externalLoadId` | string | no | ID in source TMS |
| `externalSource` | string | no | |
| `lastSyncedAt` | DateTime | no | |

### load_stops (junction)
| Field | Type | Notes |
|-------|------|-------|
| `loadId` | FK | Links to load |
| `stopId` | FK | Links to stop |
| `sequenceOrder` | int | 1, 2, 3... (pickup/delivery order) |
| `actionType` | enum | pickup, delivery, both |
| `earliestArrival` | string | Time window start |
| `latestArrival` | string | Time window end |
| `estimatedDockHours` | float | Planned dock time |
| `actualDockHours` | float | Actual dock time (post-delivery) |

### stops (shared)
| Field | Type | Notes |
|-------|------|-------|
| `stopId` | string | |
| `name` | string | Location/facility name |
| `address` | string | Street address |
| `city` | string | |
| `state` | string | |
| `zipCode` | string | |
| `latitude` | float | For mapping |
| `longitude` | float | |

---

## Load Status Lifecycle

```
draft → pending → assigned → in_transit → delivered
                                        ↘ cancelled
```

| Status | Meaning |
|--------|---------|
| `draft` | Created but not submitted |
| `pending` | Awaiting assignment |
| `assigned` | Driver + vehicle assigned |
| `in_transit` | Currently being transported |
| `delivered` | Delivery confirmed |
| `cancelled` | Cancelled at any stage |

---

## Intake Sources

Loads enter the system through multiple channels, tracked via `intakeSource`:

| Source | Value | Status |
|--------|-------|--------|
| Manual entry (dispatcher) | `manual` | Implemented |
| Customer portal request | `portal` | Implemented |
| TMS sync | `tms_sync` | Implemented |
| Load duplication | `manual` (copy) | Implemented |
| CSV/Excel import | `import` | Not Built |
| Email-to-load | `email` | Not Built |
| DAT load board | `dat` | Not Built |
| Template | `template` | Not Built |

---

## API Endpoints

### Load CRUD & Operations
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/loads` | DISPATCHER+ | Create load with stops (inline stop creation) |
| GET | `/loads` | DISPATCHER+ | List loads (optional: status filter, customer_name, pagination) |
| GET | `/loads/:load_id` | DISPATCHER+ | Get load with stops |
| PATCH | `/loads/:load_id/status` | DISPATCHER+ | Update load status |
| POST | `/loads/:load_id/assign` | DISPATCHER+ | Assign driver + vehicle |
| POST | `/loads/:load_id/tracking-token` | DISPATCHER+ | Generate/regenerate tracking token |
| POST | `/loads/:load_id/duplicate` | DISPATCHER+ | Duplicate load with all stops |

### Customer Portal
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/customer-loads` | CUSTOMER | List loads for logged-in customer |
| POST | `/customer-loads` | CUSTOMER | Create load request (draft) |
| GET | `/customer-loads/:load_id` | CUSTOMER | View specific load (ownership validated) |

### Public Tracking
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/loads/track/:token` | None | Public tracking by token |

---

## Frontend Architecture

### File Structure
```
apps/web/src/features/fleet/loads/
├── api.ts                          # REST client (loadsApi)
├── types.ts                        # Load, LoadStop, LoadListItem, LoadCreate, LoadStopCreate
└── index.ts                        # Barrel exports

apps/web/src/app/dispatcher/loads/
└── page.tsx                        # Loads page (Loads tab + Customers tab)
    ├── LoadsTab                     # Grouped by status, card grid
    ├── LoadCreateSheet              # Tier 3 full-screen overlay for load creation
    ├── LoadDetailSheet              # Slide-out panel for load details
    └── CustomerList                 # Customer management table
```

### Pages

**Loads Page — Loads Tab** (`/dispatcher/loads`)
- Loads grouped by status: Drafts, Pending, Assigned, In Transit, Delivered, Cancelled
- Each status group shows count + load cards
- Load card: Load Number, Customer, Stop Count, Equipment Type, Rate
- "Create Load" button opens Tier 3 full-screen sheet

**Load Detail Sheet** (slide-out from right)
- Load info grid: Customer, Weight, Commodity, Equipment, Intake source, Stop count, Special requirements
- Stops timeline: numbered circles with pickup (blue) / delivery (green) color coding, stop name, city/state, dock hours, arrival window
- Status-aware actions:

| Load Status | Available Actions |
|-------------|-------------------|
| `draft` | "Confirm Load" (→ pending) |
| `pending` | "Plan Route" (→ route planner) |
| `assigned` | "Activate" (→ in_transit) |
| `in_transit` | "Copy Tracking Link" + "Mark Completed" |
| Always | "Duplicate" + "Cancel" (except completed/cancelled) |

**Load Create Sheet** (Tier 3 — full-screen overlay)
- **Freight Section:** Weight, Commodity, Special Requirements, Pieces, Reference #, Rate
  - Rate displayed as dollars, stored as cents internally
  - Equipment Type from reference data (default: dry_van)
- **Stops Section** (dynamic):
  - Add stop button
  - Per stop: City, State (dropdown), ZIP Code, Address, Action Type (pickup/delivery), Earliest/Latest Arrival, Dock Hours
  - Stops can be created inline (if stop doesn't exist in DB)
- Submit: creates load with all stops in one API call
- Load number auto-generated on backend (not entered by user)

### React Query / API
| Method | Purpose |
|--------|---------|
| `loadsApi.list(params?)` | List with optional filters (status, customer_name, page, limit) |
| `loadsApi.getById(loadId)` | Get load detail with stops |
| `loadsApi.create(data)` | Create load + stops |
| `loadsApi.updateStatus(loadId, status)` | Status transition |
| `loadsApi.duplicate(loadId)` | Copy load + all stops |
| `loadsApi.generateTrackingToken(loadId)` | Generate public tracking token |

### Responsive Design
- Mobile (< md): `grid-cols-1` — stacked status columns
- Tablet (md): `grid-cols-2` — 2x2 grid
- Desktop (lg+): `grid-cols-4` — all columns side by side
- Detail Sheet: full-width on mobile (`w-full`), constrained on desktop (`sm:max-w-lg`)

---

## Key Features

### Auto-Generated Load Numbers
Format: `LD-YYYYMMDD-###` (e.g., `LD-20260213-001`)
- Backend counts existing loads for that date and pads to 3 digits
- Eliminates manual numbering errors and collision risk

### Inline Stop Creation
When creating a load, stops can be created on-the-fly:
- If `stop_id` is provided → links to existing stop
- If `name`, `address`, `city`, `state`, `zip_code` provided → creates new stop first, then links

### Load Duplication
Copies a load and all its stops to a new load with:
- New loadId and loadNumber
- Status reset to `draft`
- All stops duplicated with same sequence

### Public Tracking
- Generate tracking token: `POST /loads/:load_id/tracking-token`
- Public URL: `/loads/track/:token` (no auth)
- Returns: load status, stop timeline, ETA

### Assignment
- `POST /loads/:load_id/assign` with `driver_id` + `vehicle_id`
- Validates driver and vehicle exist and belong to tenant
- Updates load status to `assigned`

---

## TMS Integration Architecture

### Adapter Pattern

The TMS integration uses an adapter factory pattern that decouples SALLY from specific TMS vendors.

```
IntegrationConfig (per tenant)
    → AdapterFactoryService.getTMSAdapter(vendor)
        → ITMSAdapter interface
            ├── McLeodTmsAdapter
            ├── Project44TmsAdapter
            └── (future adapters)
```

**ITMSAdapter interface methods:**
- `getVehicles(apiKey, apiSecret)` → `VehicleData[]`
- `getDrivers(apiKey, apiSecret)` → `DriverData[]`
- `getLoad(apiKey, apiSecret, loadId)` → `LoadData`
- `getActiveLoads(apiKey, apiSecret)` → `LoadData[]`
- `testConnection(apiKey, apiSecret?)` → `boolean`
- `syncAllLoads?(apiKey, apiSecret?)` → `string[]`

### Standardized Data Format

All TMS adapters transform vendor-specific formats into a standard `LoadData` interface with fields: `load_id`, `load_number`, `customer_name`, `weight_lbs`, `commodity_type`, `pickup_location`, `delivery_location`, `stops[]`, `status`.

### TMS Status Mapping

| TMS Status | SALLY Status |
|------------|-------------|
| UNASSIGNED | pending |
| ASSIGNED | pending |
| IN_TRANSIT | in_transit |
| DELIVERED | completed |
| CANCELLED | cancelled |

### Sync Process

1. Load `IntegrationConfig` for integration ID
2. Get adapter from `AdapterFactoryService` based on vendor
3. Decrypt credentials via `CredentialsService`
4. Fetch data from TMS via adapter
5. Upsert loads using `externalLoadId` as unique key
6. For each load, find or create Stop entities from address data
7. Delete and recreate LoadStop records for the load
8. Update `lastSyncAt` on IntegrationConfig

### Sync Schedule

Runs on `SYNC_LOADS_CRON` env var or default every 15 minutes (`0 */15 * * * *`). Iterates all active TMS integrations (`integrationType: 'TMS', isEnabled: true, status: 'ACTIVE'`). Errors are logged per-integration but do not halt the batch.

---

## Reference Data Dependencies

| Category | Used For |
|----------|----------|
| `equipment_type` | Equipment Type dropdown in load creation |
| `us_state` | Stop state dropdown |

---

## Design Decisions

1. **Auto-generated load numbers:** Eliminates manual numbering errors. Format `LD-YYYYMMDD-###` provides human-readable, date-grouped identifiers.

2. **Upsert on TMS sync:** Loads use `externalLoadId` as the unique merge key, preventing duplicates while allowing updates.

3. **Delete-and-recreate stops on sync:** Each sync cycle deletes existing LoadStop records and recreates them from TMS data, ensuring stop sequences stay accurate.

4. **Inline stop creation:** When creating loads manually, stops that don't exist are created inline (by name/address), avoiding a separate stop management workflow.

5. **Tracking token format:** Provides shareable public tracking without authentication.

6. **Loads + Customers on same page:** Rather than separate routes, customer management is a tab on the Loads page, reflecting the dispatcher workflow where loads and customers are managed together.

7. **Sheet for load detail panel:** Uses Shadcn Sheet (slide-out) rather than a modal, allowing the dispatcher to see the board context while reviewing a load.

8. **Status-aware actions:** The detail panel dynamically shows different action buttons based on the load's current status, guiding the dispatcher through the lifecycle.

9. **Tier 3 full-screen for load creation:** Load creation involves dynamic stops with sub-entities — the user benefits from full focus and screen real estate.

10. **Rate stored as cents:** `rateCents` avoids floating-point precision issues. UI displays as dollars (e.g., 245000 → $2,450.00).

---

## Future Work (Not Yet Implemented)
- Load edit form (currently create-only)
- Load delete
- Stop drag-to-reorder in creation UI
- Address geocoding / autocomplete
- Search by reference number, customer, date range
- Bulk operations (batch assign, batch status change)
- Time windows as datetime pickers (currently strings)
- Actual dock hours tracking in UI
- Full customer portal load request UI
- Route plan ↔ load integration UI
- Temperature range field (conditional on reefer equipment)
- Miles (estimated) field — auto-calculate from stops
- BOL number field
- CSV/Excel import
- Load templates
