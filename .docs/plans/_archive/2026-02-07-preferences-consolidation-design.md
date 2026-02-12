# Preferences Consolidation Design (v2)

> Redesigned from scratch after brainstorming session. Replaces original consolidation doc.

**Created:** February 7, 2026
**Status:** Design (Pending Approval)
**Brainstormed:** Yes — followed superpowers:brainstorming skill

---

## 1. Problem Statement (Revised)

### What We Found

We have **two user preference tables** that overlap — but worse, **neither is actually consumed** by the system:

| Issue | Severity |
|-------|----------|
| Two tables with conflicting fields (`sound_enabled` Boolean vs Json) | High |
| `delivery.service.ts` never reads user preferences — channels are passed in as hardcoded array | **Critical** |
| `alert-generation.service.ts` broadcasts to all tenant users — never consults who wants what | **Critical** |
| Frontend SSE handler never plays sounds, never triggers browser notifications, never flashes tab | **Critical** |
| Two save buttons, two API calls, two state objects on one settings page | Medium |

**Bottom line:** We built preference UI and storage, but zero consumption. Preferences are a dead store.

### What We Need

Not just a schema merge — a complete **preference → delivery pipeline** that actually works:

```
User sets preference → DB stores it → Alert fires → System reads prefs → Delivers accordingly
```

---

## 2. Design Decisions (From Brainstorming)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Granularity | **Per-priority** (4 rows) | Matches PagerDuty/Datadog. Dispatchers think in urgency, not alert type names |
| Table structure | **One unified `UserPreferences`** table | ~22 columns, single-row-per-user, one API call, one save |
| Build scope | **Schema + consumption** | No point having prefs nobody reads |
| Notification scope | **Alerts only** | System notifications (route planned, user joined) always in-app. Only alert delivery gets channel preferences |
| Migration approach | **Drop and recreate** | No real user data to preserve, clean slate |

---

## 3. The Three-Layer Preference Architecture

This is how preferences should work in a fleet operations product:

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: Tenant Defaults (AlertConfiguration)                   │
│  WHO SETS: Owner/Admin                                           │
│  WHAT: Default channels per priority, escalation policy,         │
│        which alert types are enabled/mandatory                   │
│  ALREADY EXISTS: ✅ AlertConfiguration table                      │
│                                                                   │
│  Example: "For this company, CRITICAL alerts default to           │
│           in-app + email + push + sms"                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │ provides defaults ↓
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2: User Overrides (UserPreferences)                       │
│  WHO SETS: Each dispatcher/user                                  │
│  WHAT: Personal channel preferences per priority,                │
│        sound/browser/quiet hours                                 │
│  STATUS: ⚠️ Schema exists but NOT CONSUMED                       │
│                                                                   │
│  Example: "I want HIGH alerts via email too, not just in-app.     │
│           Mute sounds for MEDIUM. Enable quiet hours 10pm-6am"   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ consumed by ↓
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: Delivery Engine (Channel Resolution)                   │
│  WHO: System (automatic)                                         │
│  WHAT: Merges tenant defaults + user overrides to determine      │
│        actual delivery channels for each alert                   │
│  STATUS: ❌ MISSING — must be built                               │
│                                                                   │
│  Logic: tenant defaults → apply user overrides → check quiet     │
│         hours → check mandatory flags → deliver                  │
└─────────────────────────────────────────────────────────────────┘
```

### Channel Resolution Logic (New)

When an alert fires for a user:

```
1. Get tenant's AlertConfiguration.defaultChannels[alert.priority]
   → e.g., { inApp: true, email: true, push: true, sms: false }

2. Get user's UserPreferences.alertChannels[alert.priority]
   → e.g., { inApp: true, email: false, push: true, sms: false }
   → If empty/missing, use tenant defaults from step 1

3. Check tenant's AlertConfiguration.alertTypes[alert.alertType]
   → If mandatory: true, user CANNOT disable in-app channel

4. Check user's quiet hours
   → If in quiet hours: suppress push + sound (keep email, keep in-app)
   → Exception: CRITICAL always delivers regardless of quiet hours

