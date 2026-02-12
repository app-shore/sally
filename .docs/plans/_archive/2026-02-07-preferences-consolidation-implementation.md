# Implementation Plan: Preferences Consolidation

> Step-by-step implementation for consolidating preferences and wiring up the preference → delivery pipeline.

**Design Doc:** `.docs/plans/2026-02-07-preferences-consolidation-design.md`
**Created:** February 7, 2026
**Status:** Ready for execution

---

## Overview

This plan implements three things:
1. **Schema consolidation** — Merge `UserNotificationPreferences` into `UserPreferences`, delete dead code
2. **Channel resolution service** — New backend service that resolves tenant defaults + user overrides into delivery channels
3. **Frontend consumption** — Wire up SSE handler to play sounds, show browser notifications, flash tab

**Total steps:** 8
**Estimated files touched:** 14 (modify 9, delete 3, create 2)

---

## Step 1: Prisma Schema — Consolidate Models

**Goal:** Single `UserPreferences` model, drop `UserNotificationPreferences`

### 1a. Update `UserPreferences` model

**File:** `apps/backend/prisma/schema.prisma` (lines 774-817)

Replace the current `UserPreferences` model (lines 774-817) with the consolidated version from the design doc. Key changes:

**Remove these fields:**
- `alertMethods` (line 794) — replaced by `alertChannels`
- `desktopNotifications` (line 802) — renamed to `browserNotifications`
- `soundEnabled` Boolean (line 803) — upgraded to `soundSettings` Json
- `emailNotifications` (line 804) — moved into `alertChannels`
- `smsNotifications` (line 805) — moved into `alertChannels`

**Add these fields (in Alert Delivery section):**
```prisma
alertChannels             Json      @default("{}") @map("alert_channels")
soundSettings             Json      @default("{\"critical\":true,\"high\":true,\"medium\":false,\"low\":false}") @map("sound_settings")
browserNotifications      Boolean   @default(true)     @map("browser_notifications")
flashTabOnCritical        Boolean   @default(true)     @map("flash_tab_on_critical")
quietHoursEnabled         Boolean   @default(false)    @map("quiet_hours_enabled")
defaultSnoozeDuration     Int       @default(15)       @map("default_snooze_duration")
```

**Change default for `minAlertPriority`** from `"MEDIUM"` to `"LOW"`.

**Change default for `alertCategories`** to include all 6 categories: `["hos","delay","route","driver","vehicle","external"]`.

### 1b. Delete `UserNotificationPreferences` model

**File:** `apps/backend/prisma/schema.prisma` (lines 658-676)

Delete the entire `UserNotificationPreferences` model block.

### 1c. Remove relation from `User` model

**File:** `apps/backend/prisma/schema.prisma` (line 145)

Remove:
```prisma
notificationPreferences UserNotificationPreferences?
```

### 1d. Run migration

```bash
cd apps/backend && npx prisma migrate dev --name consolidate_preferences
```

This will drop `user_notification_preferences` table and modify `user_preferences` table. Since we confirmed no data to preserve, this is safe.

### Verification
- `npx prisma generate` succeeds
- `npx prisma migrate status` shows clean state
- No TypeScript errors from generated Prisma client

---

## Step 2: Backend — Delete Notification Preferences Files

**Goal:** Remove the dead `NotificationPreferences` service, controller, and DTO

### 2a. Delete files

Delete these 3 files:
1. `apps/backend/src/domains/platform/preferences/notification-preferences.service.ts`
2. `apps/backend/src/domains/platform/preferences/notification-preferences.controller.ts`
3. `apps/backend/src/domains/platform/preferences/dto/notification-preferences.dto.ts`

### 2b. Update `preferences.module.ts`

**File:** `apps/backend/src/domains/platform/preferences/preferences.module.ts`

Remove these lines:
- Lines 20-22: The import statements for `NotificationPreferencesController` and `NotificationPreferencesService`
- Line 31: `NotificationPreferencesController` from `controllers` array
- Line 38: `NotificationPreferencesService` from `providers` array
- Line 45: `NotificationPreferencesService` from `exports` array

