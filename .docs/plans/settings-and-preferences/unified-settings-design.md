# Unified Settings & Preferences -- Design

> **Status:** Implemented | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-02-07-notification-preferences-simplification.md`, `2026-02-07-preferences-consolidation-design.md`, `2026-02-09-unified-settings-redesign.md`

---

## Overview

The Settings domain provides a unified configuration experience for all SALLY users. It covers personal display preferences, alert delivery channels, company-wide route planning defaults, alert threshold configuration, driver-specific preferences, integrations, and API key management -- all under a single `/settings` URL prefix with sidebar navigation.

---

## Architecture

### Three-Layer Preference Model

```
Layer 1: Tenant Defaults (AlertConfiguration)
  WHO SETS: Owner / Admin
  WHAT: Default channels per priority, alert types (enabled/mandatory/thresholds), escalation, grouping
  MODEL: AlertConfiguration

        | provides defaults
        v

Layer 2: User Overrides (UserPreferences)
  WHO SETS: Each dispatcher/user
  WHAT: Per-priority channel overrides, sound, browser, quiet hours
  MODEL: UserPreferences

        | consumed by
        v

Layer 3: Delivery Engine (ChannelResolutionService)
  WHO: System (automatic)
  WHAT: Merges tenant defaults + user overrides -> final delivery channels
  STATUS: Designed, not yet built
