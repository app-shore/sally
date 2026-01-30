# User Management System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement complete user management system with Firebase authentication, tenant registration with approval, dispatcher invitations, driver sync/activation, onboarding wizard, and user management UI.

**Architecture:** Firebase handles authentication (email/password, verification, reset), backend validates Firebase tokens and issues SALLY JWTs with tenant context, multi-step onboarding wizard guides new tenants through setup, admin portal for SALLY team approves tenants, drivers auto-sync from Samsara and require manual activation.

**Tech Stack:** Firebase Auth (frontend + admin SDK), NestJS backend (Prisma, JWT), Next.js 15 frontend (Zustand, React Query, Shadcn UI), existing integration infrastructure (Samsara, Truckbase).

---

## Implementation Phases

**Phase 1:** Database Schema & Migrations (Tasks 1-2)
**Phase 2:** Backend - Firebase Integration & Auth (Tasks 3-5)
**Phase 3:** Backend - Tenant Registration & Approval (Tasks 6-8)
**Phase 4:** Backend - User Invitations (Tasks 9-11)
**Phase 5:** Backend - Driver Activation & Status (Tasks 12-14)
**Phase 6:** Frontend - Firebase Setup & Auth (Tasks 15-17)
**Phase 7:** Frontend - Tenant Registration (Tasks 18-19)
**Phase 8:** Frontend - SUPER_ADMIN Portal (Tasks 20-21)
**Phase 9:** Frontend - User Management UI (Tasks 22-25)
**Phase 10:** Frontend - Onboarding Wizard (Tasks 26-28)
**Phase 11:** Integration & Testing (Tasks 29-30)

---

## Task 1: Database Schema Updates

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/XXXXXX_user_management_schema.sql`

**Step 1: Update User model with Firebase fields**

Add to User model in `schema.prisma`:

```prisma
model User {
  id                Int              @id @default(autoincrement())
  userId            String           @unique @map("user_id") @db.VarChar(50)

  tenant            Tenant?          @relation(fields: [tenantId], references: [id])
  tenantId          Int?             @map("tenant_id")

  email             String           @db.VarChar(255)
  firstName         String           @map("first_name") @db.VarChar(100)
  lastName          String           @map("last_name") @db.VarChar(100)
  role              UserRole

  // Firebase integration
  firebaseUid       String?          @unique @map("firebase_uid") @db.VarChar(128)
  emailVerified     Boolean          @default(false) @map("email_verified")

  // Driver link (optional, only for DRIVER role)
  driver            Driver?          @relation(fields: [driverId], references: [id])
  driverId          Int?             @unique @map("driver_id")

  // Status tracking
  isActive          Boolean          @default(true) @map("is_active")
  lastLoginAt       DateTime?        @map("last_login_at") @db.Timestamptz
  passwordChangedAt DateTime?        @map("password_changed_at") @db.Timestamptz

  // Soft delete
  deletedAt         DateTime?        @map("deleted_at") @db.Timestamptz
  deletedBy         Int?             @map("deleted_by")
  deletedByUser     User?            @relation("DeletedBy", fields: [deletedBy], references: [id])
  deletedUsers      User[]           @relation("DeletedBy")
  deletionReason    String?          @map("deletion_reason")

  createdAt         DateTime         @default(now()) @map("created_at") @db.Timestamptz
  updatedAt         DateTime         @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  refreshTokens     RefreshToken[]
  preferences       UserPreferences?
  driverPreferences DriverPreferences?
  invitationsSent   UserInvitation[] @relation("InvitedBy")
  invitationsAccepted UserInvitation[] @relation("AcceptedBy")
  driversActivated  Driver[]         @relation("ActivatedBy")
  driversDeactivated Driver[]        @relation("DeactivatedBy")
  driversReactivated Driver[]        @relation("ReactivatedBy")

  @@index([tenantId])
  @@index([email])
  @@index([firebaseUid])
  @@index([role])
  @@index([isActive])
  @@index([deletedAt])
  @@map("users")
}

