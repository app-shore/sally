# Rename Dispatcher Preferences to Fleet Operations Settings - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename DispatcherPreferences to FleetOperationsSettings across database, backend, and frontend to accurately reflect organizational operations configuration scope.

**Architecture:** Three-layer refactoring: (1) Prisma schema + migration, (2) NestJS backend (DTOs, services, controllers), (3) Next.js frontend (API client, Zustand store, pages, navigation).

**Tech Stack:** Prisma, PostgreSQL, NestJS, Next.js 15, TypeScript, Zustand

---

## Task 1: Update Prisma Schema

**Files:**
- Modify: `apps/backend/prisma/schema.prisma:699-753`
- Modify: `apps/backend/prisma/schema.prisma:76`

**Step 1: Rename DispatcherPreferences model**

Open `apps/backend/prisma/schema.prisma` and update line 699:

```prisma
model FleetOperationsSettings {
  id                        Int       @id @default(autoincrement())
  tenantId                  Int       @unique @map("tenant_id")
  tenant                    Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // HOS Defaults
  defaultDriveHours         Float     @default(0.0)      @map("default_drive_hours")
  defaultOnDutyHours        Float     @default(0.0)      @map("default_on_duty_hours")
  defaultSinceBreakHours    Float     @default(0.0)      @map("default_since_break_hours")

  // HOS Compliance Thresholds
  driveHoursWarningPct      Int       @default(75)       @map("drive_hours_warning_pct")
  driveHoursCriticalPct     Int       @default(90)       @map("drive_hours_critical_pct")
  onDutyWarningPct          Int       @default(75)       @map("on_duty_warning_pct")
  onDutyCriticalPct         Int       @default(90)       @map("on_duty_critical_pct")
  sinceBreakWarningPct      Int       @default(75)       @map("since_break_warning_pct")
  sinceBreakCriticalPct     Int       @default(90)       @map("since_break_critical_pct")

  // Optimization Defaults
  defaultOptimizationMode   String    @default("BALANCE") @map("default_optimization_mode") @db.VarChar(30)
  costPerMile               Float     @default(1.85)     @map("cost_per_mile")
  laborCostPerHour          Float     @default(25.0)     @map("labor_cost_per_hour")

  // Rest Insertion Preferences
  preferFullRest            Boolean   @default(true)     @map("prefer_full_rest")
  restStopBuffer            Int       @default(30)       @map("rest_stop_buffer")
  allowDockRest             Boolean   @default(true)     @map("allow_dock_rest")
  minRestDuration           Int       @default(7)        @map("min_rest_duration")

  // Fuel Preferences
  fuelPriceThreshold        Float     @default(0.15)     @map("fuel_price_threshold")
  maxFuelDetour             Int       @default(10)       @map("max_fuel_detour")
  minFuelSavings            Float     @default(10.0)     @map("min_fuel_savings")

  // Route Planning Defaults
  defaultLoadAssignment     String    @default("MANUAL") @map("default_load_assignment") @db.VarChar(30)
  defaultDriverSelection    String    @default("AUTO_SUGGEST") @map("default_driver_selection") @db.VarChar(30)
  defaultVehicleSelection   String    @default("AUTO_ASSIGN") @map("default_vehicle_selection") @db.VarChar(30)

  // Alert Thresholds
  delayThresholdMinutes     Int       @default(30)       @map("delay_threshold_minutes")
  hosApproachingPct         Int       @default(85)       @map("hos_approaching_pct")
  costOverrunPct            Int       @default(10)       @map("cost_overrun_pct")

  // Report Preferences
  reportTimezone            String    @default("America/New_York") @map("report_timezone") @db.VarChar(100)
  includeMapInReports       Boolean   @default(true)     @map("include_map_in_reports")
  reportEmailRecipients     Json      @default("[]")     @map("report_email_recipients")

  createdAt                 DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt                 DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  @@index([tenantId])
  @@map("operations_settings")
}
```

**Step 2: Update Tenant model relation**

