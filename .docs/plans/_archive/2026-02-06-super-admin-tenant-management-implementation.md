# Super Admin Tenant Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement comprehensive multi-tenant admin features including tenant lifecycle management (suspend/reactivate), tenant details view, super admin settings page, and fixed settings navigation.

**Architecture:** Three-layer implementation: Database migrations (Prisma), Backend services (NestJS with transaction support), Frontend components (Next.js with Shadcn UI). Uses TDD approach with tests before implementation.

**Tech Stack:** PostgreSQL, Prisma ORM, NestJS, Next.js 15 App Router, Shadcn UI, React Query, Zustand

---

## Phase 1: Database Schema & Migrations

### Task 1: Add Suspension Tracking to Tenants Table

**Files:**
- Create: `apps/backend/prisma/migrations/20260206_add_tenant_suspension_tracking/migration.sql`
- Modify: `apps/backend/prisma/schema.prisma`

**Step 1: Update Prisma schema**

Add suspension and reactivation tracking fields to the `Tenant` model in `apps/backend/prisma/schema.prisma` after line 60 (after `rejectionReason`):

```prisma
  // Suspension tracking
  suspendedAt           DateTime?    @map("suspended_at") @db.Timestamptz
  suspendedBy           String?      @map("suspended_by") @db.VarChar(100)
  suspensionReason      String?      @map("suspension_reason")

  // Reactivation tracking
  reactivatedAt         DateTime?    @map("reactivated_at") @db.Timestamptz
  reactivatedBy         String?      @map("reactivated_by") @db.VarChar(100)
```

**Step 2: Create migration file**

Create `apps/backend/prisma/migrations/20260206_add_tenant_suspension_tracking/migration.sql`:

```sql
-- Add suspension and reactivation tracking columns to tenants table
ALTER TABLE tenants
ADD COLUMN suspended_at TIMESTAMPTZ,
ADD COLUMN suspended_by VARCHAR(100),
ADD COLUMN suspension_reason TEXT,
ADD COLUMN reactivated_at TIMESTAMPTZ,
ADD COLUMN reactivated_by VARCHAR(100);

-- Add indexes for performance
CREATE INDEX idx_tenants_suspended_at ON tenants(suspended_at);

-- Add comments for documentation
COMMENT ON COLUMN tenants.suspended_at IS 'Timestamp when tenant was suspended';
COMMENT ON COLUMN tenants.suspended_by IS 'Email of super admin who suspended the tenant';
COMMENT ON COLUMN tenants.suspension_reason IS 'Reason for tenant suspension';
COMMENT ON COLUMN tenants.reactivated_at IS 'Timestamp when tenant was reactivated';
COMMENT ON COLUMN tenants.reactivated_by IS 'Email of super admin who reactivated the tenant';
```

**Step 3: Run migration**

Run from `apps/backend`:
```bash
npx prisma migrate dev --name add_tenant_suspension_tracking
```

Expected: Migration applied successfully, Prisma Client regenerated

**Step 4: Verify migration**

Run: `npx prisma studio`
Expected: Open Prisma Studio, navigate to tenants table, verify new columns exist

**Step 5: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/
git commit -m "feat(db): add suspension tracking to tenants table

- Add suspendedAt, suspendedBy, suspensionReason columns
- Add reactivatedAt, reactivatedBy columns
- Add index on suspendedAt for performance"
```

---

### Task 2: Create Super Admin Preferences Table

**Files:**
- Create: `apps/backend/prisma/migrations/20260206_create_super_admin_preferences/migration.sql`
- Modify: `apps/backend/prisma/schema.prisma`

**Step 1: Add SuperAdminPreferences model to schema**

Add to `apps/backend/prisma/schema.prisma` after the `User` model (around line 150):

```prisma
model SuperAdminPreferences {
  id                      Int      @id @default(autoincrement())
  userId                  Int      @unique @map("user_id")
  user                    User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  notifyNewTenants        Boolean  @default(true) @map("notify_new_tenants")
  notifyStatusChanges     Boolean  @default(true) @map("notify_status_changes")
  notificationFrequency   String   @default("immediate") @map("notification_frequency") @db.VarChar(20)

  createdAt               DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt               DateTime @updatedAt @map("updated_at") @db.Timestamptz

  @@index([userId])
  @@map("super_admin_preferences")
}
```

**Step 2: Add relation to User model**

In the `User` model (around line 133), add the relation:

```prisma
  superAdminPreferences SuperAdminPreferences?
```

**Step 3: Create migration file**

Create `apps/backend/prisma/migrations/20260206_create_super_admin_preferences/migration.sql`:

```sql
-- Create super_admin_preferences table
CREATE TABLE super_admin_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL,
  notify_new_tenants BOOLEAN DEFAULT TRUE,
  notify_status_changes BOOLEAN DEFAULT TRUE,
  notification_frequency VARCHAR(20) DEFAULT 'immediate',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_super_admin_preferences_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- Add indexes
CREATE INDEX idx_super_admin_preferences_user_id ON super_admin_preferences(user_id);

-- Add check constraint for notification frequency
ALTER TABLE super_admin_preferences
ADD CONSTRAINT chk_notification_frequency
CHECK (notification_frequency IN ('immediate', 'daily'));

-- Add comments
COMMENT ON TABLE super_admin_preferences IS 'Stores notification preferences for super admin users';
COMMENT ON COLUMN super_admin_preferences.notify_new_tenants IS 'Email notification for new tenant registrations';
COMMENT ON COLUMN super_admin_preferences.notify_status_changes IS 'Email notification for tenant status changes';
COMMENT ON COLUMN super_admin_preferences.notification_frequency IS 'Email frequency: immediate or daily digest';
```

**Step 4: Run migration**

Run: `npx prisma migrate dev --name create_super_admin_preferences`
Expected: Migration applied successfully

**Step 5: Generate Prisma client**

Run: `npx prisma generate`
Expected: Prisma Client regenerated with new types

**Step 6: Commit**

```bash
git add apps/backend/prisma/
git commit -m "feat(db): create super admin preferences table

- Add SuperAdminPreferences model
- Add notification preferences fields
- Add relation to User model
- Add check constraint for notification frequency"
```

---

## Phase 2: Backend - DTOs and Validation

### Task 3: Create Suspend Tenant DTO

**Files:**
- Create: `apps/backend/src/domains/platform/tenants/dto/suspend-tenant.dto.ts`

**Step 1: Write the DTO file**

Create `apps/backend/src/domains/platform/tenants/dto/suspend-tenant.dto.ts`:

```typescript
import { IsString, MinLength } from 'class-validator';

export class SuspendTenantDto {
  @IsString()
  @MinLength(10, { message: 'Suspension reason must be at least 10 characters' })
  reason: string;
}
```

**Step 2: Commit**

```bash
git add apps/backend/src/domains/platform/tenants/dto/suspend-tenant.dto.ts
git commit -m "feat(backend): add SuspendTenantDto with validation

- Require reason field
- Minimum 10 characters for suspension reason"
```

---

### Task 4: Create Update Preferences DTO

**Files:**
- Create: `apps/backend/src/domains/platform/preferences/dto/update-preferences.dto.ts`

**Step 1: Create preferences directory**

Run: `mkdir -p apps/backend/src/domains/platform/preferences/dto`

**Step 2: Write the DTO file**

Create `apps/backend/src/domains/platform/preferences/dto/update-preferences.dto.ts`:

```typescript
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