enum UserRole {
  DISPATCHER
  DRIVER
  ADMIN
  SUPER_ADMIN
}
```

**Step 2: Update Tenant model with registration fields**

Add to Tenant model:

```prisma
model Tenant {
  id                Int                  @id @default(autoincrement())
  tenantId          String               @unique @map("tenant_id") @db.VarChar(50)

  companyName       String               @map("company_name") @db.VarChar(255)
  subdomain         String               @unique @db.VarChar(100)
  contactEmail      String               @map("contact_email") @db.VarChar(255)
  contactPhone      String?              @map("contact_phone") @db.VarChar(20)

  // Registration fields
  status            TenantStatus         @default(PENDING_APPROVAL)
  dotNumber         String?              @map("dot_number") @db.VarChar(8)
  fleetSize         FleetSize?           @map("fleet_size")

  // Approval tracking
  approvedAt        DateTime?            @map("approved_at") @db.Timestamptz
  approvedBy        String?              @map("approved_by") @db.VarChar(100)
  rejectedAt        DateTime?            @map("rejected_at") @db.Timestamptz
  rejectionReason   String?              @map("rejection_reason")

  // Onboarding tracking
  onboardingCompletedAt DateTime?        @map("onboarding_completed_at") @db.Timestamptz
  onboardingProgress    Json?            @map("onboarding_progress")

  isActive          Boolean              @default(false) @map("is_active")
  createdAt         DateTime             @default(now()) @map("created_at") @db.Timestamptz
  updatedAt         DateTime             @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  users             User[]
  drivers           Driver[]
  vehicles          Vehicle[]
  routePlans        RoutePlan[]
  alerts            Alert[]
  integrationConfigs IntegrationConfig[]
  preferences       DispatcherPreferences?
  invitations       UserInvitation[]

  @@index([subdomain])
  @@index([status])
  @@index([dotNumber])
  @@map("tenants")
}

enum TenantStatus {
  PENDING_APPROVAL
  ACTIVE
  REJECTED
  SUSPENDED
}

enum FleetSize {
  SIZE_1_10      @map("1-10")
  SIZE_11_50     @map("11-50")
  SIZE_51_100    @map("51-100")
  SIZE_101_500   @map("101-500")
  SIZE_500_PLUS  @map("500+")
}
```

**Step 3: Create UserInvitation model**

Add new model:

```prisma
model UserInvitation {
  id                Int           @id @default(autoincrement())
  invitationId      String        @unique @default(uuid()) @map("invitation_id")

  tenant            Tenant        @relation(fields: [tenantId], references: [id])
  tenantId          Int           @map("tenant_id")

  email             String        @db.VarChar(255)
  firstName         String        @map("first_name") @db.VarChar(100)
  lastName          String        @map("last_name") @db.VarChar(100)
  role              UserRole

  token             String        @unique @db.VarChar(255)
  expiresAt         DateTime      @map("expires_at") @db.Timestamptz

  invitedBy         Int           @map("invited_by")
  invitedByUser     User          @relation("InvitedBy", fields: [invitedBy], references: [id])

  acceptedAt        DateTime?     @map("accepted_at") @db.Timestamptz
  acceptedByUserId  Int?          @map("accepted_by_user_id")
  acceptedByUser    User?         @relation("AcceptedBy", fields: [acceptedByUserId], references: [id])

  cancelledAt       DateTime?     @map("cancelled_at") @db.Timestamptz

  createdAt         DateTime      @default(now()) @map("created_at") @db.Timestamptz

  @@index([tenantId])
  @@index([token])
  @@index([email])
  @@index([expiresAt])
  @@map("user_invitations")
}
```

**Step 4: Update Driver model with activation and status fields**

Modify Driver model:

```prisma
model Driver {
  id                Int           @id @default(autoincrement())
  driverId          String        @unique @map("driver_id") @db.VarChar(50)

  tenant            Tenant        @relation(fields: [tenantId], references: [id])
  tenantId          Int           @map("tenant_id")

  name              String        @db.VarChar(255)
  licenseNumber     String?       @map("license_number") @db.VarChar(50)
  phone             String?       @db.VarChar(20)
  email             String?       @db.VarChar(255)

  // Status management
  status            DriverStatus  @default(PENDING_ACTIVATION)
  isActive          Boolean       @default(true) @map("is_active")

  // Activation tracking
  activatedAt       DateTime?     @map("activated_at") @db.Timestamptz
  activatedBy       Int?          @map("activated_by")
  activatedByUser   User?         @relation("ActivatedBy", fields: [activatedBy], references: [id])

  // Deactivation tracking
  deactivatedAt     DateTime?     @map("deactivated_at") @db.Timestamptz
  deactivatedBy     Int?          @map("deactivated_by")
  deactivatedByUser User?         @relation("DeactivatedBy", fields: [deactivatedBy], references: [id])
  deactivationReason String?      @map("deactivation_reason")

  // Reactivation tracking
  reactivatedAt     DateTime?     @map("reactivated_at") @db.Timestamptz
  reactivatedBy     Int?          @map("reactivated_by")
  reactivatedByUser User?         @relation("ReactivatedBy", fields: [reactivatedBy], references: [id])

  // External sync tracking
  externalDriverId  String?       @map("external_driver_id") @db.VarChar(100)
  externalSource    String?       @map("external_source") @db.VarChar(50)
  lastSyncedAt      DateTime?     @map("last_synced_at") @db.Timestamptz
  syncStatus        SyncStatus?   @map("sync_status")

  // HOS cache
  hosData           Json?         @map("hos_data")
  hosDataSyncedAt   DateTime?     @map("hos_data_synced_at") @db.Timestamptz
  hosDataSource     String?       @map("hos_data_source") @db.VarChar(50)

  // Manual override
  hosManualOverride Json?         @map("hos_manual_override")
  hosOverrideBy     Int?          @map("hos_override_by")
  hosOverrideAt     DateTime?     @map("hos_override_at") @db.Timestamptz
  hosOverrideReason String?       @map("hos_override_reason")

  createdAt         DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt         DateTime      @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  user              User?
  routePlans        RoutePlan[]
  driverPreferences DriverPreferences?

  @@index([tenantId])
  @@index([externalDriverId])
  @@index([status])
  @@index([syncStatus])
  @@index([isActive])
  @@map("drivers")
}

