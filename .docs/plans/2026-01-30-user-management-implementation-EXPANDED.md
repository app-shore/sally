# User Management System Implementation Plan (EXPANDED)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement complete user management system with Firebase authentication, tenant registration with approval, dispatcher invitations, driver sync/activation, onboarding wizard, and user management UI.

**Architecture:** Firebase handles authentication (email/password, verification, reset), backend validates Firebase tokens and issues SALLY JWTs with tenant context, multi-step onboarding wizard guides new tenants through setup, admin portal for SALLY team approves tenants, drivers auto-sync from Samsara and require manual activation.

**Tech Stack:** Firebase Auth (frontend + admin SDK), NestJS backend (Prisma, JWT), Next.js 15 frontend (Zustand, React Query, Shadcn UI), existing integration infrastructure (Samsara, Truckbase).

---

## Implementation Phases

**Phase 1:** Database Schema & Migrations (Tasks 1-2) ✅ COMPLETED
**Phase 2:** Backend - Firebase Integration & Auth (Tasks 3-5) ✅ COMPLETED
**Phase 3:** Backend - Tenant Registration & Approval (Task 6) ✅ COMPLETED
**Phase 4:** Backend - User Invitations (Tasks 7-9)
**Phase 5:** Backend - Driver Activation & Status (Tasks 10-12)
**Phase 6:** Frontend - Firebase Setup & Auth (Tasks 13-15)
**Phase 7:** Frontend - Tenant Registration (Tasks 16-17)
**Phase 8:** Frontend - SUPER_ADMIN Portal (Tasks 18-19)
**Phase 9:** Frontend - User Management UI (Tasks 20-22)
**Phase 10:** Frontend - Driver Management UI (Tasks 23-25)
**Phase 11:** Frontend - Onboarding Wizard (Tasks 26-28)
**Phase 12:** Integration & Testing (Tasks 29-30)

---

## PHASE 4: BACKEND - USER INVITATIONS

### Task 7: Create User Invitation DTOs

**Files:**
- Create: `apps/backend/src/api/user-invitations/dto/invite-user.dto.ts`

**Step 1: Create invitation DTOs**

Create `apps/backend/src/api/user-invitations/dto/invite-user.dto.ts`:

```typescript
import { IsString, IsEmail, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '@prisma/client';

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEnum(UserRole)
  role: UserRole;

  /**
   * Optional driver ID to link (for DRIVER role only)
   * Used when inviting a user account for an existing driver
   */
  @IsOptional()
  @IsString()
  driverId?: string;
}

export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  firebaseUid: string;
}
```

**Step 2: Commit**

```bash
git add apps/backend/src/api/user-invitations/dto/
git commit -m "feat(invitations): add invitation DTOs"
```

---

### Task 8: Create UserInvitationsService with TDD

**Files:**
- Create: `apps/backend/src/api/user-invitations/user-invitations.service.ts`
- Create: `apps/backend/src/api/user-invitations/user-invitations.service.spec.ts`

**Step 1: Update Prisma schema to add missing fields**

Modify `apps/backend/prisma/schema.prisma` - add missing fields to UserInvitation:

```prisma
model UserInvitation {
  id                    Int           @id @default(autoincrement())
  invitationId          String        @unique @default(uuid()) @map("invitation_id")

  tenant                Tenant        @relation(fields: [tenantId], references: [id])
  tenantId              Int           @map("tenant_id")

  email                 String        @db.VarChar(255)
  firstName             String        @map("first_name") @db.VarChar(100)
  lastName              String        @map("last_name") @db.VarChar(100)
  role                  UserRole

  // Optional driver link (for DRIVER role invitations)
  driverId              Int?          @map("driver_id")
  driver                Driver?       @relation(fields: [driverId], references: [id])

  token                 String        @unique @db.VarChar(255)
  expiresAt             DateTime      @map("expires_at") @db.Timestamptz

  invitedBy             Int           @map("invited_by")
  invitedByUser         User          @relation("InvitedBy", fields: [invitedBy], references: [id])

  status                InvitationStatus @default(PENDING)
  acceptedAt            DateTime?     @map("accepted_at") @db.Timestamptz
  acceptedByUserId      Int?          @map("accepted_by_user_id")
  acceptedByUser        User?         @relation("AcceptedBy", fields: [acceptedByUserId], references: [id])

  cancelledAt           DateTime?     @map("cancelled_at") @db.Timestamptz
  cancellationReason    String?       @map("cancellation_reason")

  createdAt             DateTime      @default(now()) @map("created_at") @db.Timestamptz

  @@index([tenantId])
  @@index([token])
  @@index([email])
  @@index([expiresAt])
  @@index([status])
  @@index([driverId])
  @@map("user_invitations")
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  CANCELLED
  EXPIRED
}
```

Also add the relation to Driver model:

```prisma
model Driver {
  // ... existing fields
  invitations           UserInvitation[]
  // ... rest of model
}
```

**Step 2: Run migration**

```bash
cd apps/backend
npx prisma migrate dev --name add_invitation_status_and_driver_link
```

Expected: Migration created and applied successfully

**Step 3: Write test for UserInvitationsService**

