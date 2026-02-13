# Driver Management UX Fixes Design

**Date:** 2026-02-13
**Status:** Approved
**Context:** Post-PR #22 UX audit of driver management feature

## Problems Identified

### 1. Missing "More Details" on Add Driver Dialog
The Vehicle form has a collapsible "More Details" section, but the Driver form only shows 6 required fields. Users cannot enter endorsements, hire date, medical card, emergency contact, home terminal, or notes during creation.

### 2. Inconsistent Edit Flow
- **Table actions dropdown**: Edit hidden for TMS-synced drivers, opens Tier 1 `DriverForm` (basic fields only)
- **Profile page**: Edit always visible (no TMS check), opens Tier 2 `EditDriverDialog` (all fields)
- Two completely different edit experiences depending on where you click

### 3. SALLY Column + Actions Column Redundancy
- SALLY column shows an "Invite" button for NO_ACCESS drivers (acts like an action, not a status)
- Actions dropdown has View Profile, Edit, Delete
- The invite action belongs in the Actions dropdown, not as a button in a status column

### 4. TMS Edit Permissions Missing
- Profile page has no `external_source` check — Edit button always visible
- No concept of partial editing (SALLY-owned vs TMS-synced fields)

### 5. Minor UX Issues
- Driver name uses `<button>` instead of `<Link>` (no right-click "open in new tab")
- No driver count in card header

## Design

### A. Add Driver Dialog — Add "More Details" Collapsible

Keep required fields up top:
- Name, Phone, Email, CDL Class, License Number, License State

Add collapsible "More Details" section (matching Vehicle form pattern):
- **Endorsements** — checkboxes from reference data
- **Compliance Dates** — Hire Date, Medical Card Expiry (2-col grid)
- **Home Terminal** — City, State (2-col grid)
- **Emergency Contact** — Name, Phone (2-col grid)
- **Notes** — textarea

Auto-expand if any optional field is populated (for edit reuse case, though we're removing that path).

### B. Unify Edit to Always Use EditDriverDialog (Tier 2)

- Table action "Edit" opens `EditDriverDialog` (same as profile page)
- Remove the dual-purpose `DriverForm` for editing — it only handles creation now
- Import `EditDriverDialog` into fleet/page.tsx
- Both table and profile page use identical edit experience

### C. TMS Partial Edit — Lock Synced Fields, Allow SALLY-Owned Fields

For TMS-synced drivers:
- Show "Edit Details" everywhere (table actions + profile page)
- In `EditDriverDialog`, accept an `isExternal` prop
- **Locked fields** (disabled + lock icon + "Synced from {source}" note): Name, Phone, Email, CDL Class, License Number, License State
- **Editable fields** (always available): Endorsements, Hire Date, Medical Card Expiry, Home Terminal City/State, Emergency Contact Name/Phone, Notes
- Show info banner at top of dialog: "Some fields are managed by {source} and cannot be edited here."

### D. Clean Up SALLY Column

- SALLY column shows **status badge only** for all states (Active, Invited, Deactivated, No Access)
- Remove the "Invite" button from the SALLY column
- Add "Invite to SALLY" as a menu item in the Actions dropdown (shown only for NO_ACCESS drivers)
- This makes SALLY column purely informational, Actions column the single place for all actions

### E. Minor Fixes

- Replace `<button>` with Next.js `<Link>` for driver name navigation
- Add driver count to card header: "Drivers (12)"

## Files to Modify

1. `apps/web/src/app/dispatcher/fleet/page.tsx` — DriversTab: add More Details to DriverForm, unify edit, fix SALLY column, fix Link, add count
2. `apps/web/src/features/fleet/drivers/components/edit-driver-dialog.tsx` — Add `isExternal`/`externalSource` props, lock TMS fields
3. `apps/web/src/app/dispatcher/fleet/drivers/[driverId]/page.tsx` — Add external_source check for Edit button label

## Out of Scope

- Search/filter on driver list (future enhancement)
- Bulk actions
- Driver assignment to vehicles
