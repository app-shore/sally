# Team & Drivers Unified Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge Team and Drivers into a unified Team page with 3 tabs (Staff, Drivers, Invitations), add "Invite to SALLY" flow on Fleet Drivers page, and fix the broken driver activation → system access pipeline.

**Architecture:** Backend-first approach. Add `activateAndInvite` and `resendInvitation` endpoints to backend, modify `listDrivers` to include SALLY access status, modify `acceptInvitation` to auto-activate pending drivers. Then rebuild the Team page with role-based tabs, update Fleet Drivers page with SALLY Access column and invite dialog. Finally update navigation routes.

**Tech Stack:** NestJS 11 (backend), Next.js 15 App Router (frontend), Prisma 7.3, React Query, Shadcn/ui, Tailwind CSS, TypeScript

**Design Doc:** `.docs/plans/2026-02-11-team-drivers-unified-design.md`

---

## Task 1: Backend — Add `activateAndInvite` method to DriversActivationService

**Files:**
- Modify: `apps/backend/src/domains/fleet/drivers/services/drivers-activation.service.ts`
- Modify: `apps/backend/src/domains/fleet/drivers/drivers.module.ts`
- Test: `apps/backend/src/domains/fleet/drivers/services/drivers-activation.service.spec.ts`

**Step 1: Write the failing test**

Add to `drivers-activation.service.spec.ts` after the existing tests:

```typescript
// Add to imports at top of file:
import { EmailService } from '../../../../infrastructure/notification/services/email.service';
import { UserInvitationsService } from '../../../platform/user-invitations/user-invitations.service';

// Update mockPrismaService to add $transaction and userInvitation:
// Add after mockPrismaService.driver:
//   $transaction: jest.fn(),

// Add mock for UserInvitationsService:
const mockUserInvitationsService = {
  inviteUser: jest.fn(),
};

// Update the TestingModule providers to include:
// { provide: UserInvitationsService, useValue: mockUserInvitationsService }

// Add this describe block at the end before the closing });
describe('activateAndInvite', () => {
  it('should activate driver and create invitation in one step', async () => {
    const mockDriver = {
      id: 1,
      driverId: 'DRV-001',
      name: 'Mike Thompson',
      email: 'mike@email.com',
      tenantId: 1,
      status: 'PENDING_ACTIVATION',
      isActive: false,
    };

    const currentUser = {
      id: 10,
      userId: 'user_admin1',
      email: 'admin@fleet.com',
      role: 'ADMIN',
      tenantId: 'tenant_abc',
      tenant: { id: 1 },
    };

    mockPrismaService.driver.findUnique.mockResolvedValue(mockDriver);
    mockPrismaService.driver.update.mockResolvedValue({
      ...mockDriver,
      status: 'ACTIVE',
      isActive: true,
      activatedAt: new Date(),
      activatedBy: currentUser.id,
    });
    mockUserInvitationsService.inviteUser.mockResolvedValue({
      id: 1,
      invitationId: 'inv_abc123',
      email: 'mike@email.com',
      status: 'PENDING',
    });

    const result = await service.activateAndInvite('DRV-001', undefined, currentUser);

    expect(result.driver.status).toBe('ACTIVE');
    expect(result.invitation.status).toBe('PENDING');
    expect(mockUserInvitationsService.inviteUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'mike@email.com',
        firstName: 'Mike',
        lastName: 'Thompson',
        role: 'DRIVER',
        driverId: 'DRV-001',
      }),
      currentUser,
    );
  });

  it('should use provided email when driver has no email', async () => {
    const mockDriver = {
      id: 2,
      driverId: 'DRV-002',
      name: 'Dan Foster',
      email: null,
      tenantId: 1,
      status: 'PENDING_ACTIVATION',
      isActive: false,
    };

    const currentUser = {
      id: 10,
      userId: 'user_admin1',
      role: 'ADMIN',
      tenantId: 'tenant_abc',
      tenant: { id: 1 },
    };

    mockPrismaService.driver.findUnique.mockResolvedValue(mockDriver);
    mockPrismaService.driver.update.mockResolvedValue({
      ...mockDriver,
      email: 'dan@email.com',
      status: 'ACTIVE',
      isActive: true,
    });
    mockUserInvitationsService.inviteUser.mockResolvedValue({
      id: 2,
      status: 'PENDING',
    });

    await service.activateAndInvite('DRV-002', 'dan@email.com', currentUser);

    expect(mockPrismaService.driver.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'dan@email.com' }),
      }),
    );
  });

  it('should throw error when driver has no email and none provided', async () => {
    mockPrismaService.driver.findUnique.mockResolvedValue({
      id: 3,
      driverId: 'DRV-003',
      name: 'No Email',
      email: null,
      tenantId: 1,
      status: 'PENDING_ACTIVATION',
    });

    await expect(
      service.activateAndInvite('DRV-003', undefined, { id: 10, tenant: { id: 1 } }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should work for already-active drivers (invite only, no status change)', async () => {
    const mockDriver = {
      id: 4,
      driverId: 'DRV-004',
      name: 'Already Active',
      email: 'active@email.com',
      tenantId: 1,
      status: 'ACTIVE',
      isActive: true,
    };

    const currentUser = { id: 10, tenant: { id: 1 }, tenantId: 'tenant_abc', role: 'ADMIN', userId: 'user_admin1' };

    mockPrismaService.driver.findUnique.mockResolvedValue(mockDriver);
    // No driver.update needed since already active
    mockUserInvitationsService.inviteUser.mockResolvedValue({
      id: 3,
      status: 'PENDING',
    });

    const result = await service.activateAndInvite('DRV-004', undefined, currentUser);

    expect(result.invitation.status).toBe('PENDING');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx jest --testPathPattern="drivers-activation.service.spec" --verbose`
