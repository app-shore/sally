# Alerts & Notifications System Design

> **Status:** ✅ Implemented (core), ⚠️ Partial (advanced features) | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-02-06-alerts-notifications-system-design.md`, `2026-02-06-alerts-notifications-quick-reference.md`

---

## Table of Contents

1. [Conceptual Model: Alerts vs Notifications](#1-conceptual-model-alerts-vs-notifications)
2. [Alert System Architecture](#2-alert-system-architecture)
3. [Alert Taxonomy](#3-alert-taxonomy)
4. [Data Models (Actual Prisma Schema)](#4-data-models-actual-prisma-schema)
5. [API Endpoints (Actual Controller Routes)](#5-api-endpoints-actual-controller-routes)
6. [Alert Generation Engine](#6-alert-generation-engine)
7. [Grouping, Deduplication, and Cascading](#7-grouping-deduplication-and-cascading)
8. [Escalation System](#8-escalation-system)
9. [Auto-Resolution](#9-auto-resolution)
10. [Notification Delivery Engine](#10-notification-delivery-engine)
11. [Real-Time Delivery (SSE)](#11-real-time-delivery-sse)
12. [Settings Architecture](#12-settings-architecture)
13. [UI Components](#13-ui-components)
14. [Alert Fatigue Prevention](#14-alert-fatigue-prevention)
15. [Current State Summary](#15-current-state-summary)

---

## 1. Conceptual Model: Alerts vs Notifications

Two distinct systems serve different purposes:

| System | Purpose | Primary Audience | Lifecycle |
|--------|---------|-----------------|-----------|
| **Alerts** | Operational events requiring dispatcher action | Dispatchers, Safety Managers | `active` -> `acknowledged` -> `resolved` |
| **Notifications** | Informational updates for all users | All users | `unread` -> `read` -> `dismissed` |

### Why Separate?

- **Alerts** are the dispatcher's work queue -- time-sensitive, actionable, with SLAs and escalation
- **Notifications** are everyone's inbox -- informational, can wait, personal to each user
- Mixing them causes alert fatigue (the #1 complaint across Samsara, Motive, and every fleet platform)
- Different configuration: Alerts have org-wide policies; Notifications have personal preferences

### Quick Decision Matrix

| Question | Alert | Notification |
|----------|-------|-------------|
| Requires immediate action? | Yes | No |
| Time-sensitive? | Yes | No |
| Safety or compliance related? | Yes | No |
| Ignoring causes problems? | Yes | No |
| Just informational (FYI)? | No | Yes |

---

## 2. Alert System Architecture

```
Monitoring / Trigger Source
    |
    v
AlertTriggersService.trigger(alertType, tenantId, driverId, params)
    |
    v
AlertGenerationService.generateAlert(params)
    |
    +-- Step 1: Deduplication check (AlertGroupingService.findDuplicate)
    +-- Step 2: Generate groupKey
    +-- Step 3: Create Alert record in database
    +-- Step 4: Link to parent if cascading enabled (AlertGroupingService.findParentAlert)
    +-- Step 5: Channel resolution per user (ChannelResolutionService.resolveChannels)
    +-- Step 6: SSE emit per user (SseService.emitToUser)
    +-- Step 7: Multi-channel delivery (NotificationDeliveryService.deliver)
    |
    v
Background Services (Cron - every minute):
    +-- EscalationService.checkEscalations()
    +-- AutoResolutionService.unsnoozeExpired()
    +-- AlertDigestService.generateDailyDigest() (6 AM)
    +-- AlertDigestService.generateShiftSummary() (6 AM, 6 PM)
