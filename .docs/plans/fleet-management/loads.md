# Loads — Design & Implementation Reference

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
| `commodityType` | string | no | |
| `equipmentType` | string | no | Required equipment |
| `specialRequirements` | string | no | |
| `pieces` | int | no | |
| `referenceNumber` | string | no | PO or customer reference |
| `rateCents` | int | no | Rate in cents (e.g., 245000 = $2,450.00) |
| `trackingToken` | string | no | UUID for public tracking portal |
| `intakeSource` | enum | no | manual, portal, tms |
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
    └── CustomerList                 # Customer management table
```

### Pages

**Loads Page — Loads Tab** (`/dispatcher/loads`)
- Loads grouped by status: Drafts, Pending, Assigned, In Transit, Delivered, Cancelled
- Each status group shows count + load cards
- Load card: Load Number, Customer, Stop Count, Equipment Type, Rate
- "Create Load" button opens Tier 3 full-screen sheet

**Load Create Sheet** (Tier 3 — full-screen overlay)
- **Header:** Equipment Type, Commodity Type
- **Freight Section:** Weight, Commodity, Special Requirements, Pieces, Reference #, Rate
- **Stops Section** (dynamic):
  - Add stop button
  - Per stop: City, State, Address, Action Type (pickup/delivery), Time Windows, Dock Hours
  - Stops can be created inline (if stop doesn't exist in DB)
- Submit: creates load with all stops in one API call

### React Query / API
| Method | Purpose |
|--------|---------|
| `loadsApi.list(params?)` | List with optional filters (status, customer_name, page, limit) |
| `loadsApi.getById(loadId)` | Get load detail with stops |
| `loadsApi.create(data)` | Create load + stops |
| `loadsApi.updateStatus(loadId, status)` | Status transition |
| `loadsApi.duplicate(loadId)` | Copy load + all stops |
| `loadsApi.generateTrackingToken(loadId)` | Generate public tracking token |

---

## Key Features

### Auto-Generated Load Numbers
Format: `LD-YYYYMMDD-###` (e.g., `LD-20260213-001`)
- Backend counts existing loads for that date
- Pads to 3 digits

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

## Reference Data Dependencies

| Category | Used For |
|----------|----------|
| `equipment_type` | Equipment Type dropdown in load creation |
| `us_state` | Stop state dropdown |

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
