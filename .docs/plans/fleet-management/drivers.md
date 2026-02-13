# Drivers — Design & Implementation Reference

> **Last updated:** 2026-02-13 | **Status:** Implemented

## Overview

Driver management handles the full lifecycle of drivers within a fleet — from creation or TMS import through activation, SALLY access management, and HOS monitoring. Drivers can be manually created or synced from external TMS/ELD systems.

---

## Data Model

**Table:** `drivers` (multi-tenant, scoped by `tenantId`)

### Core Fields
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `driverId` | string | auto-gen | Unique identifier |
| `name` | string | yes | Full name |
| `phone` | string | yes | |
| `email` | string | yes | |
| `cdlClass` | string | yes | A, B, C (from reference data) |
| `licenseNumber` | string | yes | |
| `licenseState` | string | no | US state code |
| `endorsements` | string[] | no | H, N, P, T, X, S (from reference data) |

### Profile Enrichment
| Field | Type | Notes |
|-------|------|-------|
| `hireDate` | DateTime | |
| `medicalCardExpiry` | DateTime | Expiry tracking with days-remaining badge |
| `homeTerminalCity` | string | |
| `homeTerminalState` | string | |
| `homeTerminalTimezone` | string | Auto-derived (not editable in UI) |
| `emergencyContactName` | string | |
| `emergencyContactPhone` | string | |
| `notes` | string | Free-text notes |

### HOS (Hours of Service)
| Field | Type | Notes |
|-------|------|-------|
| `currentHoursDriven` | float | Structured field |
| `currentOnDutyTime` | float | |
| `currentHoursSinceBreak` | float | |
| `cycleHoursUsed` | float | |
| `hosData` | JSON | Cached from external integration |
| `hosDataSyncedAt` | DateTime | |
| `hosDataSource` | string | |
| `hosManualOverride` | boolean | |

### Status & Lifecycle
| Field | Type | Values |
|-------|------|--------|
| `status` | enum | PENDING_ACTIVATION, ACTIVE, INACTIVE, SUSPENDED, REMOVED_FROM_SOURCE |
| `syncStatus` | enum | SYNCED, REMOVED, SYNC_ERROR, MANUAL_ENTRY |
| `isActive` | boolean | Soft delete flag |

### External Sync
| Field | Type | Notes |
|-------|------|-------|
| `externalDriverId` | string | ID in source TMS/ELD |
| `externalSource` | string | mock_samsara, samsara_eld, motive_eld, etc. |
| `lastSyncedAt` | DateTime | |

### SALLY Access
Computed from relations (users + invitations):
- `ACTIVE` — linked user account exists
- `INVITED` — pending invitation exists
- `NO_ACCESS` — no user or invitation
- `DEACTIVATED` — previously active, now deactivated

---

## API Endpoints

### CRUD
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/drivers` | DISPATCHER+ | List active drivers with SALLY access status |
| POST | `/drivers` | ADMIN+ | Create driver (manual entry) |
| GET | `/drivers/:driver_id` | DISPATCHER+ | Get driver detail (profile, HOS, compliance, access) |
| PUT | `/drivers/:driver_id` | ADMIN+ | Update driver (TMS guard on synced fields) |
| DELETE | `/drivers/:driver_id` | ADMIN+ | Soft delete (isActive=false) |

### HOS
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/drivers/:driverId/hos` | DISPATCHER+ | Live HOS from integration (cache fallback) |

### Lifecycle
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/drivers/pending/list` | ADMIN+ | Pending activation queue |
| GET | `/drivers/inactive/list` | ADMIN+ | Inactive drivers |
| POST | `/drivers/:driver_id/activate` | ADMIN+ | Activate pending driver |
| POST | `/drivers/:driver_id/deactivate` | ADMIN+ | Deactivate with reason |
| POST | `/drivers/:driver_id/reactivate` | ADMIN+ | Reactivate inactive driver |
| POST | `/drivers/:driver_id/activate-and-invite` | ADMIN+ | One-step: activate + send SALLY invite |

---

## Frontend Architecture

### File Structure
```
apps/web/src/features/fleet/drivers/
├── api.ts                           # REST client (driversApi)
├── types.ts                         # Driver, CreateDriverRequest, UpdateDriverRequest, getSourceLabel()
├── index.ts                         # Barrel exports
├── hooks/
│   └── use-drivers.ts               # React Query hooks (useDrivers, useDriverById, useUpdateDriver, etc.)
└── components/
    ├── edit-driver-dialog.tsx        # Tier 2 edit dialog (TMS-aware: locks synced fields)
    └── invite-driver-dialog.tsx      # Tier 1 invite dialog