5. Final channel list → pass to delivery.service.ts
```

---

## 4. Target Schema

### Unified `UserPreferences` Model

```prisma
model UserPreferences {
  id                        Int       @id @default(autoincrement())
  userId                    Int       @unique @map("user_id")
  user                      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // ── Display ──
  distanceUnit              String    @default("MILES")  @map("distance_unit") @db.VarChar(20)
  timeFormat                String    @default("12H")    @map("time_format") @db.VarChar(10)
  temperatureUnit           String    @default("F")      @map("temperature_unit") @db.VarChar(5)
  currency                  String    @default("USD")    @db.VarChar(10)
  timezone                  String    @default("America/New_York") @db.VarChar(100)
  dateFormat                String    @default("MM/DD/YYYY") @map("date_format") @db.VarChar(20)

  // ── Dashboard ──
  autoRefreshInterval       Int       @default(30)       @map("auto_refresh_interval")
  defaultView               String    @default("OVERVIEW") @map("default_view") @db.VarChar(30)
  compactMode               Boolean   @default(false)    @map("compact_mode")
  highContrastMode          Boolean   @default(false)    @map("high_contrast_mode")

  // ── Alert Delivery (per-priority channel overrides) ──
  // User's override of tenant defaults. Empty = use tenant defaults.
  // Shape: { "critical": { "inApp": true, "email": true, "push": true, "sms": true },
  //          "high":     { "inApp": true, "email": true, "push": false, "sms": false },
  //          "medium":   { "inApp": true, "email": false, "push": false, "sms": false },
  //          "low":      { "inApp": true, "email": false, "push": false, "sms": false } }
  alertChannels             Json      @default("{}") @map("alert_channels")

  // Minimum priority to show in UI. Alerts below this are hidden (not delivered differently).
  minAlertPriority          String    @default("LOW") @map("min_alert_priority") @db.VarChar(20)

  // Categories the user wants to see (filter, not delivery control)
  alertCategories           Json      @default("[\"hos\",\"delay\",\"route\",\"driver\",\"vehicle\",\"external\"]") @map("alert_categories")

  // ── Sound & Browser ──
  // Per-priority sound. Critical is always on (enforced in UI, not DB).
  soundSettings             Json      @default("{\"critical\":true,\"high\":true,\"medium\":false,\"low\":false}") @map("sound_settings")
  browserNotifications      Boolean   @default(true)     @map("browser_notifications")
  flashTabOnCritical        Boolean   @default(true)     @map("flash_tab_on_critical")

  // ── Quiet Hours ──
  // During quiet hours: suppress push + sound. Critical ignores quiet hours.
  quietHoursEnabled         Boolean   @default(false)    @map("quiet_hours_enabled")
  quietHoursStart           String?   @map("quiet_hours_start") @db.VarChar(10)
  quietHoursEnd             String?   @map("quiet_hours_end") @db.VarChar(10)

  // ── Snooze & Digest ──
  defaultSnoozeDuration     Int       @default(15)       @map("default_snooze_duration")
  emailDigestFrequency      String    @default("NEVER")  @map("email_digest_frequency") @db.VarChar(20)

  // ── Accessibility ──
  fontSize                  String    @default("MEDIUM") @map("font_size") @db.VarChar(10)
  reduceMotion              Boolean   @default(false)    @map("reduce_motion")
  screenReaderOptimized     Boolean   @default(false)    @map("screen_reader_optimized")

  createdAt                 DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt                 DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  @@index([userId])
  @@map("user_preferences")
}
```

### What Changed vs Old Schema

| Removed | Why |
|---------|-----|
| `alert_methods` (Json array) | Replaced by `alertChannels` per-priority |
| `desktop_notifications` (Boolean) | Renamed to `browserNotifications` |
| `sound_enabled` (Boolean) | Upgraded to `soundSettings` (per-priority Json) |
| `email_notifications` (Boolean) | Now part of `alertChannels` |
| `sms_notifications` (Boolean) | Now part of `alertChannels` |

| Added | Why |
|-------|-----|
| `alertChannels` (Json) | Per-priority channel overrides — the right abstraction |
| `soundSettings` (Json) | Per-priority sound control |
| `browserNotifications` (Boolean) | Replaces `desktopNotifications` with clearer name |
| `flashTabOnCritical` (Boolean) | From notification prefs — useful visual indicator |
| `defaultSnoozeDuration` (Int) | From notification prefs — snooze default |
| `quietHoursEnabled` (Boolean) | Explicit toggle (old schema had implicit null check) |

| Dropped Entirely | Why |
|-------------------|-----|
| `UserNotificationPreferences` table | Consolidated into UserPreferences |
| `notificationChannels` field | System notifications are always in-app only |

### `AlertConfiguration` (Unchanged)

The tenant-level `AlertConfiguration` stays exactly as-is. It provides the defaults that `alertChannels` overrides:

```prisma
model AlertConfiguration {
  id              Int       @id @default(autoincrement())
  tenantId        Int       @unique @map("tenant_id")
  alertTypes      Json      @map("alert_types")        // per-type: enabled, mandatory, thresholds
  escalationPolicy Json     @map("escalation_policy")  // per-priority: SLA, escalateTo, channels
  groupingConfig  Json      @map("grouping_config")    // dedup, grouping rules
  defaultChannels Json      @map("default_channels")   // per-priority: { inApp, email, push, sms }
  // ...
}
```

---

## 5. Backend Architecture

### New: Channel Resolution Service

This is the **missing piece** — a service that resolves tenant defaults + user overrides into a final channel list.

```typescript
// apps/backend/src/domains/operations/notifications/channel-resolution.service.ts