### Verification
- `npx tsc --noEmit` passes with no errors
- Backend starts without errors

---

## Step 3: Backend — Update User Preferences DTO

**Goal:** Update `UpdateUserPreferencesDto` to match new schema

**File:** `apps/backend/src/domains/platform/preferences/dto/user-preferences.dto.ts`

### 3a. Add `IsObject` to imports (line 1)

Add `IsObject` to the class-validator import.

### 3b. Remove old notification fields (lines 88-103)

Remove:
```typescript
// Notification Preferences
@IsOptional()
@IsBoolean()
desktopNotifications?: boolean;

@IsOptional()
@IsBoolean()
soundEnabled?: boolean;

@IsOptional()
@IsBoolean()
emailNotifications?: boolean;

@IsOptional()
@IsBoolean()
smsNotifications?: boolean;
```

### 3c. Remove `alertMethods` field (lines 62-64)

Remove:
```typescript
@IsOptional()
@IsArray()
alertMethods?: string[];
```

### 3d. Add new consolidated notification fields

Add after the `emailDigestFrequency` field (line 86), before Accessibility:

```typescript
// Alert Delivery (per-priority channel overrides)
@IsOptional()
@IsObject()
alertChannels?: Record<string, { inApp: boolean; email: boolean; push: boolean; sms: boolean }>;

// Sound (per-priority)
@IsOptional()
@IsObject()
soundSettings?: Record<string, boolean>;

// Browser & display
@IsOptional()
@IsBoolean()
browserNotifications?: boolean;

@IsOptional()
@IsBoolean()
flashTabOnCritical?: boolean;

// Quiet hours
@IsOptional()
@IsBoolean()
quietHoursEnabled?: boolean;

// Snooze
@IsOptional()
@IsInt()
@Min(5)
@Max(480)
defaultSnoozeDuration?: number;
```

### Verification
- `npx tsc --noEmit` passes
- DTO accepts the new field shapes

---

## Step 4: Backend — Create Channel Resolution Service

**Goal:** Build the missing Layer 3 — resolves tenant defaults + user overrides into delivery instructions

**New file:** `apps/backend/src/domains/operations/notifications/channel-resolution.service.ts`

### 4a. Create the service

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

interface ChannelFlags {
  inApp: boolean;
  email: boolean;
  push: boolean;
  sms: boolean;
}

export interface ResolvedChannels {
  channels: string[];
  playSound: boolean;
  showBrowserNotification: boolean;
  flashTab: boolean;
  suppressedByQuietHours: boolean;
}

