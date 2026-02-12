# Command Center Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the dispatcher Command Center at `/dispatcher/overview` — an operational dashboard showing KPIs, active routes feed, alert feed, quick actions, shift notes, and HOS driver strip. Mock data at the backend API level for routes/HOS (swappable later), real data for alerts and shift notes.

**Architecture:** New `CommandCenterModule` in backend provides a single aggregated `GET /command-center/overview` endpoint (returns KPIs + routes + driver HOS from mock generators) plus real CRUD endpoints for shift notes (backed by Prisma). Frontend rewrites the overview page with new layout, calling these APIs via React Query hooks with 30-second polling.

**Tech Stack:** NestJS (backend module, controller, service, DTOs), Prisma (shift_notes migration), Redis (30s cache), React Query (hooks + polling), Shadcn UI (all components), Tailwind CSS (responsive + dark mode).

**Worktree:** `/Users/ajay-admin/sally/.worktrees/command-center` (branch: `feature/command-center`, based on `feature/alerts-notifications`)

**Design doc:** `.docs/plans/2026-02-07-command-center-design.md`

---

## Task 1: Backend — Command Center DTOs and Types

**Files:**
- Create: `apps/backend/src/domains/operations/command-center/command-center.types.ts`
- Create: `apps/backend/src/domains/operations/command-center/dto/create-shift-note.dto.ts`

**Step 1: Create the types file**

```typescript
// apps/backend/src/domains/operations/command-center/command-center.types.ts

export interface ActiveRouteDto {
  route_id: string;
  plan_id: string;
  driver: {
    driver_id: string;
    name: string;
  };
  vehicle: {
    vehicle_id: string;
    identifier: string;
  };
  status: 'in_transit' | 'at_dock' | 'resting' | 'completed';
  progress: {
    completed_stops: number;
    total_stops: number;
    distance_completed_miles: number;
    total_distance_miles: number;
  };
  next_stop: {
    name: string;
    location: string;
    eta: string;
    appointment_window?: {
      start: string;
      end: string;
    };
  } | null;
  final_destination: {
    name: string;
    location: string;
    eta: string;
  };
  eta_status: 'on_time' | 'at_risk' | 'late';
  hos: {
    drive_hours_remaining: number;
    duty_hours_remaining: number;
    cycle_hours_remaining: number;
    break_hours_remaining: number;
    status: 'driving' | 'on_duty' | 'sleeper' | 'off_duty';
  };
  active_alert_count: number;
  started_at: string;
  updated_at: string;
}

export interface DriverHOSChipDto {
  driver_id: string;
  name: string;
  initials: string;
  drive_hours_remaining: number;
  duty_hours_remaining: number;
  status: 'driving' | 'on_duty' | 'sleeper' | 'off_duty';
  vehicle_id: string | null;
  active_route_id: string | null;
}

export interface CommandCenterOverviewDto {
  kpis: {
    active_routes: number;
    on_time_percentage: number;
    hos_violations: number;
    active_alerts: number;
    avg_response_time_minutes: number;
  };
  active_routes: ActiveRouteDto[];
  quick_action_counts: {
    unassigned_loads: number;
    available_drivers: number;
  };
  driver_hos_strip: DriverHOSChipDto[];
}

export interface ShiftNoteDto {
  note_id: string;
  content: string;
  created_by: {
    user_id: string;
    name: string;
  };
  created_at: string;
  expires_at: string;
  is_pinned: boolean;
}
```

**Step 2: Create the DTO for creating shift notes**

```typescript
// apps/backend/src/domains/operations/command-center/dto/create-shift-note.dto.ts

import { IsString, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';

export class CreateShiftNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}
```

**Step 3: Commit**

```bash
git add apps/backend/src/domains/operations/command-center/
git commit -m "feat(command-center): add DTOs and type definitions"
```

---

## Task 2: Backend — Mock Data Generators

**Files:**
- Create: `apps/backend/src/domains/operations/command-center/command-center.mock.ts`

**Step 1: Create mock data generators**

This file generates realistic fleet data. It should be the ONLY file that needs to be deleted when real data sources come online.