```

### Channel Resolution Logic

When an alert fires for a user:

1. Get tenant `AlertConfiguration.defaultChannels[priority]`
2. Get user `UserPreferences.alertChannels[priority]` (if empty, use tenant defaults)
3. If alert type is `mandatory`, ensure in-app is always on
4. If user is in quiet hours, suppress push + sound (except CRITICAL)
5. Final channel list passed to delivery service

---

## Data Models (Validated Against Prisma Schema)

### UserPreferences (Per-User, Personal)

```prisma
model UserPreferences {
  id                        Int       @id @default(autoincrement())
  userId                    Int       @unique @map("user_id")
  user                      User      @relation(...)

  // Display
  distanceUnit              String    @default("MILES")       // MILES | KILOMETERS
  timeFormat                String    @default("12H")         // 12H | 24H
  temperatureUnit           String    @default("F")           // F | C
  currency                  String    @default("USD")
  timezone                  String    @default("America/New_York")
  dateFormat                String    @default("MM/DD/YYYY")

  // Dashboard
  autoRefreshInterval       Int       @default(30)            // seconds, 0 = manual
  defaultView               String    @default("OVERVIEW")    // OVERVIEW | TIMELINE | MAP | COMPLIANCE | COSTS
  compactMode               Boolean   @default(false)
  highContrastMode          Boolean   @default(false)

  // Alert Delivery (per-priority channel overrides)
  alertChannels             Json      @default("{}")           // { "critical": { inApp, email, push, sms }, ... }
  minAlertPriority          String    @default("LOW")
  alertCategories           Json      @default("[\"hos\",\"delay\",\"route\",\"driver\",\"vehicle\",\"external\"]")

  // Sound & Browser
  soundSettings             Json      @default("{\"critical\":true,\"high\":true,\"medium\":false,\"low\":false}")
  browserNotifications      Boolean   @default(true)
  flashTabOnCritical        Boolean   @default(true)

  // Quiet Hours
  quietHoursEnabled         Boolean   @default(false)
  quietHoursStart           String?                           // e.g. "22:00"
  quietHoursEnd             String?                           // e.g. "06:00"

  // Snooze & Digest
  defaultSnoozeDuration     Int       @default(15)            // minutes
  emailDigestFrequency      String    @default("NEVER")

  // Accessibility
  fontSize                  String    @default("MEDIUM")      // SMALL | MEDIUM | LARGE | XL
  reduceMotion              Boolean   @default(false)
  screenReaderOptimized     Boolean   @default(false)

  @@map("user_preferences")
}
```

### FleetOperationsSettings (Per-Tenant, Company-Wide)

```prisma
model FleetOperationsSettings {
  id                        Int       @id @default(autoincrement())
  tenantId                  Int       @unique @map("tenant_id")

  // HOS Defaults (route planning inputs)
  defaultDriveHours         Float     @default(0.0)
  defaultOnDutyHours        Float     @default(0.0)
  defaultSinceBreakHours    Float     @default(0.0)

  // Optimization
  defaultOptimizationMode   String    @default("BALANCE")     // BALANCE | MINIMIZE_TIME | MINIMIZE_COST
  costPerMile               Float     @default(1.85)
  laborCostPerHour          Float     @default(25.0)

  // Rest Insertion
  preferFullRest            Boolean   @default(true)
  restStopBuffer            Int       @default(30)            // minutes
  allowDockRest             Boolean   @default(true)
  minRestDuration           Int       @default(7)             // hours

  // Fuel
  fuelPriceThreshold        Float     @default(0.15)
  maxFuelDetour             Int       @default(10)            // miles
  minFuelSavings            Float     @default(10.0)          // dollars

  // Route Planning Defaults
  defaultLoadAssignment     String    @default("MANUAL")
  defaultDriverSelection    String    @default("AUTO_SUGGEST")
  defaultVehicleSelection   String    @default("AUTO_ASSIGN")

  // Reports
  reportTimezone            String    @default("America/New_York")
  includeMapInReports       Boolean   @default(true)
  reportEmailRecipients     Json      @default("[]")

  @@map("operations_settings")
}
```

**Note:** Threshold fields (`driveHoursWarningPct`, `delayThresholdMinutes`, `hosApproachingPct`, `costOverrunPct`, etc.) have been removed from this model and merged into `AlertConfiguration.alertTypes`.

### AlertConfiguration (Per-Tenant, Alert Rules)

```prisma
model AlertConfiguration {
  id              Int       @id @default(autoincrement())
  tenantId        Int       @unique @map("tenant_id")

  alertTypes      Json      @map("alert_types")         // 15 alert types with thresholds
  escalationPolicy Json     @map("escalation_policy")
  groupingConfig  Json      @map("grouping_config")
  defaultChannels Json      @map("default_channels")    // per-priority: { inApp, email, push, sms }

  @@map("alert_configurations")
}
```

**Note:** No `complianceThresholds` column exists. All thresholds are stored as entries within the `alertTypes` JSON (e.g., `HOS_DRIVE_WARNING: { enabled: true, mandatory: true, thresholdPercent: 75 }`).

### DriverPreferences (Per-User/Driver)

```prisma
model DriverPreferences {
  id                        Int       @id @default(autoincrement())
  userId                    Int       @unique @map("user_id")
  driverId                  Int?      @unique @map("driver_id")

  // Preferred Locations
  preferredRestStops        Json      @default("[]")
  preferredFuelStops        Json      @default("[]")

  // Break Preferences
  preferredBreakDuration    Int       @default(30)            // minutes
  breakReminderAdvance      Int       @default(30)            // minutes

  // Route Display
  timelineView              String    @default("VERTICAL")    // VERTICAL | HORIZONTAL
  showRestReasoning         Boolean   @default(true)
  showCostDetails           Boolean   @default(false)

  // Mobile
  largeTextMode             Boolean   @default(false)
  offlineMode               Boolean   @default(false)
  dataUsageMode             String    @default("NORMAL")      // LOW | NORMAL | HIGH

  // Communication
  emergencyContact          String?
  preferredContactMethod    String    @default("IN_APP")      // IN_APP | SMS | PHONE
  languagePreference        String    @default("en")

  @@map("driver_preferences")
}
```

### FeatureFlag (System-Wide)

```prisma
model FeatureFlag {
  id          String   @id @default(cuid())
  key         String   @unique
  name        String
  description String?
  enabled     Boolean  @default(false)
  category    String?
}
```

### SuperAdminPreferences

```prisma
model SuperAdminPreferences {
  id                        Int       @id @default(autoincrement())
  userId                    Int       @unique @map("user_id")
  notifyNewTenants          Boolean   @default(true)
  notifyStatusChanges       Boolean   @default(true)
  notificationFrequency     String    @default("REALTIME")
}
```

---

## API Endpoints (Validated Against Backend Controllers)

All routes live under `/settings/` prefix.

| Method | Route | Scope | Who | Controller |
|--------|-------|-------|-----|------------|
| GET | `/settings/general` | Per-user | Any user | user-preferences.controller.ts |
| PUT | `/settings/general` | Per-user | Any user | user-preferences.controller.ts |
| GET | `/settings/driver` | Per-user | Driver | user-preferences.controller.ts |
| PUT | `/settings/driver` | Per-user | Driver | user-preferences.controller.ts |
| POST | `/settings/reset` | Per-user | Any user | user-preferences.controller.ts |
| GET | `/settings/operations` | Per-tenant | Admin, Owner (read: Dispatcher) | operations-settings.controller.ts |
| PUT | `/settings/operations` | Per-tenant | Admin, Owner | operations-settings.controller.ts |
| POST | `/settings/operations/reset` | Per-tenant | Admin, Owner | operations-settings.controller.ts |
| GET | `/settings/operations/defaults` | Per-tenant | Any | operations-settings.controller.ts |
| GET | `/settings/alerts` | Per-tenant | Admin, Owner (read: Dispatcher) | alert-config.controller.ts |
| PUT | `/settings/alerts` | Per-tenant | Admin, Owner | alert-config.controller.ts |
| GET | `/settings/admin` | Per-user | Super Admin | super-admin-preferences.controller.ts |
| PUT | `/settings/admin` | Per-user | Super Admin | super-admin-preferences.controller.ts |

---

## Frontend Architecture

### Settings Sidebar Navigation

```
Settings (layout.tsx with sidebar)
  PERSONAL
    General          -> /settings/general
    Notifications    -> /settings/notifications
  ORGANIZATION
    Operations       -> /settings/operations
    Alerts           -> /settings/alerts
  CONNECTIONS
    Integrations     -> /settings/integrations
    API Keys         -> /settings/api-keys

