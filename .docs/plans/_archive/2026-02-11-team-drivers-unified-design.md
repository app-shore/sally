# Team & Drivers Unified Design

**Date:** February 11, 2026
**Status:** Approved
**Supersedes:** Parts of `2026-01-30-user-management-design.md` (Team/Drivers sections)

## Problem Statement

The current system has two separate pages — **Team (`/users`)** and **Drivers (`/drivers`)** — that manage overlapping concerns. When a driver is "activated" on the Drivers page, it only flips a status flag but doesn't create a user account or send an invitation. Drivers have no way to actually log into the system.

**Core issues:**
1. Activating a driver doesn't create login access
2. Two separate pages for managing people creates confusion
3. No clear bridge between "fleet driver" and "system user"
4. Drivers tab under Team sidebar and Drivers under Fleet overlap in purpose

## Design Decisions

1. **Team page** = "Who can access SALLY?" (all system users)
2. **Fleet → Drivers page** = "Who are our fleet drivers?" (operational/fleet view)
3. **"Invite to SALLY" on Fleet Drivers** bridges the two
4. **One-click Activate & Invite** for pending TMS-synced drivers
5. **Minimal signup** — driver just sets password (info pre-filled from fleet data)
6. **No new database tables** — existing User, Driver, UserInvitation models have all needed relationships

## Architecture

### Page Structure

**Team (`/team`)** — User account management
- **Staff tab**: Admins + Dispatchers
- **Drivers tab**: Drivers with SALLY user accounts
- **Invitations tab**: All pending invitations (staff + drivers)

**Fleet → Drivers (`/drivers`)** — Fleet/operational management
- **All Drivers tab**: All drivers with SALLY Access status column
- **Pending Activation tab**: TMS-synced drivers not yet activated
- **Inactive tab**: Deactivated drivers

### SALLY Access Status (on Fleet Drivers)

| State | Badge | Meaning |
|-------|-------|---------|
| `Active` | Green | Has user account, can log in |
| `Invited` | Yellow | Invitation sent, waiting to accept |
| `No Access` | Gray | Not invited, no user account |
| `Deactivated` | Red | Had access, now deactivated |

**Derived from:**
- User exists with matching driverId → Active or Deactivated (based on isActive)
- UserInvitation exists with matching driverId + status=PENDING → Invited
- Otherwise → No Access

## End-to-End Driver Onboarding Flow

```
1. Driver enters system (TMS sync or manual add)
   └─ Fleet → Drivers page, status: PENDING or ACTIVE
   └─ Has: name, driverId, license, phone, email
   └─ Does NOT have: user account, login access
   └─ Badge: "No SALLY Access"

2. Admin clicks "Invite to SALLY" (or "Activate & Invite" for pending)
   └─ Validates driver has email (prompts if missing)
   └─ Creates UserInvitation (role=DRIVER, linked to driver)
   └─ Sends invitation email
   └─ Badge changes to "Invited"
   └─ Shows in Team → Invitations tab

3. Driver receives email
   └─ Welcome message + "Set Up Your Account" button
   └─ Link: /auth/accept-invite?token=xxx
   └─ Expires in 7 days

4. Driver sets up account
   └─ Pre-filled (read-only): Name, Email, Company
   └─ Driver enters: Password, Confirm Password
   └─ System creates Firebase auth account
   └─ Calls POST /invitations/accept with token + firebaseUid
   └─ Creates User record linked to Driver record
   └─ If driver was PENDING_ACTIVATION → set ACTIVE
   └─ Redirects to driver dashboard

5. Driver is active
   └─ Can log in with email + password
   └─ Sees driver-specific dashboard
   └─ Appears in Team → Drivers tab
   └─ Fleet → Drivers shows "SALLY Access: Active"
```

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| Driver has no email | "Invite to SALLY" prompts admin to enter email first |
| Invitation expires (7 days) | Admin can resend from Team → Invitations |
| Driver already has account | "Invite" button replaced with "SALLY Access: Active" badge |
| Driver deactivated in Fleet | User account also deactivated (linked) |
| User removed from Team | Driver remains in Fleet but loses SALLY access |
| TMS removes driver | Driver marked "Removed from Source" in Fleet, user stays until admin deactivates |

## UI Design

### Team Page (`/team`)

#### Page Header
- Title: "Team"
- Subtitle: "Manage your team's access to SALLY"
- Primary action: "+ Invite" button (opens invite dialog)
- Tabs: Staff | Drivers | Invitations (count badge)

#### Staff Tab
Columns: Name, Email, Role (badge), Status (badge), Last Login, Actions (menu)

Row actions:
- Edit role (not for Owner)
- Deactivate / Activate
- Remove from team

Action button: "+ Invite Staff"

#### Drivers Tab
Shows only drivers with SALLY user accounts.

Columns: Name, Driver ID, Email, Source (badge), Status (badge), Actions (menu)

Row actions:
- View in Fleet (link to Fleet → Drivers)
- Deactivate access / Reactivate access
- Remove from team

Hint text: "To invite more drivers, go to Fleet → Drivers" (with link)

#### Invitations Tab
All pending invitations (staff + drivers).

Columns: Name, Email, Role (badge), Invited By, Sent (relative), Expires (countdown), Actions