enum NotificationFrequency {
  IMMEDIATE = 'immediate',
  DAILY = 'daily',
}

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  notifyNewTenants?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyStatusChanges?: boolean;

  @IsOptional()
  @IsEnum(NotificationFrequency)
  notificationFrequency?: NotificationFrequency;
}
```

**Step 3: Commit**

```bash
git add apps/backend/src/domains/platform/preferences/
git commit -m "feat(backend): add UpdatePreferencesDto

- Add optional notification preference fields
- Add enum validation for notification frequency"
```

---

## Phase 3: Backend - Tenants Service Enhancements

### Task 5: Add Suspend Tenant Method

**Files:**
- Modify: `apps/backend/src/domains/platform/tenants/tenants.service.ts`
- Test: Manual testing (unit tests can be added later)

**Step 1: Add suspendTenant method**

Add to `apps/backend/src/domains/platform/tenants/tenants.service.ts` after the `rejectTenant` method (around line 243):

```typescript
/**
 * Suspend tenant
 */
async suspendTenant(tenantId: string, reason: string, suspendedBy: string) {
  const tenant = await this.prisma.tenant.findUnique({
    where: { tenantId },
    include: { users: { where: { role: 'OWNER' } } },
  });

  if (!tenant) {
    throw new BadRequestException('Tenant not found');
  }

  if (tenant.status !== 'ACTIVE') {
    throw new BadRequestException('Can only suspend ACTIVE tenants');
  }

  if (!reason || reason.trim().length < 10) {
    throw new BadRequestException(
      'Suspension reason must be at least 10 characters',
    );
  }

  // Update tenant and deactivate all users in transaction
  const result = await this.prisma.$transaction(async (tx) => {
    const updatedTenant = await tx.tenant.update({
      where: { tenantId },
      data: {
        status: 'SUSPENDED',
        isActive: false,
        suspendedAt: new Date(),
        suspendedBy,
        suspensionReason: reason,
      },
    });

    // Deactivate all tenant users (logs them out)
    await tx.user.updateMany({
      where: { tenantId: tenant.id },
      data: { isActive: false },
    });

    return updatedTenant;
  });

  // Send suspension notification email
  const ownerUser = tenant.users.find((u) => u.role === 'OWNER');
  if (ownerUser) {
    await this.notificationService.sendTenantSuspensionNotification(
      tenantId,
      ownerUser.email,
      ownerUser.firstName,
      result.companyName,
      reason,
    );
  }

  return result;
}
```

**Step 2: Update imports**

Ensure `BadRequestException` is imported at the top:

```typescript
import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
```

**Step 3: Commit**

```bash
git add apps/backend/src/domains/platform/tenants/tenants.service.ts
git commit -m "feat(backend): add suspendTenant method

- Validate tenant exists and is ACTIVE
- Validate suspension reason length
- Update tenant status to SUSPENDED in transaction
- Deactivate all tenant users
- Send email notification"
```

---

### Task 6: Add Reactivate Tenant Method

**Files:**
- Modify: `apps/backend/src/domains/platform/tenants/tenants.service.ts`

**Step 1: Add reactivateTenant method**

Add after the `suspendTenant` method:

```typescript
/**
 * Reactivate tenant
 */
async reactivateTenant(tenantId: string, reactivatedBy: string) {
  const tenant = await this.prisma.tenant.findUnique({
    where: { tenantId },
    include: { users: { where: { role: 'OWNER' } } },
  });

  if (!tenant) {
    throw new BadRequestException('Tenant not found');
  }

  if (tenant.status !== 'SUSPENDED') {
    throw new BadRequestException('Can only reactivate SUSPENDED tenants');
  }

  // Update tenant and reactivate all users in transaction
  const result = await this.prisma.$transaction(async (tx) => {
    const updatedTenant = await tx.tenant.update({
      where: { tenantId },
      data: {
        status: 'ACTIVE',
        isActive: true,
        reactivatedAt: new Date(),
        reactivatedBy,
      },
    });

    // Reactivate all tenant users
    await tx.user.updateMany({
      where: { tenantId: tenant.id },
      data: { isActive: true },
    });

    return updatedTenant;
  });

  // Send reactivation notification email
  const ownerUser = tenant.users.find((u) => u.role === 'OWNER');
  if (ownerUser) {
    await this.notificationService.sendTenantReactivationNotification(
      tenantId,
      ownerUser.email,
      ownerUser.firstName,
      result.companyName,
    );
  }

  return result;
}
```

**Step 2: Commit**

```bash
git add apps/backend/src/domains/platform/tenants/tenants.service.ts
git commit -m "feat(backend): add reactivateTenant method

- Validate tenant exists and is SUSPENDED
- Update tenant status to ACTIVE in transaction
- Reactivate all tenant users
- Send email notification"
```

---

### Task 7: Add Get Tenant Details Method

**Files:**
- Modify: `apps/backend/src/domains/platform/tenants/tenants.service.ts`

**Step 1: Add getTenantDetails method**

Add after the `reactivateTenant` method:

```typescript
/**
 * Get tenant details with users and metrics
 */
async getTenantDetails(tenantId: string) {
  const tenant = await this.prisma.tenant.findUnique({
    where: { tenantId },
    include: {
      users: {
        select: {
          userId: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
        },
        orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
      },
      _count: {
        select: {
          users: true,
          drivers: true,
          vehicles: true,
          routePlans: true,
        },
      },
    },
  });

  if (!tenant) {
    throw new BadRequestException('Tenant not found');
  }

  return {
    tenant: {
      tenantId: tenant.tenantId,
      companyName: tenant.companyName,
      subdomain: tenant.subdomain,
      status: tenant.status,
      dotNumber: tenant.dotNumber,
      fleetSize: tenant.fleetSize,
      contactEmail: tenant.contactEmail,
      contactPhone: tenant.contactPhone,
      createdAt: tenant.createdAt.toISOString(),
      approvedAt: tenant.approvedAt?.toISOString(),
      approvedBy: tenant.approvedBy,
      rejectedAt: tenant.rejectedAt?.toISOString(),
      rejectionReason: tenant.rejectionReason,
      suspendedAt: tenant.suspendedAt?.toISOString(),
      suspendedBy: tenant.suspendedBy,
      suspensionReason: tenant.suspensionReason,
      reactivatedAt: tenant.reactivatedAt?.toISOString(),
      reactivatedBy: tenant.reactivatedBy,
    },
    users: tenant.users,
    metrics: {
      totalUsers: tenant._count.users,
      totalDrivers: tenant._count.drivers,
      totalVehicles: tenant._count.vehicles,
      totalRoutePlans: tenant._count.routePlans,
    },
  };
}
```

**Step 2: Commit**

```bash
git add apps/backend/src/domains/platform/tenants/tenants.service.ts
git commit -m "feat(backend): add getTenantDetails method

- Fetch tenant with related users and counts
- Return formatted tenant details, users list, and metrics
- Sort users by role and first name"
```

---

### Task 8: Add Notification Service Methods

**Files:**
- Modify: `apps/backend/src/infrastructure/notification/notification.service.ts`

**Step 1: Read current notification service**

Run: `cat apps/backend/src/infrastructure/notification/notification.service.ts | head -50`

**Step 2: Add sendTenantSuspensionNotification method**

Add after existing notification methods (find a good spot near other tenant notifications):

```typescript
/**
 * Send tenant suspension notification
 */