Update line 76 in the same file:

```prisma
model Tenant {
  id                    Int          @id @default(autoincrement())
  tenantId              String       @unique @map("tenant_id") @db.VarChar(50)
  companyName           String       @map("company_name") @db.VarChar(255)
  subdomain             String?      @unique @db.VarChar(100)
  contactEmail          String?      @map("contact_email") @db.VarChar(255)
  contactPhone          String?      @map("contact_phone") @db.VarChar(50)

  // ... other existing fields ...

  users                 User[]
  drivers               Driver[]
  vehicles              Vehicle[]
  routePlans            RoutePlan[]
  alerts                Alert[]
  integrationConfigs    IntegrationConfig[]
  fleetOperationsSettings FleetOperationsSettings?  // ← Changed from dispatcherPreferences
  invitations           UserInvitation[]

  @@index([tenantId])
  @@index([subdomain])
  @@index([status])
  @@index([dotNumber])
  @@map("tenants")
}
```

**Step 3: Commit schema changes**

```bash
git add apps/backend/prisma/schema.prisma
git commit -m "refactor(schema): rename DispatcherPreferences to FleetOperationsSettings"
```

---

## Task 2: Generate and Apply Database Migration

**Files:**
- Create: `apps/backend/prisma/migrations/<timestamp>_rename_dispatcher_prefs_to_operations_settings/migration.sql`

**Step 1: Generate Prisma migration**

```bash
cd apps/backend
npx prisma migrate dev --name rename_dispatcher_prefs_to_operations_settings
```

Expected output: Migration created successfully

**Step 2: Verify migration SQL**

Open the generated migration file and verify it contains:

```sql
-- Rename table
ALTER TABLE "dispatcher_preferences" RENAME TO "operations_settings";
```

**Step 3: Verify migration applied successfully**

Expected in console: "The migration has been applied successfully"

**Step 4: Regenerate Prisma Client**

```bash
npx prisma generate
```

Expected output: "✔ Generated Prisma Client"

**Step 5: Commit migration**

```bash
git add prisma/migrations/
git commit -m "refactor(db): add migration to rename dispatcher_preferences to operations_settings"
```

---

## Task 3: Rename Backend DTO File and Class

**Files:**
- Rename: `apps/backend/src/api/preferences/dto/dispatcher-preferences.dto.ts` → `apps/backend/src/api/preferences/dto/operations-settings.dto.ts`
- Modify: `apps/backend/src/api/preferences/dto/operations-settings.dto.ts:3`

**Step 1: Rename DTO file**

```bash
cd apps/backend/src/api/preferences/dto
mv dispatcher-preferences.dto.ts operations-settings.dto.ts
```

**Step 2: Update DTO class name**

Open `apps/backend/src/api/preferences/dto/operations-settings.dto.ts` and change line 3:

```typescript
import { IsOptional, IsNumber, IsInt, IsBoolean, IsString, IsArray, IsIn, Min, Max } from 'class-validator';

export class UpdateOperationsSettingsDto {
  // HOS Defaults
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(11)
  defaultDriveHours?: number;

  // ... rest of fields remain unchanged ...
}
```

**Step 3: Commit DTO changes**

```bash
git add apps/backend/src/api/preferences/dto/
git commit -m "refactor(dto): rename UpdateDispatcherPreferencesDto to UpdateOperationsSettingsDto"
```

---

## Task 4: Update Backend Service Methods

**Files:**
- Modify: `apps/backend/src/api/preferences/preferences.service.ts:4`
- Modify: `apps/backend/src/api/preferences/preferences.service.ts:69-134`
- Modify: `apps/backend/src/api/preferences/preferences.service.ts:210-256`
- Modify: `apps/backend/src/api/preferences/preferences.service.ts:273-290`

**Step 1: Update DTO import**

Open `apps/backend/src/api/preferences/preferences.service.ts` and update line 4:

```typescript
import { UpdateOperationsSettingsDto } from './dto/operations-settings.dto';
```