```typescript
// apps/backend/src/domains/operations/command-center/command-center.mock.ts

import type { ActiveRouteDto, DriverHOSChipDto } from './command-center.types';

// ---------------------------------------------------------------------------
// Constants — realistic seed data
// ---------------------------------------------------------------------------

const DRIVERS = [
  { id: 'DRV-001', name: 'Mike Johnson' },
  { id: 'DRV-002', name: 'Sarah Chen' },
  { id: 'DRV-003', name: 'James Williams' },
  { id: 'DRV-004', name: 'Maria Garcia' },
  { id: 'DRV-005', name: 'Robert Davis' },
  { id: 'DRV-006', name: 'Emily Wilson' },
  { id: 'DRV-007', name: 'David Martinez' },
  { id: 'DRV-008', name: 'Lisa Anderson' },
  { id: 'DRV-009', name: 'Thomas Brown' },
  { id: 'DRV-010', name: 'Jennifer Taylor' },
];

const VEHICLES = [
  'TRK-001', 'TRK-002', 'TRK-003', 'TRK-004', 'TRK-005',
  'TRK-006', 'TRK-007', 'TRK-008', 'TRK-009', 'TRK-010',
];

const STOPS = [
  { name: 'Dallas Distribution Center', location: 'Dallas, TX' },
  { name: 'Houston Warehouse', location: 'Houston, TX' },
  { name: 'Atlanta Hub', location: 'Atlanta, GA' },
  { name: 'Chicago Terminal', location: 'Chicago, IL' },
  { name: 'Memphis Depot', location: 'Memphis, TN' },
  { name: 'Nashville Yard', location: 'Nashville, TN' },
  { name: 'Denver Freight Center', location: 'Denver, CO' },
  { name: 'Phoenix Distribution', location: 'Phoenix, AZ' },
  { name: 'Kansas City Hub', location: 'Kansas City, MO' },
  { name: 'St. Louis Terminal', location: 'St. Louis, MO' },
  { name: 'Indianapolis Depot', location: 'Indianapolis, IN' },
  { name: 'Columbus Warehouse', location: 'Columbus, OH' },
  { name: 'Charlotte Hub', location: 'Charlotte, NC' },
  { name: 'Jacksonville Port', location: 'Jacksonville, FL' },
  { name: 'San Antonio Yard', location: 'San Antonio, TX' },
];

const ROUTE_STATUSES: ActiveRouteDto['status'][] = ['in_transit', 'at_dock', 'resting', 'completed'];
const DRIVER_STATUSES: ActiveRouteDto['hos']['status'][] = ['driving', 'on_duty', 'sleeper', 'off_duty'];

// ---------------------------------------------------------------------------
// Deterministic pseudo-random based on tenant + current 30-second window
// ---------------------------------------------------------------------------

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function getSeed(tenantId: number): number {
  // Changes every 30 seconds so data refreshes but is stable within a window
  const timeSlot = Math.floor(Date.now() / 30000);
  return tenantId * 100000 + timeSlot;
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

export function generateMockActiveRoutes(tenantId: number): ActiveRouteDto[] {
  const rand = seededRandom(getSeed(tenantId));
  const routeCount = 8 + Math.floor(rand() * 4); // 8-11 routes
  const routes: ActiveRouteDto[] = [];

  for (let i = 0; i < routeCount; i++) {
    const driver = DRIVERS[i % DRIVERS.length];
    const vehicle = VEHICLES[i % VEHICLES.length];
    const totalStops = 4 + Math.floor(rand() * 7); // 4-10 stops
    const completedStops = Math.floor(rand() * totalStops);
    const totalDistance = 200 + Math.floor(rand() * 800); // 200-1000 miles
    const distanceCompleted = Math.floor((completedStops / totalStops) * totalDistance);

    // Determine status distribution: ~50% in_transit, ~20% at_dock, ~15% resting, ~15% completed
    const statusRoll = rand();
    let status: ActiveRouteDto['status'];
    if (statusRoll < 0.50) status = 'in_transit';
    else if (statusRoll < 0.70) status = 'at_dock';
    else if (statusRoll < 0.85) status = 'resting';
    else status = 'completed';

    // HOS values
    const driveHours = status === 'completed' ? 0 : 0.5 + rand() * 10; // 0.5-10.5h
    const dutyHours = driveHours + 1 + rand() * 3;
    const cycleHours = dutyHours + 10 + rand() * 30;
    const breakHours = rand() * 8;

    // Driver HOS status matches route status
    let hosStatus: ActiveRouteDto['hos']['status'];
    if (status === 'in_transit') hosStatus = 'driving';
    else if (status === 'at_dock') hosStatus = 'on_duty';
    else if (status === 'resting') hosStatus = rand() > 0.5 ? 'sleeper' : 'off_duty';
    else hosStatus = 'off_duty';

    // ETA calculations
    const now = new Date();
    const hoursToNext = 1 + rand() * 6;
    const hoursToFinal = hoursToNext + 2 + rand() * 10;
    const nextEta = new Date(now.getTime() + hoursToNext * 3600000);
    const finalEta = new Date(now.getTime() + hoursToFinal * 3600000);

    // ETA status: ~60% on_time, ~25% at_risk, ~15% late
    const etaRoll = rand();
    let etaStatus: ActiveRouteDto['eta_status'];
    if (status === 'completed') etaStatus = 'on_time';
    else if (etaRoll < 0.60) etaStatus = 'on_time';
    else if (etaRoll < 0.85) etaStatus = 'at_risk';
    else etaStatus = 'late';

    // Appointment window (some stops have them)
    const hasAppointment = rand() > 0.3;
    const appointmentStart = new Date(nextEta.getTime() - 30 * 60000);
    const appointmentEnd = new Date(nextEta.getTime() + 60 * 60000);

    // Alert count: most routes have 0, a few have 1-2
    const alertRoll = rand();
    let alertCount = 0;
    if (alertRoll > 0.7) alertCount = 1;
    if (alertRoll > 0.9) alertCount = 2;

    // Pick stops for next and final destination
    const nextStopIdx = Math.floor(rand() * STOPS.length);
    let finalStopIdx = Math.floor(rand() * STOPS.length);
    if (finalStopIdx === nextStopIdx) finalStopIdx = (finalStopIdx + 1) % STOPS.length;

    const startedAt = new Date(now.getTime() - (2 + rand() * 12) * 3600000);

    routes.push({
      route_id: `RT-${tenantId}-${String(i + 1).padStart(3, '0')}`,
      plan_id: `PLN-${tenantId}-${String(i + 1).padStart(3, '0')}`,
      driver: { driver_id: driver.id, name: driver.name },
      vehicle: { vehicle_id: `VH-${vehicle}`, identifier: vehicle },
      status,
      progress: {
        completed_stops: completedStops,
        total_stops: totalStops,
        distance_completed_miles: distanceCompleted,
        total_distance_miles: totalDistance,
      },
      next_stop: status === 'completed' ? null : {
        name: STOPS[nextStopIdx].name,
        location: STOPS[nextStopIdx].location,
        eta: nextEta.toISOString(),
        ...(hasAppointment ? {
          appointment_window: {
            start: appointmentStart.toISOString(),
            end: appointmentEnd.toISOString(),
          },
        } : {}),
      },
      final_destination: {
        name: STOPS[finalStopIdx].name,
        location: STOPS[finalStopIdx].location,
        eta: finalEta.toISOString(),
      },
      eta_status: etaStatus,
      hos: {
        drive_hours_remaining: Math.round(driveHours * 10) / 10,
        duty_hours_remaining: Math.round(dutyHours * 10) / 10,
        cycle_hours_remaining: Math.round(cycleHours * 10) / 10,
        break_hours_remaining: Math.round(breakHours * 10) / 10,
        status: hosStatus,
      },
      active_alert_count: alertCount,
      started_at: startedAt.toISOString(),
      updated_at: new Date(now.getTime() - rand() * 300000).toISOString(),
    });
  }

  return routes;
}

export function generateMockKPIs(
  routes: ActiveRouteDto[],
  realAlertStats: { active: number; avgResponseTimeMinutes: number; hosViolations: number },
) {
  const activeRoutes = routes.filter((r) => r.status !== 'completed');
  const onTimeRoutes = activeRoutes.filter((r) => r.eta_status === 'on_time');
  const onTimePercentage = activeRoutes.length > 0
    ? Math.round((onTimeRoutes.length / activeRoutes.length) * 100)
    : 100;

  return {
    active_routes: activeRoutes.length,
    on_time_percentage: onTimePercentage,
    hos_violations: realAlertStats.hosViolations,
    active_alerts: realAlertStats.active,
    avg_response_time_minutes: realAlertStats.avgResponseTimeMinutes,
  };
}

export function generateMockDriverHOS(routes: ActiveRouteDto[]): DriverHOSChipDto[] {
  // Extract driver HOS data from active routes
  const activeRoutes = routes.filter((r) => r.status !== 'completed');

  return activeRoutes.map((route) => {
    const nameParts = route.driver.name.split(' ');
    const initials = nameParts.map((p) => p[0]).join('').toUpperCase();

    return {
      driver_id: route.driver.driver_id,
      name: route.driver.name,
      initials,
      drive_hours_remaining: route.hos.drive_hours_remaining,
      duty_hours_remaining: route.hos.duty_hours_remaining,
      status: route.hos.status,
      vehicle_id: route.vehicle.vehicle_id,
      active_route_id: route.route_id,
    };
  }).sort((a, b) => a.drive_hours_remaining - b.drive_hours_remaining);
}

export function generateMockQuickActionCounts(tenantId: number): { unassigned_loads: number; available_drivers: number } {
  const rand = seededRandom(getSeed(tenantId) + 999);
  return {
    unassigned_loads: Math.floor(rand() * 6), // 0-5
    available_drivers: 2 + Math.floor(rand() * 6), // 2-7
  };
}
```

