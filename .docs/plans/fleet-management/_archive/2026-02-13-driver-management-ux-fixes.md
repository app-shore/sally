# Driver Management UX Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 5 UX issues in driver management: add "More Details" collapsible to Add Driver, unify edit flow to Tier 2 dialog, support partial edit for TMS-synced drivers, clean up SALLY column/actions, and minor navigation fixes.

**Architecture:** All changes are frontend-only in 3 files. The `EditDriverDialog` becomes the single edit entry point (used from both table and profile). The `DriverForm` is simplified to create-only with an optional "More Details" collapsible. TMS-synced drivers get partial edit with locked fields.

**Tech Stack:** Next.js 15, React, TypeScript, Shadcn UI, Tailwind CSS, React Query

---

### Task 1: Update CreateDriverRequest type to support optional fields at creation

**Files:**
- Modify: `apps/web/src/features/fleet/drivers/types.ts:55-62`

**Step 1: Extend CreateDriverRequest with optional profile fields**

In `apps/web/src/features/fleet/drivers/types.ts`, update the `CreateDriverRequest` interface to include optional profile fields so the Add Driver form can send them:

```typescript
export interface CreateDriverRequest {
  name: string;
  phone: string;
  email: string;
  cdl_class: string;
  license_number: string;
  license_state?: string;
  // Optional profile fields (from "More Details" section)
  endorsements?: string[];
  hire_date?: string;
  medical_card_expiry?: string;
  home_terminal_city?: string;
  home_terminal_state?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd /Users/ajay-admin/sally && npx turbo run type-check --filter=web`
Expected: No type errors (the new optional fields are backward-compatible)

**Step 3: Commit**

```bash
git add apps/web/src/features/fleet/drivers/types.ts
git commit -m "feat(drivers): extend CreateDriverRequest with optional profile fields"
```

---

### Task 2: Add "More Details" collapsible to DriverForm (Add Driver dialog)

**Files:**
- Modify: `apps/web/src/app/dispatcher/fleet/page.tsx` — `DriverForm` component (lines 452-595)

The `DriverForm` currently only shows 6 fields. We need to add a collapsible "More Details" section matching the Vehicle form pattern (see lines 1141-1284 in same file for reference).

**Step 1: Add imports**

At the top of `fleet/page.tsx`, ensure these imports exist (some already do):
- `Collapsible, CollapsibleContent, CollapsibleTrigger` — already imported (line 73-77)
- `Checkbox` — already imported (line 78)
- `ChevronDown` — already imported (line 79)
- `Textarea` — **NOT imported yet**. Add: `import { Textarea } from '@/shared/components/ui/textarea';`
- `Separator` — **NOT imported yet**. Add: `import { Separator } from '@/shared/components/ui/separator';`

Also update the `useReferenceData` call inside `DriverForm` (line 461) to include `'endorsement'`:
```typescript
const { data: refData } = useReferenceData(['cdl_class', 'us_state', 'endorsement']);
```
And add after line 463:
```typescript
const endorsementOptions = refData?.endorsement ?? [];
```

**Step 2: Extend formData state to include optional fields**

Replace the `formData` state initialization (lines 465-472) with:

```typescript
const [formData, setFormData] = useState<CreateDriverRequest>({
  name: '',
  phone: '',
  email: '',
  cdl_class: '',
  license_number: '',
  license_state: '',
  endorsements: [],
  hire_date: '',
  medical_card_expiry: '',
  home_terminal_city: '',
  home_terminal_state: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  notes: '',
});
const [showMore, setShowMore] = useState(false);
```

**Step 3: Add endorsement toggle handler**

Add after the `handleSubmit` function (after line 493):

```typescript
const handleEndorsementToggle = (value: string) => {
  const current = formData.endorsements || [];
  if (current.includes(value)) {
    setFormData({ ...formData, endorsements: current.filter((e) => e !== value) });
  } else {
    setFormData({ ...formData, endorsements: [...current, value] });
  }
};
```

**Step 4: Add "More Details" collapsible section**

After the license state grid (after line 581, before the error display), insert the collapsible section:

