# Loads Management & TMS Integration - Node.js Implementation Plan

**Created:** February 6, 2026
**Status:** Ready for Implementation
**Epic:** Fleet Operations - Load Management
**Backend:** Node.js (NestJS + Prisma)
**Frontend:** Next.js 15 + TypeScript

---

## Executive Summary

### What We're Building

**Complete Loads Management feature with TMS integration** for SALLY's Fleet Operations platform.

### Current State ✅❌

**✅ What Exists:**
- Database schema (`loads`, `load_stops` in Prisma)
- Basic CRUD API (POST /loads, GET /loads, GET /loads/:id)
- LoadsService + LoadsController implemented
- Frontend API client (`features/fleet/loads/api.ts`)
- UI tab placeholder (Settings > Fleet > Loads)
- TMS sync pattern established (drivers/vehicles already syncing)

**❌ What's Missing:**
- No seed data for loads
- No mock TMS loads endpoint
- No TMS sync service for loads (only drivers/vehicles)
- Load UI is empty (no table, no details view)
- No load assignment flow (driver + vehicle)
- No route planning integration

### Scope

**Phase 1 (This Plan):**
1. ✅ Seed realistic load data
2. ✅ Mock TMS loads endpoint
3. ✅ TMS sync service (background cron job)
4. ✅ Complete load management UI
5. ✅ Load assignment flow

**Phase 2 (Future):**
- Real TMS adapters (TruckBase, McLeod, TMW)
- Route planning integration
- Load status automation
- Bi-directional sync (SALLY → TMS)

---

## Part 1: Understanding Loads in TMS Context

### What is a Load?

A **load** in TMS (Transportation Management System) represents:
- **A freight shipment** from origin(s) to destination(s)
- **Multiple stops** (pickup locations, delivery locations, or both)
- **Customer orders** consolidated into one truckload
- **Assignment** to specific driver and vehicle

### Load Lifecycle

```
┌─────────────────────────────────────────────────────┐
│ TMS System                                          │
│                                                     │
│ ORDER → LOAD CREATED → LOAD TENDERED               │
│           ↓                                         │
│    (Sync to SALLY)                                  │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│ SALLY System                                        │
│                                                     │
│ PENDING → ASSIGNED → PLANNED → IN_TRANSIT →        │
│           COMPLETED                                 │
│                                                     │
│ - Assign driver/vehicle                            │
│ - Generate optimized route                         │
│ - Monitor execution                                │
└─────────────────────────────────────────────────────┘
```

**SALLY's Role:** Route planning + execution monitoring for TMS-created loads.

### Key Terminology

| Term | Meaning | Example |
|------|---------|---------|
| **Order** | Single customer request | "Ship 100 pallets Chicago → Boston" |
| **Shipment** | Physical freight movement | "1 truckload with 3 orders" |
| **Load** | TMS assignment unit | "LOAD-12345: 2 pickups, 3 deliveries" |
| **Stop** | Location in route | "Chicago Warehouse (pickup)" |

---

## Part 2: Database Schema Review (Prisma)

### Load Model (✅ Already Correct)

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

  // TMS Integration fields
  externalLoadId        String?      @map("external_load_id") @db.VarChar(100)
  externalSource        String?      @map("external_source") @db.VarChar(50)
  lastSyncedAt          DateTime?    @map("last_synced_at") @db.Timestamptz

  stops                 LoadStop[]

  @@unique([externalLoadId])
  @@map("loads")
}
```

**Key Fields:**
- `loadId` - SALLY's internal ID (e.g., "LOAD-001")
- `loadNumber` - Customer/TMS reference (e.g., "WMT-45892")
- `externalLoadId` - TMS system's ID (for deduplication)
- `externalSource` - "truckbase_tms", "mcleod_tms", etc.
- `lastSyncedAt` - Last sync timestamp (for UI display)

### LoadStop Model (✅ Already Correct)

```prisma
model LoadStop {
  id                    Int          @id @default(autoincrement())
  loadId                Int          @map("load_id")
  stopId                Int          @map("stop_id")
  sequenceOrder         Int          @map("sequence_order")
  actionType            String       @map("action_type") @db.VarChar(20)
  earliestArrival       String?      @map("earliest_arrival") @db.VarChar(10)
  latestArrival         String?      @map("latest_arrival") @db.VarChar(10)
  estimatedDockHours    Float        @map("estimated_dock_hours")
  actualDockHours       Float?       @map("actual_dock_hours")
  createdAt             DateTime     @default(now()) @map("created_at") @db.Timestamptz

  load                  Load         @relation(fields: [loadId], references: [id])
  stop                  Stop         @relation(fields: [stopId], references: [id])

  @@index([loadId])
  @@map("load_stops")
}
```

**Smart Design:** Reuses `stops` table for locations (warehouses, customers, truck stops).

---

## Part 3: Implementation Tasks

### Task 1: Seed Realistic Load Data

**Goal:** Create 7 realistic loads for testing and demo.

**File:** `apps/backend/prisma/seed/loads.seed.ts` (NEW)

```typescript
import { PrismaClient } from '@prisma/client';