**Step 2: Commit**

```bash
git add apps/backend/src/domains/operations/command-center/command-center.mock.ts
git commit -m "feat(command-center): add mock data generators for routes, KPIs, HOS"
```

---

## Task 3: Backend — Command Center Service

**Files:**
- Create: `apps/backend/src/domains/operations/command-center/command-center.service.ts`

**Step 1: Create the service**

```typescript
// apps/backend/src/domains/operations/command-center/command-center.service.ts

import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import type { CommandCenterOverviewDto, ShiftNoteDto } from './command-center.types';
import {
  generateMockActiveRoutes,
  generateMockKPIs,
  generateMockDriverHOS,
  generateMockQuickActionCounts,
} from './command-center.mock';

@Injectable()
export class CommandCenterService {
  private readonly logger = new Logger(CommandCenterService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // ---------------------------------------------------------------------------
  // Overview (aggregated endpoint)
  // ---------------------------------------------------------------------------

  async getOverview(tenantId: number): Promise<CommandCenterOverviewDto> {
    const cacheKey = `command-center:overview:${tenantId}`;
    const cached = await this.cacheManager.get<CommandCenterOverviewDto>(cacheKey);
    if (cached) return cached;

    // Get real alert stats from DB
    const realAlertStats = await this.getRealAlertStats(tenantId);

    // Generate mock data for routes, HOS (replace with real queries later)
    const activeRoutes = generateMockActiveRoutes(tenantId);
    const kpis = generateMockKPIs(activeRoutes, realAlertStats);
    const driverHosStrip = generateMockDriverHOS(activeRoutes);
    const quickActionCounts = generateMockQuickActionCounts(tenantId);

    // Sort routes by urgency: late first, then at_risk, then on_time, then completed
    const urgencyOrder = { late: 0, at_risk: 1, on_time: 2 };
    const sortedRoutes = [...activeRoutes].sort((a, b) => {
      const aUrgency = a.status === 'completed' ? 3 : (urgencyOrder[a.eta_status] ?? 2);
      const bUrgency = b.status === 'completed' ? 3 : (urgencyOrder[b.eta_status] ?? 2);
      if (aUrgency !== bUrgency) return aUrgency - bUrgency;
      // Secondary sort: more alerts first
      return b.active_alert_count - a.active_alert_count;
    });

    const result: CommandCenterOverviewDto = {
      kpis,
      active_routes: sortedRoutes,
      quick_action_counts: quickActionCounts,
      driver_hos_strip: driverHosStrip,
    };

    await this.cacheManager.set(cacheKey, result, 30 * 1000); // 30 second TTL
    return result;
  }

  // ---------------------------------------------------------------------------
  // Shift Notes (real data, backed by Prisma)
  // ---------------------------------------------------------------------------

  async getShiftNotes(tenantId: number): Promise<{ notes: ShiftNoteDto[] }> {
    const now = new Date();

    const notes = await this.prisma.shiftNote.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          { isPinned: true },
          { expiresAt: { gt: now } },
        ],
      },
      include: {
        createdByUser: {
          select: { userId: true, firstName: true, lastName: true },
        },
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 10,
    });

    return {
      notes: notes.map((note) => ({
        note_id: note.noteId,
        content: note.content,
        created_by: {
          user_id: note.createdByUser.userId,
          name: `${note.createdByUser.firstName} ${note.createdByUser.lastName}`,
        },
        created_at: note.createdAt.toISOString(),
        expires_at: note.expiresAt.toISOString(),
        is_pinned: note.isPinned,
      })),
    };
  }

  async createShiftNote(
    tenantId: number,
    userId: number,
    content: string,
    isPinned: boolean = false,
  ): Promise<ShiftNoteDto> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    const note = await this.prisma.shiftNote.create({
      data: {
        tenantId,
        content,
        createdBy: userId,
        expiresAt,
        isPinned,
      },
      include: {
        createdByUser: {
          select: { userId: true, firstName: true, lastName: true },
        },
      },
    });

    return {
      note_id: note.noteId,
      content: note.content,
      created_by: {
        user_id: note.createdByUser.userId,
        name: `${note.createdByUser.firstName} ${note.createdByUser.lastName}`,
      },
      created_at: note.createdAt.toISOString(),
      expires_at: note.expiresAt.toISOString(),
      is_pinned: note.isPinned,
    };
  }

  async deleteShiftNote(tenantId: number, noteId: string): Promise<void> {
    await this.prisma.shiftNote.updateMany({
      where: { noteId, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async getRealAlertStats(tenantId: number): Promise<{
    active: number;
    avgResponseTimeMinutes: number;
    hosViolations: number;
  }> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [active, hosViolations, acknowledgedToday] = await Promise.all([
      this.prisma.alert.count({
        where: { tenantId, status: 'active' },
      }),
      this.prisma.alert.count({
        where: { tenantId, status: 'active', alertType: 'HOS_VIOLATION' },
      }),
      this.prisma.alert.findMany({
        where: {
          tenantId,
          acknowledgedAt: { not: null, gte: todayStart },
        },
        select: { createdAt: true, acknowledgedAt: true },
      }),
    ]);

    let avgResponseTimeMinutes = 0;
    if (acknowledgedToday.length > 0) {
      const totalMs = acknowledgedToday.reduce((sum, alert) => {
        const diff = alert.acknowledgedAt!.getTime() - alert.createdAt.getTime();
        return sum + diff;
      }, 0);
      avgResponseTimeMinutes = Math.round(totalMs / acknowledgedToday.length / 60000);
    }

    return { active, avgResponseTimeMinutes, hosViolations };
  }
}
```

**Step 2: Commit**

```bash
git add apps/backend/src/domains/operations/command-center/command-center.service.ts
git commit -m "feat(command-center): add service with mock overview + real shift notes"
```

---

## Task 4: Backend — Controller and Module

