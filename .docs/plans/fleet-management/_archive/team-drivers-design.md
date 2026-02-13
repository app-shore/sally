# Team & Drivers Unified - Design Specification

**Status:** Implemented
**Domain:** Fleet Management > Drivers & Team
**Last Validated Against Code:** 2026-02-12
**Source Plans:** `_archive/2026-02-11-team-drivers-unified-design.md`

---

## Current State

| Capability | Status |
|---|---|
| Drivers CRUD (create, list, get, update, delete) | Implemented |
| Driver activation/deactivation/reactivation lifecycle | Implemented |
| SALLY access status derived from User/UserInvitation | Implemented |
| "Invite to SALLY" (activateAndInvite) endpoint | Implemented |
| Pending/Inactive driver views | Implemented |
| TMS-synced drivers (read-only in UI) | Implemented |
| InviteDriverDialog component | Implemented |
| Fleet page with Drivers tab + SALLY access column | Implemented |
| HOS endpoint per driver | Implemented |
| Team page (admin/team) for system users | Separate (not in scope) |

---

## 1. Purpose

This design addresses the relationship between "Fleet Drivers" (operational driver records from TMS or manual entry) and "Team Members" (SALLY platform users). The core insight is that these are two different views of overlapping data:

- **Fleet Drivers** = Operational records (name, license, HOS, vehicle assignments). Source of truth is TMS or manual entry.
- **Team Members** = SALLY user accounts with login credentials and roles.

The bridge between them is the "Invite to SALLY" action, which creates a UserInvitation linked to a Driver, and when accepted, creates a User linked to that Driver.

---

## 2. SALLY Access Status (Derived, Not Stored)

The `sally_access_status` field is computed at query time from the existence and state of related User/UserInvitation records. It is NOT a column in the Driver table.

| Status | Derivation Logic | UI Display |
|---|---|---|
| `ACTIVE` | Driver has a linked User (`user.driverId = driver.id`) with active status | Green "Active" badge |
| `INVITED` | Driver has a pending UserInvitation (`invitation.driverId = driver.id`, not expired) | "Invited" badge + link to manage |
| `DEACTIVATED` | Driver has a linked User that is deactivated | Red "Deactivated" badge |
| `NO_ACCESS` | No linked User and no pending invitation | "Invite to SALLY" button |

**Backend implementation (validated):** The `listDrivers` endpoint in the drivers controller computes this by joining on User and UserInvitation tables, returning `sally_access_status`, `linked_user_id`, and `pending_invitation_id` fields.

---

## 3. Driver Onboarding Pipeline

### Full Flow: TMS Sync to SALLY Access

```
1. TMS Sync imports driver record
   (name, license, phone, email from TMS)
   Driver.status = 'active'
   sally_access_status = NO_ACCESS
        |
        v
2. Dispatcher clicks "Invite to SALLY"
   Calls POST /drivers/:id/activate-and-invite
        |
        v
3. Backend creates UserInvitation
   invitation.role = DRIVER
   invitation.driverId = driver.id
   invitation.token = crypto random
   invitation.expiresAt = now + 7 days
   sally_access_status = INVITED
        |
        v
4. Driver receives invitation (email placeholder)
   Clicks link with token
        |
        v
5. Driver accepts invitation
   POST /auth/accept-invitation
   Creates User with driverId linkage
   sally_access_status = ACTIVE
```

### Manual Driver Creation Flow

```
1. Dispatcher creates driver via POST /drivers
   (name, license_number, phone, email)
        |
        v
2. Same from step 2 above
```

---

## 4. Data Model Relationships

### No New Tables Required

The design leverages existing tables with FK relationships:

```
Driver
  |-- User (optional, via User.driverId)
  |-- UserInvitation (optional, via UserInvitation.driverId)
  |-- Load[] (via Load.driverId)
  |-- RoutePlan[] (via RoutePlan.driverId)
```

