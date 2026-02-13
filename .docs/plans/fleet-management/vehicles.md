# Vehicles / Assets — Design & Implementation Reference

> **Last updated:** 2026-02-13 | **Status:** Implemented (Trucks only; Trailers & Equipment are Coming Soon)

## Overview

Vehicle/asset management handles trucks, trailers, and equipment within a fleet. Vehicles can be manually created or synced from external TMS systems. TMS-synced vehicles have identity fields locked but operational fields (fuel, status, MPG) remain editable locally.

---

## Data Model

**Table:** `vehicles` (multi-tenant, scoped by `tenantId`)

### Core Fields
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `vehicleId` | string | auto-gen | Unique identifier |
| `unitNumber` | string | yes | Fleet-assigned unit ID |
| `vin` | string | yes | 17-char VIN (unique per tenant, validated regex) |
| `equipmentType` | enum | yes | DRY_VAN, FLATBED, REEFER, STEP_DECK, POWER_ONLY, OTHER |
| `status` | enum | yes | AVAILABLE, ASSIGNED, IN_SHOP, OUT_OF_SERVICE |

### Fuel & Performance
| Field | Type | Notes |
|-------|------|-------|
| `fuelCapacityGallons` | float | 1-500 gallons |
| `currentFuelGallons` | float | Live fuel level (future: from telematics) |
| `mpg` | float | 1-20 MPG |

### Vehicle Details
| Field | Type | Notes |
|-------|------|-------|
| `make` | string | e.g., Freightliner |
| `model` | string | e.g., Cascadia |
| `year` | int | |
| `licensePlate` | string | |
| `licensePlateState` | string | US state code |
| `hasSleeperBerth` | boolean | Default: true |
| `grossWeightLbs` | float | e.g., 80000 |

### External Sync
| Field | Type | Notes |
|-------|------|-------|
| `externalVehicleId` | string | ID in source TMS |
| `externalSource` | string | mock_samsara, samsara_eld, etc. |
| `lastSyncedAt` | DateTime | |
| `eldTelematicsMetadata` | JSON | Vendor-agnostic telematics data |

---

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/vehicles` | DISPATCHER+ | List active vehicles |
| POST | `/vehicles` | ADMIN+ | Create vehicle (auto-generates vehicleId) |
| GET | `/vehicles/:vehicle_id` | DISPATCHER+ | Get vehicle details |
| PUT | `/vehicles/:vehicle_id` | DISPATCHER+ | Update vehicle (TMS-aware field filtering) |
| DELETE | `/vehicles/:vehicle_id` | ADMIN+ | Soft delete |

### TMS Field Filtering (Backend)
For TMS-synced vehicles, the service **strips identity fields** from update payloads:
- **Locked by TMS:** vin, unitNumber, make, model, year, licensePlate, licensePlateState
- **Always editable:** fuelCapacityGallons, mpg, status, equipmentType, hasSleeperBerth, grossWeightLbs

---

## Frontend Architecture

### File Structure
```
apps/web/src/features/fleet/vehicles/
├── api.ts                          # REST client (vehiclesApi)
├── types.ts                        # Vehicle, CreateVehicleRequest, UpdateVehicleRequest
└── index.ts                        # Barrel exports

apps/web/src/app/dispatcher/fleet/
└── page.tsx                        # Fleet page — Assets tab
    ├── AssetsTab                    # Segmented control (Trucks | Trailers | Equipment)
    ├── VehicleForm                  # Create/edit form with "More Details" collapsible
    └── VehicleStatusBadge           # Color-coded status badge
```

### Pages

**Fleet Page — Assets Tab** (`/dispatcher/fleet`, Assets tab)
- Segmented control: **Trucks** | **Trailers** (Coming Soon) | **Equipment** (Coming Soon)
- Table columns: Unit Number, Type (badge), Make/Model, Fuel/MPG, Status, Source, Actions
- TMS sync banner with "Sync Now"
- Actions dropdown: Edit, Delete (non-TMS), "Synced from {source}" indicator (TMS)

### Key Components

**VehicleForm** (Tier 2 dialog, `max-w-2xl`)
- **Essential Fields** (always visible):
  - Unit Number* (disabled if TMS-synced)
  - VIN* (17-char validation, disabled if TMS-synced)
  - Equipment Type* (select from reference data)
  - Fuel Capacity* (number, 1-500 gal)
  - MPG (number, 1-20)
  - Status (radio: Available, In Shop, Out of Service)
- **More Details** (collapsible, auto-expands if data exists):
  - Vehicle Info: Make, Model, Year (disabled if TMS-synced)
  - Registration: License Plate, State (disabled if TMS-synced)
  - Specifications: Has Sleeper Berth (checkbox), GVW (lbs)

**VehicleStatusBadge**
- Color-coded from reference data metadata:
  - Green: Available
  - Blue: Assigned
  - Amber: In Shop
  - Red: Out of Service

### React Query
Vehicles currently use imperative API calls (`listVehicles()`, `createVehicle()`, etc.) in the fleet page rather than React Query hooks. The fleet page manages state with `useState` + `loadData()`.

---

## TMS Sync Behavior

1. Vehicles with `external_source` show a blue "TMS integration active" banner
2. Source column shows "Samsara ELD" / "Truckbase TMS" badge (TMS) or "Manual" badge
3. Edit opens for ALL vehicles (including TMS-synced)
4. For TMS-synced vehicles in VehicleForm:
   - Identity fields disabled with `isTmsSynced` flag: Unit Number, VIN, Make, Model, Year, License Plate, License Plate State
   - Operational fields always editable: Equipment Type, Fuel Capacity, MPG, Status, Sleeper Berth, GVW
5. Delete hidden for TMS-synced vehicles
6. Dialog title shows TMS source badge for synced vehicles

---

## Reference Data Dependencies

| Category | Used For |
|----------|----------|
| `equipment_type` | Equipment Type dropdown + table display |
| `vehicle_status` | Status badge colors and labels |
| `us_state` | License Plate State dropdown |

---

## DTO Validation

**CreateVehicleDto:**
- VIN: 17 chars, regex `^[A-HJ-NPR-Z0-9]{17}$` (no I, O, Q), auto-uppercase
- Equipment type: must be valid enum
- Fuel capacity: 1-500 gallons
- MPG: 1-20
- Status: AVAILABLE, IN_SHOP, OUT_OF_SERVICE only (ASSIGNED not allowed on create)

---

## Future Work (Not Yet Implemented)
- **Trailers:** Tab placeholder exists, backend model may need extending
- **Equipment:** Tab placeholder exists (reefer units, tarps, etc.)
- Vehicle detail page (no dedicated `/vehicles/:id` page)
- Vehicle-to-driver assignment UI
- Real-time telematics data display
- Search/filter by unit number, make, status
- Bulk operations (batch status change, batch delete)
