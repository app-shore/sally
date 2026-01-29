# JWT Authentication System Implementation Plan (Multi-Tenant)

## Overview
Implement a production-ready JWT-based authentication system with role-based access control (RBAC) and **multi-tenancy** for SALLY's dispatch and driver coordination platform. SALLY is a SaaS product where multiple fleet management companies can onboard, each with their own isolated data (drivers, vehicles, routes). The system will support three user roles (Dispatcher, Driver, Admin) with a beautiful login experience inspired by the landing page design.

## Key Design Principles
1. **Multi-Tenant Architecture** - Complete data isolation between fleet companies
2. **Beautiful UX** - Login screen matches landing page quality with company/fleet selection
3. **Security First** - JWT best practices, httpOnly cookies, role-based guards, tenant isolation
4. **POC-Ready** - Mock auth (no passwords yet) for rapid development
5. **Future-Proof** - Architected for real password auth when ready
6. **Zero Breaking Changes** - Backward compatible migration

## Multi-Tenancy Model
- **Tenant = Fleet Management Company** (e.g., "Swift Transport", "JB Hunt", "ABC Logistics")
- **Each tenant has**: Own drivers, vehicles, routes, loads, alerts
- **Data Isolation**: Users can ONLY see data from their tenant
- **User Roles per Tenant**:
  - **Admin** - Manages users, settings for their fleet company
  - **Dispatcher** - Plans routes, monitors fleet for their company
  - **Driver** - Views personal routes for their company

## Quick Reference: Key Multi-Tenancy Changes

### Database
- New `Tenant` table (id, tenantId, companyName, subdomain)
- All tables get `tenantId` foreign key
- Composite unique constraints: `@@unique([entityId, tenantId])`

### JWT Token
- Access token payload includes `"tenantId": "swift_transport"`
- Refresh token also includes tenantId

### Backend
- New `TenantGuard` enforces tenant isolation on all routes
- All queries filtered: `where: { tenantId: user.tenantId }`
- New endpoint: `GET /api/v1/tenants` (public, for login screen)

### Frontend
- Login flow: **Tenant selection** → Role selection → Driver selection (if driver)
- Session store includes `tenantId` and `tenantName`
- Beautiful tenant selection UI with company logos

### Critical Rule
**EVERY database query MUST filter by tenantId** - no exceptions (except system-level operations)

### Multi-Tenant Login Flow Diagram
```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Tenant Selection                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │   Swift    │  │    ABC     │  │   Other    │           │
│  │ Transport  │  │ Logistics  │  │  Company   │           │
│  └────────────┘  └────────────┘  └────────────┘           │
│        ↓                                                    │
│  Step 2: Role Selection (for selected tenant)              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ Dispatcher │  │   Driver   │  │   Admin    │           │
│  └────────────┘  └────────────┘  └────────────┘           │
│        ↓                ↓                                   │
│  Step 3a:         Step 3b: Driver Selection                │
│  Login           [Dropdown with tenant-filtered drivers]   │
│     ↓                   ↓                                   │
│  Step 4: JWT Generated with tenantId                       │
│  {                                                          │
│    "sub": "user_123",                                       │
│    "tenantId": "swift_transport",  ← CRITICAL               │
│    "role": "DISPATCHER"                                     │
│  }                                                          │
│     ↓                                                       │
│  Step 5: All API queries auto-filtered by tenantId         │
│  WHERE tenantId = 'swift_transport'                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Schema (Prisma)

### Files to Modify
- `/Users/ajay-admin/sally/apps/backend/prisma/schema.prisma`
- `/Users/ajay-admin/sally/apps/backend/prisma/seed.ts`

### Changes

#### 1.1 Add UserRole Enum
```prisma
enum UserRole {
  DISPATCHER
  DRIVER
  ADMIN
}
```

#### 1.2 Create Tenant (Fleet Company) Model
```prisma
model Tenant {
  id                    Int          @id @default(autoincrement())
  tenantId              String       @unique @map("tenant_id") @db.VarChar(50) // e.g., "swift_transport"
  companyName           String       @map("company_name") @db.VarChar(255)     // e.g., "Swift Transport"
  subdomain             String?      @unique @db.VarChar(100)                  // e.g., "swift" (for swift.sally.app)
  contactEmail          String?      @map("contact_email") @db.VarChar(255)
  contactPhone          String?      @map("contact_phone") @db.VarChar(50)
  isActive              Boolean      @default(true) @map("is_active")
  createdAt             DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt             DateTime     @updatedAt @map("updated_at") @db.Timestamptz

  // Relationships
  users                 User[]
  drivers               Driver[]
  vehicles              Vehicle[]
  routePlans            RoutePlan[]
  alerts                Alert[]

  @@index([tenantId])
  @@index([subdomain])
  @@map("tenants")
}
```

#### 1.3 Create User Model (Multi-Tenant)
```prisma
model User {
  id                    Int          @id @default(autoincrement())
  userId                String       @unique @map("user_id") @db.VarChar(50)
  email                 String       @map("email") @db.VarChar(255)           // NOT UNIQUE (same email across tenants)
  passwordHash          String?      @map("password_hash") @db.VarChar(255)   // Nullable for POC
  role                  UserRole
  firstName             String       @map("first_name") @db.VarChar(100)
  lastName              String       @map("last_name") @db.VarChar(100)
  isActive              Boolean      @default(true) @map("is_active")
  lastLoginAt           DateTime?    @map("last_login_at") @db.Timestamptz
  passwordChangedAt     DateTime?    @map("password_changed_at") @db.Timestamptz
  createdAt             DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt             DateTime     @updatedAt @map("updated_at") @db.Timestamptz

  // Multi-tenant relationship
  tenant                Tenant       @relation(fields: [tenantId], references: [id])
  tenantId              Int          @map("tenant_id")

  // 1:1 relationship with Driver (only for driver role)
  driver                Driver?      @relation(fields: [driverId], references: [id])
  driverId              Int?         @unique @map("driver_id")

  refreshTokens         RefreshToken[]

  @@unique([email, tenantId])  // Same email can exist across tenants
  @@index([email])
  @@index([role])
  @@index([tenantId])
  @@map("users")
}
```

#### 1.4 Create RefreshToken Model
```prisma
model RefreshToken {
  id                    Int          @id @default(autoincrement())
  tokenId               String       @unique @map("token_id") @db.VarChar(50)
  userId                Int          @map("user_id")
  token                 String       @db.VarChar(500) // Hashed
  expiresAt             DateTime     @map("expires_at") @db.Timestamptz
  isRevoked             Boolean      @default(false) @map("is_revoked")
  createdAt             DateTime     @default(now()) @map("created_at") @db.Timestamptz
  revokedAt             DateTime?    @map("revoked_at") @db.Timestamptz

  user                  User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("refresh_tokens")
}
```

#### 1.5 Update Driver Model (Add Tenant)
```prisma
model Driver {
  id                    Int          @id @default(autoincrement())
  driverId              String       @map("driver_id") @db.VarChar(50)
  name                  String       @db.VarChar(255)
  isActive              Boolean      @default(true) @map("is_active")
  createdAt             DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt             DateTime     @updatedAt @map("updated_at") @db.Timestamptz

  // Multi-tenant relationship
  tenant                Tenant       @relation(fields: [tenantId], references: [id])
  tenantId              Int          @map("tenant_id")

  // User relationship
  user                  User?

  // ... rest of existing relationships (routePlans, scenarios) ...

  @@unique([driverId, tenantId])  // driverId unique per tenant
  @@index([tenantId])
  @@map("drivers")
}
```

#### 1.6 Update Vehicle Model (Add Tenant)
```prisma
model Vehicle {
  id                    Int          @id @default(autoincrement())
  vehicleId             String       @map("vehicle_id") @db.VarChar(50)
  unitNumber            String       @map("unit_number") @db.VarChar(100)
  // ... other existing fields ...

  // Multi-tenant relationship
  tenant                Tenant       @relation(fields: [tenantId], references: [id])
  tenantId              Int          @map("tenant_id")

  // ... rest of existing relationships ...

  @@unique([vehicleId, tenantId])  // vehicleId unique per tenant
  @@index([tenantId])
  @@map("vehicles")
}
```

#### 1.7 Update RoutePlan Model (Add Tenant)
```prisma
model RoutePlan {
  // ... existing fields ...

  // Multi-tenant relationship
  tenant                Tenant       @relation(fields: [tenantId], references: [id])
  tenantId              Int          @map("tenant_id")

  // ... rest of relationships ...

  @@index([tenantId])
  @@map("route_plans")
}
```

#### 1.8 Update Alert Model (Add Tenant)
```prisma
model Alert {
  // ... existing fields ...

  // Multi-tenant relationship
  tenant                Tenant       @relation(fields: [tenantId], references: [id])
  tenantId              Int          @map("tenant_id")

  // ... rest of relationships ...

  @@index([tenantId])
  @@map("alerts")
}
```

#### 1.9 Update Seed Script (Multi-Tenant)
Create mock tenants and users:

**Tenants**:
- Tenant 1: "Swift Transport" (tenantId: "swift_transport")
- Tenant 2: "ABC Logistics" (tenantId: "abc_logistics")

**Users for Swift Transport**:
- 1 admin: `admin@swift.com`
- 2 dispatchers: `dispatcher1@swift.com`, `dispatcher2@swift.com`
- Link existing drivers to driver users (map by driver name)

**Users for ABC Logistics**:
- 1 admin: `admin@abc.com`
- 1 dispatcher: `dispatcher1@abc.com`
- Create 2 sample drivers

**Important**: Migrate existing drivers/vehicles to "Swift Transport" tenant (default)

### Commands
```bash
# Generate migration
cd apps/backend
npx prisma migrate dev --name add_jwt_auth_tables