@Injectable()
export class ChannelResolutionService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveChannels(params: {
    tenantId: number;
    userId: number;
    alertPriority: string;
    alertType: string;
  }): Promise<ResolvedChannels> {
    // 1. Get tenant defaults
    const tenantConfig = await this.prisma.alertConfiguration.findUnique({
      where: { tenantId: params.tenantId },
    });

    const defaultChannels: Record<string, ChannelFlags> = {
      critical: { inApp: true, email: true, push: true, sms: true },
      high: { inApp: true, email: true, push: true, sms: false },
      medium: { inApp: true, email: false, push: false, sms: false },
      low: { inApp: true, email: false, push: false, sms: false },
    };

    const tenantDefaults = (tenantConfig?.defaultChannels as Record<string, ChannelFlags>)?.[params.alertPriority]
      ?? defaultChannels[params.alertPriority]
      ?? { inApp: true, email: false, push: false, sms: false };

    // 2. Get user overrides
    const userPrefs = await this.prisma.userPreferences.findUnique({
      where: { userId: params.userId },
    });

    const userOverrides = (userPrefs?.alertChannels as Record<string, ChannelFlags>)?.[params.alertPriority];
    const channels: ChannelFlags = userOverrides
      ? { ...userOverrides }
      : { ...tenantDefaults };

    // 3. Mandatory alert types always get in-app
    const alertTypes = (tenantConfig?.alertTypes as Record<string, { mandatory?: boolean }>) ?? {};
    if (alertTypes[params.alertType]?.mandatory) {
      channels.inApp = true;
    }

    // 4. Quiet hours suppression (except CRITICAL)
    const inQuietHours = this.isInQuietHours(userPrefs);
    if (inQuietHours && params.alertPriority !== 'critical') {
      channels.push = false;
    }

    // 5. Sound & browser flags
    const soundSettings = (userPrefs?.soundSettings as Record<string, boolean>) ?? {
      critical: true, high: true, medium: false, low: false,
    };
    const playSound = soundSettings[params.alertPriority] ?? false;
    const browserNotifs = userPrefs?.browserNotifications ?? true;
    const flashTabOnCritical = userPrefs?.flashTabOnCritical ?? true;

    return {
      channels: this.toChannelList(channels),
      playSound: inQuietHours && params.alertPriority !== 'critical' ? false : playSound,
      showBrowserNotification: browserNotifs && channels.push,
      flashTab: params.alertPriority === 'critical' && flashTabOnCritical,
      suppressedByQuietHours: inQuietHours && params.alertPriority !== 'critical',
    };
  }

  private isInQuietHours(prefs: any): boolean {
    if (!prefs?.quietHoursEnabled || !prefs?.quietHoursStart || !prefs?.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const tz = prefs.timezone || 'America/New_York';
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz,
    });
    const currentTime = formatter.format(now);

    const start = prefs.quietHoursStart;
    const end = prefs.quietHoursEnd;

    // Handle overnight quiet hours (e.g., 22:00 - 06:00)
    if (start > end) {
      return currentTime >= start || currentTime < end;
    }
    return currentTime >= start && currentTime < end;
  }

  private toChannelList(flags: ChannelFlags): string[] {
    const list: string[] = [];
    if (flags.inApp) list.push('in_app');
    if (flags.email) list.push('email');
    if (flags.push) list.push('push');
    if (flags.sms) list.push('sms');
    return list;
  }
}
```

### 4b. Register in notifications module

**File:** `apps/backend/src/domains/operations/notifications/notifications.module.ts`

Add `ChannelResolutionService` to imports, providers, and exports:

```typescript
import { ChannelResolutionService } from './channel-resolution.service';

// In @Module:
providers: [InAppNotificationService, NotificationDeliveryService, ChannelResolutionService],
exports: [InAppNotificationService, NotificationDeliveryService, ChannelResolutionService],
```

### Verification
- `npx tsc --noEmit` passes
- Service is injectable via NestJS DI
- Unit test the `resolveChannels` method with:
  - User with no overrides → uses tenant defaults
  - User with overrides → uses user channels
  - Mandatory alert type → in-app forced on
  - Quiet hours active + non-critical → push suppressed
  - Quiet hours active + critical → not suppressed

---

## Step 5: Backend — Wire Alert Generation to Channel Resolution

**Goal:** When an alert is generated, resolve channels per-user and deliver accordingly

**File:** `apps/backend/src/domains/operations/alerts/services/alert-generation.service.ts`

### 5a. Inject new dependencies

Add `ChannelResolutionService` and `NotificationDeliveryService` to the constructor (line 25-29):

```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly sseService: SseService,
  private readonly groupingService: AlertGroupingService,
  private readonly channelResolution: ChannelResolutionService,
  private readonly deliveryService: NotificationDeliveryService,
) {}
```

Add imports at top:
```typescript
import { ChannelResolutionService } from '../../notifications/channel-resolution.service';
import { NotificationDeliveryService } from '../../notifications/delivery.service';
```

### 5b. Add per-user delivery after alert creation

After Step 5 (SSE event, line 108), add a new Step 6 that resolves channels and delivers per-user:

```typescript
// Step 6: Resolve channels and deliver per-user
try {
  const dispatchers = await this.prisma.user.findMany({
    where: {
      tenantId: params.tenantId,
      role: { in: ['OWNER', 'ADMIN', 'DISPATCHER'] },
      isActive: true,
      deletedAt: null,
    },
    select: { id: true, userId: true, email: true },
  });

  for (const dispatcher of dispatchers) {
    const resolved = await this.channelResolution.resolveChannels({
      tenantId: params.tenantId,
      userId: dispatcher.id,
      alertPriority: params.priority.toLowerCase(),
      alertType: params.alertType,
    });

    // Emit per-user SSE with preference-resolved flags
    this.sseService.emitToUser(dispatcher.userId, 'alert:new', {
      alert_id: alert.alertId,
      alert_type: alert.alertType,
      category: alert.category,
      priority: alert.priority,
      title: alert.title,
      message: alert.message,
      driver_id: alert.driverId,
      created_at: alert.createdAt,
      playSound: resolved.playSound,
      flashTab: resolved.flashTab,
    });

    // Deliver to non-in-app channels (email, push, sms)
    const externalChannels = resolved.channels.filter(c => c !== 'in_app');
    if (externalChannels.length > 0) {
      await this.deliveryService.deliver({
        recipientUserId: dispatcher.userId,
        recipientDbId: dispatcher.id,
        tenantId: params.tenantId,
        type: 'DISPATCH_MESSAGE',
        category: alert.category,
        title: alert.title,
        message: alert.message,
        channels: externalChannels,
        recipientEmail: dispatcher.email,
      });
    }
  }
} catch (error: any) {
  this.logger.error(`Per-user delivery failed: ${error.message}`);
}
```

### 5c. Replace tenant-wide SSE broadcast with per-user

Remove the existing `emitToTenant` call (lines 99-108) since we now emit per-user SSE with preference flags in Step 6. Replace it with a comment:

```typescript
// Per-user SSE emission with preference flags happens in Step 6 below
```

### 5d. Update alerts module imports

**File:** `apps/backend/src/domains/operations/alerts/alerts.module.ts`

Add `InAppNotificationsModule` to imports so `ChannelResolutionService` and `NotificationDeliveryService` are available:

```typescript
import { InAppNotificationsModule } from '../notifications/notifications.module';