```tsx
<Collapsible open={showMore} onOpenChange={setShowMore}>
  <CollapsibleTrigger asChild>
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="w-full justify-between text-muted-foreground hover:text-foreground"
    >
      More Details
      <ChevronDown
        className={`h-4 w-4 transition-transform ${showMore ? 'rotate-180' : ''}`}
      />
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent className="space-y-4 pt-2">
    {/* Endorsements */}
    <div>
      <Label>Endorsements</Label>
      <div className="flex flex-wrap gap-4 mt-2">
        {endorsementOptions.map((opt) => (
          <div key={opt.code} className="flex items-center gap-2">
            <Checkbox
              id={`create-endorsement-${opt.code}`}
              checked={(formData.endorsements || []).includes(opt.code)}
              onCheckedChange={() => handleEndorsementToggle(opt.code)}
            />
            <Label htmlFor={`create-endorsement-${opt.code}`} className="text-sm font-normal cursor-pointer">
              {opt.label}
            </Label>
          </div>
        ))}
      </div>
    </div>

    <Separator />

    {/* Compliance Dates */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="create-hire-date">Hire Date</Label>
        <Input
          id="create-hire-date"
          type="date"
          value={formData.hire_date || ''}
          onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="create-medical">Medical Card Expiry</Label>
        <Input
          id="create-medical"
          type="date"
          value={formData.medical_card_expiry || ''}
          onChange={(e) => setFormData({ ...formData, medical_card_expiry: e.target.value })}
        />
      </div>
    </div>

    <Separator />

    {/* Home Terminal */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="create-city">Home Terminal City</Label>
        <Input
          id="create-city"
          value={formData.home_terminal_city || ''}
          onChange={(e) => setFormData({ ...formData, home_terminal_city: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="create-terminal-state">Home Terminal State</Label>
        <Select
          value={formData.home_terminal_state || ''}
          onValueChange={(value) => setFormData({ ...formData, home_terminal_state: value })}
        >
          <SelectTrigger id="create-terminal-state">
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent>
            {usStates.map((state) => (
              <SelectItem key={state.code} value={state.code}>
                {state.label} ({state.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>

    <Separator />

    {/* Emergency Contact */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="create-ec-name">Emergency Contact Name</Label>
        <Input
          id="create-ec-name"
          value={formData.emergency_contact_name || ''}
          onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="create-ec-phone">Emergency Contact Phone</Label>
        <Input
          id="create-ec-phone"
          type="tel"
          value={formData.emergency_contact_phone || ''}
          onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
        />
      </div>
    </div>

    <Separator />

    {/* Notes */}
    <div>
      <Label htmlFor="create-notes">Notes</Label>
      <Textarea
        id="create-notes"
        value={formData.notes || ''}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        rows={3}
        placeholder="Add notes about this driver..."
      />
    </div>
  </CollapsibleContent>
</Collapsible>
```

**Step 5: Remove old edit logic from DriverForm**

The `DriverForm` currently handles both create and edit (lines 482-483 check `if (driver)`). Since we're unifying edit to `EditDriverDialog`, simplify `DriverForm` to create-only:

- Remove the `driver` prop entirely
- Remove the `driver ?` conditional in handleSubmit — only call `createDriver(formData)`
- Update the dialog title from `{editingDriver ? 'Edit Driver' : 'Add Driver'}` to just `'Add Driver'` (line 249-251)
- Update the submit button from `{driver ? 'Update' : 'Create'}` to just `'Create'` (line 590)

The `DriverForm` signature becomes:
```typescript
function DriverForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
```