```

---

## 3. Alert Taxonomy

### Implemented Alert Types (20 types)

All defined in `apps/backend/src/domains/operations/alerts/alert-types.ts`:

#### Category: HOS Compliance (6 types) -- ✅ Built

| Alert Type | Default Priority | Auto-Resolve Condition |
|-----------|-----------------|----------------------|
| `HOS_VIOLATION` | critical | -- |
| `HOS_APPROACHING_LIMIT` | high | Driver takes required rest |
| `BREAK_REQUIRED` | high | Driver takes break |
| `CYCLE_APPROACHING_LIMIT` | medium | Cycle resets |
| `RECAP_HOURS_AVAILABLE` | low | -- |
| `DUTY_STATUS_CHANGE` | low | -- |

#### Category: Route Progress (5 types) -- ✅ Built

| Alert Type | Default Priority | Auto-Resolve Condition |
|-----------|-----------------|----------------------|
| `MISSED_APPOINTMENT` | critical | -- |
| `APPOINTMENT_AT_RISK` | high | ETA recovers within window |
| `DOCK_TIME_EXCEEDED` | medium | Driver departs dock |
| `ROUTE_DELAY` | medium | Delay resolves |
| `ROUTE_COMPLETED` | low | -- |

#### Category: Driver Behavior (3 types) -- ✅ Built

| Alert Type | Default Priority | Auto-Resolve Condition |
|-----------|-----------------|----------------------|
| `DRIVER_NOT_MOVING` | high | Driver resumes movement |
| `SPEEDING` | medium | Speed returns to normal |
| `UNAUTHORIZED_STOP` | medium | Driver departs |

Note: The design plan specified `UNEXPECTED_STOP`, `OFF_ROUTE`, and `STOP_SEQUENCE_DEVIATION`. The actual implementation uses `SPEEDING` and `UNAUTHORIZED_STOP` instead. `OFF_ROUTE` and `STOP_SEQUENCE_DEVIATION` are **not built**.

#### Category: Vehicle State (2 types) -- ✅ Built

| Alert Type | Default Priority | Auto-Resolve Condition |
|-----------|-----------------|----------------------|
| `FUEL_LOW` | high | Fuel level increases |
| `MAINTENANCE_DUE` | low | -- |

Note: `FUEL_STOP_MISSED` from the design plan is **not built**.

#### Category: External Conditions (2 types) -- ✅ Built

| Alert Type | Default Priority | Auto-Resolve Condition |
|-----------|-----------------|----------------------|
| `WEATHER_ALERT` | medium | Weather clears |
| `ROAD_CLOSURE` | high | Road reopens |

Note: `TRAFFIC_DELAY` from the design plan is **not built**. `SEVERE_WEATHER` was implemented as `WEATHER_ALERT`.

#### Category: System (2 types) -- ✅ Built

| Alert Type | Default Priority | Auto-Resolve Condition |
|-----------|-----------------|----------------------|
| `INTEGRATION_FAILURE` | high | Sync succeeds |
| `SYSTEM_ERROR` | critical | -- |

Note: Design plan specified `INTEGRATION_SYNC_FAILURE` and `ROUTE_PLAN_FAILED`. Actual implementation uses `INTEGRATION_FAILURE` and `SYSTEM_ERROR`.

### Alert Type Definition Structure

Each alert type includes dynamic title/message/action generators:

```typescript
export interface AlertTypeDefinition {
  type: string;
  category: string;
  defaultPriority: string;
  title: (params: Record<string, any>) => string;
  message: (params: Record<string, any>) => string;
  recommendedAction: (params: Record<string, any>) => string;
  autoResolveCondition?: string;
}
```

### Priority Levels

| Priority | SLA (Design) | Escalation (Design) |
|----------|-------------|---------------------|
| **critical** | 5 minutes | Auto-escalate to supervisor |
| **high** | 15 minutes | Auto-escalate after SLA |
| **medium** | 60 minutes | Auto-escalate after SLA |
| **low** | Best effort | No escalation |

### Alert Lifecycle

```
ACTIVE -> ACKNOWLEDGED -> RESOLVED
  |                          ^
  |         SNOOZED ---------+
  |         (returns to ACTIVE
  +-------> after snooze period)
  |
  +-------> AUTO_RESOLVED (system detected condition cleared)
