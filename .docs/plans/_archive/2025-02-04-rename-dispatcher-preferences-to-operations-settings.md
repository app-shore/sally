# Rename Dispatcher Preferences to Operations Settings

**Date**: 2025-02-04
**Status**: Approved
**Estimated Reading Time**: 8 minutes

## Overview

Rename the `DispatcherPreferences` model, API endpoints, and frontend components to `OperationsSettings` / `FleetOperationsSettings` to better reflect their true purpose: organization-wide fleet operations configuration.

### Problem Statement

The current `DispatcherPreferences` naming is misleading because:

1. **Scope mismatch**: These are tenant-scoped (one record per organization), not user-scoped dispatcher preferences
2. **Functionality mismatch**: They control fleet operations (route planning, monitoring, alerts, reporting), not personal dispatcher preferences
3. **Audience mismatch**: Managed by admins/owners, not individual dispatchers
4. **User confusion**: The `/settings/route-planning` page name is too narrow for settings that also control alerts, reporting, and fuel/rest insertion

### Solution

Rename to **Fleet Operations Settings**:
- **Model name**: `FleetOperationsSettings` (descriptive in code)
- **Table name**: `operations_settings` (concise in database)
- **API endpoint**: `/api/v1/preferences/operations`
- **Frontend route**: `/settings/operations`
- **Menu label**: "Operations"

---

## Design Details

### 1. Database & Schema Changes

**Prisma Schema** (`apps/backend/prisma/schema.prisma`):

```prisma
// Line 699: Rename model
model FleetOperationsSettings {
  id                        Int       @id @default(autoincrement())
  tenantId                  Int       @unique @map("tenant_id")
  tenant                    Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // HOS Defaults
  defaultDriveHours         Float     @default(0.0)      @map("default_drive_hours")
  defaultOnDutyHours        Float     @default(0.0)      @map("default_on_duty_hours")
  defaultSinceBreakHours    Float     @default(0.0)      @map("default_since_break_hours")

  // ... all existing fields remain the same ...

  @@map("operations_settings")  // ← Table name in database
}
```

**Tenant Model Update** (line 76):

```prisma
model Tenant {
  // ... existing fields ...
  fleetOperationsSettings   FleetOperationsSettings?  // ← Renamed from dispatcherPreferences
  // ... rest of relations ...
}
```

**Migration Strategy**:
- Generate Prisma migration to rename table: `dispatcher_preferences` → `operations_settings`
- All existing data preserved (table rename is atomic in PostgreSQL)
- No data migration needed
- Zero downtime deployment possible

---

### 2. Backend API Changes

#### Endpoint Renaming

**Current**:
```
GET  /api/v1/preferences/dispatcher
PUT  /api/v1/preferences/dispatcher
```

**New**:
```
GET  /api/v1/preferences/operations
PUT  /api/v1/preferences/operations
```

#### File Structure Changes

1. **DTO Rename**:
   ```
   dispatcher-preferences.dto.ts → operations-settings.dto.ts
   ```

   Class rename:
   ```typescript
   UpdateDispatcherPreferencesDto → UpdateOperationsSettingsDto
   ```

2. **Service Methods** (`preferences.service.ts`):
   ```typescript
   // Rename methods
   getDispatcherPreferences()     → getOperationsSettings()
   updateDispatcherPreferences()  → updateOperationsSettings()
   validateDispatcherPreferences() → validateOperationsSettings()

   // Update Prisma calls
   prisma.dispatcherPreferences   → prisma.fleetOperationsSettings
   ```

3. **Controller Routes** (`preferences.controller.ts`):
   ```typescript
   @Get('dispatcher')  → @Get('operations')
   @Put('dispatcher')  → @Put('operations')
   ```

4. **Reset Endpoint Scope**:
   ```typescript
   // Current
   scope: 'user' | 'dispatcher' | 'driver'

   // New
   scope: 'user' | 'operations' | 'driver'
   ```