Create `apps/backend/src/api/user-invitations/user-invitations.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UserInvitationsService } from './user-invitations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('UserInvitationsService', () => {
  let service: UserInvitationsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    userInvitation: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    driver: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserInvitationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UserInvitationsService>(UserInvitationsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('inviteUser', () => {
    it('should create invitation for new user', async () => {
      const inviteDto = {
        email: 'newuser@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'DISPATCHER' as any,
      };
      const currentUser = { id: 1, tenant: { id: 1 } };

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.userInvitation.findFirst.mockResolvedValue(null);
      mockPrismaService.userInvitation.create.mockResolvedValue({
        id: 1,
        invitationId: 'inv_abc123',
        email: inviteDto.email,
        status: 'PENDING',
      });

      const result = await service.inviteUser(inviteDto, currentUser);

      expect(result.status).toBe('PENDING');
      expect(mockPrismaService.userInvitation.create).toHaveBeenCalled();
    });

    it('should throw error if user already exists', async () => {
      const inviteDto = {
        email: 'existing@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'DISPATCHER' as any,
      };

      mockPrismaService.user.findFirst.mockResolvedValue({ id: 1 });

      await expect(
        service.inviteUser(inviteDto, { id: 1, tenant: { id: 1 } }),
      ).rejects.toThrow(ConflictException);
    });

    it('should validate driver exists when driverId provided', async () => {
      const inviteDto = {
        email: 'driver@example.com',
        firstName: 'Mike',
        lastName: 'Driver',
        role: 'DRIVER' as any,
        driverId: 'driver_123',
      };

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.userInvitation.findFirst.mockResolvedValue(null);
      mockPrismaService.driver.findUnique.mockResolvedValue({
        id: 1,
        driverId: 'driver_123',
        tenantId: 1,
        user: null,
      });
      mockPrismaService.userInvitation.create.mockResolvedValue({
        id: 1,
        status: 'PENDING',
      });

      await service.inviteUser(inviteDto, { id: 1, tenant: { id: 1 } });

      expect(mockPrismaService.driver.findUnique).toHaveBeenCalledWith({
        where: { driverId: 'driver_123' },
        include: { user: true },
      });
    });
  });

  describe('acceptInvitation', () => {
    it('should accept valid invitation and create user', async () => {
      const token = 'valid-token';
      const firebaseUid = 'firebase-uid-123';

      const mockInvitation = {
        id: 1,
        invitationId: 'inv_abc',
        email: 'newuser@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'DISPATCHER',
        tenantId: 1,
        driverId: null,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const mockUser = {
        id: 1,
        userId: 'user_abc123',
        email: mockInvitation.email,
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

      const result = await service.acceptInvitation(token, firebaseUid);

      expect(result).toEqual(mockUser);
    });

    it('should throw error if invitation expired', async () => {
      mockPrismaService.userInvitation.findUnique.mockResolvedValue({
        id: 1,
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });

      await expect(
        service.acceptInvitation('token', 'firebase-uid'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getInvitations', () => {
    it('should return invitations for tenant', async () => {
      const mockInvitations = [
        { id: 1, email: 'user1@example.com', status: 'PENDING' },
        { id: 2, email: 'user2@example.com', status: 'ACCEPTED' },
      ];

      mockPrismaService.userInvitation.findMany.mockResolvedValue(mockInvitations);

      const result = await service.getInvitations(1);

      expect(result).toEqual(mockInvitations);
    });
  });

  describe('cancelInvitation', () => {
    it('should cancel pending invitation', async () => {
      const mockInvitation = {
        id: 1,
        invitationId: 'inv_abc',
        tenantId: 1,
        status: 'PENDING',
      };

      mockPrismaService.userInvitation.findUnique.mockResolvedValue(mockInvitation);
      mockPrismaService.userInvitation.update.mockResolvedValue({
        ...mockInvitation,
        status: 'CANCELLED',
      });

      const result = await service.cancelInvitation('inv_abc', 1, 'No longer needed');

      expect(result.status).toBe('CANCELLED');
    });

    it('should throw error if invitation already accepted', async () => {
      mockPrismaService.userInvitation.findUnique.mockResolvedValue({
        id: 1,
        tenantId: 1,
        status: 'ACCEPTED',
      });

      await expect(
        service.cancelInvitation('inv_abc', 1, 'reason'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
```

**Step 4: Run test to verify it fails**

```bash
npm test -- user-invitations.service.spec.ts
```

Expected: Tests fail with "Cannot find module './user-invitations.service'"

**Step 5: Implement UserInvitationsService**

Create `apps/backend/src/api/user-invitations/user-invitations.service.ts`:

```typescript
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { generateId } from '../../common/utils/id-generator';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 32);

@Injectable()
export class UserInvitationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Invite a new user to the tenant
   */
  async inviteUser(dto: InviteUserDto, currentUser: any) {
    const tenantId = currentUser.tenant.id;

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        tenantId,
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists in your organization');
    }

    // Check if pending invitation exists
    const existingInvitation = await this.prisma.userInvitation.findFirst({
      where: {
        email: dto.email,
        tenantId,
        status: 'PENDING',
      },
    });

    if (existingInvitation) {
      throw new ConflictException('Invitation already sent to this email');
    }

    // If driver ID provided, verify driver exists and is not linked
    let driverIdInt: number | null = null;
    if (dto.driverId) {
      const driver = await this.prisma.driver.findUnique({
        where: { driverId: dto.driverId },
        include: { user: true },
      });

      if (!driver) {
        throw new NotFoundException('Driver not found');
      }

      if (driver.user) {
        throw new ConflictException('Driver is already linked to a user account');
      }

      if (driver.tenantId !== tenantId) {
        throw new BadRequestException('Driver does not belong to your organization');
      }

      driverIdInt = driver.id;
    }

    // Create invitation
    const token = nanoid();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return this.prisma.userInvitation.create({
      data: {
        invitationId: generateId('inv'),
        tenantId,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        driverId: driverIdInt,
        token,
        invitedBy: currentUser.id,
        status: 'PENDING',
        expiresAt,
      },
    });
  }

  /**
   * Get all invitations for a tenant
   */
  async getInvitations(tenantId: number, status?: string) {
    return this.prisma.userInvitation.findMany({
      where: {
        tenantId,
        ...(status && { status: status as any }),
      },
      include: {
        invitedByUser: {
          select: {
            userId: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        driver: {
          select: {
            driverId: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Accept invitation and create user
   */
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

  /**
   * Cancel invitation
   */
  async cancelInvitation(invitationId: string, tenantId: number, reason?: string) {
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.tenantId !== tenantId) {
      throw new BadRequestException('Invitation does not belong to your organization');
    }

    if (invitation.status === 'ACCEPTED') {
      throw new BadRequestException('Cannot cancel accepted invitation');
    }

    if (invitation.status === 'CANCELLED') {
      throw new BadRequestException('Invitation is already cancelled');
    }

    return this.prisma.userInvitation.update({
      where: { invitationId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });
  }

  /**
   * Get invitation by token (for public acceptance page)
   */
  async getInvitationByToken(token: string) {
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { token },
      include: {
        tenant: {
          select: {
            tenantId: true,
            companyName: true,
            subdomain: true,
          },
        },
        invitedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Invitation is no longer valid');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    return invitation;
  }
}
```

**Step 6: Run tests to verify they pass**

```bash
npm test -- user-invitations.service.spec.ts
```

Expected: All tests pass

**Step 7: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/ apps/backend/src/api/user-invitations/
git commit -m "feat(invitations): add user invitation service with TDD"
```

---

### Task 9: Create UserInvitationsController

**Files:**
- Create: `apps/backend/src/api/user-invitations/user-invitations.controller.ts`
- Create: `apps/backend/src/api/user-invitations/user-invitations.module.ts`
- Modify: `apps/backend/src/app.module.ts`

**Step 1: Create UserInvitationsController**

Create `apps/backend/src/api/user-invitations/user-invitations.controller.ts`:

```typescript
import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { UserInvitationsService } from './user-invitations.service';
import { InviteUserDto, AcceptInvitationDto } from './dto/invite-user.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('invitations')
export class UserInvitationsController {
  constructor(
    private readonly userInvitationsService: UserInvitationsService,
  ) {}

  /**
   * Invite a new user (ADMIN only)
   */
  @Roles(UserRole.ADMIN)
  @Post()
  async inviteUser(
    @Body() dto: InviteUserDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.userInvitationsService.inviteUser(dto, currentUser);
  }

  /**
   * Get all invitations for tenant (ADMIN only)
   */
  @Roles(UserRole.ADMIN)
  @Get()
  async getInvitations(
    @CurrentUser() currentUser: any,
    @Query('status') status?: string,
  ) {
    return this.userInvitationsService.getInvitations(
      currentUser.tenant.id,
      status,
    );
  }

  /**
   * Get invitation details by token (PUBLIC - for acceptance page)
   */
  @Public()
  @Get('by-token/:token')
  async getInvitationByToken(@Param('token') token: string) {
    return this.userInvitationsService.getInvitationByToken(token);
  }

  /**
   * Accept invitation (PUBLIC)
   */
  @Public()
  @Post('accept')
  async acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.userInvitationsService.acceptInvitation(
      dto.token,
      dto.firebaseUid,
    );
  }

  /**
   * Cancel invitation (ADMIN only)
   */
  @Roles(UserRole.ADMIN)
  @Delete(':invitationId')
  async cancelInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() currentUser: any,
    @Body('reason') reason?: string,
  ) {
    return this.userInvitationsService.cancelInvitation(
      invitationId,
      currentUser.tenant.id,
      reason,
    );
  }
}
```

**Step 2: Create UserInvitationsModule**

Create `apps/backend/src/api/user-invitations/user-invitations.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { UserInvitationsController } from './user-invitations.controller';
import { UserInvitationsService } from './user-invitations.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UserInvitationsController],
  providers: [UserInvitationsService],
  exports: [UserInvitationsService],
})
export class UserInvitationsModule {}
```

**Step 3: Register module in AppModule**

Modify `apps/backend/src/app.module.ts`:

```typescript
import { UserInvitationsModule } from './api/user-invitations/user-invitations.module';