export async function seedLoads(prisma: PrismaClient) {
  console.log('🔄 Seeding loads...');

  // Define 7 realistic loads
  const loadsData = [
    {
      loadId: 'LOAD-001',
      loadNumber: 'WMT-45892',
      status: 'pending',
      weightLbs: 44500.0,
      commodityType: 'general',
      specialRequirements: 'Delivery appointment required - call 24h ahead',
      customerName: 'Walmart Distribution',
      externalLoadId: 'TMS-WMT-45892',
      externalSource: 'truckbase_tms',
      stops: [
        { stopId: 'STOP-WH-001', seq: 1, action: 'pickup', earliest: '06:00', latest: '10:00', dock: 1.5 },
        { stopId: 'STOP-CUS-002', seq: 2, action: 'delivery', earliest: '14:00', latest: '18:00', dock: 2.0 },
      ],
    },
    {
      loadId: 'LOAD-002',
      loadNumber: 'TGT-12034',
      status: 'pending',
      weightLbs: 42000.0,
      commodityType: 'refrigerated',
      specialRequirements: 'Maintain 38°F - reefer unit required',
      customerName: 'Target Logistics',
      externalLoadId: 'TMS-TGT-12034',
      externalSource: 'truckbase_tms',
      stops: [
        { stopId: 'STOP-WH-002', seq: 1, action: 'pickup', earliest: '07:00', latest: '12:00', dock: 2.5 },
        { stopId: 'STOP-WH-003', seq: 2, action: 'delivery', earliest: '06:00', latest: '16:00', dock: 1.5 },
        { stopId: 'STOP-TS-005', seq: 3, action: 'delivery', earliest: '08:00', latest: '18:00', dock: 1.0 },
      ],
    },
    {
      loadId: 'LOAD-003',
      loadNumber: 'FDX-78234',
      status: 'pending',
      weightLbs: 28000.0,
      commodityType: 'general',
      specialRequirements: 'Liftgate required at final stop',
      customerName: 'FedEx Freight',
      externalLoadId: 'TMS-FDX-78234',
      externalSource: 'truckbase_tms',
      stops: [
        { stopId: 'STOP-WH-001', seq: 1, action: 'pickup', earliest: '05:00', latest: '09:00', dock: 1.0 },
        { stopId: 'STOP-CUS-002', seq: 2, action: 'delivery', dock: 0.5 },
        { stopId: 'STOP-CUS-001', seq: 3, action: 'delivery', earliest: '07:00', latest: '17:00', dock: 0.75 },
      ],
    },
    {
      loadId: 'LOAD-004',
      loadNumber: 'AMZ-99201',
      status: 'pending',
      weightLbs: 38750.0,
      commodityType: 'general',
      specialRequirements: 'Must deliver by 10 AM - No weekend delivery',
      customerName: 'Amazon Fulfillment',
      externalLoadId: 'TMS-AMZ-99201',
      externalSource: 'truckbase_tms',
      stops: [
        { stopId: 'STOP-WH-002', seq: 1, action: 'pickup', earliest: '18:00', latest: '22:00', dock: 1.25 },
        { stopId: 'STOP-WH-003', seq: 2, action: 'delivery', earliest: '06:00', latest: '10:00', dock: 1.5 },
      ],
    },
    {
      loadId: 'LOAD-005',
      loadNumber: 'CAT-55612',
      status: 'pending',
      weightLbs: 47900.0,
      commodityType: 'fragile',
      specialRequirements: 'Flatbed required - Tarps provided - Oversize permits needed',
      customerName: 'Caterpillar Equipment',
      externalLoadId: 'TMS-CAT-55612',
      externalSource: 'truckbase_tms',
      stops: [
        { stopId: 'STOP-CUS-002', seq: 1, action: 'pickup', earliest: '08:00', latest: '14:00', dock: 3.0 },
        { stopId: 'STOP-CUS-001', seq: 2, action: 'delivery', earliest: '07:00', latest: '16:00', dock: 2.5 },
      ],
    },
    {
      loadId: 'LOAD-006',
      loadNumber: 'CVS-44023',
      status: 'pending',
      weightLbs: 12500.0,
      commodityType: 'refrigerated',
      specialRequirements: 'Temperature monitoring required - High value cargo - Team driver preferred',
      customerName: 'CVS Health Supply',
      externalLoadId: 'TMS-CVS-44023',
      externalSource: 'truckbase_tms',
      stops: [
        { stopId: 'STOP-CUS-001', seq: 1, action: 'pickup', earliest: '06:00', latest: '10:00', dock: 1.5 },
        { stopId: 'STOP-WH-001', seq: 2, action: 'delivery', earliest: '08:00', latest: '18:00', dock: 1.0 },
      ],
    },
    {
      loadId: 'LOAD-007',
      loadNumber: 'HD-88451',
      status: 'pending',
      weightLbs: 45800.0,
      commodityType: 'general',
      specialRequirements: 'Flatbed - Secure tarps - Multiple pickup locations',
      customerName: 'Home Depot Distribution',
      externalLoadId: 'TMS-HD-88451',
      externalSource: 'truckbase_tms',
      stops: [
        { stopId: 'STOP-WH-001', seq: 1, action: 'pickup', earliest: '06:00', latest: '12:00', dock: 2.0 },
        { stopId: 'STOP-CUS-002', seq: 2, action: 'pickup', dock: 1.5 },
        { stopId: 'STOP-WH-003', seq: 3, action: 'delivery', earliest: '08:00', latest: '18:00', dock: 2.5 },
      ],
    },
  ];

  for (const loadData of loadsData) {
    const { stops, ...loadFields } = loadData;

    // Create load
    const load = await prisma.load.upsert({
      where: { loadId: loadFields.loadId },
      create: {
        ...loadFields,
        isActive: true,
        lastSyncedAt: new Date(),
      },
      update: {
        ...loadFields,
        lastSyncedAt: new Date(),
      },
    });

    // Delete existing stops and recreate (for idempotent seeding)
    await prisma.loadStop.deleteMany({ where: { loadId: load.id } });

    // Create load stops
    for (const stopData of stops) {
      const stop = await prisma.stop.findFirst({
        where: { stopId: stopData.stopId },
      });

      if (stop) {
        await prisma.loadStop.create({
          data: {
            loadId: load.id,
            stopId: stop.id,
            sequenceOrder: stopData.seq,
            actionType: stopData.action,
            earliestArrival: stopData.earliest || null,
            latestArrival: stopData.latest || null,
            estimatedDockHours: stopData.dock,
          },
        });
      } else {
        console.warn(`⚠️  Stop ${stopData.stopId} not found, skipping for load ${loadFields.loadId}`);
      }
    }
  }

  console.log('✅ Loads seeded successfully (7 loads)');
}
```

**Update:** `apps/backend/prisma/seed.ts`

```typescript
import { seedLoads } from './seed/loads.seed';

