# Unified Settings & Preferences -- Implementation

> **Status:** Implemented (partial -- ChannelResolution pending) | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-02-07-preferences-consolidation-implementation.md`, `2026-02-09-unified-settings-redesign.md`

---

## Implementation Summary

### Completed Steps

| # | Step | Status | Description |
|---|------|--------|-------------|
| 1 | Schema consolidation | Done | `UserPreferences` model unified with alert delivery fields (`alertChannels`, `soundSettings`, `browserNotifications`, `flashTabOnCritical`, `quietHoursEnabled`, `defaultSnoozeDuration`). Old `UserNotificationPreferences` table dropped. |
| 2 | Dead code deletion | Done | Removed `notification-preferences.service.ts`, `notification-preferences.controller.ts`, `dto/notification-preferences.dto.ts`. |
| 3 | DTO update | Done | `UpdateUserPreferencesDto` updated: removed `alertMethods`, `desktopNotifications`, `soundEnabled`, `emailNotifications`, `smsNotifications`. Added `alertChannels`, `soundSettings`, `browserNotifications`, `flashTabOnCritical`, `quietHoursEnabled`, `defaultSnoozeDuration`. |
| 4 | Backend domain rename | Done | Folder renamed from `platform/preferences/` to `platform/settings/`. Module renamed to `SettingsModule`. |
| 5 | Route prefix change | Done | All routes changed from `/preferences/*` to `/settings/*`. |
| 6 | HOS threshold migration | Done | 9 threshold fields removed from `FleetOperationsSettings`. `complianceThresholds` column removed from `AlertConfiguration`. All thresholds merged into `alertTypes` JSON entries. |
| 7 | Frontend feature folder | Done | Renamed from `features/platform/preferences/` to `features/platform/settings/`. |
| 8 | Settings sidebar layout | Done | `app/settings/layout.tsx` created with role-based sidebar navigation. |
| 9 | Section pages created | Done | `general/`, `notifications/`, `operations/`, `alerts/`, `driver/`, `integrations/`, `api-keys/` pages exist. |
| 10 | Old pages deleted | Done | `app/settings/preferences/` directory removed (including DispatcherPreferencesTab duplicate). |

### Pending Steps

| # | Step | Status | Description |
|---|------|--------|-------------|
| 11 | ChannelResolutionService | Designed | New service at `operations/notifications/channel-resolution.service.ts` that resolves tenant defaults + user overrides into delivery channels. |
| 12 | Alert generation wiring | Designed | `alert-generation.service.ts` needs to call ChannelResolutionService for per-user delivery instead of tenant-wide SSE broadcast. |
| 13 | SSE handler updates | Designed | Frontend `use-sse.ts` hook needs to consume `playSound` and `flashTab` flags from SSE events. |
| 14 | Alert sound utility | Designed | `shared/lib/alert-sounds.ts` -- Web Audio API tone per priority. |
| 15 | Tab flash utility | Designed | `shared/lib/tab-flash.ts` -- Browser tab title flashing on critical alerts. |
| 16 | Delivery service test fix | Designed | `delivery.service.spec.ts` mock references old `userNotificationPreferences` -- needs updating. |

---

## Database Migrations Applied

1. **consolidate_preferences** -- Merged `UserNotificationPreferences` into `UserPreferences`, dropped old table.
2. **add_compliance_thresholds_to_alert_config** -- Added `compliance_thresholds` JSONB column (intermediate step).
3. **remove_threshold_fields_from_operations_settings** -- Dropped 9 threshold columns from `operations_settings` table.
4. **remove_compliance_thresholds_column** -- Dropped `compliance_thresholds` column (thresholds now live inside `alert_types` JSON).

---

## Files Manifest (Current State)

### Backend Files

| File | Status |
|------|--------|
| `apps/backend/prisma/schema.prisma` (UserPreferences) | Done -- consolidated model |
| `apps/backend/prisma/schema.prisma` (FleetOperationsSettings) | Done -- threshold fields removed |
| `apps/backend/prisma/schema.prisma` (AlertConfiguration) | Done -- no complianceThresholds column |
| `apps/backend/prisma/schema.prisma` (DriverPreferences) | Done -- unchanged |
| `apps/backend/src/domains/platform/settings/settings.module.ts` | Done |
| `apps/backend/src/domains/platform/settings/user-preferences.controller.ts` | Done |
| `apps/backend/src/domains/platform/settings/user-preferences.service.ts` | Done |
| `apps/backend/src/domains/platform/settings/operations-settings.controller.ts` | Done |
| `apps/backend/src/domains/platform/settings/operations-settings.service.ts` | Done |
| `apps/backend/src/domains/platform/settings/alert-config.controller.ts` | Done |
| `apps/backend/src/domains/platform/settings/alert-config.service.ts` | Done |
| `apps/backend/src/domains/platform/settings/super-admin-preferences.controller.ts` | Done |
| `apps/backend/src/domains/platform/settings/super-admin-preferences.service.ts` | Done |
| `apps/backend/src/domains/platform/settings/dto/user-preferences.dto.ts` | Done |
| `apps/backend/src/domains/platform/settings/dto/driver-preferences.dto.ts` | Done |
| `apps/backend/src/domains/platform/settings/dto/operations-settings.dto.ts` | Done |
| `apps/backend/src/domains/platform/settings/dto/alert-config.dto.ts` | Done |
| `apps/backend/src/domains/platform/settings/dto/super-admin-preferences.dto.ts` | Done |
| `apps/backend/src/domains/operations/notifications/channel-resolution.service.ts` | Pending |

### Frontend Files

| File | Status |
|------|--------|
| `apps/web/src/app/settings/layout.tsx` | Done |
| `apps/web/src/app/settings/page.tsx` | Done |
| `apps/web/src/app/settings/general/page.tsx` | Done |
| `apps/web/src/app/settings/notifications/page.tsx` | Done |
| `apps/web/src/app/settings/operations/page.tsx` | Done |
| `apps/web/src/app/settings/alerts/page.tsx` | Done |
| `apps/web/src/app/settings/driver/page.tsx` | Done |
| `apps/web/src/app/settings/integrations/page.tsx` | Done |
| `apps/web/src/app/settings/api-keys/page.tsx` | Done |
| `apps/web/src/shared/lib/alert-sounds.ts` | Pending |
| `apps/web/src/shared/lib/tab-flash.ts` | Pending |

---

## ChannelResolutionService Design (For Future Implementation)

```typescript
// apps/backend/src/domains/operations/notifications/channel-resolution.service.ts

interface ResolvedChannels {
  channels: string[];               // ['in_app', 'email', 'push', 'sms']
  playSound: boolean;
  showBrowserNotification: boolean;
  flashTab: boolean;
  suppressedByQuietHours: boolean;
}

async resolveChannels(params: {
  tenantId: number;
  userId: number;
  alertPriority: string;
  alertType: string;
}): Promise<ResolvedChannels>
```

Resolution order:
1. Start with tenant `AlertConfiguration.defaultChannels[priority]`
2. Apply user `UserPreferences.alertChannels[priority]` overrides
3. If alert type is mandatory, ensure in-app stays on
4. If user in quiet hours and not CRITICAL, suppress push + sound
5. Return final channel list + UI flags

---

## Execution Dependencies

```
Schema migration (done)
    |
    +-- Backend DTO update (done) --> Backend settings rename (done)
    |
    +-- ChannelResolutionService (pending)
    |       |
    |       +-- Wire to alert-generation.service.ts (pending)
    |               |
    |               +-- SSE handler + alert-sounds.ts + tab-flash.ts (pending)
    |
    +-- Frontend feature rename (done) --> Settings pages (done)
```

---

## Testing Notes

- Backend compiles without errors (`npx tsc --noEmit`)
- Frontend settings pages render with sidebar navigation
- All API routes respond under `/settings/*` prefix
- ChannelResolutionService unit tests should cover: no overrides (use tenant defaults), user overrides, mandatory alert types, quiet hours suppression, CRITICAL exception
