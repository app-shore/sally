# Phase 0: Manual Fleet Entry + Phase 1 Navigation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable manual creation of drivers, vehicles, and loads in SALLY so carriers without TMS APIs can use the platform. Add Phase 1 (Invoicing, Settlements) as Coming Soon navigation items with feature flags.

**Architecture:** Un-disable existing "Add" buttons on the Fleet page, build a load creation form with inline stop entry, add load lifecycle status tracking, and add Phase 1 nav items behind feature flags with Coming Soon banners. The dual-source model (manual + TMS sync) is already baked into the schema via `external_source` field.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Shadcn/ui, Tailwind, React Query, NestJS backend, Prisma ORM

---

## Context for Implementer

### Key Files You'll Touch
- `apps/web/src/app/dispatcher/fleet/page.tsx` — Fleet management page (drivers, vehicles, loads tabs)
- `apps/web/src/shared/lib/navigation.ts` — Centralized sidebar navigation config
- `apps/web/src/shared/config/comingSoonContent.ts` — Coming Soon banner marketing copy
- `apps/backend/prisma/seeds/feature-flags.seed.ts` — Feature flag definitions
- `apps/backend/src/domains/fleet/loads/controllers/loads.controller.ts` — Loads API controller
- `apps/backend/src/domains/fleet/loads/services/loads.service.ts` — Loads business logic
- `apps/web/src/features/fleet/loads/` — Frontend load types, API client, hooks

### Patterns to Follow
- **Dark theme:** ALWAYS use semantic tokens (`bg-background`, `text-foreground`, `border-border`). NEVER use standalone `bg-white`, `text-gray-900`. See CLAUDE.md for full rules.
- **Components:** ALWAYS use Shadcn/ui (`Button`, `Input`, `Dialog`, `Card`, `Table`, `Badge`, `Label`, `Select`, `Tabs`). NEVER use plain HTML elements.
- **Feature flags:** Use `FeatureGuard` component to wrap feature-gated pages. Add flag to `feature-flags.seed.ts` + content to `comingSoonContent.ts`.
- **Coming Soon (full page):** `<FeatureGuard featureKey="flag_name"><PageContent /></FeatureGuard>`
- **Coming Soon (inline tab):** Centered div with icon circle + title + description + `<Badge variant="outline">Coming Soon</Badge>` (see Fleet page trailers/equipment tabs for pattern)
- **Navigation:** Centralized in `navigation.ts`. Role-based. Icons from `lucide-react`. Separators with labels.
- **Backend tenant scoping:** Use `@CurrentUser() user: any` + `this.getTenantDbId(user)` pattern from `BaseTenantController`.
- **API client:** Use `apiClient` from `@/shared/lib/api`. React Query hooks in `features/fleet/*/hooks/`.