Expected: FAIL — `service.activateAndInvite is not a function`

**Step 3: Update the module to inject UserInvitationsService**

In `apps/backend/src/domains/fleet/drivers/drivers.module.ts`, add UserInvitationsModule import:

```typescript
import { Module } from '@nestjs/common';
import { DriversController } from './controllers/drivers.controller';
import { DriversService } from './services/drivers.service';
import { DriversActivationService } from './services/drivers-activation.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { IntegrationsModule } from '../../integrations/integrations.module';
import { UserInvitationsModule } from '../../platform/user-invitations/user-invitations.module';

@Module({
  imports: [PrismaModule, IntegrationsModule, UserInvitationsModule],
  controllers: [DriversController],
  providers: [DriversService, DriversActivationService],
  exports: [DriversService, DriversActivationService],
})
export class DriversModule {}
```

**Step 4: Write the `activateAndInvite` method**

Add to `apps/backend/src/domains/fleet/drivers/services/drivers-activation.service.ts`:

```typescript
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { UserInvitationsService } from '../../../platform/user-invitations/user-invitations.service';

@Injectable()
export class DriversActivationService {
  constructor(
    private prisma: PrismaService,
    private readonly userInvitationsService: UserInvitationsService,
  ) {}

  // ... existing methods remain unchanged ...

  /**
   * Activate a driver AND send SALLY invitation in one step.
   * - If driver is PENDING_ACTIVATION, activates them first
   * - If driver is already ACTIVE, just sends invitation
   * - Creates UserInvitation linked to driver (role=DRIVER)
   */
  async activateAndInvite(
    driverId: string,
    email: string | undefined,
    currentUser: any,
  ) {
    const driver = await this.prisma.driver.findUnique({
      where: { driverId },
      include: { user: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (driver.tenantId !== currentUser.tenant.id) {
      throw new BadRequestException(
        'Driver does not belong to your organization',
      );
    }

    // Check if driver already has a user account
    if (driver.user) {
      throw new BadRequestException(
        'Driver already has a SALLY account',
      );
    }

    // Determine email to use
    const driverEmail = email || driver.email;
    if (!driverEmail) {
      throw new BadRequestException(
        'Driver has no email address. Please provide an email to send the invitation.',
      );
    }

    // If email was provided and differs from current, update driver record
    let updatedDriver = driver;
    if (email && email !== driver.email) {
      updatedDriver = await this.prisma.driver.update({
        where: { driverId },
        data: { email },
      });
    }

    // Activate if pending
    if (driver.status === 'PENDING_ACTIVATION') {
      updatedDriver = await this.prisma.driver.update({
        where: { driverId },
        data: {
          status: 'ACTIVE',
          isActive: true,
          activatedAt: new Date(),
          activatedBy: currentUser.id,
        },
      });
    }

    // Parse name into first/last (driver has single "name" field)
    const nameParts = driver.name.trim().split(/\s+/);
    const firstName = nameParts[0] || driver.name;
    const lastName = nameParts.slice(1).join(' ') || driver.name;

    // Create invitation via UserInvitationsService
    const invitation = await this.userInvitationsService.inviteUser(
      {
        email: driverEmail,
        firstName,
        lastName,
        role: 'DRIVER' as any,
        driverId: driver.driverId,
      },
      currentUser,
    );

    return { driver: updatedDriver, invitation };
  }
}
```

**Step 5: Run test to verify it passes**

Run: `cd apps/backend && npx jest --testPathPattern="drivers-activation.service.spec" --verbose`
Expected: PASS

**Step 6: Commit**

```bash
git add apps/backend/src/domains/fleet/drivers/services/drivers-activation.service.ts apps/backend/src/domains/fleet/drivers/services/drivers-activation.service.spec.ts apps/backend/src/domains/fleet/drivers/drivers.module.ts
git commit -m "feat: add activateAndInvite method to DriversActivationService"
```