```

**Statuses (actual):** `active`, `acknowledged`, `snoozed`, `resolved`, `auto_resolved`

---

## 4. Data Models (Actual Prisma Schema)

### Alert Model -- ✅ Built

Source: `apps/backend/prisma/schema.prisma`

```prisma
model Alert {
  id                    Int          @id @default(autoincrement())
  alertId               String       @unique @map("alert_id") @db.VarChar(50)
  tenantId              Int          @map("tenant_id")

  // Context
  driverId              String       @map("driver_id") @db.VarChar(50)
  routePlanId           String?      @map("route_plan_id") @db.VarChar(50)
  vehicleId             String?      @map("vehicle_id") @db.VarChar(50)

  // Classification
  alertType             String       @map("alert_type") @db.VarChar(50)
  category              String       @default("system") @db.VarChar(30)
  priority              String       @db.VarChar(20)

  // Content
  title                 String       @db.VarChar(200)
  message               String       @db.Text
  recommendedAction     String?      @map("recommended_action") @db.Text
  metadata              Json?

  // Lifecycle
  status                String       @default("active") @db.VarChar(20)
  acknowledgedAt        DateTime?    @map("acknowledged_at") @db.Timestamptz
  acknowledgedBy        String?      @map("acknowledged_by") @db.VarChar(50)
  snoozedUntil          DateTime?    @map("snoozed_until") @db.Timestamptz
  resolvedAt            DateTime?    @map("resolved_at") @db.Timestamptz
  resolvedBy            String?      @map("resolved_by") @db.VarChar(50)
  resolutionNotes       String?      @map("resolution_notes") @db.Text
  autoResolved          Boolean      @default(false) @map("auto_resolved")
  autoResolveReason     String?      @map("auto_resolve_reason") @db.Text

  // Grouping
  parentAlertId         String?      @map("parent_alert_id") @db.VarChar(50)
  groupKey              String?      @map("group_key") @db.VarChar(200)

  // Escalation
  escalationLevel       Int          @default(0) @map("escalation_level")
  escalatedAt           DateTime?    @map("escalated_at") @db.Timestamptz

  // Deduplication
  dedupKey              String?      @map("dedup_key") @db.VarChar(200)

  // Timestamps
  createdAt             DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt             DateTime     @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  tenant                Tenant       @relation(fields: [tenantId], references: [id])
  notes                 AlertNote[]
  parentAlert           Alert?       @relation("AlertGroup", fields: [parentAlertId], references: [alertId])
  childAlerts           Alert[]      @relation("AlertGroup")

  @@index([tenantId, status, priority, createdAt])
  @@index([tenantId, createdAt])
  @@index([dedupKey, status])
  @@index([driverId, status])
  @@index([routePlanId, status])
  @@index([parentAlertId])
  @@index([groupKey])
  @@index([snoozedUntil])
  @@map("alerts")
}
```

### AlertNote Model -- ✅ Built

```prisma
model AlertNote {
  id            Int       @id @default(autoincrement())
  noteId        String    @unique @default(cuid()) @map("note_id") @db.VarChar(50)
  alertId       String    @map("alert_id") @db.VarChar(50)
  authorId      String    @map("author_id") @db.VarChar(50)
  authorName    String    @map("author_name") @db.VarChar(200)
  content       String    @db.Text
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz

  alert         Alert     @relation(fields: [alertId], references: [alertId])

  @@index([alertId, createdAt])
  @@map("alert_notes")
}
```

### AlertConfiguration Model -- ✅ Built

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

**JSON field shapes:**

- `alertTypes`: `{ "HOS_VIOLATION": { "enabled": true, "mandatory": true, "thresholdPercent": 90 }, ... }`
- `escalationPolicy`: `{ "critical": { "acknowledgeSlaMinutes": 5, "escalateTo": "supervisors", "channels": ["email", "sms"] }, ... }`
- `groupingConfig`: `{ "dedupWindowMinutes": 15, "groupSameTypePerDriver": true, "smartGroupAcrossDrivers": true, "linkCascading": true }`
- `defaultChannels`: `{ "critical": { "inApp": true, "email": true, "push": true, "sms": true }, ... }`

### Notification Model -- ✅ Built

```prisma
model Notification {
  id              Int                 @id @default(autoincrement())
  notificationId  String              @unique @default(cuid()) @map("notification_id") @db.VarChar(50)

  type            NotificationType
  channel         NotificationChannel @default(EMAIL)
  recipient       String              @db.VarChar(255)
  status          NotificationStatus  @default(PENDING)

  tenantId        Int?                @map("tenant_id")
  userId          Int?                @map("user_id")
  invitationId    Int?                @map("invitation_id")

  // In-App fields
  category        String?             @db.VarChar(30)
  title           String?             @db.VarChar(255)
  message         String?             @db.Text
  actionUrl       String?             @map("action_url") @db.VarChar(500)
  actionLabel     String?             @map("action_label") @db.VarChar(100)
  iconType        String?             @map("icon_type") @db.VarChar(30)
  readAt          DateTime?           @map("read_at") @db.Timestamptz
  dismissedAt     DateTime?           @map("dismissed_at") @db.Timestamptz

  metadata        Json?
  errorMessage    String?             @map("error_message") @db.Text
  sentAt          DateTime?           @map("sent_at")

  createdAt       DateTime            @default(now()) @map("created_at")
  updatedAt       DateTime            @updatedAt @map("updated_at")

  @@index([tenantId])
  @@index([userId])
  @@index([type])
  @@index([status])
  @@index([createdAt])
  @@index([tenantId, status])
  @@index([type, status])
  @@index([userId, readAt, dismissedAt])
  @@index([userId, category, createdAt])
  @@map("notifications")
}
```

**Enums:**

```prisma
enum NotificationType {
  USER_INVITATION
  TENANT_REGISTRATION_CONFIRMATION
  TENANT_APPROVED
  TENANT_REJECTED
  ROUTE_PLANNED
  ROUTE_UPDATED
  ROUTE_COMPLETED
  INTEGRATION_SYNCED
  INTEGRATION_FAILED
  USER_JOINED
  ROLE_CHANGED
  DRIVER_ACTIVATED
  SETTINGS_UPDATED
  LOAD_ASSIGNED
  LOAD_STATUS_CHANGED
  SCHEDULE_CHANGED
  DISPATCH_MESSAGE
  ACKNOWLEDGMENT_REQUEST
  ACKNOWLEDGMENT_RECEIVED
}

