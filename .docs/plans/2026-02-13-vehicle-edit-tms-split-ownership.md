# Vehicle Edit/Action UX with TMS Split Ownership — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow dispatchers to edit operational fields on TMS-synced vehicles while keeping identity fields read-only, with consistent dropdown action menus.

**Architecture:** Remove blanket ExternalSourceGuard from vehicle update endpoint. Add field-level TMS filtering in the service layer. Update the frontend form to disable TMS-owned fields and use dropdown menus for actions (matching the Drivers tab pattern).

**Tech Stack:** NestJS backend (TypeScript), Next.js frontend (React), Prisma ORM, Shadcn UI components, Tailwind CSS

---

### Task 1: Backend — Remove ExternalSourceGuard from update endpoint, add field-level filtering in service

**Files:**
- Modify: `apps/backend/src/domains/fleet/vehicles/controllers/vehicles.controller.ts:124-127`
- Modify: `apps/backend/src/domains/fleet/vehicles/services/vehicles.service.ts:108-162`

**Step 1: Remove guard from update endpoint**

In `vehicles.controller.ts`, remove the `@UseGuards(ExternalSourceGuard)` and `@ExternalSourceCheck('vehicle')` decorators from the `updateVehicle` method (lines 126-127). Keep these decorators on the `deleteVehicle` method — delete stays blocked for TMS-synced vehicles.

Also remove the unused `ExternalSourceGuard` and `ExternalSourceCheck` imports if they're no longer used by the update endpoint (but keep them if the delete endpoint still uses them — it does, so keep the imports).

The update method should look like:

```typescript
@Put(':vehicle_id')
@Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.DISPATCHER)
@ApiOperation({ summary: 'Update vehicle' })
@ApiParam({ name: 'vehicle_id', description: 'Vehicle ID' })
async updateVehicle(
  @CurrentUser() user: any,
  @Param('vehicle_id') vehicleId: string,
  @Body() updateVehicleDto: UpdateVehicleDto,
) {
  // ... rest unchanged
}
```

**Step 2: Add field-level TMS filtering in service**

In `vehicles.service.ts`, modify the `update` method to:
1. First fetch the vehicle to check if it has `externalSource`
2. If it does, strip TMS-owned fields from the data before updating

The TMS-owned fields to strip are: `unit_number`, `vin`, `make`, `model`, `year`, `license_plate`, `license_plate_state`.

```typescript
async update(
  vehicleId: string,
  tenantId: number,
  data: { /* same as before */ },
): Promise<Vehicle> {
  // Check if vehicle is TMS-synced — if so, strip TMS-owned fields
  const existing = await this.prisma.vehicle.findUnique({
    where: { vehicleId_tenantId: { vehicleId, tenantId } },
  });

  if (!existing) {
    throw new NotFoundException(`Vehicle not found: ${vehicleId}`);
  }

  let filteredData = data;
  if (existing.externalSource) {
    // Strip TMS-owned identity fields — only allow operational field updates
    const { unit_number, vin, make, model, year, license_plate, license_plate_state, ...operationalFields } = data;
    filteredData = operationalFields;
    this.logger.log(`Vehicle ${vehicleId} is TMS-synced (${existing.externalSource}), stripping identity fields from update`);
  }

  try {
    const vehicle = await this.prisma.vehicle.update({
      where: {
        vehicleId_tenantId: { vehicleId, tenantId },
      },
      data: {
        ...(filteredData.equipment_type !== undefined ? { equipmentType: filteredData.equipment_type as any } : {}),
        ...(filteredData.fuel_capacity_gallons !== undefined ? { fuelCapacityGallons: filteredData.fuel_capacity_gallons } : {}),
        ...(filteredData.mpg !== undefined ? { mpg: filteredData.mpg } : {}),
        ...(filteredData.status !== undefined ? { status: filteredData.status as any } : {}),
        ...(filteredData.has_sleeper_berth !== undefined ? { hasSleeperBerth: filteredData.has_sleeper_berth } : {}),
        ...(filteredData.gross_weight_lbs !== undefined ? { grossWeightLbs: filteredData.gross_weight_lbs } : {}),
        ...(filteredData.current_fuel_gallons !== undefined ? { currentFuelGallons: filteredData.current_fuel_gallons } : {}),
        // Only include identity fields if they weren't stripped (manual vehicles)
        ...(!existing.externalSource && filteredData.unit_number !== undefined ? { unitNumber: filteredData.unit_number } : {}),
        ...(!existing.externalSource && filteredData.vin !== undefined ? { vin: filteredData.vin } : {}),
        ...(!existing.externalSource && filteredData.make !== undefined ? { make: filteredData.make } : {}),
        ...(!existing.externalSource && filteredData.model !== undefined ? { model: filteredData.model } : {}),
        ...(!existing.externalSource && filteredData.year !== undefined ? { year: filteredData.year } : {}),
        ...(!existing.externalSource && filteredData.license_plate !== undefined ? { licensePlate: filteredData.license_plate } : {}),
        ...(!existing.externalSource && filteredData.license_plate_state !== undefined ? { licensePlateState: filteredData.license_plate_state } : {}),
      },
    });

    this.logger.log(`Vehicle updated: ${vehicleId}`);
    return vehicle;
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ConflictException('Vehicle with this VIN already exists');
    }
    throw error;
  }
}
```

