# Loads Management & TMS Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build complete TMS loads integration with mock endpoint, sync service, and UI for dispatcher load management.

**Architecture:** Sync & Cache pattern - Background cron job fetches loads from mock TMS API every 30 minutes, stores in PostgreSQL. UI displays cached data with sync timestamps.

**Tech Stack:** Node.js, NestJS, Prisma, PostgreSQL, Next.js 15, TypeScript, Shadcn UI, @nestjs/schedule

---

## Task 1: Create Seed Data for Loads

**Files:**
- Create: `apps/backend/prisma/seeds/loads.seed.ts`
- Modify: `apps/backend/prisma/seed.ts:96-200`

### Step 1: Write loads seed file

Create seed file with 7 realistic loads (Walmart, Target, FedEx, Amazon, Caterpillar, CVS, Home Depot):

```typescript
// apps/backend/prisma/seeds/loads.seed.ts
import { PrismaClient } from '@prisma/client';

interface LoadStopSeed {
  stopId: string;
  seq: number;
  action: string;
  earliest?: string;
  latest?: string;
  dock: number;
}

interface LoadSeed {
  loadId: string;
  loadNumber: string;
  status: string;
  weightLbs: number;
  commodityType: string;
  specialRequirements?: string;
  customerName: string;
  externalLoadId: string;
  externalSource: string;
  stops: LoadStopSeed[];
}

export async function seedLoads(prisma: PrismaClient) {
  console.log('🔄 Seeding loads...');

  const loadsData: LoadSeed[] = [
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

    // Upsert load
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

    // Delete existing stops and recreate (idempotent)
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
        console.warn(`   ⚠️  Stop ${stopData.stopId} not found, skipping for load ${loadFields.loadId}`);
      }
    }
  }

  console.log('   ✅ Loads seeded successfully (7 loads)');
}
```

### Step 2: Update main seed file

Add loads seed import and call:

```typescript
// apps/backend/prisma/seed.ts (line 4)
import { seedLoads } from './seeds/loads.seed';

// apps/backend/prisma/seed.ts (after feature flags seed, around line 180)
  // Seed loads
  await seedLoads(prisma);
```

### Step 3: Run seed to verify

Run: `cd apps/backend && npm run seed`

Expected output:
```
🔄 Seeding loads...
   ✅ Loads seeded successfully (7 loads)
```

### Step 4: Verify in database

Run: `psql $DATABASE_URL -c "SELECT load_id, load_number, customer_name, status FROM loads LIMIT 5;"`

Expected: 7 rows with LOAD-001 through LOAD-007

### Step 5: Commit

```bash
git add apps/backend/prisma/seeds/loads.seed.ts apps/backend/prisma/seed.ts
git commit -m "feat(loads): add seed data for 7 realistic loads"
```

---

## Task 2: Create Mock TMS Loads Endpoint

**Files:**
- Create: `apps/backend/src/domains/external/tms/tms.module.ts`
- Create: `apps/backend/src/domains/external/tms/controllers/tms-mock.controller.ts`
- Create: `apps/backend/src/domains/external/tms/services/tms-mock.service.ts`
- Modify: `apps/backend/src/app.module.ts:20-30`

### Step 1: Create TMS module

```typescript
// apps/backend/src/domains/external/tms/tms.module.ts
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

### Step 2: Create TMS mock service with realistic data

```typescript
// apps/backend/src/domains/external/tms/services/tms-mock.service.ts
import { Injectable } from '@nestjs/common';

export interface TmsLoadStop {
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
    earliest: string;
    latest: string;
  };
  estimated_dock_hours: number;
}

