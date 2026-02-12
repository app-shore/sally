# Customer / Shipper Portal — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a customer login portal with shipment tracking, load request submission, and public tracking links — so shippers stop calling dispatchers asking "where's my truck?"

**Architecture:** New `CUSTOMER` role in auth system. Customer users are scoped to a Customer entity and can only see their own loads. Public tracking page uses token-based access (no auth). Load requests from shippers land in the dispatcher's Loads dispatch board as drafts. Email notifications triggered by load status changes.

**Tech Stack:** NestJS 11, Prisma 7.3, PostgreSQL, Next.js 15 (App Router), TypeScript, Shadcn UI, Tailwind CSS

**Dependency:** This plan assumes Task 1 and Task 2 from `2026-02-11-loads-dispatch-board-implementation.md` are already completed (Customer entity exists, Load model has `customerId` and `trackingToken` fields).

---

## Task 1: Add CUSTOMER Role to Auth System

**Files:**
- Modify: `apps/backend/prisma/schema.prisma:13-19` (UserRole enum)
- Modify: `apps/web/src/shared/lib/navigation.ts` (add customer nav)
- Modify: `apps/web/src/shared/lib/navigation.ts:7` (add CUSTOMER to role types)

### Step 1: Add CUSTOMER to UserRole enum

In `apps/backend/prisma/schema.prisma`:

```prisma
enum UserRole {
  DISPATCHER
  DRIVER
  ADMIN
  OWNER
  CUSTOMER        // External customer/shipper with limited portal access
  SUPER_ADMIN
}
```

### Step 2: Run migration

Run: `cd apps/backend && npx prisma migrate dev --name add_customer_role`
Expected: Migration applied. Prisma client regenerated.

### Step 3: Add customer navigation config

In `apps/web/src/shared/lib/navigation.ts`, add to `navigationConfig`:

```typescript
customer: [
  { label: 'My Shipments', href: '/customer/dashboard', icon: Package },
  { label: 'Request Load', href: '/customer/request-load', icon: Plus },
  { type: 'separator', label: 'Configuration' } as NavSeparator,
  { label: 'Settings', href: '/settings/general', icon: Settings },
],
```

Update role type definitions to include `'CUSTOMER'` wherever `'DISPATCHER' | 'DRIVER' | ...` is used.

Update `getDefaultRouteForRole()`:
```typescript
case 'CUSTOMER':
  return '/customer/dashboard';
```

### Step 4: Update protectedRoutePatterns

Add `/customer` to the protected route patterns array.

### Step 5: Commit

```bash
git add apps/backend/prisma/ apps/web/src/shared/lib/navigation.ts
git commit -m "feat: add CUSTOMER role to auth system and navigation"
```

---

## Task 2: Public Tracking Endpoint (Backend)

**Files:**
- Create: `apps/backend/src/domains/fleet/loads/controllers/tracking.controller.ts`
- Modify: `apps/backend/src/domains/fleet/loads/loads.module.ts`
- Modify: `apps/backend/src/domains/fleet/loads/services/loads.service.ts`

### Step 1: Create TrackingController with public endpoint

```typescript
// apps/backend/src/domains/fleet/loads/controllers/tracking.controller.ts
import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../../../auth/decorators/public.decorator';
import { LoadsService } from '../services/loads.service';

@ApiTags('Tracking')
@Controller('tracking')
export class TrackingController {
  constructor(private readonly loadsService: LoadsService) {}

  @Get(':token')
  @Public()
  @ApiOperation({ summary: 'Get public tracking info for a load (no auth required)' })
  async getTrackingInfo(@Param('token') token: string) {
    return this.loadsService.getPublicTracking(token);
  }
}
```

### Step 2: Add getPublicTracking method to LoadsService