async sendTenantSuspensionNotification(
  tenantId: string,
  email: string,
  firstName: string,
  companyName: string,
  reason: string,
): Promise<void> {
  console.log(
    `[Notification] Sending tenant suspension notification to ${email}`,
  );
  console.log(`Tenant: ${companyName} (${tenantId})`);
  console.log(`Reason: ${reason}`);
  // TODO: Implement actual email sending via SendGrid/AWS SES
  // For now, just log the notification
}
```

**Step 3: Add sendTenantReactivationNotification method**

Add after the suspension notification method:

```typescript
/**
 * Send tenant reactivation notification
 */
async sendTenantReactivationNotification(
  tenantId: string,
  email: string,
  firstName: string,
  companyName: string,
): Promise<void> {
  console.log(
    `[Notification] Sending tenant reactivation notification to ${email}`,
  );
  console.log(`Tenant: ${companyName} (${tenantId})`);
  console.log(`Your account has been reactivated and is now active.`);
  // TODO: Implement actual email sending via SendGrid/AWS SES
  // For now, just log the notification
}
```

**Step 4: Commit**

```bash
git add apps/backend/src/infrastructure/notification/notification.service.ts
git commit -m "feat(backend): add suspension/reactivation notification methods

- Add sendTenantSuspensionNotification
- Add sendTenantReactivationNotification
- Log notifications for now (TODO: implement email sending)"
```

---

## Phase 4: Backend - Tenants Controller Enhancements

### Task 9: Add Suspend Endpoint

**Files:**
- Modify: `apps/backend/src/domains/platform/tenants/tenants.controller.ts`

**Step 1: Add suspend endpoint**

Add after the `rejectTenant` endpoint (around line 49):

```typescript
@Roles(UserRole.SUPER_ADMIN)
@Post(':tenantId/suspend')
async suspendTenant(
  @Param('tenantId') tenantId: string,
  @Body() dto: SuspendTenantDto,
  @CurrentUser() user: any,
) {
  return this.tenantsService.suspendTenant(
    tenantId,
    dto.reason,
    user.email,
  );
}
```

**Step 2: Add import for SuspendTenantDto**

Add to imports at top:

```typescript
import { SuspendTenantDto } from './dto/suspend-tenant.dto';
```

**Step 3: Commit**

```bash
git add apps/backend/src/domains/platform/tenants/tenants.controller.ts
git commit -m "feat(backend): add suspend tenant endpoint

- POST /tenants/:tenantId/suspend
- Requires SUPER_ADMIN role
- Validates suspension reason via DTO"
```

---

### Task 10: Add Reactivate Endpoint

**Files:**
- Modify: `apps/backend/src/domains/platform/tenants/tenants.controller.ts`

**Step 1: Add reactivate endpoint**

Add after the `suspendTenant` endpoint:

```typescript
@Roles(UserRole.SUPER_ADMIN)
@Post(':tenantId/reactivate')
async reactivateTenant(
  @Param('tenantId') tenantId: string,
  @CurrentUser() user: any,
) {
  return this.tenantsService.reactivateTenant(tenantId, user.email);
}
```

**Step 2: Commit**

```bash
git add apps/backend/src/domains/platform/tenants/tenants.controller.ts
git commit -m "feat(backend): add reactivate tenant endpoint

- POST /tenants/:tenantId/reactivate
- Requires SUPER_ADMIN role
- No request body needed"
```

---

### Task 11: Add Get Tenant Details Endpoint

**Files:**
- Modify: `apps/backend/src/domains/platform/tenants/tenants.controller.ts`

**Step 1: Add details endpoint**

Add after the `reactivateTenant` endpoint:

```typescript
@Roles(UserRole.SUPER_ADMIN)
@Get(':tenantId/details')
async getTenantDetails(@Param('tenantId') tenantId: string) {
  return this.tenantsService.getTenantDetails(tenantId);
}
```

**Step 2: Commit**

```bash
git add apps/backend/src/domains/platform/tenants/tenants.controller.ts
git commit -m "feat(backend): add get tenant details endpoint

- GET /tenants/:tenantId/details
- Requires SUPER_ADMIN role
- Returns tenant info, users list, and metrics"
```

---

## Phase 5: Backend - Preferences Module

### Task 12: Create Preferences Service

**Files:**
- Create: `apps/backend/src/domains/platform/preferences/preferences.service.ts`

**Step 1: Create preferences service file**

Create `apps/backend/src/domains/platform/preferences/preferences.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class PreferencesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get super admin preferences
   * Creates default preferences if they don't exist
   */
  async getPreferences(userId: number) {
    let preferences = await this.prisma.superAdminPreferences.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Create default preferences
      preferences = await this.prisma.superAdminPreferences.create({
        data: {
          userId,
          notifyNewTenants: true,
          notifyStatusChanges: true,
          notificationFrequency: 'immediate',
        },
      });
    }

    return {
      notifyNewTenants: preferences.notifyNewTenants,
      notifyStatusChanges: preferences.notifyStatusChanges,
      notificationFrequency: preferences.notificationFrequency,
    };
  }

  /**
   * Update super admin preferences
   */
  async updatePreferences(userId: number, dto: UpdatePreferencesDto) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Upsert preferences
    const preferences = await this.prisma.superAdminPreferences.upsert({
      where: { userId },
      create: {
        userId,
        notifyNewTenants: dto.notifyNewTenants ?? true,
        notifyStatusChanges: dto.notifyStatusChanges ?? true,
        notificationFrequency: dto.notificationFrequency ?? 'immediate',
      },
      update: {
        ...(dto.notifyNewTenants !== undefined && {
          notifyNewTenants: dto.notifyNewTenants,
        }),
        ...(dto.notifyStatusChanges !== undefined && {
          notifyStatusChanges: dto.notifyStatusChanges,
        }),
        ...(dto.notificationFrequency !== undefined && {
          notificationFrequency: dto.notificationFrequency,
        }),
      },
    });

    return {
      notifyNewTenants: preferences.notifyNewTenants,
      notifyStatusChanges: preferences.notifyStatusChanges,
      notificationFrequency: preferences.notificationFrequency,
    };
  }
}
```

**Step 2: Commit**

```bash
git add apps/backend/src/domains/platform/preferences/preferences.service.ts
git commit -m "feat(backend): create preferences service

- Add getPreferences method (creates defaults if missing)
- Add updatePreferences method (upsert pattern)
- Return only relevant fields"
```

---

### Task 13: Create Preferences Controller

**Files:**
- Create: `apps/backend/src/domains/platform/preferences/preferences.controller.ts`

**Step 1: Create preferences controller file**

Create `apps/backend/src/domains/platform/preferences/preferences.controller.ts`:

```typescript
import { Controller, Get, Put, Body } from '@nestjs/common';
import { PreferencesService } from './preferences.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('users/me/preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Roles(UserRole.SUPER_ADMIN)
  @Get()
  async getPreferences(@CurrentUser() user: any) {
    return this.preferencesService.getPreferences(user.id);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Put()
  async updatePreferences(
    @CurrentUser() user: any,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.preferencesService.updatePreferences(user.id, dto);
  }
}
```

**Step 2: Commit**

```bash
git add apps/backend/src/domains/platform/preferences/preferences.controller.ts
git commit -m "feat(backend): create preferences controller