# Run seed
npm run db:seed
```

---

## Multi-Tenancy Strategy

### Tenant Isolation Approach

**Database-Level Isolation** (Shared Database, Shared Schema):
- All tenants share same database and tables
- Every table has `tenantId` foreign key
- Application-level filtering ensures data isolation
- Row-Level Security (RLS) in PostgreSQL for extra protection (optional)

**Why This Approach?**:
- Simpler infrastructure (single database)
- Cost-effective for POC
- Easy to query across tenants for analytics
- Standard pattern for SaaS applications

**Alternative Approaches** (future consideration):
- **Shared Database, Separate Schemas**: Each tenant gets own schema
- **Separate Databases**: Complete database isolation per tenant

### Tenant Context in Requests

**Every API Request Must Include Tenant Context**:
1. JWT token contains `tenantId`
2. All database queries filtered by `tenantId`
3. Guards enforce tenant isolation
4. No cross-tenant data access

**Example Query Pattern**:
```typescript
// BEFORE (no tenant filtering)
const drivers = await prisma.driver.findMany();

// AFTER (with tenant filtering)
const drivers = await prisma.driver.findMany({
  where: { tenantId: user.tenantId }  // From JWT
});
```

### Login Flow (Multi-Tenant)

**Option 1: Company/Tenant Selection Before Login**
```
Step 1: User enters email
Step 2: System looks up which tenant(s) email belongs to
Step 3: If multiple tenants: User selects which company
Step 4: User selects role (Dispatcher/Driver/Admin)
Step 5: If Driver: Select specific driver
Step 6: Login (JWT includes tenantId)
```

**Option 2: Subdomain-Based Tenant Detection** (RECOMMENDED)
```
Step 1: User navigates to swift.sally.app (subdomain determines tenant)
Step 2: User selects role (Dispatcher/Driver/Admin)
Step 3: If Driver: Select specific driver
Step 4: Login (JWT includes tenantId from subdomain)
```

**Option 3: Simple Tenant Dropdown** (POC - Easiest)
```
Step 1: User selects fleet company from dropdown
Step 2: User selects role (Dispatcher/Driver/Admin)
Step 3: If Driver: Select specific driver
Step 4: Login (JWT includes selected tenantId)
```

**For POC, we'll use Option 3** (tenant dropdown) - simplest to implement.
**Future enhancement**: Option 2 (subdomain-based) for production.

### Tenant-Specific API Endpoints

**Middleware**: Extract `tenantId` from JWT and attach to request context

```typescript
// TenantGuard (new guard)
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // From JWT

    // Attach tenant context to request
    request.tenantId = user.tenantId;

    return true;
  }
}