**Files:**
- Create: `apps/backend/src/domains/operations/command-center/command-center.controller.ts`
- Create: `apps/backend/src/domains/operations/command-center/command-center.module.ts`
- Modify: `apps/backend/src/domains/operations/operations.module.ts`

**Step 1: Create the controller**

```typescript
// apps/backend/src/domains/operations/command-center/command-center.controller.ts

import { Controller, Get, Post, Delete, Param, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { CommandCenterService } from './command-center.service';
import { CreateShiftNoteDto } from './dto/create-shift-note.dto';

@ApiTags('Command Center')
@Controller('command-center')
export class CommandCenterController {
  private readonly logger = new Logger(CommandCenterController.name);

  constructor(private readonly service: CommandCenterService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get command center overview (KPIs, routes, HOS strip)' })
  async getOverview(@CurrentUser() user: any) {
    return this.service.getOverview(user.tenantDbId);
  }

  @Get('shift-notes')
  @ApiOperation({ summary: 'Get shift notes for current tenant' })
  async getShiftNotes(@CurrentUser() user: any) {
    return this.service.getShiftNotes(user.tenantDbId);
  }

  @Post('shift-notes')
  @ApiOperation({ summary: 'Create a new shift note' })
  async createShiftNote(
    @CurrentUser() user: any,
    @Body() dto: CreateShiftNoteDto,
  ) {
    return this.service.createShiftNote(
      user.tenantDbId,
      user.dbId,
      dto.content,
      dto.isPinned,
    );
  }

  @Delete('shift-notes/:noteId')
  @ApiOperation({ summary: 'Delete a shift note' })
  async deleteShiftNote(
    @CurrentUser() user: any,
    @Param('noteId') noteId: string,
  ) {
    await this.service.deleteShiftNote(user.tenantDbId, noteId);
    return { message: 'Note deleted' };
  }
}
```

**Step 2: Create the module**

```typescript
// apps/backend/src/domains/operations/command-center/command-center.module.ts

import { Module } from '@nestjs/common';
import { CacheModule } from '../../../infrastructure/cache/cache.module';
import { CommandCenterController } from './command-center.controller';
import { CommandCenterService } from './command-center.service';

@Module({
  imports: [CacheModule],
  controllers: [CommandCenterController],
  providers: [CommandCenterService],
  exports: [CommandCenterService],
})
export class CommandCenterModule {}
```

**Step 3: Register in operations module**

Modify `apps/backend/src/domains/operations/operations.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AlertsModule } from './alerts/alerts.module';
import { InAppNotificationsModule } from './notifications/notifications.module';
import { CommandCenterModule } from './command-center/command-center.module';

@Module({
  imports: [AlertsModule, InAppNotificationsModule, CommandCenterModule],
  exports: [AlertsModule, InAppNotificationsModule, CommandCenterModule],
})
export class OperationsModule {}
```

**Step 4: Commit**

```bash
git add apps/backend/src/domains/operations/
git commit -m "feat(command-center): add controller, module, and register in operations"
```

---

## Task 5: Backend — Prisma Migration for Shift Notes

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`

**Step 1: Add ShiftNote model to Prisma schema**

Add this model to `apps/backend/prisma/schema.prisma`, after the existing `AlertConfiguration` model:

```prisma
model ShiftNote {
  id            Int       @id @default(autoincrement())
  noteId        String    @unique @default(cuid()) @map("note_id") @db.VarChar(50)
  tenantId      Int       @map("tenant_id")
  content       String    @db.Text
  createdBy     Int       @map("created_by")
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz
  expiresAt     DateTime  @map("expires_at") @db.Timestamptz
  isPinned      Boolean   @default(false) @map("is_pinned")
  deletedAt     DateTime? @map("deleted_at") @db.Timestamptz

  tenant        Tenant    @relation(fields: [tenantId], references: [id])
  createdByUser User      @relation(fields: [createdBy], references: [id])

  @@index([tenantId, deletedAt, expiresAt])
  @@map("shift_notes")
}
```

Also add the reverse relations to the existing `Tenant` and `User` models:

In the `Tenant` model, add:
```prisma
  shiftNotes        ShiftNote[]
```

In the `User` model, add:
```prisma
  shiftNotes        ShiftNote[]