- GET /users/me/preferences
- PUT /users/me/preferences
- Requires SUPER_ADMIN role"
```

---

### Task 14: Create Preferences Module

**Files:**
- Create: `apps/backend/src/domains/platform/preferences/preferences.module.ts`
- Modify: `apps/backend/src/app.module.ts`

**Step 1: Create preferences module file**

Create `apps/backend/src/domains/platform/preferences/preferences.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PreferencesController } from './preferences.controller';
import { PreferencesService } from './preferences.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PreferencesController],
  providers: [PreferencesService],
  exports: [PreferencesService],
})
export class PreferencesModule {}
```

**Step 2: Register module in app.module.ts**

Add to imports array in `apps/backend/src/app.module.ts`:

```typescript
import { PreferencesModule } from './domains/platform/preferences/preferences.module';

// In @Module imports array:
PreferencesModule,
```

**Step 3: Commit**

```bash
git add apps/backend/src/domains/platform/preferences/preferences.module.ts apps/backend/src/app.module.ts
git commit -m "feat(backend): create and register preferences module

- Create PreferencesModule
- Register in AppModule
- Export PreferencesService for potential reuse"
```

---

### Task 15: Test Backend API Endpoints

**Files:**
- Manual testing via curl or API client

**Step 1: Start backend server**

Run from `apps/backend`: `npm run start:dev`
Expected: Server starts on port 8000

**Step 2: Test suspend endpoint**

```bash
# Get super admin token first (login as super admin)
# Replace <token> with actual JWT token

curl -X POST http://localhost:8000/api/v1/tenants/tenant_xxx/suspend \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Testing suspension feature with valid reason"}'
```

Expected: 200 OK with updated tenant object (status: SUSPENDED)

**Step 3: Test reactivate endpoint**

```bash
curl -X POST http://localhost:8000/api/v1/tenants/tenant_xxx/reactivate \
  -H "Authorization: Bearer <token>"
```

Expected: 200 OK with updated tenant object (status: ACTIVE)

**Step 4: Test details endpoint**

```bash
curl -X GET http://localhost:8000/api/v1/tenants/tenant_xxx/details \
  -H "Authorization: Bearer <token>"
```

Expected: 200 OK with tenant details, users array, and metrics object

**Step 5: Test preferences endpoints**

```bash
# Get preferences
curl -X GET http://localhost:8000/api/v1/users/me/preferences \
  -H "Authorization: Bearer <token>"

# Update preferences
curl -X PUT http://localhost:8000/api/v1/users/me/preferences \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"notifyNewTenants": false, "notificationFrequency": "daily"}'
```

Expected: 200 OK with preferences object

**Step 6: Document test results**

Create a note file documenting which endpoints work. No commit needed yet.

---

## Phase 6: Frontend - Reusable Components

### Task 16: Create TenantTable Component

**Files:**
- Create: `apps/web/src/features/platform/admin/components/tenant-table.tsx`

**Step 1: Create tenant-table component**

Create `apps/web/src/features/platform/admin/components/tenant-table.tsx`:

```typescript
'use client';

import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface Tenant {
  id: number;
  tenantId: string;
  companyName: string;
  subdomain: string;
  dotNumber: string;
  fleetSize: string;
  contactEmail: string;
  contactPhone: string;
  status: string;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  suspendedAt?: string;
  suspensionReason?: string;
  users?: Array<{
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  }>;
  _count?: {
    users: number;
    drivers: number;
  };
}

interface TenantTableProps {
  tenants: Tenant[];
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  onApprove?: (tenant: Tenant) => void;
  onReject?: (tenant: Tenant) => void;
  onSuspend?: (tenant: Tenant) => void;
  onReactivate?: (tenant: Tenant) => void;
  onViewDetails?: (tenant: Tenant) => void;
  isLoading?: boolean;
}

export function TenantTable({
  tenants,
  status,
  onApprove,
  onReject,
  onSuspend,
  onReactivate,
  onViewDetails,
  isLoading = false,
}: TenantTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <Alert>
        <AlertDescription className="text-foreground">
          No {status.toLowerCase().replace('_', ' ')} tenants
        </AlertDescription>
      </Alert>
    );
  }

  const getStatusDate = (tenant: Tenant) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return new Date(tenant.createdAt).toLocaleDateString();
      case 'ACTIVE':
        return tenant.approvedAt
          ? new Date(tenant.approvedAt).toLocaleDateString()
          : '-';
      case 'SUSPENDED':
        return tenant.suspendedAt
          ? new Date(tenant.suspendedAt).toLocaleDateString()
          : '-';
      case 'REJECTED':
        return tenant.rejectedAt
          ? new Date(tenant.rejectedAt).toLocaleDateString()
          : '-';
      default:
        return '-';
    }
  };

  const getDateLabel = () => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return 'Registered';
      case 'ACTIVE':
        return 'Approved';
      case 'SUSPENDED':
        return 'Suspended';
      case 'REJECTED':
        return 'Rejected';
      default:
        return 'Date';
    }
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Subdomain</TableHead>
            <TableHead>DOT Number</TableHead>
            <TableHead>Fleet Size</TableHead>
            <TableHead>Admin User</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>{getDateLabel()}</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.map((tenant) => (
            <TableRow key={tenant.id}>
              <TableCell className="font-medium">{tenant.companyName}</TableCell>
              <TableCell>
                <code className="text-sm bg-muted px-1 py-0.5 rounded">
                  {tenant.subdomain}.sally.com
                </code>
              </TableCell>
              <TableCell>{tenant.dotNumber}</TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {tenant.fleetSize?.replace('SIZE_', '')}
                </Badge>
              </TableCell>
              <TableCell>
                {tenant.users?.[0] && (
                  <>
                    {tenant.users[0].firstName} {tenant.users[0].lastName}
                    <br />
                    <span className="text-sm text-muted-foreground">
                      {tenant.users[0].email}
                    </span>
                  </>
                )}
              </TableCell>
              <TableCell>
                {tenant.contactEmail}
                <br />
                <span className="text-sm text-muted-foreground">
                  {tenant.contactPhone}
                </span>
              </TableCell>
              <TableCell>{getStatusDate(tenant)}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {status === 'PENDING_APPROVAL' && (
                    <>
                      {onApprove && (
                        <Button size="sm" onClick={() => onApprove(tenant)}>
                          Approve
                        </Button>
                      )}
                      {onReject && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onReject(tenant)}
                        >
                          Reject
                        </Button>
                      )}
                    </>
                  )}
                  {status === 'ACTIVE' && onSuspend && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSuspend(tenant)}
                    >
                      Suspend
                    </Button>
                  )}
                  {status === 'SUSPENDED' && onReactivate && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onReactivate(tenant)}
                    >
                      Reactivate
                    </Button>
                  )}
                  {onViewDetails && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onViewDetails(tenant)}
                    >
                      Details
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/platform/admin/components/tenant-table.tsx
git commit -m "feat(frontend): create reusable TenantTable component

