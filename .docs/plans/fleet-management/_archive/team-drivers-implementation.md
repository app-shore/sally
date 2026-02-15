# Team & Drivers Unified - Implementation Reference

**Status:** Implemented
**Domain:** Fleet Management > Drivers & Team
**Last Validated Against Code:** 2026-02-12
**Source Plans:** `_archive/2026-02-11-team-drivers-unified-implementation.md`

---

## 1. Implementation Summary

The original plan outlined 12 implementation tasks. Here is the status of each:

| # | Task | Status | Notes |
|---|---|---|---|
| 1 | activateAndInvite method in DriversService | Implemented | POST /drivers/:id/activate-and-invite |
| 2 | Controller endpoint for activate-and-invite | Implemented | drivers.controller.ts |
| 3 | resendInvitation method | Implemented | Via invitation service |
| 4 | Modify listDrivers to include SALLY access status | Implemented | Joins on User + UserInvitation |
| 5 | Modify acceptInvitation to auto-activate driver | Implemented | Links User to Driver on accept |
| 6 | Frontend Driver types with sally_access_status | Implemented | Driver type includes status fields |
| 7 | InviteDriverDialog component | Implemented | invite-driver-dialog.tsx |
| 8 | Rebuild Fleet Drivers page with SALLY access column | Implemented | Fleet page Drivers tab |
| 9 | Rebuild Team page with 3 tabs (Active, Invitations, Deactivated) | Partially Implemented | Admin team page exists separately |
| 10 | Navigation route updates | Implemented | /dispatcher/fleet route |
| 11 | Backend verification | Implemented | Schema tests exist |
| 12 | E2E visual verification | Not Implemented | No E2E tests for this flow |

---

## 2. Backend Implementation

### Drivers Controller

**File:** `apps/backend/src/domains/fleet/drivers/controllers/drivers.controller.ts`

**Key endpoint details:**

**GET /drivers (listDrivers):**
- Returns all drivers for the tenant
- Each driver includes computed fields:
  - `sally_access_status`: 'ACTIVE' | 'INVITED' | 'DEACTIVATED' | 'NO_ACCESS'
  - `linked_user_id`: ID of linked User (if exists)
  - `pending_invitation_id`: ID of pending UserInvitation (if exists)
- Joins on User and UserInvitation tables to derive status

**POST /drivers/:id/activate-and-invite:**
- Role: DISPATCHER, ADMIN, OWNER
- Flow:
  1. Finds driver by ID
  2. Activates driver if not already active
  3. Creates UserInvitation with role=DRIVER, driverId=driver.id
  4. Generates unique token with 7-day expiry
  5. Returns invitation details

**POST /drivers/:id/activate:**
- Sets `Driver.status = ACTIVE`, sets `activatedAt`

**POST /drivers/:id/deactivate:**
- Sets `Driver.status = INACTIVE`, sets `deactivatedAt`, `deactivatedBy`, `deactivationReason`

**POST /drivers/:id/reactivate:**
- Sets `Driver.status = ACTIVE`, clears deactivation fields

**GET /drivers/pending/list:**
- Returns drivers with pending status

**GET /drivers/inactive/list:**
- Returns drivers with inactive/suspended/terminated status

---

## 3. Frontend Implementation

### Fleet Page: `/dispatcher/fleet/page.tsx`

**File:** `apps/web/src/app/dispatcher/fleet/page.tsx`

**Structure:**
```
Fleet Management
├── [Drivers] tab
│   ├── TMS integration alert (if synced drivers exist)
│   ├── Driver table with columns:
│   │   ├── Name (+ phone)
│   │   ├── License Number
│   │   ├── Source (TMS badge or Manual badge)
│   │   ├── SALLY Access (status badge or Invite button)
│   │   ├── Last Synced
│   │   └── Actions (Edit/Delete or locked for TMS)
│   └── Add Driver dialog
└── [Assets] tab
    ├── [Trucks] / [Trailers] / [Equipment] segmented control
    ├── Truck table (similar to drivers)
    └── Trailers + Equipment: "Coming Soon" placeholders
```