**Step 2: Rename getDispatcherPreferences method**

Replace lines 72-101 with:

```typescript
async getOperationsSettings(userIdString: string, userRole: string, tenantIdString: string) {
  // Check role
  if (userRole !== 'DISPATCHER' && userRole !== 'ADMIN' && userRole !== 'OWNER') {
    throw new ForbiddenException('Only dispatchers, admins, and owners can access operations settings');
  }

  // Get tenant numeric ID
  const tenant = await this.prisma.tenant.findUnique({
    where: { tenantId: tenantIdString },
    select: { id: true },
  });

  if (!tenant) {
    throw new NotFoundException('Tenant not found');
  }

  // Get or create operations settings with defaults (one per tenant)
  let settings = await this.prisma.fleetOperationsSettings.findUnique({
    where: { tenantId: tenant.id },
  });

  if (!settings) {
    // Create with defaults
    settings = await this.prisma.fleetOperationsSettings.create({
      data: { tenantId: tenant.id },
    });
  }

  return settings;
}
```

**Step 3: Rename updateDispatcherPreferences method**

Replace lines 103-133 with:

```typescript
async updateOperationsSettings(userIdString: string, userRole: string, tenantIdString: string, dto: UpdateOperationsSettingsDto) {
  // Check role
  if (userRole !== 'DISPATCHER' && userRole !== 'ADMIN' && userRole !== 'OWNER') {
    throw new ForbiddenException('Only dispatchers, admins, and owners can update operations settings');
  }

  // Get tenant numeric ID
  const tenant = await this.prisma.tenant.findUnique({
    where: { tenantId: tenantIdString },
    select: { id: true },
  });

  if (!tenant) {
    throw new NotFoundException('Tenant not found');
  }

  // Validate settings
  this.validateOperationsSettings(dto);

  // Upsert settings (one per tenant)
  const settings = await this.prisma.fleetOperationsSettings.upsert({
    where: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      ...dto,
    },
    update: dto,
  });

  return settings;
}
```

**Step 4: Update resetToDefaults method scope handling**

Replace lines 227-244 with:

```typescript
if (scope === 'operations') {
  if (userRole !== 'DISPATCHER' && userRole !== 'ADMIN' && userRole !== 'OWNER') {
    throw new ForbiddenException('Only dispatchers, admins, and owners can reset operations settings');
  }

  // Get tenant numeric ID
  const tenant = await this.prisma.tenant.findUnique({
    where: { tenantId: tenantIdString },
    select: { id: true },
  });

  if (!tenant) {
    throw new NotFoundException('Tenant not found');
  }

  await this.prisma.fleetOperationsSettings.delete({ where: { tenantId: tenant.id } }).catch(() => {});
  return await this.prisma.fleetOperationsSettings.create({ data: { tenantId: tenant.id } });
}
```

**Step 5: Update resetToDefaults error message**

Update line 256:

```typescript
throw new BadRequestException('Invalid scope. Must be: user, operations, or driver');
```

**Step 6: Rename validateDispatcherPreferences method**

Replace lines 273-290 with:

```typescript
private validateOperationsSettings(dto: UpdateOperationsSettingsDto) {
  // Validate warning < critical for HOS thresholds
  if (dto.driveHoursWarningPct !== undefined && dto.driveHoursCriticalPct !== undefined) {
    if (dto.driveHoursWarningPct >= dto.driveHoursCriticalPct) {
      throw new BadRequestException('driveHoursWarningPct must be less than driveHoursCriticalPct');
    }
  }
  if (dto.onDutyWarningPct !== undefined && dto.onDutyCriticalPct !== undefined) {
    if (dto.onDutyWarningPct >= dto.onDutyCriticalPct) {
      throw new BadRequestException('onDutyWarningPct must be less than onDutyCriticalPct');
    }
  }
  if (dto.sinceBreakWarningPct !== undefined && dto.sinceBreakCriticalPct !== undefined) {
    if (dto.sinceBreakWarningPct >= dto.sinceBreakCriticalPct) {
      throw new BadRequestException('sinceBreakWarningPct must be less than sinceBreakCriticalPct');
    }
  }
}
```