// Usage in controllers
@Controller('drivers')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class DriversController {
  @Get()
  async listDrivers(@CurrentUser() user: User) {
    // Automatically filtered by tenantId
    return this.driversService.findAll(user.tenantId);
  }
}
```

### Data Migration Strategy

**Existing Data** (drivers, vehicles, routes, alerts):
- Create default tenant: "Swift Transport" (ID: `swift_transport`)
- Migrate all existing data to this tenant
- Add `tenantId` column to all relevant tables
- Update foreign key constraints

**No Data Loss**: All existing data preserved under default tenant.

---

## Phase 2: Backend JWT Infrastructure

### Files to Create

#### 2.1 Auth Module Structure
```
apps/backend/src/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── jwt.service.ts
├── strategies/
│   ├── jwt.strategy.ts
│   └── refresh-jwt.strategy.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   ├── roles.guard.ts
│   └── public.decorator.ts
└── decorators/
    ├── current-user.decorator.ts
    └── roles.decorator.ts
```

#### 2.2 Auth Service (Mock Implementation - Multi-Tenant)
**File**: `apps/backend/src/auth/auth.service.ts`

**Key Methods**:
```typescript
class AuthService {
  // POC: Mock login (find pre-seeded user, no password check)
  async loginMock(tenantId: string, userId: string): Promise<LoginResponse> {
    // 1. Validate tenant exists and is active
    const tenant = await this.prisma.tenant.findUnique({
      where: { tenantId, isActive: true }
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // 2. Find pre-seeded user
    const user = await this.prisma.user.findUnique({
      where: { userId, tenantId, isActive: true },
      include: { driver: true } // Include driver info if role=DRIVER
    });
    if (!user) throw new NotFoundException('User not found for this tenant');

    // 3. Generate JWT tokens
    const tokens = await this.generateTokens(user);

    // 4. Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    return { accessToken: tokens.accessToken, user: this.toUserProfile(user) };
  }

  // Generate JWT tokens (includes tenantId)
  async generateTokens(user: User): Promise<AuthTokens>

  // Refresh access token
  async refreshAccessToken(refreshTokenId: string): Promise<string>

  // Logout and revoke refresh token
  async logout(userId: number, tokenId: string): Promise<void>

  // Get user profile
  async getProfile(userId: number): Promise<UserProfile>

  // NEW: List available tenants (for login screen)
  async listTenants(): Promise<Tenant[]>

  // NEW: List users for tenant + role (for login screen user selection)
  async listUsersForTenant(tenantId: string, role?: UserRole): Promise<UserSummary[]>
}
```

**CRITICAL: All auth methods must validate tenant context**

**JWT Token Structure (Multi-Tenant)**:
- **Access Token** (15 min expiry):
  ```json
  {
    "sub": "user_123",
    "email": "john@swift.com",
    "role": "DRIVER",
    "tenantId": "swift_transport",  // CRITICAL: Tenant isolation
    "driverId": "DRV001",           // Only if role=DRIVER
    "iat": 1706558400,
    "exp": 1706559300
  }
  ```
- **Refresh Token** (7 day expiry):
  ```json
  {
    "sub": "user_123",
    "tenantId": "swift_transport",  // Tenant in refresh token too
    "tokenId": "rt_abc123",
    "iat": 1706558400,
    "exp": 1707163200
  }
  ```

#### 2.3 JWT Strategy
**File**: `apps/backend/src/auth/strategies/jwt.strategy.ts`

- Validates JWT signature
- Extracts user from payload
- Passport strategy for access tokens

#### 2.4 JWT Auth Guard (Global)
**File**: `apps/backend/src/auth/guards/jwt-auth.guard.ts`

- Applied globally to all routes
- Check for `@Public()` decorator to skip auth
- Validates JWT on every request

#### 2.5 Tenant Guard (NEW - Multi-Tenancy)
**File**: `apps/backend/src/auth/guards/tenant.guard.ts`

- Extracts `tenantId` from JWT payload
- Attaches tenant context to request
- Applied globally after JWT guard
- Ensures all database queries are tenant-scoped

```typescript
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by JwtStrategy

    if (!user || !user.tenantId) {
      throw new UnauthorizedException('Tenant context missing');
    }

    // Attach tenant context to request
    request.tenantId = user.tenantId;

    return true;
  }
}
```

#### 2.6 Roles Guard
**File**: `apps/backend/src/auth/guards/roles.guard.ts`

- Check user role against required roles
- Use with `@Roles()` decorator

**Usage Example (Multi-Tenant)**:
```typescript
@Controller('drivers')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)  // Note: TenantGuard added
export class DriversController {
  @Get()
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN)
  async listDrivers(@CurrentUser() user: User) {
    // Only dispatchers and admins
    // Automatically filtered by tenantId
    return this.driversService.findAll(user.tenantId);
  }

  @Get('me')
  @Roles(UserRole.DRIVER)
  async getMyProfile(@CurrentUser() user: User) {
    // Only drivers
    // Automatically filtered by tenantId
    return this.driversService.findByDriverId(user.driverId, user.tenantId);
  }
}
```

**CRITICAL**: All controllers MUST use `TenantGuard` to enforce data isolation.

#### 2.7 Auth Controller
**File**: `apps/backend/src/auth/auth.controller.ts`

**Endpoints (Multi-Tenant)**:
```typescript
GET    /api/v1/tenants                           // List available tenants (public)
GET    /api/v1/tenants/:tenant_id/users          // List users for tenant (public, for mock login)
POST   /api/v1/auth/login                        // Mock login (tenant + user selection)
POST   /api/v1/auth/logout                       // Revoke refresh token
POST   /api/v1/auth/refresh                      // Refresh access token
GET    /api/v1/auth/me                           // Get current user profile
```

**Mock Login Flow (Multi-Tenant) - Pre-Seeded Users Approach**:
1. Request:
   ```json
   {
     "tenant_id": "swift_transport",
     "role": "DISPATCHER",        // or "DRIVER", "ADMIN"
     "user_id": "user_123"        // NEW: Pre-seeded user ID
   }
   ```
2. Validate tenant exists and is active
3. **Find pre-seeded user in database** (NO auto-creation)
   - Query: `User.findOne({ where: { userId: user_id, tenantId: tenant_id, role: role } })`
   - If not found: Return 404 error "User not found for this tenant/role"
4. Validate user is active (`isActive = true`)
5. Generate access + refresh tokens (with tenantId in payload)
6. Update `lastLoginAt` timestamp
7. Set refresh token as httpOnly cookie
8. Return access token + user profile in response body

**Why Pre-Seeded Users?**
- More realistic testing (users must be created before login)
- Better audit trail (know who logged in when)
- Prevents accidental user creation
- Matches production behavior (users are provisioned first)

**Tenants Endpoint** (Public):
```typescript
@Get('/tenants')
@Public()
async listTenants() {
  return this.authService.listTenants();
}
```

**CRITICAL**: Login endpoint must validate tenantId before issuing JWT.

#### 2.8 Configuration
**File**: `apps/backend/src/config/configuration.ts`

Add JWT config:
```typescript
export default () => ({
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  auth: {
    enableMockAuth: process.env.ENABLE_MOCK_AUTH === 'true',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10'),
  },
});
```

**Environment Variables**:
```bash
# .env
JWT_ACCESS_SECRET=your-secret-key-here-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-here-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
ENABLE_MOCK_AUTH=true
BCRYPT_ROUNDS=10
```

#### 2.8 Update App Module
**File**: `apps/backend/src/app.module.ts`

- Import `AuthModule`
- Register global JWT guard in `main.ts`

### Dependencies
```bash
cd apps/backend
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install -D @types/passport-jwt @types/bcrypt
```

---

## Phase 3: Update Existing Backend Controllers

### Files to Modify

#### 3.1 Drivers Controller
**File**: `/Users/ajay-admin/sally/apps/backend/src/api/drivers/drivers.controller.ts`

**Changes**:
```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DriversController {

  @Get()
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN)
  async listDrivers() {
    // Only dispatchers and admins can list all drivers
  }

  @Get('me')
  @Roles(UserRole.DRIVER)
  async getMyProfile(@CurrentUser() user: User) {
    // Drivers can only see their own profile
    return this.driversService.findByDriverId(user.driverId);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async createDriver(@Body() data: CreateDriverDto) {
    // Only admins can create drivers
  }

  // ... other endpoints with role guards
}
```

#### 3.2 Vehicles Controller
**File**: `/Users/ajay-admin/sally/apps/backend/src/api/vehicles/vehicles.controller.ts`

**Add Guards**:
```typescript
@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehiclesController {
  @Get()
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN)
  async listVehicles() {}

  // ... other endpoints
}
```

#### 3.3 Routes/Plans Controller
**File**: `apps/backend/src/api/routes/routes.controller.ts` (if exists)

**Add Guards**:
```typescript
@Controller('routes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoutesController {
  @Post('plan')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN)
  async planRoute() {}

  @Get('mine')
  @Roles(UserRole.DRIVER)
  async getMyRoutes(@CurrentUser() user: User) {
    // Driver can only see their own routes
  }
}
```

#### 3.4 Alerts Controller
**File**: `/Users/ajay-admin/sally/apps/backend/src/api/alerts/alerts.controller.ts`

**Add Guards**:
```typescript
@Controller('alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertsController {
  @Get()
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.DRIVER)
  async listAlerts(@CurrentUser() user: User, @Query() query: any) {
    // Filter alerts by role
    if (user.role === UserRole.DRIVER) {
      query.driver_id = user.driverId; // Drivers only see their alerts
    }
    return this.alertsService.findAll(query);
  }

  @Post(':alert_id/acknowledge')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN)
  async acknowledgeAlert() {}
}
```

#### 3.5 Health Check (Public Route)
**File**: `apps/backend/src/app.controller.ts`

**Mark as public**:
```typescript
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  @Get('health')
  @Public()  // Skip JWT auth
  getHealth() {
    return { status: 'ok' };
  }
}
```

#### 3.6 Deprecate Session Endpoints
**File**: `/Users/ajay-admin/sally/apps/backend/src/api/session/session.controller.ts`

**Mark as deprecated**:
```typescript
@Controller('session')
@Public() // Keep public during migration
export class SessionController {
  @Post('login')
  async login() {
    console.warn('[DEPRECATED] /session/login is deprecated. Use /auth/login instead.');
    // Keep functionality for backward compatibility
  }