async function main() {
  // ... existing seeds (tenants, users, drivers, vehicles, stops)

  await seedLoads(prisma);
}
```

**Run:** `npm run seed` (from apps/backend)

---

### Task 2: Create Mock TMS Loads Endpoint

**Goal:** Simulate TruckBase/McLeod TMS API for load data.

**File:** `apps/backend/src/domains/external/tms/tms.module.ts` (NEW MODULE)

```typescript
import { Module } from '@nestjs/common';
import { TmsMockController } from './controllers/tms-mock.controller';
import { TmsMockService } from './services/tms-mock.service';

@Module({
  controllers: [TmsMockController],
  providers: [TmsMockService],
  exports: [TmsMockService],
})
export class TmsModule {}
```

**File:** `apps/backend/src/domains/external/tms/controllers/tms-mock.controller.ts` (NEW)

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TmsMockService } from '../services/tms-mock.service';
import { Public } from '../../../../shared/decorators/public.decorator'; // Skip auth for mock endpoint

@ApiTags('External - TMS Mock')
@Controller('external/tms')
export class TmsMockController {
  constructor(private readonly tmsMockService: TmsMockService) {}

  @Public() // Mock endpoint - no auth required
  @Get('loads')
  @ApiOperation({ summary: 'Mock TMS loads endpoint (simulates TruckBase/McLeod API)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'customer_name', required: false, description: 'Filter by customer' })
  async getMockLoads(
    @Query('status') status?: string,
    @Query('customer_name') customerName?: string,
  ) {
    return this.tmsMockService.getMockLoads({ status, customer_name: customerName });
  }
}
```