5. **Error Messages**:
   ```typescript
   // Current
   "Only dispatchers, admins, and owners can access route planning preferences"

   // New
   "Only admins and owners can access operations settings"
   ```

6. **Controller Defaults** (line 110 in preferences.controller.ts):
   ```typescript
   // Rename section key
   dispatcher: { ... } → operations: { ... }
   ```

---

### 3. Frontend Changes

#### Page/Route Renaming

**Current**:
```
/settings/route-planning  →  apps/web/src/app/settings/route-planning/page.tsx
```

**New**:
```
/settings/operations  →  apps/web/src/app/settings/operations/page.tsx
```

#### API Client Updates (`apps/web/src/lib/api/preferences.ts`)

1. **Interface Rename** (line 33):
   ```typescript
   export interface OperationsSettings {  // ← Renamed from DispatcherPreferences
     id: number;
     tenantId: number;
     defaultDriveHours: number;
     defaultOnDutyHours: number;
     // ... all existing fields remain the same
   }
   ```

2. **Function Renames** (lines 108-117):
   ```typescript
   export async function getOperationsSettings(): Promise<OperationsSettings> {
     return apiClient<OperationsSettings>('/preferences/operations');
   }

   export async function updateOperationsSettings(
     updates: Partial<OperationsSettings>
   ): Promise<OperationsSettings> {
     return apiClient<OperationsSettings>('/preferences/operations', {
       method: 'PUT',
       body: JSON.stringify(updates),
     });
   }
   ```

3. **Reset Function Scope** (line 138):
   ```typescript
   export async function resetToDefaults(
     scope: 'user' | 'operations' | 'driver'
   ): Promise<any> {
     return apiClient<any>('/preferences/reset', {
       method: 'POST',
       body: JSON.stringify({ scope }),
     });
   }
   ```

#### Zustand Store Updates (`apps/web/src/lib/store/preferencesStore.ts`)

```typescript
// State rename
dispatcherPreferences  → operationsSettings

// Method renames
updateDispatcherPrefs()  → updateOperationsSettings()
loadAllPreferences()     → update to use new API functions

// Store access patterns
usePreferencesStore((state) => state.operationsSettings)
```

#### Page Content Updates (`apps/web/src/app/settings/operations/page.tsx`)

1. **Imports**:
   ```typescript
   import { OperationsSettings } from '@/lib/api/preferences';
   ```

2. **Store Access**:
   ```typescript
   const { operationsSettings, updateOperationsSettings, ... } = usePreferencesStore();
   ```

3. **Page Heading** (line 105):
   ```tsx
   <h1 className="text-3xl font-bold tracking-tight text-foreground">
     Fleet Operations Configuration
   </h1>
   <p className="text-muted-foreground mt-1">
     Configure how SALLY plans routes, monitors drivers, and manages your fleet operations.
     These settings apply to all dispatchers and route planning operations.
   </p>
   ```

4. **Reset Function**:
   ```typescript
   await resetToDefaults('operations');  // ← Changed from 'dispatcher'
   ```

---

### 4. Navigation & Menu Updates

**Settings Menu Item**:

**Current label**: "Route Planning"
**New label**: "Operations"
**URL**: `/settings/operations`

**Files to update**:
- `apps/web/src/app/settings/layout.tsx` (if exists)
- Any `SettingsNav` or sidebar navigation component
- Settings index pages that list available sections

**Icon consideration**:
- Current: Route icon (from lucide-react)
- Suggested: Settings/Cog icon or Truck icon to represent broader operations scope

---

## Implementation Steps

### Step 1: Database Migration

1. Update Prisma schema (`apps/backend/prisma/schema.prisma`):
   - Rename model: `DispatcherPreferences` → `FleetOperationsSettings`
   - Update table mapping: `@@map("operations_settings")`
   - Update Tenant relation: `fleetOperationsSettings`

2. Generate and apply migration:
   ```bash
   cd apps/backend
   npx prisma migrate dev --name rename_dispatcher_prefs_to_operations_settings
   ```