apps/web/src/app/dispatcher/fleet/
├── page.tsx                         # Fleet page (Drivers tab + Assets tab)
│   ├── DriversTab                   # Table with CDL, HOS, SALLY status, actions
│   └── DriverForm                   # Create-only form with "More Details" collapsible
└── drivers/
    └── [driverId]/
        └── page.tsx                 # Driver profile page (6 cards)
```

### Pages

**Fleet Page — Drivers Tab** (`/dispatcher/fleet`)
- Table columns: Driver (name+phone), CDL, Status, HOS (progress bar), Vehicle, Current Load, SALLY (badge), Actions
- Actions dropdown: View Profile, Edit/Edit Details, Invite to SALLY, Delete
- TMS sync banner with "Sync Now" button
- Driver count in card header

**Driver Profile** (`/dispatcher/fleet/drivers/:driverId`)
- 2-column grid with cards:
  1. Personal Information (phone, email, emergency contact)
  2. HOS Status (drive/shift/cycle remaining with progress bars)
  3. Compliance (CDL, license, endorsements, medical card, hire date)
  4. Operations (home terminal, vehicle, current load, SALLY access)
  5. Notes (full width)
  6. Integration (conditional, for TMS-synced drivers)

### Key Components

**DriverForm** (create-only, Tier 1 dialog)
- Required: Name, Phone, Email, CDL Class, License Number
- Optional: License State
- "More Details" collapsible: Endorsements, Compliance Dates, Home Terminal, Emergency Contact, Notes

**EditDriverDialog** (Tier 2 dialog, `max-w-2xl`)
- All fields from DriverForm + profile enrichment fields
- TMS-aware: accepts `externalSource` prop
  - When set: blue info banner, 6 fields locked (name, phone, email, CDL, license #, license state)
  - SALLY-owned fields always editable (endorsements, dates, home terminal, emergency contact, notes)

**InviteDriverDialog** (Tier 1 dialog)
- Shows driver info card
- Requests email if not set
- Calls `activateAndInvite` API

### React Query Hooks
| Hook | Query Key | Refetch |
|------|-----------|---------|
| `useDrivers()` | `['drivers']` | Manual |
| `useDriverById(id)` | `['drivers', id]` | Manual |
| `useCreateDriver()` | Invalidates `['drivers']` | On success |
| `useUpdateDriver()` | Invalidates `['drivers']` + `['drivers', id]` | On success |
| `useDeleteDriver()` | Invalidates `['drivers']` | On success |
| `useDriverHOS(id)` | `['drivers', id, 'hos']` | Every 60 seconds |

---

## TMS Sync Behavior

1. Drivers with `external_source` show a blue "TMS integration active" banner
2. Edit is available for ALL drivers (including TMS-synced)
3. For TMS-synced drivers, edit shows "Edit Details" label
4. In EditDriverDialog, TMS-synced fields are **disabled** with lock icon + opacity
5. SALLY-owned fields (endorsements, dates, home terminal, emergency contact, notes) remain editable
6. Delete is **hidden** for TMS-synced drivers
7. `getSourceLabel()` converts raw source codes to human-readable names (e.g., `mock_samsara` → "Samsara ELD")

---

## Reference Data Dependencies

| Category | Used For |
|----------|----------|
| `cdl_class` | CDL Class dropdown (A, B, C) |
| `us_state` | License State, Home Terminal State dropdowns |
| `endorsement` | Endorsement checkboxes (H, N, P, T, X, S) |

---

## Status Legend

| Badge | Meaning |
|-------|---------|
| ACTIVE (default) | Driver is active in fleet |
| INACTIVE (muted) | Driver is deactivated |
| SALLY Active | Has linked user account |
| SALLY Invited | Pending invitation |
| SALLY No Access | No user or invitation |