**File:** `apps/backend/src/domains/external/tms/services/tms-mock.service.ts` (NEW)

```typescript
import { Injectable } from '@nestjs/common';

interface TmsLoadStop {
  sequence: number;
  action_type: 'pickup' | 'delivery' | 'both';
  location: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    latitude: number;
    longitude: number;
  };
  time_window?: {
    earliest: string; // "HH:MM"
    latest: string;
  };
  estimated_dock_hours: number;
}

interface TmsLoad {
  external_load_id: string;
  load_number: string;
  customer_name: string;
  weight_lbs: number;
  commodity_type: string;
  special_requirements?: string;
  status: string;
  stops: TmsLoadStop[];
}

@Injectable()
export class TmsMockService {
  /**
   * Returns mock load data simulating TruckBase/McLeod TMS API response
   */
  async getMockLoads(filters?: { status?: string; customer_name?: string }): Promise<TmsLoad[]> {
    // Hardcoded mock data (10-15 loads)
    const mockLoads: TmsLoad[] = [
      {
        external_load_id: 'TMS-WMT-45892',
        load_number: 'WMT-45892',
        customer_name: 'Walmart Distribution',
        weight_lbs: 44500.0,
        commodity_type: 'general',
        special_requirements: 'Delivery appointment required - call 24h ahead',
        status: 'assigned',
        stops: [
          {
            sequence: 1,
            action_type: 'pickup',
            location: {
              name: 'Chicago Distribution Center',
              address: '1000 W Distribution Dr',
              city: 'Chicago',
              state: 'IL',
              zip_code: '60601',
              latitude: 41.8781,
              longitude: -87.6298,
            },
            time_window: { earliest: '06:00', latest: '10:00' },
            estimated_dock_hours: 1.5,
          },
          {
            sequence: 2,
            action_type: 'delivery',
            location: {
              name: 'Indianapolis Customer - XYZ Inc',
              address: '200 Commerce Ave',
              city: 'Indianapolis',
              state: 'IN',
              zip_code: '46204',
              latitude: 39.7684,
              longitude: -86.158,
            },
            time_window: { earliest: '14:00', latest: '18:00' },
            estimated_dock_hours: 2.0,
          },
        ],
      },
      // ... add 9 more mock loads (Target, FedEx, Amazon, etc.)
      // (Copy structure from seed data above)
    ];

    // Apply filters
    let filtered = mockLoads;
    if (filters?.status) {
      filtered = filtered.filter((l) => l.status === filters.status);
    }
    if (filters?.customer_name) {
      filtered = filtered.filter((l) =>
        l.customer_name.toLowerCase().includes(filters.customer_name.toLowerCase())
      );
    }

    return filtered;
  }
}
```

**Update:** `apps/backend/src/app.module.ts`

```typescript
import { TmsModule } from './domains/external/tms/tms.module';

@Module({
  imports: [
    // ... existing modules
    TmsModule,
  ],
})
export class AppModule {}
```

**Test:** `GET http://localhost:8080/api/external/tms/loads`

---

### Task 3: Build TMS Sync Service

**Goal:** Background service to sync loads from TMS (mock) into SALLY database.

**File:** `apps/backend/src/domains/integrations/tms-sync/tms-sync.module.ts` (NEW MODULE)

```typescript
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TmsSyncService } from './services/tms-sync.service';
import { TmsSyncCronService } from './services/tms-sync-cron.service';
import { TmsModule } from '../../external/tms/tms.module';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    TmsModule,
  ],
  providers: [TmsSyncService, TmsSyncCronService],
  exports: [TmsSyncService],
})
export class TmsSyncModule {}
```

**File:** `apps/backend/src/domains/integrations/tms-sync/services/tms-sync.service.ts` (NEW)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { TmsMockService } from '../../../external/tms/services/tms-mock.service';

@Injectable()
export class TmsSyncService {
  private readonly logger = new Logger(TmsSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tmsMockService: TmsMockService,
  ) {}