@Injectable()
export class ChannelResolutionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Determines which channels to use for delivering an alert to a specific user.
   *
   * Resolution order:
   * 1. Start with tenant's AlertConfiguration.defaultChannels[priority]
   * 2. Apply user's UserPreferences.alertChannels[priority] overrides
   * 3. If alert type is mandatory, ensure in-app is always on
   * 4. If user is in quiet hours, suppress push + sound (except CRITICAL)
   * 5. Return final channel list + sound/browser flags
   */
  async resolveChannels(params: {
    tenantId: number;
    userId: number;
    alertPriority: string;    // 'critical' | 'high' | 'medium' | 'low'
    alertType: string;        // 'HOS_VIOLATION', etc.
  }): Promise<ResolvedChannels> {

    // 1. Get tenant defaults
    const tenantConfig = await this.getAlertConfig(params.tenantId);
    const defaults = tenantConfig.defaultChannels[params.alertPriority]
      ?? { inApp: true, email: false, push: false, sms: false };

    // 2. Get user overrides
    const userPrefs = await this.getUserPrefs(params.userId);
    const userOverride = userPrefs.alertChannels?.[params.alertPriority];
    const channels = userOverride ?? defaults;

    // 3. Mandatory alert types always get in-app
    const alertTypeConfig = tenantConfig.alertTypes?.[params.alertType];
    if (alertTypeConfig?.mandatory) {
      channels.inApp = true;
    }

    // 4. Quiet hours suppression (except CRITICAL)
    const inQuietHours = this.isInQuietHours(userPrefs);
    if (inQuietHours && params.alertPriority !== 'critical') {
      channels.push = false;
    }

    // 5. Sound & browser flags
    const playSound = userPrefs.soundSettings?.[params.alertPriority] ?? false;
    const showBrowserNotif = userPrefs.browserNotifications && channels.push;
    const flashTab = params.alertPriority === 'critical' && userPrefs.flashTabOnCritical;

    return {
      channels: this.toChannelList(channels), // ['in_app', 'email', ...]
      playSound: inQuietHours && params.alertPriority !== 'critical' ? false : playSound,
      showBrowserNotification: showBrowserNotif,
      flashTab,
      suppressedByQuietHours: inQuietHours && params.alertPriority !== 'critical',
    };
  }
}
```

### Modified: Alert Generation → Delivery Pipeline

Currently `alert-generation.service.ts` just creates the alert and broadcasts SSE. The new flow:

```
Alert triggers (e.g., HOS approaching)
    ↓