**Step 7: Commit service changes**

```bash
git add apps/backend/src/api/preferences/preferences.service.ts
git commit -m "refactor(service): rename dispatcher preferences methods to operations settings"
```

---

## Task 5: Update Backend Controller Routes

**Files:**
- Modify: `apps/backend/src/api/preferences/preferences.controller.ts:4`
- Modify: `apps/backend/src/api/preferences/preferences.controller.ts:27-46`
- Modify: `apps/backend/src/api/preferences/preferences.controller.ts:69-76`
- Modify: `apps/backend/src/api/preferences/preferences.controller.ts:84-156`

**Step 1: Update DTO import**

Update line 4:

```typescript
import { UpdateOperationsSettingsDto } from './dto/operations-settings.dto';
```

**Step 2: Update GET /operations route**

Replace lines 31-37 with:

```typescript
@Get('operations')
async getOperationsSettings(@Req() req: any) {
  const userId = req.user.userId;
  const userRole = req.user.role;
  const tenantId = req.user.tenantId;
  return this.preferencesService.getOperationsSettings(userId, userRole, tenantId);
}
```

**Step 3: Update PUT /operations route**

Replace lines 39-45 with:

```typescript
@Put('operations')
async updateOperationsSettings(@Req() req: any, @Body() dto: UpdateOperationsSettingsDto) {
  const userId = req.user.userId;
  const userRole = req.user.role;
  const tenantId = req.user.tenantId;
  return this.preferencesService.updateOperationsSettings(userId, userRole, tenantId, dto);
}
```

**Step 4: Update resetToDefaults scope type**

Update line 71:

```typescript
async resetToDefaults(@Req() req: any, @Body() body: { scope: 'user' | 'operations' | 'driver' }) {
```

**Step 5: Update getDefaults response key**

Replace line 110:

```typescript
operations: {
  defaultDriveHours: 0.0,
  defaultOnDutyHours: 0.0,
  // ... rest remains the same
```

**Step 6: Commit controller changes**

```bash
git add apps/backend/src/api/preferences/preferences.controller.ts
git commit -m "refactor(controller): rename /preferences/dispatcher to /preferences/operations"
```

---

## Task 6: Build and Test Backend

**Files:**
- Test: Backend compilation and Prisma Client generation

**Step 1: Build backend**

```bash
cd apps/backend
npm run build
```

Expected: No TypeScript errors, build succeeds

**Step 2: Run backend tests (if any exist)**

```bash
npm run test
```

Expected: All tests pass (or no tests configured)

**Step 3: Verify Prisma Client generated correctly**

```bash
npx prisma generate
```

Expected: "✔ Generated Prisma Client" with FleetOperationsSettings model

**Step 4: Commit if any fixes were needed**

```bash
git add .
git commit -m "fix(backend): resolve build issues after refactor"
```

---

## Task 7: Update Frontend API Client Interface

**Files:**
- Modify: `apps/web/src/lib/api/preferences.ts:33-66`

**Step 1: Rename DispatcherPreferences interface**

Replace lines 33-66 with:

```typescript
export interface OperationsSettings {
  id: number;
  tenantId: number;
  defaultDriveHours: number;
  defaultOnDutyHours: number;
  defaultSinceBreakHours: number;
  driveHoursWarningPct: number;
  driveHoursCriticalPct: number;
  onDutyWarningPct: number;
  onDutyCriticalPct: number;
  sinceBreakWarningPct: number;
  sinceBreakCriticalPct: number;
  defaultOptimizationMode: string;
  costPerMile: number;
  laborCostPerHour: number;
  preferFullRest: boolean;
  restStopBuffer: number;
  allowDockRest: boolean;
  minRestDuration: number;
  fuelPriceThreshold: number;
  maxFuelDetour: number;
  minFuelSavings: number;
  defaultLoadAssignment: string;
  defaultDriverSelection: string;
  defaultVehicleSelection: string;
  delayThresholdMinutes: number;
  hosApproachingPct: number;
  costOverrunPct: number;
  reportTimezone: string;
  includeMapInReports: boolean;
  reportEmailRecipients: string[];
  createdAt: string;
  updatedAt: string;
}
```