Actions: Resend, Cancel
Visual: Warning indicator when < 2 days until expiry

#### Invite Staff Dialog
Fields: First Name, Last Name, Email, Role (Admin/Dispatcher only)
Note: "To add drivers, use Fleet → Drivers"
Actions: Cancel, Send Invitation

### Fleet → Drivers Page (`/drivers`)

#### Page Header
- Title: "Drivers"
- Subtitle: "Manage your fleet's drivers"
- Actions: "+ Add Driver", "Sync TMS"
- Tabs: All Drivers | Pending Activation (count) | Inactive

#### All Drivers Tab
Columns: Name, Driver ID, Source (badge), SALLY Access (status badge), License, Actions

Actions per SALLY Access state:
- No Access → Primary "Invite to SALLY" button (prominent, not in menu)
- Active → Menu: View profile, Deactivate access
- Invited → Menu: Resend invitation, Cancel invitation
- Deactivated → Menu: Reactivate access

#### Pending Activation Tab
Columns: Name, Driver ID, Source, Synced At, Actions

Per-row actions:
- "Activate" → Fleet-active only, no SALLY login
- "Activate & Invite" → Fleet-active + sends SALLY invitation

Bulk actions: "Activate All", "Activate & Invite All"

#### Inactive Tab
Columns: Name, Driver ID, Deactivated By, Deactivated At, Reason, Actions

Action: "Reactivate"

#### Invite to SALLY Dialog (on Drivers page)
Pre-filled from driver record (read-only): Name, Email (if exists), Role (Driver, auto-set)
If no email: shows editable email field
Note: "An invitation email will be sent. [Name] will set a password to log in."
Actions: Cancel, Send Invitation

## Backend Changes

### New Endpoints

#### POST /api/v1/drivers/:driver_id/activate-and-invite
- Activates driver (status → ACTIVE) AND creates invitation in one transaction
- Body: `{ email?: string }` (only needed if driver has no email)
- Response: `{ driver, invitation }`
- Roles: OWNER, ADMIN

#### POST /api/v1/invitations/:invitationId/resend
- Generates new token, resets 7-day expiry, sends new email
- Response: updated invitation
- Roles: OWNER, ADMIN

### Modified Endpoints

#### GET /api/v1/drivers
- Include User relation (to check if user account exists)
- Include UserInvitation relation (to check for pending invitation)
- Add `sallyAccessStatus` field to response: 'ACTIVE' | 'INVITED' | 'NO_ACCESS' | 'DEACTIVATED'
- Add `linkedUserId` and `invitationId` when applicable

#### POST /api/v1/invitations/accept
- Existing logic PLUS: if invitation has driverId AND driver.status === PENDING_ACTIVATION, set driver.status = ACTIVE and driver.activatedAt = now

### Service Changes

**DriversActivationService — new method:**
```typescript
async activateAndInvite(driverId: string, email: string | undefined, invitedBy: User) {
  return this.prisma.$transaction(async (tx) => {
    // 1. Find driver, validate status
    // 2. Update email if provided
    // 3. Set driver status = ACTIVE, activatedAt, activatedBy
    // 4. Create UserInvitation (role=DRIVER, driverId linked)
    // 5. Send invitation email
    // 6. Return { driver, invitation }
  });
}
```

**InvitationsService — new method:**
```typescript
async resendInvitation(invitationId: string, tenantId: number) {
  // 1. Find invitation, validate PENDING status
  // 2. Generate new token (nanoid)
  // 3. Reset expiresAt = now + 7 days
  // 4. Send new invitation email
  // 5. Return updated invitation
}
```

**InvitationsService — modified accept:**
```typescript
async acceptInvitation(token: string, firebaseUid: string) {
  // Existing logic PLUS:
  // If invitation.driverId exists:
  //   const driver = await tx.driver.findUnique(...)
  //   if (driver.status === 'PENDING_ACTIVATION') {
  //     await tx.driver.update({ status: 'ACTIVE', activatedAt: now })
  //   }
}
```

### Frontend Route Changes

| Old | New | Notes |
|-----|-----|-------|
| `/users` | `/team` | Renamed route + updated nav |
| `/drivers` | `/drivers` | Stays the same (under Fleet) |
| Nav: "Team" → `/users` | Nav: "Team" → `/team` | Label stays, route changes |
| Nav: "Drivers" (top-level) | Removed | Drivers only under Fleet section |

### No Database Changes Required

Existing schema already supports this design:
- `User.driverId` → Links user account to driver
- `UserInvitation.driverId` → Links invitation to driver
- `Driver.status` → PENDING_ACTIVATION, ACTIVE, INACTIVE, etc.
- SALLY access status is derived from User + UserInvitation relations

## Implementation Order

1. **Backend: New endpoints** — activate-and-invite, resend
2. **Backend: Modify drivers list** — include SALLY access status
3. **Backend: Modify invitation accept** — auto-activate pending drivers
4. **Frontend: Redesign Team page** — 3 tabs (Staff, Drivers, Invitations)
5. **Frontend: Update Fleet Drivers page** — SALLY Access column, Invite dialog
6. **Frontend: Route/Nav changes** — /users → /team, remove duplicate nav entry
7. **Testing: End-to-end flow** — TMS sync → Activate & Invite → Accept → Login