enum NotificationChannel { EMAIL, SMS, PUSH, IN_APP }
enum NotificationStatus { PENDING, SENT, FAILED }
```

Note: The design plan proposed a separate `UserNotificationPreferences` model. The actual implementation integrates notification preferences into the existing `UserPreferences` model (fields: `alertChannels`, `soundSettings`, `browserNotifications`, `flashTabOnCritical`, `quietHoursEnabled`, `quietHoursStart`, `quietHoursEnd`, `defaultSnoozeDuration`, `emailDigestFrequency`). This is a simpler, more consolidated approach.

### PushSubscription Model -- ✅ Built

```prisma
model PushSubscription {
  id              Int       @id @default(autoincrement())
  userId          Int       @map("user_id")
  tenantId        Int       @map("tenant_id")
  endpoint        String    @db.Text
  p256dh          String    @db.VarChar(200)
  auth            String    @db.VarChar(100)
  userAgent       String?   @map("user_agent") @db.VarChar(500)
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  user            User      @relation(fields: [userId], references: [id])

  @@unique([userId, endpoint])
  @@index([userId])
  @@map("push_subscriptions")
}
```

---

## 5. API Endpoints (Actual Controller Routes)

### Alert Endpoints -- ✅ Built

Source: `apps/backend/src/domains/operations/alerts/alerts.controller.ts`

| Method | Route | Description | Status |
|--------|-------|-------------|--------|
| `GET` | `/alerts` | List alerts with filters (status, priority, driver_id, category) | ✅ Built |
| `GET` | `/alerts/stats` | Alert statistics (active, critical, avgResponseTime, resolvedToday) | ✅ Built |
| `GET` | `/alerts/analytics/volume` | Volume by category and priority (query: days) | ✅ Built |
| `GET` | `/alerts/analytics/response-time` | Response time trend (query: days) | ✅ Built |
| `GET` | `/alerts/analytics/resolution` | Resolution rates (query: days) | ✅ Built |
| `GET` | `/alerts/analytics/top-types` | Top alert types by volume (query: days) | ✅ Built |
| `GET` | `/alerts/history` | Alert history with pagination and filters | ✅ Built |
| `GET` | `/alerts/:alert_id` | Get alert detail (includes notes, child_alerts) | ✅ Built |
| `POST` | `/alerts/:alert_id/acknowledge` | Acknowledge an alert | ✅ Built |
| `POST` | `/alerts/:alert_id/resolve` | Resolve an alert (body: resolutionNotes) | ✅ Built |
| `POST` | `/alerts/:alert_id/snooze` | Snooze an alert (body: durationMinutes) | ✅ Built |
| `POST` | `/alerts/:alert_id/notes` | Add a note to an alert (body: content) | ✅ Built |
| `POST` | `/alerts/bulk/acknowledge` | Bulk acknowledge (body: alertIds) | ✅ Built |
| `POST` | `/alerts/bulk/resolve` | Bulk resolve (body: alertIds, resolutionNotes) | ✅ Built |

### Notification Endpoints -- ✅ Built

Source: `apps/backend/src/domains/operations/notifications/notifications.controller.ts`

| Method | Route | Description | Status |
|--------|-------|-------------|--------|
| `GET` | `/notifications` | List notifications for current user (query: status, category, page, limit) | ✅ Built |
| `GET` | `/notifications/count` | Get unread notification count | ✅ Built |
| `POST` | `/notifications/:notification_id/read` | Mark a notification as read | ✅ Built |
| `POST` | `/notifications/:notification_id/dismiss` | Dismiss a notification | ✅ Built |
| `POST` | `/notifications/mark-all-read` | Mark all notifications as read (body: category?) | ✅ Built |
| `POST` | `/notifications/dismiss-all-read` | Dismiss all read notifications | ✅ Built |

### SSE Endpoint -- ✅ Built

Source: `apps/backend/src/infrastructure/sse/sse.controller.ts`

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/sse/stream` | Real-time event stream (SSE) |