**Step 2: Commit interface change**

```bash
git add apps/web/src/lib/api/preferences.ts
git commit -m "refactor(types): rename DispatcherPreferences to OperationsSettings"
```

---

## Task 8: Update Frontend API Client Functions

**Files:**
- Modify: `apps/web/src/lib/api/preferences.ts:104-117`
- Modify: `apps/web/src/lib/api/preferences.ts:138`

**Step 1: Rename API functions**

Replace lines 108-117 with:

```typescript
export async function getOperationsSettings(): Promise<OperationsSettings> {
  return apiClient<OperationsSettings>('/preferences/operations');
}

export async function updateOperationsSettings(updates: Partial<OperationsSettings>): Promise<OperationsSettings> {
  return apiClient<OperationsSettings>('/preferences/operations', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}
```

**Step 2: Update resetToDefaults scope type**

Update line 138:

```typescript
export async function resetToDefaults(scope: 'user' | 'operations' | 'driver'): Promise<any> {
  return apiClient<any>('/preferences/reset', {
    method: 'POST',
    body: JSON.stringify({ scope }),
  });
}
```

**Step 3: Commit API client function changes**

```bash
git add apps/web/src/lib/api/preferences.ts
git commit -m "refactor(api): rename dispatcher preferences functions to operations settings"
```

---

## Task 9: Update Zustand Store

**Files:**
- Modify: `apps/web/src/lib/store/preferencesStore.ts:4`
- Modify: `apps/web/src/lib/store/preferencesStore.ts:18`
- Modify: `apps/web/src/lib/store/preferencesStore.ts:28-36`
- Modify: `apps/web/src/lib/store/preferencesStore.ts:43`
- Modify: `apps/web/src/lib/store/preferencesStore.ts:60-69`
- Modify: `apps/web/src/lib/store/preferencesStore.ts:91-94`
- Modify: `apps/web/src/lib/store/preferencesStore.ts:119-129`
- Modify: `apps/web/src/lib/store/preferencesStore.ts:144-161`

**Step 1: Update imports**

Replace lines 2-13 with:

```typescript
import {
  UserPreferences,
  OperationsSettings,
  DriverPreferences,
  getUserPreferences,
  updateUserPreferences,
  getOperationsSettings,
  updateOperationsSettings,
  getDriverPreferences,
  updateDriverPreferences,
  resetToDefaults as resetToDefaultsAPI,
} from '../api/preferences';
```

**Step 2: Update state interface**

Replace line 18 with:

```typescript
operationsSettings: OperationsSettings | null;
```

**Step 3: Update action signatures**

Replace lines 28-36 with:

```typescript
loadOperationsSettings: () => Promise<void>;
loadDriverPreferences: () => Promise<void>;
loadAllPreferences: (userRole: string) => Promise<void>;

updateUserPrefs: (updates: Partial<UserPreferences>) => Promise<void>;
updateOperationsSettings: (updates: Partial<OperationsSettings>) => Promise<void>;
updateDriverPrefs: (updates: Partial<DriverPreferences>) => Promise<void>;

resetToDefaults: (scope: 'user' | 'operations' | 'driver') => Promise<void>;
```

**Step 4: Update initial state**

Replace line 43 with:

```typescript
operationsSettings: null,
```

**Step 5: Update loadOperationsSettings method**

Replace lines 61-69 with:

```typescript
// Load operations settings
loadOperationsSettings: async () => {
  set({ isLoading: true, error: null });
  try {
    const settings = await getOperationsSettings();
    set({ operationsSettings: settings, isLoading: false });
  } catch (error: any) {
    set({ error: error.message, isLoading: false });
  }
},
```

