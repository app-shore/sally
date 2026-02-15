# Vehicle Management UX Redesign

**Date:** 2026-02-13
**Status:** Approved
**Scope:** Vehicle creation form, list view, data model additions

---

## Problem

The current vehicle management UX was built as a basic CRUD form with 7 fields, all visible at once. For a dispatcher managing 30-100 units, key gaps exist:

1. **No operational status** — can't tell if a truck is available, in shop, or out of service
2. **No equipment type** — can't match trucks to loads (dry van vs flatbed vs reefer)
3. **VIN not required** — blocks ELD telematics auto-linking
4. **Schema fields not exposed** — license plate, sleeper berth, GVW exist in DB but aren't in the form
5. **Flat form layout** — every field gets equal weight; dispatchers filling out a DMV form when they need a 15-second add

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Form layout | Progressive disclosure | 15-second add for 90% case; "More Details" for the rest |
| VIN | Required at creation | Universal key for ELD matching — dispatcher always has it |
| Equipment Type | Required at creation | Determines load eligibility; dispatcher always knows this |
| Status model | 4-state: Available, Assigned, In Shop, Out of Service | Covers 99% of small/medium fleet needs |
| Status default | AVAILABLE | Most common state when adding a new truck |
| ASSIGNED status in form | Hidden — auto-set by load dispatch | Prevents manual misuse; keeps form simple |
| Dialog size | Tier 2 (max-w-2xl) | Fits progressive disclosure without being oversized |

---

## Data Model Changes

### New Prisma Enum: `VehicleStatus`

```prisma
enum VehicleStatus {
  AVAILABLE
  ASSIGNED
  IN_SHOP
  OUT_OF_SERVICE
}
```

### New Prisma Enum: `EquipmentType`

```prisma
enum EquipmentType {
  DRY_VAN
  FLATBED
  REEFER
  STEP_DECK
  POWER_ONLY
  OTHER
}
```

### Vehicle Model Changes

| Field | Type | Required | Default | Change |
|-------|------|----------|---------|--------|
| `status` | `VehicleStatus` | Yes | `AVAILABLE` | **NEW** |
| `equipmentType` | `EquipmentType` | Yes | — | **NEW** |
| `licensePlateState` | `String(2)` | No | — | **NEW** |
| `vin` | `String(17)` | **Yes** (was optional) | — | **CHANGED** — now required |
| `licensePlate` | `String(20)` | No | — | Already in schema, expose in form |
| `hasSleeperBerth` | `Boolean` | No | `true` | Already in schema, expose in form |
| `grossWeightLbs` | `Float` | No | — | Already in schema, expose in form |

### Fields NOT Adding (future scope)

- Insurance expiration, DOT inspection dates, IFTA base state, DEF capacity, odometer
- These are compliance/admin data — not needed for route planning POC

---

## Create/Edit Form: Progressive Disclosure

### Essential Fields (always visible)

```
┌─────────────────────────────────────────┐
│  Add Truck                              │
│─────────────────────────────────────────│
│  Unit Number *          [TRUCK-101    ] │
│  VIN *                  [1FUJGBDV7CLB ] │
│                                         │
│  Equipment Type *       [▼ Dry Van    ] │
│                                         │
│  Fuel Capacity (gal) *  [150         ]  │
│  MPG                    [6.5         ]  │
│                                         │
│  Status                 ● Available     │
│                         ○ In Shop       │
│                         ○ Out of Service│
│                                         │
│  ▶ More Details                         │
│                                         │
│              [Cancel]  [Create]         │
└─────────────────────────────────────────┘
```

**5 required fields:** Unit Number, VIN, Equipment Type, Fuel Capacity, Status (defaulted)

**Layout notes:**
- Unit Number and VIN: full-width, stacked (most important identifiers)
- Equipment Type: full-width Select dropdown
- Fuel Capacity / MPG: 2-column grid (fuel-related, side by side)
- Status: radio group (only 3 options shown — ASSIGNED is auto-set, not user-selectable)

### "More Details" Expanded Section

```
│  ▼ More Details                         │
│─────────────────────────────────────────│
│  Vehicle Info                           │
│  Make  [Freightliner]  Model [Cascadia] │
│  Year  [2024        ]                   │
│                                         │
│  Registration                           │
│  License Plate [ABC-1234]  State [▼ TX] │
│                                         │
│  Specifications                         │
│  Sleeper Berth  [✓]    GVW (lbs) [80000]│
│─────────────────────────────────────────│
```

**Grouped into 3 sub-sections** with subtle labels:
1. **Vehicle Info** — Make, Model, Year
2. **Registration** — License Plate, License Plate State
3. **Specifications** — Sleeper Berth (checkbox), GVW