3. Verify migration generated correct SQL (should be table rename)

### Step 2: Backend Code Updates

1. **Rename DTO file**:
   ```bash
   cd apps/backend/src/api/preferences/dto
   mv dispatcher-preferences.dto.ts operations-settings.dto.ts
   ```

2. **Update DTO class**:
   - Open `operations-settings.dto.ts`
   - Rename class: `UpdateDispatcherPreferencesDto` → `UpdateOperationsSettingsDto`

3. **Update service** (`preferences.service.ts`):
   - Rename methods: `getDispatcherPreferences()` → `getOperationsSettings()`
   - Rename methods: `updateDispatcherPreferences()` → `updateOperationsSettings()`
   - Rename methods: `validateDispatcherPreferences()` → `validateOperationsSettings()`
   - Update Prisma calls: `.dispatcherPreferences` → `.fleetOperationsSettings`
   - Update error messages (remove "dispatcher" references, use "operations settings")
   - Update reset scope: `'dispatcher'` → `'operations'`

4. **Update controller** (`preferences.controller.ts`):
   - Update import: `UpdateOperationsSettingsDto`
   - Rename routes: `@Get('dispatcher')` → `@Get('operations')`
   - Rename routes: `@Put('dispatcher')` → `@Put('operations')`
   - Update method names to match service
   - Update defaults object (line 110): `dispatcher:` → `operations:`

5. **Build and test backend**:
   ```bash
   cd apps/backend
   npm run build
   npm run test
   ```

### Step 3: Frontend Code Updates

1. **Update API client** (`apps/web/src/lib/api/preferences.ts`):
   - Rename interface: `DispatcherPreferences` → `OperationsSettings`
   - Rename functions: `getOperationsSettings()`, `updateOperationsSettings()`
   - Update endpoint URLs: `/preferences/operations`
   - Update reset scope type: `'user' | 'operations' | 'driver'`

2. **Update Zustand store** (`apps/web/src/lib/store/preferencesStore.ts`):
   - Rename state: `dispatcherPreferences` → `operationsSettings`
   - Rename methods: `updateDispatcherPrefs()` → `updateOperationsSettings()`
   - Update all internal references to use new API functions

3. **Move page directory**:
   ```bash
   cd apps/web/src/app/settings
   mv route-planning operations
   ```

4. **Update page component** (`apps/web/src/app/settings/operations/page.tsx`):
   - Update import: `OperationsSettings`
   - Update store access: `operationsSettings`
   - Update page heading: "Fleet Operations Configuration"
   - Update description to reflect broader scope
   - Update reset call: `resetToDefaults('operations')`

5. **Update navigation/menu**:
   - Find settings navigation component
   - Update menu item label: "Route Planning" → "Operations"
   - Update menu item link: `/settings/route-planning` → `/settings/operations`
   - Consider updating icon to reflect operations scope

6. **Search for stale references**:
   ```bash
   cd apps/web
   grep -r "DispatcherPreferences" src/
   grep -r "dispatcherPreferences" src/
   grep -r "dispatcher-preferences" src/
   grep -r "route-planning" src/
   ```

7. **Build and test frontend**:
   ```bash
   cd apps/web
   npm run build
   npm run dev
   ```

### Step 4: Integration Testing

1. **Test operations settings page**:
   - Navigate to `/settings/operations`
   - Verify page loads
   - Verify settings display correctly
   - Update settings and save
   - Reset to defaults

2. **Test API endpoints**:
   - `GET /api/v1/preferences/operations`
   - `PUT /api/v1/preferences/operations`
   - `POST /api/v1/preferences/reset` with scope `'operations'`

3. **Test role-based access**:
   - Verify only ADMIN and OWNER roles can access
   - Verify DISPATCHER role is denied (or allowed based on requirements)

4. **Verify old endpoints return 404**:
   - `GET /api/v1/preferences/dispatcher` should fail
   - `PUT /api/v1/preferences/dispatcher` should fail

