# Loads Dispatch Board — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a standalone Loads page with Kanban dispatch board, enhanced load creation, copy/duplicate, templates, and route planning integration.

**Architecture:** New top-level `/dispatcher/loads` page with 4-column Kanban (Drafts → Pending → Assigned → In Transit). Backend schema adds `draft` status, `equipment_type`, `intake_source`, and `tracking_token` fields to the Load model. Frontend is a new page component with Shadcn Card-based Kanban columns and slide-out detail panel using Sheet component. Load status flow aligned with post-route lifecycle: `draft → pending → assigned → in_transit → delivered → cancelled`. Note: `planned`, `active`, and `completed` are route plan statuses, not load statuses.

**Tech Stack:** NestJS 11, Prisma 7.3, PostgreSQL, Next.js 15 (App Router), TypeScript, Shadcn UI, Tailwind CSS, React Query, Zustand

---

## Task 1: Schema Migration — Add New Load Fields

**Files:**
- Modify: `apps/backend/prisma/schema.prisma:583-611` (Load model)
- Create: `apps/backend/prisma/migrations/YYYYMMDD_load_dispatch_board/migration.sql`

### Step 1: Update Prisma schema

Add these fields to the Load model in `apps/backend/prisma/schema.prisma`:

```prisma
model Load {
  id                    Int          @id @default(autoincrement())
  loadId                String       @unique @map("load_id") @db.VarChar(50)
  loadNumber            String       @map("load_number") @db.VarChar(50)
  status                String       @default("pending") @db.VarChar(30)
  weightLbs             Float        @map("weight_lbs")
  commodityType         String       @map("commodity_type") @db.VarChar(100)
  specialRequirements   String?      @map("special_requirements") @db.Text
  customerName          String       @map("customer_name") @db.VarChar(200)
  isActive              Boolean      @default(true) @map("is_active")
  createdAt             DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt             DateTime     @updatedAt @map("updated_at") @db.Timestamptz

  // NEW: Equipment type
  equipmentType         String?      @map("equipment_type") @db.VarChar(50)

  // NEW: Intake source tracking
  intakeSource          String       @default("manual") @map("intake_source") @db.VarChar(30)
  intakeMetadata        Json?        @map("intake_metadata")

  // NEW: Tracking token for shipper portal
  trackingToken         String?      @unique @map("tracking_token") @db.VarChar(50)

  // NEW: Customer entity link (nullable during migration)
  customerId            Int?         @map("customer_id")
  customer              Customer?    @relation(fields: [customerId], references: [id])

  // NEW: Driver and vehicle assignment (currently only via RoutePlan)
  driverId              Int?         @map("driver_id")
  vehicleId             Int?         @map("vehicle_id")
  driver                Driver?      @relation(fields: [driverId], references: [id])
  vehicle               Vehicle?     @relation(fields: [vehicleId], references: [id])

  // External system linkage (existing)
  externalLoadId        String?      @map("external_load_id") @db.VarChar(100)
  externalSource        IntegrationVendor?  @map("external_source")
  lastSyncedAt          DateTime?    @map("last_synced_at") @db.Timestamptz

  tenantId              Int          @map("tenant_id")
  tenant                Tenant       @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
  @@index([status])
  @@index([customerId])
  @@index([trackingToken])

  stops                 LoadStop[]
  routePlanLoads        RoutePlanLoad[]

  @@unique([externalLoadId])
  @@map("loads")
}
```

Also add the `loads` relation to Driver and Vehicle models (if not already there):
- In Driver model: `loads Load[]`
- In Vehicle model: `loads Load[]`

### Step 2: Run migration

Run: `cd apps/backend && npx prisma migrate dev --name load_dispatch_board`
Expected: Migration created and applied successfully

### Step 3: Verify schema

Run: `cd apps/backend && npx prisma generate`
Expected: Prisma client generated successfully