```typescript
async getPublicTracking(token: string) {
  const load = await this.prisma.load.findFirst({
    where: { trackingToken: token },
    include: {
      stops: {
        include: { stop: true },
        orderBy: { sequenceOrder: 'asc' },
      },
      tenant: { select: { companyName: true } },
      routePlanLoads: {
        include: {
          plan: {
            select: {
              estimatedArrival: true,
              status: true,
              isActive: true,
            },
          },
        },
      },
    },
  });

  if (!load) {
    throw new NotFoundException('Tracking information not found');
  }

  // Build timeline events
  const timeline = this.buildTrackingTimeline(load);

  // Get ETA from active route plan
  const activePlan = load.routePlanLoads
    .map(rpl => rpl.plan)
    .find(p => p.isActive);

  // Return ONLY shipper-safe data
  return {
    load_number: load.loadNumber,
    status: load.status,
    customer_name: load.customerName,
    carrier_name: load.tenant.companyName,
    equipment_type: load.equipmentType,
    weight_lbs: load.weightLbs,
    estimated_delivery: activePlan?.estimatedArrival?.toISOString() || null,
    timeline,
    stops: load.stops.map(ls => ({
      sequence_order: ls.sequenceOrder,
      action_type: ls.actionType,
      city: ls.stop?.city || null,
      state: ls.stop?.state || null,
    })),
    // Explicitly NOT returning: rate, driver phone, HOS, exact GPS, internal notes
  };
}

private buildTrackingTimeline(load: any) {
  const events: Array<{ event: string; status: string; timestamp?: string; detail?: string }> = [];

  events.push({
    event: 'Order Confirmed',
    status: 'completed',
    timestamp: load.createdAt.toISOString(),
  });

  if (['planned', 'active', 'in_transit', 'completed'].includes(load.status)) {
    events.push({
      event: 'Driver Assigned',
      status: 'completed',
    });
  }

  // Check if first pickup stop has actual dock hours (meaning picked up)
  const firstPickup = load.stops.find((s: any) => s.actionType === 'pickup');
  if (firstPickup?.actualDockHours !== null && ['active', 'in_transit', 'completed'].includes(load.status)) {
    events.push({
      event: 'Picked Up',
      status: 'completed',
      detail: `${firstPickup.stop?.city}, ${firstPickup.stop?.state}`,
    });
  }

  if (['active', 'in_transit'].includes(load.status)) {
    events.push({
      event: 'In Transit',
      status: 'current',
    });
  }

  // Last delivery stop
  const lastDelivery = [...load.stops].reverse().find((s: any) => s.actionType === 'delivery');
  if (load.status === 'completed') {
    events.push({
      event: 'Delivered',
      status: 'completed',
      detail: `${lastDelivery?.stop?.city}, ${lastDelivery?.stop?.state}`,
    });
  } else {
    events.push({
      event: 'Delivery',
      status: 'upcoming',
      detail: `${lastDelivery?.stop?.city}, ${lastDelivery?.stop?.state}`,
    });
  }

  return events;
}
```

### Step 3: Register TrackingController in LoadsModule

In `apps/backend/src/domains/fleet/loads/loads.module.ts`:

```typescript
import { TrackingController } from './controllers/tracking.controller';

@Module({
  imports: [PrismaModule],
  controllers: [LoadsController, TrackingController],
  providers: [LoadsService],
  exports: [LoadsService],
})
```

### Step 4: Verify endpoint works

Run: `cd apps/backend && pnpm dev`
Test: `curl http://localhost:8000/tracking/SOME-TOKEN` → should return 404 (no load with that token)
Test with a valid token after creating one.

### Step 5: Commit

```bash
git add apps/backend/src/domains/fleet/loads/
git commit -m "feat: add public tracking endpoint (no auth required)"
```

---

## Task 3: Public Tracking Page (Frontend)

**Files:**
- Create: `apps/web/src/app/track/[token]/page.tsx`

### Step 1: Create the public tracking page

This page is publicly accessible (no auth). It fetches tracking data from the public endpoint and renders the tracking timeline.