  /**
   * Sync loads from TMS (mock for POC, real adapter in Phase 2)
   */
  async syncLoads(): Promise<{ added: number; updated: number; errors: number }> {
    this.logger.log('🔄 Starting TMS loads sync...');

    try {
      const tmsLoads = await this.tmsMockService.getMockLoads();
      let added = 0;
      let updated = 0;
      let errors = 0;

      for (const tmsLoad of tmsLoads) {
        try {
          const isNew = await this.upsertLoad(tmsLoad);
          if (isNew) added++;
          else updated++;
        } catch (error) {
          this.logger.error(`❌ Failed to sync load ${tmsLoad.load_number}`, error);
          errors++;
        }
      }

      this.logger.log(`✅ TMS loads sync complete: ${added} added, ${updated} updated, ${errors} errors`);
      return { added, updated, errors };
    } catch (error) {
      this.logger.error('❌ TMS loads sync failed', error);
      throw error;
    }
  }

  /**
   * Upsert a single load from TMS data
   * @returns true if created (new), false if updated (existing)
   */
  private async upsertLoad(tmsLoad: any): Promise<boolean> {
    // 1. Check if load exists
    const existingLoad = await this.prisma.load.findFirst({
      where: { externalLoadId: tmsLoad.external_load_id },
    });

    const isNew = !existingLoad;

    // 2. Find or create stops (locations)
    const stopIds = [];
    for (const tmsStop of tmsLoad.stops) {
      const stop = await this.findOrCreateStop(tmsStop.location);
      stopIds.push({ stopDbId: stop.id, tmsStop });
    }

    // 3. Upsert load
    const load = await this.prisma.load.upsert({
      where: { externalLoadId: tmsLoad.external_load_id },
      create: {
        loadId: `LOAD-${tmsLoad.load_number}`,
        loadNumber: tmsLoad.load_number,
        status: this.mapTmsStatus(tmsLoad.status),
        weightLbs: tmsLoad.weight_lbs,
        commodityType: tmsLoad.commodity_type,
        specialRequirements: tmsLoad.special_requirements || null,
        customerName: tmsLoad.customer_name,
        externalLoadId: tmsLoad.external_load_id,
        externalSource: 'truckbase_tms',
        lastSyncedAt: new Date(),
        isActive: true,
      },
      update: {
        status: this.mapTmsStatus(tmsLoad.status),
        weightLbs: tmsLoad.weight_lbs,
        specialRequirements: tmsLoad.special_requirements || null,
        lastSyncedAt: new Date(),
      },
    });

    // 4. Delete existing load_stops and recreate (simpler than diffing)
    await this.prisma.loadStop.deleteMany({
      where: { loadId: load.id },
    });

    // 5. Create new load_stops
    for (const { stopDbId, tmsStop } of stopIds) {
      await this.prisma.loadStop.create({
        data: {
          loadId: load.id,
          stopId: stopDbId,
          sequenceOrder: tmsStop.sequence,
          actionType: tmsStop.action_type,
          earliestArrival: tmsStop.time_window?.earliest || null,
          latestArrival: tmsStop.time_window?.latest || null,
          estimatedDockHours: tmsStop.estimated_dock_hours,
        },
      });
    }

    return isNew;
  }

