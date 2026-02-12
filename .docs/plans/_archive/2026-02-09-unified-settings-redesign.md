# Unified Settings Redesign — Complete Design & Refactoring Plan

> Consolidates preferences, operations settings, and alert configuration into one clean settings experience with sidebar navigation, proper domain alignment, and descriptive UX.

**Created:** February 9, 2026
**Status:** Design (Pending Approval)
**Replaces:** `2026-02-07-preferences-consolidation-design.md` (partially — schema stays, UI/architecture changes)
**Audience:** Product Owner, Full-Stack Engineer

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Design Decisions](#2-design-decisions)
3. [Information Architecture](#3-information-architecture)
4. [Backend Domain Refactoring](#4-backend-domain-refactoring)
5. [Database & Schema Changes](#5-database--schema-changes)
6. [API Route Consolidation](#6-api-route-consolidation)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Settings Sidebar Navigation](#8-settings-sidebar-navigation)
9. [Section-by-Section UI Specs](#9-section-by-section-ui-specs)
10. [Helper Text Reference](#10-helper-text-reference)
11. [Migration & Refactoring Plan](#11-migration--refactoring-plan)
12. [What Gets Deleted](#12-what-gets-deleted)
13. [Files Manifest](#13-files-manifest)

---

## 1. Problem Statement

### What's Wrong Today

| # | Problem | Severity |
|---|---------|----------|
| 1 | **HOS Compliance Thresholds** (warning/critical %) are under "Route Planning" in Operations settings — but they control *when alerts fire*, not how routes are planned | High |
| 2 | **Settings are scattered across 2 separate pages** (`/settings/preferences` and `/settings/operations`) with no shared navigation | High |
| 3 | **DispatcherPreferencesTab duplicates Operations page** — same HOS/route settings appear in both places | High |
| 4 | **No descriptions or helper text** — a dispatcher sees "Drive Hours Warning %" with zero context about what 75% means in practice | High |
| 5 | **Too many small cards** on one screen — UserPreferencesTab has 7 cards, Operations has 5 per tab = visual overload | Medium |
| 6 | **Frontend/backend domain misalignment** — `FleetOperationsSettings` model mixes route planning fields with alert threshold fields (`delayThresholdMinutes`, `hosApproachingPct`, `costOverrunPct`) | Medium |
| 7 | **Frontend feature folder** (`features/platform/preferences/`) owns everything — user prefs, operations settings, driver prefs, AND alert config — no clean separation | Medium |
| 8 | **Alert config uses a different API prefix** (`/settings/alerts`) than operations settings (`/preferences/operations`) — inconsistent | Low |

### What We Want

- **One settings experience** with sidebar navigation — each section gets its own focused view
- **Every setting has a description** — plain English explaining what it does
- **HOS thresholds move to Alerts** — because they control alert triggers
- **Frontend/backend domains align** — settings-related code lives in one clean domain
- **No duplicate UI** — DispatcherPreferencesTab goes away
- **Clean implementation** — no debt, proper structure from the start

---

## 2. Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Navigation pattern | **Sidebar nav** within settings | Scales well, one focused view per section, matches GitHub/Linear/Slack settings pattern |
| Page structure | **Single `/settings` route** with sidebar sub-navigation | All settings under one URL prefix, sidebar controls which section is visible |
| HOS thresholds | **Move to `AlertConfiguration` model** | They control when alerts fire. Route planner doesn't use them — alert generation does |
| `FleetOperationsSettings.delayThresholdMinutes/hosApproachingPct/costOverrunPct` | **Move to `AlertConfiguration.alertTypes` thresholds** | These are alert trigger thresholds, not route planning settings |
| DispatcherPreferencesTab | **Delete entirely** | Duplicate of Operations page content |
| Backend domain | **Keep `platform/preferences`** module, consolidate alert-threshold fields into `AlertConfiguration` | Minimal disruption — just move fields, don't reorganize entire module structure |
| Frontend feature folder | **Rename to `features/platform/settings`** | "Settings" is the correct umbrella term for prefs + operations + alerts config |
| Driver settings | **Separate sidebar section** visible only to drivers | Drivers see: General, Notifications, Route Display |
| Helper text | **Inline below each control** | Descriptive text in `text-muted-foreground`, 1-2 sentences max |

---

## 3. Information Architecture

### Sidebar Sections (Dispatcher/Admin/Owner)

```
Settings
├── General                    ← Personal display, dashboard, accessibility
├── Notifications              ← Personal alert delivery, sound, quiet hours
├── Operations                 ← Company-wide route defaults (tenant-level)
├── Alerts                     ← Company-wide alert rules & thresholds (tenant-level)
├── Integrations               ← External system connections (existing)
└── API Keys                   ← API access management (existing)
```

### Sidebar Sections (Driver)

```
Settings
├── General                    ← Break prefs, communication, mobile
├── Notifications              ← Personal alert delivery, sound, quiet hours
└── Route Display              ← Timeline view, reasoning, cost details
```

### Sidebar Sections (Super Admin)

```
Settings
├── Notifications              ← New tenant/status change notifications
└── Profile                    ← Personal info
```

### What Lives Where

| Setting Group | Section | Scope | Who Can Edit |
|--------------|---------|-------|-------------|
| Distance, time, temp, currency, timezone, date format | **General** | Per-user | Any user |
| Auto-refresh, default view, compact mode, high contrast | **General** | Per-user | Any user |
| Font size, reduce motion, screen reader | **General** | Per-user | Any user |
| Alert channels (per-priority), min priority, categories | **Notifications** | Per-user | Any user |
| Sound settings (per-priority), browser notifs, flash tab | **Notifications** | Per-user | Any user |
| Quiet hours, snooze duration, email digest | **Notifications** | Per-user | Any user |
| HOS default hours (drive, on-duty, since-break) | **Operations** | Per-tenant | Admin, Owner |
| Optimization mode, cost/mile, labor cost/hr | **Operations** | Per-tenant | Admin, Owner |
| Rest stop preferences (full rest, dock rest, buffer) | **Operations** | Per-tenant | Admin, Owner |
| Fuel stop preferences (price threshold, max detour) | **Operations** | Per-tenant | Admin, Owner |
| Load/driver/vehicle assignment defaults | **Operations** | Per-tenant | Admin, Owner |
| Report preferences (timezone, map, recipients) | **Operations** | Per-tenant | Admin, Owner |
| HOS compliance thresholds (warning %, critical %) | **Alerts** | Per-tenant | Admin, Owner |
| Alert types (enabled, mandatory, per-type thresholds) | **Alerts** | Per-tenant | Admin, Owner |
| Default notification channels (org-wide) | **Alerts** | Per-tenant | Admin, Owner |
| Alert grouping (dedup, driver grouping, cascading) | **Alerts** | Per-tenant | Admin, Owner |
| Delay threshold, cost overrun % | **Alerts** | Per-tenant | Admin, Owner |
| Break prefs, timeline view, mobile, communication | **General** (driver) | Per-user | Driver |
| Preferred rest/fuel stops | **Route Display** (driver) | Per-user | Driver |

### What Moved

| Setting | From | To | Why |
|---------|------|----|-----|
| `driveHoursWarningPct` | FleetOperationsSettings → Operations | AlertConfiguration → Alerts | Controls when HOS warning alerts fire |
| `driveHoursCriticalPct` | FleetOperationsSettings → Operations | AlertConfiguration → Alerts | Controls when HOS critical alerts fire |
| `onDutyWarningPct` | FleetOperationsSettings → Operations | AlertConfiguration → Alerts | Controls when on-duty warning alerts fire |
| `onDutyCriticalPct` | FleetOperationsSettings → Operations | AlertConfiguration → Alerts | Controls when on-duty critical alerts fire |
| `sinceBreakWarningPct` | FleetOperationsSettings → Operations | AlertConfiguration → Alerts | Controls when break warning alerts fire |
| `sinceBreakCriticalPct` | FleetOperationsSettings → Operations | AlertConfiguration → Alerts | Controls when break critical alerts fire |
| `delayThresholdMinutes` | FleetOperationsSettings → Operations | AlertConfiguration → Alerts | Controls when delay alerts fire |
| `hosApproachingPct` | FleetOperationsSettings → Operations | AlertConfiguration → Alerts | Controls when HOS approaching alerts fire |
| `costOverrunPct` | FleetOperationsSettings → Operations | AlertConfiguration → Alerts | Controls when cost overrun alerts fire |

---

## 4. Backend Domain Refactoring

### Current Backend Structure

```
domains/platform/preferences/
├── preferences.module.ts                          ← Registers 4 controllers + 4 services
├── user-preferences.controller.ts                 ← /preferences/user, /preferences/driver
├── user-preferences.service.ts                    ← CRUD for UserPreferences + DriverPreferences
├── operations-settings.controller.ts              ← /preferences/operations
├── operations-settings.service.ts                 ← CRUD for FleetOperationsSettings
├── alert-config.controller.ts                     ← /settings/alerts
├── alert-config.service.ts                        ← CRUD for AlertConfiguration
├── super-admin-preferences.controller.ts          ← /preferences/admin
├── super-admin-preferences.service.ts             ← CRUD for SuperAdminPreferences
└── dto/
    ├── user-preferences.dto.ts
    ├── driver-preferences.dto.ts
    ├── operations-settings.dto.ts
    ├── alert-config.dto.ts
    └── super-admin-preferences.dto.ts
```

### Target Backend Structure

**The module is renamed from `platform/preferences` to `platform/settings`** with these changes:

1. **Rename folder** `preferences/` → `settings/`
2. **Rename module** `PreferencesModule` → `SettingsModule` (file: `settings.module.ts`)
3. **Rename controller routes** for consistency — all under `/settings/` prefix
4. **Move alert threshold fields** from `FleetOperationsSettings` to `AlertConfiguration`
5. **Update DTOs** to reflect field moves

```
domains/platform/settings/
├── settings.module.ts                             ← Renamed from preferences.module.ts (SettingsModule)
├── user-preferences.controller.ts                 ← Routes: /settings/general, /settings/notifications
├── user-preferences.service.ts                    ← Same (no change)
├── operations-settings.controller.ts              ← Route: /settings/operations
├── operations-settings.service.ts                 ← Remove threshold fields from defaults
├── alert-config.controller.ts                     ← Route: /settings/alerts (same)
├── alert-config.service.ts                        ← Add threshold fields to defaults
├── super-admin-preferences.controller.ts          ← Route: /settings/admin (same prefix)
├── super-admin-preferences.service.ts             ← Same (no change)
└── dto/
    ├── user-preferences.dto.ts                    ← Same (no change)
    ├── driver-preferences.dto.ts                  ← Same (no change)
    ├── operations-settings.dto.ts                 ← Remove 9 threshold fields
    ├── alert-config.dto.ts                        ← Remove complianceThresholds (thresholds merged into alertTypes)
    └── super-admin-preferences.dto.ts             ← Same (no change)
```

### Route Changes

| Current Route | New Route | Why |
|--------------|-----------|-----|
| `GET/PUT /preferences/user` | `GET/PUT /settings/general` | Cleaner naming under unified `/settings/` prefix |
| `GET/PUT /preferences/driver` | `GET/PUT /settings/driver` | Consistent prefix |
| `POST /preferences/reset` | `POST /settings/reset` | Consistent prefix |
| `GET/PUT /preferences/operations` | `GET/PUT /settings/operations` | "Operations" matches what it actually configures |
| `POST /preferences/operations/reset` | `POST /settings/operations/reset` | Consistent |
| `GET /preferences/operations/defaults` | `GET /settings/operations/defaults` | Consistent |
| `GET/PUT /settings/alerts` | `GET/PUT /settings/alerts` | **No change** — already correct |
| `GET/PUT /preferences/admin` | `GET/PUT /settings/admin` | Consistent prefix |

**Backward compatibility:** Add redirect aliases for old routes during transition (if any external consumers exist). For a POC with no external consumers, just change them.

### DTO Changes

#### `operations-settings.dto.ts` — Remove 9 Fields

Remove these fields (they move to AlertConfiguration):
```typescript
// REMOVE from UpdateOperationsSettingsDto:
driveHoursWarningPct
driveHoursCriticalPct
onDutyWarningPct
onDutyCriticalPct
sinceBreakWarningPct
sinceBreakCriticalPct
delayThresholdMinutes
hosApproachingPct
costOverrunPct
```

#### `alert-config.dto.ts` — Simplified (No complianceThresholds)

`complianceThresholds` has been **removed**. All threshold values are now stored as part of `alertTypes` entries. The DTO only contains: `alertTypes`, `escalationPolicy`, `groupingConfig`, `defaultChannels`.

#### `alert-config.service.ts` — Unified Alert Types

All compliance thresholds have been **merged into `alertTypes`** as individual entries. No separate `complianceThresholds` object exists. Alert types are grouped:

- **HOS Compliance**: `HOS_DRIVE_WARNING` (75%), `HOS_DRIVE_CRITICAL` (90%), `HOS_ON_DUTY_WARNING` (75%), `HOS_ON_DUTY_CRITICAL` (90%), `HOS_BREAK_WARNING` (75%), `HOS_BREAK_CRITICAL` (90%), `HOS_APPROACHING_LIMIT` (85%), `CYCLE_APPROACHING_LIMIT` (300 min)
- **Route & Schedule**: `ROUTE_DELAY` (30 min), `DRIVER_NOT_MOVING` (120 min), `APPOINTMENT_AT_RISK` (30 min), `MISSED_APPOINTMENT` (mandatory, no threshold), `DOCK_TIME_EXCEEDED` (60 min)
- **Cost & Resources**: `COST_OVERRUN` (10%), `FUEL_LOW` (20%)

---

## 5. Database & Schema Changes

### `AlertConfiguration` — No `complianceThresholds` Column

The `complianceThresholds` column has been **removed**. All threshold data lives inside the `alertTypes` JSON column as individual alert type entries.

```prisma
model AlertConfiguration {
  id              Int       @id @default(autoincrement())
  tenantId        Int       @unique @map("tenant_id")

  alertTypes      Json      @map("alert_types")
  escalationPolicy Json     @map("escalation_policy")
  groupingConfig  Json      @map("grouping_config")
  defaultChannels Json      @map("default_channels")

  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  tenant          Tenant    @relation(fields: [tenantId], references: [id])

  @@map("alert_configurations")
}
```

**Note:** The `complianceThresholds` column has been **removed** from the schema. All threshold values are stored as entries in the `alertTypes` JSON column (e.g., `HOS_DRIVE_WARNING: { enabled: true, mandatory: true, thresholdPercent: 75 }`).

### `FleetOperationsSettings` — Remove Threshold Columns

```prisma
model FleetOperationsSettings {
  id                        Int       @id @default(autoincrement())
  tenantId                  Int       @unique @map("tenant_id")
  tenant                    Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // HOS Defaults (STAYS — these are route planning inputs)
  defaultDriveHours         Float     @default(0.0)      @map("default_drive_hours")
  defaultOnDutyHours        Float     @default(0.0)      @map("default_on_duty_hours")
  defaultSinceBreakHours    Float     @default(0.0)      @map("default_since_break_hours")

  // REMOVED: driveHoursWarningPct, driveHoursCriticalPct (moved to AlertConfiguration)
  // REMOVED: onDutyWarningPct, onDutyCriticalPct (moved to AlertConfiguration)
  // REMOVED: sinceBreakWarningPct, sinceBreakCriticalPct (moved to AlertConfiguration)

  // Optimization Defaults (STAYS)
  defaultOptimizationMode   String    @default("BALANCE") @map("default_optimization_mode") @db.VarChar(30)
  costPerMile               Float     @default(1.85)     @map("cost_per_mile")
  laborCostPerHour          Float     @default(25.0)     @map("labor_cost_per_hour")

  // Rest Insertion Preferences (STAYS)
  preferFullRest            Boolean   @default(true)     @map("prefer_full_rest")
  restStopBuffer            Int       @default(30)       @map("rest_stop_buffer")
  allowDockRest             Boolean   @default(true)     @map("allow_dock_rest")
  minRestDuration           Int       @default(7)        @map("min_rest_duration")

  // Fuel Preferences (STAYS)
  fuelPriceThreshold        Float     @default(0.15)     @map("fuel_price_threshold")
  maxFuelDetour             Int       @default(10)       @map("max_fuel_detour")
  minFuelSavings            Float     @default(10.0)     @map("min_fuel_savings")

  // Route Planning Defaults (STAYS)
  defaultLoadAssignment     String    @default("MANUAL") @map("default_load_assignment") @db.VarChar(30)
  defaultDriverSelection    String    @default("AUTO_SUGGEST") @map("default_driver_selection") @db.VarChar(30)
  defaultVehicleSelection   String    @default("AUTO_ASSIGN") @map("default_vehicle_selection") @db.VarChar(30)

  // REMOVED: delayThresholdMinutes (moved to AlertConfiguration)
  // REMOVED: hosApproachingPct (moved to AlertConfiguration)
  // REMOVED: costOverrunPct (moved to AlertConfiguration)

  // Report Preferences (STAYS)
  reportTimezone            String    @default("America/New_York") @map("report_timezone") @db.VarChar(100)
  includeMapInReports       Boolean   @default(true)     @map("include_map_in_reports")
  reportEmailRecipients     Json      @default("[]")     @map("report_email_recipients")

  createdAt                 DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt                 DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  @@index([tenantId])
  @@map("operations_settings")
}
```

### Migrations

Three migrations handle the threshold consolidation:

1. **`20260209100000_add_compliance_thresholds_to_alert_config`** — Added `compliance_thresholds` JSONB column (intermediate step)
2. **`20260209100100_remove_threshold_fields_from_operations_settings`** — Dropped 9 threshold columns from `operations_settings`
3. **`20260209120000_remove_compliance_thresholds_column`** — Dropped `compliance_thresholds` column (thresholds now live inside `alert_types` JSON as individual alert type entries)

**Final state:** All thresholds are entries in the `alert_types` JSON column. No separate threshold columns or JSON fields exist.

---

## 6. API Route Consolidation

### Final API Surface

All routes under `/settings/` prefix:

```
# Personal Settings (any authenticated user)
GET    /settings/general                    ← UserPreferences
PUT    /settings/general                    ← Update UserPreferences
GET    /settings/driver                     ← DriverPreferences (driver role)
PUT    /settings/driver                     ← Update DriverPreferences
POST   /settings/reset                      ← Reset to defaults { scope: 'general' | 'driver' }

# Tenant Settings (admin/owner edit, dispatcher read)
GET    /settings/operations                 ← FleetOperationsSettings
PUT    /settings/operations                 ← Update FleetOperationsSettings
POST   /settings/operations/reset           ← Reset to defaults
GET    /settings/operations/defaults        ← Get default values

# Alert Configuration (admin/owner edit, dispatcher read)
GET    /settings/alerts                     ← AlertConfiguration (alertTypes, escalation, grouping, channels)
PUT    /settings/alerts                     ← Update AlertConfiguration

# Super Admin
GET    /settings/admin                      ← SuperAdminPreferences
PUT    /settings/admin                      ← Update SuperAdminPreferences
```

### Frontend API Client Changes

```typescript
// OLD                                    // NEW
'/preferences/user'                    →  '/settings/general'
'/preferences/driver'                  →  '/settings/driver'
'/preferences/reset'                   →  '/settings/reset'
'/preferences/operations'             →  '/settings/operations'
'/preferences/operations/reset'       →  '/settings/operations/reset'
'/settings/alerts'                    →  '/settings/alerts'          // (no change)
'/preferences/admin'                  →  '/settings/admin'
```

---

## 7. Frontend Architecture

### Current Frontend Structure

```
features/platform/preferences/           ← Feature folder
├── api.ts                               ← All API calls + interfaces
├── store.ts                             ← Zustand store
├── types.ts                             ← Just PreferencesResetResponse
├── index.ts                             ← Exports
└── hooks/use-preferences.ts             ← React Query hooks

app/settings/
├── preferences/
│   ├── page.tsx                         ← Role-based tab switcher
│   └── components/
│       ├── UserPreferencesTab.tsx        ← 552 lines, 7 cards
│       ├── DispatcherPreferencesTab.tsx  ← 298 lines (DUPLICATE of operations)
│       └── DriverPreferencesTab.tsx      ← 252 lines
├── operations/
│   └── page.tsx                         ← 725 lines, 2 tabs
├── integrations/
│   └── page.tsx                         ← 29 lines
└── api-keys/
    └── page.tsx                         ← 262 lines
```

### Target Frontend Structure

```
features/platform/settings/              ← Renamed from "preferences"
├── api.ts                               ← Updated routes + interfaces
├── store.ts                             ← Same store, updated API calls
├── types.ts                             ← Updated types
├── index.ts                             ← Updated exports
└── hooks/use-settings.ts               ← Renamed, same pattern

app/settings/
├── layout.tsx                           ← NEW: Settings layout with sidebar
├── general/
│   └── page.tsx                         ← Display + Dashboard + Accessibility
├── notifications/
│   └── page.tsx                         ← Alert delivery + Sound + Browser + Quiet Hours
├── operations/
│   └── page.tsx                         ← HOS defaults + Optimization + Rest + Fuel
├── alerts/
│   └── page.tsx                         ← Thresholds + Alert types + Channels + Grouping
├── integrations/
│   └── page.tsx                         ← Same (no change)
└── api-keys/
    └── page.tsx                         ← Same (no change)
```

### What Gets Deleted

```
DELETED: app/settings/preferences/                        ← Entire directory
DELETED: app/settings/preferences/page.tsx               ← Role-based tab switcher (replaced by layout.tsx)
DELETED: app/settings/preferences/components/UserPreferencesTab.tsx        ← Split into general/ + notifications/
DELETED: app/settings/preferences/components/DispatcherPreferencesTab.tsx  ← DUPLICATE, removed
DELETED: app/settings/preferences/components/DriverPreferencesTab.tsx      ← Merged into general/ (driver variant)
DELETED: app/settings/operations/page.tsx (old)           ← Replaced by new operations/ + alerts/
```

---

## 8. Settings Sidebar Navigation

### Layout Component (`app/settings/layout.tsx`)

```
┌─────────────────────────────────────────────────────────────────┐
│  Settings                                                        │
│                                                                  │
│  ┌──────────────┬──────────────────────────────────────────────┐ │
│  │              │                                              │ │
│  │  PERSONAL    │  {children}                                  │ │
│  │  General  ●  │                                              │ │
│  │  Notific.    │  (Page content rendered here based on        │ │
│  │              │   current route)                             │ │
│  │  ORGANIZATION│                                              │ │
│  │  Route Plan. │                                              │ │
│  │  Alerts      │                                              │ │
│  │              │                                              │ │
│  │  CONNECTIONS │                                              │ │
│  │  Integrations│                                              │ │
│  │  API Keys    │                                              │ │
│  │              │                                              │ │
│  └──────────────┴──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Sidebar Groups (Role-Based Visibility)

```typescript
const settingsSections = [
  {
    label: 'Personal',
    items: [
      { label: 'General', href: '/settings/general', icon: Settings },
      { label: 'Notifications', href: '/settings/notifications', icon: Bell },
    ],
    // Visible to ALL authenticated users
  },
  {
    label: 'Organization',
    items: [
      { label: 'Operations', href: '/settings/operations', icon: Route },
      { label: 'Alerts', href: '/settings/alerts', icon: AlertTriangle },
    ],
    // Visible to DISPATCHER (read-only), ADMIN, OWNER
    roles: ['DISPATCHER', 'ADMIN', 'OWNER'],
  },
  {
    label: 'Connections',
    items: [
      { label: 'Integrations', href: '/settings/integrations', icon: Plug },
      { label: 'API Keys', href: '/settings/api-keys', icon: Key },
    ],
    // Visible to ADMIN, OWNER
    roles: ['ADMIN', 'OWNER'],
  },
];
```

### Driver Sidebar (Different Sections)

```typescript
const driverSettingsSections = [
  {
    label: 'Personal',
    items: [
      { label: 'General', href: '/settings/general', icon: Settings },
      { label: 'Notifications', href: '/settings/notifications', icon: Bell },
      { label: 'Route Display', href: '/settings/driver', icon: Map },
    ],
  },
];
```

### Mobile Behavior

On mobile (`< md` breakpoint):
- Sidebar collapses into a horizontal scroll strip at top (like iOS Settings categories)
- Or: dropdown selector to pick section
- Content area takes full width below

### Main Sidebar Navigation Update

In `navigation.ts`, replace the three separate settings links with one:

```typescript
// BEFORE (dispatcher):
{ label: 'Operations', href: '/settings/operations', icon: Route },
{ label: 'Integrations', href: '/settings/integrations', icon: Plug },
{ label: 'Preferences', href: '/settings/preferences', icon: Settings },

// AFTER (dispatcher):
{ label: 'Settings', href: '/settings/general', icon: Settings },
```

One link in the main sidebar → opens settings with its own internal sidebar navigation. Same pattern for all roles.

---

## 9. Section-by-Section UI Specs

### 9a. General (`/settings/general`)

**Page header:** "General — Personalize how Sally looks and feels."

**Cards:**

1. **Units & Formats** — Distance, Time Format, Temperature, Currency, Date Format, Timezone
2. **Dashboard** — Auto Refresh, Default View, Compact Mode, High Contrast
3. **Accessibility** — Font Size, Reduce Motion, Screen Reader

**For drivers**, this page ALSO shows:
4. **Break Preferences** — Preferred Break Duration, Break Reminder Advance
5. **Mobile** — Large Text Mode, Offline Mode, Data Usage Mode
6. **Communication** — Emergency Contact, Preferred Contact Method

**Buttons:** `[Reset to Defaults]` `[Save Changes]`

### 9b. Notifications (`/settings/notifications`)

**Page header:** "Notifications — Control how and when you receive alerts. These are your personal preferences — they override your organization's defaults."

**Cards:**

1. **Delivery Channels** — Per-priority grid (Critical/High/Medium/Low × In-App/Email/Push/SMS), Minimum Priority filter
2. **Sound** — Per-priority sound toggles (Critical enforced)
3. **Browser** — Desktop Notifications toggle, Flash Tab on Critical toggle
4. **Quiet Hours** — Enable toggle, Start/End time inputs, "Critical alerts are never suppressed"
5. **Snooze & Digest** — Default Snooze Duration, Email Digest Frequency

**Buttons:** `[Reset to Defaults]` `[Save Changes]`

### 9c. Operations (`/settings/operations`)

**Page header:** "Operations — Company-wide defaults for how Sally plans routes. These apply to all dispatchers unless overridden per-route."

**Role badge:** Shows "Admin · Owner" when user can edit, "Read Only" for dispatchers.

**Cards:**

1. **HOS Defaults** — Drive Hours Available, On-Duty Hours Available, Since Last Break
2. **Optimization** — Default Mode, Cost Per Mile, Labor Cost Per Hour
3. **Rest Stops** — Prefer Full Rest, Allow Dock Rest, Rest Stop Buffer, Min Rest Duration
4. **Fuel Stops** — Fuel Price Threshold, Max Fuel Detour, Min Fuel Savings
5. **Assignment Defaults** — Load Assignment, Driver Selection, Vehicle Selection
6. **Reporting** — Report Timezone, Include Map in Reports, Email Recipients

**Buttons:** `[Reset to Defaults]` `[Save Changes]` (hidden for read-only users)

### 9d. Alerts (`/settings/alerts`)

**Page header:** "Alerts — Configure when and how your organization's alerts are triggered. Individual users can customize their own notification preferences separately."

**Role badge:** Same as Operations.

**Cards:**

1. **Alert Types** — Unified list of all alert types grouped by category (HOS Compliance, Route & Schedule, Cost & Resources). Each row has: label, description, threshold input (% or min), enable/disable toggle, mandatory badge. **No separate Trigger Thresholds card** — all thresholds are inline on each alert type.
2. **Default Channels** — Org-wide per-priority channel grid (what users inherit as defaults)
3. **Grouping** — Dedup Window, Group Same Type Per Driver, Smart Group Across Drivers, Link Cascading Alerts

**Buttons:** `[Reset to Defaults]` `[Save Changes]` (hidden for read-only users)

---

## 10. Helper Text Reference

Every setting gets descriptive helper text displayed in `text-muted-foreground` below the control.

### General — Units & Formats

| Setting | Helper Text |
|---------|-------------|
| Distance Unit | How distances are shown on routes and trip summaries. |
| Time Format | Applies to ETAs, schedules, and alert timestamps. |
| Temperature Unit | Used in weather alerts and route condition reports. |
| Currency | Fuel costs, route costs, and financial reports. |
| Date Format | How dates appear throughout the app. |
| Timezone | All times displayed in this timezone unless overridden per route. |

### General — Dashboard

| Setting | Helper Text |
|---------|-------------|
| Auto Refresh | How often the dashboard pulls fresh data. Lower intervals use more bandwidth. Set to "Manual" to refresh only when you click. |
| Default View | The view shown when you first open the dashboard. |
| Compact Mode | Reduces spacing to fit more information on screen. Best for large monitors. |
| High Contrast | Increases contrast for better readability in bright environments. |

### General — Accessibility

| Setting | Helper Text |
|---------|-------------|
| Font Size | Adjusts text size across the entire app. |
| Reduce Motion | Minimizes animations and transitions for users sensitive to motion. |
| Screen Reader | Optimizes layout and labels for assistive technology like JAWS or VoiceOver. |

### Notifications — Delivery Channels

| Setting | Helper Text |
|---------|-------------|
| Channel Grid | Choose how you want to be reached for each alert priority level. Your organization requires in-app for critical alerts (shown with lock icon). |
| Minimum Priority | Alerts below this priority are hidden from your dashboard. You'll still receive critical alerts regardless. |

### Notifications — Sound

| Setting | Helper Text |
|---------|-------------|
| Sound Toggles | Play a tone when alerts arrive while Sally is open. Sound is always enabled for critical alerts. |

### Notifications — Browser

| Setting | Helper Text |
|---------|-------------|
| Desktop Notifications | Show system notifications when an alert arrives and Sally is not your active browser tab. Requires browser permission. |
| Flash Tab on Critical | Blink the browser tab title to get your attention when a critical alert arrives and you're on another tab. |

### Notifications — Quiet Hours

| Setting | Helper Text |
|---------|-------------|
| Enable Quiet Hours | Suppress push notifications and alert sounds during off-hours. Critical alerts are never suppressed — they always come through. |
| Start / End | The time window when notifications are silenced. Uses your timezone setting from General. |

### Notifications — Snooze & Digest

| Setting | Helper Text |
|---------|-------------|
| Default Snooze | When you snooze an alert, this is how long it stays silenced before reappearing. |
| Email Digest | Receive a summary of alerts via email. "Never" means no digest emails — you'll only get individual alert emails based on your channel settings above. |

### Operations — HOS Defaults

| Setting | Helper Text |
|---------|-------------|
| Drive Hours Available | Starting hours assumed when no live HOS data is available (e.g., new driver, Samsara integration down). Out of 11-hour FMCSA limit. |
| On-Duty Hours Available | Starting on-duty hours assumed when live data unavailable. Out of 14-hour FMCSA limit. |
| Since Last Break | Hours since last 30-minute break assumed when live data unavailable. 8-hour limit. |

### Operations — Optimization

| Setting | Helper Text |
|---------|-------------|
| Default Mode | How Sally prioritizes when planning multi-stop routes. "Minimize Time" finds the fastest route. "Minimize Cost" finds the cheapest. "Balance" weighs both. Can be overridden per route. |
| Cost Per Mile | Your fleet's average operating cost per mile (fuel, maintenance, tires). Used for route cost estimates. |
| Labor Cost Per Hour | Average driver labor cost per hour. Used when comparing time vs. distance trade-offs in route optimization. |

### Operations — Rest Stops

| Setting | Helper Text |
|---------|-------------|
| Prefer Full Rest | When a rest stop is needed, prefer the full 10-hour off-duty period over a shorter 7-hour sleeper berth split. Safer but adds more time. |
| Allow Dock Rest | Count time spent waiting at a dock toward rest requirements when HOS rules allow it. Reduces unnecessary stops but requires accurate dock time estimates. |
| Rest Stop Buffer | Extra time (in minutes) added before the HOS limit to ensure drivers aren't cutting it close. Higher = more safety margin. |
| Min Rest Duration | Minimum rest period Sally will insert. 7 hours = sleeper berth provision, 10 hours = full off-duty rest. |

### Operations — Fuel Stops

| Setting | Helper Text |
|---------|-------------|
| Fuel Price Threshold | Only suggest fuel stops at stations priced below this relative to the area average. Set high to see all options. |
| Max Fuel Detour | Furthest Sally will route off-path for a cheaper fuel stop. |
| Min Fuel Savings | Minimum dollar savings required to justify a fuel stop detour. |

### Operations — Assignment Defaults

| Setting | Helper Text |
|---------|-------------|
| Load Assignment | How loads are assigned to routes. "Manual" = dispatcher picks. "Auto Assign" = Sally suggests based on route fit. |
| Driver Selection | How drivers are matched to routes. "Manual" = dispatcher picks. "Auto Suggest" = Sally recommends based on availability and HOS. |
| Vehicle Selection | How vehicles are matched to routes. "Manual" = dispatcher picks. "Auto Assign" = Sally assigns based on capacity. "Driver Default" = use driver's assigned vehicle. |

### Operations — Reporting

| Setting | Helper Text |
|---------|-------------|
| Report Timezone | Timezone used in generated reports and exported data. |
| Include Map | Include a route map image in PDF and email reports. |
| Email Recipients | Email addresses that receive automatic route completion and daily summary reports. |

### Alerts — Alert Types (Unified)

All alert types are displayed in one card, grouped by category. Each row has: label, description, threshold input, enable/disable toggle.

| Alert Type | Description | Threshold |
|-----------|-------------|-----------|
| Drive Hours — Warning | Warning when a driver has used this % of their 11-hour drive limit. Example: 75% = alert at 8h 15m. | 75% |
| Drive Hours — Critical | Critical alert at this % of the 11-hour drive limit. Example: 90% = alert at 9h 54m. | 90% |
| On-Duty — Warning | Warning when approaching the 14-hour on-duty window. Example: 75% = alert at 10h 30m. | 75% |
| On-Duty — Critical | Critical alert for the 14-hour on-duty window. Example: 90% = alert at 12h 36m. | 90% |
| Break Required — Warning | Warning when approaching the 8-hour limit since last 30-min break. Example: 75% = alert at 6h. | 75% |
| Break Required — Critical | Critical alert for the 8-hour break limit. Example: 90% = alert at 7h 12m. | 90% |
| HOS Approaching Limit | General alert when a driver is nearing any HOS limit. Works with live ELD data. | 85% |
| Cycle Approaching Limit | Alert when remaining minutes in the 60/70-hour cycle window drop below threshold. | 300 min |
| Route Delay | Alert when a driver falls behind their scheduled arrival by this many minutes. | 30 min |
| Driver Not Moving | Alert when a driver has been stationary for this many minutes during an active route. | 120 min |
| Appointment at Risk | Alert when the ETA puts a pickup or delivery at risk of being missed. | 30 min |
| Missed Appointment | Fires when a driver misses their scheduled window. Cannot be disabled (mandatory). | — |
| Dock Time Exceeded | Alert when time at a dock exceeds the planned dwell time. | 60 min |
| Cost Overrun | Alert when actual route cost exceeds the planned cost by this percentage. | 10% |
| Fuel Low | Alert when estimated fuel tank level drops below this percentage of capacity. | 20% |

### Alerts — Default Channels

| Setting | Helper Text |
|---------|-------------|
| Channel Grid | Organization-wide defaults for how alerts are delivered to your team. Individual team members can override these in their own Notification preferences. Critical in-app is always required. |

### Alerts — Grouping

| Setting | Helper Text |
|---------|-------------|
| Dedup Window | Suppress duplicate alerts for the same driver and type within this window. Prevents alert flooding. |
| Group Same Type Per Driver | Combine repeated alerts (e.g., multiple HOS warnings for one driver) into a single grouped alert instead of separate notifications. |
| Smart Group Across Drivers | If multiple drivers trigger the same alert type around the same time, show one summary alert instead of individual ones. |
| Link Cascading Alerts | When one alert causes another (e.g., a delay leads to an HOS warning), link them together so dispatchers see the chain of events. |

### Driver — Break Preferences

| Setting | Helper Text |
|---------|-------------|
| Preferred Break Duration | Your preferred break length when Sally inserts breaks into your route. |
| Break Reminder Advance | How many minutes before your break is due to send you a reminder. |

### Driver — Route Display

| Setting | Helper Text |
|---------|-------------|
| Timeline View | How your route timeline is displayed. Vertical shows stops top-to-bottom. Horizontal shows left-to-right. |
| Show Rest Reasoning | Show Sally's explanation for why each rest stop was inserted (e.g., "HOS limit approaching after 420 miles"). |
| Show Cost Details | Show fuel cost and total route cost breakdowns on your route view. |

### Driver — Mobile

| Setting | Helper Text |
|---------|-------------|
| Large Text Mode | Increases text and button sizes for easier reading while driving. |
| Offline Mode | Cache route data for areas with poor cell coverage. Uses more device storage. |
| Data Usage | Controls how much data Sally uses. "Low" minimizes map tile downloads and disables real-time updates. |

### Driver — Communication

| Setting | Helper Text |
|---------|-------------|
| Emergency Contact | Phone number to contact in case of emergency. Shared with dispatchers. |
| Preferred Contact | How dispatchers should reach you. "In-App" = dispatch messages. "SMS" = text messages. "Phone" = voice call. |

---

## 11. Migration & Refactoring Plan

### Phase 1: Backend (No Frontend Changes Yet)

**Goal:** Move threshold fields, update routes, keep old routes as aliases temporarily.

1. **Prisma migration** — Remove `compliance_thresholds` column from `alert_configurations` (thresholds merged into `alert_types` JSON), remove 9 columns from `operations_settings`
2. **Update `alert-config.service.ts`** — Merge all thresholds into `alertTypes` entries (15 alert types with `thresholdPercent`/`thresholdMinutes`), update defaults
3. **Update `alert-config.dto.ts`** — Remove `complianceThresholds` field (only `alertTypes`, `escalationPolicy`, `groupingConfig`, `defaultChannels` remain)
4. **Update `operations-settings.dto.ts`** — Remove 9 threshold fields
5. **Update `operations-settings.service.ts`** — Remove threshold fields from defaults
6. **Update controller routes** — Change route prefixes (`/preferences/*` → `/settings/*`)
7. **Update any backend consumers** — Check if alert-generation or monitoring reads thresholds from `FleetOperationsSettings` and redirect to `AlertConfiguration.alertTypes`

### Phase 2: Frontend Feature Folder

**Goal:** Rename feature folder, update API routes, update types.

1. **Rename** `features/platform/preferences/` → `features/platform/settings/`
2. **Update `api.ts`** — Change all endpoint URLs
3. **Update `store.ts`** — Same store logic, import paths change
4. **Update `types.ts`** — Update `OperationsSettings` interface (remove 9 fields), update `AlertConfiguration` (no `complianceThresholds` — thresholds live in `alertTypes`)
5. **Update `index.ts`** — Update exports
6. **Update `hooks/use-preferences.ts`** → rename to `hooks/use-settings.ts`
7. **Update all imports** across the app that reference `features/platform/preferences`

### Phase 3: Frontend Settings UI

**Goal:** Build the new sidebar layout and section pages.

1. **Create `app/settings/layout.tsx`** — Settings layout with sidebar navigation
2. **Create `app/settings/general/page.tsx`** — Pulls from UserPreferencesTab (display + dashboard + accessibility)
3. **Create `app/settings/notifications/page.tsx`** — Pulls from UserPreferencesTab (alert delivery + sound + browser + quiet hours + snooze)
4. **Create `app/settings/operations/page.tsx`** — Pulls from Operations page (minus thresholds)
5. **Create `app/settings/alerts/page.tsx`** — Pulls from Operations page Alerts tab + adds threshold fields
6. **Add helper text** to every setting (from Section 10)
7. **Update `navigation.ts`** — Replace 3 settings links with single "Settings" link

### Phase 4: Cleanup

**Goal:** Delete old files and verify nothing references them.

1. **Delete** `app/settings/preferences/` (entire directory)
2. **Delete** `app/settings/operations/` (entire directory)
3. **Delete** old feature folder `features/platform/preferences/` (if rename didn't move in place)
4. **Verify** no broken imports (`npx tsc --noEmit`)
5. **Verify** all routes work

### Phase 5: Driver Settings

**Goal:** Handle driver-specific settings within the new architecture.

1. **Update `app/settings/general/page.tsx`** — Detect driver role and show additional cards (Break, Mobile, Communication)
2. **Create `app/settings/driver/page.tsx`** — Route Display settings (timeline, reasoning, costs, preferred stops)
3. **Update sidebar** — Show "Route Display" link for drivers

---

## 12. What Gets Deleted

| File/Directory | Reason |
|---------------|--------|
| `app/settings/preferences/` (entire dir) | Replaced by `general/` + `notifications/` + `driver/` |
| `app/settings/preferences/page.tsx` | Role-switching replaced by settings layout |
| `app/settings/preferences/components/UserPreferencesTab.tsx` | Split into `general/page.tsx` + `notifications/page.tsx` |
| `app/settings/preferences/components/DispatcherPreferencesTab.tsx` | Duplicate of operations page — deleted entirely |
| `app/settings/preferences/components/DriverPreferencesTab.tsx` | Merged into `general/page.tsx` (driver variant) + `driver/page.tsx` |
| `app/settings/operations/page.tsx` (old) | Replaced by new `operations/page.tsx` + `alerts/page.tsx` |

### Database Columns Dropped

| Column | Table | Reason |
|--------|-------|--------|
| `drive_hours_warning_pct` | `operations_settings` | Moved to `alert_configurations.alert_types` → `HOS_DRIVE_WARNING.thresholdPercent` |
| `drive_hours_critical_pct` | `operations_settings` | Moved to `alert_configurations.alert_types` → `HOS_DRIVE_CRITICAL.thresholdPercent` |
| `on_duty_warning_pct` | `operations_settings` | Moved to `alert_configurations.alert_types` → `HOS_ON_DUTY_WARNING.thresholdPercent` |
| `on_duty_critical_pct` | `operations_settings` | Moved to `alert_configurations.alert_types` → `HOS_ON_DUTY_CRITICAL.thresholdPercent` |
| `since_break_warning_pct` | `operations_settings` | Moved to `alert_configurations.alert_types` → `HOS_BREAK_WARNING.thresholdPercent` |
| `since_break_critical_pct` | `operations_settings` | Moved to `alert_configurations.alert_types` → `HOS_BREAK_CRITICAL.thresholdPercent` |
| `delay_threshold_minutes` | `operations_settings` | Moved to `alert_configurations.alert_types` → `ROUTE_DELAY.thresholdMinutes` |
| `hos_approaching_pct` | `operations_settings` | Moved to `alert_configurations.alert_types` → `HOS_APPROACHING_LIMIT.thresholdPercent` |
| `cost_overrun_pct` | `operations_settings` | Moved to `alert_configurations.alert_types` → `COST_OVERRUN.thresholdPercent` |

---

## 13. Files Manifest

### Backend — Modified

| # | File | Change |
|---|------|--------|
| 1 | `prisma/schema.prisma` | Remove `complianceThresholds` column from AlertConfiguration, remove 9 cols from FleetOperationsSettings |
| 2 | `settings/alert-config.service.ts` | Merge thresholds into `alertTypes` entries (15 types), update defaults and CRUD |
| 3 | `settings/alert-config.dto.ts` | Remove `complianceThresholds` (only alertTypes, escalationPolicy, groupingConfig, defaultChannels) |
| 4 | `settings/operations-settings.service.ts` | Remove 9 threshold fields from defaults |
| 5 | `settings/operations-settings.dto.ts` | Remove 9 threshold field validators |
| 6 | `settings/user-preferences.controller.ts` | Change route prefix to `/settings/general` |
| 7 | `settings/operations-settings.controller.ts` | Change route prefix to `/settings/operations` |
| 8 | `settings/alert-config.controller.ts` | Already `/settings/alerts` — verify no change needed |
| 9 | `settings/super-admin-preferences.controller.ts` | Change route prefix to `/settings/admin` |

### Backend — Verify (may need updates)

| # | File | Check |
|---|------|-------|
| 10 | `operations/alerts/services/alert-generation.service.ts` | Verify it reads thresholds from AlertConfiguration, not FleetOperationsSettings |
| 11 | `operations/notifications/channel-resolution.service.ts` | Verify no dependency on FleetOperationsSettings threshold fields |

### Frontend — Modified

| # | File | Change |
|---|------|--------|
| 12 | `features/platform/settings/api.ts` | Rename from preferences, update routes |
| 13 | `features/platform/settings/store.ts` | Rename, update imports |
| 14 | `features/platform/settings/types.ts` | Update OperationsSettings, AlertConfiguration types |
| 15 | `features/platform/settings/index.ts` | Update exports |
| 16 | `features/platform/settings/hooks/use-settings.ts` | Rename from use-preferences |
| 17 | `shared/lib/navigation.ts` | Replace 3 settings links with 1 |

### Frontend — Created

| # | File | Purpose |
|---|------|---------|
| 18 | `app/settings/layout.tsx` | Settings shell with sidebar navigation |
| 19 | `app/settings/general/page.tsx` | Display + Dashboard + Accessibility (+ driver cards) |
| 20 | `app/settings/notifications/page.tsx` | Alert delivery + Sound + Browser + Quiet Hours + Snooze |
| 21 | `app/settings/operations/page.tsx` | HOS defaults + Optimization + Rest + Fuel + Assignment + Reports |
| 22 | `app/settings/alerts/page.tsx` | Thresholds + Alert Types + Default Channels + Grouping |
| 23 | `app/settings/driver/page.tsx` | Route Display settings (driver only) |

### Frontend — Deleted

| # | File | Reason |
|---|------|--------|
| 24 | `app/settings/preferences/` (entire dir) | Replaced by new structure |
| 25 | `app/settings/operations/` (entire dir) | Replaced by new structure |

### Import Updates Required

Every file that imports from `@/features/platform/preferences` needs updating to `@/features/platform/settings`. Run:

```bash
grep -r "features/platform/preferences" apps/web/src/ --files-with-matches
```

Then update each import path.

---

## Appendix: Impact on Existing Plans

### Plans That Remain Valid
- `2026-02-07-preferences-consolidation-design.md` — Schema consolidation (UserPreferences model) is **done** and unaffected. The channel resolution pipeline is valid.
- `2026-02-07-preferences-consolidation-implementation.md` — Steps 1-6 (backend) are **done**. Steps 7-8 (frontend UI) are **superseded** by this plan.
- `2026-02-06-alerts-notifications-full-implementation.md` — Alerts Center page, Notifications page, and alert detail dialog are **unaffected**. This plan only changes settings/configuration pages.

### Plans Superseded
- Frontend UI portions of `2026-02-07-preferences-consolidation-implementation.md` (Steps 7a, 7b, 8) — replaced by this plan's Phase 3.
- The old Operations page at `/settings/operations` — completely replaced by new `/settings/operations` (redesigned) and `/settings/alerts`.

---

## Summary

This redesign achieves:

1. **One settings experience** — sidebar navigation, one focused view per section
2. **Correct domain placement** — HOS thresholds under Alerts where they belong
3. **Every setting has context** — descriptive helper text for 60+ settings
4. **Frontend/backend alignment** — `/settings/*` routes, `features/platform/settings/` folder
5. **No duplication** — DispatcherPreferencesTab eliminated
6. **Clean schema** — threshold fields live in `AlertConfiguration` (JSON), route planning fields stay in `FleetOperationsSettings` (columns)
7. **Role-appropriate views** — drivers see their sections, dispatchers see read-only org settings, admins see everything
8. **Zero debt** — proper structure from day one