Driver sidebar (different):
  PERSONAL
    General          -> /settings/general
    Notifications    -> /settings/notifications
    Route Display    -> /settings/driver
```

### Frontend File Structure (Validated)

```
apps/web/src/app/settings/
  layout.tsx              -- Settings shell with sidebar navigation
  page.tsx                -- Root redirect
  general/page.tsx        -- Display + Dashboard + Accessibility
  notifications/page.tsx  -- Alert delivery + Sound + Browser + Quiet Hours
  operations/page.tsx     -- HOS defaults + Optimization + Rest + Fuel
  alerts/page.tsx         -- Alert types + Thresholds + Channels + Grouping
  driver/page.tsx         -- Route Display (driver only)
  integrations/page.tsx   -- External system connections
  api-keys/page.tsx       -- API access management
```

### Backend File Structure (Validated)

```
apps/backend/src/domains/platform/settings/
  settings.module.ts                  -- SettingsModule (registers 4 controllers + 4 services)
  user-preferences.controller.ts      -- /settings/general, /settings/driver
  user-preferences.service.ts         -- CRUD for UserPreferences + DriverPreferences
  operations-settings.controller.ts   -- /settings/operations
  operations-settings.service.ts      -- CRUD for FleetOperationsSettings
  alert-config.controller.ts          -- /settings/alerts
  alert-config.service.ts             -- CRUD for AlertConfiguration
  super-admin-preferences.controller.ts -- /settings/admin
  super-admin-preferences.service.ts  -- CRUD for SuperAdminPreferences
  dto/
    user-preferences.dto.ts
    driver-preferences.dto.ts
    operations-settings.dto.ts
    alert-config.dto.ts
    super-admin-preferences.dto.ts
```

---

## Alert Types (All Thresholds in alertTypes JSON)

| Alert Type | Category | Default Threshold | Mandatory |
|-----------|----------|-------------------|-----------|
| HOS_DRIVE_WARNING | HOS Compliance | 75% | Yes |
| HOS_DRIVE_CRITICAL | HOS Compliance | 90% | Yes |
| HOS_ON_DUTY_WARNING | HOS Compliance | 75% | Yes |
| HOS_ON_DUTY_CRITICAL | HOS Compliance | 90% | Yes |
| HOS_BREAK_WARNING | HOS Compliance | 75% | Yes |
| HOS_BREAK_CRITICAL | HOS Compliance | 90% | Yes |
| HOS_APPROACHING_LIMIT | HOS Compliance | 85% | No |
| CYCLE_APPROACHING_LIMIT | HOS Compliance | 300 min | No |
| ROUTE_DELAY | Route & Schedule | 30 min | No |
| DRIVER_NOT_MOVING | Route & Schedule | 120 min | No |
| APPOINTMENT_AT_RISK | Route & Schedule | 30 min | No |
| MISSED_APPOINTMENT | Route & Schedule | N/A | Yes |
| DOCK_TIME_EXCEEDED | Route & Schedule | 60 min | No |
| COST_OVERRUN | Cost & Resources | 10% | No |
| FUEL_LOW | Cost & Resources | 20% | No |

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Granularity | Per-priority (4 levels) | Matches PagerDuty/Datadog pattern |
| Table structure | Single `UserPreferences` table | ~25 columns, one API call, one save |
| Navigation | Sidebar within `/settings` | Scales well, matches GitHub/Linear/Slack |
| HOS thresholds | Moved to `AlertConfiguration.alertTypes` | They control alert triggers, not route planning |
| Backend domain | Renamed from `preferences/` to `settings/` | "Settings" is the correct umbrella term |
| Helper text | Inline below each control | 60+ settings with descriptive text |
| ChannelResolutionService | Designed, not yet built | Missing piece for preference consumption pipeline |

---

## What Was Consolidated

| Original Plan | Content Absorbed Into |
|--------------|----------------------|
| `notification-preferences-simplification.md` | Research findings, single-form UX principle |
| `preferences-consolidation-design.md` | Three-layer architecture, UserPreferences schema, channel resolution design |
| `preferences-consolidation-implementation.md` | Schema migration steps, DTO changes, SSE handler wiring |
| `unified-settings-redesign.md` | Sidebar navigation, HOS threshold migration, helper text, frontend architecture |

---

## Pending Work

- **ChannelResolutionService** -- Designed but not built. This service resolves tenant defaults + user overrides into delivery instructions per-user per-alert.
- **SSE handler consumption** -- Frontend SSE handler does not yet play sounds, show browser notifications, or flash tab based on preference-resolved flags.
- **Alert sound utility** (`shared/lib/alert-sounds.ts`) -- Designed, not yet created.
- **Tab flash utility** (`shared/lib/tab-flash.ts`) -- Designed, not yet created.