### What Already Exists
- **Backend APIs:** `POST /loads` (create), `GET /loads` (list), `GET /loads/:id` (detail), `PATCH /loads/:id/status` (update status), `POST /loads/:id/assign` (assign driver+vehicle)
- **Frontend API client:** `loadsApi.create()`, `loadsApi.list()`, `loadsApi.getById()` in `features/fleet/loads/api.ts`
- **React Query hooks:** `useLoads()`, `useLoadById()`, `useCreateLoad()` in `features/fleet/loads/hooks/use-loads.ts`
- **Driver form:** `DriverForm` component exists in fleet page (name, license, phone, email)
- **Vehicle form:** `VehicleForm` component exists in fleet page (unit#, make, model, year, VIN, fuel capacity, MPG)
- **Driver/Vehicle CRUD APIs:** `POST/PUT/DELETE /drivers`, `POST/PUT/DELETE /vehicles` — all tenant-scoped with `@CurrentUser`
- **ExternalSourceGuard:** Blocks edit/delete of synced records. Manual records (no `external_source`) are fully editable.
- **Load model:** Has `tenantId` (required), `externalSource`, `externalLoadId` fields. Connected to RoutePlan via `RoutePlanLoad` join table.

---

## Task 1: Fix Backend Tenant Scoping for Loads

The loads controller and service need tenant scoping to match the driver/vehicle pattern. The schema migration for required `tenantId` on loads is already applied.

**Files:**
- Modify: `apps/backend/src/domains/fleet/loads/controllers/loads.controller.ts`
- Modify: `apps/backend/src/domains/fleet/loads/services/loads.service.ts`

**Step 1: Update loads controller to use @CurrentUser for tenant scoping**

The controller currently doesn't pass tenantId. Update it to match the drivers/vehicles controllers pattern:

```typescript
// loads.controller.ts - add these imports
import { CurrentUser } from '../../../../auth/decorators/current-user.decorator';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

// Update createLoad method:
@Post()
@Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
@ApiOperation({ summary: 'Create a new load with stops' })
async createLoad(
  @CurrentUser() user: any,
  @Body() createLoadDto: CreateLoadDto,
) {
  const tenantDbId = await this.getTenantDbId(user);
  return this.loadsService.create({
    ...createLoadDto,
    tenant_id: tenantDbId,
  });
}

// Update listLoads method:
@Get()
@Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
@ApiOperation({ summary: 'List all loads with optional filtering' })
@ApiQuery({ name: 'status', required: false })
@ApiQuery({ name: 'customer_name', required: false })
@ApiQuery({ name: 'limit', required: false })
@ApiQuery({ name: 'offset', required: false })
async listLoads(
  @CurrentUser() user: any,
  @Query('status') status?: string,
  @Query('customer_name') customerName?: string,
  @Query('limit') limit = 50,
  @Query('offset') offset = 0,
) {
  const tenantDbId = await this.getTenantDbId(user);
  return this.loadsService.findAll(
    tenantDbId,
    { status, customer_name: customerName },
    { limit: Number(limit), offset: Number(offset) },
  );
}
```

**Step 2: Update loads service to accept and use tenantId**

```typescript
// loads.service.ts - update create method signature
async create(data: {
  tenant_id: number;
  load_number: string;
  // ... rest unchanged
}) {
  // Add tenantId to prisma create:
  const load = await this.prisma.load.create({
    data: {
      // ... existing fields ...
      tenantId: data.tenant_id,
    },
  });
}

// Update findAll to accept tenantId as first param and filter by it:
async findAll(
  tenantId: number,
  filters?: { status?: string; customer_name?: string },
  pagination?: { limit?: number; offset?: number },
) {
  const loads = await this.prisma.load.findMany({
    where: {
      tenantId,
      // ... existing filters ...
    },
    // ... rest unchanged
  });
}
```

**Step 3: Also update tms-sync.service.ts to pass tenantId when creating loads**

Check `apps/backend/src/domains/integrations/sync/tms-sync.service.ts` — the load upsert `create` block needs `tenantId` added (it's available from `integration.tenantId`).

**Step 4: Verify TypeScript compiles**

Run: `cd apps/backend && npx tsc --noEmit 2>&1 | grep -E "loads\.(controller|service)\.ts|tms-sync" | head -10`
Expected: No errors in these files

**Step 5: Commit**

```bash
git add apps/backend/src/domains/fleet/loads/ apps/backend/src/domains/integrations/sync/tms-sync.service.ts
git commit -m "feat(loads): add tenant scoping to loads controller and service"
```

---

## Task 2: Enable Manual Driver & Vehicle Creation (Un-disable Buttons)

The "Add Driver" and "Add Truck" buttons are currently disabled with "PUSH capability required" tooltip. The forms already work. Just need to enable the buttons and update messaging.

**Files:**
- Modify: `apps/web/src/app/dispatcher/fleet/page.tsx`

**Step 1: Update DriversTab — enable "Add Driver" button**

Find this block in `DriversTab` (around line 188-197):
```tsx
// BEFORE (disabled):
<Button
  onClick={() => setEditingDriver(null)}
  disabled
  className="opacity-50 cursor-not-allowed"
  title="Add Driver disabled - PUSH capability required"
>
```

Replace with:
```tsx
// AFTER (enabled):
<Button onClick={() => setEditingDriver(null)}>
  <Plus className="h-4 w-4 mr-2" />
  Add Driver
</Button>
```

**Step 2: Update the integration banner to be contextual**

The blue "One-way PULL integration" banner should only show when there are actually synced records. Update the banner to also mention that manual entry is available:

```tsx
{drivers.some(d => d.external_source) && (
  <div className="mx-6 mt-4 mb-2">
    <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
      <AlertDescription className="text-sm text-blue-900 dark:text-blue-100 flex items-center justify-between">
        <span>
          <span className="font-medium">Synced drivers are read-only.</span>
          {' '}You can also add drivers manually using the Add Driver button.
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSyncDrivers}
          disabled={isSyncing}
          className="ml-4"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
          Sync Now
        </Button>
      </AlertDescription>
    </Alert>
  </div>
)}
```

**Step 3: Repeat for AssetsTab — enable "Add Truck" button**

Same pattern: remove `disabled`, `className="opacity-50 cursor-not-allowed"`, and `title` from the Add Truck button (around line 502-512). Update the banner to same contextual messaging.

**Step 4: Test manually**

1. Open Fleet page → Drivers tab → "Add Driver" button should be clickable
2. Click "Add Driver" → Dialog opens with form
3. Fill in name + license → Submit → Driver created with `external_source = null`
4. New driver should show "Manual" badge and have Edit/Delete enabled
5. Repeat for Assets tab → "Add Truck"

**Step 5: Commit**

```bash
git add apps/web/src/app/dispatcher/fleet/page.tsx
git commit -m "feat(fleet): enable manual driver and vehicle creation"
```

---

## Task 3: Build Load Creation Form

This is the main new UI work. Need a `LoadForm` component with load details + dynamic stop entry.

**Files:**
- Modify: `apps/web/src/app/dispatcher/fleet/page.tsx` (add LoadForm, enable button, update LoadsTab)
- Reference: `apps/web/src/features/fleet/loads/types.ts` (LoadCreate, LoadStopCreate types)

**Step 1: Enable "Add Load" button in LoadsTab**

Find the disabled Add Load button (around line 965) and make it open a dialog:

```tsx
// In LoadsTab component, add state:
const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

// Replace disabled button:
<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
  <DialogTrigger asChild>
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Add Load
    </Button>
  </DialogTrigger>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Create Load</DialogTitle>
    </DialogHeader>
    <LoadForm
      onSuccess={() => {
        setIsCreateDialogOpen(false);
        loadLoadsData();
      }}
      onCancel={() => setIsCreateDialogOpen(false)}
    />
  </DialogContent>
</Dialog>
```

**Step 2: Update the LoadsTab integration banner**

Same pattern as drivers — make it contextual and mention manual entry is available. Only show when there are synced loads.

```tsx
{loads.some(l => l.external_source) && (
  <div className="mx-6 mt-2 mb-4">
    <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
      <AlertDescription className="text-sm text-blue-900 dark:text-blue-100 flex items-center justify-between">
        <span>
          <span className="font-medium">Synced loads are read-only.</span>
          {' '}You can also add loads manually using the Add Load button.
        </span>
        <Button size="sm" variant="outline" onClick={handleSyncLoads} disabled={isSyncing} className="ml-4">
          <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
          Sync Now
        </Button>
      </AlertDescription>
    </Alert>
  </div>
)}
```

**Step 3: Build the LoadForm component**

Add this component to the fleet page (or extract to `features/fleet/loads/components/` if preferred):

```tsx
function LoadForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    load_number: '',
    customer_name: '',
    commodity_type: 'general',
    weight_lbs: 0,
    special_requirements: '',
  });
  const [stops, setStops] = useState<Array<{
    name: string;
    address: string;
    city: string;
    state: string;
    action_type: 'pickup' | 'delivery';
    earliest_arrival: string;
    latest_arrival: string;
    estimated_dock_hours: number;
  }>>([
    { name: '', address: '', city: '', state: '', action_type: 'pickup', earliest_arrival: '', latest_arrival: '', estimated_dock_hours: 2 },
    { name: '', address: '', city: '', state: '', action_type: 'delivery', earliest_arrival: '', latest_arrival: '', estimated_dock_hours: 2 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addStop = () => {
    setStops([...stops, {
      name: '', address: '', city: '', state: '',
      action_type: 'delivery',
      earliest_arrival: '', latest_arrival: '',
      estimated_dock_hours: 2,
    }]);
  };

  const removeStop = (index: number) => {
    if (stops.length <= 2) return; // Minimum 2 stops
    setStops(stops.filter((_, i) => i !== index));
  };

  const updateStop = (index: number, field: string, value: any) => {
    const newStops = [...stops];
    newStops[index] = { ...newStops[index], [field]: value };
    setStops(newStops);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // For manual entry, we need to create stops first or create them inline
      // The backend currently requires existing stop_ids
      // For now, create stops as part of the load creation
      // TODO: This needs backend update to support inline stop creation
      await createLoad({
        load_number: formData.load_number,
        customer_name: formData.customer_name,
        commodity_type: formData.commodity_type,
        weight_lbs: formData.weight_lbs,
        special_requirements: formData.special_requirements || undefined,
        stops: stops.map((stop, index) => ({
          stop_id: `STOP-${formData.load_number}-${index + 1}`,
          sequence_order: index + 1,
          action_type: stop.action_type,
          earliest_arrival: stop.earliest_arrival || undefined,
          latest_arrival: stop.latest_arrival || undefined,
          estimated_dock_hours: stop.estimated_dock_hours,
        })),
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create load');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render form with:
  // - Load details section (load_number, customer_name, commodity_type, weight, special_requirements)
  // - Stops section with dynamic add/remove
  // - Each stop: name, address, city, state, action_type (pickup/delivery), time window, dock hours
  // - Submit/Cancel buttons
  // Use all Shadcn components (Input, Label, Select, Button, etc.)
  // Follow dark theme patterns from CLAUDE.md
}
```

**Important backend consideration:** The current `loads.service.ts` `create()` method looks up stops by `stop_id` (expects pre-existing Stop records). For manual load creation, we need stops to be created inline. Update the service to create Stop records if they don't exist:

```typescript
// In loads.service.ts create() method, update the stop handling:
for (const stopData of data.stops) {
  let stop = await this.prisma.stop.findFirst({
    where: { stopId: stopData.stop_id },
  });

  // Create stop if it doesn't exist (manual entry flow)
  if (!stop && stopData.name) {
    stop = await this.prisma.stop.create({
      data: {
        stopId: stopData.stop_id,
        name: stopData.name,
        address: stopData.address || null,
        city: stopData.city || null,
        state: stopData.state || null,
        locationType: 'warehouse',
        isActive: true,
        tenantId: data.tenant_id,
      },
    });
  }

  if (!stop) {
    await this.prisma.load.delete({ where: { id: load.id } });
    throw new NotFoundException(`Stop not found: ${stopData.stop_id}`);
  }

  // ... create LoadStop as before
}
```

Update `CreateLoadDto` and `CreateLoadStopDto` to accept optional stop details:

```typescript
// create-load-stop.dto.ts - add optional stop details for inline creation
@IsString()
@IsOptional()
name?: string;

@IsString()
@IsOptional()
address?: string;

@IsString()
@IsOptional()
city?: string;

@IsString()
@IsOptional()
state?: string;
```

Update frontend `LoadCreate` and `LoadStopCreate` types to match.

**Step 4: Test manually**

1. Fleet → Loads tab → "Add Load" button clickable
2. Click → Dialog opens with load form
3. Fill in load details + 2 stops (1 pickup, 1 delivery)
4. Submit → Load created with status "pending"
5. Load appears in table with "Manual" source badge
6. Click to expand → Shows stop timeline

**Step 5: Commit**

```bash
git add apps/web/src/app/dispatcher/fleet/page.tsx apps/backend/src/domains/fleet/loads/
git commit -m "feat(fleet): add manual load creation with inline stop entry"
```

---

## Task 4: Add Load Status Lifecycle to UI

Currently loads show status as a badge but there's no way to change status from the UI. Add status transition controls.

**Files:**
- Modify: `apps/web/src/app/dispatcher/fleet/page.tsx` (LoadsTab expanded details)
- Modify: `apps/web/src/features/fleet/loads/api.ts` (add updateStatus)
- Modify: `apps/web/src/features/fleet/loads/hooks/use-loads.ts` (add useUpdateLoadStatus)
- Modify: `apps/web/src/features/fleet/loads/types.ts` (add status type)

**Step 1: Add updateStatus to frontend API and hooks**

```typescript
// api.ts - add:
updateStatus: async (loadId: string, status: string): Promise<Load> => {
  return apiClient<Load>(`/loads/${loadId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
},

// hooks/use-loads.ts - add:
export function useUpdateLoadStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ loadId, status }: { loadId: string; status: string }) =>
      loadsApi.updateStatus(loadId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOADS_QUERY_KEY });
    },
  });
}
```

**Step 2: Add status controls to expanded load details**

In the expanded row details section of LoadsTab, add a status dropdown:

```tsx
// Valid transitions:
// pending → dispatched, cancelled
// dispatched → in_transit, cancelled
// in_transit → delivered
// delivered → (terminal)
// cancelled → (terminal)
```

Show a `Select` component with valid next statuses based on current status. Only show for manual loads (not synced ones — those get status from TMS).

```tsx
{!loadDetails.external_source && (
  <div className="flex items-center gap-2">
    <Label className="text-xs">Update Status:</Label>
    <Select
      value={loadDetails.status}
      onValueChange={(newStatus) => handleStatusUpdate(load.load_id, newStatus)}
    >
      <SelectTrigger className="w-40 h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {getValidTransitions(loadDetails.status).map(s => (
          <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}
```

**Step 3: Test manually**

1. Create a manual load (from Task 3)
2. Expand it → See status dropdown
3. Change status from "pending" → "dispatched" → Success
4. Synced loads should NOT show the status dropdown

**Step 4: Commit**

```bash
git add apps/web/src/features/fleet/loads/ apps/web/src/app/dispatcher/fleet/page.tsx
git commit -m "feat(fleet): add load status lifecycle controls"
```

---

## Task 5: Add Phase 1 Feature Flags (Invoicing & Settlements)

Add feature flags for Phase 1 features so they appear in the system and can be toggled.

**Files:**
- Modify: `apps/backend/prisma/seeds/feature-flags.seed.ts`
- Modify: `apps/web/src/shared/config/comingSoonContent.ts`

**Step 1: Add feature flags to seed**

Add these flags to the `flags` array in `feature-flags.seed.ts`:

```typescript
// Phase 1 - TMS Features (Financials)
{
  key: 'invoicing_enabled',
  name: 'Invoicing',
  description: 'Generate invoices from delivered loads, track payments, and manage accounts receivable',
  enabled: false,
  category: 'dispatcher',
},
{
  key: 'driver_settlements_enabled',
  name: 'Driver Settlements',
  description: 'Calculate driver pay from completed loads with per-mile, percentage, and flat rate support',
  enabled: false,
  category: 'dispatcher',
},
{
  key: 'quickbooks_integration_enabled',
  name: 'QuickBooks Integration',
  description: 'Two-way sync of invoices, settlements, and payments with QuickBooks Online',
  enabled: false,
  category: 'admin',
},
```

**Step 2: Add Coming Soon content**

Add to `comingSoonContent.ts`:

```typescript
invoicing_enabled: {
  title: 'Invoicing & Billing',
  description:
    'Generate invoices directly from delivered loads, track payment status, and manage your accounts receivable — all within SALLY.',
  features: [
    'One-click invoice generation from completed loads with rate and accessorials',
    'Automatic invoice delivery via email to customers',
    'Payment tracking with aging reports (30/60/90 days)',
    'Detention and accessorial charge management',
    'QuickBooks Online sync for seamless accounting',
  ],
},

driver_settlements_enabled: {
  title: 'Driver Settlements',
  description:
    'Calculate and generate driver pay statements automatically from completed loads — supporting per-mile, percentage, and flat rate pay structures.',
  features: [
    'Flexible pay structures: per-mile, percentage of revenue, flat rate per load',
    'Automatic deduction management (fuel advances, insurance, equipment)',
    'Settlement statement PDF generation and delivery',
    'Pay period management with customizable schedules',
    'Direct deposit file generation (ACH)',
  ],
},

quickbooks_integration_enabled: {
  title: 'QuickBooks Integration',
  description:
    'Two-way sync between SALLY and QuickBooks Online for invoices, driver settlements, and payment tracking.',
  features: [
    'Automatic invoice push to QuickBooks when generated in SALLY',
    'Payment status sync back from QuickBooks',
    'Driver settlement sync for payroll',
    'Chart of accounts mapping for proper categorization',
    'Reconciliation dashboard for discrepancy detection',
  ],
},
```

**Step 3: Run seed to create flags**

```bash
cd apps/backend && npx ts-node prisma/seeds/feature-flags.seed.ts
```

**Step 4: Commit**

```bash
git add apps/backend/prisma/seeds/feature-flags.seed.ts apps/web/src/shared/config/comingSoonContent.ts
git commit -m "feat(flags): add Phase 1 feature flags for invoicing, settlements, QuickBooks"
```

---

## Task 6: Add Phase 1 Navigation Items with Coming Soon Pages

Add "Invoicing" and "Settlements" to the sidebar navigation, pointing to new pages that show Coming Soon banners.

**Files:**
- Modify: `apps/web/src/shared/lib/navigation.ts`
- Create: `apps/web/src/app/dispatcher/invoicing/page.tsx`
- Create: `apps/web/src/app/dispatcher/settlements/page.tsx`

**Step 1: Update navigation config**

Add new items to the dispatcher, admin, and owner navigation. Place them after "Live Routes" as a new "Financials" section:

```typescript
// In navigation.ts, update dispatcher array:
dispatcher: [
  { label: 'Command Center', href: '/dispatcher/overview', icon: Home },
  { label: 'Fleet', href: '/dispatcher/fleet', icon: Package },
  { label: 'Plan Route', href: '/dispatcher/create-plan', icon: Plus },
  { label: 'Live Routes', href: '/dispatcher/active-routes', icon: Truck },
  { label: 'Analytics', href: '/dispatcher/analytics', icon: BarChart3 },
  { type: 'separator', label: 'Financials' } as NavSeparator,
  { label: 'Invoicing', href: '/dispatcher/invoicing', icon: FileText },
  { label: 'Settlements', href: '/dispatcher/settlements', icon: Wallet },
  { type: 'separator', label: 'Configuration' } as NavSeparator,
  { label: 'Operations', href: '/settings/operations', icon: Route },
  { label: 'Integrations', href: '/settings/integrations', icon: Plug },
  { label: 'Preferences', href: '/settings/preferences', icon: Settings },
],
```

Add `FileText` and `Wallet` to the lucide-react import at top of file.

Repeat for `admin` and `owner` navigation arrays (same items go in the Operations section).

**Step 2: Create Invoicing page with Coming Soon**

```tsx
// apps/web/src/app/dispatcher/invoicing/page.tsx
'use client';

import { FeatureGuard } from '@/features/platform/feature-flags';

export default function InvoicingPage() {
  return (
    <FeatureGuard featureKey="invoicing_enabled">
      <div>Invoicing content will go here</div>
    </FeatureGuard>
  );
}
```

**Step 3: Create Settlements page with Coming Soon**

```tsx
// apps/web/src/app/dispatcher/settlements/page.tsx
'use client';

import { FeatureGuard } from '@/features/platform/feature-flags';

export default function SettlementsPage() {
  return (
    <FeatureGuard featureKey="driver_settlements_enabled">
      <div>Driver settlements content will go here</div>
    </FeatureGuard>
  );
}
```

**Step 4: Add `/dispatcher` to protectedRoutePatterns if not already there**

Check `navigation.ts` — `/dispatcher` is already in `protectedRoutePatterns`, so these new pages are automatically protected.

**Step 5: Test manually**

1. Log in as dispatcher → Sidebar shows new "Financials" section
2. "Invoicing" and "Settlements" items visible
3. Click "Invoicing" → Full-page Coming Soon banner with features list
4. Click "Settlements" → Full-page Coming Soon banner with features list
5. Verify in Feature Flags admin page → New flags visible and disabled

**Step 6: Commit**

```bash
git add apps/web/src/shared/lib/navigation.ts apps/web/src/app/dispatcher/invoicing/ apps/web/src/app/dispatcher/settlements/
git commit -m "feat(nav): add Financials section with Invoicing and Settlements (Coming Soon)"
```

---

## Task 7: Add Coming Soon for Live Tracking & Create Plan

These features are already in navigation with feature flags. Verify they show Coming Soon properly and update content if needed.

**Files:**
- Verify: `apps/web/src/app/dispatcher/create-plan/page.tsx` — should use `FeatureGuard`
- Verify: `apps/web/src/app/dispatcher/active-routes/page.tsx` — should use `FeatureGuard`

**Step 1: Verify Create Plan page**

Read `apps/web/src/app/dispatcher/create-plan/page.tsx` and confirm it wraps content with:
```tsx
<FeatureGuard featureKey="route_planning_enabled">
```

If it already does, no changes needed.

**Step 2: Verify Live Routes page**

Read `apps/web/src/app/dispatcher/active-routes/page.tsx` and confirm it wraps content with:
```tsx
<FeatureGuard featureKey="live_tracking_enabled">
```

If it already does, no changes needed.

**Step 3: Test**

1. Toggle `route_planning_enabled` flag OFF → Create Plan page shows Coming Soon
2. Toggle `live_tracking_enabled` flag OFF → Live Routes page shows Coming Soon
3. Toggle ON → Both show actual content

**Step 4: Commit (if any changes)**

```bash
git commit -m "fix(flags): ensure Create Plan and Live Routes are properly feature-gated"
```

---

## Task 8: Update Empty States for No-Integration Carriers

When a carrier has no integrations configured, the fleet page should show helpful empty states guiding them to add data manually instead of saying "data will sync from TMS."

**Files:**
- Modify: `apps/web/src/app/dispatcher/fleet/page.tsx`

**Step 1: Update empty states**

Change the empty states in DriversTab, AssetsTab, and LoadsTab to be more helpful:

```tsx
// DriversTab empty state:
<div className="text-center py-8 text-muted-foreground">
  <p className="mb-2">No drivers yet.</p>
  <p className="text-sm">Click "Add Driver" to add your first driver, or configure a TMS integration to sync automatically.</p>
</div>

// AssetsTab (Trucks) empty state:
<div className="text-center py-8 text-muted-foreground">
  <p className="mb-2">No trucks yet.</p>
  <p className="text-sm">Click "Add Truck" to add your first vehicle, or configure a TMS integration to sync automatically.</p>
</div>

// LoadsTab empty state:
<div className="text-center py-8 text-muted-foreground">
  <p className="mb-2">No loads yet.</p>
  <p className="text-sm">Click "Add Load" to create your first load, or configure a TMS integration to sync automatically.</p>
</div>
```

**Step 2: Commit**

```bash
git add apps/web/src/app/dispatcher/fleet/page.tsx
git commit -m "fix(fleet): update empty states to guide manual entry"
```

---

## Final Navigation Structure

After all tasks, the dispatcher sidebar will look like:

```
DISPATCHER SIDEBAR
──────────────────
  Command Center      → /dispatcher/overview        (FeatureGuard: command_center_enabled)
  Fleet               → /dispatcher/fleet            (Always accessible — Phase 0 focus)
  Plan Route          → /dispatcher/create-plan      (FeatureGuard: route_planning_enabled)
  Live Routes         → /dispatcher/active-routes    (FeatureGuard: live_tracking_enabled)
  Analytics           → /dispatcher/analytics        (Always accessible)

─── Financials ───
  Invoicing           → /dispatcher/invoicing        (FeatureGuard: invoicing_enabled) [COMING SOON]
  Settlements         → /dispatcher/settlements      (FeatureGuard: driver_settlements_enabled) [COMING SOON]

─── Configuration ───
  Operations          → /settings/operations         (Always accessible)
  Integrations        → /settings/integrations       (Always accessible)
  Preferences         → /settings/preferences        (Always accessible)
```

### Feature Flag Summary

| Flag | Category | Phase | Status |
|------|----------|-------|--------|
| `command_center_enabled` | dispatcher | Existing | Disabled |
| `route_planning_enabled` | dispatcher | Existing | Disabled |
| `live_tracking_enabled` | dispatcher | Existing | Disabled |
| `invoicing_enabled` | dispatcher | Phase 1 | **NEW — Disabled** |
| `driver_settlements_enabled` | dispatcher | Phase 1 | **NEW — Disabled** |
| `quickbooks_integration_enabled` | admin | Phase 1 | **NEW — Disabled** |

---

## Task Dependency Order

```
Task 1 (Backend tenant scoping) ─────────────┐
                                              ├──→ Task 3 (Load creation form)
Task 2 (Enable driver/vehicle buttons) ───────┘         │
                                                         ├──→ Task 4 (Load status lifecycle)
Task 5 (Feature flags) ──→ Task 6 (Navigation + pages)  │
                                                         │
Task 7 (Verify existing feature gates) ──────────────────┘
Task 8 (Empty states) ── independent, do anytime
```

Tasks 1+2 and 5 can run in parallel. Task 3 depends on 1. Task 4 depends on 3. Task 6 depends on 5. Task 7 is verification only. Task 8 is independent.