```

**Step 2: Generate and run migration**

```bash
cd /Users/ajay-admin/sally/.worktrees/command-center/apps/backend
npx prisma migrate dev --name add_shift_notes
```

Expected: Migration creates `shift_notes` table with columns matching the model.

**Step 3: Verify Prisma client generated**

```bash
cd /Users/ajay-admin/sally/.worktrees/command-center/apps/backend
npx prisma generate
```

Expected: Prisma client regenerated with `ShiftNote` model.

**Step 4: Commit**

```bash
git add apps/backend/prisma/
git commit -m "feat(command-center): add shift_notes table migration"
```

---

## Task 6: Backend — Unit Tests

**Files:**
- Create: `apps/backend/src/domains/operations/command-center/command-center.service.spec.ts`

**Step 1: Write tests for the service**

```typescript
// apps/backend/src/domains/operations/command-center/command-center.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CommandCenterService } from './command-center.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('CommandCenterService', () => {
  let service: CommandCenterService;

  const mockCacheManager = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  const mockPrismaService = {
    alert: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    shiftNote: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommandCenterService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<CommandCenterService>(CommandCenterService);
    jest.clearAllMocks();
  });

  describe('getOverview', () => {
    it('should return overview with all sections', async () => {
      const result = await service.getOverview(1);

      expect(result).toHaveProperty('kpis');
      expect(result).toHaveProperty('active_routes');
      expect(result).toHaveProperty('quick_action_counts');
      expect(result).toHaveProperty('driver_hos_strip');
    });

    it('should include KPI fields', async () => {
      const result = await service.getOverview(1);

      expect(result.kpis).toHaveProperty('active_routes');
      expect(result.kpis).toHaveProperty('on_time_percentage');
      expect(result.kpis).toHaveProperty('hos_violations');
      expect(result.kpis).toHaveProperty('active_alerts');
      expect(result.kpis).toHaveProperty('avg_response_time_minutes');
    });

    it('should return 8-11 active routes', async () => {
      const result = await service.getOverview(1);

      expect(result.active_routes.length).toBeGreaterThanOrEqual(8);
      expect(result.active_routes.length).toBeLessThanOrEqual(11);
    });

    it('should sort routes by urgency (late first)', async () => {
      const result = await service.getOverview(1);
      const statuses = result.active_routes.map((r) => r.eta_status);

      // Find first on_time route index
      const firstOnTime = statuses.indexOf('on_time');
      // Find last late/at_risk route index
      const lastUrgent = Math.max(
        statuses.lastIndexOf('late'),
        statuses.lastIndexOf('at_risk'),
      );

      // If both exist, urgent routes should come before on_time
      if (firstOnTime !== -1 && lastUrgent !== -1) {
        expect(lastUrgent).toBeLessThan(firstOnTime);
      }
    });

    it('should return driver HOS strip sorted by hours remaining', async () => {
      const result = await service.getOverview(1);

      for (let i = 1; i < result.driver_hos_strip.length; i++) {
        expect(result.driver_hos_strip[i].drive_hours_remaining)
          .toBeGreaterThanOrEqual(result.driver_hos_strip[i - 1].drive_hours_remaining);
      }
    });

    it('should use cache on second call', async () => {
      const result = await service.getOverview(1);
      mockCacheManager.get.mockResolvedValueOnce(result);

      const cached = await service.getOverview(1);
      expect(cached).toEqual(result);
    });
  });

  describe('getShiftNotes', () => {
    it('should return notes array', async () => {
      const result = await service.getShiftNotes(1);
      expect(result).toHaveProperty('notes');
      expect(Array.isArray(result.notes)).toBe(true);
    });
  });

  describe('deleteShiftNote', () => {
    it('should soft-delete by setting deletedAt', async () => {
      await service.deleteShiftNote(1, 'note-123');

      expect(mockPrismaService.shiftNote.updateMany).toHaveBeenCalledWith({
        where: { noteId: 'note-123', tenantId: 1, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
```

**Step 2: Run tests**

```bash
cd /Users/ajay-admin/sally/.worktrees/command-center/apps/backend
npx jest src/domains/operations/command-center/command-center.service.spec.ts --verbose
```

Expected: All tests pass.

**Step 3: Commit**

```bash
git add apps/backend/src/domains/operations/command-center/command-center.service.spec.ts
git commit -m "test(command-center): add service unit tests"
```

---

## Task 7: Backend — Verify Backend Compiles

**Step 1: Run TypeScript compilation check**

```bash
cd /Users/ajay-admin/sally/.worktrees/command-center/apps/backend
npx tsc --noEmit
```

Expected: No compilation errors.

**Step 2: If there are compilation errors, fix them**

Common issues to watch for:
- Missing `shiftNotes` relation on `Tenant` or `User` models in schema.prisma
- Import paths — ensure all relative paths use `../../../` correctly
- `user.tenantDbId` and `user.dbId` — verify these match the `CurrentUser` decorator shape

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix(command-center): resolve compilation issues"
```

---

## Task 8: Frontend — Types and API Client

**Files:**
- Create: `apps/web/src/features/operations/command-center/types.ts`
- Create: `apps/web/src/features/operations/command-center/api.ts`

**Step 1: Create frontend types**

```typescript
// apps/web/src/features/operations/command-center/types.ts

export interface ActiveRoute {
  route_id: string;
  plan_id: string;
  driver: {
    driver_id: string;
    name: string;
  };
  vehicle: {
    vehicle_id: string;
    identifier: string;
  };
  status: 'in_transit' | 'at_dock' | 'resting' | 'completed';
  progress: {
    completed_stops: number;
    total_stops: number;
    distance_completed_miles: number;
    total_distance_miles: number;
  };
  next_stop: {
    name: string;
    location: string;
    eta: string;
    appointment_window?: {
      start: string;
      end: string;
    };
  } | null;
  final_destination: {
    name: string;
    location: string;
    eta: string;
  };
  eta_status: 'on_time' | 'at_risk' | 'late';
  hos: {
    drive_hours_remaining: number;
    duty_hours_remaining: number;
    cycle_hours_remaining: number;
    break_hours_remaining: number;
    status: 'driving' | 'on_duty' | 'sleeper' | 'off_duty';
  };
  active_alert_count: number;
  started_at: string;
  updated_at: string;
}

export interface DriverHOSChip {
  driver_id: string;
  name: string;
  initials: string;
  drive_hours_remaining: number;
  duty_hours_remaining: number;
  status: 'driving' | 'on_duty' | 'sleeper' | 'off_duty';
  vehicle_id: string | null;
  active_route_id: string | null;
}

export interface CommandCenterOverview {
  kpis: {
    active_routes: number;
    on_time_percentage: number;
    hos_violations: number;
    active_alerts: number;
    avg_response_time_minutes: number;
  };
  active_routes: ActiveRoute[];
  quick_action_counts: {
    unassigned_loads: number;
    available_drivers: number;
  };
  driver_hos_strip: DriverHOSChip[];
}

export interface ShiftNote {
  note_id: string;
  content: string;
  created_by: {
    user_id: string;
    name: string;
  };
  created_at: string;
  expires_at: string;
  is_pinned: boolean;
}
```

**Step 2: Create API client**

```typescript
// apps/web/src/features/operations/command-center/api.ts

import { apiClient } from '@/shared/lib/api';
import type { CommandCenterOverview, ShiftNote } from './types';

export const commandCenterApi = {
  getOverview: async (): Promise<CommandCenterOverview> => {
    return apiClient<CommandCenterOverview>('/command-center/overview');
  },

  getShiftNotes: async (): Promise<{ notes: ShiftNote[] }> => {
    return apiClient<{ notes: ShiftNote[] }>('/command-center/shift-notes');
  },

  createShiftNote: async (content: string, isPinned?: boolean): Promise<ShiftNote> => {
    return apiClient<ShiftNote>('/command-center/shift-notes', {
      method: 'POST',
      body: JSON.stringify({ content, isPinned }),
    });
  },

  deleteShiftNote: async (noteId: string): Promise<void> => {
    await apiClient(`/command-center/shift-notes/${noteId}`, {
      method: 'DELETE',
    });
  },
};
```

**Step 3: Commit**

```bash
git add apps/web/src/features/operations/command-center/
git commit -m "feat(command-center): add frontend types and API client"
```

---

## Task 9: Frontend — React Query Hooks

**Files:**
- Create: `apps/web/src/features/operations/command-center/hooks/use-command-center.ts`
- Create: `apps/web/src/features/operations/command-center/hooks/use-shift-notes.ts`
- Create: `apps/web/src/features/operations/command-center/index.ts`

**Step 1: Create command center hook**

```typescript
// apps/web/src/features/operations/command-center/hooks/use-command-center.ts

import { useQuery } from '@tanstack/react-query';
import { commandCenterApi } from '../api';

const COMMAND_CENTER_KEY = ['command-center'] as const;

export function useCommandCenterOverview() {
  return useQuery({
    queryKey: [...COMMAND_CENTER_KEY, 'overview'],
    queryFn: () => commandCenterApi.getOverview(),
    refetchInterval: 30000, // Poll every 30 seconds
  });
}
```

**Step 2: Create shift notes hooks**

```typescript
// apps/web/src/features/operations/command-center/hooks/use-shift-notes.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commandCenterApi } from '../api';

const SHIFT_NOTES_KEY = ['command-center', 'shift-notes'] as const;

export function useShiftNotes() {
  return useQuery({
    queryKey: [...SHIFT_NOTES_KEY],
    queryFn: () => commandCenterApi.getShiftNotes(),
    refetchInterval: 60000, // Poll every 60 seconds
  });
}

export function useCreateShiftNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ content, isPinned }: { content: string; isPinned?: boolean }) =>
      commandCenterApi.createShiftNote(content, isPinned),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SHIFT_NOTES_KEY }),
  });
}

export function useDeleteShiftNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => commandCenterApi.deleteShiftNote(noteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SHIFT_NOTES_KEY }),
  });
}
```

**Step 3: Create barrel export**

```typescript
// apps/web/src/features/operations/command-center/index.ts

// API
export { commandCenterApi } from './api';

// Types
export type {
  ActiveRoute,
  DriverHOSChip,
  CommandCenterOverview,
  ShiftNote,
} from './types';

// Hooks
export { useCommandCenterOverview } from './hooks/use-command-center';
export {
  useShiftNotes,
  useCreateShiftNote,
  useDeleteShiftNote,
} from './hooks/use-shift-notes';
```

**Step 4: Commit**

```bash
git add apps/web/src/features/operations/command-center/
git commit -m "feat(command-center): add React Query hooks and barrel exports"
```

---

## Task 10: Frontend — Command Center Page Rewrite

**Files:**
- Modify: `apps/web/src/app/dispatcher/overview/page.tsx` (full rewrite)

**Step 1: Rewrite the page**

This is the largest task. The page should contain all components inline (extracted as functions within the file) since they're only used here.

```typescript
// apps/web/src/app/dispatcher/overview/page.tsx

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Route,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Shield,
  Plus,
  Package,
  Users,
  ArrowRight,
  Truck,
  MapPin,
  X,
  Pin,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Separator } from "@/shared/components/ui/separator";
import { Input } from "@/shared/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { FeatureGuard } from "@/features/platform/feature-flags";
import {
  useAlerts,
  useAcknowledgeAlert,
  useResolveAlert,
} from "@/features/operations/alerts";
import type { Alert, AlertPriority, AlertCategory } from "@/features/operations/alerts";
import {
  useCommandCenterOverview,
  useShiftNotes,
  useCreateShiftNote,
  useDeleteShiftNote,
} from "@/features/operations/command-center";
import type { ActiveRoute, DriverHOSChip, ShiftNote } from "@/features/operations/command-center";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIORITY_BORDER: Record<AlertPriority, string> = {
  critical: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-yellow-500",
  low: "border-l-blue-500",
};

const CATEGORY_LABELS: Record<AlertCategory, string> = {
  hos: "HOS",
  route: "Route",
  driver: "Driver",
  vehicle: "Vehicle",
  external: "External",
  system: "System",
};

const ETA_STATUS_STYLES = {
  on_time: { label: "On Time", className: "text-green-600 dark:text-green-400" },
  at_risk: { label: "At Risk", className: "text-yellow-600 dark:text-yellow-400" },
  late: { label: "Late", className: "text-red-600 dark:text-red-400" },
};

const ROUTE_STATUS_LABELS: Record<string, string> = {
  in_transit: "In Transit",
  at_dock: "At Dock",
  resting: "Resting",
  completed: "Completed",
};

const ROUTE_STATUS_DOT: Record<string, string> = {
  in_transit: "bg-green-500",
  at_dock: "bg-blue-500",
  resting: "bg-gray-400",
  completed: "bg-gray-300 dark:bg-gray-600",
};

const HOS_STATUS_DOT: Record<string, string> = {
  driving: "bg-green-500",
  on_duty: "bg-blue-500",
  sleeper: "bg-gray-400",
  off_duty: "bg-gray-400",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function hosBarColor(hours: number): string {
  if (hours >= 6) return "bg-green-500 dark:bg-green-400";
  if (hours >= 2) return "bg-yellow-500 dark:bg-yellow-400";
  return "bg-red-500 dark:bg-red-400";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DispatcherOverviewPage() {
  return (
    <FeatureGuard featureKey="command_center_enabled">
      <CommandCenterContent />
    </FeatureGuard>
  );
}

// ---------------------------------------------------------------------------
// Main Content
// ---------------------------------------------------------------------------

function CommandCenterContent() {
  const { data: overview, isLoading: overviewLoading } = useCommandCenterOverview();
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts({ status: "active" });
  const acknowledgeMutation = useAcknowledgeAlert();
  const resolveMutation = useResolveAlert();

  const topAlerts = useMemo(() => {
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...alerts]
      .sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9))
      .slice(0, 5);
  }, [alerts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Command Center
        </h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Operational overview of your fleet
        </p>
      </div>

      {/* KPI Strip */}
      <KPIStrip kpis={overview?.kpis} isLoading={overviewLoading} />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Routes (2/3) */}
        <div className="lg:col-span-2">
          <ActiveRoutesFeed
            routes={overview?.active_routes}
            isLoading={overviewLoading}
          />
        </div>

        {/* Right: Alerts + Quick Actions + Shift Notes (1/3) */}
        <div className="space-y-6">
          {/* Alert Feed */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Active Alerts</h2>
              <Link
                href="/dispatcher/alerts"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View All
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </div>
            {alertsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}><CardContent className="p-3"><Skeleton className="h-16 w-full" /></CardContent></Card>
                ))}
              </div>
            ) : topAlerts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500 dark:text-green-400 mb-2" />
                  <p className="text-sm font-medium text-foreground">All Clear</p>
                  <p className="text-xs text-muted-foreground mt-1">No active alerts</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {topAlerts.map((alert) => (
                  <CompactAlertCard
                    key={alert.alert_id}
                    alert={alert}
                    onAcknowledge={() => acknowledgeMutation.mutate(alert.alert_id)}
                    onResolve={() => resolveMutation.mutate({ alertId: alert.alert_id })}
                    isAcknowledging={acknowledgeMutation.isPending}
                    isResolving={resolveMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Quick Actions */}
          <QuickActionsPanel counts={overview?.quick_action_counts} />

          <Separator />

          {/* Shift Notes */}
          <ShiftNotesPanel />
        </div>
      </div>

      {/* HOS Driver Strip */}
      <HOSDriverStrip
        drivers={overview?.driver_hos_strip}
        isLoading={overviewLoading}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Strip
// ---------------------------------------------------------------------------

function KPIStrip({
  kpis,
  isLoading,
}: {
  kpis: typeof undefined | NonNullable<ReturnType<typeof useCommandCenterOverview>["data"]>["kpis"];
  isLoading: boolean;
}) {
  const onTimeColor = kpis
    ? kpis.on_time_percentage >= 95
      ? "text-green-600 dark:text-green-400"
      : kpis.on_time_percentage >= 85
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400"
    : "";

  const hosColor = kpis
    ? kpis.hos_violations === 0
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400"
    : "";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
      <KPICard
        label="Active Routes"
        value={kpis?.active_routes}
        icon={<Route className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />
      <KPICard
        label="On-Time"
        value={kpis ? `${kpis.on_time_percentage}%` : undefined}
        icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        valueClassName={onTimeColor}
        isLoading={isLoading}
      />
      <KPICard
        label="HOS Compliance"
        value={kpis ? (kpis.hos_violations === 0 ? "0 violations" : `${kpis.hos_violations} violation${kpis.hos_violations > 1 ? "s" : ""}`) : undefined}
        icon={<Shield className="h-4 w-4 text-muted-foreground" />}
        valueClassName={hosColor}
        isLoading={isLoading}
      />
      <Link href="/dispatcher/alerts">
        <KPICard
          label="Active Alerts"
          value={kpis?.active_alerts}
          icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
          clickable
        />
      </Link>
      <KPICard
        label="Avg Response"
        value={kpis ? `${kpis.avg_response_time_minutes} min` : undefined}
        icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />
    </div>
  );
}

function KPICard({
  label,
  value,
  icon,
  valueClassName,
  isLoading,
  clickable,
}: {
  label: string;
  value: number | string | undefined;
  icon: React.ReactNode;
  valueClassName?: string;
  isLoading: boolean;
  clickable?: boolean;
}) {
  return (
    <Card className={clickable ? "hover:bg-muted/50 transition-colors cursor-pointer" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading || value == null ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <div className={`text-lg sm:text-2xl font-bold ${valueClassName ?? ""}`}>{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Active Routes Feed
// ---------------------------------------------------------------------------

function ActiveRoutesFeed({
  routes,
  isLoading,
}: {
  routes: ActiveRoute[] | undefined;
  isLoading: boolean;
}) {
  const [filter, setFilter] = useState("all");

  const filteredRoutes = useMemo(() => {
    if (!routes) return [];
    switch (filter) {
      case "at_risk":
        return routes.filter(
          (r) => r.eta_status === "late" || r.eta_status === "at_risk" || r.hos.drive_hours_remaining < 2 || r.active_alert_count > 0
        );
      case "on_time":
        return routes.filter((r) => r.eta_status === "on_time" && r.status !== "completed");
      case "completed":
        return routes.filter((r) => r.status === "completed");
      default:
        return routes;
    }
  }, [routes, filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Active Routes</h2>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs px-2.5 h-6">All</TabsTrigger>
            <TabsTrigger value="at_risk" className="text-xs px-2.5 h-6">At Risk</TabsTrigger>
            <TabsTrigger value="on_time" className="text-xs px-2.5 h-6">On Time</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs px-2.5 h-6">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRoutes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Truck className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-foreground">No routes found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filter === "all" ? "No active routes at this time" : `No ${filter.replace("_", " ")} routes`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRoutes.map((route) => (
            <RouteCard key={route.route_id} route={route} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Route Card
// ---------------------------------------------------------------------------

function RouteCard({ route }: { route: ActiveRoute }) {
  const progressPercent = route.progress.total_stops > 0
    ? (route.progress.completed_stops / route.progress.total_stops) * 100
    : 0;

  const hosPercent = Math.min((route.hos.drive_hours_remaining / 11) * 100, 100);
  const etaStyle = ETA_STATUS_STYLES[route.eta_status];

  return (
    <Card>
      <CardContent className="p-4">
        {/* Row 1: Driver + Status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">
              {route.driver.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {route.vehicle.identifier}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`h-2 w-2 rounded-full ${ROUTE_STATUS_DOT[route.status]}`} />
            <span className="text-xs text-muted-foreground">
              {ROUTE_STATUS_LABELS[route.status]}
            </span>
          </div>
        </div>

        {/* Row 2: Route progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">
              {route.progress.completed_stops}/{route.progress.total_stops} stops
            </span>
            <span className="text-xs text-muted-foreground">
              {route.progress.distance_completed_miles}/{route.progress.total_distance_miles} mi
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Row 3: Next stop + ETA status */}
        {route.next_stop && (
          <div className="flex items-start justify-between mb-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground truncate">
                  {route.next_stop.name}
                </span>
              </div>
              <span className="text-xs text-muted-foreground ml-[18px]">
                {route.next_stop.location} &middot; ETA {formatTime(route.next_stop.eta)}
              </span>
            </div>
            <Badge
              variant={route.eta_status === "late" ? "destructive" : "outline"}
              className={`shrink-0 text-xs ${etaStyle.className}`}
            >
              {etaStyle.label}
            </Badge>
          </div>
        )}

        {/* Row 4: HOS bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground shrink-0 w-8">HOS</span>
          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${hosBarColor(route.hos.drive_hours_remaining)}`}
              style={{ width: `${hosPercent}%` }}
            />
          </div>
          <span className="text-xs font-medium text-foreground shrink-0 w-12 text-right">
            {route.hos.drive_hours_remaining}h
          </span>
        </div>

        {/* Row 5: Alert badge (if any) */}
        {route.active_alert_count > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-yellow-500 dark:text-yellow-400" />
            <span className="text-xs text-yellow-600 dark:text-yellow-400">
              {route.active_alert_count} active alert{route.active_alert_count > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Compact Alert Card (reused from existing pattern)
// ---------------------------------------------------------------------------

function CompactAlertCard({
  alert,
  onAcknowledge,
  onResolve,
  isAcknowledging,
  isResolving,
}: {
  alert: Alert;
  onAcknowledge: () => void;
  onResolve: () => void;
  isAcknowledging: boolean;
  isResolving: boolean;
}) {
  const borderClass = PRIORITY_BORDER[alert.priority];
  const isActive = alert.status === "active";

  return (
    <Card className={`border-l-4 ${borderClass}`}>
      <CardContent className="p-3">
        <div className="flex flex-col gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant={alert.priority === "critical" ? "destructive" : "outline"}
                className="text-xs"
              >
                {alert.priority}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {CATEGORY_LABELS[alert.category]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(alert.created_at)}
              </span>
            </div>
            <h3 className="text-sm font-medium text-foreground truncate">{alert.title}</h3>
          </div>
          {isActive && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onAcknowledge}
                disabled={isAcknowledging}
                className="h-6 text-xs px-2"
              >
                Ack
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={onResolve}
                disabled={isResolving}
                className="h-6 text-xs px-2"
              >
                Resolve
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Quick Actions Panel
// ---------------------------------------------------------------------------

function QuickActionsPanel({
  counts,
}: {
  counts?: { unassigned_loads: number; available_drivers: number };
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-3">Quick Actions</h2>
      <div className="space-y-2">
        <Link
          href="/dispatcher/create-plan"
          className="flex items-center justify-between py-2.5 px-3 rounded-md border border-input bg-background hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Plus className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Plan New Route</span>
          </div>
        </Link>
        <Link
          href="/dispatcher/fleet"
          className="flex items-center justify-between py-2.5 px-3 rounded-md border border-input bg-background hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Unassigned Loads</span>
          </div>
          {counts && counts.unassigned_loads > 0 && (
            <Badge variant="outline" className="text-xs">
              {counts.unassigned_loads}
            </Badge>
          )}
        </Link>
        <Link
          href="/dispatcher/fleet"
          className="flex items-center justify-between py-2.5 px-3 rounded-md border border-input bg-background hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Drivers Available</span>
          </div>
          {counts && counts.available_drivers > 0 && (
            <Badge variant="outline" className="text-xs">
              {counts.available_drivers}
            </Badge>
          )}
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shift Notes Panel
// ---------------------------------------------------------------------------

function ShiftNotesPanel() {
  const { data: notesData, isLoading } = useShiftNotes();
  const createMutation = useCreateShiftNote();
  const deleteMutation = useDeleteShiftNote();
  const [noteText, setNoteText] = useState("");

  const handleSubmit = () => {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    createMutation.mutate({ content: trimmed });
    setNoteText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-3">Shift Notes</h2>

      {/* Input */}
      <div className="flex gap-2 mb-3">
        <Input
          placeholder="Leave a note for next shift..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-sm"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleSubmit}
          disabled={createMutation.isPending || !noteText.trim()}
          className="shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Notes list */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : notesData?.notes && notesData.notes.length > 0 ? (
        <div className="space-y-2">
          {notesData.notes.slice(0, 5).map((note: ShiftNote) => (
            <div
              key={note.note_id}
              className="flex items-start gap-2 p-2 rounded-md bg-muted/50"
            >
              {note.is_pinned && (
                <Pin className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{note.content}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {note.created_by.name} &middot; {formatRelativeTime(note.created_at)}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteMutation.mutate(note.note_id)}
                disabled={deleteMutation.isPending}
                className="h-6 w-6 p-0 shrink-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-3">
          No shift notes. Add one above.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HOS Driver Strip
// ---------------------------------------------------------------------------

function HOSDriverStrip({
  drivers,
  isLoading,
}: {
  drivers: DriverHOSChip[] | undefined;
  isLoading: boolean;
}) {
  const approachingLimit = drivers?.filter((d) => d.drive_hours_remaining < 2).length ?? 0;
  const activeCount = drivers?.length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-foreground">Driver HOS</h2>
        <span className="text-xs text-muted-foreground">
          {activeCount} active{approachingLimit > 0 && (
            <> &middot; <span className="text-red-600 dark:text-red-400">{approachingLimit} approaching limit</span></>
          )}
        </span>
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-16 w-24 shrink-0 rounded-lg" />
          ))}
        </div>
      ) : drivers && drivers.length > 0 ? (
        <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2">
          {drivers.map((driver) => (
            <DriverChip key={driver.driver_id} driver={driver} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">No active drivers</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DriverChip({ driver }: { driver: DriverHOSChip }) {
  const hosPercent = Math.min((driver.drive_hours_remaining / 11) * 100, 100);

  return (
    <Card className="shrink-0 w-[100px] md:w-[110px]">
      <CardContent className="p-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold text-foreground">{driver.initials}</span>
          <span className={`h-2 w-2 rounded-full ${HOS_STATUS_DOT[driver.status]}`} />
        </div>
        <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-1">
          <div
            className={`h-full rounded-full ${hosBarColor(driver.drive_hours_remaining)}`}
            style={{ width: `${hosPercent}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">{driver.drive_hours_remaining}h</span>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/dispatcher/overview/page.tsx
git commit -m "feat(command-center): rewrite overview page with full command center layout"
```

---

## Task 11: Frontend — Verify Compilation

**Step 1: Check TypeScript compilation**

```bash
cd /Users/ajay-admin/sally/.worktrees/command-center/apps/web
npx tsc --noEmit
```

Expected: No compilation errors.

**Step 2: If errors exist, fix them**

Common issues to watch for:
- Import path mismatches (ensure `@/features/operations/command-center` resolves correctly)
- Type mismatches between API response and component props
- Missing Shadcn UI components (install with `npx shadcn@latest add <component>`)
- `Badge` variant `"muted"` — check if it exists in the project's badge component; if not, use `"outline"` instead

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix(command-center): resolve frontend compilation issues"
```

---

## Task 12: Verify Full Stack

**Step 1: Build backend**

```bash
cd /Users/ajay-admin/sally/.worktrees/command-center/apps/backend
npm run build
```

Expected: Build succeeds.

**Step 2: Build frontend**

```bash
cd /Users/ajay-admin/sally/.worktrees/command-center/apps/web
npm run build
```

Expected: Build succeeds (or at minimum, no TypeScript errors — Next.js build may have env issues in worktree).

**Step 3: Run backend tests**

```bash
cd /Users/ajay-admin/sally/.worktrees/command-center/apps/backend
npx jest src/domains/operations/command-center/ --verbose
```

Expected: All tests pass.

**Step 4: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(command-center): resolve build and test issues"
```

---

## Summary

| Task | What | Type |
|------|------|------|
| 1 | Backend DTOs and types | Create |
| 2 | Mock data generators | Create |
| 3 | Command center service | Create |
| 4 | Controller + module + registration | Create + Modify |
| 5 | Prisma migration for shift_notes | Modify + Migrate |
| 6 | Backend unit tests | Create |
| 7 | Backend compilation check | Verify |
| 8 | Frontend types + API client | Create |
| 9 | Frontend hooks + barrel export | Create |
| 10 | Page rewrite (all components) | Rewrite |
| 11 | Frontend compilation check | Verify |
| 12 | Full stack verification | Verify |

**Files created:** 11 new files
**Files modified:** 3 existing files (operations.module.ts, schema.prisma, overview/page.tsx)
**Database changes:** 1 new table (shift_notes)