export interface TmsLoad {
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
      {
        external_load_id: 'TMS-TGT-12034',
        load_number: 'TGT-12034',
        customer_name: 'Target Logistics',
        weight_lbs: 42000.0,
        commodity_type: 'refrigerated',
        special_requirements: 'Maintain 38°F - reefer unit required',
        status: 'assigned',
        stops: [
          {
            sequence: 1,
            action_type: 'pickup',
            location: {
              name: 'Los Angeles Warehouse',
              address: '2000 E Warehouse Blvd',
              city: 'Los Angeles',
              state: 'CA',
              zip_code: '90001',
              latitude: 34.0522,
              longitude: -118.2437,
            },
            time_window: { earliest: '07:00', latest: '12:00' },
            estimated_dock_hours: 2.5,
          },
          {
            sequence: 2,
            action_type: 'delivery',
            location: {
              name: 'Phoenix Distribution',
              address: '500 S Industrial Pkwy',
              city: 'Phoenix',
              state: 'AZ',
              zip_code: '85003',
              latitude: 33.4484,
              longitude: -112.074,
            },
            time_window: { earliest: '06:00', latest: '16:00' },
            estimated_dock_hours: 1.5,
          },
          {
            sequence: 3,
            action_type: 'delivery',
            location: {
              name: 'Tucson Customer',
              address: 'I-10 Exit 198',
              city: 'Tucson',
              state: 'AZ',
              zip_code: '85701',
              latitude: 32.2217,
              longitude: -110.9265,
            },
            time_window: { earliest: '08:00', latest: '18:00' },
            estimated_dock_hours: 1.0,
          },
        ],
      },
      // Add 8 more loads (FedEx, Amazon, Caterpillar, CVS, Home Depot, etc.)
      // Copy structure from seed data above
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

### Step 3: Create TMS mock controller

```typescript
// apps/backend/src/domains/external/tms/controllers/tms-mock.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TmsMockService } from '../services/tms-mock.service';
import { Public } from '../../../../shared/decorators/public.decorator';

@ApiTags('External - TMS Mock')
@Controller('external/tms')
export class TmsMockController {
  constructor(private readonly tmsMockService: TmsMockService) {}

  @Public()
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

### Step 4: Register TMS module in app module

```typescript
// apps/backend/src/app.module.ts (add to imports array)
import { TmsModule } from './domains/external/tms/tms.module';

@Module({
  imports: [
    // ... existing modules
    TmsModule,
  ],
})
export class AppModule {}
```

### Step 5: Test mock endpoint

Run: `cd apps/backend && npm run start:dev`

Test: `curl http://localhost:8080/api/external/tms/loads | jq .`

Expected: JSON array with 10+ loads

Test filter: `curl "http://localhost:8080/api/external/tms/loads?status=assigned" | jq .`

Expected: Filtered loads

### Step 6: Commit

```bash
git add apps/backend/src/domains/external/tms/ apps/backend/src/app.module.ts
git commit -m "feat(tms): add mock TMS loads endpoint"
```

---

## Task 3: Build TMS Sync Service with Cron Job

**Files:**
- Create: `apps/backend/src/domains/integrations/tms-sync/tms-sync.module.ts`
- Create: `apps/backend/src/domains/integrations/tms-sync/services/tms-sync.service.ts`
- Create: `apps/backend/src/domains/integrations/tms-sync/services/tms-sync-cron.service.ts`
- Modify: `apps/backend/src/app.module.ts:10-15`
- Modify: `apps/backend/package.json` (add @nestjs/schedule)

### Step 1: Install @nestjs/schedule

Run: `cd apps/backend && npm install @nestjs/schedule`

Expected: Package installed successfully

### Step 2: Create TMS sync service

```typescript
// apps/backend/src/domains/integrations/tms-sync/services/tms-sync.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { TmsMockService, TmsLoad } from '../../../external/tms/services/tms-mock.service';

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
  private async upsertLoad(tmsLoad: TmsLoad): Promise<boolean> {
    // Check if load exists
    const existingLoad = await this.prisma.load.findFirst({
      where: { externalLoadId: tmsLoad.external_load_id },
    });

    const isNew = !existingLoad;

    // Find or create stops (locations)
    const stopIds = [];
    for (const tmsStop of tmsLoad.stops) {
      const stop = await this.findOrCreateStop(tmsStop.location);
      stopIds.push({ stopDbId: stop.id, tmsStop });
    }

    // Upsert load
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

    // Delete existing load_stops and recreate
    await this.prisma.loadStop.deleteMany({
      where: { loadId: load.id },
    });

    // Create new load_stops
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
    let stop = await this.prisma.stop.findFirst({
      where: {
        name: location.name,
        city: location.city,
        state: location.state,
      },
    });

    if (!stop) {
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
          locationType: 'customer',
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

### Step 3: Create cron service

```typescript
// apps/backend/src/domains/integrations/tms-sync/services/tms-sync-cron.service.ts
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

### Step 4: Create TMS sync module

```typescript
// apps/backend/src/domains/integrations/tms-sync/tms-sync.module.ts
import { Module } from '@nestjs/common';
import { TmsSyncService } from './services/tms-sync.service';
import { TmsSyncCronService } from './services/tms-sync-cron.service';
import { TmsModule } from '../../external/tms/tms.module';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

@Module({
  imports: [PrismaModule, TmsModule],
  providers: [TmsSyncService, TmsSyncCronService],
  exports: [TmsSyncService],
})
export class TmsSyncModule {}
```

### Step 5: Enable schedule module and register sync module

```typescript
// apps/backend/src/app.module.ts
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

### Step 6: Test sync service manually

Run: `cd apps/backend && npm run start:dev`

In logs, look for: `⏰ Cron: TMS loads sync triggered`

Or manually trigger via NestJS CLI console (optional)

### Step 7: Verify synced data

Run: `psql $DATABASE_URL -c "SELECT load_id, load_number, external_source, last_synced_at FROM loads LIMIT 5;"`

Expected: Loads with `external_source = 'truckbase_tms'` and recent `last_synced_at`

### Step 8: Commit

```bash
git add apps/backend/src/domains/integrations/tms-sync/ apps/backend/src/app.module.ts apps/backend/package.json
git commit -m "feat(tms): add TMS loads sync service with cron job"
```

---

## Task 4: Add Missing Load API Endpoints

**Files:**
- Modify: `apps/backend/src/domains/fleet/loads/controllers/loads.controller.ts:64-80`
- Modify: `apps/backend/src/domains/fleet/loads/services/loads.service.ts:190-260`

### Step 1: Add updateStatus endpoint and service method

Controller:
```typescript
// apps/backend/src/domains/fleet/loads/controllers/loads.controller.ts
import { Patch } from '@nestjs/common';

@Patch(':load_id/status')
@ApiOperation({ summary: 'Update load status' })
async updateLoadStatus(
  @Param('load_id') loadId: string,
  @Body() body: { status: string },
) {
  return this.loadsService.updateStatus(loadId, body.status);
}
```

Service:
```typescript
// apps/backend/src/domains/fleet/loads/services/loads.service.ts
import { BadRequestException } from '@nestjs/common';

async updateStatus(loadId: string, status: string) {
  const load = await this.prisma.load.findFirst({ where: { loadId } });
  if (!load) {
    throw new NotFoundException(`Load not found: ${loadId}`);
  }

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
```

### Step 2: Test status update endpoint

Run: `curl -X PATCH http://localhost:8080/api/loads/LOAD-001/status -H "Content-Type: application/json" -d '{"status":"planned"}' | jq .`

Expected: Load with updated status = "planned"

### Step 3: Add assignLoad endpoint and service method

Controller:
```typescript
@Post(':load_id/assign')
@ApiOperation({ summary: 'Assign driver and vehicle to load' })
async assignLoad(
  @Param('load_id') loadId: string,
  @Body() body: { driver_id: string; vehicle_id: string },
) {
  return this.loadsService.assignLoad(loadId, body.driver_id, body.vehicle_id);
}
```

Service:
```typescript
async assignLoad(loadId: string, driverId: string, vehicleId: string) {
  const load = await this.prisma.load.findFirst({ where: { loadId } });
  if (!load) {
    throw new NotFoundException(`Load not found: ${loadId}`);
  }

  const driver = await this.prisma.driver.findFirst({ where: { driverId } });
  if (!driver) {
    throw new NotFoundException(`Driver not found: ${driverId}`);
  }

  const vehicle = await this.prisma.vehicle.findFirst({ where: { vehicleId } });
  if (!vehicle) {
    throw new NotFoundException(`Vehicle not found: ${vehicleId}`);
  }

  // TODO: Add driver_id and vehicle_id fields to Load model in Phase 2
  // For now, just validate and return success

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

### Step 4: Test assign endpoint

Run: `curl -X POST http://localhost:8080/api/loads/LOAD-001/assign -H "Content-Type: application/json" -d '{"driver_id":"DRV-001","vehicle_id":"VEH-001"}' | jq .`

Expected: `{"success":true,"message":"Load assigned successfully",...}`

### Step 5: Commit

```bash
git add apps/backend/src/domains/fleet/loads/
git commit -m "feat(loads): add status update and assignment endpoints"
```

---

## Task 5: Complete Load Management UI

**Files:**
- Modify: `apps/web/src/app/settings/fleet/page.tsx:98-500`
- Create: `apps/web/src/features/fleet/loads/components/load-details-view.tsx`

### Step 1: Write LoadsTab component with table

```tsx
// apps/web/src/app/settings/fleet/page.tsx (around line 98, replace placeholder LoadsTab)
function LoadsTab() {
  const [loads, setLoads] = useState<LoadListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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
                      <Badge variant="secondary" className="gap-1">
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

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Load {selectedLoad?.load_number}</DialogTitle>
          </DialogHeader>
          {selectedLoad && <LoadDetailsView load={selectedLoad} />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

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

### Step 2: Create LoadDetailsView component

```tsx
// apps/web/src/features/fleet/loads/components/load-details-view.tsx
import { Load } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

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
              <p className="font-medium text-foreground">{load.customer_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Weight</p>
              <p className="font-medium text-foreground">
                {load.weight_lbs.toLocaleString()} lbs
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Commodity</p>
              <p className="font-medium text-foreground">{load.commodity_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium text-foreground">{load.status}</p>
            </div>
          </div>
          {load.special_requirements && (
            <div className="pt-2">
              <p className="text-sm text-muted-foreground">Special Requirements</p>
              <p className="text-sm text-foreground">{load.special_requirements}</p>
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
                    <span className="font-medium text-sm uppercase text-foreground">
                      {stop.action_type}
                    </span>
                    {stop.action_type === 'pickup' && <span className="text-sm">📦</span>}
                    {stop.action_type === 'delivery' && <span className="text-sm">🚚</span>}
                  </div>
                  <p className="font-medium text-foreground">{stop.stop_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {stop.stop_address && `${stop.stop_address}, `}
                    {stop.stop_city}, {stop.stop_state}
                  </p>
                  <div className="flex gap-4 mt-2 text-sm">
                    {(stop.earliest_arrival || stop.latest_arrival) && (
                      <div>
                        <span className="text-muted-foreground">Time Window: </span>
                        <span className="text-foreground">
                          {stop.earliest_arrival} - {stop.latest_arrival}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Dock Time: </span>
                      <span className="text-foreground">{stop.estimated_dock_hours}h</span>
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

### Step 3: Test UI in browser

Run: `cd apps/web && npm run dev`

Navigate to: `http://localhost:3000/settings/fleet`

Expected:
- Loads tab shows table with 7+ loads
- Status badges colored correctly (blue for in_transit)
- Click "View" opens dialog with load details
- Stops displayed in correct sequence
- Dark theme works (toggle to verify)

### Step 4: Test responsive design

Resize browser to:
- 375px (mobile) - table scrolls horizontally
- 768px (tablet) - proper spacing
- 1440px (desktop) - optimal layout

### Step 5: Commit

```bash
git add apps/web/src/app/settings/fleet/page.tsx apps/web/src/features/fleet/loads/components/
git commit -m "feat(loads): complete load management UI with details dialog"
```

---

## Success Criteria

**POC Complete When:**
- ✅ 7 loads seeded in database
- ✅ Mock TMS endpoint returns 10+ loads
- ✅ TMS sync cron job runs every 30 minutes
- ✅ Load list UI displays all loads
- ✅ Load details dialog shows stops in sequence
- ✅ Status badges styled correctly
- ✅ Dark theme fully supported
- ✅ Responsive design works

**Performance Targets:**
- Load list page load: <2 seconds
- TMS sync: <30 seconds for 100 loads
- UI refresh: <1 second

---

## Testing Checklist

### Backend
- [ ] Seed creates 7 loads with correct stops
- [ ] Mock TMS endpoint returns loads (GET /api/external/tms/loads)
- [ ] TMS sync creates/updates loads (check logs for cron trigger)
- [ ] Status update works (PATCH /api/loads/:id/status)
- [ ] Assignment validates driver/vehicle (POST /api/loads/:id/assign)

### Frontend
- [ ] Loads table displays all columns
- [ ] Status badges show correct colors (blue for in_transit)
- [ ] "View" button opens details dialog
- [ ] Stops displayed in sequence with icons
- [ ] Time windows and dock hours shown
- [ ] Dark theme: no white backgrounds or black text
- [ ] Mobile (375px): table scrolls, dialog readable
- [ ] Tablet (768px): proper spacing
- [ ] Desktop (1440px): optimal layout

---

## Next Steps (Future Phases)

**Phase 2: Load Assignment & Route Planning**
- Add `driverId` and `vehicleId` fields to Load model
- Build assignment dialog in UI
- Validate driver HOS hours before assignment
- Integrate route planning engine (loads → route plans)

**Phase 3: Real TMS Integration**
- Implement TruckBase adapter (real API)
- Implement McLeod adapter
- Add OAuth flow for TMS authentication
- Add webhooks (TMS pushes updates to SALLY)
- Bi-directional sync (SALLY status → TMS)

**Phase 4: Load Analytics**
- Dashboard metrics (active loads, by status, by customer)
- On-time delivery rate
- Average dock time by location