**Step 3: Verify TypeScript compiles**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/backend/src/domains/fleet/vehicles/controllers/vehicles.controller.ts apps/backend/src/domains/fleet/vehicles/services/vehicles.service.ts
git commit -m "feat(vehicles): replace blanket TMS guard with field-level split ownership"
```

---

### Task 2: Frontend — Update table actions to use dropdown menus (consistent with Drivers tab)

**Files:**
- Modify: `apps/web/src/app/dispatcher/fleet/page.tsx` (lines 769-864 — the table and actions area)

**Step 1: Replace inline edit/delete buttons with DropdownMenu**

Replace the current actions column (lines 817-859) which uses inline `<Button>` elements with a `<DropdownMenu>` pattern matching the Drivers tab (lines 386-419).

For TMS-synced vehicles, show:
- "Edit" menu item (enabled — opens the form with split ownership)
- Disabled "Synced from [TMS]" item with Lock icon (explains delete is blocked)

For manual vehicles, show:
- "Edit" menu item
- "Delete" menu item (red text, with confirmation dialog)

```tsx
<TableCell className="text-right">
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => handleEdit(vehicle)}>
        <Pencil className="h-4 w-4 mr-2" />
        Edit
      </DropdownMenuItem>
      {!vehicle.external_source && (
        <DropdownMenuItem
          onClick={() => setDeleteConfirm(vehicle.vehicle_id)}
          className="text-red-600 dark:text-red-400"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      )}
      {vehicle.external_source && (
        <DropdownMenuItem disabled>
          <Lock className="h-4 w-4 mr-2" />
          Synced from {getSourceLabel(vehicle.external_source)}
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  </DropdownMenu>
</TableCell>
```

**Step 2: Update TMS alert banner text**

Change line 737 from:
```
— Some trucks are synced from your TMS. Synced trucks are read-only. You can still add trucks manually.
```
To:
```
— Some trucks are synced from your TMS. Vehicle details are managed by your TMS — operational fields can be edited locally.
```

**Step 3: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/web/src/app/dispatcher/fleet/page.tsx
git commit -m "feat(vehicles): replace inline actions with dropdown menu, update TMS banner text"
```

---

### Task 3: Frontend — Update VehicleForm for split ownership (disabled TMS fields)

**Files:**
- Modify: `apps/web/src/app/dispatcher/fleet/page.tsx` (VehicleForm component, lines 919-1298)

**Step 1: Accept `isTmsSynced` and `externalSource` context in VehicleForm**

The form needs to know if the vehicle being edited is TMS-synced. Derive this from the `vehicle` prop:

```tsx
function VehicleForm({
  vehicle,
  onSuccess,
  onCancel,
  refData,
}: {
  vehicle: Vehicle | null;
  onSuccess: () => void;
  onCancel: () => void;
  refData?: Record<string, ReferenceItem[]>;
}) {
  const isTmsSynced = !!vehicle?.external_source;
```

**Step 2: Update dialog title to show TMS badge**

In the `AssetsTab` component where the `DialogTitle` is rendered (line 682-684), update to show TMS context:

```tsx
<DialogHeader>
  <DialogTitle className="flex items-center gap-2">
    {editingVehicle ? 'Edit Truck' : 'Add Truck'}
    {editingVehicle?.external_source && (
      <Badge variant="muted" className="text-xs font-normal gap-1">
        <Lock className="h-3 w-3" />
        Synced from {getSourceLabel(editingVehicle.external_source)}
      </Badge>
    )}
  </DialogTitle>
</DialogHeader>
```

**Step 3: Disable TMS-owned fields when editing a TMS-synced vehicle**

For each TMS-owned field, add `disabled={isTmsSynced}` and visual lockout styling:

Unit Number field (line 1017-1027):
```tsx
<div>
  <Label htmlFor="unit_number">Unit Number *</Label>
  <Input
    id="unit_number"
    value={formData.unit_number}
    onChange={(e) =>
      setFormData({ ...formData, unit_number: e.target.value })
    }
    placeholder="e.g. TRUCK-101"
    required
    disabled={isTmsSynced}
  />
</div>
```

VIN field (line 1029-1046):
```tsx
<div>
  <Label htmlFor="vin">VIN *</Label>
  <Input
    id="vin"
    value={formData.vin}
    onChange={(e) =>
      setFormData({ ...formData, vin: e.target.value.toUpperCase().replace(/\s/g, '') })
    }
    placeholder="17-character VIN"
    maxLength={17}
    required
    disabled={isTmsSynced}
  />
  {!isTmsSynced && formData.vin && formData.vin.length > 0 && formData.vin.length !== 17 && (
    <p className="text-xs text-muted-foreground mt-1">
      {formData.vin.length}/17 characters
    </p>
  )}
</div>
```

Make field (in More Details, line 1163-1171):
```tsx
<Input
  id="make"
  value={formData.make}
  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
  placeholder="e.g. Freightliner"
  disabled={isTmsSynced}
/>
```

Model field (line 1174-1182):
```tsx
<Input
  id="model"
  value={formData.model}
  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
  placeholder="e.g. Cascadia"
  disabled={isTmsSynced}
/>
```

Year field (line 1187-1200):
```tsx
<Input
  id="year"
  type="number"
  min="1990"
  max={new Date().getFullYear() + 1}
  value={formData.year || ''}
  onChange={(e) =>
    setFormData({
      ...formData,
      year: e.target.value ? parseInt(e.target.value) : undefined,
    })
  }
  placeholder="e.g. 2024"
  disabled={isTmsSynced}
/>
```

License Plate field (line 1211-1218):
```tsx
<Input
  id="license_plate"
  value={formData.license_plate}
  onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
  placeholder="e.g. ABC-1234"
  disabled={isTmsSynced}
/>
```

License Plate State Select (line 1223-1239):
```tsx
<Select
  value={formData.license_plate_state}
  onValueChange={(value) =>
    setFormData({ ...formData, license_plate_state: value })
  }
  disabled={isTmsSynced}
>
```

**Step 4: Add helper text for TMS-managed sections**

After the VIN field (and before Equipment Type), when `isTmsSynced` is true, add a small note:

```tsx
{isTmsSynced && (
  <p className="text-xs text-muted-foreground flex items-center gap-1">
    <Lock className="h-3 w-3" />
    Unit number and VIN are managed by your TMS integration
  </p>
)}
```

In the "More Details" collapsible, before the "Vehicle Info" section, when `isTmsSynced`:

```tsx
{isTmsSynced && (
  <p className="text-xs text-muted-foreground flex items-center gap-1">
    <Lock className="h-3 w-3" />
    Vehicle info and registration are managed by your TMS integration
  </p>
)}
```

**Step 5: Skip VIN validation for TMS-synced vehicles in handleSubmit**

In the `handleSubmit` function (line 956-991), the VIN validation block should be skipped for TMS-synced vehicles since they can't edit VIN:

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  setError(null);

  // VIN validation — only for manual vehicles (TMS-synced can't change VIN)
  if (!isTmsSynced) {
    const cleanVin = formData.vin?.toUpperCase().replace(/\s/g, '') || '';
    if (cleanVin.length !== 17) {
      setError('VIN must be exactly 17 characters');
      setIsSubmitting(false);
      return;
    }
  }

  const submitData = {
    ...formData,
    vin: isTmsSynced ? undefined : formData.vin?.toUpperCase().replace(/\s/g, ''),
    // Clean up empty optional strings
    make: isTmsSynced ? undefined : (formData.make || undefined),
    model: isTmsSynced ? undefined : (formData.model || undefined),
    license_plate: isTmsSynced ? undefined : (formData.license_plate || undefined),
    license_plate_state: isTmsSynced ? undefined : (formData.license_plate_state || undefined),
    unit_number: isTmsSynced ? undefined : formData.unit_number,
    year: isTmsSynced ? undefined : formData.year,
  };

  try {
    if (vehicle) {
      await updateVehicle(vehicle.vehicle_id, submitData);
    } else {
      await createVehicle(submitData);
    }
    onSuccess();
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to save vehicle');
  } finally {
    setIsSubmitting(false);
  }
};
```

**Step 6: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```bash
git add apps/web/src/app/dispatcher/fleet/page.tsx
git commit -m "feat(vehicles): add split ownership form with disabled TMS fields and lock indicators"
```

---

### Task 4: Visual QA — verify in browser

**Step 1: Start the dev server if not running**

Run: `pnpm dev` (from project root)

**Step 2: Test manual vehicle edit**

Navigate to Fleet > Assets > Trucks. Click the `...` menu on a manual vehicle. Click "Edit". Verify:
- All fields are editable
- Form behaves exactly as before
- Save works

**Step 3: Test TMS-synced vehicle edit**

Click the `...` menu on a TMS-synced vehicle. Click "Edit". Verify:
- Dialog title shows "Edit Truck" with "Synced from [TMS]" badge
- Unit Number and VIN are disabled (grayed out)
- Equipment Type, Fuel Capacity, MPG, Status are editable
- "More Details" shows disabled Make, Model, Year, License Plate, License Plate State
- Has Sleeper Berth and GVW are editable
- Helper text shows "managed by your TMS integration"
- Save works — updates only operational fields

**Step 4: Test TMS-synced vehicle delete blocked**

Click `...` on a TMS-synced vehicle. Verify:
- No "Delete" option
- Shows "Synced from [TMS]" disabled item

**Step 5: Test dark mode**

Toggle dark mode and verify all new elements render correctly in both themes.

**Step 6: Test responsive**

Resize to 375px (mobile). Verify the form is single-column and all elements are accessible.