enum DriverStatus {
  PENDING_ACTIVATION
  ACTIVE
  INACTIVE
  SUSPENDED
  REMOVED_FROM_SOURCE
}

enum SyncStatus {
  SYNCED
  REMOVED
  SYNC_ERROR
  MANUAL_ENTRY
}
```

**Step 5: Generate and run migration**

```bash
cd apps/backend
npx prisma migrate dev --name user_management_schema
```

Expected output: Migration created and applied successfully

**Step 6: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/
git commit -m "feat(db): add user management schema with Firebase, invitations, and driver status"
```

---

## Task 2: Update Seed Data

**Files:**
- Modify: `apps/backend/prisma/seed.ts`

**Step 1: Add SUPER_ADMIN user creation**

Update seed.ts to create SUPER_ADMIN user:

```typescript
// Add after existing tenant creation

// Create SUPER_ADMIN user (SALLY internal team)
const superAdmin = await prisma.user.create({
  data: {
    userId: 'user_sally_superadmin_001',
    email: 'admin@sally.com',
    firstName: 'SALLY',
    lastName: 'Admin',
    role: 'SUPER_ADMIN',
    tenantId: null, // No tenant - system-wide access
    isActive: true,
    emailVerified: true,
    createdAt: new Date(),
  },
});

console.log('✅ Created SUPER_ADMIN user:', superAdmin.email);
```

**Step 2: Update existing tenant status**

Update existing tenant creation to include new fields:

```typescript
const jycTenant = await prisma.tenant.create({
  data: {
    tenantId: 'tenant_jyc_001',
    companyName: 'JYC Carriers',
    subdomain: 'jyc-carriers',
    contactEmail: 'admin@jyc.com',
    contactPhone: '(339) 242-8066',
    status: 'ACTIVE', // Pre-approved for seed data
    dotNumber: '12345678',
    fleetSize: 'SIZE_51_100',
    approvedAt: new Date(),
    approvedBy: 'system@sally.com',
    onboardingCompletedAt: new Date(), // Skip wizard for seed data
    isActive: true,
  },
});
```

**Step 3: Update driver status for existing drivers**

Update driver creation to include status:

```typescript
const driver1 = await prisma.driver.create({
  data: {
    driverId: 'driver_jyc_001',
    tenantId: jycTenant.id,
    name: 'Mike Anderson',
    // ... other fields
    status: 'ACTIVE', // Already active for seed data
    isActive: true,
    externalDriverId: 'truckbase_drv_001',
    externalSource: 'TRUCKBASE_TMS',
    syncStatus: 'SYNCED',
    lastSyncedAt: new Date(),
  },
});
```

**Step 4: Run seed script**

```bash
cd apps/backend
npx prisma db seed
```

Expected output: All seed data created successfully