---

## Task 2: Backend — Add `activateAndInvite` controller endpoint

**Files:**
- Modify: `apps/backend/src/domains/fleet/drivers/controllers/drivers.controller.ts`

**Step 1: Add the new endpoint**

Add after the `reactivateDriver` endpoint (after line 273) in `drivers.controller.ts`:

```typescript
  @Post(':driver_id/activate-and-invite')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary: 'Activate a driver and send SALLY invitation in one step',
  })
  @ApiParam({ name: 'driver_id', description: 'Driver ID' })
  async activateAndInvite(
    @Param('driver_id') driverId: string,
    @CurrentUser() user: any,
    @Body('email') email?: string,
  ) {
    const tenant = await this.getTenant(user.tenantId);

    return this.driversActivationService.activateAndInvite(
      driverId,
      email,
      {
        ...user,
        tenant: { id: tenant.id },
      },
    );
  }
```

**Step 2: Verify backend compiles**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/backend/src/domains/fleet/drivers/controllers/drivers.controller.ts
git commit -m "feat: add POST /drivers/:id/activate-and-invite endpoint"
```

---

## Task 3: Backend — Add `resendInvitation` method and endpoint

**Files:**
- Modify: `apps/backend/src/domains/platform/user-invitations/user-invitations.service.ts`
- Modify: `apps/backend/src/domains/platform/user-invitations/user-invitations.controller.ts`
- Test: `apps/backend/src/domains/platform/user-invitations/user-invitations.service.spec.ts`

**Step 1: Write the failing test**

Add to `user-invitations.service.spec.ts` before the closing `});`:

```typescript
describe('resendInvitation', () => {
  it('should generate new token and reset expiry for pending invitation', async () => {
    const mockInvitation = {
      id: 1,
      invitationId: 'inv_abc',
      tenantId: 1,
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      tenant: { companyName: 'Fleet Co' },
      invitedByUser: { firstName: 'Admin', lastName: 'User' },
    };

    mockPrismaService.userInvitation.findUnique.mockResolvedValue(mockInvitation);
    mockPrismaService.userInvitation.update.mockResolvedValue({
      ...mockInvitation,
      token: 'new-token',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const result = await service.resendInvitation('inv_abc', 'tenant_abc');

    expect(mockPrismaService.userInvitation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { invitationId: 'inv_abc' },
        data: expect.objectContaining({
          token: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      }),
    );
  });

  it('should throw error if invitation is not PENDING', async () => {
    mockPrismaService.userInvitation.findUnique.mockResolvedValue({
      id: 1,
      invitationId: 'inv_abc',
      tenantId: 1,
      status: 'ACCEPTED',
    });

    await expect(
      service.resendInvitation('inv_abc', 'tenant_abc'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw error if invitation not found', async () => {
    mockPrismaService.userInvitation.findUnique.mockResolvedValue(null);

    await expect(
      service.resendInvitation('inv_nonexistent', 'tenant_abc'),
    ).rejects.toThrow(NotFoundException);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx jest --testPathPattern="user-invitations.service.spec" --verbose`
Expected: FAIL — `service.resendInvitation is not a function`

**Step 3: Implement `resendInvitation` in UserInvitationsService**

Add after the `cancelInvitation` method in `user-invitations.service.ts`:

```typescript
  /**
   * Resend invitation with new token and reset expiry
   */
  async resendInvitation(invitationId: string, tenantIdString: string) {
    // Get tenant database ID
    const tenant = await this.prisma.tenant.findUnique({
      where: { tenantId: tenantIdString },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const invitation = await this.prisma.userInvitation.findUnique({
      where: { invitationId },
      include: {
        tenant: { select: { companyName: true } },
        invitedByUser: { select: { firstName: true, lastName: true } },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.tenantId !== tenant.id) {
      throw new BadRequestException(
        'Invitation does not belong to your organization',
      );
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot resend invitation with status ${invitation.status}`,
      );
    }

    // Generate new token and expiry
    const newToken = nanoid();
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const updatedInvitation = await this.prisma.userInvitation.update({
      where: { invitationId },
      data: {
        token: newToken,
        expiresAt: newExpiry,
      },
    });

    // Resend email
    const invitedByName = `${invitation.invitedByUser.firstName} ${invitation.invitedByUser.lastName}`;
    await this.emailService.sendUserInvitation(
      invitation.email,
      invitation.firstName,
      invitation.lastName,
      invitedByName,
      invitation.tenant.companyName,
      newToken,
    );

    return updatedInvitation;
  }
```

**Step 4: Add controller endpoint**

Add after the `cancelInvitation` endpoint in `user-invitations.controller.ts`:

```typescript
  /**
   * Resend invitation with new token (OWNER and ADMIN)
   */
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post(':invitationId/resend')
  async resendInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.userInvitationsService.resendInvitation(
      invitationId,
      currentUser.tenantId,
    );
  }
```

**Step 5: Run test to verify it passes**

Run: `cd apps/backend && npx jest --testPathPattern="user-invitations.service.spec" --verbose`
Expected: PASS

**Step 6: Commit**

```bash
git add apps/backend/src/domains/platform/user-invitations/user-invitations.service.ts apps/backend/src/domains/platform/user-invitations/user-invitations.controller.ts apps/backend/src/domains/platform/user-invitations/user-invitations.service.spec.ts
git commit -m "feat: add resendInvitation endpoint for team invitations"
```

---

## Task 4: Backend — Modify `listDrivers` to include SALLY access status

**Files:**
- Modify: `apps/backend/src/domains/fleet/drivers/services/drivers.service.ts`
- Modify: `apps/backend/src/domains/fleet/drivers/controllers/drivers.controller.ts`

**Step 1: Update `findAll` in DriversService to include user and invitation relations**

Replace the `findAll` method in `drivers.service.ts`:

```typescript
  /**
   * Find all active drivers for a tenant, including SALLY access status
   */
  async findAll(tenantId: number): Promise<any[]> {
    const drivers = await this.prisma.driver.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            userId: true,
            isActive: true,
          },
        },
        invitations: {
          where: { status: 'PENDING' },
          select: {
            invitationId: true,
            status: true,
          },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { driverId: 'asc' },
    });

    return drivers;
  }
```

**Step 2: Update `listDrivers` in DriversController to include SALLY access status in response**

Replace the `listDrivers` method in `drivers.controller.ts`:

```typescript
  @Get()
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary:
      'List all active drivers with SALLY access status',
  })
  async listDrivers(@CurrentUser() user: any) {
    const tenantDbId = await this.getTenantDbId(user);
    const drivers = await this.driversService.findAll(tenantDbId);

    return drivers.map((driver) => {
      // Derive SALLY access status
      let sallyAccessStatus: 'ACTIVE' | 'INVITED' | 'NO_ACCESS' | 'DEACTIVATED' = 'NO_ACCESS';
      let linkedUserId: string | null = null;
      let pendingInvitationId: string | null = null;

      if (driver.user) {
        linkedUserId = driver.user.userId;
        sallyAccessStatus = driver.user.isActive ? 'ACTIVE' : 'DEACTIVATED';
      } else if (driver.invitations?.length > 0) {
        sallyAccessStatus = 'INVITED';
        pendingInvitationId = driver.invitations[0].invitationId;
      }

      return {
        id: driver.id,
        driver_id: driver.driverId,
        name: driver.name,
        license_number: driver.licenseNumber,
        phone: driver.phone,
        email: driver.email,
        status: driver.status,
        is_active: driver.isActive,
        external_driver_id: driver.externalDriverId,
        external_source: driver.externalSource,
        last_synced_at: driver.lastSyncedAt?.toISOString(),
        created_at: driver.createdAt.toISOString(),
        updated_at: driver.updatedAt.toISOString(),
        // New SALLY access fields
        sally_access_status: sallyAccessStatus,
        linked_user_id: linkedUserId,
        pending_invitation_id: pendingInvitationId,
      };
    });
  }
```

**Step 3: Verify backend compiles**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/backend/src/domains/fleet/drivers/services/drivers.service.ts apps/backend/src/domains/fleet/drivers/controllers/drivers.controller.ts
git commit -m "feat: include SALLY access status in drivers list response"
```

---

## Task 5: Backend — Modify `acceptInvitation` to auto-activate pending drivers

**Files:**
- Modify: `apps/backend/src/domains/platform/user-invitations/user-invitations.service.ts`
- Test: `apps/backend/src/domains/platform/user-invitations/user-invitations.service.spec.ts`

**Step 1: Write the failing test**

Add to the `acceptInvitation` describe block in `user-invitations.service.spec.ts`:

```typescript
it('should auto-activate PENDING_ACTIVATION driver when invitation accepted', async () => {
  const token = 'valid-token';
  const firebaseUid = 'firebase-uid-456';

  const mockInvitation = {
    id: 1,
    invitationId: 'inv_driver1',
    email: 'driver@example.com',
    firstName: 'Mike',
    lastName: 'Driver',
    role: 'DRIVER',
    tenantId: 1,
    driverId: 5, // Has linked driver
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };

  const mockDriver = {
    id: 5,
    driverId: 'DRV-005',
    status: 'PENDING_ACTIVATION',
  };

  const mockUser = {
    id: 2,
    userId: 'user_driver1',
    email: mockInvitation.email,
    driverId: 5,
  };

  mockPrismaService.userInvitation.findUnique.mockResolvedValue(mockInvitation);
  mockPrismaService.$transaction.mockImplementation(async (callback) => {
    return callback(mockPrismaService);
  });
  mockPrismaService.user.create.mockResolvedValue(mockUser);
  mockPrismaService.userInvitation.update.mockResolvedValue({
    ...mockInvitation,
    status: 'ACCEPTED',
  });

  // Mock for driver lookup and update within transaction
  mockPrismaService.driver.findUnique.mockResolvedValue(mockDriver);
  mockPrismaService.driver.update = jest.fn().mockResolvedValue({
    ...mockDriver,
    status: 'ACTIVE',
    isActive: true,
  });

  await service.acceptInvitation(token, firebaseUid);

  // Verify driver was activated
  expect(mockPrismaService.driver.update).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { id: 5 },
      data: expect.objectContaining({
        status: 'ACTIVE',
        isActive: true,
      }),
    }),
  );
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx jest --testPathPattern="user-invitations.service.spec" --verbose`
Expected: FAIL — driver.update not called

**Step 3: Modify acceptInvitation in UserInvitationsService**

Update the `acceptInvitation` method — after creating the user and before updating the invitation, add driver activation logic. Replace the transaction contents in `user-invitations.service.ts`:

```typescript
  async acceptInvitation(token: string, firebaseUid: string) {
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or invalid');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Invitation is no longer valid');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    // Create user and update invitation in transaction
    return this.prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          userId: generateId('user'),
          tenantId: invitation.tenantId,
          email: invitation.email,
          firstName: invitation.firstName,
          lastName: invitation.lastName,
          role: invitation.role,
          firebaseUid,
          emailVerified: true,
          isActive: true,
          driverId: invitation.driverId,
        },
        include: {
          tenant: true,
          driver: true,
        },
      });

      // If invitation is linked to a driver, auto-activate if pending
      if (invitation.driverId) {
        const driver = await tx.driver.findUnique({
          where: { id: invitation.driverId },
        });

        if (driver && driver.status === 'PENDING_ACTIVATION') {
          await tx.driver.update({
            where: { id: invitation.driverId },
            data: {
              status: 'ACTIVE',
              isActive: true,
              activatedAt: new Date(),
              activatedBy: user.id,
            },
          });
        }
      }

      // Update invitation status
      await tx.userInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          acceptedByUserId: user.id,
        },
      });

      return user;
    });
  }
```

**Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx jest --testPathPattern="user-invitations.service.spec" --verbose`
Expected: PASS

**Step 5: Run all backend tests**

Run: `cd apps/backend && npx jest --verbose`
Expected: All tests pass

**Step 6: Commit**

```bash
git add apps/backend/src/domains/platform/user-invitations/user-invitations.service.ts apps/backend/src/domains/platform/user-invitations/user-invitations.service.spec.ts
git commit -m "feat: auto-activate pending drivers when invitation is accepted"
```

---

## Task 6: Frontend — Update Driver types and API client

**Files:**
- Modify: `apps/web/src/features/fleet/drivers/types.ts`
- Modify: `apps/web/src/features/fleet/drivers/api.ts`
- Modify: `apps/web/src/features/fleet/drivers/index.ts`

**Step 1: Update Driver types**

Add to `types.ts` — add SALLY access fields to Driver interface and new types:

```typescript
export interface Driver {
  id: string;
  driver_id: string;
  name: string;
  license_number: string;
  phone?: string;
  email?: string;
  status?: string;
  current_hos?: {
    drive_remaining: number;
    shift_remaining: number;
    cycle_remaining: number;
    break_required: boolean;
  };
  // External sync metadata
  external_driver_id?: string;
  external_source?: string;
  hos_data_source?: string;
  hos_data_synced_at?: string;
  hos_manual_override?: boolean;
  last_synced_at?: string;
  created_at?: string;
  updated_at?: string;
  // SALLY access status (new)
  sally_access_status?: 'ACTIVE' | 'INVITED' | 'NO_ACCESS' | 'DEACTIVATED';
  linked_user_id?: string;
  pending_invitation_id?: string;
}

// ... keep existing CreateDriverRequest, UpdateDriverRequest, DriverHOS ...

export interface ActivateAndInviteRequest {
  email?: string;
}

export interface ActivateAndInviteResponse {
  driver: Driver;
  invitation: {
    invitationId: string;
    email: string;
    status: string;
  };
}
```

**Step 2: Update API client**

Add new methods to `api.ts`:

```typescript
  /**
   * Activate a driver AND send SALLY invitation in one step
   */
  activateAndInvite: async (driverId: string, email?: string): Promise<ActivateAndInviteResponse> => {
    return apiClient<ActivateAndInviteResponse>(`/drivers/${driverId}/activate-and-invite`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Get pending activation drivers
   */
  getPending: async (): Promise<any[]> => {
    return apiClient<any[]>('/drivers/pending/list');
  },

  /**
   * Get inactive drivers
   */
  getInactive: async (): Promise<any[]> => {
    return apiClient<any[]>('/drivers/inactive/list');
  },

  /**
   * Activate a pending driver (fleet activation only, no SALLY invite)
   */
  activate: async (driverId: string): Promise<any> => {
    return apiClient(`/drivers/${driverId}/activate`, { method: 'POST' });
  },

  /**
   * Deactivate a driver
   */
  deactivate: async (driverId: string, reason?: string): Promise<any> => {
    return apiClient(`/drivers/${driverId}/deactivate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Reactivate an inactive driver
   */
  reactivate: async (driverId: string): Promise<any> => {
    return apiClient(`/drivers/${driverId}/reactivate`, { method: 'POST' });
  },
```

**Step 3: Update index exports**

Add `ActivateAndInviteRequest`, `ActivateAndInviteResponse` to the type exports in `index.ts`.

**Step 4: Verify frontend compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add apps/web/src/features/fleet/drivers/types.ts apps/web/src/features/fleet/drivers/api.ts apps/web/src/features/fleet/drivers/index.ts
git commit -m "feat: add SALLY access types and API methods for drivers"
```

---

## Task 7: Frontend — Add InviteDriverDialog component

**Files:**
- Create: `apps/web/src/features/fleet/drivers/components/invite-driver-dialog.tsx`
- Modify: `apps/web/src/features/fleet/drivers/index.ts`

**Step 1: Create InviteDriverDialog component**

Create `apps/web/src/features/fleet/drivers/components/invite-driver-dialog.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Badge } from '@/shared/components/ui/badge';
import { driversApi } from '../api';

interface InviteDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: {
    driver_id: string;
    name: string;
    email?: string | null;
    external_source?: string;
  } | null;
}

export function InviteDriverDialog({
  open,
  onOpenChange,
  driver,
}: InviteDriverDialogProps) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const needsEmail = !driver?.email;

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!driver) return;
      const emailToUse = needsEmail ? email : undefined;
      return driversApi.activateAndInvite(driver.driver_id, emailToUse);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      setEmail('');
      setError(null);
      onOpenChange(false);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to send invitation');
    },
  });

  const handleSubmit = () => {
    if (needsEmail && !email.trim()) {
      setError('Email is required to send an invitation');
      return;
    }
    if (needsEmail && !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setError(null);
    inviteMutation.mutate();
  };

  if (!driver) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite {driver.name} to SALLY</DialogTitle>
          <DialogDescription>
            An invitation email will be sent. {driver.name} will set a password to log in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-md bg-muted p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-foreground">Name</span>
              <span className="text-sm text-foreground">{driver.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-foreground">Driver ID</span>
              <span className="text-sm font-mono text-foreground">{driver.driver_id}</span>
            </div>
            {driver.email && (
              <div className="flex justify-between">
                <span className="text-sm font-medium text-foreground">Email</span>
                <span className="text-sm text-foreground">{driver.email}</span>
              </div>
            )}
            {driver.external_source && (
              <div className="flex justify-between">
                <span className="text-sm font-medium text-foreground">Source</span>
                <Badge variant="outline">{driver.external_source}</Badge>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm font-medium text-foreground">Role</span>
              <Badge variant="muted">Driver</Badge>
            </div>
          </div>

          {needsEmail && (
            <div>
              <Label htmlFor="driver-email">Email Address</Label>
              <Input
                id="driver-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="driver@example.com"
                className="bg-background mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                This email will be saved to the driver&apos;s profile and used for login.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={inviteMutation.isPending}
          >
            {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default InviteDriverDialog;
```

**Step 2: Add export to index.ts**

Add to `apps/web/src/features/fleet/drivers/index.ts`:

```typescript
export { default as InviteDriverDialog } from './components/invite-driver-dialog';
```

**Step 3: Verify frontend compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/web/src/features/fleet/drivers/components/invite-driver-dialog.tsx apps/web/src/features/fleet/drivers/index.ts
git commit -m "feat: add InviteDriverDialog component for SALLY invitations"
```

---

## Task 8: Frontend — Rebuild Fleet Drivers page with SALLY Access column

**Files:**
- Rewrite: `apps/web/src/features/fleet/drivers/components/driver-list.tsx`
- Rewrite: `apps/web/src/app/(dashboard)/drivers/page.tsx`

**Step 1: Rewrite DriverList component**

Replace the entire content of `apps/web/src/features/fleet/drivers/components/driver-list.tsx` with a new version that includes:
- SALLY Access column in All Drivers tab with status badges
- "Invite to SALLY" button for drivers with NO_ACCESS
- Resend/Cancel actions for INVITED drivers
- Deactivate access for ACTIVE drivers
- "Activate & Invite" button in Pending tab alongside existing "Activate"
- Uses `driversApi` methods instead of raw fetch

Key changes to the All Drivers tab table:
- Add columns: SALLY Access (status badge), License
- Add action column with context-dependent buttons:
  - NO_ACCESS: "Invite to SALLY" primary button
  - INVITED: dropdown with Resend, Cancel
  - ACTIVE: dropdown with Deactivate access
  - DEACTIVATED: dropdown with Reactivate access

Key changes to the Pending tab:
- Add "Activate & Invite" button next to existing "Activate" button
- Add bulk "Activate & Invite All" button at bottom

The SALLY Access badge component:
```tsx
const getSallyAccessBadge = (status: string | undefined) => {
  switch (status) {
    case 'ACTIVE':
      return <Badge variant="default">Active</Badge>;
    case 'INVITED':
      return <Badge variant="muted">Invited</Badge>;
    case 'DEACTIVATED':
      return <Badge variant="destructive">Deactivated</Badge>;
    default:
      return <Badge variant="outline">No Access</Badge>;
  }
};
```

**Step 2: Update Drivers page**

Update `apps/web/src/app/(dashboard)/drivers/page.tsx` to:
- Import `InviteDriverDialog`
- Add state for invite dialog and selected driver
- Pass `onInviteClick` callback to DriverList
- Keep existing activate/deactivate dialog support

**Step 3: Verify it compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

**Step 4: Visual check**

Open the app and navigate to Fleet → Drivers. Verify:
- All Drivers tab shows SALLY Access column with status badges
- "Invite to SALLY" button appears for drivers without access
- Clicking "Invite to SALLY" opens the InviteDriverDialog
- Pending tab shows both "Activate" and "Activate & Invite" buttons

**Step 5: Commit**

```bash
git add apps/web/src/features/fleet/drivers/components/driver-list.tsx apps/web/src/app/(dashboard)/drivers/page.tsx
git commit -m "feat: add SALLY Access column and Invite to SALLY flow on Drivers page"
```

---

## Task 9: Frontend — Rebuild Team page with Staff/Drivers/Invitations tabs

**Files:**
- Rewrite: `apps/web/src/features/platform/users/components/user-list.tsx`
- Rewrite: `apps/web/src/features/platform/users/components/invite-user-dialog.tsx`
- Rewrite: `apps/web/src/app/(dashboard)/users/page.tsx`

**Step 1: Rewrite UserList with 3 role-based tabs**

Replace `user-list.tsx` with a new version that has:

**Tab 1: Staff** — Only shows users with role ADMIN, DISPATCHER, OWNER
- Columns: Name, Email, Role (badge), Status (badge), Last Login, Actions
- Filter out DRIVER role users from this tab

**Tab 2: Drivers** — Only shows users with role DRIVER
- Columns: Name, Driver ID, Email, Source (badge), Status (badge), Actions
- Each driver user has `driver` relation data from the backend
- Hint text at bottom: "To invite more drivers, go to Fleet → Drivers" (with Link)
- Row actions: View in Fleet, Deactivate access, Remove from team

**Tab 3: Invitations** — All pending invitations
- Columns: Name, Email, Role (badge), Invited By, Sent (relative time), Expires (countdown with warning), Actions
- Actions: Resend button, Cancel button
- Resend calls `POST /invitations/:id/resend`
- Expiry warning: show amber indicator when < 2 days remaining

Key implementation notes:
- Use `useQuery` with queryKey `['users']` to fetch users, then filter client-side
- Staff = `users.filter(u => u.role !== 'DRIVER')`
- Drivers = `users.filter(u => u.role === 'DRIVER')`
- Add resend mutation: `POST /invitations/${invitationId}/resend`
- Use relative time formatting for "Sent" column (e.g., "2d ago")
- Use countdown for "Expires" column (e.g., "5 days", "1 day ⚠️")

**Step 2: Update InviteUserDialog to be staff-only**

Modify `invite-user-dialog.tsx`:
- Remove DRIVER from role options in the Select
- Only show ADMIN and DISPATCHER
- Remove the driverId field entirely
- Add hint: "To add drivers, use Fleet → Drivers"
- Update dialog title from "Invite Team Member" to "Invite Staff Member"

**Step 3: Update Team page**

Update `apps/web/src/app/(dashboard)/users/page.tsx`:
- Change heading from "Team Management" to "Team"
- Update subtitle to "Manage your team's access to SALLY"

**Step 4: Verify it compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

**Step 5: Visual check**

Navigate to Team page. Verify:
- Staff tab shows only admins/dispatchers/owners
- Drivers tab shows only driver-role users
- Invitations tab shows all pending invitations with Resend/Cancel
- Invite dialog only offers Admin/Dispatcher roles

**Step 6: Commit**

```bash
git add apps/web/src/features/platform/users/components/user-list.tsx apps/web/src/features/platform/users/components/invite-user-dialog.tsx apps/web/src/app/(dashboard)/users/page.tsx
git commit -m "feat: redesign Team page with Staff, Drivers, and Invitations tabs"
```

---

## Task 10: Frontend — Update navigation routes

**Files:**
- Modify: `apps/web/src/shared/lib/navigation.ts`
- Create: `apps/web/src/app/(dashboard)/team/page.tsx`

**Step 1: Create the new `/team` route page**

Create `apps/web/src/app/(dashboard)/team/page.tsx` — this is the same content as the current `users/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { UserList, InviteUserDialog } from "@/features/platform/users";

export default function TeamPage() {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Team
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your team&apos;s access to SALLY
        </p>
      </div>

      <UserList onInviteClick={() => setInviteDialogOpen(true)} />
      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />
    </div>
  );
}
```

**Step 2: Update the old `/users/page.tsx` to redirect to `/team`**

Replace `apps/web/src/app/(dashboard)/users/page.tsx` with a redirect:

```tsx
import { redirect } from 'next/navigation';

export default function UsersPage() {
  redirect('/team');
}
```

**Step 3: Update navigation config**

In `apps/web/src/shared/lib/navigation.ts`:
- Change `{ label: 'Team', href: '/users', icon: Users }` → `{ label: 'Team', href: '/team', icon: Users }`
- Remove `{ label: 'Drivers', href: '/drivers', icon: Truck }` from admin/owner nav (it stays under Fleet/Operations section)
- Add `/team` to `protectedRoutePatterns`
- Update `getDefaultRouteForRole` if ADMIN → `/admin/dashboard` redirect after login sends to `/users` → now should go to `/team` (check accept-invitation-form.tsx)

Check `apps/web/src/features/auth/components/accept-invitation-form.tsx` for any hardcoded `/users` redirects and update to `/team`.

**Step 4: Verify it compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

**Step 5: Visual check**

- Navigate to `/team` — should show the new Team page
- Navigate to `/users` — should redirect to `/team`
- Sidebar for admin/owner: "Team" link points to `/team`, no separate "Drivers" entry (drivers accessible via Fleet section)

**Step 6: Commit**

```bash
git add apps/web/src/app/(dashboard)/team/page.tsx apps/web/src/app/(dashboard)/users/page.tsx apps/web/src/shared/lib/navigation.ts apps/web/src/features/auth/components/accept-invitation-form.tsx
git commit -m "feat: rename /users to /team, update navigation, add redirect"
```

---

## Task 11: Backend — Verify full backend test suite passes

**Files:** None (verification only)

**Step 1: Run all backend tests**

Run: `cd apps/backend && npx jest --verbose`
Expected: All tests pass

**Step 2: Start backend and test endpoints manually**

Run: `cd apps/backend && npm run start:dev`

Test new endpoints with curl or via frontend:
1. `GET /api/v1/drivers` — verify `sally_access_status` field in response
2. `POST /api/v1/drivers/:id/activate-and-invite` — verify creates invitation
3. `POST /api/v1/invitations/:id/resend` — verify regenerates token

**Step 3: If any test failures, fix and re-run**

---

## Task 12: Frontend — End-to-end visual verification

**Files:** None (verification only)

**Step 1: Start the full stack**

Run: `pnpm dev` (from root)

**Step 2: Verify Team page (`/team`)**

Check:
- [ ] Staff tab shows admins and dispatchers only
- [ ] Drivers tab shows driver-role users with "View in Fleet" link
- [ ] Invitations tab shows all pending invitations
- [ ] Resend button works on invitations
- [ ] Cancel button works on invitations
- [ ] Invite Staff dialog opens with Admin/Dispatcher roles only
- [ ] "To invite more drivers, go to Fleet → Drivers" hint shows in Drivers tab

**Step 3: Verify Fleet Drivers page (`/drivers`)**

Check:
- [ ] SALLY Access column shows with correct badges
- [ ] "Invite to SALLY" button appears for NO_ACCESS drivers
- [ ] InviteDriverDialog opens with pre-filled driver info
- [ ] Dialog prompts for email when driver has none
- [ ] Pending tab shows "Activate" and "Activate & Invite" buttons
- [ ] Inactive tab shows "Reactivate" button

**Step 4: Verify dark theme works for all new UI**

Toggle dark mode and verify:
- [ ] All text readable
- [ ] Badges have proper contrast
- [ ] Dialog backgrounds correct
- [ ] No hardcoded light-only colors

**Step 5: Verify responsive at 375px, 768px, 1440px**

- [ ] Tables scroll horizontally on mobile
- [ ] Buttons stack appropriately
- [ ] Dialog fits mobile screens

**Step 6: Final commit**

If any fixes were needed:
```bash
git add -A
git commit -m "fix: visual and responsive fixes for Team and Drivers pages"
```