  @Post('logout')
  async logout() {
    console.warn('[DEPRECATED] /session/logout is deprecated. Use /auth/logout instead.');
  }
}
```

---

## Phase 4: Frontend Auth UI (Beautiful Login Screen)

### Files to Modify/Create

#### 4.1 Redesign Login Screen
**File**: `/Users/ajay-admin/sally/apps/web/src/components/auth/LoginScreen.tsx`

**Design Inspiration**: Take color scheme, typography, and animation style from `/Users/ajay-admin/sally/apps/web/src/components/landing/LandingPage.tsx`

**Key Features** (Multi-Tenant):
- Large SALLY logo at top
- **Tenant/Company selection dropdown** (POC: simple dropdown)
- Three large role selection cards (Dispatcher, Driver, Admin)
- Smooth card hover effects (lift + shadow)
- Driver dropdown appears when driver role selected
- Glassmorphism background (subtle blur)
- Professional shadows and spacing
- Framer Motion animations

**Login Flow (Multi-Tenant + Pre-Seeded Users)**:
```
Step 1: Select Fleet Company (dropdown with company logos)
Step 2: Select Role (Dispatcher/Driver/Admin cards)
Step 3: Select User (dropdown shows pre-seeded users for tenant + role)
         - Displays: "John Doe (john@swift.com)"
         - For drivers: Shows driver name + ID