**Step 6: Update loadAllPreferences method**

Replace lines 91-94 with:

```typescript
if (userRole === 'DISPATCHER' || userRole === 'ADMIN' || userRole === 'OWNER') {
  const operationsSettings = await getOperationsSettings();
  set({ operationsSettings });
}
```

**Step 7: Update updateOperationsSettings method**

Replace lines 120-129 with:

```typescript
// Update operations settings
updateOperationsSettings: async (updates: Partial<OperationsSettings>) => {
  set({ isSaving: true, error: null });
  try {
    const updatedSettings = await updateOperationsSettings(updates);
    set({ operationsSettings: updatedSettings, isSaving: false });
  } catch (error: any) {
    set({ error: error.message, isSaving: false });
    throw error;
  }
},
```

**Step 8: Update resetToDefaults method**

Replace lines 144-161 with:

```typescript
// Reset to defaults
resetToDefaults: async (scope: 'user' | 'operations' | 'driver') => {
  set({ isSaving: true, error: null });
  try {
    const resetPreferences = await resetToDefaultsAPI(scope);

    if (scope === 'user') {
      set({ userPreferences: resetPreferences });
    } else if (scope === 'operations') {
      set({ operationsSettings: resetPreferences });
    } else if (scope === 'driver') {
      set({ driverPreferences: resetPreferences });
    }

    set({ isSaving: false });
  } catch (error: any) {
    set({ error: error.message, isSaving: false });
    throw error;
  }
},
```

**Step 9: Commit store changes**

```bash
git add apps/web/src/lib/store/preferencesStore.ts
git commit -m "refactor(store): rename dispatcher preferences to operations settings in Zustand store"
```

---

## Task 10: Move and Update Frontend Page

**Files:**
- Rename: `apps/web/src/app/settings/route-planning/` → `apps/web/src/app/settings/operations/`
- Modify: `apps/web/src/app/settings/operations/page.tsx:12-20`
- Modify: `apps/web/src/app/settings/operations/page.tsx:60-74`
- Modify: `apps/web/src/app/settings/operations/page.tsx:88`
- Modify: `apps/web/src/app/settings/operations/page.tsx:103-109`

**Step 1: Move page directory**

```bash
cd apps/web/src/app/settings
mv route-planning operations
```

**Step 2: Update imports**

Open `apps/web/src/app/settings/operations/page.tsx` and replace line 12:

```typescript
import { OperationsSettings } from '@/lib/api/preferences';
```

**Step 3: Update store destructuring**

Replace line 20:

```typescript
const { operationsSettings, updateOperationsSettings, resetToDefaults, loadAllPreferences, isSaving } = usePreferencesStore();
```

**Step 4: Update state initialization**

Replace line 21:

```typescript
const [formData, setFormData] = useState<Partial<OperationsSettings>>(operationsSettings || {});
```

**Step 5: Update useEffect dependency**

Replace lines 39-43:

```typescript
useEffect(() => {
  if (operationsSettings) {
    setFormData(operationsSettings);
  }
}, [operationsSettings]);
```

**Step 6: Update handleSave function**

Replace lines 49-57:

```typescript
const handleSave = async () => {
  try {
    await updateOperationsSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  } catch (error) {
    console.error('Failed to save operations settings:', error);
  }
};
```

**Step 7: Update handleReset function**

Replace lines 59-74:

```typescript
const handleReset = async () => {
  if (confirm('Reset all operations settings to defaults?')) {
    try {
      await resetToDefaults('operations');
      // Reload from store after reset
      const resetSettings = usePreferencesStore.getState().operationsSettings;
      if (resetSettings) {
        setFormData(resetSettings);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to reset operations settings:', error);
    }
  }
};
```

**Step 8: Update loading check**

Replace line 88:

```typescript
if (!operationsSettings) {
```

**Step 9: Update page heading**

Replace lines 103-109:

```typescript
<div className="flex items-center gap-3">
  <Route className="h-6 w-6 text-foreground" />
  <h1 className="text-3xl font-bold tracking-tight text-foreground">Fleet Operations Configuration</h1>
</div>
<p className="text-muted-foreground mt-1">
  Configure how SALLY plans routes, monitors drivers, and manages your fleet operations. These settings apply to all dispatchers and route planning operations.
</p>
```

**Step 10: Update success alert message**

Replace line 115:

```typescript
<AlertDescription>Operations settings saved successfully!</AlertDescription>
```

**Step 11: Commit page changes**

```bash
git add apps/web/src/app/settings/operations/
git rm -r apps/web/src/app/settings/route-planning/
git commit -m "refactor(frontend): move /settings/route-planning to /settings/operations and update to use OperationsSettings"
```

---

## Task 11: Update Navigation Links (if they exist)

**Files:**
- Modify: Any settings navigation/sidebar components (search required)

**Step 1: Search for navigation references**

```bash
cd apps/web
grep -r "route-planning" src/ --include="*.tsx" --include="*.ts"
grep -r "Route Planning" src/ --include="*.tsx" --include="*.ts"
```

**Step 2: Update any found navigation links**

For each file found:
- Replace `/settings/route-planning` with `/settings/operations`
- Replace "Route Planning" label with "Operations"

**Step 3: Commit navigation changes**

```bash
git add .
git commit -m "refactor(nav): update navigation links from route-planning to operations"
```

---

## Task 12: Search for Stale References

**Files:**
- Search: All TypeScript files in apps/web/src

**Step 1: Search for DispatcherPreferences references**

```bash
cd apps/web
grep -r "DispatcherPreferences" src/
```

Expected: No results

**Step 2: Search for dispatcherPreferences references**

```bash
grep -r "dispatcherPreferences" src/
```

Expected: No results (or only in comments/docs)

**Step 3: Search for dispatcher-preferences references**

```bash
grep -r "dispatcher-preferences" src/
```

Expected: No results

**Step 4: Search for route-planning URL references**

```bash
grep -r "route-planning" src/
```

Expected: Only in Next.js build artifacts (.next directory)

**Step 5: If any stale references found, update them**

```bash
# Update each file manually
git add .
git commit -m "fix: remove stale dispatcher preferences references"
```

---

## Task 13: Build and Test Frontend

**Files:**
- Test: Frontend compilation

**Step 1: Build frontend**

```bash
cd apps/web
npm run build
```

Expected: No TypeScript errors, build succeeds

**Step 2: Start development server**

```bash
npm run dev
```

Expected: Server starts on http://localhost:3000

**Step 3: Manual testing checklist**

Open browser to http://localhost:3000:

1. Navigate to `/settings/operations`
   - ✓ Page loads without errors
   - ✓ Page title shows "Fleet Operations Configuration"

2. Test loading settings:
   - ✓ Settings display current values
   - ✓ No console errors

3. Test updating settings:
   - ✓ Change a value (e.g., defaultDriveHours)
   - ✓ Click "Save Configuration"
   - ✓ Success message appears
   - ✓ Refresh page - changes persist

4. Test reset to defaults:
   - ✓ Click "Reset to Defaults"
   - ✓ Confirm dialog appears
   - ✓ Settings reset to defaults
   - ✓ Success message appears

5. Test old route (should 404):
   - Navigate to `/settings/route-planning`
   - ✓ Gets 404 or redirects

**Step 4: Commit if any fixes were needed**

```bash
git add .
git commit -m "fix(frontend): resolve runtime issues after refactor"
```

---

## Task 14: Integration Testing with Backend

**Files:**
- Test: Full stack integration

**Step 1: Start backend server**

```bash
cd apps/backend
npm run dev
```

Expected: Server starts on http://localhost:8000

**Step 2: Test GET /api/v1/preferences/operations**

```bash
curl -X GET http://localhost:8000/api/v1/preferences/operations \
  -H "Authorization: Bearer <token>"
```

Expected: 200 OK with operations settings JSON

**Step 3: Test PUT /api/v1/preferences/operations**