@Module({
  imports: [
    // ... existing imports
    TenantsModule,
    UserInvitationsModule, // Add this
  ],
  // ...
})
export class AppModule {}
```

**Step 4: Build and verify**

```bash
npm run build
```

Expected: Build succeeds

**Step 5: Commit**

```bash
git add apps/backend/src/api/user-invitations/ apps/backend/src/app.module.ts
git commit -m "feat(invitations): add invitation controller and endpoints"
```

---

## PHASE 5: BACKEND - DRIVER ACTIVATION & STATUS

### Task 10: Create Driver Activation Service with TDD

**Files:**
- Create: `apps/backend/src/api/drivers/drivers-activation.service.ts`
- Create: `apps/backend/src/api/drivers/drivers-activation.service.spec.ts`

**Step 1: Write test for driver activation**

Create `apps/backend/src/api/drivers/drivers-activation.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { DriversActivationService } from './drivers-activation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('DriversActivationService', () => {
  let service: DriversActivationService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    driver: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriversActivationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DriversActivationService>(DriversActivationService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('activateDriver', () => {
    it('should activate pending driver', async () => {
      const mockDriver = {
        id: 1,
        driverId: 'driver_123',
        tenantId: 1,
        status: 'PENDING_ACTIVATION',
        isActive: false,
      };

      const currentUser = { id: 1, tenant: { id: 1 } };

      mockPrismaService.driver.findUnique.mockResolvedValue(mockDriver);
      mockPrismaService.driver.update.mockResolvedValue({
        ...mockDriver,
        status: 'ACTIVE',
        isActive: true,
        activatedAt: new Date(),
        activatedBy: currentUser.id,
      });

      const result = await service.activateDriver('driver_123', currentUser);

      expect(result.status).toBe('ACTIVE');
      expect(result.isActive).toBe(true);
    });

    it('should throw error if driver not found', async () => {
      mockPrismaService.driver.findUnique.mockResolvedValue(null);

      await expect(
        service.activateDriver('driver_999', { id: 1, tenant: { id: 1 } }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if driver already active', async () => {
      mockPrismaService.driver.findUnique.mockResolvedValue({
        id: 1,
        status: 'ACTIVE',
        tenantId: 1,
      });

      await expect(
        service.activateDriver('driver_123', { id: 1, tenant: { id: 1 } }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if driver from different tenant', async () => {
      mockPrismaService.driver.findUnique.mockResolvedValue({
        id: 1,
        status: 'PENDING_ACTIVATION',
        tenantId: 2, // Different tenant
      });

      await expect(
        service.activateDriver('driver_123', { id: 1, tenant: { id: 1 } }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPendingDrivers', () => {
    it('should return pending drivers for tenant', async () => {
      const mockDrivers = [
        { id: 1, driverId: 'driver_1', status: 'PENDING_ACTIVATION' },
        { id: 2, driverId: 'driver_2', status: 'PENDING_ACTIVATION' },
      ];

      mockPrismaService.driver.findMany.mockResolvedValue(mockDrivers);

      const result = await service.getPendingDrivers(1);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.driver.findMany).toHaveBeenCalledWith({
        where: { tenantId: 1, status: 'PENDING_ACTIVATION' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- drivers-activation.service.spec.ts
```

Expected: Tests fail with "Cannot find module"

**Step 3: Implement DriversActivationService**

Create `apps/backend/src/api/drivers/drivers-activation.service.ts`:

```typescript
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DriversActivationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Activate a driver (ADMIN only)
   */
  async activateDriver(driverId: string, currentUser: any) {
    const driver = await this.prisma.driver.findUnique({
      where: { driverId },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (driver.tenantId !== currentUser.tenant.id) {
      throw new BadRequestException('Driver does not belong to your organization');
    }

    if (driver.status === 'ACTIVE') {
      throw new BadRequestException('Driver is already active');
    }

    if (driver.status === 'INACTIVE' || driver.status === 'SUSPENDED') {
      throw new BadRequestException(
        `Cannot activate driver with status ${driver.status}. Use reactivate instead.`,
      );
    }

    return this.prisma.driver.update({
      where: { driverId },
      data: {
        status: 'ACTIVE',
        isActive: true,
        activatedAt: new Date(),
        activatedBy: currentUser.id,
      },
    });
  }

  /**
   * Deactivate a driver (ADMIN only)
   */
  async deactivateDriver(driverId: string, currentUser: any, reason: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { driverId },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (driver.tenantId !== currentUser.tenant.id) {
      throw new BadRequestException('Driver does not belong to your organization');
    }

    if (driver.status !== 'ACTIVE') {
      throw new BadRequestException('Only active drivers can be deactivated');
    }

    return this.prisma.driver.update({
      where: { driverId },
      data: {
        status: 'INACTIVE',
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedBy: currentUser.id,
        deactivationReason: reason,
      },
    });
  }

  /**
   * Reactivate an inactive driver (ADMIN only)
   */
  async reactivateDriver(driverId: string, currentUser: any) {
    const driver = await this.prisma.driver.findUnique({
      where: { driverId },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (driver.tenantId !== currentUser.tenant.id) {
      throw new BadRequestException('Driver does not belong to your organization');
    }

    if (driver.status !== 'INACTIVE') {
      throw new BadRequestException('Only inactive drivers can be reactivated');
    }

    return this.prisma.driver.update({
      where: { driverId },
      data: {
        status: 'ACTIVE',
        isActive: true,
        reactivatedAt: new Date(),
        reactivatedBy: currentUser.id,
        // Clear deactivation fields
        deactivatedAt: null,
        deactivatedBy: null,
        deactivationReason: null,
      },
    });
  }

  /**
   * Get all pending drivers (ADMIN only)
   */
  async getPendingDrivers(tenantId: number) {
    return this.prisma.driver.findMany({
      where: {
        tenantId,
        status: 'PENDING_ACTIVATION',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all inactive drivers (ADMIN only)
   */
  async getInactiveDrivers(tenantId: number) {
    return this.prisma.driver.findMany({
      where: {
        tenantId,
        status: 'INACTIVE',
      },
      include: {
        deactivatedByUser: {
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { deactivatedAt: 'desc' },
    });
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- drivers-activation.service.spec.ts
```

Expected: All tests pass

**Step 5: Commit**

```bash
git add apps/backend/src/api/drivers/drivers-activation.service.ts apps/backend/src/api/drivers/drivers-activation.service.spec.ts
git commit -m "feat(drivers): add driver activation service with TDD"
```

---

### Task 11: Add Driver Activation Endpoints

**Files:**
- Modify: `apps/backend/src/api/drivers/drivers.controller.ts`
- Modify: `apps/backend/src/api/drivers/drivers.module.ts`

**Step 1: Add activation endpoints to DriversController**

Modify `apps/backend/src/api/drivers/drivers.controller.ts`:

```typescript
import { DriversActivationService } from './drivers-activation.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('drivers')
export class DriversController {
  constructor(
    private readonly driversService: DriversService,
    private readonly driversActivationService: DriversActivationService, // Add this
  ) {}

  // ... existing endpoints

  /**
   * Get pending drivers (ADMIN only)
   */
  @Roles(UserRole.ADMIN)
  @Get('pending')
  async getPendingDrivers(@CurrentUser() currentUser: any) {
    return this.driversActivationService.getPendingDrivers(currentUser.tenant.id);
  }

  /**
   * Get inactive drivers (ADMIN only)
   */
  @Roles(UserRole.ADMIN)
  @Get('inactive')
  async getInactiveDrivers(@CurrentUser() currentUser: any) {
    return this.driversActivationService.getInactiveDrivers(currentUser.tenant.id);
  }

  /**
   * Activate a driver (ADMIN only)
   */
  @Roles(UserRole.ADMIN)
  @Post(':driverId/activate')
  async activateDriver(
    @Param('driverId') driverId: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.driversActivationService.activateDriver(driverId, currentUser);
  }

  /**
   * Deactivate a driver (ADMIN only)
   */
  @Roles(UserRole.ADMIN)
  @Post(':driverId/deactivate')
  async deactivateDriver(
    @Param('driverId') driverId: string,
    @CurrentUser() currentUser: any,
    @Body('reason') reason: string,
  ) {
    return this.driversActivationService.deactivateDriver(driverId, currentUser, reason);
  }

  /**
   * Reactivate a driver (ADMIN only)
   */
  @Roles(UserRole.ADMIN)
  @Post(':driverId/reactivate')
  async reactivateDriver(
    @Param('driverId') driverId: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.driversActivationService.reactivateDriver(driverId, currentUser);
  }
}
```

**Step 2: Register service in DriversModule**

Modify `apps/backend/src/api/drivers/drivers.module.ts`:

```typescript
import { DriversActivationService } from './drivers-activation.service';

@Module({
  imports: [PrismaModule],
  controllers: [DriversController],
  providers: [
    DriversService,
    DriversActivationService, // Add this
  ],
  exports: [DriversService, DriversActivationService],
})
export class DriversModule {}
```

**Step 3: Build and verify**

```bash
npm run build
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add apps/backend/src/api/drivers/
git commit -m "feat(drivers): add driver activation endpoints"
```

---

### Task 12: Update Driver Sync to Set PENDING_ACTIVATION Status

**Files:**
- Modify: `apps/backend/src/api/integrations/samsara/samsara.service.ts` (or wherever driver sync happens)

**Step 1: Update sync logic to set new drivers as PENDING_ACTIVATION**

Modify driver sync service (example for Samsara):

```typescript
// When creating new driver from external source
const newDriver = await this.prisma.driver.create({
  data: {
    driverId: generateId('driver'),
    tenantId: tenant.id,
    name: externalDriver.name,
    email: externalDriver.email,
    phone: externalDriver.phone,
    licenseNumber: externalDriver.licenseNumber,
    externalDriverId: externalDriver.id,
    externalSource: 'SAMSARA',
    status: 'PENDING_ACTIVATION', // NEW: Set as pending
    isActive: false, // NEW: Inactive until manually activated
    syncStatus: 'SYNCED',
    lastSyncedAt: new Date(),
  },
});

// Log that driver needs activation
console.log(`✅ Synced driver ${newDriver.name} - requires manual activation`);
```

**Step 2: Update existing active drivers to maintain ACTIVE status**

```typescript
// When updating existing driver
const existingDriver = await this.prisma.driver.findUnique({
  where: { externalDriverId: externalDriver.id },
});

if (existingDriver) {
  // Keep existing status if already activated
  await this.prisma.driver.update({
    where: { id: existingDriver.id },
    data: {
      name: externalDriver.name,
      email: externalDriver.email,
      phone: externalDriver.phone,
      // Don't change status - preserve ACTIVE/INACTIVE/etc
      syncStatus: 'SYNCED',
      lastSyncedAt: new Date(),
    },
  });
}
```

**Step 3: Test sync manually**

```bash
# Trigger driver sync (if you have a sync endpoint)
curl -X POST http://localhost:8000/api/v1/integrations/samsara/sync-drivers \
  -H "Authorization: Bearer <token>"
```

Expected: New drivers created with PENDING_ACTIVATION status

**Step 4: Commit**

```bash
git add apps/backend/src/api/integrations/
git commit -m "feat(drivers): set new synced drivers to PENDING_ACTIVATION"
```

---

## PHASE 6: FRONTEND - FIREBASE SETUP & AUTH

### Task 13: Install Firebase SDK (Frontend)

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/src/lib/firebase.ts`

**Step 1: Install Firebase SDK**

```bash
cd apps/web
npm install firebase
```

**Step 2: Add Firebase environment variables**

Add to `apps/web/.env.local`:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sally-route-planning.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sally-route-planning
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=sally-route-planning.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

**Step 3: Create Firebase configuration**

Create `apps/web/src/lib/firebase.ts`:

```typescript
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
```

**Step 4: Commit**

```bash
git add apps/web/package.json apps/web/src/lib/firebase.ts apps/web/.env.local.example
git commit -m "feat(auth): add Firebase SDK configuration"
```

---

### Task 14: Create Auth Store with Zustand

**Files:**
- Create: `apps/web/src/stores/auth-store.ts`

**Step 1: Create auth store**

Create `apps/web/src/stores/auth-store.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'DISPATCHER' | 'DRIVER' | 'SUPER_ADMIN';
  tenantId?: string;
  tenantName?: string;
  driverId?: string;
}

interface AuthState {
  // State
  user: User | null;
  firebaseUser: FirebaseUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<FirebaseUser>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  exchangeFirebaseToken: (firebaseToken: string) => Promise<void>;
  setUser: (user: User | null) => void;
  setFirebaseUser: (firebaseUser: FirebaseUser | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      firebaseUser: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      // Sign in with email/password
      signIn: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const firebaseToken = await userCredential.user.getIdToken();

          // Exchange Firebase token for SALLY JWT
          await get().exchangeFirebaseToken(firebaseToken);

          set({
            firebaseUser: userCredential.user,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Sign up (only creates Firebase account, not SALLY user)
      signUp: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          set({ isLoading: false });
          return userCredential.user;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Sign out
      signOut: async () => {
        await firebaseSignOut(auth);
        set({
          user: null,
          firebaseUser: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      // Reset password
      resetPassword: async (email: string) => {
        await sendPasswordResetEmail(auth, email);
      },

      // Exchange Firebase token for SALLY JWT
      exchangeFirebaseToken: async (firebaseToken: string) => {
        const response = await fetch('/api/v1/auth/firebase/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firebaseToken }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Token exchange failed');
        }

        const data = await response.json();

        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        });
      },

      // Setters
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setFirebaseUser: (firebaseUser) => set({ firebaseUser }),
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
      clearAuth: () =>
        set({
          user: null,
          firebaseUser: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
```

**Step 2: Commit**

```bash
git add apps/web/src/stores/auth-store.ts
git commit -m "feat(auth): add Zustand auth store"
```

---

### Task 15: Create Auth Hook and Firebase Listener

**Files:**
- Create: `apps/web/src/hooks/use-auth.ts`
- Create: `apps/web/src/components/providers/auth-provider.tsx`

**Step 1: Create useAuth hook**

Create `apps/web/src/hooks/use-auth.ts`:

```typescript
import { useAuthStore } from '@/stores/auth-store';

export const useAuth = () => {
  const {
    user,
    firebaseUser,
    accessToken,
    isAuthenticated,
    isLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  } = useAuthStore();

  return {
    user,
    firebaseUser,
    accessToken,
    isAuthenticated,
    isLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    // Convenience checks
    isAdmin: user?.role === 'ADMIN',
    isDispatcher: user?.role === 'DISPATCHER',
    isDriver: user?.role === 'DRIVER',
    isSuperAdmin: user?.role === 'SUPER_ADMIN',
  };
};
```

**Step 2: Create AuthProvider to sync Firebase auth state**

Create `apps/web/src/components/providers/auth-provider.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/stores/auth-store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setFirebaseUser, exchangeFirebaseToken, clearAuth } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setFirebaseUser(firebaseUser);

        // Exchange Firebase token for SALLY JWT
        try {
          const token = await firebaseUser.getIdToken();
          await exchangeFirebaseToken(token);
        } catch (error) {
          console.error('Token exchange failed:', error);
          // If exchange fails, clear auth (might be pending approval, etc.)
          clearAuth();
        }
      } else {
        setFirebaseUser(null);
      }
    });

    return () => unsubscribe();
  }, [setFirebaseUser, exchangeFirebaseToken, clearAuth]);

  return <>{children}</>;
}
```

**Step 3: Add AuthProvider to root layout**

Modify `apps/web/src/app/layout.tsx`:

```typescript
import { AuthProvider } from '@/components/providers/auth-provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

**Step 4: Commit**

```bash
git add apps/web/src/hooks/use-auth.ts apps/web/src/components/providers/auth-provider.tsx apps/web/src/app/layout.tsx
git commit -m "feat(auth): add auth hook and Firebase listener"
```

---

## PHASE 7: FRONTEND - TENANT REGISTRATION

### Task 16: Create Tenant Registration Form

**Files:**
- Create: `apps/web/src/app/register/page.tsx`
- Create: `apps/web/src/components/auth/registration-form.tsx`

**Step 1: Create registration form component**

Create `apps/web/src/components/auth/registration-form.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';

const registrationSchema = z.object({
  // Company info
  companyName: z.string().min(2, 'Company name is required'),
  subdomain: z.string()
    .min(3, 'Subdomain must be at least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
  dotNumber: z.string()
    .length(8, 'DOT number must be exactly 8 digits')
    .regex(/^\d+$/, 'DOT number must be numeric'),
  fleetSize: z.enum(['SIZE_1_10', 'SIZE_11_50', 'SIZE_51_100', 'SIZE_101_500', 'SIZE_500_PLUS']),

  // Admin user info
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Phone number is required'),

  // Password
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

export function RegistrationForm() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
  });

  const subdomain = watch('subdomain');

  // Check subdomain availability
  const checkSubdomain = async (subdomain: string) => {
    if (!subdomain || subdomain.length < 3) return;

    try {
      const response = await fetch(`/api/v1/tenants/check-subdomain/${subdomain}`);
      const data = await response.json();
      setSubdomainAvailable(data.available);
    } catch (err) {
      console.error('Error checking subdomain:', err);
    }
  };

  const onSubmit = async (data: RegistrationFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Create Firebase account
      const firebaseUser = await signUp(data.email, data.password);

      // 2. Register tenant in SALLY backend
      const response = await fetch('/api/v1/tenants/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: data.companyName,
          subdomain: data.subdomain,
          dotNumber: data.dotNumber,
          fleetSize: data.fleetSize,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          firebaseUid: firebaseUser.uid,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      // Success! Redirect to pending approval page
      router.push('/registration/pending-approval');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Register Your Organization</CardTitle>
        <CardDescription>
          Create an account to start managing your fleet with SALLY
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Company Information */}
          <div className="space-y-4">
            <h3 className="font-semibold">Company Information</h3>

            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                {...register('companyName')}
                placeholder="Acme Trucking"
              />
              {errors.companyName && (
                <p className="text-sm text-red-500">{errors.companyName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="subdomain">Subdomain</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="subdomain"
                  {...register('subdomain')}
                  placeholder="acme-trucking"
                  onBlur={(e) => checkSubdomain(e.target.value)}
                />
                <span className="text-muted-foreground">.sally.com</span>
              </div>
              {subdomainAvailable === false && (
                <p className="text-sm text-red-500">Subdomain not available</p>
              )}
              {subdomainAvailable === true && (
                <p className="text-sm text-green-600">Subdomain available!</p>
              )}
              {errors.subdomain && (
                <p className="text-sm text-red-500">{errors.subdomain.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="dotNumber">DOT Number</Label>
              <Input
                id="dotNumber"
                {...register('dotNumber')}
                placeholder="12345678"
                maxLength={8}
              />
              {errors.dotNumber && (
                <p className="text-sm text-red-500">{errors.dotNumber.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="fleetSize">Fleet Size</Label>
              <Select onValueChange={(value) => setValue('fleetSize', value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fleet size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SIZE_1_10">1-10 vehicles</SelectItem>
                  <SelectItem value="SIZE_11_50">11-50 vehicles</SelectItem>
                  <SelectItem value="SIZE_51_100">51-100 vehicles</SelectItem>
                  <SelectItem value="SIZE_101_500">101-500 vehicles</SelectItem>
                  <SelectItem value="SIZE_500_PLUS">500+ vehicles</SelectItem>
                </SelectContent>
              </Select>
              {errors.fleetSize && (
                <p className="text-sm text-red-500">{errors.fleetSize.message}</p>
              )}
            </div>
          </div>

          {/* Admin User Information */}
          <div className="space-y-4">
            <h3 className="font-semibold">Admin User Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" {...register('firstName')} />
                {errors.firstName && (
                  <p className="text-sm text-red-500">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" {...register('lastName')} />
                {errors.lastName && (
                  <p className="text-sm text-red-500">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" {...register('phone')} />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Registering...' : 'Register'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
```

**Step 2: Create registration page**

Create `apps/web/src/app/register/page.tsx`:

```typescript
import { RegistrationForm } from '@/components/auth/registration-form';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <RegistrationForm />
    </div>
  );
}
```

**Step 3: Create pending approval page**

Create `apps/web/src/app/registration/pending-approval/page.tsx`:

```typescript
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle } from 'lucide-react';

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <CardTitle>Registration Complete!</CardTitle>
              <CardDescription>Your account is pending approval</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Thank you for registering with SALLY! Our team will review your application
              and approve your account within 24-48 hours. You'll receive an email once
              your account is activated.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add apps/web/src/app/register/ apps/web/src/components/auth/registration-form.tsx
git commit -m "feat(registration): add tenant registration UI"
```

---

### Task 17: Create Login Page

**Files:**
- Create: `apps/web/src/app/login/page.tsx`
- Create: `apps/web/src/components/auth/login-form.tsx`

**Step 1: Create login form component**

Create `apps/web/src/components/auth/login-form.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await signIn(data.email, data.password);
      router.push('/dashboard');
    } catch (err: any) {
      // Handle specific Firebase errors
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password');
      } else if (err.message?.includes('pending approval')) {
        setError('Your account is pending approval. Please check back later.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign In to SALLY</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="you@company.com"
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary hover:underline">
              Register here
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
```

**Step 2: Create login page**

Create `apps/web/src/app/login/page.tsx`:

```typescript
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <LoginForm />
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/app/login/ apps/web/src/components/auth/login-form.tsx
git commit -m "feat(auth): add login UI"
```

---

## PHASE 8: FRONTEND - SUPER_ADMIN PORTAL

### Task 18: Create SUPER_ADMIN Tenant Approval UI

**Files:**
- Create: `apps/web/src/app/(super-admin)/admin/tenants/page.tsx`
- Create: `apps/web/src/components/super-admin/tenant-list.tsx`

**Step 1: Create tenant list component**

Create `apps/web/src/components/super-admin/tenant-list.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';

export function TenantList() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch tenants
  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants', 'pending'],
    queryFn: async () => {
      const response = await fetch('/api/v1/tenants?status=PENDING_APPROVAL', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch tenants');
      return response.json();
    },
  });

  // Approve tenant mutation
  const approveMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const response = await fetch(`/api/v1/tenants/${tenantId}/approve`, {
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
    },
  });

  // Reject tenant mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ tenantId, reason }: { tenantId: string; reason: string }) => {
      const response = await fetch(`/api/v1/tenants/${tenantId}/reject`, {
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
      setRejectDialogOpen(false);
      setRejectionReason('');
    },
  });

  const handleApprove = (tenant: any) => {
    if (confirm(`Approve ${tenant.companyName}?`)) {
      approveMutation.mutate(tenant.tenantId);
    }
  };

  const handleReject = () => {
    if (selectedTenant && rejectionReason.trim()) {
      rejectMutation.mutate({
        tenantId: selectedTenant.tenantId,
        reason: rejectionReason,
      });
    }
  };

  if (isLoading) {
    return <div>Loading tenants...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pending Tenant Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {tenants?.length === 0 ? (
            <Alert>
              <AlertDescription>No pending tenant approvals</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Subdomain</TableHead>
                  <TableHead>DOT Number</TableHead>
                  <TableHead>Fleet Size</TableHead>
                  <TableHead>Admin User</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants?.map((tenant: any) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.companyName}</TableCell>
                    <TableCell>
                      <code>{tenant.subdomain}.sally.com</code>
                    </TableCell>
                    <TableCell>{tenant.dotNumber}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {tenant.fleetSize?.replace('SIZE_', '')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {tenant.users[0]?.firstName} {tenant.users[0]?.lastName}
                      <br />
                      <span className="text-sm text-muted-foreground">
                        {tenant.users[0]?.email}
                      </span>
                    </TableCell>
                    <TableCell>
                      {tenant.contactEmail}
                      <br />
                      <span className="text-sm text-muted-foreground">
                        {tenant.contactPhone}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(tenant)}
                          disabled={approveMutation.isPending}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedTenant(tenant);
                            setRejectDialogOpen(true);
                          }}
                          disabled={rejectMutation.isPending}
                        >
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Tenant Registration</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedTenant?.companyName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Rejection Reason</Label>
            <Textarea
              id="reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Invalid DOT number, duplicate registration, etc."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

**Step 2: Create super admin tenants page**

Create `apps/web/src/app/(super-admin)/admin/tenants/page.tsx`:

```typescript
import { TenantList } from '@/components/super-admin/tenant-list';

export default function SuperAdminTenantsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Tenant Management</h1>
        <p className="text-muted-foreground">
          Approve or reject tenant registrations
        </p>
      </div>
      <TenantList />
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/app/\(super-admin\)/ apps/web/src/components/super-admin/
git commit -m "feat(super-admin): add tenant approval UI"
```

---

## PHASE 9: FRONTEND - USER MANAGEMENT UI

_Due to length, I'll provide summarized steps for remaining tasks..._

### Task 19-22: User Management UI (Summary)

**Task 19:** Create user list component with tabs (All Users, Active, Pending Invitations)
**Task 20:** Create invite user dialog
**Task 21:** Create user details/edit dialog
**Task 22:** Add user deactivation/reactivation

---

## PHASE 10: FRONTEND - DRIVER MANAGEMENT UI

### Task 23-25: Driver Management UI (Summary)

**Task 23:** Create driver list with status filters (Pending, Active, Inactive)
**Task 24:** Create driver activation dialog
**Task 25:** Create driver deactivation/reactivation flow

---

## PHASE 11: FRONTEND - ONBOARDING WIZARD

### Task 26-28: Onboarding Wizard (Summary)

**Task 26:** Create multi-step wizard component (Welcome, Integrations, Team, Preferences)
**Task 27:** Implement step navigation and progress tracking
**Task 28:** Save onboarding progress to backend

---

## PHASE 12: INTEGRATION & TESTING

### Task 29: Integration Testing

**Files:**
- Create: `apps/backend/test/e2e/user-management.e2e-spec.ts`

**Step 1: Write E2E test for complete registration flow**

```typescript
describe('User Management E2E', () => {
  it('should complete full registration flow', async () => {
    // 1. Register tenant
    // 2. SUPER_ADMIN approves
    // 3. Admin logs in
    // 4. Admin invites user
    // 5. User accepts invitation
  });
});
```

---

### Task 30: Cleanup and Documentation

**Step 1: Remove TODOs**
**Step 2: Add API documentation**
**Step 3: Update README with user management guide**

---

## Execution Notes

- Each task should be completed in order
- Run tests after each implementation step
- Commit after each task completion
- If a test fails, debug before proceeding
- Review code quality before committing

---

**Total Estimated Time:** 60-80 hours for complete implementation
**Dependencies:** Firebase project setup, email service configuration (future)