### Key Driver Model Fields (Validated Against Schema)

```prisma
model Driver {
  id              Int       @id @default(autoincrement())
  driverId        String    // Business ID (from TMS or generated)
  name            String
  phone           String?
  email           String?
  licenseNumber   String?
  licenseState    String?
  status          DriverStatus  @default(ACTIVE)

  // Activation tracking
  activatedAt     DateTime?
  deactivatedAt   DateTime?
  deactivatedBy   String?
  deactivationReason String?

  // External sync
  externalDriverId  String?
  externalSource    IntegrationVendor?
  lastSyncedAt      DateTime?

  // HOS cache
  currentHosDuty    Float?
  currentHosDrive   Float?
  currentHosCycle   Float?
  hosLastUpdated    DateTime?
  eldProvider       String?
  eldDriverId       String?
  eldMetadata       Json?

  // Relationships
  user            User?         // Linked SALLY user account
  invitations     UserInvitation[]
  routePlans      RoutePlan[]
  loads           Load[]
  tenantId        Int
}

enum DriverStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  TERMINATED
}
```

### UserInvitation Model (Relevant Fields)

```prisma
model UserInvitation {
  id        Int       @id @default(autoincrement())
  email     String
  role      UserRole
  token     String    @unique
  expiresAt DateTime
  driverId  Int?      // Optional FK to Driver
  customerId Int?     // Optional FK to Customer
  tenantId  Int
}
```

---

## 5. TMS-Synced Driver Rules

When a driver has `externalSource` set (synced from TMS):

1. **Read-only in UI:** Edit and Delete buttons are disabled with lock icon and tooltip explaining the driver is TMS-synced
2. **Can still invite to SALLY:** The invitation flow works regardless of data source
3. **Sync badge:** Shows vendor label (e.g., "Samsara ELD", "McLeod", "Truckbase TMS") with link icon
4. **Manual drivers:** Show "Manual" badge with hand icon, fully editable

---

## 6. Endpoint Summary

### Drivers Controller

**File:** `apps/backend/src/domains/fleet/drivers/controllers/drivers.controller.ts`

| Method | Route | Purpose | Status |
|---|---|---|---|
| GET | `/drivers` | List drivers with sally_access_status | Implemented |
| POST | `/drivers` | Create manual driver | Implemented |
| GET | `/drivers/:id` | Get single driver | Implemented |
| PUT | `/drivers/:id` | Update driver | Implemented |
| DELETE | `/drivers/:id` | Delete driver | Implemented |
| GET | `/drivers/:id/hos` | Get driver HOS data | Implemented |
| GET | `/drivers/pending/list` | List pending drivers | Implemented |
| GET | `/drivers/inactive/list` | List inactive drivers | Implemented |
| POST | `/drivers/:id/activate` | Activate driver | Implemented |
| POST | `/drivers/:id/deactivate` | Deactivate driver | Implemented |
| POST | `/drivers/:id/reactivate` | Reactivate driver | Implemented |
| POST | `/drivers/:id/activate-and-invite` | Activate + create SALLY invitation | Implemented |

---

## 7. Design Decisions

1. **Derived status, not stored:** `sally_access_status` is computed at query time rather than stored as a column. This avoids sync issues between the Driver table and User/UserInvitation tables, and ensures the status is always accurate.

2. **Single "Invite to SALLY" action:** Rather than separate "activate" and "invite" steps, the `activate-and-invite` endpoint combines both operations atomically.

3. **No separate Team page for drivers:** The Fleet page's Drivers tab serves as the driver management interface with SALLY access integrated. The admin/team page handles non-driver team members separately.

4. **TMS drivers are read-only:** This prevents manual edits that would be overwritten on the next sync cycle, avoiding data conflicts.

5. **Invitation model shared with customers:** The `UserInvitation` table has both `driverId` and `customerId` optional FKs, allowing the same invitation infrastructure to serve both driver and customer onboarding flows.