### Step 4: Commit

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/
git commit -m "feat(schema): add equipment_type, intake_source, tracking_token to Load model"
```

---

## Task 2: Customer Entity — Schema & Basic CRUD

**Files:**
- Modify: `apps/backend/prisma/schema.prisma` (add Customer model)
- Create: `apps/backend/src/domains/fleet/customers/customers.module.ts`
- Create: `apps/backend/src/domains/fleet/customers/controllers/customers.controller.ts`
- Create: `apps/backend/src/domains/fleet/customers/services/customers.service.ts`
- Create: `apps/backend/src/domains/fleet/customers/dto/create-customer.dto.ts`
- Modify: `apps/backend/src/domains/fleet/fleet.module.ts` (import CustomersModule)

### Step 1: Add Customer model to Prisma schema

Add after the Load model:

```prisma
model Customer {
  id                Int          @id @default(autoincrement())
  customerId        String       @unique @map("customer_id") @db.VarChar(50)
  companyName       String       @map("company_name") @db.VarChar(200)
  contactName       String?      @map("contact_name") @db.VarChar(200)
  contactEmail      String?      @map("contact_email") @db.VarChar(255)
  contactPhone      String?      @map("contact_phone") @db.VarChar(20)
  billingEmail      String?      @map("billing_email") @db.VarChar(255)
  address           String?      @db.VarChar(500)
  city              String?      @db.VarChar(100)
  state             String?      @db.VarChar(50)
  notificationPrefs Json?        @map("notification_prefs")
  isActive          Boolean      @default(true) @map("is_active")
  createdAt         DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt         DateTime     @updatedAt @map("updated_at") @db.Timestamptz

  tenantId          Int          @map("tenant_id")
  tenant            Tenant       @relation(fields: [tenantId], references: [id])

  loads             Load[]
  users             User[]

  @@index([tenantId])
  @@map("customers")
}
```

Also add to Tenant model: `customers Customer[]`
Also add to User model: `customerId Int? @map("customer_id")` and `customer Customer? @relation(fields: [customerId], references: [id])`

### Step 2: Run migration

Run: `cd apps/backend && npx prisma migrate dev --name add_customer_entity`

### Step 3: Create CustomerService

```typescript
// apps/backend/src/domains/fleet/customers/services/customers.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    tenant_id: number;
    company_name: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
  }) {
    const customerId = `cust_${randomUUID().slice(0, 8)}`;
    const customer = await this.prisma.customer.create({
      data: {
        customerId,
        companyName: data.company_name,
        contactName: data.contact_name || null,
        contactEmail: data.contact_email || null,
        contactPhone: data.contact_phone || null,
        tenantId: data.tenant_id,
      },
    });
    return this.formatResponse(customer);
  }

  async findAll(tenantId: number) {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, isActive: true },
      orderBy: { companyName: 'asc' },
    });
    return customers.map(this.formatResponse);
  }

  async findOne(customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { customerId },
    });
    if (!customer) throw new NotFoundException(`Customer not found: ${customerId}`);
    return this.formatResponse(customer);
  }

  async update(customerId: string, data: Partial<{
    company_name: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
  }>) {
    const existing = await this.prisma.customer.findFirst({ where: { customerId } });
    if (!existing) throw new NotFoundException(`Customer not found: ${customerId}`);

    const updated = await this.prisma.customer.update({
      where: { id: existing.id },
      data: {
        ...(data.company_name !== undefined ? { companyName: data.company_name } : {}),
        ...(data.contact_name !== undefined ? { contactName: data.contact_name } : {}),
        ...(data.contact_email !== undefined ? { contactEmail: data.contact_email } : {}),
        ...(data.contact_phone !== undefined ? { contactPhone: data.contact_phone } : {}),
      },
    });
    return this.formatResponse(updated);
  }

  private formatResponse(customer: any) {
    return {
      id: customer.id,
      customer_id: customer.customerId,
      company_name: customer.companyName,
      contact_name: customer.contactName,
      contact_email: customer.contactEmail,
      contact_phone: customer.contactPhone,
      is_active: customer.isActive,
      created_at: customer.createdAt?.toISOString(),
    };
  }
}
```

### Step 4: Create CustomersController

```typescript
// apps/backend/src/domains/fleet/customers/controllers/customers.controller.ts
import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { BaseTenantController } from '../../../../shared/base/base-tenant.controller';
import { CurrentUser } from '../../../../auth/decorators/current-user.decorator';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CustomersService } from '../services/customers.service';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController extends BaseTenantController {
  constructor(
    prisma: PrismaService,
    private readonly customersService: CustomersService,
  ) {
    super(prisma);
  }

  @Post()
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Create a customer' })
  async create(@CurrentUser() user: any, @Body() body: any) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.customersService.create({ ...body, tenant_id: tenantDbId });
  }

  @Get()
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'List all customers' })
  async list(@CurrentUser() user: any) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.customersService.findAll(tenantDbId);
  }

  @Get(':customer_id')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Get customer details' })
  async get(@Param('customer_id') customerId: string) {
    return this.customersService.findOne(customerId);
  }

  @Put(':customer_id')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Update customer' })
  async update(@Param('customer_id') customerId: string, @Body() body: any) {
    return this.customersService.update(customerId, body);
  }
}
```

### Step 5: Create module and register

```typescript
// apps/backend/src/domains/fleet/customers/customers.module.ts
import { Module } from '@nestjs/common';
import { CustomersController } from './controllers/customers.controller';
import { CustomersService } from './services/customers.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
```

Add `CustomersModule` to imports in `apps/backend/src/domains/fleet/fleet.module.ts`.

### Step 6: Commit

```bash
git add apps/backend/
git commit -m "feat: add Customer entity with CRUD endpoints"
```

---

## Task 3: Update LoadsService — Draft Status, Equipment Type, Tracking Token

**Files:**
- Modify: `apps/backend/src/domains/fleet/loads/services/loads.service.ts`
- Modify: `apps/backend/src/domains/fleet/loads/dto/create-load.dto.ts`
- Modify: `apps/backend/src/domains/fleet/loads/controllers/loads.controller.ts`

### Step 1: Update CreateLoadDto

Add new fields to `apps/backend/src/domains/fleet/loads/dto/create-load.dto.ts`:

```typescript
  @ApiProperty({ example: 'dry_van', required: false })
  @IsString()
  @IsOptional()
  equipment_type?: string;

  @ApiProperty({ example: 'manual', required: false })
  @IsString()
  @IsOptional()
  intake_source?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  intake_metadata?: any;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  customer_id?: number;