// In @Module.imports:
imports: [PrismaModule, NotificationModule, CacheModule, InAppNotificationsModule],
```

### Verification
- `npx tsc --noEmit` passes
- When an alert is generated via `/alerts/seed`, each dispatcher receives a per-user SSE event with `playSound` and `flashTab` flags
- External channels (email, push, SMS) are delivered based on resolved preferences

---

## Step 6: Backend — Update Delivery Service Test

**Goal:** Fix the test mock that references the old `userNotificationPreferences`

**File:** `apps/backend/src/domains/operations/notifications/delivery.service.spec.ts`

### 6a. Update mock (line 14)

Change:
```typescript
const mockPrisma = { userNotificationPreferences: { findUnique: jest.fn() } };
```
To:
```typescript
const mockPrisma = { userPreferences: { findUnique: jest.fn() } };
```

### Verification
- `npx jest delivery.service.spec` passes

---

## Step 7: Frontend — Update Types and Preferences UI

**Goal:** Unified form with one save button, updated types

### 7a. Update `UserPreferences` interface

**File:** `apps/web/src/features/platform/preferences/api.ts` (lines 4-32)

Replace the `UserPreferences` interface with:

```typescript
export interface UserPreferences {
  id: number;
  userId: number;
  // Display
  distanceUnit: string;
  timeFormat: string;
  temperatureUnit: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  // Dashboard
  autoRefreshInterval: number;
  defaultView: string;
  compactMode: boolean;
  highContrastMode: boolean;
  // Alert Delivery
  alertChannels: Record<string, { inApp: boolean; email: boolean; push: boolean; sms: boolean }>;
  minAlertPriority: string;
  alertCategories: string[];
  // Sound & Browser
  soundSettings: Record<string, boolean>;
  browserNotifications: boolean;
  flashTabOnCritical: boolean;
  // Quiet Hours
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  // Snooze & Digest
  defaultSnoozeDuration: number;
  emailDigestFrequency: string;
  // Accessibility
  fontSize: string;
  reduceMotion: boolean;
  screenReaderOptimized: boolean;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}
