# Super Admin Tenant Detail Editing - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow super admins to edit tenant details (company name, subdomain, DOT number, fleet size, owner contact info) from the tenant details dialog, for any tenant status.

**Architecture:** Add a PATCH endpoint to the existing tenants controller that updates both tenant and owner user records in a transaction. Modify the existing TenantDetailsDialog to support read/edit mode toggle on the Overview tab. Pass action callbacks (approve/reject/suspend/reactivate) into the details dialog from the parent so actions can be taken from within the dialog.

**Tech Stack:** NestJS (backend), class-validator DTO, Prisma transactions, React Query mutations, Shadcn UI components, Zod (frontend validation)

---

### Task 1: Create UpdateTenantDto

**Files:**
- Create: `apps/backend/src/domains/platform/tenants/dto/update-tenant.dto.ts`

**Step 1: Create the DTO file**

```typescript
import { IsString, IsEmail, IsOptional, IsEnum, Matches, MinLength, MaxLength } from 'class-validator';
import { FleetSize } from '@prisma/client';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  companyName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Subdomain must contain only lowercase letters, numbers, and hyphens',
  })
  subdomain?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,8}$/, { message: 'DOT number must be 1-8 digits' })
  dotNumber?: string;

  @IsOptional()
  @IsEnum(FleetSize)
  fleetSize?: FleetSize;

  @IsOptional()
  @IsString()
  @MinLength(1)
  ownerFirstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  ownerLastName?: string;

  @IsOptional()
  @IsEmail()
  ownerEmail?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  ownerPhone?: string;
}
```

**Step 2: Commit**

```bash
git add apps/backend/src/domains/platform/tenants/dto/update-tenant.dto.ts
git commit -m "feat: add UpdateTenantDto for super admin tenant editing"
```

---

### Task 2: Add updateTenant Service Method

**Files:**
- Modify: `apps/backend/src/domains/platform/tenants/tenants.service.ts` (add method after `reactivateTenant` at ~line 373)

**Step 1: Add the updateTenant method**

Add this method to `TenantsService` after the `reactivateTenant` method (before `getTenantDetails`):

```typescript
/**
 * Update tenant details (SUPER_ADMIN only)
 */
async updateTenant(tenantId: string, dto: UpdateTenantDto) {
  const tenant = await this.prisma.tenant.findUnique({
    where: { tenantId },
    include: { users: { where: { role: 'OWNER' } } },
  });

  if (!tenant) {
    throw new BadRequestException('Tenant not found');
  }

  // If subdomain is being changed, check availability
  if (dto.subdomain && dto.subdomain !== tenant.subdomain) {
    const isAvailable = await this.checkSubdomainAvailability(dto.subdomain);
    if (!isAvailable) {
      throw new ConflictException('Subdomain is already taken or reserved');
    }
  }

  // Build tenant update data (only include provided fields)
  const tenantUpdate: any = {};
  if (dto.companyName !== undefined) tenantUpdate.companyName = dto.companyName;
  if (dto.subdomain !== undefined) tenantUpdate.subdomain = dto.subdomain.toLowerCase();
  if (dto.dotNumber !== undefined) tenantUpdate.dotNumber = dto.dotNumber;
  if (dto.fleetSize !== undefined) tenantUpdate.fleetSize = dto.fleetSize;

  // Build owner user update data
  const ownerUpdate: any = {};
  if (dto.ownerFirstName !== undefined) ownerUpdate.firstName = dto.ownerFirstName;
  if (dto.ownerLastName !== undefined) ownerUpdate.lastName = dto.ownerLastName;
  if (dto.ownerEmail !== undefined) {
    ownerUpdate.email = dto.ownerEmail;
    tenantUpdate.contactEmail = dto.ownerEmail;
  }
  if (dto.ownerPhone !== undefined) {
    tenantUpdate.contactPhone = dto.ownerPhone;
  }

  const result = await this.prisma.$transaction(async (tx) => {
    const updatedTenant = await tx.tenant.update({
      where: { tenantId },
      data: tenantUpdate,
    });

    // Update owner user if any owner fields provided
    const ownerUser = tenant.users.find((u) => u.role === 'OWNER');
    if (ownerUser && Object.keys(ownerUpdate).length > 0) {
      await tx.user.update({
        where: { id: ownerUser.id },
        data: ownerUpdate,
      });
    }

    return updatedTenant;
  });

  return result;
}
```

Also add the import for `UpdateTenantDto` at the top of the file:

```typescript
import { UpdateTenantDto } from './dto/update-tenant.dto';
```

**Step 2: Commit**

```bash
git add apps/backend/src/domains/platform/tenants/tenants.service.ts
git commit -m "feat: add updateTenant service method with transaction"
```

---

### Task 3: Add PATCH Endpoint to Controller

**Files:**
- Modify: `apps/backend/src/domains/platform/tenants/tenants.controller.ts`

**Step 1: Add the PATCH endpoint**

Add import for `Patch` from `@nestjs/common` (line 1) and `UpdateTenantDto` (new import). Then add the endpoint after the `reactivate` endpoint (~line 73):

Add `Patch` to the existing import on line 1:
```typescript
import { Controller, Post, Get, Body, Param, Query, Patch } from '@nestjs/common';
```