alert-generation.service.ts creates Alert record
    ↓
For each dispatcher in tenant:
    ↓
    channel-resolution.service.ts resolves channels for this user
    ↓
    delivery.service.ts delivers to resolved channels
    ↓
    SSE event includes { playSound, flashTab } flags for frontend
```

### Modified: SSE Event Payload

Current SSE event:
```json
{ "alert_id": "...", "alert_type": "...", "priority": "...", "title": "..." }
```

New SSE event (includes preference-driven flags):
```json
{
  "alert_id": "...",
  "alert_type": "...",
  "priority": "...",
  "title": "...",
  "playSound": true,
  "flashTab": true
}
```

This way the frontend doesn't need to re-read preferences on every alert — the backend resolves and tells it what to do.

### Files to Delete

```
apps/backend/src/domains/platform/preferences/notification-preferences.service.ts
apps/backend/src/domains/platform/preferences/notification-preferences.controller.ts
apps/backend/src/domains/platform/preferences/dto/notification-preferences.dto.ts
```

### Files to Create

```
apps/backend/src/domains/operations/notifications/channel-resolution.service.ts
```

### Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Remove `UserNotificationPreferences`, update `UserPreferences` |
| `dto/user-preferences.dto.ts` | Add `alertChannels`, `soundSettings`, `browserNotifications`, `flashTabOnCritical`, `defaultSnoozeDuration`, `quietHoursEnabled`. Remove `alertMethods`, `desktopNotifications`, `soundEnabled` (Bool), `emailNotifications`, `smsNotifications` |
| `user-preferences.service.ts` | Already handles upsert — verify defaults |
| `preferences.module.ts` | Remove notification prefs imports |
| `alert-generation.service.ts` | After creating alert, call channel resolution → delivery for each dispatcher |
| `delivery.service.ts` | Receives resolved channels (no change to its interface, but callers change) |
| `delivery.service.spec.ts` | Update mocks |
| User model in schema | Remove `notificationPreferences` relation |

---

## 6. Frontend Architecture

### Modified: SSE Handler (consumption)

The `use-sse.ts` hook needs to actually act on preference-resolved flags:

```typescript
// In use-sse.ts or a new useAlertNotifications hook

eventSource.addEventListener('alert:new', (e) => {
  const data = JSON.parse(e.data);

  // React Query invalidation (existing)
  queryClient.invalidateQueries({ queryKey: ['alerts'] });

  // Sound (NEW — based on backend-resolved flag)
  if (data.playSound && !document.hasFocus()) {
    playAlertSound(data.priority); // different tones per priority
  }

  // Browser notification (NEW — uses Notification API)
  if (Notification.permission === 'granted' && !document.hasFocus()) {
    new Notification(data.title, {
      body: data.message,
      icon: '/alert-icon.png',
      tag: data.alert_id, // dedup
    });
  }

  // Flash tab (NEW)
  if (data.flashTab && !document.hasFocus()) {
    flashTabTitle(`⚠ ${data.title}`);
  }

  options.onAlertNew?.(data);
});
```

### Modified: Preferences UI (one form, one save)

```
┌─────────────────────────────────────────────────────┐
│ DISPLAY                                              │
│ Distance · Time · Temperature · Currency · Timezone  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ DASHBOARD                                            │
│ Auto-refresh · Default view · Compact · Contrast     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ALERT DELIVERY                                       │
│                                                      │
│ How should we notify you?                            │
│                                                      │
│              In-App   Email    Push    SMS            │
│ Critical  🔒  [✓]     [✓]     [✓]    [✓]           │
│ High         [✓]     [✓]     [ ]    [ ]            │
│ Medium       [✓]     [ ]     [ ]    [ ]            │
│ Low          [✓]     [ ]     [ ]    [ ]            │
│                                                      │
│ 🔒 = Enforced by your organization                   │
│                                                      │
│ ── Sound ──                                          │
│ Critical  🔒                          [on]           │
│ High                                  [on]           │
│ Medium                                [off]          │
│ Low                                   [off]          │
│                                                      │
│ ── Browser ──                                        │
│ Browser Notifications                 [on]           │
│ Flash Tab on Critical                 [on]           │
│                                                      │
│ ── Quiet Hours ──                                    │
│ Enable Quiet Hours                    [off]          │
│ Start                          [22:00]               │
│ End                            [06:00]               │
│ (Critical alerts always delivered)                   │
│                                                      │
│ ── Snooze ──                                         │
│ Default Snooze Duration        [15 min ▼]            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ACCESSIBILITY                                        │
│ Font size · Reduce motion · Screen reader            │
└─────────────────────────────────────────────────────┘

              [Reset to Defaults]    [Save Preferences]
