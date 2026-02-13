# Drivers — Design & Implementation

> **Last updated:** 2026-02-13 | **Status:** Implemented

## Overview

Driver management handles the full lifecycle of drivers within a fleet — from creation or TMS import through activation, SALLY access management, and HOS monitoring. Drivers can be manually created or synced from external TMS/ELD systems. TMS-synced drivers have identity fields locked but SALLY-owned fields (endorsements, compliance dates, home terminal, emergency contact, notes) remain editable.

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

### SALLY Access Status (Derived, Not Stored)

The `sally_access_status` is computed at query time from related User/UserInvitation records — it is NOT a column in the Driver table.

| Status | Derivation Logic | UI Display |
|--------|-----------------|------------|
| `ACTIVE` | Driver has a linked User (`user.driverId = driver.id`) with active status | Green "Active" badge |
| `INVITED` | Driver has a pending UserInvitation (`invitation.driverId = driver.id`, not expired) | "Invited" badge |
| `DEACTIVATED` | Driver has a linked User that is deactivated | Red "Deactivated" badge |
| `NO_ACCESS` | No linked User and no pending invitation | "No Access" badge |

The `listDrivers` endpoint computes this by joining on User and UserInvitation tables, returning `sally_access_status`, `linked_user_id`, and `pending_invitation_id` fields.

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
- Actions dropdown: View Profile, Edit/Edit Details, Invite to SALLY (NO_ACCESS only), Delete (non-TMS only)
- TMS sync banner with "Sync Now" button
- Driver count in card header: "Drivers (12)"
- Driver name is a `<Link>` (supports right-click "open in new tab")

**Driver Profile** (`/dispatcher/fleet/drivers/:driverId`)
- 2-column grid with 6 cards:
  1. **Personal Information** — phone, email, emergency contact
  2. **HOS Status** — drive/shift/cycle remaining with progress bars (60s auto-refresh)
  3. **Compliance** — CDL class badge, license number/state, endorsement badges, medical card expiry with days-remaining, hire date
  4. **Operations** — home terminal, assigned vehicle, current load, SALLY access status
  5. **Notes** — full width, free-text
  6. **Integration** — conditional card for TMS-synced drivers (source, external ID, sync timestamps)

### Key Components

**DriverForm** (create-only, Tier 1 dialog `max-w-lg`)
- Required fields: Name, Phone, Email, CDL Class, License Number
- Optional: License State
- "More Details" collapsible (matches Vehicle form pattern):
  - **Endorsements** — checkboxes from reference data
  - **Compliance Dates** — Hire Date, Medical Card Expiry (2-col grid)
  - **Home Terminal** — City, State (2-col grid)
  - **Emergency Contact** — Name, Phone (2-col grid)
  - **Notes** — textarea
- Auto-expands if any optional field has data

**EditDriverDialog** (Tier 2 dialog, `max-w-2xl`)
- All fields from DriverForm + profile enrichment fields
- TMS-aware via `externalSource` prop:
  - When set: blue info banner ("Some fields are managed by {source} and cannot be edited here.")
  - 6 fields locked with `disabled` + `opacity-60` + Lock icon: name, phone, email, CDL, license #, license state
  - SALLY-owned fields always editable: endorsements, dates, home terminal, emergency contact, notes
- Used from both table actions and profile page (unified edit path)

**InviteDriverDialog** (Tier 1 dialog)
- Shows driver info card
- Requests email if not set
- Calls `activateAndInvite` API (atomic activate + invite)

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
3. For TMS-synced drivers, edit shows "Edit Details" label (table + profile)
4. In EditDriverDialog, TMS-synced fields are **disabled** with lock icon + opacity
5. SALLY-owned fields (endorsements, dates, home terminal, emergency contact, notes) remain editable
6. Delete is **hidden** for TMS-synced drivers (prevents conflicts with sync)
7. `getSourceLabel()` converts raw source codes to human-readable names:

| Source Code | Display Label |
|-------------|--------------|
| `mock_samsara` | Samsara ELD |
| `mock_truckbase_tms` | Truckbase TMS |
| `samsara_eld` | Samsara ELD |
| `keeptruckin_eld` | KeepTruckin |
| `motive_eld` | Motive |
| `mcleod_tms` | McLeod |
| `PROJECT44_TMS` | Project44 TMS |

---

## Reference Data Dependencies

| Category | Used For |
|----------|----------|
| `cdl_class` | CDL Class dropdown (A, B, C) |
| `us_state` | License State, Home Terminal State dropdowns |
| `endorsement` | Endorsement checkboxes (H, N, P, T, X, S) |

---

## Design Decisions

1. **Derived SALLY access status, not stored:** `sally_access_status` is computed at query time rather than stored as a column. This avoids sync issues between the Driver table and User/UserInvitation tables.

2. **Single "Invite to SALLY" action:** Rather than separate "activate" and "invite" steps, the `activate-and-invite` endpoint combines both operations atomically.

3. **TMS drivers allow partial edit:** Identity fields (name, phone, email, CDL, license) are locked to prevent manual edits that would be overwritten on next sync. SALLY-owned fields remain editable.

4. **Unified edit dialog:** Both table actions and profile page use the same `EditDriverDialog` component, eliminating dual edit paths and inconsistent behavior.

5. **SALLY column is informational only:** Badges display status (Active, Invited, No Access, Deactivated). The "Invite to SALLY" action lives in the Actions dropdown — not inline in the status column.

6. **Invitation model shared with customers:** The `UserInvitation` table has both `driverId` and `customerId` optional FKs, allowing the same invitation infrastructure for both driver and customer onboarding.

7. **"More Details" progressive disclosure:** Matches the Vehicle form pattern — required fields visible, optional fields in a collapsible section that auto-expands when data exists.

8. **No separate Team page for drivers:** The Fleet page's Drivers tab integrates SALLY access management. The admin/team page handles non-driver team members separately.

---

## Status Legend

| Badge | Meaning |
|-------|---------|
| ACTIVE (default) | Driver is active in fleet |
| INACTIVE (muted) | Driver is deactivated |
| SALLY Active | Has linked user account |
| SALLY Invited | Pending invitation |
| SALLY No Access | No user or invitation |

---

## Future Work (Not Yet Implemented)
- Driver search/filter by name, CDL class, status
- Bulk driver operations (batch activate, batch deactivate)
- Driver-to-vehicle assignment UI
- Medical card expiry notifications/alerts
- HOS violation history tracking
- Driver performance metrics
- E2E tests for driver lifecycle
- Email sending for invitations (currently creates invitation record only)
- Resend invitation UI