---

## List View Changes

### Table Columns (updated)

| # | Column | Content | Why |
|---|--------|---------|-----|
| 1 | Unit Number | `TRUCK-101` (font-medium) | Primary identifier |
| 2 | Equipment Type | Badge: "Dry Van", "Reefer", etc. | Load eligibility at a glance |
| 3 | Make/Model | `Freightliner Cascadia` or `—` | Vehicle identity |
| 4 | Fuel / MPG | `150 gal · 6.5 mpg` (combined) | Compact fuel info |
| 5 | Status | Color-coded badge | Operational readiness |
| 6 | Source | Manual / TMS badge | Sync indicator |
| 7 | Actions | Edit / Delete buttons | CRUD controls |

**Removed from current:** Year column (low value at a glance), Last Synced (only useful for synced vehicles, can show on hover or detail view)

### Status Badge Colors

| Status | Badge Style | Color |
|--------|-------------|-------|
| AVAILABLE | outline | green (`text-green-700 dark:text-green-400 border-green-300 dark:border-green-700`) |
| ASSIGNED | filled | blue (`bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300`) |
| IN_SHOP | outline | amber (`text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700`) |
| OUT_OF_SERVICE | outline | red (`text-red-700 dark:text-red-400 border-red-300 dark:border-red-700`) |

---

## Validation Rules

| Field | Rule | Enforcement |
|-------|------|-------------|
| Unit Number | Required, unique per tenant | Hard block |
| VIN | Required, exactly 17 alphanumeric chars | Hard block (auto-uppercase, strip spaces) |
| Equipment Type | Required, valid enum value | Hard block |
| Fuel Capacity | Required, > 0, max 500 gallons | Hard block |
| Status | Required, valid enum (defaults to AVAILABLE) | Hard block |
| MPG | Optional, 1-20 range when provided | Soft warning |
| Year | Optional, 1990 to current+1 when provided | Soft warning |
| License Plate | Optional, no strict format | None |
| GVW | Optional, 10000-80000 range when provided | Soft warning |

**"Soft warning"** = shows hint text below field but does not block form submission.

---

## Backend Changes Summary

### DTOs
- `CreateVehicleDto`: Add `vin` (required), `equipment_type` (required), `status` (optional, defaults AVAILABLE), `license_plate`, `license_plate_state`, `has_sleeper_berth`, `gross_weight_lbs`
- `UpdateVehicleDto`: Same fields, all optional

### Service
- Auto-uppercase VIN on create/update
- Validate VIN uniqueness per tenant
- Default status to AVAILABLE on create

### Controller Response
- Include `status`, `equipment_type`, `license_plate`, `license_plate_state`, `has_sleeper_berth`, `gross_weight_lbs` in all vehicle responses

### Migration
- Add `status` enum column with default `AVAILABLE`
- Add `equipment_type` enum column (backfill existing vehicles as `DRY_VAN`)
- Add `license_plate_state` column
- Make `vin` NOT NULL (backfill existing vehicles with placeholder if needed)
- Add unique index on `(vin, tenantId)`

---

## Frontend Changes Summary

### Types (`types.ts`)
- Add `status`, `equipment_type`, `license_plate`, `license_plate_state`, `has_sleeper_berth`, `gross_weight_lbs` to `Vehicle` interface
- Update `CreateVehicleRequest` with new required/optional fields
- Update `UpdateVehicleRequest` accordingly

### Form Component (`VehicleForm`)
- Restructure into essential fields + collapsible "More Details" section
- Add Equipment Type Select dropdown
- Add Status radio group (Available, In Shop, Out of Service)
- Add VIN as required field with 17-char validation + auto-uppercase
- "More Details" section: Make/Model/Year, License Plate/State, Sleeper Berth/GVW

### List Component (`AssetsTab`)
- Replace Year column with Equipment Type badge
- Combine Fuel Capacity + MPG into single column
- Add Status badge column with color coding
- Remove Last Synced column (move to hover/detail)

---

## SALLY Route Planning Impact

These changes directly feed the route planner:

| Field | Route Planning Use |
|-------|-------------------|
| `fuelCapacityGallons` + `mpg` | Calculates range → determines fuel stop placement |
| `equipmentType` | Load eligibility matching (reefer loads need reefer trucks) |
| `hasSleeperBerth` | HOS split-sleeper rules (7/3 vs 8/2 split) |
| `status` | Only AVAILABLE vehicles shown in route planning vehicle selector |
| `vin` | ELD telematics auto-linking for real-time HOS data |
| `grossWeightLbs` | Weight-restricted route avoidance (future) |