```

### Frontend File Changes

| File | Change |
|------|--------|
| `UserPreferencesTab.tsx` | Remove dual state, dual API calls, dual save buttons. Single `formData` state with all fields. One `handleSave`. Add per-priority channel grid, sound toggles, quiet hours section. |
| `features/platform/preferences/store.ts` | Update `UserPreferences` type — add new fields, remove old ones |
| `features/platform/preferences/api.ts` | Remove notification prefs API call if separate |
| `shared/hooks/use-sse.ts` | Add sound playback, browser notification, tab flash on `alert:new` event |
| New: `shared/lib/alert-sounds.ts` | Sound playback utility (Web Audio API or `<audio>` element) |
| New: `shared/lib/tab-flash.ts` | Tab title flashing utility |

---

## 7. Migration Strategy

Since no real user data to preserve:

1. Drop `user_notification_preferences` table
2. Drop old notification columns from `user_preferences` (`alert_methods`, `desktop_notifications`, `sound_enabled`, `email_notifications`, `sms_notifications`)
3. Add new columns to `user_preferences` (`alert_channels`, `sound_settings`, `browser_notifications`, `flash_tab_on_critical`, `default_snooze_duration`, `quiet_hours_enabled`)
4. Remove `UserNotificationPreferences` model from Prisma schema
5. Remove `notificationPreferences` relation from `User` model
6. Run `prisma migrate dev --name consolidate_preferences`

---

## 8. Smart Defaults

| Setting | Default | Why |
|---------|---------|-----|
| `alertChannels` | `{}` (empty = use tenant defaults) | Don't override until user explicitly customizes |
| `soundSettings` | `{critical: true, high: true, medium: false, low: false}` | Critical/high deserve attention. Medium/low are informational |
| `browserNotifications` | `true` | Dispatchers need real-time awareness |
| `flashTabOnCritical` | `true` | Critical alerts should be unmissable |
| `quietHoursEnabled` | `false` | Off by default — dispatchers on shift need everything |
| `defaultSnoozeDuration` | `15` min | Industry standard for alert snooze |
| `minAlertPriority` | `LOW` | Show everything by default, let users filter up |
| `emailDigestFrequency` | `NEVER` | Opt-in, not opt-out |

---

## 9. What This Solves (No Hassle Later)

| Problem | How This Prevents It |
|---------|---------------------|
| "Preferences don't do anything" | Channel resolution service actually reads prefs and routes delivery |
| "Two tables for same thing" | One table, one API, one save |
| "Sound doesn't play" | Frontend SSE handler plays sound based on backend-resolved `playSound` flag |
| "Browser notifications don't work" | Frontend requests permission and shows notifications based on `showBrowserNotification` flag |
| "Tab doesn't flash" | Frontend flashes title based on `flashTab` flag |
| "Which channels does this user get?" | `ChannelResolutionService.resolveChannels()` — one function, deterministic answer |
| "Tenant admin can't enforce channels" | `AlertConfiguration.alertTypes[x].mandatory` prevents users from disabling in-app |
| "Quiet hours don't work" | Channel resolution checks quiet hours and suppresses push/sound (except critical) |
| "Adding a new preference field" | One table, one DTO, one service, one form — add to each, done |

---

## 10. Sources

- PagerDuty Notification Rules — per-urgency grouping
- Linear Notifications — single settings page, channel dots
- Samsara Fleet Settings — category-based configuration
- Datadog Notification Rules — urgency-based simplification
- Smashing Magazine Notifications UX — one save button per page