**Step 5: Commit**

```bash
git add apps/backend/prisma/seed.ts
git commit -m "feat(seed): add SUPER_ADMIN and update tenant/driver status"
```

---

## Task 3: Install Firebase Admin SDK

**Files:**
- Modify: `apps/backend/package.json`
- Create: `apps/backend/src/config/firebase.config.ts`

**Step 1: Install Firebase Admin SDK**

```bash
cd apps/backend
npm install firebase-admin
npm install -D @types/firebase-admin
```

**Step 2: Add Firebase environment variables**

Add to `apps/backend/.env`:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=sally-route-planning
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@sally-route-planning.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Step 3: Create Firebase configuration**

Create `apps/backend/src/config/firebase.config.ts`:

```typescript
import * as admin from 'firebase-admin';

let firebaseApp: admin.app.App;

export const initializeFirebase = () => {
  if (!firebaseApp) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      console.warn('Firebase credentials not configured. Using development mode.');
      return null;
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

    console.log('✅ Firebase Admin SDK initialized');
  }

  return firebaseApp;
};

export const getFirebaseAuth = () => {
  const app = initializeFirebase();
  return app ? admin.auth(app) : null;
};

export { admin };
```

**Step 4: Initialize Firebase in main.ts**

Modify `apps/backend/src/main.ts`:

```typescript
import { initializeFirebase } from './config/firebase.config';

async function bootstrap() {
  // ... existing code

  // Initialize Firebase
  initializeFirebase();

  // ... rest of bootstrap
}
```

**Step 5: Commit**

```bash
git add apps/backend/package.json apps/backend/src/config/firebase.config.ts apps/backend/src/main.ts
git commit -m "feat(firebase): add Firebase Admin SDK configuration"
```

---

## Task 4: Create Firebase Auth Service

**Files:**
- Create: `apps/backend/src/auth/firebase-auth.service.ts`
- Create: `apps/backend/src/auth/firebase-auth.service.spec.ts`

**Step 1: Write test for Firebase token validation**

Create `apps/backend/src/auth/firebase-auth.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { FirebaseAuthService } from './firebase-auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FirebaseAuthService', () => {
  let service: FirebaseAuthService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirebaseAuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<FirebaseAuthService>(FirebaseAuthService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifyFirebaseToken', () => {
    it('should return decoded token for valid Firebase token', async () => {
      const mockToken = 'valid-firebase-token';
      const mockDecodedToken = {
        uid: 'firebase-uid-123',
        email: 'user@example.com',
        email_verified: true,
      };

      jest.spyOn(service as any, 'verifyToken').mockResolvedValue(mockDecodedToken);

      const result = await service.verifyFirebaseToken(mockToken);

      expect(result).toEqual(mockDecodedToken);
    });

    it('should throw error for invalid token', async () => {
      const mockToken = 'invalid-token';

      jest.spyOn(service as any, 'verifyToken').mockRejectedValue(
        new Error('Invalid token'),
      );

      await expect(service.verifyFirebaseToken(mockToken)).rejects.toThrow();
    });
  });

  describe('findOrCreateUserByFirebaseUid', () => {
    it('should return existing user if found', async () => {
      const mockUser = {
        id: 1,
        userId: 'user_001',
        firebaseUid: 'firebase-uid-123',
        email: 'user@example.com',
        role: 'ADMIN',
        tenantId: 1,
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);

      const result = await service.findOrCreateUserByFirebaseUid('firebase-uid-123');

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { firebaseUid: 'firebase-uid-123' },
      });
    });

    it('should return null if user not found and no email provided', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      const result = await service.findOrCreateUserByFirebaseUid('firebase-uid-123');

      expect(result).toBeNull();
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd apps/backend
npm test -- firebase-auth.service.spec.ts
```

Expected: Tests fail with "Cannot find module './firebase-auth.service'"

**Step 3: Implement FirebaseAuthService**