And the `handleSubmit`:
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  setError(null);

  try {
    await createDriver(formData);
    onSuccess();
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to create driver');
  } finally {
    setIsSubmitting(false);
  }
};
```

**Step 6: Verify TypeScript compiles**

Run: `cd /Users/ajay-admin/sally && npx turbo run type-check --filter=web`
Expected: No type errors

**Step 7: Commit**

```bash
git add apps/web/src/app/dispatcher/fleet/page.tsx
git commit -m "feat(drivers): add More Details collapsible to Add Driver dialog"
```

---

### Task 3: Add TMS partial-edit support to EditDriverDialog

**Files:**
- Modify: `apps/web/src/features/fleet/drivers/components/edit-driver-dialog.tsx`

**Step 1: Update props interface to accept external source info**

Replace the interface (lines 28-32) with:

```typescript
interface EditDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: Driver;
  externalSource?: string; // If set, locks TMS-synced fields
}
```

Update the function signature (line 34):
```typescript
export default function EditDriverDialog({ open, onOpenChange, driver, externalSource }: EditDriverDialogProps) {
```

**Step 2: Add Lock icon import and Alert components**

Add to existing imports at top of file:
```typescript
import { Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
```

**Step 3: Add TMS banner and lock synced fields**

After `<DialogTitle>Edit Driver</DialogTitle>` (line 109), inside the form, add the TMS info banner:

```tsx
{externalSource && (
  <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
    <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
      <Lock className="h-3 w-3 inline mr-1" />
      Some fields are managed by <span className="font-medium">{externalSource}</span> and cannot be edited here.
    </AlertDescription>
  </Alert>
)}
```

**Step 4: Disable TMS-synced fields when externalSource is set**

For each of these fields, add `disabled={!!externalSource}` and a visual lock indicator:

1. **Name field** (line 116-121): Add `disabled={!!externalSource}` to Input, add `className={externalSource ? 'opacity-60' : ''}` wrapper
2. **Phone field** (line 127-132): Same
3. **Email field** (line 135-141): Same
4. **CDL Class Select** (line 149-163): Add `disabled={!!externalSource}` to Select
5. **License Number** (line 167-171): Add `disabled={!!externalSource}` to Input
6. **License State** (line 179-194): Add `disabled={!!externalSource}` to Select

For each locked field group, wrap the div with a conditional opacity class:

```tsx
<div className={externalSource ? 'opacity-60' : ''}>
  <Label htmlFor="edit-name">
    Name {externalSource && <Lock className="h-3 w-3 inline ml-1 text-muted-foreground" />}
  </Label>
  <Input
    id="edit-name"
    value={formData.name}
    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
    disabled={!!externalSource}
  />
</div>
```

Apply this pattern to all 6 locked fields (Name, Phone, Email, CDL Class, License Number, License State).

The remaining fields (Endorsements, Hire Date, Medical Card Expiry, Home Terminal, Emergency Contact, Notes) remain fully editable regardless of `externalSource`.

**Step 5: Verify TypeScript compiles**

Run: `cd /Users/ajay-admin/sally && npx turbo run type-check --filter=web`
Expected: No type errors

**Step 6: Commit**

```bash
git add apps/web/src/features/fleet/drivers/components/edit-driver-dialog.tsx
git commit -m "feat(drivers): add TMS partial-edit support with locked synced fields"
```

---

### Task 4: Unify edit flow in DriversTab — use EditDriverDialog everywhere

**Files:**
- Modify: `apps/web/src/app/dispatcher/fleet/page.tsx` — `DriversTab` component

**Step 1: Import EditDriverDialog and add state**

Add `EditDriverDialog` to the import from `@/features/fleet/drivers` (line 11):
```typescript
import {
  listDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
  InviteDriverDialog,
  EditDriverDialog,
  type Driver,
  type CreateDriverRequest,
} from '@/features/fleet/drivers';
```

**Step 2: Replace edit state and handler in DriversTab**

In `DriversTab`, the existing `handleEdit` (lines 203-206) sets `editingDriver` and opens the Add Driver dialog. Replace with a separate edit dialog state:

Add state for the edit dialog (alongside existing state on line 184-186):
```typescript
const [editDialogOpen, setEditDialogOpen] = useState(false);
const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
```

Replace `handleEdit` (lines 203-206):
```typescript
const handleEdit = (driver: Driver) => {
  setEditingDriver(driver);
  setEditDialogOpen(true);
};
```

Remove the old `handleCloseDialog` and `handleSuccess` functions that were shared between create and edit (lines 208-216). Replace with create-specific ones:

```typescript
const handleCreateDialogClose = () => {
  setIsDialogOpen(false);
};

const handleCreateSuccess = async () => {
  setIsDialogOpen(false);
  await onRefresh();
};
```

**Step 3: Separate the Add Driver dialog from edit flow**

The Add Driver `<Dialog>` (lines 240-259) currently uses `editingDriver` state. Simplify it to create-only:

```tsx
<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
  <DialogTrigger asChild>
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Add Driver
    </Button>
  </DialogTrigger>
  <DialogContent className="max-h-[85vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Add Driver</DialogTitle>
    </DialogHeader>
    <DriverForm
      onSuccess={handleCreateSuccess}
      onCancel={handleCreateDialogClose}
    />
  </DialogContent>
</Dialog>
```

**Step 4: Add EditDriverDialog and pass externalSource**

After the `AlertDialog` for delete confirmation (after line 447), add:

```tsx
{editingDriver && (
  <EditDriverDialog
    open={editDialogOpen}
    onOpenChange={(open) => {
      setEditDialogOpen(open);
      if (!open) {
        setEditingDriver(null);
        onRefresh();
      }
    }}
    driver={editingDriver}
    externalSource={editingDriver.external_source ? getSourceLabel(editingDriver.external_source) : undefined}
  />
)}
```

**Step 5: Update table Actions to show Edit for ALL drivers (including TMS)**

In the actions dropdown (lines 392-418), replace the conditional edit/delete/read-only block:

```tsx
<DropdownMenuContent align="end">
  <DropdownMenuItem onClick={() => router.push(`/dispatcher/fleet/drivers/${driver.driver_id}`)}>
    <Eye className="h-4 w-4 mr-2" />
    View Profile
  </DropdownMenuItem>
  <DropdownMenuItem onClick={() => handleEdit(driver)}>
    <Pencil className="h-4 w-4 mr-2" />
    {driver.external_source ? 'Edit Details' : 'Edit'}
  </DropdownMenuItem>
  {!driver.external_source && (
    <DropdownMenuItem
      onClick={() => setDeleteConfirm(driver.driver_id)}
      className="text-red-600 dark:text-red-400"
    >
      <Trash2 className="h-4 w-4 mr-2" />
      Delete
    </DropdownMenuItem>
  )}
</DropdownMenuContent>
```

This removes the disabled "Read-only" menu item and replaces it with "Edit Details" for TMS drivers. Delete is still hidden for TMS drivers.

**Step 6: Verify TypeScript compiles**

Run: `cd /Users/ajay-admin/sally && npx turbo run type-check --filter=web`
Expected: No type errors

**Step 7: Commit**

```bash
git add apps/web/src/app/dispatcher/fleet/page.tsx
git commit -m "feat(drivers): unify edit to use EditDriverDialog from table and profile"
```

---

### Task 5: Clean up SALLY column — status badges only, move Invite to Actions

**Files:**
- Modify: `apps/web/src/app/dispatcher/fleet/page.tsx` — DriversTab table

**Step 1: Replace SALLY column content with badge-only display**

Replace the SALLY column cell (lines 361-383) with badges only — no invite button:

```tsx
<TableCell className="hidden md:table-cell">
  {driver.sally_access_status === 'ACTIVE' && (
    <Badge variant="default">Active</Badge>
  )}
  {driver.sally_access_status === 'INVITED' && (
    <Badge variant="muted">Invited</Badge>
  )}
  {driver.sally_access_status === 'DEACTIVATED' && (
    <Badge variant="destructive">Deactivated</Badge>
  )}
  {(!driver.sally_access_status || driver.sally_access_status === 'NO_ACCESS') && (
    <Badge variant="outline">No Access</Badge>
  )}
</TableCell>
```

**Step 2: Add "Invite to SALLY" to Actions dropdown**

In the actions `<DropdownMenuContent>`, add a new menu item for NO_ACCESS drivers (after the Edit item, before Delete):

```tsx
{(!driver.sally_access_status || driver.sally_access_status === 'NO_ACCESS') && onInviteClick && (
  <DropdownMenuItem onClick={() => onInviteClick(driver)}>
    <Mail className="h-4 w-4 mr-2" />
    Invite to SALLY
  </DropdownMenuItem>
)}
```

Add `Mail` to the lucide-react import at the top of the file (line 79).

**Step 3: Verify TypeScript compiles**

Run: `cd /Users/ajay-admin/sally && npx turbo run type-check --filter=web`
Expected: No type errors

**Step 4: Commit**

```bash
git add apps/web/src/app/dispatcher/fleet/page.tsx
git commit -m "feat(drivers): clean up SALLY column to badges-only, move Invite to actions"
```

---

### Task 6: Fix minor UX — Link for driver name, driver count, profile edit label

**Files:**
- Modify: `apps/web/src/app/dispatcher/fleet/page.tsx`
- Modify: `apps/web/src/app/dispatcher/fleet/drivers/[driverId]/page.tsx`

**Step 1: Replace `<button>` with `<Link>` for driver name**

In the driver table row (lines 319-325), replace the `<button>` with a Next.js `<Link>`:

```tsx
<Link
  href={`/dispatcher/fleet/drivers/${driver.driver_id}`}
  className="font-medium text-foreground hover:underline"
>
  {driver.name}
</Link>
```

The `Link` import already exists at the top of the file (line 4).

**Step 2: Add driver count to CardTitle**

Replace `<CardTitle>Drivers</CardTitle>` (line 239) with:

```tsx
<CardTitle>Drivers{drivers.length > 0 ? ` (${drivers.length})` : ''}</CardTitle>
```

**Step 3: Fix profile page — Edit button label for TMS drivers**

In `[driverId]/page.tsx`, replace the Edit button (line 119-121):

```tsx
<Button onClick={() => setEditOpen(true)}>
  <Pencil className="h-4 w-4 mr-2" />
  {driver.external_source ? 'Edit Details' : 'Edit'}
</Button>
```

**Step 4: Pass externalSource to EditDriverDialog on profile page**

Update the `EditDriverDialog` usage (lines 401-405):

```tsx
<EditDriverDialog
  open={editOpen}
  onOpenChange={setEditOpen}
  driver={driver}
  externalSource={driver.external_source ? driver.external_source : undefined}
/>
```

Note: The profile page passes the raw `external_source` value. We could use `getSourceLabel()` here but that function is in fleet/page.tsx. For consistency, we can add a simple inline label or move the function to a shared utility. Simplest approach: just pass the raw source — the `EditDriverDialog` banner already displays it as-is.

**Step 5: Verify TypeScript compiles**

Run: `cd /Users/ajay-admin/sally && npx turbo run type-check --filter=web`
Expected: No type errors

**Step 6: Commit**

```bash
git add apps/web/src/app/dispatcher/fleet/page.tsx apps/web/src/app/dispatcher/fleet/drivers/\[driverId\]/page.tsx
git commit -m "fix(drivers): use Link for driver name, add count, fix TMS edit label on profile"
```

---

### Task 7: Visual verification and final cleanup

**Step 1: Run dev server**

Run: `cd /Users/ajay-admin/sally && npx turbo run dev --filter=web`

**Step 2: Manual checks**

Verify in browser:
1. **Add Driver dialog**: Click "Add Driver" — see required fields + "More Details" collapsible. Expand it — see endorsements, dates, home terminal, emergency contact, notes
2. **SALLY column**: All drivers show badges only (Active, Invited, No Access) — no "Invite" button in column
3. **Actions dropdown**: Shows "View Profile", "Edit" (or "Edit Details" for TMS), "Invite to SALLY" (for NO_ACCESS), "Delete" (non-TMS only)
4. **Edit from table**: Click Edit on a non-TMS driver — Tier 2 EditDriverDialog opens with all fields editable
5. **Edit from table (TMS)**: Click "Edit Details" on TMS driver — same dialog but name/phone/email/CDL/license locked with opacity + lock icon + blue banner
6. **Edit from profile**: Same behavior as table edit
7. **Driver name**: Right-click driver name — "Open in new tab" appears (Link behavior)
8. **Driver count**: Card header shows "Drivers (N)"
9. **Dark mode**: Toggle theme — verify all new elements have proper dark variants
10. **Responsive**: Check at 375px, 768px, 1440px

**Step 3: Verify TypeScript compiles (final)**

Run: `cd /Users/ajay-admin/sally && npx turbo run type-check --filter=web`
Expected: Clean pass

**Step 4: Final commit (if any cleanup needed)**

```bash
git add -A
git commit -m "chore(drivers): driver management UX fixes cleanup"
```