```bash
curl -X PUT http://localhost:8000/api/v1/preferences/operations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"defaultDriveHours": 5.0}'
```

Expected: 200 OK with updated settings

**Step 4: Test POST /api/v1/preferences/reset with operations scope**

```bash
curl -X POST http://localhost:8000/api/v1/preferences/reset \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"scope": "operations"}'
```

Expected: 200 OK with reset settings

**Step 5: Verify old endpoints return 404**

```bash
curl -X GET http://localhost:8000/api/v1/preferences/dispatcher \
  -H "Authorization: Bearer <token>"
```

Expected: 404 Not Found

---

## Task 15: Final Cleanup and Documentation

**Files:**
- Modify: `apps/backend/dist/` (cleanup)
- Test: Full rebuild

**Step 1: Clean backend build artifacts**

```bash
cd apps/backend
rm -rf dist/
npm run build
```

Expected: Clean build with no old dispatcher-preferences artifacts

**Step 2: Clean frontend build artifacts**

```bash
cd apps/web
rm -rf .next/
npm run build
```

Expected: Clean build with no route-planning artifacts

**Step 3: Verify no dispatcher-preferences in backend dist**

```bash
cd apps/backend
find dist/ -name "*dispatcher-preferences*"
```

Expected: No results

**Step 4: Final commit for cleanup**

```bash
git add .
git commit -m "chore: clean build artifacts after refactor"
```

---

## Task 16: Create Final Commit

**Files:**
- All modified files across backend and frontend

**Step 1: Review all changes**

```bash
git status
git diff --staged
```

**Step 2: Create comprehensive commit (if not already committed in steps)**

```bash
git add .
git commit -m "refactor: rename DispatcherPreferences to FleetOperationsSettings

- Rename database table: dispatcher_preferences → operations_settings
- Rename Prisma model: DispatcherPreferences → FleetOperationsSettings
- Rename API endpoints: /preferences/dispatcher → /preferences/operations
- Rename frontend route: /settings/route-planning → /settings/operations
- Update TypeScript interfaces, DTOs, and service methods
- Update Zustand store state and actions
- Update page headings to reflect broader operations scope

BREAKING CHANGE:
- API endpoint /preferences/dispatcher removed, use /preferences/operations
- Frontend route /settings/route-planning removed, use /settings/operations
- Reset scope 'dispatcher' changed to 'operations'
"
```

**Step 3: Push changes (if desired)**

```bash
git push origin <branch-name>
```

---

## Success Criteria

After completing all tasks, verify:

- ✅ Database table `operations_settings` exists (old `dispatcher_preferences` renamed)
- ✅ Prisma Client has `FleetOperationsSettings` model
- ✅ Backend builds without errors
- ✅ Frontend builds without errors
- ✅ GET /api/v1/preferences/operations returns 200
- ✅ PUT /api/v1/preferences/operations works correctly
- ✅ GET /api/v1/preferences/dispatcher returns 404
- ✅ Frontend /settings/operations page loads
- ✅ Frontend /settings/route-planning returns 404
- ✅ Can update settings via UI
- ✅ Can reset settings via UI
- ✅ No TypeScript errors in either project
- ✅ No console errors when using the application
- ✅ All commits follow conventional commit format

---

## Rollback Plan

If critical issues arise:

**Option 1: Revert commits**
```bash
git log --oneline
git revert <commit-hash>
```

**Option 2: Revert migration**
```bash
cd apps/backend
npx prisma migrate resolve --rolled-back <migration-name>
# Then manually run: ALTER TABLE operations_settings RENAME TO dispatcher_preferences;
```

**Option 3: Create temporary alias endpoints**
```typescript
// In preferences.controller.ts
@Get('dispatcher')
async getDispatcherPreferencesAlias(@Req() req: any) {
  return this.getOperationsSettings(req.user.userId, req.user.role, req.user.tenantId);
}
```

---

## Maintained By

SALLY Product & Engineering Team
**Last Updated**: 2025-02-04