```

### Step 2: Update LoadsService.create()

In `loads.service.ts`, update the create method to accept and store new fields:

```typescript
async create(data: {
  tenant_id: number;
  load_number: string;
  weight_lbs: number;
  commodity_type: string;
  special_requirements?: string;
  customer_name: string;
  equipment_type?: string;
  intake_source?: string;
  intake_metadata?: any;
  customer_id?: number;
  status?: string; // allow 'draft' for email/import intake
  stops: Array<{...}>; // existing stop structure
}) {
  const loadId = `LOAD-${data.load_number}`;

  const load = await this.prisma.load.create({
    data: {
      loadId,
      loadNumber: data.load_number,
      status: data.status || 'pending',
      weightLbs: data.weight_lbs,
      commodityType: data.commodity_type,
      specialRequirements: data.special_requirements || null,
      customerName: data.customer_name,
      equipmentType: data.equipment_type || null,
      intakeSource: data.intake_source || 'manual',
      intakeMetadata: data.intake_metadata || null,
      customerId: data.customer_id || null,
      tenantId: data.tenant_id,
      isActive: true,
    },
  });
  // ... rest of stop creation stays the same
}
```

### Step 3: Update valid statuses

In `updateStatus()` method, add 'draft' to valid statuses:

```typescript
const validStatuses = ['draft', 'pending', 'planned', 'active', 'in_transit', 'completed', 'cancelled'];
```

### Step 4: Add tracking token generation endpoint

Add to `loads.controller.ts`:

```typescript
@Post(':load_id/tracking-token')
@Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
@ApiOperation({ summary: 'Generate tracking token for load' })
async generateTrackingToken(@Param('load_id') loadId: string) {
  return this.loadsService.generateTrackingToken(loadId);
}
```

Add to `loads.service.ts`:

```typescript
async generateTrackingToken(loadId: string) {
  const load = await this.prisma.load.findFirst({ where: { loadId } });
  if (!load) throw new NotFoundException(`Load not found: ${loadId}`);

  const token = `${load.loadNumber}-${randomBytes(3).toString('hex')}`;
  const updated = await this.prisma.load.update({
    where: { id: load.id },
    data: { trackingToken: token },
  });

  return { tracking_token: token, tracking_url: `/track/${token}` };
}
```

### Step 5: Add duplicate/copy endpoint

Add to `loads.controller.ts`:

```typescript
@Post(':load_id/duplicate')
@Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
@ApiOperation({ summary: 'Duplicate an existing load' })
async duplicateLoad(
  @CurrentUser() user: any,
  @Param('load_id') loadId: string,
) {
  const tenantDbId = await this.getTenantDbId(user);
  return this.loadsService.duplicate(loadId, tenantDbId);
}
```

Add to `loads.service.ts`:

```typescript
async duplicate(loadId: string, tenantId: number) {
  const original = await this.prisma.load.findFirst({
    where: { loadId },
    include: { stops: { include: { stop: true }, orderBy: { sequenceOrder: 'asc' } } },
  });
  if (!original) throw new NotFoundException(`Load not found: ${loadId}`);

  const newLoadNumber = `${original.loadNumber}-COPY`;
  const newLoadId = `LOAD-${newLoadNumber}`;

  const newLoad = await this.prisma.load.create({
    data: {
      loadId: newLoadId,
      loadNumber: newLoadNumber,
      status: 'pending',
      weightLbs: original.weightLbs,
      commodityType: original.commodityType,
      specialRequirements: original.specialRequirements,
      customerName: original.customerName,
      equipmentType: original.equipmentType,
      intakeSource: 'manual',
      customerId: original.customerId,
      tenantId: tenantId,
      isActive: true,
    },
  });

  // Copy stops
  for (const loadStop of original.stops) {
    await this.prisma.loadStop.create({
      data: {
        loadId: newLoad.id,
        stopId: loadStop.stopId,
        sequenceOrder: loadStop.sequenceOrder,
        actionType: loadStop.actionType,
        estimatedDockHours: loadStop.estimatedDockHours,
        // Don't copy time windows - user should set new dates
      },
    });
  }

  const result = await this.prisma.load.findUnique({
    where: { id: newLoad.id },
    include: { stops: { include: { stop: true }, orderBy: { sequenceOrder: 'asc' } } },
  });
  return this.formatLoadResponse(result);
}
```

### Step 6: Update formatLoadResponse to include new fields

```typescript
formatLoadResponse(load: any) {
  // ... existing code ...
  return {
    // ... existing fields ...
    equipment_type: load.equipmentType,
    intake_source: load.intakeSource,
    tracking_token: load.trackingToken,
    customer_id: load.customerId,
    driver_id: load.driverId,
    vehicle_id: load.vehicleId,
    // ... stops ...
  };
}
```

Also update `findAll()` response to include `equipment_type` and `intake_source`.

### Step 7: Commit

```bash
git add apps/backend/src/domains/fleet/loads/
git commit -m "feat: add draft status, equipment type, tracking token, duplicate load"
```

---

## Task 4: Frontend — Update Load Types & API Client

**Files:**
- Modify: `apps/web/src/features/fleet/loads/types.ts`
- Modify: `apps/web/src/features/fleet/loads/api.ts`
- Create: `apps/web/src/features/fleet/customers/types.ts`
- Create: `apps/web/src/features/fleet/customers/api.ts`

### Step 1: Update Load types

Update `apps/web/src/features/fleet/loads/types.ts`:

```typescript
export interface Load {
  id: number;
  load_id: string;
  load_number: string;
  status: "draft" | "pending" | "planned" | "active" | "in_transit" | "completed" | "cancelled";
  weight_lbs: number;
  commodity_type: string;
  equipment_type?: string;
  special_requirements?: string;
  customer_name: string;
  customer_id?: number;
  intake_source: string;
  tracking_token?: string;
  driver_id?: number;
  vehicle_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  stops: LoadStop[];
}