  /**
   * Find or create a stop (location)
   */
  private async findOrCreateStop(location: any) {
    // Try to find existing stop by name + city + state
    let stop = await this.prisma.stop.findFirst({
      where: {
        name: location.name,
        city: location.city,
        state: location.state,
      },
    });

    if (!stop) {
      // Create new stop
      stop = await this.prisma.stop.create({
        data: {
          stopId: `STOP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: location.name,
          address: location.address,
          city: location.city,
          state: location.state,
          zipCode: location.zip_code,
          latitude: location.latitude,
          longitude: location.longitude,
          locationType: 'customer', // Default
          isActive: true,
        },
      });
    }

    return stop;
  }

  /**
   * Map TMS status to SALLY status
   */
  private mapTmsStatus(tmsStatus: string): string {
    const statusMap: Record<string, string> = {
      pending: 'pending',
      assigned: 'pending',
      in_transit: 'in_transit',
      delivered: 'completed',
      cancelled: 'cancelled',
    };
    return statusMap[tmsStatus] || 'pending';
  }
}
```

**File:** `apps/backend/src/domains/integrations/tms-sync/services/tms-sync-cron.service.ts` (NEW)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TmsSyncService } from './tms-sync.service';

@Injectable()
export class TmsSyncCronService {
  private readonly logger = new Logger(TmsSyncCronService.name);

  constructor(private readonly tmsSyncService: TmsSyncService) {}

  /**
   * Run TMS loads sync every 30 minutes
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleTmsLoadSync() {
    this.logger.log('⏰ Cron: TMS loads sync triggered');
    try {
      const result = await this.tmsSyncService.syncLoads();
      this.logger.log(`✅ Cron: TMS loads sync complete - ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error('❌ Cron: TMS loads sync failed', error);
    }
  }
}
```

**Update:** `apps/backend/src/app.module.ts`

```typescript
import { ScheduleModule } from '@nestjs/schedule';
import { TmsSyncModule } from './domains/integrations/tms-sync/tms-sync.module';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Enable cron jobs
    // ... existing modules
    TmsSyncModule,
  ],
})
export class AppModule {}
```

**Install:** `npm install @nestjs/schedule` (in apps/backend)

---

### Task 4: Add Missing Load API Endpoints

**Goal:** Complete CRUD operations for loads.

**File:** `apps/backend/src/domains/fleet/loads/controllers/loads.controller.ts`

**Add endpoints:**

```typescript
import { Patch } from '@nestjs/common';

@Patch(':load_id/status')
@ApiOperation({ summary: 'Update load status' })
async updateLoadStatus(
  @Param('load_id') loadId: string,
  @Body() body: { status: string },
) {
  return this.loadsService.updateStatus(loadId, body.status);
}

@Post(':load_id/assign')
@ApiOperation({ summary: 'Assign driver and vehicle to load' })
async assignLoad(
  @Param('load_id') loadId: string,
  @Body() body: { driver_id: string; vehicle_id: string },
) {
  return this.loadsService.assignLoad(loadId, body.driver_id, body.vehicle_id);
}
```

**File:** `apps/backend/src/domains/fleet/loads/services/loads.service.ts`

**Add methods:**

```typescript
/**
 * Update load status
 */
async updateStatus(loadId: string, status: string) {
  const load = await this.prisma.load.findFirst({ where: { loadId } });
  if (!load) {
    throw new NotFoundException(`Load not found: ${loadId}`);
  }

  // Validate status transition
  const validStatuses = ['pending', 'planned', 'active', 'in_transit', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new BadRequestException(`Invalid status: ${status}`);
  }

  const updated = await this.prisma.load.update({
    where: { id: load.id },
    data: { status, updatedAt: new Date() },
    include: {
      stops: {
        include: { stop: true },
        orderBy: { sequenceOrder: 'asc' },
      },
    },
  });

  this.logger.log(`Load ${loadId} status updated: ${status}`);
  return this.formatLoadResponse(updated);
}

/**
 * Assign driver and vehicle to load
 * NOTE: This is a placeholder until we add driver_id/vehicle_id to Load model
 */
async assignLoad(loadId: string, driverId: string, vehicleId: string) {
  // Validate load exists
  const load = await this.prisma.load.findFirst({ where: { loadId } });
  if (!load) {
    throw new NotFoundException(`Load not found: ${loadId}`);
  }

  // Validate driver exists
  const driver = await this.prisma.driver.findFirst({ where: { driverId } });
  if (!driver) {
    throw new NotFoundException(`Driver not found: ${driverId}`);
  }

  // Validate vehicle exists
  const vehicle = await this.prisma.vehicle.findFirst({ where: { vehicleId } });
  if (!vehicle) {
    throw new NotFoundException(`Vehicle not found: ${vehicleId}`);
  }

  // TODO: Add driver_id and vehicle_id fields to Load model in Prisma schema
  // For now, just return success (association will be implemented in next phase)

  this.logger.log(`Load ${loadId} assigned to driver ${driverId} and vehicle ${vehicleId}`);

  return {
    success: true,
    message: 'Load assigned successfully',
    load_id: loadId,
    driver_id: driverId,
    vehicle_id: vehicleId,
  };
}
```

---

### Task 5: Complete Load Management UI

**Goal:** Build dispatcher dashboard for load management.

**File:** `apps/web/src/app/settings/fleet/page.tsx`

**Update LoadsTab component:**

```tsx
function LoadsTab() {
  const [loads, setLoads] = useState<LoadListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Load data
  useEffect(() => {
    loadLoads();
  }, []);

  const loadLoads = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getLoads();
      setLoads(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load loads');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = async (loadId: string) => {
    try {
      const load = await getLoad(loadId);
      setSelectedLoad(load);
      setIsDetailsOpen(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load details');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Loads</CardTitle>
        <Button onClick={loadLoads} size="sm" variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </CardHeader>

      {loads.some((l) => l.external_source) && (
        <div className="mx-6 mt-4 mb-2">
          <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
              <span className="font-medium">🔗 TMS Integration Active</span> — Loads synced from
              TruckBase TMS every 30 minutes.
            </AlertDescription>
          </Alert>
        </div>
      )}

      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading loads...</div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <Button onClick={loadLoads}>Retry</Button>
          </div>
        ) : loads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No loads found. Loads will sync from TMS automatically.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Load #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stops</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Commodity</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loads.map((load) => (
                <TableRow key={load.id}>
                  <TableCell className="font-medium">{load.load_number}</TableCell>
                  <TableCell>{load.customer_name}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(load.status)} className="gap-1">
                      {getStatusIcon(load.status)}
                      {load.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>{load.stop_count} stops</TableCell>
                  <TableCell>{load.weight_lbs.toLocaleString()} lbs</TableCell>
                  <TableCell>{load.commodity_type}</TableCell>
                  <TableCell>
                    {load.external_source ? (
                      <Badge variant="muted" className="gap-1">
                        <span className="text-xs">🔗</span>
                        TMS
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <span className="text-xs">✋</span>
                        Manual
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleViewDetails(load.load_id)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Load Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Load {selectedLoad?.load_number}</DialogTitle>
          </DialogHeader>
          {selectedLoad && <LoadDetailsView load={selectedLoad} />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Helper functions
function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    pending: '⏳',
    planned: '📋',
    active: '🔄',
    in_transit: '🚚',
    completed: '✅',
    cancelled: '❌',
  };
  return icons[status] || '📦';
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'outline',
    planned: 'secondary',
    active: 'secondary',
    in_transit: 'default',
    completed: 'secondary',
    cancelled: 'destructive',
  };
  return variants[status] || 'outline';
}
```

**File:** `apps/web/src/features/fleet/loads/components/load-details-view.tsx` (NEW)

```tsx
import { Load } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { MapPin } from 'lucide-react';

interface LoadDetailsViewProps {
  load: Load;
}

export function LoadDetailsView({ load }: LoadDetailsViewProps) {
  return (
    <div className="space-y-4">
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">{load.customer_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Weight</p>
              <p className="font-medium">{load.weight_lbs.toLocaleString()} lbs</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Commodity</p>
              <p className="font-medium">{load.commodity_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium">{load.status}</p>
            </div>
          </div>
          {load.special_requirements && (
            <div className="pt-2">
              <p className="text-sm text-muted-foreground">Special Requirements</p>
              <p className="text-sm">{load.special_requirements}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stops */}
      <Card>
        <CardHeader>
          <CardTitle>Stops ({load.stops.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {load.stops.map((stop, index) => (
              <div key={stop.id} className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm uppercase">{stop.action_type}</span>
                    {stop.action_type === 'pickup' && (
                      <span className="text-sm">📦</span>
                    )}
                    {stop.action_type === 'delivery' && (
                      <span className="text-sm">🚚</span>
                    )}
                  </div>
                  <p className="font-medium">{stop.stop_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {stop.stop_address && `${stop.stop_address}, `}
                    {stop.stop_city}, {stop.stop_state}
                  </p>
                  <div className="flex gap-4 mt-2 text-sm">
                    {(stop.earliest_arrival || stop.latest_arrival) && (
                      <div>
                        <span className="text-muted-foreground">Time Window: </span>
                        {stop.earliest_arrival} - {stop.latest_arrival}
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Dock Time: </span>
                      {stop.estimated_dock_hours}h
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Part 4: Testing Checklist

### Backend API Testing

**Seed Data:**
- [ ] Run `npm run seed` in apps/backend
- [ ] Verify 7 loads created in database
- [ ] Verify load_stops created with correct sequences

**Mock TMS Endpoint:**
- [ ] GET `/api/external/tms/loads` returns 10+ loads
- [ ] Filter by status works: `?status=assigned`
- [ ] Filter by customer works: `?customer_name=Walmart`

**TMS Sync:**
- [ ] Manually trigger sync: Call `TmsSyncService.syncLoads()`
- [ ] Verify loads upserted (existing loads updated, new loads created)
- [ ] Verify `lastSyncedAt` timestamp updated
- [ ] Cron job runs every 30 minutes (check logs)

**Load CRUD:**
- [ ] GET `/api/loads` returns all loads
- [ ] GET `/api/loads/LOAD-001` returns load with stops
- [ ] PATCH `/api/loads/LOAD-001/status` updates status
- [ ] POST `/api/loads/LOAD-001/assign` validates driver/vehicle

### Frontend UI Testing

**Load List:**
- [ ] Navigate to Settings > Fleet > Loads
- [ ] Table displays all loads with correct columns
- [ ] Status badges show correct variant (blue for in_transit, etc.)
- [ ] "View" button opens details dialog
- [ ] Refresh button reloads data
- [ ] TMS integration alert shows if external_source present

**Load Details:**
- [ ] Dialog shows load overview (customer, weight, commodity, status)
- [ ] Stops list shows correct sequence (1, 2, 3)
- [ ] Pickup/delivery icons displayed
- [ ] Time windows formatted correctly (HH:MM - HH:MM)
- [ ] Dock hours displayed

**Dark Theme:**
- [ ] Toggle dark mode - all elements support dark theme
- [ ] No hardcoded white backgrounds or black text
- [ ] Status badges readable in both themes

**Responsive Design:**
- [ ] Test on mobile (375px) - table scrolls horizontally
- [ ] Test on tablet (768px) - proper spacing
- [ ] Test on desktop (1440px) - optimal layout

---

## Part 5: Next Steps (Future Phases)

### Phase 2: Load Assignment & Route Planning

**Add to Prisma Schema:**
```prisma
model Load {
  // ... existing fields
  driverId      Int?    @map("driver_id")
  vehicleId     Int?    @map("vehicle_id")
  driver        Driver? @relation(fields: [driverId], references: [id])
  vehicle       Vehicle? @relation(fields: [vehicleId], references: [id])
}
```

**Assignment Flow:**
1. Dispatcher selects load
2. Assigns available driver + vehicle
3. SALLY validates driver HOS hours available
4. SALLY validates vehicle fuel sufficient
5. Status: `pending` → `assigned`

**Route Planning Integration:**
1. After assignment, "Plan Route" button enabled
2. Calls route planning engine with load stops
3. Route plan generated (with rest stops, fuel stops)
4. Status: `assigned` → `planned`

### Phase 3: Real TMS Integration

**Adapter Pattern:**
```typescript
interface TmsAdapter {
  fetchLoads(filters?: any): Promise<TmsLoad[]>;
  updateLoadStatus(externalId: string, status: string): Promise<void>;
}

class TruckBaseAdapter implements TmsAdapter {
  // Real TruckBase API integration
}

class McLeodAdapter implements TmsAdapter {
  // Real McLeod API integration
}
```

**Configuration:**
- Multi-tenant TMS config (each tenant chooses TMS vendor)
- OAuth flow for TMS authentication
- Webhook support (TMS pushes updates to SALLY)
- Bi-directional sync (SALLY status → TMS)

### Phase 4: Load Analytics

**Dashboard Metrics:**
- Active loads count
- Loads by status (pie chart)
- Loads by customer (bar chart)
- Average dock time by location
- On-time delivery rate

---

## Success Criteria

**POC Complete When:**
- ✅ 7+ loads seeded in database
- ✅ Mock TMS endpoint returns realistic data
- ✅ TMS sync cron job runs every 30 minutes
- ✅ Load list UI displays all loads correctly
- ✅ Load details dialog shows stops in sequence
- ✅ Status badges styled correctly (blue for in_transit)
- ✅ Dark theme fully supported (no hardcoded colors)
- ✅ Responsive design works on mobile/tablet/desktop

**Performance Targets:**
- Load list page load: <2 seconds
- TMS sync: <30 seconds for 100 loads
- UI refresh: <1 second

---

## Questions for Product Team

1. **Manual load creation:** Do we need to support manual load creation (for customers without TMS)?
2. **Load assignment:** Should assignment sync back to TMS (bi-directional)?
3. **TMS priorities:** Which TMS systems do pilot customers use? (TruckBase, McLeod, TMW, other?)
4. **Load analytics:** Do we need reporting/analytics in POC, or Phase 2?
5. **Multi-pickup/delivery:** Do we need to support complex multi-stop patterns (e.g., 3 pickups, 5 deliveries)?

---

**Ready to implement!** 🚀