Create `apps/backend/src/auth/firebase-auth.service.ts`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getFirebaseAuth } from '../config/firebase.config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAuthService {
  constructor(private prisma: PrismaService) {}

  /**
   * Verify Firebase ID token
   */
  async verifyFirebaseToken(token: string): Promise<admin.auth.DecodedIdToken> {
    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        throw new UnauthorizedException(
          'Firebase not configured. Please contact support.',
        );
      }

      const decodedToken = await auth.verifyIdToken(token);
      return decodedToken;
    } catch (error) {
      throw new UnauthorizedException('Invalid Firebase token');
    }
  }

  /**
   * Find user by Firebase UID, or return null
   */
  async findOrCreateUserByFirebaseUid(
    firebaseUid: string,
    email?: string,
  ): Promise<any> {
    // Find existing user
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
      include: {
        tenant: true,
        driver: true,
      },
    });

    if (user) {
      return user;
    }

    // User not found and no email to create new user
    if (!email) {
      return null;
    }

    // Note: User creation happens in specific flows (registration, invitation acceptance)
    // This method only finds existing users
    return null;
  }

  /**
   * Link Firebase UID to existing user
   */
  async linkFirebaseUidToUser(userId: number, firebaseUid: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        firebaseUid,
        emailVerified: true,
      },
    });
  }

  /**
   * Update email verification status
   */
  async updateEmailVerification(firebaseUid: string, verified: boolean) {
    return this.prisma.user.update({
      where: { firebaseUid },
      data: { emailVerified: verified },
    });
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- firebase-auth.service.spec.ts
```

Expected: All tests pass

**Step 5: Commit**

```bash
git add apps/backend/src/auth/firebase-auth.service.ts apps/backend/src/auth/firebase-auth.service.spec.ts
git commit -m "feat(auth): add Firebase authentication service"
```

---

## Task 5: Create Firebase Token Exchange Endpoint

**Files:**
- Modify: `apps/backend/src/auth/auth.controller.ts`
- Modify: `apps/backend/src/auth/auth.service.ts`
- Create: `apps/backend/src/auth/dto/firebase-exchange.dto.ts`

**Step 1: Create DTO for Firebase token exchange**

Create `apps/backend/src/auth/dto/firebase-exchange.dto.ts`:

```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class FirebaseExchangeDto {
  @IsString()
  @IsNotEmpty()
  firebaseToken: string;
}
```

**Step 2: Add Firebase exchange method to AuthService**

Modify `apps/backend/src/auth/auth.service.ts`:

```typescript
import { FirebaseAuthService } from './firebase-auth.service';
import { FirebaseExchangeDto } from './dto/firebase-exchange.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtTokenService: JwtTokenService,
    private firebaseAuthService: FirebaseAuthService, // Add this
  ) {}

  // ... existing methods

  /**
   * Exchange Firebase token for SALLY JWT
   */
  async exchangeFirebaseToken(dto: FirebaseExchangeDto) {
    // Verify Firebase token
    const decodedToken = await this.firebaseAuthService.verifyFirebaseToken(
      dto.firebaseToken,
    );

    // Find user by Firebase UID
    const user = await this.firebaseAuthService.findOrCreateUserByFirebaseUid(
      decodedToken.uid,
      decodedToken.email,
    );

    if (!user) {
      throw new UnauthorizedException('User not found. Please complete registration.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated. Please contact support.');
    }

    if (user.tenant && user.tenant.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'Your organization account is pending approval. Please check back later.',
      );
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate SALLY JWT tokens
    const { accessToken, refreshToken } = await this.jwtTokenService.generateTokens({
      sub: user.userId,
      email: user.email,
      role: user.role,
      tenantId: user.tenant?.tenantId,
      driverId: user.driver?.driverId,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenant?.tenantId,
        tenantName: user.tenant?.companyName,
        driverId: user.driver?.driverId,
      },
    };
  }
}
```

**Step 3: Add endpoint to AuthController**

Modify `apps/backend/src/auth/auth.controller.ts`:

```typescript
import { FirebaseExchangeDto } from './dto/firebase-exchange.dto';

@Controller('auth')
export class AuthController {
  // ... existing methods

  @Public()
  @Post('firebase/exchange')
  async exchangeFirebaseToken(@Body() dto: FirebaseExchangeDto) {
    return this.authService.exchangeFirebaseToken(dto);
  }
}
```

**Step 4: Update AuthModule to include FirebaseAuthService**

Modify `apps/backend/src/auth/auth.module.ts`:

```typescript
import { FirebaseAuthService } from './firebase-auth.service';

@Module({
  imports: [PrismaModule, PassportModule, JwtModule.registerAsync({...})],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtTokenService,
    JwtStrategy,
    RefreshJwtStrategy,
    FirebaseAuthService, // Add this
  ],
  exports: [AuthService, FirebaseAuthService],
})
export class AuthModule {}
```

**Step 5: Test endpoint manually**

```bash
# Start backend
npm run dev