**Event types emitted:**
- `alert:new` -- New alert created (per-user with playSound, flashTab flags)
- `alert:escalated` -- Alert escalated due to SLA breach
- `alert:resolved` -- Alert auto-resolved
- `alert:unsnoozed` -- Snoozed alert reactivated
- `notification:new` -- New notification created

### Push Subscription Endpoint -- ✅ Built

Source: `apps/backend/src/infrastructure/push/push-subscription.controller.ts`

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/push/subscribe` | Register push subscription |

---

## 6. Alert Generation Engine

### ✅ Built: `AlertGenerationService`

Source: `apps/backend/src/domains/operations/alerts/services/alert-generation.service.ts`

The generation flow:

1. **Deduplication check** -- Uses `AlertGroupingService.findDuplicate()` with configurable window
2. **Group key generation** -- Format: `{tenantId}:{driverId}:{category}`
3. **Alert creation** -- Creates `Alert` record with unique ID format `ALT-{UUID_PREFIX}`
4. **Cascading link** -- Links to parent alert if `linkCascading` is enabled in config
5. **Per-user channel resolution** -- For each dispatcher/admin/owner, resolves which channels to use
6. **SSE emission** -- Emits `alert:new` to each user with preference-resolved sound/flash flags
7. **Multi-channel delivery** -- Sends via in-app, email, push, SMS based on resolved channels

### ✅ Built: `AlertTriggersService`

Source: `apps/backend/src/domains/operations/alerts/services/alert-triggers.service.ts`

Wraps `AlertGenerationService` with type-safe alert definitions. Looks up the alert type from `ALERT_TYPES` registry and generates title/message/action from templates.

```typescript
await triggersService.trigger('HOS_VIOLATION', tenantId, driverId, {
  driverName: 'John Smith',
  hoursType: 'driving',
  currentHours: 11.2,
  limitHours: 11,
  routePlanId: 'RP-001',
});
```

---

## 7. Grouping, Deduplication, and Cascading

### ✅ Built: `AlertGroupingService`

Source: `apps/backend/src/domains/operations/alerts/services/alert-grouping.service.ts`

#### Deduplication

- **Key format:** `{tenantId}:{driverId}:{alertType}`
- **Window:** Configurable per tenant (default: 15 minutes)
- **Behavior:** If an active/acknowledged alert with the same dedup key exists within the window, the new alert is suppressed

#### Group Keys

- **Key format:** `{tenantId}:{driverId}:{category}`
- Used for logical grouping in the UI

#### Cascading Alert Linking

Built-in cascade map:

```typescript
const CASCADE_MAP = {
  HOS_VIOLATION: ['HOS_APPROACHING_LIMIT'],
  BREAK_REQUIRED: ['HOS_APPROACHING_LIMIT'],
  MISSED_APPOINTMENT: ['APPOINTMENT_AT_RISK'],
  FUEL_EMPTY: ['FUEL_LOW'],
};
```

When a new alert is created, the system checks if a parent alert of a related type exists and links them via `parentAlertId`.

#### Configuration

Read from `AlertConfiguration.groupingConfig` JSON field per tenant:

```json
{
  "dedupWindowMinutes": 15,
  "groupSameTypePerDriver": true,
  "smartGroupAcrossDrivers": true,
  "linkCascading": true
}
```

---

## 8. Escalation System

### ✅ Built: `EscalationService`

Source: `apps/backend/src/domains/operations/alerts/services/escalation.service.ts`

- **Runs:** Every minute via `@Cron(CronExpression.EVERY_MINUTE)`
- **Logic:** For each tenant's escalation policy, finds alerts where:
  - Status is `active`
  - Not yet acknowledged
  - Created before the SLA cutoff time
  - Current `escalationLevel` is 0
- **Action:** Increments `escalationLevel`, sets `escalatedAt`, emits `alert:escalated` SSE event
- **Policy shape:** Read from `AlertConfiguration.escalationPolicy`:

```json
{
  "critical": { "acknowledgeSlaMinutes": 5, "escalateTo": "supervisors", "channels": ["email", "sms"] },
  "high": { "acknowledgeSlaMinutes": 15, "escalateTo": "all_dispatchers", "channels": ["email"] }
}
```

Note: The current implementation only escalates from level 0 to level 1. Multi-tier escalation (level 1 -> 2 -> 3) as described in the design plan is **not yet implemented** -- the `escalationLevel: 0` filter means alerts already escalated once are not re-escalated.

---

## 9. Auto-Resolution

### ✅ Built: `AutoResolutionService`

Source: `apps/backend/src/domains/operations/alerts/services/auto-resolution.service.ts`

Two capabilities:

1. **Direct auto-resolve:** `autoResolve(alertId, tenantId, reason)` -- Sets status to `auto_resolved`, emits SSE
2. **Condition-based auto-resolve:** `autoResolveByCondition(tenantId, driverId, alertType, reason)` -- Finds all active/acknowledged/snoozed alerts matching criteria and resolves them
3. **Snooze expiry:** `unsnoozeExpired()` -- Runs every minute, finds snoozed alerts past their `snoozedUntil` time and reactivates them to `active`, emits `alert:unsnoozed` SSE

---

## 10. Notification Delivery Engine

### ✅ Built: `NotificationDeliveryService`

Source: `apps/backend/src/domains/operations/notifications/delivery.service.ts`

Multi-channel delivery with these channels:

| Channel | Service | Status |
|---------|---------|--------|
| **in_app** | `InAppNotificationService` + `SseService` | ✅ Built |
| **email** | `EmailService` (Resend/SMTP) | ✅ Built |
| **push** | `PushService` (Web Push API) | ✅ Built |
| **sms** | `SmsService` | ✅ Built |

### ✅ Built: `ChannelResolutionService`

Source: `apps/backend/src/domains/operations/notifications/channel-resolution.service.ts`

Resolves which channels to use for a given alert delivery:

1. Gets **tenant defaults** from `AlertConfiguration.defaultChannels`
2. Gets **user overrides** from `UserPreferences.alertChannels`
3. Enforces **mandatory alert types** always get in-app
4. Applies **quiet hours** suppression (except CRITICAL)
5. Returns resolved `channels[]`, `playSound`, `showBrowserNotification`, `flashTab`, `suppressedByQuietHours`

### ✅ Built: `AlertDigestService`

Source: `apps/backend/src/domains/operations/alerts/services/alert-digest.service.ts`

- **Daily digest:** Runs at 6 AM, sends email summary to all dispatchers/admins/owners per tenant
- **Shift summary:** Runs at 6 AM and 6 PM, sends unresolved alert handoff email

### ✅ Built: `AlertCacheService`

Source: `apps/backend/src/domains/operations/alerts/services/alert-cache.service.ts`

Redis-backed caching for alert stats with configurable TTL (30 seconds for stats).

---

## 11. Real-Time Delivery (SSE)

### ✅ Built

Source: `apps/backend/src/infrastructure/sse/`

- SSE controller at `/sse/stream`
- `SseService` with methods:
  - `emitToUser(userId, event, data)` -- Per-user targeted events
  - `emitToTenant(tenantId, event, data)` -- Tenant-wide broadcasts

**SSE event types in use:**

| Event | Source | Data |
|-------|--------|------|
| `alert:new` | AlertGenerationService | Alert details + playSound + flashTab |
| `alert:escalated` | EscalationService | alert_id, priority, escalation_level, escalate_to |
| `alert:resolved` | AutoResolutionService | alert_id, status, reason |
| `alert:unsnoozed` | AutoResolutionService | alert_id, status |
| `notification:new` | NotificationDeliveryService | notification details |

### WebSocket for Messaging -- 🔲 Designed, not yet built

The design plan included WebSocket for driver-dispatcher bidirectional messaging. This has not been implemented.

---

## 12. Settings Architecture

### Two-Layer System -- ✅ Built

#### Layer 1: Operations Settings (Tenant-Wide)

- **Alert type configuration** with enable/disable, mandatory flags, and thresholds
- **Escalation policy** per priority level
- **Alert grouping configuration** (dedup window, same-type grouping, cascading)
- **Default notification channels** per priority

Frontend: `apps/web/src/app/settings/alerts/page.tsx` -- Full settings UI with:
- Alert type toggles with threshold inputs (organized by HOS Compliance, Route & Schedule, Cost & Resources)
- Default channel matrix (priority x channel)
- Grouping configuration (dedup window, same-type grouping, cross-driver grouping, cascading)
- Mandatory alert types shown with lock icon

#### Layer 2: User Preferences (Personal)

Integrated into `UserPreferences` model:
- `alertChannels` -- Per-priority channel overrides
- `soundSettings` -- Per-priority sound enable/disable
- `browserNotifications` -- Browser notification toggle
- `flashTabOnCritical` -- Flash tab for critical alerts
- `quietHoursEnabled/Start/End` -- Quiet hours suppression
- `defaultSnoozeDuration` -- Default snooze duration in minutes
- `emailDigestFrequency` -- Digest email preference

Frontend: `apps/web/src/app/settings/notifications/page.tsx`

---

## 13. UI Components

### Dispatcher Alerts Page -- ✅ Built

Source: `apps/web/src/app/dispatcher/alerts/page.tsx`

**Features:**
- **Stats bar** (4 cards): Active, Critical, Avg Response, Resolved Today
- **Active/History tabs**
- **Active view:**
  - Search input
  - Status filter (All Open, Active, Acknowledged, Snoozed)
  - Category filter (HOS, Route, Driver, Vehicle, External, System)
  - Priority filter (Critical, High, Medium, Low)
  - Alert cards with priority-coded left border (red/orange/yellow/blue)
  - Actions: Acknowledge, Snooze 15m, Resolve
  - Recommended action display
  - Snooze status display
- **History view:**
  - Date range filters (start/end)
  - Category, priority, status, driver filters
  - Paginated table with columns: Time, Type, Category, Priority, Driver, Status, Response Time
  - Responsive design (columns hidden on smaller screens)

**Frontend feature module:** `apps/web/src/features/operations/alerts/`
- Types: `Alert`, `AlertStats`, `AlertPriority`, `AlertStatus`, `AlertCategory`, `AlertNote`
- API client: Full CRUD + bulk operations + analytics
- Hooks: `useAlerts`, `useAlertById`, `useAlertStats`, `useAcknowledgeAlert`, `useSnoozeAlert`, `useResolveAlert`, `useAddAlertNote`, `useBulkAcknowledge`, `useBulkResolve`
- Analytics API: `alertAnalyticsApi` (volume, response-time, resolution, top-types, history)

### Notifications Page -- ✅ Built

Source: `apps/web/src/app/notifications/page.tsx`

**Frontend feature module:** `apps/web/src/features/operations/notifications/`
- Types: `Notification`, `NotificationCount`, `NotificationCategory`, `NotificationStatus`
- Hooks: `useNotifications`, `useNotificationCount`, `useMarkAsRead`, `useDismiss`, `useMarkAllRead`, `useDismissAllRead`

### Driver Notifications -- ✅ Built

Source: `apps/web/src/app/driver/notifications/page.tsx`, `DriverAlertCard.tsx`

### Alert Settings Page -- ✅ Built

Source: `apps/web/src/app/settings/alerts/page.tsx`

Full configuration UI for alert types, channels, and grouping.

### Alert Detail Dialog -- 🔲 Designed, not yet built

The design plan specified a slide-in detail panel with full timeline, related alerts, and inline actions. The current implementation shows alert details in the card view but does not have a dedicated detail dialog/panel.

---

## 14. Alert Fatigue Prevention

### Implemented Strategies

| Strategy | Status | Implementation |
|----------|--------|---------------|
| **Deduplication** | ✅ Built | `AlertGroupingService.findDuplicate()` with configurable window |
| **Smart grouping per driver** | ✅ Built | Same-type alerts for same driver suppressed within window |
| **Cascading alert linking** | ✅ Built | Parent-child relationships via `parentAlertId` |
| **Configurable thresholds** | ✅ Built | Per-alert-type thresholds in `AlertConfiguration` |
| **Snooze mechanism** | ✅ Built | Duration-based snooze with auto-unsnooze |
| **Quiet hours** | ✅ Built | `ChannelResolutionService` suppresses non-critical during quiet hours |
| **Escalation SLAs** | ✅ Built | Time-based escalation per priority level |
| **User channel preferences** | ✅ Built | Per-priority channel overrides in `UserPreferences` |
| **Sound controls** | ✅ Built | Per-priority sound enable/disable |
| **Smart group across drivers** | ⚠️ Config exists, UI display not built | Config field exists, but grouped display in Command Center UI is not implemented |

---

## 15. Current State Summary

### Fully Built (✅)

- Alert model with all fields (grouping, escalation, deduplication, parent-child)
- AlertNote model for timeline notes
- AlertConfiguration model (tenant-wide settings)
- PushSubscription model
- 20 alert type definitions with dynamic templates
- Alert generation engine with deduplication, grouping, and cascading
- Per-user channel resolution (tenant defaults + user overrides + quiet hours)
- Multi-channel delivery (in-app, email, push, SMS)
- SSE real-time event stream
- Escalation service (cron-based SLA checks)
- Auto-resolution service (condition-based + snooze expiry)
- Daily digest and shift summary emails
- Redis-backed alert stats caching
- 14 alert API endpoints (CRUD, bulk, analytics, history)
- 6 notification API endpoints (list, count, read, dismiss, mark-all, dismiss-all)
- Full dispatcher alerts page (stats, active view, history view with pagination)
- Alert settings page (types, channels, grouping config)
- Notifications page and driver notifications page
- Frontend alert feature module (types, API, hooks, analytics)
- Frontend notification feature module (types, API, hooks)

### Partial (⚠️)

- Multi-tier escalation (only level 0 -> 1, not 1 -> 2 -> 3)
- Smart group display in UI (config exists, but grouped alert display in Command Center not built)
- Alert list pagination (server returns all matching alerts, no limit/offset on main list endpoint)

### Designed but Not Built (🔲)

- Alert detail slide-in panel/dialog with full timeline view
- WebSocket for driver-dispatcher bidirectional messaging
- Some alert types from design: `OFF_ROUTE`, `STOP_SEQUENCE_DEVIATION`, `TRAFFIC_DELAY`, `FUEL_STOP_MISSED`
- Sound playback on the frontend (SSE emits `playSound` flag, but audio playback not implemented)
- Browser tab title change for critical alerts (SSE emits `flashTab` flag, frontend handler not confirmed)
- Push notification opt-in flow for drivers (PWA service worker)
- SMS number configuration in user preferences
- Daily digest opt-in per user (cron runs for all dispatchers, not preference-gated)

---

## Appendix: Integration Points

| System | Direction | Status |
|--------|-----------|--------|
| Alert Generation Engine -> SSE | Alert -> Browser | ✅ Built |
| Alert Generation Engine -> Email | Alert -> Email Inbox | ✅ Built |
| Alert Generation Engine -> Push | Alert -> Push Notification | ✅ Built |
| Alert Generation Engine -> SMS | Alert -> Phone | ✅ Built |
| Escalation Service -> SSE | Escalation -> Browser | ✅ Built |
| Auto-Resolution -> SSE | Resolution -> Browser | ✅ Built |
| Digest Service -> Email | Summary -> Email Inbox | ✅ Built |
| Route Planning Engine -> Alert Triggers | Monitoring -> Alerts | ✅ Built (trigger interface ready) |
| Monitoring Service -> Alert Triggers | Continuous eval -> Alerts | 🔲 Monitoring service not yet connected |

## Appendix: Metrics to Track

| Metric | Target | Description |
|--------|--------|-------------|
| Alert-to-Acknowledge Time | < 5 min (Critical), < 15 min (High) | How fast dispatchers respond |
| Alert-to-Resolve Time | < 30 min (Critical), < 2 hr (High) | How fast issues are fixed |
| False Positive Rate | < 10% | Alerts dismissed without action |
| Alert Volume per Driver per Day | < 5 | Indicator of alert fatigue risk |
| Notification Read Rate | > 80% | User engagement with notifications |
| Push Delivery Success Rate | > 95% | Technical health of push system |
| SSE Connection Uptime | > 99.5% | Real-time delivery reliability |