```

### 7b. Rewrite `UserPreferencesTab.tsx`

**File:** `apps/web/src/app/settings/preferences/components/UserPreferencesTab.tsx`

Major changes:
1. **Remove** the `NotificationPrefs` interface (lines 16-21)
2. **Remove** the separate `notifPrefs` state, `notifSaving`, `notifSaveSuccess` (lines 40-42)
3. **Remove** the `useEffect` that loads from `/preferences/notifications` (lines 44-56)
4. **Remove** the `handleSaveNotifPrefs` function (lines 58-74)
5. **Remove** the separate "Save Notification Preferences" button (lines 409-423)
6. **Remove** the `notifSaveSuccess` alert (lines 309-312)

Replace the "Alert Preferences" card (lines 264-304) and "Notification Preferences" section (lines 306-425) with a single **Alert Delivery** card that includes:

- **Channel grid** — 4 rows (Critical, High, Medium, Low) x 4 columns (In-App, Email, Push, SMS) using Switches. Lock icon on Critical in-app (always on). Reads/writes `formData.alertChannels`.
- **Minimum Alert Priority** — Select dropdown (existing, unchanged)
- **Sound section** — Per-priority sound toggles. Lock on Critical (always on). Reads/writes `formData.soundSettings`.
- **Browser section** — `browserNotifications` Switch, `flashTabOnCritical` Switch. Reads/writes `formData.browserNotifications` and `formData.flashTabOnCritical`.
- **Quiet Hours section** — `quietHoursEnabled` Switch, conditional `quietHoursStart`/`quietHoursEnd` Inputs. Note: "Critical alerts always delivered".
- **Snooze section** — `defaultSnoozeDuration` Select (existing snooze options, reads/writes `formData.defaultSnoozeDuration`)

All notification fields now part of `formData` → saved with the single "Save Preferences" button.

**UI requirements (from CLAUDE.md):**
- Use Shadcn components (Card, Switch, Select, Label, Input, Button, Alert)
- Dark theme: `text-muted-foreground`, `bg-background`, `border-border`
- Responsive: `grid-cols-1 md:grid-cols-2` where appropriate
- Only black/white/gray colors

### Verification
- Page loads without errors
- One save button saves all preferences (display + dashboard + notifications + accessibility)
- No separate API call to `/preferences/notifications`
- Channel grid shows checkboxes per priority per channel
- Sound toggles work per priority
- Quiet hours toggle reveals start/end inputs
- Critical in-app channel shows lock icon and is disabled

---

## Step 8: Frontend — Wire SSE Handler for Sound, Browser Notif, Tab Flash

**Goal:** When `alert:new` SSE event arrives with `playSound`/`flashTab` flags, act on them

### 8a. Create alert sound utility

**New file:** `apps/web/src/shared/lib/alert-sounds.ts`

```typescript
const SOUNDS: Record<string, number> = {
  critical: 880,  // High pitch
  high: 660,
  medium: 440,
  low: 330,
};

export function playAlertSound(priority: string) {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = SOUNDS[priority] || 440;
    oscillator.type = 'sine';
    gain.gain.value = 0.3;
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    oscillator.stop(ctx.currentTime + 0.5);
  } catch {
    // AudioContext not available (SSR or unsupported browser)
  }
}
```

### 8b. Create tab flash utility

**New file:** `apps/web/src/shared/lib/tab-flash.ts`

```typescript
let flashInterval: ReturnType<typeof setInterval> | null = null;
let originalTitle = '';