### Step 5: Cleanup & Documentation

1. **Remove old compiled files**:
   ```bash
   cd apps/backend
   rm -rf dist/api/preferences/dto/dispatcher-preferences.*
   npm run build
   ```

2. **Update any documentation**:
   - API documentation (if exists)
   - Developer guides mentioning these endpoints
   - Update CLAUDE.md if it references dispatcher preferences

3. **Commit changes**:
   ```bash
   git add .
   git commit -m "refactor: rename DispatcherPreferences to FleetOperationsSettings

   - Rename database table: dispatcher_preferences → operations_settings
   - Rename API endpoints: /preferences/dispatcher → /preferences/operations
   - Rename frontend route: /settings/route-planning → /settings/operations
   - Update menu: Route Planning → Operations
   - Update all TypeScript types and function names

   BREAKING CHANGE: API endpoints /preferences/dispatcher removed, use /preferences/operations"
   ```

---

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Backend builds without errors
- [ ] Backend tests pass
- [ ] Frontend builds without errors
- [ ] Can navigate to `/settings/operations`
- [ ] Settings page loads and displays correctly
- [ ] Can update operations settings via UI
- [ ] Can reset operations settings to defaults
- [ ] Settings persist after page refresh
- [ ] Old route `/settings/route-planning` redirects or 404s
- [ ] Old API endpoints `/preferences/dispatcher` return 404
- [ ] New API endpoints `/preferences/operations` work correctly
- [ ] Role-based access control works (ADMIN/OWNER only)
- [ ] No TypeScript errors in IDE
- [ ] No console errors in browser
- [ ] Menu/navigation shows "Operations" label
- [ ] No references to "DispatcherPreferences" remain in codebase

---

## Rollback Plan

If issues arise:

1. **Revert database migration**:
   ```bash
   cd apps/backend
   npx prisma migrate reset  # Dangerous: drops database
   # OR manually revert migration
   ```

2. **Revert code changes**:
   ```bash
   git revert <commit-hash>
   ```

3. **Quick fix**: Create alias endpoints that map old to new:
   ```typescript
   @Get('dispatcher')
   async getDispatcherPreferencesAlias(@Req() req: any) {
     return this.getOperationsSettings(req);
   }
   ```

---

## Breaking Changes

### API Breaking Changes

- **Removed endpoints**:
  - `GET /api/v1/preferences/dispatcher`
  - `PUT /api/v1/preferences/dispatcher`

- **New endpoints**:
  - `GET /api/v1/preferences/operations`
  - `PUT /api/v1/preferences/operations`

- **Reset scope parameter**:
  - Old: `scope: 'dispatcher'`
  - New: `scope: 'operations'`

### Frontend Breaking Changes

- **Removed route**: `/settings/route-planning`
- **New route**: `/settings/operations`
- **Removed type**: `DispatcherPreferences`
- **New type**: `OperationsSettings`

---

## Future Considerations

1. **Full "preferences" → "settings" migration**:
   - Consider renaming all `/api/v1/preferences/*` to `/api/v1/settings/*`
   - Would create consistency across user, driver, and operations settings
   - Could be Phase 2 if this rename goes well

2. **Settings organization**:
   - Group related settings into tabs/sections on the operations page
   - Separate: HOS Settings, Optimization Settings, Alert Settings, Report Settings

3. **Role-based settings visibility**:
   - Show/hide certain settings based on user role
   - Example: Cost settings might be hidden from DISPATCHER role

---

## Success Criteria

- ✅ All code references updated from "dispatcher preferences" to "operations settings"
- ✅ Database table renamed without data loss
- ✅ API endpoints working at new paths
- ✅ Frontend accessible at `/settings/operations`
- ✅ No TypeScript or runtime errors
- ✅ All tests passing
- ✅ Menu/navigation updated
- ✅ Documentation updated

---

## Maintained By

SALLY Product & Engineering Team
**Last Updated**: 2025-02-04