Add import:
```typescript
import { UpdateTenantDto } from './dto/update-tenant.dto';
```

Add endpoint before the `getTenantDetails` method:
```typescript
@Roles(UserRole.SUPER_ADMIN)
@Patch(':tenantId')
async updateTenant(
  @Param('tenantId') tenantId: string,
  @Body() dto: UpdateTenantDto,
) {
  return this.tenantsService.updateTenant(tenantId, dto);
}
```

**Step 2: Commit**

```bash
git add apps/backend/src/domains/platform/tenants/tenants.controller.ts
git commit -m "feat: add PATCH /tenants/:tenantId endpoint for super admin editing"
```

---

### Task 4: Update TenantDetailsDialog with Edit Mode

**Files:**
- Modify: `apps/web/src/features/platform/admin/components/tenant-details-dialog.tsx`

**Step 1: Rewrite the TenantDetailsDialog**

This is a significant rewrite of the component. The key changes:

1. Add `isEditing` state and form state for all editable fields
2. Add new props: `onApprove`, `onReject`, `onSuspend`, `onReactivate`, `tenantStatus`
3. Overview tab fields become `<Input>` / `<Select>` in edit mode
4. Add Save/Cancel buttons in edit mode
5. Add action buttons (Approve/Reject/etc.) in dialog footer based on status
6. Add `useMutation` for the PATCH endpoint

New props interface:
```typescript
interface TenantDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
  tenantStatus?: string;
  onApprove?: (tenantId: string) => void;
  onReject?: (tenantId: string) => void;
  onSuspend?: (tenantId: string) => void;
  onReactivate?: (tenantId: string) => void;
}
```

Edit mode form fields (pre-populated from fetched data):
- `companyName` — `<Input>`
- `subdomain` — `<Input>` with `.sally.com` suffix
- `dotNumber` — `<Input>` maxLength={8}
- `fleetSize` — `<Select>` with 5 fleet size options
- Owner first name — `<Input>`
- Owner last name — `<Input>`
- Owner email — `<Input type="email">`
- Owner phone — `<Input type="tel">`

The Overview tab structure:
- **Read mode**: Current `<dl>` display with an "Edit" button (pencil icon) in the section header
- **Edit mode**: Same layout but `<dd>` elements replaced with form inputs, plus Save/Cancel bar at the bottom

Dialog footer (always visible, below tabs):
- PENDING_APPROVAL: "Approve" button + "Reject" button
- ACTIVE: "Suspend" button
- SUSPENDED: "Reactivate" button
- REJECTED: No action buttons

**Step 2: Commit**

```bash
git add apps/web/src/features/platform/admin/components/tenant-details-dialog.tsx
git commit -m "feat: add edit mode to TenantDetailsDialog with save/cancel and action buttons"
```

---

### Task 5: Wire Up TenantDetailsDialog Actions from Parent

**Files:**
- Modify: `apps/web/src/features/platform/admin/components/tenant-management-tabs.tsx`

**Step 1: Pass action callbacks and status to TenantDetailsDialog**

Update the `TenantDetailsDialog` usage at ~line 335-342 to pass the new props:

```tsx
{detailsDialog.tenant && (
  <TenantDetailsDialog
    open={detailsDialog.open}
    onOpenChange={(open) => setDetailsDialog({ open })}
    tenantId={detailsDialog.tenant.tenantId}
    tenantName={detailsDialog.tenant.companyName}
    tenantStatus={detailsDialog.tenant.status}
    onApprove={(tenantId) => {
      if (confirm(`Approve ${detailsDialog.tenant!.companyName}?`)) {
        approveMutation.mutate(tenantId);
        setDetailsDialog({ open: false });
      }
    }}
    onReject={(tenantId) => {
      setDetailsDialog({ open: false });
      // Find the tenant and open reject dialog
      const tenant = detailsDialog.tenant!;
      setRejectDialog({ open: true, tenant });
    }}
    onSuspend={(tenantId) => {
      setDetailsDialog({ open: false });
      const tenant = detailsDialog.tenant!;
      setSuspendDialog({ open: true, tenant });
    }}
    onReactivate={(tenantId) => {
      reactivateMutation.mutate(tenantId);
      setDetailsDialog({ open: false });
    }}
  />
)}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/platform/admin/components/tenant-management-tabs.tsx
git commit -m "feat: wire up action callbacks to TenantDetailsDialog"
```

---

### Task 6: Manual Testing & Verification

**Step 1: Verify backend endpoint**

Test the PATCH endpoint works:
```bash
# From the backend directory, run the app and test with curl or via the frontend
cd apps/backend && npm run start:dev
```

**Step 2: Verify frontend edit mode**

1. Log in as super admin
2. Go to tenant management
3. Click "Details" on any tenant (pending, active, suspended, rejected)
4. Click "Edit" button — fields should become editable
5. Change a field (e.g., DOT number), click Save — should update
6. Click Cancel — should revert to read mode without saving
7. For pending tenant: verify Approve/Reject buttons appear in dialog footer
8. For active tenant: verify Suspend button appears
9. Test in both light and dark themes
10. Test on mobile viewport (375px)

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during manual testing"
```