export interface LoadListItem {
  id: number;
  load_id: string;
  load_number: string;
  status: string;
  customer_name: string;
  stop_count: number;
  weight_lbs: number;
  commodity_type: string;
  equipment_type?: string;
  intake_source?: string;
  external_load_id?: string;
  external_source?: string;
  last_synced_at?: string;
}

export interface LoadCreate {
  load_number: string;
  weight_lbs: number;
  commodity_type: string;
  equipment_type?: string;
  special_requirements?: string;
  customer_name: string;
  customer_id?: number;
  intake_source?: string;
  status?: string;
  stops: LoadStopCreate[];
}
```

### Step 2: Update loads API client

Add to `apps/web/src/features/fleet/loads/api.ts`:

```typescript
  duplicate: async (loadId: string): Promise<Load> => {
    return apiClient<Load>(`/loads/${loadId}/duplicate`, { method: 'POST' });
  },

  generateTrackingToken: async (loadId: string): Promise<{ tracking_token: string; tracking_url: string }> => {
    return apiClient(`/loads/${loadId}/tracking-token`, { method: 'POST' });
  },
```

### Step 3: Create customer types and API

```typescript
// apps/web/src/features/fleet/customers/types.ts
export interface Customer {
  id: number;
  customer_id: string;
  company_name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface CustomerCreate {
  company_name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
}
```

```typescript
// apps/web/src/features/fleet/customers/api.ts
import { apiClient } from '@/shared/lib/api';
import type { Customer, CustomerCreate } from './types';

export const customersApi = {
  list: async (): Promise<Customer[]> => apiClient<Customer[]>('/customers/'),
  getById: async (id: string): Promise<Customer> => apiClient<Customer>(`/customers/${id}`),
  create: async (data: CustomerCreate): Promise<Customer> =>
    apiClient<Customer>('/customers/', { method: 'POST', body: JSON.stringify(data) }),
  update: async (id: string, data: Partial<CustomerCreate>): Promise<Customer> =>
    apiClient<Customer>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};
```

### Step 4: Commit

```bash
git add apps/web/src/features/fleet/
git commit -m "feat: update load types/API with new fields, add customer types/API"
```

---

## Task 5: Frontend — Navigation Update (Add Loads to Sidebar)

**Files:**
- Modify: `apps/web/src/shared/lib/navigation.ts`
- Create: `apps/web/src/app/dispatcher/loads/page.tsx` (placeholder)

### Step 1: Update navigation config

In `apps/web/src/shared/lib/navigation.ts`, add `Loads` item to dispatcher, admin, and owner navs. Import `ClipboardList` from lucide-react.

Add after 'Command Center' in each nav config:

```typescript
{ label: 'Loads', href: '/dispatcher/loads', icon: ClipboardList },
```

The dispatcher array becomes:
```typescript
dispatcher: [
  { label: 'Command Center', href: '/dispatcher/overview', icon: Home },
  { label: 'Loads', href: '/dispatcher/loads', icon: ClipboardList },
  { label: 'Fleet', href: '/dispatcher/fleet', icon: Package },
  { label: 'Plan Route', href: '/dispatcher/create-plan', icon: Plus },
  { label: 'Live Routes', href: '/dispatcher/active-routes', icon: Truck },
  { label: 'Monitoring', href: '/dispatcher/monitoring', icon: Activity },
  // ... rest unchanged
],
```

Do the same for admin and owner configs.

### Step 2: Create placeholder page

```typescript
// apps/web/src/app/dispatcher/loads/page.tsx
'use client';

export default function LoadsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground">Loads</h1>
      <p className="text-muted-foreground mt-2">Dispatch board coming soon.</p>
    </div>
  );
}
```

### Step 3: Verify navigation works

Run: `cd apps/web && pnpm dev`
Navigate to `/dispatcher/loads` — should see placeholder.
Verify "Loads" appears in sidebar between "Command Center" and "Fleet".

### Step 4: Commit

```bash
git add apps/web/src/shared/lib/navigation.ts apps/web/src/app/dispatcher/loads/
git commit -m "feat: add Loads to sidebar navigation with placeholder page"
```

---

## Task 6: Frontend — Loads Dispatch Board (Kanban Layout)

**Files:**
- Modify: `apps/web/src/app/dispatcher/loads/page.tsx` (replace placeholder)

This is the main build task. The page renders a 4-column Kanban board using Shadcn Card components.

### Step 1: Build the Kanban board layout

Build the full Loads page with:

1. **Top bar**: Title + [+ New Load] button + [Import] dropdown
2. **Stats strip**: count per status
3. **View toggle**: [Active Board] [Completed] [Cancelled] tabs
4. **4-column Kanban**: Drafts | Ready to Plan | Planned | Active
5. **Load cards** per column with appropriate actions

Key implementation details:

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/store';
import { loadsApi } from '@/features/fleet/loads/api';
import type { LoadListItem, Load } from '@/features/fleet/loads/types';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
// ... more imports

export default function LoadsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [loads, setLoads] = useState<LoadListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Group loads by status for columns
  const drafts = loads.filter(l => l.status === 'draft');
  const readyToPlan = loads.filter(l => l.status === 'pending');
  const planned = loads.filter(l => l.status === 'planned');
  const active = loads.filter(l => ['active', 'in_transit'].includes(l.status));
  const completed = loads.filter(l => l.status === 'completed');
  const cancelled = loads.filter(l => l.status === 'cancelled');

  // ... data loading, handlers

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border">
        <h1 className="text-xl font-semibold text-foreground">Loads</h1>
        <div className="flex items-center gap-2">
          {/* Import dropdown and New Load button */}
        </div>
      </div>

      {/* Stats strip */}
      <div className="px-4 md:px-6 py-2 border-b border-border text-sm text-muted-foreground">
        {/* Stats: counts per status */}
      </div>

      {/* Main content with tabs */}
      <Tabs defaultValue="board" className="flex-1">
        <div className="px-4 md:px-6 pt-3">
          <TabsList>
            <TabsTrigger value="board">Active Board</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="board" className="flex-1 p-4 md:p-6">
          {/* 4-column Kanban grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
            <KanbanColumn title="Drafts" count={drafts.length} loads={drafts} />
            <KanbanColumn title="Ready to Plan" count={readyToPlan.length} loads={readyToPlan} />
            <KanbanColumn title="Planned" count={planned.length} loads={planned} />
            <KanbanColumn title="Active" count={active.length} loads={active} />
          </div>
        </TabsContent>

        <TabsContent value="completed">
          {/* Simple table view for completed loads */}
        </TabsContent>

        <TabsContent value="cancelled">
          {/* Simple table view for cancelled loads */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Step 2: Build KanbanColumn component

Each column is a vertical scrollable area with load cards:

```typescript
function KanbanColumn({ title, count, loads, onCardClick }: {
  title: string;
  count: number;
  loads: LoadListItem[];
  onCardClick: (load: LoadListItem) => void;
}) {
  return (
    <div className="flex flex-col bg-muted/30 rounded-lg">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <Badge variant="secondary" className="text-xs">{count}</Badge>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {loads.map(load => (
          <LoadCard key={load.load_id} load={load} onClick={() => onCardClick(load)} />
        ))}
        {loads.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No loads</p>
        )}
      </div>
    </div>
  );
}
```

### Step 3: Build LoadCard component

Card content varies by status — see design doc for card layouts per column (Draft, Ready to Plan, Planned, Active).

Key card structure:
```typescript
function LoadCard({ load, onClick }: { load: LoadListItem; onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">{load.load_id}</span>
          <IntakeSourceBadge source={load.intake_source} />
        </div>
        <p className="text-sm font-medium text-foreground">{load.customer_name}</p>
        {/* Origin → Destination (from first/last stop) */}
        <p className="text-xs text-muted-foreground">
          {load.stop_count} stops • {load.weight_lbs?.toLocaleString()} lbs
        </p>
        {load.equipment_type && (
          <p className="text-xs text-muted-foreground capitalize">{load.equipment_type.replace('_', ' ')}</p>
        )}
        {/* Action button based on status */}
        {load.status === 'pending' && (
          <Button size="sm" variant="outline" className="w-full mt-2 text-xs">
            Plan Route →
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

### Step 4: Add intake source badge helper

```typescript
function IntakeSourceBadge({ source }: { source?: string }) {
  const config: Record<string, { label: string; icon: string }> = {
    manual: { label: 'Manual', icon: '✋' },
    template: { label: 'Template', icon: '📋' },
    import: { label: 'Import', icon: '📊' },
    email: { label: 'Email', icon: '📧' },
    dat: { label: 'DAT', icon: '🔍' },
    tms_sync: { label: 'TMS', icon: '🔗' },
  };
  const s = config[source || 'manual'] || config.manual;
  return <span className="text-xs text-muted-foreground">{s.icon} {s.label}</span>;
}
```

### Step 5: Verify board renders

Run: `cd apps/web && pnpm dev`
Navigate to `/dispatcher/loads` — should see 4-column board.
Verify dark mode works. Verify responsive layout (stacks on mobile).

### Step 6: Commit

```bash
git add apps/web/src/app/dispatcher/loads/
git commit -m "feat: build Loads dispatch board with 4-column Kanban layout"
```

---

## Task 7: Frontend — Load Detail Slide-Out Panel

**Files:**
- Modify: `apps/web/src/app/dispatcher/loads/page.tsx`

### Step 1: Install Sheet component if not present

Run: `cd apps/web && npx shadcn@latest add sheet`

### Step 2: Add slide-out panel

Use Shadcn `Sheet` component for the detail panel that opens when clicking a load card:

```typescript
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet';

// In the page component:
const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
const [isDetailOpen, setIsDetailOpen] = useState(false);

const handleCardClick = async (loadListItem: LoadListItem) => {
  const fullLoad = await loadsApi.getById(loadListItem.load_id);
  setSelectedLoad(fullLoad);
  setIsDetailOpen(true);
};

// In JSX:
<Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
  <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
    {selectedLoad && <LoadDetailPanel load={selectedLoad} />}
  </SheetContent>
</Sheet>
```

### Step 3: Build LoadDetailPanel component

Shows: load info header, driver/vehicle if assigned, stops timeline, details section, activity log. See design doc for full layout.

### Step 4: Add action buttons in panel

Based on status:
- Draft: [Confirm] button (changes status to pending)
- Pending: [Plan Route →] (navigates to `/dispatcher/create-plan?load_id=X`)
- Planned: [Activate] + [Edit Plan]
- Active: [View on Live Routes →] + [Copy Tracking Link]

### Step 5: Verify panel works

Click a load card → panel slides out from right. All data displays correctly.
Actions work (confirm, plan route navigation, copy tracking link).

### Step 6: Commit

```bash
git add apps/web/src/app/dispatcher/loads/
git commit -m "feat: add load detail slide-out panel with actions"
```

---

## Task 8: Frontend — New Load Dialog (Enhanced)

**Files:**
- Modify: `apps/web/src/app/dispatcher/loads/page.tsx` (or extract to component)

### Step 1: Build enhanced load creation dialog

Reuse the existing LoadForm pattern from Fleet page but enhanced:

1. Add `equipment_type` select field (Dry Van, Reefer, Flatbed, Step Deck)
2. Add customer select/create (dropdown of existing customers + "New Customer" option)
3. Address fields should use text inputs for now (Google Places API is Phase 2)
4. Keep the dynamic stop management (add/remove stops)

Use Shadcn Dialog component:

```typescript
<Dialog>
  <DialogTrigger asChild>
    <Button>+ New Load</Button>
  </DialogTrigger>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Create Load</DialogTitle>
    </DialogHeader>
    {/* Enhanced LoadForm */}
  </DialogContent>
</Dialog>
```

### Step 2: Add equipment type field

```typescript
<div>
  <Label>Equipment Type</Label>
  <Select value={equipmentType} onValueChange={setEquipmentType}>
    <SelectTrigger><SelectValue placeholder="Select equipment" /></SelectTrigger>
    <SelectContent>
      <SelectItem value="dry_van">Dry Van</SelectItem>
      <SelectItem value="reefer">Reefer</SelectItem>
      <SelectItem value="flatbed">Flatbed</SelectItem>
      <SelectItem value="step_deck">Step Deck</SelectItem>
    </SelectContent>
  </Select>
</div>
```

### Step 3: Verify form creates loads correctly

Create a load via dialog → should appear in "Ready to Plan" column.
Verify all fields saved (equipment type, customer, stops).

### Step 4: Commit

```bash
git add apps/web/src/app/dispatcher/loads/
git commit -m "feat: enhanced load creation dialog with equipment type and customer"
```

---

## Task 9: Frontend — Duplicate Load & Copy Tracking Link

**Files:**
- Modify: `apps/web/src/app/dispatcher/loads/page.tsx`

### Step 1: Add duplicate button to load cards/detail panel

In the detail panel, add a "Duplicate" button that calls `loadsApi.duplicate(loadId)` and refreshes the board.

### Step 2: Add copy tracking link button

For active loads, add [Copy Tracking Link] button:

```typescript
const handleCopyTrackingLink = async (loadId: string) => {
  const result = await loadsApi.generateTrackingToken(loadId);
  const url = `${window.location.origin}/track/${result.tracking_token}`;
  await navigator.clipboard.writeText(url);
  // Show toast: "Tracking link copied"
};
```

### Step 3: Verify both features work

Duplicate a load → new load appears in board.
Copy tracking link → URL in clipboard.

### Step 4: Commit

```bash
git add apps/web/src/app/dispatcher/loads/
git commit -m "feat: add duplicate load and copy tracking link features"
```

---

## Task 10: Frontend — Plan Route Integration

**Files:**
- Modify: `apps/web/src/app/dispatcher/loads/page.tsx`
- Modify: `apps/web/src/app/dispatcher/create-plan/page.tsx`

### Step 1: Add Plan Route navigation from load cards

When dispatcher clicks [Plan Route →] on a "pending" load:

```typescript
const handlePlanRoute = (loadId: string) => {
  router.push(`/dispatcher/create-plan?load_id=${loadId}`);
};
```

### Step 2: Update create-plan page to accept load_id query param

In the route planning page, read the `load_id` from URL and pre-fill the form:

```typescript
import { useSearchParams } from 'next/navigation';

const searchParams = useSearchParams();
const preloadId = searchParams.get('load_id');

useEffect(() => {
  if (preloadId) {
    // Fetch load data and pre-fill form
    loadsApi.getById(preloadId).then(load => {
      // Set origin from first pickup stop
      // Set destination from last delivery stop
      // Set all intermediate stops
      // Set weight, equipment type, customer
    });
  }
}, [preloadId]);
```

### Step 3: Verify end-to-end flow

Create load → appears in "Ready to Plan" → click [Plan Route →] → route planning page opens with load data pre-filled.

### Step 4: Commit

```bash
git add apps/web/src/app/dispatcher/
git commit -m "feat: integrate loads board with route planning page via load_id param"
```

---

## Task 11: Remove Loads Tab from Fleet Page

**Files:**
- Modify: `apps/web/src/app/dispatcher/fleet/page.tsx`

### Step 1: Remove LoadsTab and related code

Since loads now have their own page, remove:
- The "Loads" tab from the Fleet page Tabs component
- The LoadForm component (or keep if reused)
- All loads-related state and handlers from the Fleet page
- The loads-related imports

Fleet page should only have: Drivers tab + Assets tab.

### Step 2: Add a link to the new Loads page

In the Fleet page, optionally add a small banner or note:
```typescript
<p className="text-sm text-muted-foreground">
  Looking for loads? <a href="/dispatcher/loads" className="underline">Go to Loads →</a>
</p>
```

### Step 3: Verify Fleet page still works

Drivers tab and Assets tab should work as before. No loads tab.

### Step 4: Commit

```bash
git add apps/web/src/app/dispatcher/fleet/page.tsx
git commit -m "refactor: remove Loads tab from Fleet page (moved to /dispatcher/loads)"
```

---

## Task 12: Completed & Cancelled Table Views

**Files:**
- Modify: `apps/web/src/app/dispatcher/loads/page.tsx`

### Step 1: Build simple table views for Completed and Cancelled tabs

Use Shadcn Table component:

```typescript
<TabsContent value="completed">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Load #</TableHead>
        <TableHead>Customer</TableHead>
        <TableHead>Lane</TableHead>
        <TableHead>Completed</TableHead>
        <TableHead>Equipment</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {completed.map(load => (
        <TableRow key={load.load_id} className="cursor-pointer" onClick={() => handleCardClick(load)}>
          <TableCell>{load.load_number}</TableCell>
          <TableCell>{load.customer_name}</TableCell>
          <TableCell>{/* origin → dest */}</TableCell>
          <TableCell>{/* date */}</TableCell>
          <TableCell>{load.equipment_type || '—'}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</TabsContent>
```

### Step 2: Commit

```bash
git add apps/web/src/app/dispatcher/loads/
git commit -m "feat: add completed and cancelled table views to Loads page"
```

---

## Implementation Order Summary

| Task | Description | Depends On |
|------|------------|------------|
| 1 | Schema migration (new Load fields) | — |
| 2 | Customer entity + CRUD | Task 1 |
| 3 | Update LoadsService (draft, equipment, tracking, duplicate) | Task 1 |
| 4 | Frontend types + API client updates | Task 3 |
| 5 | Navigation update + placeholder page | — |
| 6 | Kanban board layout | Tasks 4, 5 |
| 7 | Load detail slide-out panel | Task 6 |
| 8 | Enhanced New Load dialog | Task 6 |
| 9 | Duplicate load + copy tracking link | Tasks 7, 3 |
| 10 | Route planning integration | Tasks 7, 5 |
| 11 | Remove loads from Fleet page | Task 6 |
| 12 | Completed/Cancelled table views | Task 6 |

**Tasks 1+5 can run in parallel.** Tasks 2+3 can run in parallel after Task 1.
Tasks 6-12 are sequential frontend work after backend is ready.

---

## Phase 2 Tasks (Not in this plan)

- Excel/CSV import with column mapping
- Quick-create templates (save/use)
- Email-to-load (AI parsing)
- DAT inbound search
- Google Places API integration for addresses