Step 4: Submit → JWT issued with tenantId + userId
```

**Note**: No password required in POC (mock auth). User selection ensures we're logging in as a pre-seeded user.

**Component Structure (Pre-Seeded Users)**:
```tsx
export function LoginScreen() {
  const [step, setStep] = useState<'tenant' | 'role' | 'user-select'>('tenant');
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch tenants on mount
  useEffect(() => {
    fetchTenants();
  }, []);

  // Fetch users when role selected (filtered by tenant + role)
  useEffect(() => {
    if (selectedRole && selectedTenant) {
      fetchUsers(selectedTenant, selectedRole);
    }
  }, [selectedRole, selectedTenant]);

  const handleTenantSelect = (tenantId: string) => {
    setSelectedTenant(tenantId);
    setStep('role');
  };

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setStep('user-select'); // Always show user selection
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUser(userId);
  };

  const handleLogin = async () => {
    if (!selectedTenant || !selectedUser) {
      setError('Please select a user');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await loginAPI({
        tenant_id: selectedTenant,
        user_id: selectedUser
      });
      useSessionStore.getState().login(response.accessToken, response.user);

      // Redirect based on role
      if (response.user.role === 'DRIVER') {
        router.push('/driver/dashboard');
      } else {
        router.push('/dispatcher/overview');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Tenant selection
  if (step === 'tenant') {
    return <TenantSelectionStep
      tenants={tenants}
      onTenantSelect={handleTenantSelect}
    />;
  }

  // Step 2: Role selection
  if (step === 'role') {
    return <RoleSelectionStep
      selectedTenant={selectedTenant}
      onRoleSelect={handleRoleSelect}
      onBack={() => setStep('tenant')}
    />;
  }

  // Step 3: User selection (for all roles)
  return (
    <UserSelectionStep
      users={users}
      selectedUser={selectedUser}
      onUserSelect={handleUserSelect}
      onSubmit={handleLogin}
      onBack={() => setStep('role')}
      isLoading={isLoading}
      error={error}
    />
  );
}
```

**UserSelectionStep Component** (NEW):
```tsx
function UserSelectionStep({ users, selectedUser, onUserSelect, onSubmit, onBack, isLoading, error }) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <motion.div className="w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-6 text-center">
          Select User
        </h2>

        <div className="space-y-3 mb-6">
          {users.map((user) => (
            <motion.button
              key={user.userId}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onUserSelect(user.userId)}
              className={`w-full border-2 rounded-xl p-4 text-left transition-all
                ${selectedUser === user.userId
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-400'}`}
            >
              <div className="font-semibold">{user.firstName} {user.lastName}</div>
              <div className="text-sm text-gray-600">{user.email}</div>
              {user.role === 'DRIVER' && user.driverName && (
                <div className="text-xs text-gray-500 mt-1">Driver ID: {user.driverName}</div>
              )}
            </motion.button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={onBack}
            className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Back
          </button>
          <button
            onClick={onSubmit}
            disabled={!selectedUser || isLoading}
            className="flex-1 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
```

**Tenant Selection Step** (NEW):
```tsx
function TenantSelectionStep({ tenants, onTenantSelect }) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-6xl font-bold tracking-tight mb-4">SALLY</h1>
        <p className="text-xl text-gray-600">
          Intelligent Dispatch & Driver Coordination
        </p>
      </motion.div>

      <div className="w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-6 text-center">
          Select Your Fleet Company
        </h2>
        <div className="space-y-3">
          {tenants.map((tenant) => (
            <motion.button
              key={tenant.tenantId}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onTenantSelect(tenant.tenantId)}
              className="w-full bg-white border-2 border-gray-200 rounded-xl p-6 text-left
                         hover:border-black hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                  <Building className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{tenant.companyName}</h3>
                  <p className="text-sm text-gray-600">{tenant.subdomain}.sally.app</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Role Selection Cards**:
```tsx
function RoleSelectionStep({ onRoleSelect }) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-6xl font-bold tracking-tight mb-4">SALLY</h1>
        <p className="text-xl text-gray-600">
          Intelligent Dispatch & Driver Coordination
        </p>
      </motion.div>

      <div className="w-full max-w-md space-y-4">
        <RoleCard
          icon={<Truck className="w-8 h-8" />}
          title="I'm a Dispatcher"
          description="Manage routes & monitor fleet"
          onClick={() => onRoleSelect('DISPATCHER')}
        />
        <RoleCard
          icon={<Steering className="w-8 h-8" />}
          title="I'm a Driver"
          description="View routes & receive updates"
          onClick={() => onRoleSelect('DRIVER')}
        />
        <RoleCard
          icon={<Settings className="w-8 h-8" />}
          title="I'm an Admin"
          description="Manage users & settings"
          onClick={() => onRoleSelect('ADMIN')}
        />
      </div>
    </div>
  );
}

function RoleCard({ icon, title, description, onClick }) {
  return (
    <motion.button
      whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full bg-white border-2 border-gray-200 rounded-xl p-6 text-left
                 hover:border-black transition-colors duration-200
                 shadow-lg hover:shadow-2xl"
    >
      <div className="flex items-start space-x-4">
        <div className="bg-black text-white p-3 rounded-lg">{icon}</div>
        <div>
          <h3 className="text-xl font-semibold mb-1">{title}</h3>
          <p className="text-gray-600">{description}</p>
        </div>
      </div>
    </motion.button>
  );
}
```

#### 4.2 Update Session Store
**File**: `/Users/ajay-admin/sally/apps/web/src/lib/store/sessionStore.ts`

**Key Changes**:
```typescript
import { create } from 'zustand';
// REMOVE persist middleware

interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'DISPATCHER' | 'DRIVER' | 'ADMIN';
  tenantId: string;           // NEW: Multi-tenancy
  tenantName: string;         // NEW: For display purposes
  driverId?: string;
  isActive: boolean;
}

interface SessionState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface SessionActions {
  login: (accessToken: string, user: User) => void;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useSessionStore = create<SessionState & SessionActions>()(
  // NO PERSIST - security best practice
  (set, get) => ({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: false,

    login: (accessToken, user) => {
      set({
        accessToken,
        user,
        isAuthenticated: true,
      });
    },

    logout: async () => {
      const { accessToken } = get();
      if (accessToken) {
        try {
          await logoutAPI(); // Backend revokes refresh token
        } catch (error) {
          console.error('Logout error:', error);
        }
      }
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
      });
    },

    refreshToken: async () => {
      try {
        set({ isLoading: true });
        const { accessToken, user } = await refreshTokenAPI();
        set({
          accessToken,
          user,
          isAuthenticated: true,
        });
      } catch (error) {
        // Refresh failed, clear session
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    setLoading: (loading) => set({ isLoading: loading }),
  })
);
```

#### 4.3 Create API Client with JWT Interceptor
**File**: `/Users/ajay-admin/sally/apps/web/src/lib/api/client.ts` (NEW)

**Purpose**: Centralized API client that automatically adds JWT and handles token refresh

```typescript
import { useSessionStore } from '@/lib/store/sessionStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiClient<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const { accessToken, refreshToken } = useSessionStore.getState();

  // Add Authorization header
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...options.headers,
  };

  let response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
    credentials: 'include', // Include httpOnly cookies
  });

  // Handle 401 (token expired) - try to refresh
  if (response.status === 401 && accessToken) {
    try {
      // Refresh access token
      await refreshToken();

      // Retry original request with new token
      const newToken = useSessionStore.getState().accessToken;
      response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
          ...headers,
          Authorization: `Bearer ${newToken}`,
        },
        credentials: 'include',
      });
    } catch (refreshError) {
      // Refresh failed - redirect to login
      useSessionStore.getState().logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      throw new ApiError(401, 'Session expired. Please login again.');
    }
  }

  // Handle other errors
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: `Request failed with status ${response.status}`,
    }));
    throw new ApiError(
      response.status,
      error.message || error.detail || 'Request failed',
      error
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Convenience methods
export const api = {
  get: <T = any>(url: string, options?: RequestInit) =>
    apiClient<T>(url, { ...options, method: 'GET' }),

  post: <T = any>(url: string, data?: any, options?: RequestInit) =>
    apiClient<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = any>(url: string, data?: any, options?: RequestInit) =>
    apiClient<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = any>(url: string, options?: RequestInit) =>
    apiClient<T>(url, { ...options, method: 'DELETE' }),
};
```

#### 4.4 Update Auth API Module (Multi-Tenant)
**File**: `/Users/ajay-admin/sally/apps/web/src/lib/api/auth.ts` (NEW)

```typescript
import { api } from './client';

export interface Tenant {
  tenantId: string;
  companyName: string;
  subdomain?: string;
  isActive: boolean;
}

export interface LoginRequest {
  tenant_id: string;           // NEW: Multi-tenancy
  role: 'DISPATCHER' | 'DRIVER' | 'ADMIN';
  driver_id?: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    tenantId: string;          // NEW: Multi-tenancy
    tenantName: string;        // NEW: For display
    driverId?: string;
    isActive: boolean;
  };
}

// NEW: Fetch available tenants
export async function listTenants(): Promise<Tenant[]> {
  return api.get('/api/v1/tenants');
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  return api.post('/api/v1/auth/login', data);
}

export async function logout(): Promise<void> {
  return api.post('/api/v1/auth/logout');
}

export async function refreshToken(): Promise<LoginResponse> {
  return api.post('/api/v1/auth/refresh');
}

export async function getProfile(): Promise<LoginResponse['user']> {
  return api.get('/api/v1/auth/me');
}
```

#### 4.5 Update Other API Modules
**Files to Update**:
- `/Users/ajay-admin/sally/apps/web/src/lib/api/drivers.ts`
- `/Users/ajay-admin/sally/apps/web/src/lib/api/vehicles.ts`
- `/Users/ajay-admin/sally/apps/web/src/lib/api/alerts.ts`

**Change**:
```typescript
// BEFORE
const response = await fetch(`${API_BASE_URL}/api/v1/drivers`, {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' },
});

// AFTER
import { api } from './client';

export async function listDrivers(): Promise<Driver[]> {
  return api.get('/api/v1/drivers');
}
```

---

## Phase 5: Frontend Session Restoration

### Files to Modify

#### 5.1 Add Session Restoration to Layout
**File**: `/Users/ajay-admin/sally/apps/web/src/app/layout-client.tsx`

**Add restoration logic**:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/sessionStore';
import AppLayout from '@/components/layout/AppLayout';

export function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, refreshToken, isLoading } = useSessionStore();
  const [isRestoring, setIsRestoring] = useState(true);

  // Restore session on page load
  useEffect(() => {
    async function restoreSession() {
      if (!isAuthenticated) {
        try {
          await refreshToken(); // Uses httpOnly cookie
          console.log('Session restored from refresh token');
        } catch (error) {
          console.log('No valid session to restore');
        }
      }
      setIsRestoring(false);
    }

    restoreSession();
  }, []);

  // Show loading spinner while restoring
  if (isRestoring || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
      </div>
    );
  }

  // Determine if current page requires auth
  const isAuthPage = pathname?.startsWith('/dispatcher') ||
                     pathname?.startsWith('/driver') ||
                     pathname?.startsWith('/settings');

  // Render authenticated layout or public layout
  if (isAuthPage && isAuthenticated) {
    return <AppLayout>{children}</AppLayout>;
  }

  return <>{children}</>;
}
```

#### 5.2 Update Root Layout
**File**: `/Users/ajay-admin/sally/apps/web/src/app/layout.tsx`

**Wrap with LayoutClient**:
```tsx
import { LayoutClient } from './layout-client';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}
```

#### 5.3 Update AppLayout Route Protection
**File**: `/Users/ajay-admin/sally/apps/web/src/components/layout/AppLayout.tsx`

**Update role-based routing**:
```typescript
'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/sessionStore';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user } = useSessionStore();

  // Role-based route protection
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    // Check role-based access
    if (pathname?.startsWith('/dispatcher') && user?.role !== 'DISPATCHER' && user?.role !== 'ADMIN') {
      router.push('/driver/dashboard');
    } else if (pathname?.startsWith('/driver') && user?.role !== 'DRIVER') {
      router.push('/dispatcher/overview');
    } else if (pathname?.startsWith('/admin') && user?.role !== 'ADMIN') {
      router.push('/dispatcher/overview');
    }
  }, [isAuthenticated, user, pathname, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen">
      <AppSidebar user={user} />
      <main className="flex-1 overflow-auto">
        <TopNavigation user={user} />
        {children}
      </main>
    </div>
  );
}
```

#### 5.4 Update Sidebar Navigation
**File**: `/Users/ajay-admin/sally/apps/web/src/components/layout/AppSidebar.tsx`

**Pass user object**:
```typescript
export default function AppSidebar({ user }: { user: User | null }) {
  const navItems = user?.role === 'DRIVER' ? driverNavItems : dispatcherNavItems;

  return (
    <aside className="w-64 bg-white border-r">
      <div className="p-4">
        <h2 className="text-xl font-bold">SALLY</h2>
        <p className="text-sm text-gray-600">{user?.role}</p>
      </div>
      <nav className="mt-4">
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>
    </aside>
  );
}
```

#### 5.5 Update Top Navigation
**File**: `/Users/ajay-admin/sally/apps/web/src/components/dashboard/TopNavigation.tsx`

**Update logout handler**:
```typescript
export default function TopNavigation({ user }: { user: User | null }) {
  const router = useRouter();
  const { logout } = useSessionStore();

  const handleLogout = async () => {
    await logout(); // Calls API to revoke refresh token
    router.push('/');
  };

  return (
    <header className="border-b bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {user?.role === 'DRIVER' ? 'Driver Dashboard' : 'Dispatcher Dashboard'}
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            {user?.firstName} {user?.lastName}
          </span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
```

---

## Phase 6: Testing & Validation

### Manual Testing Checklist

#### 6.1 Login Flow
- [ ] Can see beautiful login screen with 3 role cards
- [ ] Clicking Dispatcher card logs in immediately
- [ ] Clicking Driver card shows driver dropdown
- [ ] Can select driver from dropdown
- [ ] Clicking Admin card logs in immediately
- [ ] Dispatcher redirected to `/dispatcher/overview`
- [ ] Driver redirected to `/driver/dashboard`
- [ ] Admin redirected to `/dispatcher/overview` (same as dispatcher)
- [ ] Access token stored in memory (check sessionStore)
- [ ] Refresh token set as httpOnly cookie (check DevTools > Application > Cookies)

#### 6.2 Authentication
- [ ] Can make authenticated API calls
- [ ] Authorization header includes `Bearer {token}`
- [ ] Backend validates JWT correctly
- [ ] Invalid token returns 401
- [ ] Expired token triggers refresh automatically
- [ ] Refresh token flow works (new access token issued)
- [ ] Refresh token rotation works (new refresh token issued)

#### 6.3 Role-Based Access Control
- [ ] Dispatcher can access `/dispatcher/*` routes
- [ ] Dispatcher can call `GET /api/v1/drivers`
- [ ] Dispatcher can call `POST /api/v1/routes/plan`
- [ ] Driver can access `/driver/*` routes
- [ ] Driver can call `GET /api/v1/drivers/me`
- [ ] Driver CANNOT call `GET /api/v1/drivers` (403 Forbidden)
- [ ] Driver CANNOT access `/dispatcher/*` (redirected)
- [ ] Admin can access dispatcher routes
- [ ] Admin can access `/api/v1/users` (future)

#### 6.4 Session Restoration
- [ ] Page refresh restores session automatically
- [ ] User info restored from refresh token
- [ ] Access token regenerated on page load
- [ ] Navigation works after page refresh
- [ ] Role-based routes still enforced after refresh

#### 6.5 Logout
- [ ] Logout button visible in top navigation
- [ ] Clicking logout calls API
- [ ] Refresh token revoked in database
- [ ] Refresh token cookie cleared
- [ ] Session store cleared
- [ ] Redirected to login screen
- [ ] Cannot access protected routes after logout

#### 6.6 Error Handling
- [ ] Invalid role shows error message
- [ ] Network error shows error message
- [ ] Token expiry handled gracefully
- [ ] Refresh failure redirects to login
- [ ] Clear error messages displayed to user

### Backend Testing

#### 6.7 Unit Tests
```bash
cd apps/backend
npm run test -- auth.service.spec.ts
npm run test -- jwt.service.spec.ts
```

#### 6.8 Integration Tests (e2e)
```bash
npm run test:e2e -- auth.e2e-spec.ts
```

Test cases:
- Login with valid credentials (tenant + role)
- Login with invalid tenant
- Login with invalid credentials
- Refresh token flow (preserves tenantId)
- Token expiry
- Logout and revocation
- Protected endpoint access
- Role-based endpoint access
- **Tenant isolation** (user from tenant A cannot access data from tenant B)

#### 6.9 Multi-Tenancy Testing (CRITICAL)
- [ ] User from Swift Transport can only see Swift drivers
- [ ] User from ABC Logistics can only see ABC drivers
- [ ] Cross-tenant API requests return 403 or empty results
- [ ] JWT token contains correct tenantId
- [ ] All database queries filtered by tenantId
- [ ] Tenant guard enforces isolation on all protected routes

---

## Phase 7: Documentation & Cleanup

### 7.1 Update README
**File**: `/Users/ajay-admin/sally/README.md`

Add authentication section:
```markdown
## Authentication

SALLY uses JWT-based authentication with role-based access control.

### Quick Start (POC Mode)

1. Start backend: `npm run dev`
2. Open browser: `http://localhost:3000`
3. Select role: Dispatcher, Driver, or Admin
4. No password required (mock auth enabled)

### User Roles

- **Dispatcher**: Manage routes, monitor fleet, acknowledge alerts
- **Driver**: View personal routes, HOS status, messages
- **Admin**: User management + all dispatcher features (future)

### API Authentication

All API requests require JWT in Authorization header:

```bash
curl -H "Authorization: Bearer {access_token}" \
  http://localhost:8000/api/v1/drivers
```

### Environment Variables

```bash
JWT_ACCESS_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
ENABLE_MOCK_AUTH=true  # No passwords required
```
```

### 7.2 Create Auth Documentation
**File**: `.docs/AUTHENTICATION.md` (NEW)

Document:
- JWT architecture
- Token structure
- Refresh token flow
- Role-based access control
- Security best practices
- Testing approach

### 7.3 Update API Documentation
**File**: `.specs/API_ENDPOINTS.md`

Add new auth endpoints:
```markdown
## Authentication Endpoints

### POST /api/v1/auth/login
Login (mock authentication for POC)

**Request**:
```json
{
  "role": "DISPATCHER",  // or "DRIVER", "ADMIN"
  "driver_id": "DRV001"  // Required if role=DRIVER
}
```

**Response**:
```json
{
  "accessToken": "eyJhbGc...",
  "user": {
    "userId": "user_123",
    "email": "john@sally.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "DISPATCHER",
    "isActive": true
  }
}
```

### POST /api/v1/auth/logout
Logout and revoke refresh token

### POST /api/v1/auth/refresh
Refresh access token using refresh token cookie

### GET /api/v1/auth/me
Get current user profile
```

### 7.4 Deprecate Session Endpoints
**Mark deprecated in API docs**:
```markdown
## ⚠️ DEPRECATED: Session Endpoints

The following endpoints are deprecated and will be removed in v2.0:

- `POST /api/v1/session/login` - Use `/api/v1/auth/login` instead
- `POST /api/v1/session/logout` - Use `/api/v1/auth/logout` instead
```

### 7.5 Cleanup
- [ ] Remove old session-based auth logic (if fully migrated)
- [ ] Remove unused imports
- [ ] Update package.json dependencies
- [ ] Run linter: `npm run lint`
- [ ] Run formatter: `npm run format`

---

## Verification Steps

### End-to-End Verification

1. **Start Backend**:
   ```bash
   cd apps/backend
   npm run dev
   ```

2. **Start Frontend**:
   ```bash
   cd apps/web
   npm run dev
   ```

3. **Test Login as Dispatcher (Multi-Tenant)**:
   - Open `http://localhost:3000`
   - **Select "Swift Transport"** from tenant dropdown
   - Click "I'm a Dispatcher"
   - Verify redirect to `/dispatcher/overview`
   - Check DevTools > Application > Cookies for refresh token
   - Check sessionStore for access token (contains tenantId)
   - Verify only Swift Transport drivers visible
   - Navigate to different pages
   - Refresh page (session should restore)
   - Logout (redirected to login)

4. **Test Login as Driver (Multi-Tenant)**:
   - **Select "Swift Transport"** from tenant dropdown
   - Click "I'm a Driver"
   - Select driver from dropdown (only Swift drivers shown)
   - Verify redirect to `/driver/dashboard`
   - Try accessing `/dispatcher/overview` (should redirect back)
   - Check API calls include Authorization header (with tenantId in JWT)
   - Refresh page (session should restore)

4b. **Test Cross-Tenant Isolation** (CRITICAL):
   - Login as Swift Transport dispatcher
   - Note drivers visible (e.g., 5 drivers)
   - Logout
   - Login as ABC Logistics dispatcher
   - Verify DIFFERENT set of drivers visible (e.g., 2 drivers)
   - Manually try to access Swift data via API (should fail)

5. **Test Token Refresh**:
   - Login as any role
   - Wait 15 minutes (or manually set short expiry in .env)
   - Make API call (should auto-refresh)
   - Verify new access token in sessionStore

6. **Test API Access Control**:
   - Login as Driver
   - Try `GET /api/v1/drivers` (should return 403)
   - Try `GET /api/v1/drivers/me` (should return 200)
   - Login as Dispatcher
   - Try `GET /api/v1/drivers` (should return 200)

7. **Test Error Handling**:
   - Manually delete refresh token cookie
   - Make API call (should redirect to login)
   - Verify clear error messages

---

## Rollback Plan

If issues arise:

1. **Keep old session endpoints active** during migration
2. **Frontend can fall back** to `/api/v1/session/login`
3. **Database migrations are reversible**: `npx prisma migrate reset`
4. **No data loss** (User table is additive, doesn't replace existing data)
5. **Feature flag**: Use `ENABLE_MOCK_AUTH=false` to disable new auth

---

## Success Criteria

- [ ] Beautiful login screen matching landing page design quality
- [ ] JWT tokens generated and validated correctly
- [ ] Refresh token rotation working
- [ ] httpOnly cookies set correctly
- [ ] Role-based access control enforced
- [ ] Session restoration on page reload working
- [ ] All 3 roles (Dispatcher, Driver, Admin) testable
- [ ] API client automatically adds JWT headers
- [ ] Protected routes enforce authentication
- [ ] Logout revokes tokens and clears session
- [ ] No breaking changes to existing functionality
- [ ] Documentation updated
- [ ] Tests passing (unit + integration)

---

## Estimated Implementation Time

- **Phase 1** (Database): 1-2 hours
- **Phase 2** (Backend JWT): 3-4 hours
- **Phase 3** (Update Controllers): 1-2 hours
- **Phase 4** (Frontend UI): 3-4 hours
- **Phase 5** (Session Restoration): 1-2 hours
- **Phase 6** (Testing): 2-3 hours
- **Phase 7** (Documentation): 1-2 hours

**Total**: 12-19 hours (1.5-2.5 days)

---

## Notes

- **POC Focus**: Mock auth (no real passwords) for rapid development
- **Future-Proof**: Architecture supports real password auth when ready
- **Security First**: Following JWT best practices (httpOnly cookies, short expiry, rotation)
- **Beautiful UX**: Login screen matches landing page quality
- **Zero Breaking Changes**: Backward compatible migration with old session endpoints
- **Developer-Friendly**: Easy to test different roles, clear error messages

---

## Critical Dependencies

- `@nestjs/jwt` - JWT generation/validation
- `@nestjs/passport` - Passport integration
- `passport-jwt` - JWT passport strategy
- `bcrypt` - Password hashing (future)
- `zustand` - Frontend state management
- `framer-motion` - Login screen animations

---

## Environment Setup

Backend `.env`:
```bash
JWT_ACCESS_SECRET=your-access-secret-here-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-here-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
ENABLE_MOCK_AUTH=true
BCRYPT_ROUNDS=10
```

Frontend `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## CRITICAL: Multi-Tenancy Implementation Checklist

This checklist MUST be followed to ensure proper tenant isolation and data security.

### Database Layer
- [ ] Every entity table has `tenantId` foreign key column
- [ ] Composite unique constraints include `tenantId` (e.g., `@@unique([driverId, tenantId])`)
- [ ] Foreign keys reference correct tenant relationships
- [ ] Database indexes include `tenantId` for query performance
- [ ] Migration script assigns existing data to default tenant

### Backend Layer
- [ ] JWT payload includes `tenantId` in every token
- [ ] `TenantGuard` applied globally to all protected routes
- [ ] Every Prisma query includes `where: { tenantId: user.tenantId }`
- [ ] Service methods accept `tenantId` parameter
- [ ] No cross-tenant queries (except for super admin in future)
- [ ] Auth service validates tenant exists and is active before login

### Frontend Layer
- [ ] Session store includes `tenantId` and `tenantName`
- [ ] Login flow includes tenant selection step
- [ ] All API calls automatically include JWT with `tenantId`
- [ ] UI displays current tenant name (header or sidebar)
- [ ] No tenant data cached across tenant switches

### Security Validation
- [ ] Test: User A cannot access User B's data (different tenants)
- [ ] Test: API endpoint without tenant filter fails
- [ ] Test: Cross-tenant API request returns 403
- [ ] Test: JWT without tenantId is rejected
- [ ] Test: Invalid tenantId in JWT is rejected
- [ ] Code review: Search codebase for queries WITHOUT tenantId filter

### Common Pitfalls to Avoid
1. **Forgetting tenantId in queries** - ALWAYS filter by tenantId
2. **Caching across tenants** - Clear cache on tenant switch
3. **Global IDs** - Use composite keys (id + tenantId)
4. **Shared resources** - Decide what's tenant-specific vs global
5. **Super admin access** - Implement carefully (future feature)
