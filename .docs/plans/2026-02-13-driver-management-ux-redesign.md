# Driver Management UX Redesign

**Date:** 2026-02-13
**Status:** Approved
**Approach:** Progressive Enhancement (Approach A)

## Problem

The current driver management UX has 4 fields (Name, License Number, Phone, Email), no CDL info, no compliance tracking, no driver profile page, and a list view that feels like an admin table instead of a dispatch roster. A fleet dispatcher managing 20-50 drivers needs richer data, faster creation, and at-a-glance operational info.

## Design Decisions

- **Create dialog stays Tier 1** (`max-w-lg`) — 5 required fields + 1 optional for fast entry
- **New driver profile page** at `/dispatcher/fleet/drivers/[driverId]` for enrichment fields
- **List view redesigned** as a dispatch roster with HOS bars, vehicle assignment, and CDL badges
- **Email is required** at creation (supports immediate SALLY invite flow)
- **No pay info** in this iteration (core fleet set only)

---

## 1. Data Model Changes

### New Prisma fields on `Driver`

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| `cdlClass` | Enum(`A`, `B`, `C`) | Yes | — | CDL classification |
| `endorsements` | String[] | No | `[]` | Hazmat, Tanker, Doubles/Triples, Passenger, School Bus |
| `hireDate` | DateTime? | No | — | Date driver was hired |
| `medicalCardExpiry` | DateTime? | No | — | FMCSA medical card expiration |
| `homeTerminalCity` | String? | No | — | Home terminal city |
| `homeTerminalState` | String(2)? | No | — | Home terminal state |
| `emergencyContactName` | String? | No | — | Emergency contact full name |
| `emergencyContactPhone` | String? | No | — | Emergency contact phone |
| `notes` | Text? | No | — | Free-text dispatcher notes |

### New enum

```prisma
enum CdlClass {
  A
  B
  C
}
```

### Endorsements values (stored as String[])

`HAZMAT`, `TANKER`, `DOUBLES_TRIPLES`, `PASSENGER`, `SCHOOL_BUS`

### DTO changes

**CreateDriverDto** — required fields become:
- `name` (required)
- `phone` (required)
- `email` (required, validated)
- `cdlClass` (required, enum)
- `licenseNumber` (required)
- `licenseState` (optional, 2-char)

**UpdateDriverDto** — all fields optional, adds all new fields.

---

## 2. Create Driver Dialog (Tier 1)

**Size:** `max-w-lg` (unchanged)

**Fields in order:**
1. Full Name * — `<Input>`
2. Phone * — `<Input type="tel">`
3. Email * — `<Input type="email">`
4. CDL Class * — `<Select>` with options A, B, C
5. License Number * — `<Input>`
6. License State — `<Select>` with US state abbreviations (optional)

**Validation:**
- Name: non-empty
- Phone: non-empty, basic format (allow flexible input)
- Email: valid email format
- CDL Class: must select one
- License Number: non-empty

**No enrichment fields in create dialog.** Those live on the profile page.

---

## 3. Driver List View (Dispatch Roster)

### Columns

| Column | Content | Responsive |
|--------|---------|-----------|
| **Driver** | Name (bold) + Phone (muted, small) | Always visible |
| **CDL** | Badge: `A`, `B`, or `C` | Always visible |
| **Status** | Badge: Active, Inactive, Pending | Always visible |
| **HOS** | Mini progress bar (drive hours / 11h) | Hidden on mobile |
| **Vehicle** | Assigned vehicle name or "Unassigned" (muted) | Hidden on mobile + tablet |
| **Current Load** | Load ref # + status badge, or "—" | Hidden on mobile + tablet |
| **SALLY** | Access badge + Invite button | Hidden on mobile |
| **Actions** | View profile, Edit, Delete (via dropdown menu) | Always visible |

### Removed from current view (moved to profile)
- License Number
- Source badge
- Last Synced

### Interactions
- Click driver name → navigates to profile page
- Click vehicle name → navigates to vehicle detail
- Click load ref → navigates to load detail

### Responsive
- Desktop: all columns
- Tablet: hide Vehicle, Current Load
- Mobile: Driver + CDL + Status + Actions only

---

## 4. Driver Profile Page

**Route:** `/dispatcher/fleet/drivers/[driverId]/page.tsx`

### Header
- Back link to `/dispatcher/fleet`
- Driver name + Status badge
- Edit button (opens Tier 2 edit dialog or inline edit)

### Card sections (2-column grid on desktop, 1-column mobile)

**Personal Info card:**
- Name, Phone, Email
- Emergency Contact (name + phone)

**HOS Status card:**
- Drive Time Remaining (progress bar, X.Xh / 11h)
- Shift Time Remaining (progress bar, X.Xh / 14h)
- Cycle Time Remaining (progress bar, X.Xh / 70h)
- Break Required indicator
- Data source + last sync time
- Auto-refreshes every 60 seconds

**Compliance card:**
- CDL Class (badge)
- License Number + License State
- Endorsements (badge list)
- Medical Card Expiry (date + relative time, red if expired/expiring)
- Hire Date

**Operations card:**
- Home Terminal (city, state)
- Home Terminal Timezone
- Assigned Vehicle (link)
- Current Load (link + status)
- SALLY Access status + invite button if needed

**Notes card (full width):**
- Free-text editable area
- Spans both columns

**Integration & Sync card (full width, only for synced drivers):**
- External Driver ID, Source
- Sync Status, Last Synced
- ELD Metadata summary

### Edit flow
- Edit button opens a Tier 2 dialog (`max-w-2xl`) with 2-column grid layout
- All fields editable (except system fields like sync status)
- Synced driver fields protected by ExternalSourceGuard (same as current)

---

## 5. Validation Summary

### Backend (class-validator)

| Field | Decorators |
|-------|-----------|
| name | `@IsString()`, `@IsNotEmpty()` |
| phone | `@IsString()`, `@IsNotEmpty()` |
| email | `@IsEmail()`, `@IsNotEmpty()` |
| cdlClass | `@IsEnum(CdlClass)`, `@IsNotEmpty()` |
| licenseNumber | `@IsString()`, `@IsNotEmpty()` |
| licenseState | `@IsOptional()`, `@IsString()`, `@Length(2, 2)` |
| endorsements | `@IsOptional()`, `@IsArray()`, `@IsString({ each: true })` |
| hireDate | `@IsOptional()`, `@IsDateString()` |
| medicalCardExpiry | `@IsOptional()`, `@IsDateString()` |
| homeTerminalCity | `@IsOptional()`, `@IsString()` |
| homeTerminalState | `@IsOptional()`, `@IsString()`, `@Length(2, 2)` |
| emergencyContactName | `@IsOptional()`, `@IsString()` |
| emergencyContactPhone | `@IsOptional()`, `@IsString()` |
| notes | `@IsOptional()`, `@IsString()` |

### Frontend
- Required fields show red border + error message on empty submit
- CDL Class uses Select (no free text)
- License State uses Select (no free text)
- Medical Card Expiry uses date picker

---

## 6. Migration Strategy

1. Add new fields to Prisma schema (all nullable except cdlClass which needs a default for existing data)
2. Create migration
3. For existing drivers without cdlClass, default to `A` (most common for trucking)
4. Update DTOs (CreateDriverDto, UpdateDriverDto)
5. Update frontend types
6. Build profile page
7. Redesign list view
8. Update create dialog

---

## Out of Scope

- Pay rate / pay type fields (future iteration)
- Driver photo/avatar
- Document management (license scans, medical card uploads)
- Driver scorecard / performance metrics
- Load history timeline on profile page (future)