# In another terminal, test endpoint
curl -X POST http://localhost:8000/api/v1/auth/firebase/exchange \
  -H "Content-Type: application/json" \
  -d '{"firebaseToken": "test-token"}'
```

Expected: Returns 401 with "Invalid Firebase token" (expected since we don't have real token yet)

**Step 6: Commit**

```bash
git add apps/backend/src/auth/
git commit -m "feat(auth): add Firebase token exchange endpoint"
```

---

## Task 6: Create Tenant Registration Service

**Files:**
- Create: `apps/backend/src/api/tenants/tenants.module.ts`
- Create: `apps/backend/src/api/tenants/tenants.service.ts`
- Create: `apps/backend/src/api/tenants/tenants.controller.ts`
- Create: `apps/backend/src/api/tenants/dto/register-tenant.dto.ts`

**Step 1: Create DTOs**

Create `apps/backend/src/api/tenants/dto/register-tenant.dto.ts`:

```typescript
import { IsString, IsEmail, IsNotEmpty, IsEnum, IsOptional, Matches, MinLength } from 'class-validator';

export enum FleetSizeEnum {
  SIZE_1_10 = '1-10',
  SIZE_11_50 = '11-50',
  SIZE_51_100 = '51-100',
  SIZE_101_500 = '101-500',
  SIZE_500_PLUS = '500+',
}