```typescript
// apps/web/src/app/track/[token]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Separator } from '@/shared/components/ui/separator';

interface TrackingData {
  load_number: string;
  status: string;
  customer_name: string;
  carrier_name: string;
  equipment_type?: string;
  weight_lbs: number;
  estimated_delivery?: string;
  timeline: Array<{
    event: string;
    status: 'completed' | 'current' | 'upcoming';
    timestamp?: string;
    detail?: string;
  }>;
  stops: Array<{
    sequence_order: number;
    action_type: string;
    city?: string;
    state?: string;
  }>;
}

export default function TrackingPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<TrackingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTracking = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/tracking/${token}`);
        if (!res.ok) throw new Error('Tracking information not found');
        const trackingData = await res.json();
        setData(trackingData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tracking');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTracking();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchTracking, 60000);
    return () => clearInterval(interval);
  }, [token]);

  if (isLoading) return <TrackingLoadingSkeleton />;
  if (error || !data) return <TrackingNotFound />;

  const origin = data.stops[0];
  const destination = data.stops[data.stops.length - 1];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="text-lg font-semibold text-foreground">SALLY</span>
          <span className="text-sm text-muted-foreground">Powered by {data.carrier_name}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Load header */}
        <div>
          <p className="text-sm text-muted-foreground">Load: {data.load_number}</p>
          <p className="text-lg font-medium text-foreground">
            {origin?.city}, {origin?.state} → {destination?.city}, {destination?.state}
          </p>
        </div>

        {/* Status card */}
        <Card>
          <CardContent className="p-6 text-center space-y-2">
            <StatusBadge status={data.status} />
            {data.estimated_delivery && (
              <p className="text-sm text-muted-foreground">
                Estimated Delivery: {new Date(data.estimated_delivery).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-4">Timeline</h3>
          <div className="space-y-4">
            {data.timeline.map((event, i) => (
              <TimelineEvent key={i} event={event} />
            ))}
          </div>
        </div>

        {/* POD section (placeholder for now) */}
        <Separator />
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">Proof of Delivery</h3>
          {data.status === 'completed' ? (
            <p className="text-sm text-muted-foreground">Documents available for download.</p>
          ) : (
            <p className="text-sm text-muted-foreground">Available after delivery.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: 'Order Pending',
    planned: 'Route Planned',
    active: 'In Transit',
    in_transit: 'In Transit',
    completed: 'Delivered',
    cancelled: 'Cancelled',
  };
  return (
    <p className="text-xl font-semibold text-foreground">
      {labels[status] || status}
    </p>
  );
}

function TimelineEvent({ event }: { event: { event: string; status: string; timestamp?: string; detail?: string } }) {
  const icons: Record<string, string> = {
    completed: '✅',
    current: '🚛',
    upcoming: '⬜',
  };
  return (
    <div className="flex gap-3">
      <span className="text-base">{icons[event.status]}</span>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className={`text-sm ${event.status === 'upcoming' ? 'text-muted-foreground' : 'text-foreground'}`}>
            {event.event}
          </span>
          {event.timestamp && (
            <span className="text-xs text-muted-foreground">
              {new Date(event.timestamp).toLocaleDateString()}
            </span>
          )}
        </div>
        {event.detail && <p className="text-xs text-muted-foreground">{event.detail}</p>}
      </div>
    </div>
  );
}

function TrackingLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Loading tracking information...</p>
    </div>
  );
}

function TrackingNotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-foreground">Tracking Not Found</p>
        <p className="text-sm text-muted-foreground">This tracking link may be invalid or expired.</p>
      </div>
    </div>
  );
}
```

### Step 2: Make tracking page public (no auth redirect)

In `apps/web/src/shared/lib/navigation.ts`, add `/track` to public routes:

```typescript
export const publicRoutes = ['/', '/login', '/track'] as const;
```

Also update `isPublicRoute()`:
```typescript
export function isPublicRoute(pathname: string): boolean {
  return publicRoutes.includes(pathname as any) || pathname.startsWith('/login') || pathname.startsWith('/track');
}
```

Check `apps/web/src/app/layout-client.tsx` to ensure the auth redirect logic skips `/track` routes.

### Step 3: Verify tracking page renders

Navigate to `/track/test-token` → should show "Tracking Not Found".
Create a load with tracking token, navigate to its URL → should show tracking data.
Verify dark mode. Verify mobile layout.

### Step 4: Commit

```bash
git add apps/web/src/app/track/ apps/web/src/shared/lib/navigation.ts
git commit -m "feat: build public tracking page for shippers (no auth)"
```

---

## Task 4: Customer Portal — Dashboard Page

**Files:**
- Create: `apps/web/src/app/customer/dashboard/page.tsx`
- Create: `apps/web/src/features/customer/api.ts`
- Create: `apps/web/src/features/customer/types.ts`

### Step 1: Create customer API client

```typescript
// apps/web/src/features/customer/types.ts
export interface CustomerLoad {
  load_id: string;
  load_number: string;
  status: string;
  customer_name: string;
  estimated_delivery?: string;
  origin_city?: string;
  origin_state?: string;
  destination_city?: string;
  destination_state?: string;
  tracking_token?: string;
  created_at: string;
}
```

```typescript
// apps/web/src/features/customer/api.ts
import { apiClient } from '@/shared/lib/api';
import type { CustomerLoad } from './types';