### SALLY Access Column Behavior

The SALLY Access column renders differently based on status:

```typescript
// ACTIVE: Green badge
driver.sally_access_status === 'ACTIVE'
  -> <Badge variant="default">Active</Badge>

// INVITED: Muted badge + link to manage
driver.sally_access_status === 'INVITED'
  -> <Badge variant="muted">Invited</Badge>
  -> <Link href="/admin/team?tab=invitations">Manage invite</Link>

// DEACTIVATED: Red badge
driver.sally_access_status === 'DEACTIVATED'
  -> <Badge variant="destructive">Deactivated</Badge>

// NO_ACCESS: Invite button
(!driver.sally_access_status || driver.sally_access_status === 'NO_ACCESS')
  -> <Button onClick={() => onInviteClick(driver)}>Invite to SALLY</Button>
```

### InviteDriverDialog

**File:** `apps/web/src/features/fleet/drivers/components/invite-driver-dialog.tsx`

Dialog that:
1. Takes a `driver` prop (the driver to invite)
2. Shows driver name and email
3. Confirms the invitation action
4. Calls the activate-and-invite endpoint
5. Closes dialog on success

### TMS-Synced Driver Handling

When `driver.external_source` is truthy:
- Source column shows linked badge with vendor label (via `getSourceLabel` helper)
- Edit and Delete buttons are disabled with `Lock` icon and `cursor-not-allowed`
- Tooltip explains: "Read-only - synced from {vendor}"
- "Sync Now" button available (triggers refresh)

When `driver.external_source` is falsy:
- Source column shows "Manual" badge
- Edit and Delete fully functional
- Edit opens same DriverForm dialog in edit mode

### Source Label Mapping

```typescript
const labels: Record<string, string> = {
  mock_samsara: 'Samsara ELD',
  mock_truckbase_tms: 'Truckbase TMS',
  samsara_eld: 'Samsara ELD',
  keeptruckin_eld: 'KeepTruckin',
  motive_eld: 'Motive',
  mcleod_tms: 'McLeod',
};
```

---

## 4. Driver Form Component

**Location:** Inline in `apps/web/src/app/dispatcher/fleet/page.tsx`

Fields:
- Name (required)
- License Number (required)
- Phone (optional)
- Email (optional)

**Behavior:**
- If `driver` prop is null: create mode (calls `createDriver`)
- If `driver` prop is set: edit mode (calls `updateDriver`)
- On success: closes dialog and refreshes data

---

## 5. File Reference

| File | Purpose |
|---|---|
| `apps/backend/src/domains/fleet/drivers/controllers/drivers.controller.ts` | Driver CRUD + lifecycle endpoints |
| `apps/backend/src/domains/fleet/drivers/services/drivers.service.ts` | Driver business logic |
| `apps/web/src/app/dispatcher/fleet/page.tsx` | Fleet page (Drivers + Assets tabs) |
| `apps/web/src/features/fleet/drivers/components/invite-driver-dialog.tsx` | SALLY invitation dialog |
| `apps/web/src/features/fleet/drivers/index.ts` | Driver feature barrel exports |
| `apps/backend/src/domains/fleet/drivers/__tests__/driver.schema.spec.ts` | Driver schema tests |

---

## 6. What Is Not Built

1. **Dedicated Team page rebuild with 3 tabs** - The admin/team page exists separately but was not specifically rebuilt as part of this feature. The driver-focused SALLY access management lives on the Fleet page.
2. **E2E visual verification tests** - No Playwright or Cypress tests for the driver invitation flow.
3. **Email sending for invitations** - The UserInvitation is created with a token but no actual email is sent. This is an infrastructure dependency that applies across all invitation types.
4. **Resend invitation UI** - The "Manage invite" link navigates to the admin team page, but there is no inline "Resend" button on the Fleet Drivers tab.