export function flashTabTitle(alertTitle: string) {
  if (flashInterval) return; // Already flashing
  originalTitle = document.title;

  let showAlert = true;
  flashInterval = setInterval(() => {
    document.title = showAlert ? alertTitle : originalTitle;
    showAlert = !showAlert;
  }, 1000);

  // Stop flashing when tab gets focus
  const stopFlash = () => {
    if (flashInterval) {
      clearInterval(flashInterval);
      flashInterval = null;
      document.title = originalTitle;
    }
    window.removeEventListener('focus', stopFlash);
  };
  window.addEventListener('focus', stopFlash);
}
```

### 8c. Update SSE hook

**File:** `apps/web/src/shared/hooks/use-sse.ts`

Update the `alert:new` event handler (line 34-37) to consume preference flags:

```typescript
import { playAlertSound } from '@/shared/lib/alert-sounds';
import { flashTabTitle } from '@/shared/lib/tab-flash';
```

Replace the `alert:new` listener:

```typescript
eventSource.addEventListener('alert:new', (e) => {
  const data = JSON.parse(e.data);
  queryClient.invalidateQueries({ queryKey: ['alerts'] });

  // Sound (preference-resolved by backend)
  if (data.playSound && !document.hasFocus()) {
    playAlertSound(data.priority?.toLowerCase());
  }

  // Browser notification
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && !document.hasFocus()) {
    new Notification(data.title, {
      body: data.message,
      tag: data.alert_id,
    });
  }

  // Flash tab
  if (data.flashTab && !document.hasFocus()) {
    flashTabTitle(`Alert: ${data.title}`);
  }

  options.onAlertNew?.(data);
});
```

### Verification
- Generate a test alert via `/alerts/seed`
- With tab unfocused: sound plays, browser notification shows, tab flashes for critical
- With tab focused: no sound, no browser notif, no flash
- With sound disabled for a priority: no sound for that priority
- With quiet hours active: push and sound suppressed for non-critical

---

## Execution Order

Steps 1-3 are **sequential** (schema → delete dead code → update DTO).

Steps 4 and 7a can be done in **parallel** (backend service and frontend types are independent).

Step 5 depends on Step 4 (needs ChannelResolutionService).

Step 6 can be done anytime after Step 1.

Steps 7b and 8 depend on Step 7a (need updated types).

```
Step 1 (Schema)
  ↓
Step 2 (Delete files)
  ↓
Step 3 (Update DTO)
  ↓
  ├── Step 4 (Channel Resolution Service) ──→ Step 5 (Wire to Alert Generation)
  ├── Step 6 (Fix test mock)
  └── Step 7a (Frontend types) ──→ Step 7b (Preferences UI) ──→ Step 8 (SSE handler)
```

---

## Review Checkpoints

**After Step 3:** Backend compiles, old notification preferences code fully removed, DTO updated. Run `npx tsc --noEmit`.

**After Step 5:** Full backend pipeline works. Generate test alert → channels resolved per user → delivered. Run tests.

**After Step 8:** Full end-to-end. Set preferences → generate alert → correct channels delivered → sound plays → tab flashes. Manual test in browser.

---

## Files Summary

| # | File | Action |
|---|------|--------|
| 1 | `apps/backend/prisma/schema.prisma` | Modify |
| 2 | `apps/backend/src/.../notification-preferences.service.ts` | **Delete** |
| 3 | `apps/backend/src/.../notification-preferences.controller.ts` | **Delete** |
| 4 | `apps/backend/src/.../dto/notification-preferences.dto.ts` | **Delete** |
| 5 | `apps/backend/src/.../preferences.module.ts` | Modify |
| 6 | `apps/backend/src/.../dto/user-preferences.dto.ts` | Modify |
| 7 | `apps/backend/src/.../user-preferences.service.ts` | Verify (no changes needed) |
| 8 | `apps/backend/src/.../notifications/channel-resolution.service.ts` | **Create** |
| 9 | `apps/backend/src/.../notifications/notifications.module.ts` | Modify |
| 10 | `apps/backend/src/.../alerts/services/alert-generation.service.ts` | Modify |
| 11 | `apps/backend/src/.../alerts/alerts.module.ts` | Modify |
| 12 | `apps/backend/src/.../notifications/delivery.service.spec.ts` | Modify |
| 13 | `apps/web/src/features/platform/preferences/api.ts` | Modify |
| 14 | `apps/web/src/app/settings/preferences/components/UserPreferencesTab.tsx` | Modify |
| 15 | `apps/web/src/shared/lib/alert-sounds.ts` | **Create** |
| 16 | `apps/web/src/shared/lib/tab-flash.ts` | **Create** |
| 17 | `apps/web/src/shared/hooks/use-sse.ts` | Modify |