export const customerApi = {
  getMyLoads: async (): Promise<CustomerLoad[]> => {
    return apiClient<CustomerLoad[]>('/customer/loads');
  },
  getLoad: async (loadId: string): Promise<any> => {
    return apiClient(`/customer/loads/${loadId}`);
  },
  requestLoad: async (data: any): Promise<any> => {
    return apiClient('/customer/loads/request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
```

### Step 2: Create customer dashboard page

```typescript
// apps/web/src/app/customer/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { customerApi } from '@/features/customer/api';
import type { CustomerLoad } from '@/features/customer/types';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Button } from '@/shared/components/ui/button';

export default function CustomerDashboard() {
  const { user } = useAuthStore();
  const [loads, setLoads] = useState<CustomerLoad[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    customerApi.getMyLoads()
      .then(setLoads)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const activeLoads = loads.filter(l => !['completed', 'cancelled'].includes(l.status));
  const historicalLoads = loads.filter(l => l.status === 'completed');

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">My Shipments</h1>
        <Button onClick={() => window.location.href = '/customer/request-load'}>
          + Request a Load
        </Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({activeLoads.length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-3 mt-4">
          {activeLoads.map(load => (
            <CustomerLoadCard key={load.load_id} load={load} />
          ))}
          {activeLoads.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">No active shipments.</p>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3 mt-4">
          {historicalLoads.map(load => (
            <CustomerLoadCard key={load.load_id} load={load} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CustomerLoadCard({ load }: { load: CustomerLoad }) {
  const statusLabels: Record<string, string> = {
    pending: '⏳ Pending',
    planned: '📋 Planned',
    active: '🚛 In Transit',
    in_transit: '🚛 In Transit',
    completed: '✅ Delivered',
  };

  return (
    <Card className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => {
            if (load.tracking_token) {
              window.location.href = `/track/${load.tracking_token}`;
            }
          }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{load.load_number}</p>
            <p className="text-sm text-muted-foreground">
              {load.origin_city}, {load.origin_state} → {load.destination_city}, {load.destination_state}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-foreground">{statusLabels[load.status] || load.status}</p>
            {load.estimated_delivery && (
              <p className="text-xs text-muted-foreground">
                ETA: {new Date(load.estimated_delivery).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Step 3: Commit

```bash
git add apps/web/src/app/customer/ apps/web/src/features/customer/
git commit -m "feat: build customer dashboard with shipment list"
```

---

## Task 5: Customer Portal — Backend Endpoints

**Files:**
- Create: `apps/backend/src/domains/fleet/loads/controllers/customer-loads.controller.ts`
- Modify: `apps/backend/src/domains/fleet/loads/services/loads.service.ts`
- Modify: `apps/backend/src/domains/fleet/loads/loads.module.ts`

### Step 1: Create CustomerLoadsController

```typescript
// apps/backend/src/domains/fleet/loads/controllers/customer-loads.controller.ts
import { Controller, Get, Post, Body, Param, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { BaseTenantController } from '../../../../shared/base/base-tenant.controller';
import { CurrentUser } from '../../../../auth/decorators/current-user.decorator';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { LoadsService } from '../services/loads.service';

@ApiTags('Customer Loads')
@ApiBearerAuth()
@Controller('customer/loads')
export class CustomerLoadsController extends BaseTenantController {
  constructor(
    prisma: PrismaService,
    private readonly loadsService: LoadsService,
  ) {
    super(prisma);
  }

  @Get()
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'List loads for authenticated customer' })
  async getMyLoads(@CurrentUser() user: any) {
    if (!user.customerId) {
      throw new ForbiddenException('No customer account linked');
    }
    return this.loadsService.findByCustomerId(user.customerId);
  }

  @Get(':load_id')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Get load detail for customer' })
  async getLoad(@CurrentUser() user: any, @Param('load_id') loadId: string) {
    if (!user.customerId) {
      throw new ForbiddenException('No customer account linked');
    }
    return this.loadsService.findOneForCustomer(loadId, user.customerId);
  }

  @Post('request')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Submit a load request (creates draft for dispatcher)' })
  async requestLoad(@CurrentUser() user: any, @Body() body: any) {
    if (!user.customerId) {
      throw new ForbiddenException('No customer account linked');
    }
    const tenantDbId = await this.getTenantDbId(user);
    return this.loadsService.createFromCustomerRequest({
      ...body,
      tenant_id: tenantDbId,
      customer_id: user.customerId,
    });
  }
}
```

### Step 2: Add customer-scoped methods to LoadsService

```typescript
async findByCustomerId(customerId: number) {
  const loads = await this.prisma.load.findMany({
    where: { customerId, isActive: true },
    include: {
      stops: { include: { stop: true }, orderBy: { sequenceOrder: 'asc' } },
      routePlanLoads: {
        include: {
          plan: { select: { estimatedArrival: true, isActive: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return loads.map(load => {
    const firstPickup = load.stops.find(s => s.actionType === 'pickup');
    const lastDelivery = [...load.stops].reverse().find(s => s.actionType === 'delivery');
    const activePlan = load.routePlanLoads.map(rpl => rpl.plan).find(p => p.isActive);

    return {
      load_id: load.loadId,
      load_number: load.loadNumber,
      status: load.status,
      customer_name: load.customerName,
      estimated_delivery: activePlan?.estimatedArrival?.toISOString() || null,
      origin_city: firstPickup?.stop?.city || null,
      origin_state: firstPickup?.stop?.state || null,
      destination_city: lastDelivery?.stop?.city || null,
      destination_state: lastDelivery?.stop?.state || null,
      tracking_token: load.trackingToken,
      created_at: load.createdAt.toISOString(),
      // NOT returning: rate, driver details, HOS
    };
  });
}

async findOneForCustomer(loadId: string, customerId: number) {
  const load = await this.prisma.load.findFirst({
    where: { loadId, customerId },
    include: { stops: { include: { stop: true }, orderBy: { sequenceOrder: 'asc' } } },
  });
  if (!load) throw new NotFoundException(`Load not found: ${loadId}`);
  // Return shipper-safe data only
  return this.formatLoadResponse(load);
}

async createFromCustomerRequest(data: {
  tenant_id: number;
  customer_id: number;
  pickup_address: string;
  pickup_city: string;
  pickup_state: string;
  delivery_address: string;
  delivery_city: string;
  delivery_state: string;
  pickup_date?: string;
  delivery_date?: string;
  weight_lbs: number;
  equipment_type?: string;
  commodity_type?: string;
  notes?: string;
}) {
  // Get customer name for the load
  const customer = await this.prisma.customer.findFirst({
    where: { id: data.customer_id },
  });

  const loadNumber = `REQ-${Date.now().toString(36).toUpperCase()}`;

  return this.create({
    tenant_id: data.tenant_id,
    load_number: loadNumber,
    weight_lbs: data.weight_lbs,
    commodity_type: data.commodity_type || 'general',
    special_requirements: data.notes || null,
    customer_name: customer?.companyName || 'Unknown',
    customer_id: data.customer_id,
    equipment_type: data.equipment_type || null,
    intake_source: 'portal',
    intake_metadata: { requested_by: 'customer_portal' },
    status: 'draft',
    stops: [
      {
        stop_id: `stop_${Date.now()}_pickup`,
        sequence_order: 1,
        action_type: 'pickup',
        estimated_dock_hours: 2,
        earliest_arrival: data.pickup_date || null,
        name: data.pickup_address,
        address: data.pickup_address,
        city: data.pickup_city,
        state: data.pickup_state,
      },
      {
        stop_id: `stop_${Date.now()}_delivery`,
        sequence_order: 2,
        action_type: 'delivery',
        estimated_dock_hours: 2,
        earliest_arrival: data.delivery_date || null,
        name: data.delivery_address,
        address: data.delivery_address,
        city: data.delivery_city,
        state: data.delivery_state,
      },
    ],
  });
}
```

### Step 3: Register controller in module

Add `CustomerLoadsController` to the controllers array in `loads.module.ts`.

### Step 4: Update JWT strategy to include customerId

In the JWT strategy's `validate()` method (`apps/backend/src/auth/strategies/jwt.strategy.ts`), ensure the returned user object includes `customerId` from the User model.

Look for where the user is fetched and add:
```typescript
customerId: user.customerId,
```
to the returned object.

### Step 5: Commit

```bash
git add apps/backend/src/domains/fleet/loads/ apps/backend/src/auth/
git commit -m "feat: add customer-scoped load endpoints and load request"
```

---

## Task 6: Customer Portal — Load Request Page

**Files:**
- Create: `apps/web/src/app/customer/request-load/page.tsx`

### Step 1: Build the load request form

Simple form with: pickup address/city/state, delivery address/city/state, dates, weight, equipment type, notes.

```typescript
// apps/web/src/app/customer/request-load/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { customerApi } from '@/features/customer/api';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

export default function RequestLoadPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupCity, setPickupCity] = useState('');
  const [pickupState, setPickupState] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryState, setDeliveryState] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  const [equipmentType, setEquipmentType] = useState('dry_van');
  const [commodityType, setCommodityType] = useState('general');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await customerApi.requestLoad({
        pickup_address: pickupAddress,
        pickup_city: pickupCity,
        pickup_state: pickupState,
        pickup_date: pickupDate || undefined,
        delivery_address: deliveryAddress,
        delivery_city: deliveryCity,
        delivery_state: deliveryState,
        delivery_date: deliveryDate || undefined,
        weight_lbs: parseFloat(weightLbs) || 0,
        equipment_type: equipmentType,
        commodity_type: commodityType,
        notes: notes || undefined,
      });
      router.push('/customer/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Request a Shipment</h1>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* Pickup section */}
      <Card>
        <CardHeader><CardTitle className="text-base">Pickup</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Address</Label>
            <Input value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} placeholder="1234 Industrial Blvd" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>City</Label><Input value={pickupCity} onChange={e => setPickupCity(e.target.value)} placeholder="Dallas" /></div>
            <div><Label>State</Label><Input value={pickupState} onChange={e => setPickupState(e.target.value)} placeholder="TX" /></div>
          </div>
          <div><Label>Preferred Pickup Date</Label><Input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} /></div>
        </CardContent>
      </Card>

      {/* Delivery section */}
      <Card>
        <CardHeader><CardTitle className="text-base">Delivery</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Address</Label>
            <Input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="5678 Warehouse Dr" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>City</Label><Input value={deliveryCity} onChange={e => setDeliveryCity(e.target.value)} placeholder="Atlanta" /></div>
            <div><Label>State</Label><Input value={deliveryState} onChange={e => setDeliveryState(e.target.value)} placeholder="GA" /></div>
          </div>
          <div><Label>Preferred Delivery Date</Label><Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} /></div>
        </CardContent>
      </Card>

      {/* Details section */}
      <Card>
        <CardHeader><CardTitle className="text-base">Shipment Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Weight (lbs)</Label><Input type="number" value={weightLbs} onChange={e => setWeightLbs(e.target.value)} placeholder="20000" /></div>
            <div>
              <Label>Equipment</Label>
              <Select value={equipmentType} onValueChange={setEquipmentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dry_van">Dry Van</SelectItem>
                  <SelectItem value="reefer">Reefer</SelectItem>
                  <SelectItem value="flatbed">Flatbed</SelectItem>
                  <SelectItem value="step_deck">Step Deck</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Commodity</Label>
            <Select value={commodityType} onValueChange={setCommodityType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="hazmat">Hazmat</SelectItem>
                <SelectItem value="refrigerated">Refrigerated</SelectItem>
                <SelectItem value="fragile">Fragile</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special instructions..." /></div>
        </CardContent>
      </Card>

      <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Submitting...' : 'Submit Request'}
      </Button>
    </div>
  );
}
```

### Step 2: Verify form submits and creates draft load

Submit request → check dispatcher's Loads board → should appear in Drafts column with "from portal" source badge.

### Step 3: Commit

```bash
git add apps/web/src/app/customer/
git commit -m "feat: build customer load request form"
```

---

## Task 7: Customer Invitation Flow

**Files:**
- Modify: `apps/backend/src/domains/fleet/customers/controllers/customers.controller.ts`
- Modify: `apps/backend/src/domains/fleet/customers/services/customers.service.ts`

### Step 1: Add invite-customer endpoint

Dispatcher invites a customer contact (creates user with CUSTOMER role):

```typescript
@Post(':customer_id/invite')
@Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
@ApiOperation({ summary: 'Invite a customer contact to the portal' })
async inviteCustomer(
  @CurrentUser() user: any,
  @Param('customer_id') customerId: string,
  @Body() body: { email: string; first_name: string; last_name: string },
) {
  const tenantDbId = await this.getTenantDbId(user);
  return this.customersService.inviteContact(customerId, {
    ...body,
    tenant_id: tenantDbId,
    invited_by: user.id,
  });
}
```

### Step 2: Implement inviteContact in service

Use the existing `UserInvitationsService` pattern — create a UserInvitation with role CUSTOMER and link to customerId on the User model when accepted.

### Step 3: Commit

```bash
git add apps/backend/src/domains/fleet/customers/
git commit -m "feat: add customer invitation flow for portal access"
```

---

## Task 8: Auto-Generate Tracking Token on Load Activation

**Files:**
- Modify: `apps/backend/src/domains/fleet/loads/services/loads.service.ts`

### Step 1: Update status change to auto-generate tracking token

In `updateStatus()`, when status changes to `active`:

```typescript
async updateStatus(loadId: string, status: string) {
  // ... existing validation ...

  const updateData: any = { status, updatedAt: new Date() };

  // Auto-generate tracking token when load goes active
  if (status === 'active' && !load.trackingToken) {
    const token = `${load.loadNumber}-${randomBytes(3).toString('hex')}`;
    updateData.trackingToken = token;
  }

  const updated = await this.prisma.load.update({
    where: { id: load.id },
    data: updateData,
    include: { stops: { include: { stop: true }, orderBy: { sequenceOrder: 'asc' } } },
  });

  this.logger.log(`Load ${loadId} status updated: ${status}`);
  return this.formatLoadResponse(updated);
}
```

### Step 2: Commit

```bash
git add apps/backend/src/domains/fleet/loads/services/loads.service.ts
git commit -m "feat: auto-generate tracking token when load status changes to active"
```

---

## Implementation Order Summary

| Task | Description | Depends On |
|------|------------|------------|
| 1 | Add CUSTOMER role to auth + navigation | Loads board Tasks 1-2 (schema) |
| 2 | Public tracking endpoint (backend) | Loads board Task 1 (trackingToken field) |
| 3 | Public tracking page (frontend) | Task 2 |
| 4 | Customer dashboard page | Task 1 |
| 5 | Customer backend endpoints (load list, request) | Task 1 |
| 6 | Customer load request form | Tasks 4, 5 |
| 7 | Customer invitation flow | Task 1, existing UserInvitation pattern |
| 8 | Auto-generate tracking token on activation | Loads board Task 3 |

**Tasks 2+4 can run in parallel** (backend tracking + frontend dashboard).
**Tasks 3+5 can run in parallel** (frontend tracking page + backend customer endpoints).

---

## Task 9: Customer Management & Invite UI for Dispatchers

**Problem:** Tasks 1-8 built the backend invite endpoint and customer portal pages, but there's no UI for dispatchers/admins to manage customers or send portal invitations. Without this, customers can never receive an invitation and log in.

**Approach:** Add a "Customers" tab to the existing Team page (`/admin/team`) — consistent and minimalistic. Dispatchers see their customer list with an "Invite to Portal" action on each customer. Follows the exact same pattern as the existing InviteDriverDialog and InviteUserDialog.

**Files:**
- Modify: `apps/web/src/features/fleet/customers/api.ts` (add invite method)
- Modify: `apps/web/src/features/fleet/customers/types.ts` (add invite types)
- Create: `apps/web/src/features/fleet/customers/components/invite-customer-dialog.tsx`
- Create: `apps/web/src/features/fleet/customers/components/customer-list.tsx`
- Modify: `apps/web/src/features/fleet/customers/index.ts` (create barrel export)
- Modify: `apps/web/src/app/admin/team/page.tsx` (add Customers tab)

### Step 1: Add invite API method and types

In `api.ts`, add `invite` method. In `types.ts`, add `CustomerInvite` and `CustomerInviteResponse` types.

### Step 2: Create InviteCustomerDialog component

Follow InviteDriverDialog pattern: Dialog with first name, last name, email fields. Calls `customersApi.invite(customerId, data)`. Shows customer info summary. Error/loading states.

### Step 3: Create CustomerList component

Table of customers with columns: Company, Contact, Email, Phone, Actions. Each row has an "Invite to Portal" button. Uses Shadcn Table. Empty state when no customers. Follows same visual style as UserList.

### Step 4: Add Customers tab to Team page

Add a third tab "Customers" to `/admin/team/page.tsx` alongside existing Staff and Invitations tabs. Tab shows CustomerList with invite dialog.

### Step 5: Verify and commit

Test: Navigate to /admin/team?tab=customers, see customer list, click invite, fill form, submit.

---

## Phase 2 Tasks (Not in this plan)

- Email notifications (pickup, in-transit, delivery, delay)
- SMS notifications
- POD upload by driver + display on tracking page
- Carrier branding on tracking page (logo, colors)
- Customer notification preferences
- Customer settings page
- Shipper load history with analytics