- Display tenants with status-specific columns
- Show appropriate actions based on status
- Handle loading and empty states
- Support all tenant statuses"
```

---

### Task 17: Create Reject Tenant Dialog

**Files:**
- Create: `apps/web/src/features/platform/admin/components/reject-tenant-dialog.tsx`

**Step 1: Create reject dialog component**

Create `apps/web/src/features/platform/admin/components/reject-tenant-dialog.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

interface RejectTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantName: string;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
}

export function RejectTenantDialog({
  open,
  onOpenChange,
  tenantName,
  onConfirm,
  isLoading = false,
}: RejectTenantDialogProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason);
      setReason('');
    }
  };

  const handleCancel = () => {
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Tenant Registration</DialogTitle>
          <DialogDescription>
            Provide a reason for rejecting {tenantName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reason">Rejection Reason *</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Invalid DOT number, duplicate registration..."
            rows={4}
            className="bg-background"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim() || isLoading}
          >
            {isLoading ? 'Rejecting...' : 'Reject Tenant'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/platform/admin/components/reject-tenant-dialog.tsx
git commit -m "feat(frontend): create RejectTenantDialog component

- Require rejection reason
- Validate reason is not empty
- Handle loading state
- Clear form on cancel"
```

---

### Task 18: Create Suspend Tenant Dialog

**Files:**
- Create: `apps/web/src/features/platform/admin/components/suspend-tenant-dialog.tsx`

**Step 1: Create suspend dialog component**

Create `apps/web/src/features/platform/admin/components/suspend-tenant-dialog.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

interface SuspendTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantName: string;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
}

export function SuspendTenantDialog({
  open,
  onOpenChange,
  tenantName,
  onConfirm,
  isLoading = false,
}: SuspendTenantDialogProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (reason.trim() && reason.trim().length >= 10) {
      onConfirm(reason);
      setReason('');
    }
  };

  const handleCancel = () => {
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspend Tenant</DialogTitle>
          <DialogDescription>
            Suspending {tenantName} will disable access for all users
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Alert>
            <AlertDescription>
              ⚠️ All users will be logged out and unable to access the system
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Label htmlFor="reason">Suspension Reason * (min 10 characters)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Payment overdue, policy violation..."
              rows={4}
              className="bg-background"
            />
            {reason.trim() && reason.trim().length < 10 && (
              <p className="text-sm text-destructive">
                Reason must be at least 10 characters
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim() || reason.trim().length < 10 || isLoading}
          >
            {isLoading ? 'Suspending...' : 'Suspend Tenant'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/platform/admin/components/suspend-tenant-dialog.tsx
git commit -m "feat(frontend): create SuspendTenantDialog component

- Require suspension reason (min 10 chars)
- Show warning about user access
- Validate reason length
- Handle loading state"
```

---

### Task 19: Create Reactivate Tenant Dialog

**Files:**
- Create: `apps/web/src/features/platform/admin/components/reactivate-tenant-dialog.tsx`

**Step 1: Create reactivate dialog component**

Create `apps/web/src/features/platform/admin/components/reactivate-tenant-dialog.tsx`:

```typescript
'use client';

import { Button } from '@/shared/components/ui/button';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

interface ReactivateTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantName: string;
  suspensionReason?: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ReactivateTenantDialog({
  open,
  onOpenChange,
  tenantName,
  suspensionReason,
  onConfirm,
  isLoading = false,
}: ReactivateTenantDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reactivate Tenant</DialogTitle>
          <DialogDescription>
            Reactivating {tenantName} will restore access for all users
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Alert>
            <AlertDescription>
              ✅ Users will be able to log in and access the system again
            </AlertDescription>
          </Alert>
          {suspensionReason && (
            <div className="text-sm text-muted-foreground">
              <p className="font-medium">Previous suspension reason:</p>
              <p className="mt-1 italic">{suspensionReason}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Reactivating...' : 'Reactivate Tenant'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/platform/admin/components/reactivate-tenant-dialog.tsx
git commit -m "feat(frontend): create ReactivateTenantDialog component

- Show reactivation confirmation
- Display previous suspension reason
- Simple confirm/cancel actions
- Handle loading state"
```

---

### Task 20: Create Tenant Details Dialog (Part 1 - Structure)

**Files:**
- Create: `apps/web/src/features/platform/admin/components/tenant-details-dialog.tsx`

**Step 1: Create tenant details dialog skeleton**

Create `apps/web/src/features/platform/admin/components/tenant-details-dialog.tsx`:

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/shared/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/features/auth';

interface TenantDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
}

export function TenantDetailsDialog({
  open,
  onOpenChange,
  tenantId,
  tenantName,
}: TenantDetailsDialogProps) {
  const { accessToken } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  // Fetch tenant details
  const { data, isLoading } = useQuery({
    queryKey: ['tenant-details', tenantId],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/tenants/${tenantId}/details`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch tenant details');
      return response.json();
    },
    enabled: open && !!accessToken,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tenantName} - Details</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">
                Users ({data.metrics.totalUsers})
              </TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            {/* Overview Tab - Next step */}
            <TabsContent value="overview" className="space-y-4">
              {/* Will implement in next step */}
            </TabsContent>

            {/* Users Tab - Next step */}
            <TabsContent value="users">
              {/* Will implement in next step */}
            </TabsContent>

            {/* Activity Tab - Next step */}
            <TabsContent value="activity">
              {/* Will implement in next step */}
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/platform/admin/components/tenant-details-dialog.tsx
git commit -m "feat(frontend): create TenantDetailsDialog skeleton

- Set up dialog structure with tabs
- Add React Query for data fetching
- Handle loading state
- Prepare for tab content implementation"
```

---

## Phase 7: Frontend - Tenant Details Dialog Content

### Task 21: Implement Overview Tab

**Files:**
- Modify: `apps/web/src/features/platform/admin/components/tenant-details-dialog.tsx`

**Step 1: Replace Overview TabsContent**

Replace the Overview `TabsContent` (around line 70):

```typescript
<TabsContent value="overview" className="space-y-4">
  {/* Company Information */}
  <div>
    <h4 className="font-semibold mb-2">Company Information</h4>
    <dl className="grid grid-cols-2 gap-2 text-sm">
      <dt className="text-muted-foreground">Company Name:</dt>
      <dd className="font-medium">{data.tenant.companyName}</dd>

      <dt className="text-muted-foreground">Subdomain:</dt>
      <dd>
        <code className="bg-muted px-1 py-0.5 rounded text-xs">
          {data.tenant.subdomain}.sally.com
        </code>
      </dd>

      <dt className="text-muted-foreground">DOT Number:</dt>
      <dd>{data.tenant.dotNumber}</dd>

      <dt className="text-muted-foreground">Fleet Size:</dt>
      <dd>
        <Badge variant="secondary">
          {data.tenant.fleetSize?.replace('SIZE_', '')}
        </Badge>
      </dd>
    </dl>
  </div>

  {/* Contact Information */}
  <div>
    <h4 className="font-semibold mb-2">Contact Information</h4>
    <dl className="grid grid-cols-2 gap-2 text-sm">
      <dt className="text-muted-foreground">Email:</dt>
      <dd>{data.tenant.contactEmail}</dd>

      <dt className="text-muted-foreground">Phone:</dt>
      <dd>{data.tenant.contactPhone}</dd>
    </dl>
  </div>

  {/* Status History */}
  <div>
    <h4 className="font-semibold mb-2">Status History</h4>
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2">
        <Badge>{data.tenant.status}</Badge>
        <span className="text-muted-foreground">Current Status</span>
      </div>
      {data.tenant.approvedAt && (
        <div className="text-muted-foreground">
          Approved on {new Date(data.tenant.approvedAt).toLocaleDateString()} by{' '}
          {data.tenant.approvedBy}
        </div>
      )}
      {data.tenant.suspendedAt && (
        <div className="text-muted-foreground">
          Suspended on {new Date(data.tenant.suspendedAt).toLocaleDateString()} by{' '}
          {data.tenant.suspendedBy}
          <p className="italic mt-1">Reason: {data.tenant.suspensionReason}</p>
        </div>
      )}
      {data.tenant.rejectedAt && (
        <div className="text-muted-foreground">
          Rejected on {new Date(data.tenant.rejectedAt).toLocaleDateString()}
          <p className="italic mt-1">Reason: {data.tenant.rejectionReason}</p>
        </div>
      )}
      {data.tenant.reactivatedAt && (
        <div className="text-muted-foreground">
          Reactivated on {new Date(data.tenant.reactivatedAt).toLocaleDateString()} by{' '}
          {data.tenant.reactivatedBy}
        </div>
      )}
    </div>
  </div>
</TabsContent>
```

**Step 2: Commit**

```bash
git add apps/web/src/features/platform/admin/components/tenant-details-dialog.tsx
git commit -m "feat(frontend): implement tenant details overview tab

- Display company information
- Display contact information
- Show status history with dates and reasons"
```

---

### Task 22: Implement Users Tab

**Files:**
- Modify: `apps/web/src/features/platform/admin/components/tenant-details-dialog.tsx`

**Step 1: Replace Users TabsContent**

Replace the Users `TabsContent`:

```typescript
<TabsContent value="users">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Role</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Last Login</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {data.users.map((user: any) => (
        <TableRow key={user.userId}>
          <TableCell>
            {user.firstName} {user.lastName}
          </TableCell>
          <TableCell className="text-sm text-muted-foreground">
            {user.email}
          </TableCell>
          <TableCell>
            <Badge variant="secondary">{user.role}</Badge>
          </TableCell>
          <TableCell>
            <Badge variant={user.isActive ? 'default' : 'secondary'}>
              {user.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </TableCell>
          <TableCell className="text-sm text-muted-foreground">
            {user.lastLoginAt
              ? new Date(user.lastLoginAt).toLocaleDateString()
              : 'Never'}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</TabsContent>
```

**Step 2: Commit**

```bash
git add apps/web/src/features/platform/admin/components/tenant-details-dialog.tsx
git commit -m "feat(frontend): implement tenant details users tab

- Display all tenant users in table
- Show user role and status badges
- Display last login date"
```

---

### Task 23: Implement Activity Tab

**Files:**
- Modify: `apps/web/src/features/platform/admin/components/tenant-details-dialog.tsx`

**Step 1: Replace Activity TabsContent**

Replace the Activity `TabsContent`:

```typescript
<TabsContent value="activity" className="space-y-4">
  <div className="grid grid-cols-2 gap-4">
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Total Users</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{data.metrics.totalUsers}</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Total Drivers</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{data.metrics.totalDrivers}</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Total Vehicles</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{data.metrics.totalVehicles}</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Route Plans</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{data.metrics.totalRoutePlans}</p>
      </CardContent>
    </Card>
  </div>

  <div>
    <h4 className="font-semibold mb-2">Account Timeline</h4>
    <dl className="space-y-1 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Account Created:</dt>
        <dd>{new Date(data.tenant.createdAt).toLocaleDateString()}</dd>
      </div>
      {data.tenant.approvedAt && (
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Approved:</dt>
          <dd>{new Date(data.tenant.approvedAt).toLocaleDateString()}</dd>
        </div>
      )}
    </dl>
  </div>
</TabsContent>
```

**Step 2: Commit**

```bash
git add apps/web/src/features/platform/admin/components/tenant-details-dialog.tsx
git commit -m "feat(frontend): implement tenant details activity tab

- Display metrics in card grid
- Show total users, drivers, vehicles, route plans
- Display account timeline"
```

---

## Phase 8: Frontend - Tenant Management Page

### Task 24: Create Tenant Management Tabs Component

**Files:**
- Create: `apps/web/src/features/platform/admin/components/tenant-management-tabs.tsx`

**Step 1: Create component file** (this will be long, so breaking into parts)

Create `apps/web/src/features/platform/admin/components/tenant-management-tabs.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';
import { useAuth } from '@/features/auth';
import { useToast } from '@/shared/hooks/use-toast';
import { TenantTable } from './tenant-table';
import { RejectTenantDialog } from './reject-tenant-dialog';
import { SuspendTenantDialog } from './suspend-tenant-dialog';
import { ReactivateTenantDialog } from './reactivate-tenant-dialog';
import { TenantDetailsDialog } from './tenant-details-dialog';

interface Tenant {
  id: number;
  tenantId: string;
  companyName: string;
  subdomain: string;
  dotNumber: string;
  fleetSize: string;
  contactEmail: string;
  contactPhone: string;
  status: string;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  suspendedAt?: string;
  suspensionReason?: string;
  users?: Array<{
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  }>;
  _count?: {
    users: number;
    drivers: number;
  };
}

export function TenantManagementTabs() {
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  const [activeTab, setActiveTab] = useState('pending');
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; tenant?: Tenant }>({
    open: false,
  });
  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; tenant?: Tenant }>({
    open: false,
  });
  const [reactivateDialog, setReactivateDialog] = useState<{
    open: boolean;
    tenant?: Tenant;
  }>({ open: false });
  const [detailsDialog, setDetailsDialog] = useState<{ open: boolean; tenant?: Tenant }>({
    open: false,
  });

  // Fetch tenants by status
  const fetchTenants = async (status: string) => {
    const response = await fetch(`${apiUrl}/tenants?status=${status}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch tenants');
    return response.json();
  };

  const { data: pendingTenants, isLoading: pendingLoading } = useQuery({
    queryKey: ['tenants', 'PENDING_APPROVAL'],
    queryFn: () => fetchTenants('PENDING_APPROVAL'),
    enabled: !!accessToken,
  });

  const { data: activeTenants, isLoading: activeLoading } = useQuery({
    queryKey: ['tenants', 'ACTIVE'],
    queryFn: () => fetchTenants('ACTIVE'),
    enabled: !!accessToken,
  });

  const { data: suspendedTenants, isLoading: suspendedLoading } = useQuery({
    queryKey: ['tenants', 'SUSPENDED'],
    queryFn: () => fetchTenants('SUSPENDED'),
    enabled: !!accessToken,
  });

  const { data: rejectedTenants, isLoading: rejectedLoading } = useQuery({
    queryKey: ['tenants', 'REJECTED'],
    queryFn: () => fetchTenants('REJECTED'),
    enabled: !!accessToken,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const response = await fetch(`${apiUrl}/tenants/${tenantId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new Error('Failed to approve tenant');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({
        title: 'Tenant approved',
        description: 'The tenant has been approved successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to approve tenant. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ tenantId, reason }: { tenantId: string; reason: string }) => {
      const response = await fetch(`${apiUrl}/tenants/${tenantId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error('Failed to reject tenant');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setRejectDialog({ open: false });
      toast({
        title: 'Tenant rejected',
        description: 'The tenant has been rejected.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to reject tenant. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Suspend mutation
  const suspendMutation = useMutation({
    mutationFn: async ({ tenantId, reason }: { tenantId: string; reason: string }) => {
      const response = await fetch(`${apiUrl}/tenants/${tenantId}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error('Failed to suspend tenant');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setSuspendDialog({ open: false });
      toast({
        title: 'Tenant suspended',
        description: 'The tenant has been suspended. All users have been logged out.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to suspend tenant. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Reactivate mutation
  const reactivateMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const response = await fetch(`${apiUrl}/tenants/${tenantId}/reactivate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new Error('Failed to reactivate tenant');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setReactivateDialog({ open: false });
      toast({
        title: 'Tenant reactivated',
        description: 'The tenant has been reactivated. Users can now log in.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to reactivate tenant. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleApprove = (tenant: Tenant) => {
    if (confirm(`Approve ${tenant.companyName}?`)) {
      approveMutation.mutate(tenant.tenantId);
    }
  };

  const handleReject = (tenant: Tenant) => {
    setRejectDialog({ open: true, tenant });
  };

  const handleSuspend = (tenant: Tenant) => {
    setSuspendDialog({ open: true, tenant });
  };

  const handleReactivate = (tenant: Tenant) => {
    setReactivateDialog({ open: true, tenant });
  };

  const handleViewDetails = (tenant: Tenant) => {
    setDetailsDialog({ open: true, tenant });
  };

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending {pendingTenants ? `(${pendingTenants.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="active">
            Active {activeTenants ? `(${activeTenants.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="suspended">
            Suspended {suspendedTenants ? `(${suspendedTenants.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected {rejectedTenants ? `(${rejectedTenants.length})` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <TenantTable
            tenants={pendingTenants || []}
            status="PENDING_APPROVAL"
            onApprove={handleApprove}
            onReject={handleReject}
            onViewDetails={handleViewDetails}
            isLoading={pendingLoading}
          />
        </TabsContent>

        <TabsContent value="active">
          <TenantTable
            tenants={activeTenants || []}
            status="ACTIVE"
            onSuspend={handleSuspend}
            onViewDetails={handleViewDetails}
            isLoading={activeLoading}
          />
        </TabsContent>

        <TabsContent value="suspended">
          <TenantTable
            tenants={suspendedTenants || []}
            status="SUSPENDED"
            onReactivate={handleReactivate}
            onViewDetails={handleViewDetails}
            isLoading={suspendedLoading}
          />
        </TabsContent>

        <TabsContent value="rejected">
          <TenantTable
            tenants={rejectedTenants || []}
            status="REJECTED"
            onViewDetails={handleViewDetails}
            isLoading={rejectedLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {rejectDialog.tenant && (
        <RejectTenantDialog
          open={rejectDialog.open}
          onOpenChange={(open) => setRejectDialog({ open })}
          tenantName={rejectDialog.tenant.companyName}
          onConfirm={(reason) =>
            rejectMutation.mutate({ tenantId: rejectDialog.tenant!.tenantId, reason })
          }
          isLoading={rejectMutation.isPending}
        />
      )}

      {suspendDialog.tenant && (
        <SuspendTenantDialog
          open={suspendDialog.open}
          onOpenChange={(open) => setSuspendDialog({ open })}
          tenantName={suspendDialog.tenant.companyName}
          onConfirm={(reason) =>
            suspendMutation.mutate({ tenantId: suspendDialog.tenant!.tenantId, reason })
          }
          isLoading={suspendMutation.isPending}
        />
      )}

      {reactivateDialog.tenant && (
        <ReactivateTenantDialog
          open={reactivateDialog.open}
          onOpenChange={(open) => setReactivateDialog({ open })}
          tenantName={reactivateDialog.tenant.companyName}
          suspensionReason={reactivateDialog.tenant.suspensionReason}
          onConfirm={() => reactivateMutation.mutate(reactivateDialog.tenant!.tenantId)}
          isLoading={reactivateMutation.isPending}
        />
      )}

      {detailsDialog.tenant && (
        <TenantDetailsDialog
          open={detailsDialog.open}
          onOpenChange={(open) => setDetailsDialog({ open })}
          tenantId={detailsDialog.tenant.tenantId}
          tenantName={detailsDialog.tenant.companyName}
        />
      )}
    </>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/platform/admin/components/tenant-management-tabs.tsx
git commit -m "feat(frontend): create TenantManagementTabs component

- Implement tabbed interface with 4 status tabs
- Fetch tenants by status using React Query
- Handle all tenant actions (approve, reject, suspend, reactivate)
- Show appropriate dialogs for each action
- Display count badges on tabs"
```

---

### Task 25: Update Tenant Management Page

**Files:**
- Modify: `apps/web/src/app/(super-admin)/admin/tenants/page.tsx`

**Step 1: Replace page content**

Replace the content of `apps/web/src/app/(super-admin)/admin/tenants/page.tsx`:

```typescript
import { TenantManagementTabs } from "@/features/platform/admin/components/tenant-management-tabs";

export default function SuperAdminTenantsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Tenant Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage tenant registrations and lifecycle across all statuses
        </p>
      </div>
      <TenantManagementTabs />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/\(super-admin\)/admin/tenants/page.tsx
git commit -m "feat(frontend): update tenant management page with tabs

- Replace TenantList with TenantManagementTabs
- Update page description
- Use new tabbed interface"
```

---

## Phase 9: Frontend - Super Admin Settings

### Task 26: Update Navigation Config

**Files:**
- Modify: `apps/web/src/shared/lib/navigation.ts`

**Step 1: Add Settings import**

Add to imports at top (around line 1):

```typescript
import { Home, Plus, Truck, Settings, Map, MessageSquare, LucideIcon, Package, Plug, Users, BarChart3, Route, Building2, Rocket, Flag } from 'lucide-react';
```

**Step 2: Add Settings to super_admin navigation**

Update the `super_admin` array (around line 86):

```typescript
super_admin: [
  { label: 'Tenant Management', href: '/admin/tenants', icon: Building2 },
  { label: 'Feature Flags', href: '/admin/feature-flags', icon: Flag },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
],
```

**Step 3: Commit**

```bash
git add apps/web/src/shared/lib/navigation.ts
git commit -m "feat(frontend): add Settings to super admin navigation

- Import Settings icon
- Add Settings nav item to super_admin config"
```

---

### Task 27: Update UserProfileMenu Smart Routing

**Files:**
- Modify: `apps/web/src/shared/components/layout/UserProfileMenu.tsx`

**Step 1: Update settings onClick handler**

Replace the settings `DropdownMenuItem` (around line 64):

```typescript
<DropdownMenuItem onClick={() => {
  if (user?.role === 'SUPER_ADMIN') {
    router.push('/admin/settings');
  } else {
    router.push('/settings/preferences');
  }
}}>
  <Settings className="mr-2 h-4 w-4" />
  <span>Settings</span>
</DropdownMenuItem>
```

**Step 2: Commit**

```bash
git add apps/web/src/shared/components/layout/UserProfileMenu.tsx
git commit -m "feat(frontend): add smart settings routing to user menu

- Route SUPER_ADMIN to /admin/settings
- Route other roles to /settings/preferences
- Fix broken settings navigation"
```

---

### Task 28: Create Super Admin Settings Page

**Files:**
- Create: `apps/web/src/app/(super-admin)/admin/settings/page.tsx`

**Step 1: Create settings directory**

Run: `mkdir -p apps/web/src/app/\(super-admin\)/admin/settings`

**Step 2: Create settings page**

Create `apps/web/src/app/(super-admin)/admin/settings/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/components/ui/select';
import { Separator } from '@/shared/components/ui/separator';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { useToast } from '@/shared/hooks/use-toast';

export default function SuperAdminSettingsPage() {
  const { user, accessToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  const [notifyNewTenants, setNotifyNewTenants] = useState(true);
  const [notifyStatusChanges, setNotifyStatusChanges] = useState(true);
  const [notificationFrequency, setNotificationFrequency] = useState('immediate');

  // Fetch preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['preferences'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/users/me/preferences`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch preferences');
      return response.json();
    },
    enabled: !!accessToken,
  });

  // Update local state when preferences load
  useEffect(() => {
    if (preferences) {
      setNotifyNewTenants(preferences.notifyNewTenants);
      setNotifyStatusChanges(preferences.notifyStatusChanges);
      setNotificationFrequency(preferences.notificationFrequency);
    }
  }, [preferences]);

  // Update preferences mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`${apiUrl}/users/me/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update preferences');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
      toast({
        title: 'Preferences saved',
        description: 'Your notification preferences have been updated.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      notifyNewTenants,
      notifyStatusChanges,
      notificationFrequency,
    });
  };

  const handleChangePassword = () => {
    // TODO: Implement Firebase password change redirect
    toast({
      title: 'Coming soon',
      description: 'Password change via Firebase is not yet implemented.',
    });
  };

  const getInitials = () => {
    if (!user) return 'U';
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your personal profile and notification preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Profile</CardTitle>
          <CardDescription>
            Your account information and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Info */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-black dark:bg-white text-white dark:text-black text-lg">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-lg">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <Badge variant="default" className="mt-1">
                Super Admin
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Password Section */}
          <div>
            <Label className="text-base">Password</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Manage your password through Firebase Authentication
            </p>
            <Button variant="outline" onClick={handleChangePassword}>
              Change Password
            </Button>
          </div>

          <Separator />

          {/* Notification Preferences */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-base">Notification Preferences</Label>
                <p className="text-sm text-muted-foreground">
                  Choose how you want to be notified about platform events
                </p>
              </div>

              {/* Toggle: New Tenant Registrations */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label>New Tenant Registrations</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when new tenants register
                  </p>
                </div>
                <Switch
                  checked={notifyNewTenants}
                  onCheckedChange={setNotifyNewTenants}
                />
              </div>

              {/* Toggle: Tenant Status Changes */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label>Tenant Status Changes</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when tenants are suspended or reactivated
                  </p>
                </div>
                <Switch
                  checked={notifyStatusChanges}
                  onCheckedChange={setNotifyStatusChanges}
                />
              </div>

              {/* Select: Notification Frequency */}
              <div className="space-y-2">
                <Label>Notification Frequency</Label>
                <Select
                  value={notificationFrequency}
                  onValueChange={setNotificationFrequency}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="daily">Daily Digest</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose how often you receive notification emails
                </p>
              </div>

              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/app/\(super-admin\)/admin/settings/
git commit -m "feat(frontend): create super admin settings page

- Display user profile with avatar and role badge
- Add password change section (stub)
- Add notification preferences with toggles and frequency select
- Integrate with preferences API
- Handle loading and error states"
```

---

## Phase 10: Testing & Verification

### Task 29: Manual End-to-End Testing

**Files:**
- Manual testing

**Step 1: Test database migrations**

Run: `cd apps/backend && npx prisma studio`
Expected: Verify new columns exist in tenants table and super_admin_preferences table exists

**Step 2: Test backend endpoints**

Use curl or Postman to test all new endpoints:
- POST /tenants/:id/suspend
- POST /tenants/:id/reactivate
- GET /tenants/:id/details
- GET /users/me/preferences
- PUT /users/me/preferences

Expected: All endpoints return expected responses

**Step 3: Test frontend flows**

1. Login as super admin
2. Navigate to Tenant Management
3. Test all tabs load correctly
4. Test approve action on pending tenant
5. Test reject dialog and action
6. Test suspend dialog and action on active tenant
7. Test reactivate dialog and action on suspended tenant
8. Test tenant details dialog opens with all tabs
9. Navigate to Settings from header menu
10. Verify routes to /admin/settings
11. Test updating notification preferences
12. Verify preferences save successfully

Expected: All flows work without errors

**Step 4: Test responsive design**

1. Resize browser to mobile width (375px)
2. Test tenant management page
3. Test settings page
4. Test dialogs on mobile

Expected: Everything responsive and usable

**Step 5: Test dark mode**

1. Toggle dark mode
2. Navigate through all pages
3. Verify colors and contrast

Expected: All components support dark mode

**Step 6: Document any bugs found**

Create notes for any bugs encountered. No commit needed yet.

---

### Task 30: Final Integration Commit

**Files:**
- Update exports and ensure all components are wired correctly

**Step 1: Update admin components index**

Edit `apps/web/src/features/platform/admin/index.ts`:

```typescript
export { TenantManagementTabs } from './components/tenant-management-tabs';
export { TenantTable } from './components/tenant-table';
export { RejectTenantDialog } from './components/reject-tenant-dialog';
export { SuspendTenantDialog } from './components/suspend-tenant-dialog';
export { ReactivateTenantDialog } from './components/reactivate-tenant-dialog';
export { TenantDetailsDialog } from './components/tenant-details-dialog';
```

**Step 2: Verify all imports work**

Run from project root: `cd apps/web && npm run build`
Expected: Build completes without errors

**Step 3: Final commit**

```bash
git add apps/web/src/features/platform/admin/index.ts
git commit -m "feat: finalize super admin tenant management integration

- Export all new components from admin module
- Verify build succeeds
- Complete implementation of design document"
```

---

## Implementation Complete! 🎉

**Summary of Changes:**

**Backend (NestJS):**
- ✅ Database migrations for suspension tracking and preferences
- ✅ Suspend/reactivate tenant endpoints with transaction support
- ✅ Get tenant details endpoint with metrics
- ✅ Preferences module with get/update endpoints
- ✅ Email notification methods (stubs for now)

**Frontend (Next.js):**
- ✅ TenantTable component (reusable for all statuses)
- ✅ Reject, Suspend, Reactivate dialogs
- ✅ Tenant Details dialog with 3 tabs
- ✅ Tenant Management Tabs page (replaces old tenant list)
- ✅ Super Admin Settings page with notification preferences
- ✅ Smart settings routing in UserProfileMenu
- ✅ Updated navigation config

**Key Features:**
- ✅ Full tenant lifecycle management (approve, reject, suspend, reactivate)
- ✅ Tenant details viewer with users and metrics
- ✅ Super admin notification preferences
- ✅ Fixed settings navigation routing
- ✅ Dark mode support throughout
- ✅ Responsive design for all screen sizes
- ✅ Shadcn UI components used consistently

**Total Tasks:** 30
**Estimated Time:** 2-3 days