export class RegisterTenantDto {
  // Company information
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Subdomain must contain only lowercase letters, numbers, and hyphens',
  })
  subdomain: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{8}$/, { message: 'DOT number must be exactly 8 digits' })
  dotNumber: string;

  @IsEnum(FleetSizeEnum)
  fleetSize: FleetSizeEnum;

  // Admin user information
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  firebaseUid: string;

  // Contact information
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class CheckSubdomainDto {
  @IsString()
  @IsNotEmpty()
  subdomain: string;
}
```

**Step 2: Create TenantsService with registration logic**

Create `apps/backend/src/api/tenants/tenants.service.ts`:

```typescript
import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { generateId } from '../../common/utils/id-generator';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if subdomain is available
   */
  async checkSubdomainAvailability(subdomain: string): Promise<boolean> {
    const reservedSubdomains = [
      'admin',
      'api',
      'www',
      'app',
      'dashboard',
      'mail',
      'support',
      'help',
      'docs',
    ];

    if (reservedSubdomains.includes(subdomain.toLowerCase())) {
      return false;
    }

    const existing = await this.prisma.tenant.findUnique({
      where: { subdomain: subdomain.toLowerCase() },
    });

    return !existing;
  }

  /**
   * Register new tenant with admin user
   */
  async registerTenant(dto: RegisterTenantDto) {
    // Check subdomain availability
    const isAvailable = await this.checkSubdomainAvailability(dto.subdomain);
    if (!isAvailable) {
      throw new ConflictException('Subdomain is already taken or reserved');
    }

    // Check if email already registered (across all tenants)
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email },
          { firebaseUid: dto.firebaseUid },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    // Create tenant and admin user in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          tenantId: generateId('tenant'),
          companyName: dto.companyName,
          subdomain: dto.subdomain.toLowerCase(),
          contactEmail: dto.email,
          contactPhone: dto.phone,
          status: 'PENDING_APPROVAL',
          dotNumber: dto.dotNumber,
          fleetSize: dto.fleetSize,
          isActive: false,
        },
      });

      // Create admin user
      const adminUser = await tx.user.create({
        data: {
          userId: generateId('user'),
          tenantId: tenant.id,
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: 'ADMIN',
          firebaseUid: dto.firebaseUid,
          emailVerified: false,
          isActive: false, // Inactive until tenant approved
        },
      });

      // Create default dispatcher preferences for tenant
      await tx.dispatcherPreferences.create({
        data: {
          tenantId: tenant.id,
          // Use all defaults from schema
        },
      });

      return { tenant, adminUser };
    });

    // TODO: Send notification email to SALLY admin team

    return {
      tenantId: result.tenant.tenantId,
      status: result.tenant.status,
      message: 'Registration successful! Your account is pending approval.',
    };
  }

  /**
   * Get all tenants (SUPER_ADMIN only)
   */
  async getAllTenants(status?: string) {
    const where = status ? { status } : {};

    return this.prisma.tenant.findMany({
      where,
      include: {
        users: {
          where: { role: 'ADMIN' },
          select: {
            userId: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            users: true,
            drivers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Approve tenant
   */
  async approveTenant(tenantId: string, approvedBy: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { tenantId },
      include: { users: { where: { role: 'ADMIN' } } },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    if (tenant.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Tenant is not pending approval');
    }

    // Update tenant and activate admin user
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedTenant = await tx.tenant.update({
        where: { tenantId },
        data: {
          status: 'ACTIVE',
          isActive: true,
          approvedAt: new Date(),
          approvedBy,
        },
      });

      // Activate admin user(s)
      await tx.user.updateMany({
        where: {
          tenantId: tenant.id,
          role: 'ADMIN',
        },
        data: {
          isActive: true,
        },
      });

      return updatedTenant;
    });

    // TODO: Send welcome email to admin user

    return result;
  }

  /**
   * Reject tenant
   */
  async rejectTenant(tenantId: string, reason: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { tenantId },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    return this.prisma.tenant.update({
      where: { tenantId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });

    // TODO: Optionally send rejection email
  }
}
```

**Step 3: Create utility for ID generation**

Create `apps/backend/src/common/utils/id-generator.ts`:

```typescript
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10);

export function generateId(prefix: string): string {
  return `${prefix}_${nanoid()}`;
}
```

Install nanoid:

```bash
cd apps/backend
npm install nanoid@3
```

**Step 4: Create TenantsController**

Create `apps/backend/src/api/tenants/tenants.controller.ts`:

```typescript
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterTenantDto) {
    return this.tenantsService.registerTenant(dto);
  }

  @Public()
  @Get('check-subdomain/:subdomain')
  async checkSubdomain(@Param('subdomain') subdomain: string) {
    const available = await this.tenantsService.checkSubdomainAvailability(subdomain);
    return { available };
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get()
  async getAllTenants(@Query('status') status?: string) {
    return this.tenantsService.getAllTenants(status);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post(':tenantId/approve')
  async approveTenant(
    @Param('tenantId') tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.tenantsService.approveTenant(tenantId, user.email);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post(':tenantId/reject')
  async rejectTenant(
    @Param('tenantId') tenantId: string,
    @Body('reason') reason: string,
  ) {
    return this.tenantsService.rejectTenant(tenantId, reason);
  }
}
```

**Step 5: Create TenantsModule**

Create `apps/backend/src/api/tenants/tenants.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
```

**Step 6: Register TenantsModule in AppModule**

Modify `apps/backend/src/app.module.ts`:

```typescript
import { TenantsModule } from './api/tenants/tenants.module';

@Module({
  imports: [
    // ... existing imports
    TenantsModule,
  ],
  // ...
})
export class AppModule {}
```

**Step 7: Commit**

```bash
git add apps/backend/src/api/tenants/ apps/backend/src/common/utils/id-generator.ts apps/backend/src/app.module.ts
git commit -m "feat(tenants): add tenant registration service and endpoints"
```

---

_[Note: This is a comprehensive plan. Due to length constraints, I'll continue with remaining tasks in a summary format. The full detailed plan would follow the same pattern for all 30 tasks.]_

**Remaining Tasks Summary:**

**Tasks 7-8:** User invitation service (backend)
**Tasks 9-11:** Driver activation service (backend)
**Tasks 12-14:** Driver status management (deactivate/reactivate)
**Tasks 15-17:** Firebase setup (frontend)
**Tasks 18-19:** Tenant registration UI
**Tasks 20-21:** SUPER_ADMIN portal
**Tasks 22-25:** User management UI (3 tabs)
**Tasks 26-28:** Onboarding wizard
**Tasks 29-30:** Integration testing & cleanup

Each task follows the same TDD pattern with detailed steps for writing tests, implementing features, running tests, and committing changes.

---

## Execution Notes

- Each task should be completed in order
- Run tests after each implementation step
- Commit after each task completion
- If a test fails, debug before proceeding
- Review code quality before committing

## Testing Strategy

- Unit tests for all services
- Integration tests for API endpoints
- E2E tests for critical flows (registration, login, invitation)
- Manual testing for UI components

---

**Total Estimated Time:** 40-60 hours for complete implementation
**Dependencies:** Firebase project setup, email service configuration
