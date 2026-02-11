# Post-Route-Creation: Complete Lifecycle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the post-activation lifecycle work end-to-end — driver events drive business state, GPS handles physical transitions, monitoring observes and alerts, plan completes automatically.

**Architecture:** Hybrid event model. GPS auto-transitions arrive/depart for drive/rest/fuel segments (monitoring cron detects via geofence). Driver must manually confirm business events (pickup complete, delivery complete). Dispatcher can override anything. All events stored in a unified `RouteEvent` table. SSE for live UI, Alerts only for dispatcher-actionable issues.

**Tech Stack:** NestJS 11, Prisma 7.3, Zod, SSE (existing infrastructure), PostgreSQL

---

## Design Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Segment transitions | Hybrid: GPS auto for arrive/depart, driver confirms pickup/delivery, dispatcher overrides anything |
| Event storage | New `RouteEvent` table (replaces `RoutePlanUpdate`) — unified activity log |
| Event sources | `driver`, `dispatcher`, `monitoring`, `system` |
| Replan field | `replanRecommended` (advisory, not automatic) |
| Forgotten driver events | Monitoring alerts dispatcher, NO auto-inference for business events |
| Plan completion | Auto when all segments completed/skipped |
| Load status flow | `pending → assigned → in_transit → delivered` |
| When loads become assigned | On plan **activation** only. Double-booking validation. |
| Cancelled plan + assigned loads | `assigned` → `pending` (auto). `in_transit` → stays + alert. |
| Driver visibility | Drivers see nothing until activation. Notification only on activation. |

---

## How The Complete Flow Works

```
PLAN CREATED (draft) → ACTIVATED (active)
    → Loads: pending → assigned
    → SSE to dispatcher: route:activated
    → Driver notification: "New route assigned"
    ↓
Driver taps: "Start Route"
    → POST /routes/:planId/events/start-route
    → First drive segment: planned → in_progress
    → RouteEvent: ROUTE_STARTED (source: driver)
    → SSE: segment:status_changed
    ↓
Driver drives... GPS tracked every 60s by monitoring cron
    → Monitoring detects driver < 1 mile from stop
    → Drive segment: in_progress → completed
    → Next stop segment (dock/rest/fuel): planned → in_progress
    → RouteEvent: SEGMENT_ARRIVED (source: monitoring)
    → SSE: segment:status_changed
    ↓
At dock (pickup)... driver loads freight
    → If dock time exceeds plan + 60min: Alert to dispatcher (DOCK_TIME_EXCEEDED)
    ↓
Driver taps: "Pickup Complete"
    → POST /routes/:planId/events/pickup-complete
    → Dock segment: in_progress → completed
    → Load: assigned → in_transit
    → Next drive segment: planned → in_progress
    → RouteEvent: PICKUP_CONFIRMED (source: driver)
    → SSE: segment:status_changed + load:status_changed
    ↓
Driver drives to delivery... monitoring continues
    → GPS auto-transitions as before
    ↓
Driver taps: "Delivery Complete"
    → POST /routes/:planId/events/delivery-complete
    → Dock segment: in_progress → completed
    → Load: in_transit → delivered
    → All segments done? → Plan: active → completed
    → RouteEvent: DELIVERY_CONFIRMED + ROUTE_COMPLETED
    → SSE: route:completed
```

### Edge Case: Driver Forgets to Confirm Pickup/Delivery

```
GPS detects arrival at dock
    → Drive segment completed, dock segment in_progress (automatic)
GPS detects departure from dock
    → But dock segment is still in_progress (no driver confirmation!)
    → Monitoring cron detects: dock segment in_progress + driver moving away
    → Alert to dispatcher: UNCONFIRMED_PICKUP / UNCONFIRMED_DELIVERY
    → Dispatcher confirms on driver's behalf OR contacts driver
```

### SSE vs Alerts — Clear Distinction

| Concern | SSE Events | Alerts |
|---------|-----------|--------|
| **Purpose** | Live UI updates | Dispatcher action needed |
| **Persistence** | None (ephemeral) | DB record, acknowledge/resolve |
| **Examples** | segment changed, load status, route completed | HOS violation, missed appointment, unconfirmed pickup |
| **Volume** | High (every state change) | Low (only actionable issues) |

---

## Tasks

### Task 1: Database Migration — RouteEvent Table

**Files:**
- Modify: `apps/backend/prisma/schema.prisma:450,527-546`

**Step 1: Replace RoutePlanUpdate model with RouteEvent in schema.prisma**

In `schema.prisma`, change the RoutePlan relation (line 450):
```
// OLD (line 450):
  updates               RoutePlanUpdate[]

// NEW:
  events                RouteEvent[]
```

Replace the entire `RoutePlanUpdate` model (lines 527-546) with:
```prisma
model RouteEvent {
  id                    Int          @id @default(autoincrement())
  eventId               String       @unique @map("event_id") @db.VarChar(50)
  planId                Int          @map("plan_id")
  segmentId             String?      @map("segment_id") @db.VarChar(50)

  eventType             String       @map("event_type") @db.VarChar(50)
  source                String       @db.VarChar(20)    // driver, dispatcher, monitoring, system
  occurredAt            DateTime     @map("occurred_at") @db.Timestamptz

  eventData             Json?        @map("event_data")
  location              Json?                            // { lat, lon }

  replanRecommended     Boolean      @default(false) @map("replan_recommended")
  replanReason          String?      @map("replan_reason") @db.Text

  impactSummary         Json?        @map("impact_summary")

  createdAt             DateTime     @default(now()) @map("created_at") @db.Timestamptz

  plan                  RoutePlan    @relation(fields: [planId], references: [id])

  @@index([planId])
  @@index([planId, segmentId])
  @@index([eventType])
  @@map("route_events")
}
```

**Step 2: Generate and apply migration**

Run: `cd apps/backend && npx prisma migrate dev --name replace_route_plan_updates_with_route_events`

This will:
- Drop the `route_plan_updates` table (it has no production data — POC only)
- Create the `route_events` table with proper indexes

**Step 3: Verify Prisma client generates correctly**

Run: `cd apps/backend && npx prisma generate`

**Step 4: Commit**
```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/
git commit -m "feat: replace RoutePlanUpdate with RouteEvent table for unified activity log"
```

---

### Task 2: Update RouteUpdateHandlerService → RouteEventService

**Files:**
- Rename+Rewrite: `apps/backend/src/domains/operations/monitoring/services/route-update-handler.service.ts` → `route-event.service.ts`

This service now has two responsibilities:
1. **Record route events** (called by monitoring cron, driver event endpoints, system auto-complete)
2. **Handle monitoring triggers** (the existing trigger → alert → SSE pipeline)

**Step 1: Create route-event.service.ts**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AlertTriggersService } from '../../alerts/services/alert-triggers.service';
import { SseService } from '../../../../infrastructure/sse/sse.service';
import { MonitoringTrigger } from '../monitoring.types';

@Injectable()
export class RouteEventService {
  private readonly logger = new Logger(RouteEventService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alertTriggers: AlertTriggersService,
    private readonly sse: SseService,
  ) {}

  /**
   * Record a route event in the unified activity log.
   * Called by driver endpoints, GPS monitoring, and system auto-complete.
   * Emits SSE for live UI updates. Does NOT create alerts (use handleMonitoringTriggers for that).
   */
  async recordEvent(params: {
    planId: number;
    planStringId: string;
    tenantId: number;
    segmentId?: string;
    eventType: string;
    source: 'driver' | 'dispatcher' | 'monitoring' | 'system';
    eventData?: Record<string, any>;
    location?: { lat: number; lon: number };
    replanRecommended?: boolean;
    replanReason?: string;
    impactSummary?: Record<string, any>;
  }): Promise<{ eventId: string }> {
    const eventId = `EVT-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    await this.prisma.routeEvent.create({
      data: {
        eventId,
        planId: params.planId,
        segmentId: params.segmentId ?? null,
        eventType: params.eventType,
        source: params.source,
        occurredAt: new Date(),
        eventData: params.eventData ?? undefined,
        location: params.location ?? undefined,
        replanRecommended: params.replanRecommended ?? false,
        replanReason: params.replanReason ?? null,
        impactSummary: params.impactSummary ?? undefined,
      },
    });

    // Emit SSE for live UI
    this.sse.emitToTenant(params.tenantId, `route:event`, {
      eventId,
      planId: params.planStringId,
      segmentId: params.segmentId,
      eventType: params.eventType,
      source: params.source,
      eventData: params.eventData,
      timestamp: new Date().toISOString(),
    });

    return { eventId };
  }

  /**
   * Handle monitoring triggers — creates alerts + route events.
   * Called by the monitoring cron when checks detect issues.
   * This is the existing pipeline: trigger → alert → SSE → route event.
   */
  async handleMonitoringTriggers(
    triggers: MonitoringTrigger[],
    plan: { planId: string; id: number; tenantId: number; planVersion: number },
    driverId: string,
  ): Promise<void> {
    if (triggers.length === 0) return;

    const needsReplan = triggers.some((t) => t.requiresReplan && t.etaImpactMinutes > 30);
    const maxEtaImpact = Math.max(...triggers.map((t) => t.etaImpactMinutes));

    for (const trigger of triggers) {
      // 1. Fire alert (dispatcher-actionable)
      await this.alertTriggers.trigger(trigger.type, plan.tenantId, driverId, {
        ...trigger.params,
        routePlanId: plan.planId,
        priority: trigger.severity,
      });

      // 2. Record route event (audit trail)
      await this.recordEvent({
        planId: plan.id,
        planStringId: plan.planId,
        tenantId: plan.tenantId,
        eventType: trigger.type,
        source: 'monitoring',
        eventData: trigger.params,
        replanRecommended: trigger.requiresReplan && trigger.etaImpactMinutes > 30,
        replanReason: trigger.requiresReplan ? `${trigger.type}: ETA impact ${trigger.etaImpactMinutes}min` : undefined,
        impactSummary: {
          etaChangeMinutes: trigger.etaImpactMinutes,
          alertsFired: 1,
          severity: trigger.severity,
        },
      });
    }

    // 3. Emit summary SSE events
    if (needsReplan) {
      this.logger.warn(`Route ${plan.planId} needs re-plan. ETA impact: ${maxEtaImpact}min`);
      this.sse.emitToTenant(plan.tenantId, 'route:replan_recommended', {
        planId: plan.planId,
        reason: triggers.filter((t) => t.requiresReplan).map((t) => t.type).join(', '),
      });
    } else if (maxEtaImpact > 0) {
      this.sse.emitToTenant(plan.tenantId, 'route:eta_shifted', {
        planId: plan.planId,
        etaShiftMinutes: maxEtaImpact,
      });
    }
  }
}
```

**Step 2: Delete the old file**

Delete `apps/backend/src/domains/operations/monitoring/services/route-update-handler.service.ts`

**Step 3: Update all imports**

Files that import `RouteUpdateHandlerService`:
- `monitoring.module.ts:6` — change import and provider
- `monitoring.controller.ts:6,16` — change import and constructor injection
- `route-monitoring.service.ts:7,20` — change import and constructor injection

In each file, replace:
- `RouteUpdateHandlerService` → `RouteEventService`
- `route-update-handler.service` → `route-event.service`
- `this.updateHandler.handleTriggers(...)` → `this.routeEventService.handleMonitoringTriggers(...)`

**Step 4: Update MonitoringController to use new service**

In `monitoring.controller.ts`:
- Change constructor: `private readonly routeEventService: RouteEventService`
- Update `reportDockTime` (line 116): `this.routeEventService.handleMonitoringTriggers(...)`
- Update `reportDelay` (line 138): `this.routeEventService.handleMonitoringTriggers(...)`
- Update `getUpdates` endpoint (lines 85-101): Query `routeEvent` instead of `routePlanUpdate`, order by `occurredAt` desc
- Update `getMonitoringStatus` (line 30): Change `updates` include to `events` with `orderBy: { occurredAt: 'desc' }`

**Step 5: Update RouteMonitoringService to use new service**

In `route-monitoring.service.ts`:
- Change import and constructor: `RouteEventService` instead of `RouteUpdateHandlerService`
- Line 100: `this.routeEventService.handleMonitoringTriggers(...)` instead of `this.updateHandler.handleTriggers(...)`

**Step 6: Update MonitoringModule**

In `monitoring.module.ts`:
- Import `RouteEventService` instead of `RouteUpdateHandlerService`
- Replace in providers array
- Add to exports: `exports: [RouteMonitoringService, RouteEventService]` (other modules will need it)

**Step 7: Verify compilation**

Run: `cd apps/backend && npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 8: Update existing tests**

Update test files that reference `RouteUpdateHandlerService`:
- `__tests__/route-update-handler.service.spec.ts` → rename to `route-event.service.spec.ts`
- Update mock setup, import names, method names

**Step 9: Run tests**

Run: `cd apps/backend && npx jest --testPathPattern monitoring --passWithNoTests 2>&1 | tail -20`

**Step 10: Commit**
```bash
git add -A
git commit -m "refactor: replace RouteUpdateHandlerService with RouteEventService for unified event logging"
```

---

### Task 3: Refactor RouteProgressTrackerService (Hybrid GPS Model)

**Files:**
- Modify: `apps/backend/src/domains/operations/monitoring/services/route-progress-tracker.service.ts`
- Modify: `apps/backend/src/domains/operations/monitoring/services/route-monitoring.service.ts`

Currently GPS auto-completes ALL segment types. Change to: GPS auto-transitions drive, rest, and fuel segments. Dock segments with `actionType` of 'pickup' or 'dropoff' require driver confirmation — GPS only starts them (planned → in_progress), never completes them.

**Step 1: Refactor updateSegmentStatuses**

In `route-progress-tracker.service.ts`, replace the `updateSegmentStatuses` method (lines 19-58):

```typescript
async updateSegmentStatuses(
  segments: any[],
  gpsData: any,
  routeEventService?: any,  // optional - for recording GPS-detected events
  planContext?: { planId: number; planStringId: string; tenantId: number },
): Promise<any | null> {
  const sorted = [...segments].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const driverLat = gpsData?.latitude;
  const driverLon = gpsData?.longitude;

  if (driverLat == null || driverLon == null) return this.determineCurrentSegment(segments);

  for (const segment of sorted) {
    if (segment.status === 'completed' || segment.status === 'skipped') continue;

    const distToDestMiles = this.haversineDistance(driverLat, driverLon, segment.toLat, segment.toLon);

    if (distToDestMiles < 1) {
      // GPS says driver is at/near destination
      if (segment.segmentType === 'dock') {
        // Dock segments: GPS can START them but NOT complete them
        // Pickup/delivery completion requires driver confirmation
        if (segment.status === 'planned') {
          await this.prisma.routeSegment.update({
            where: { id: segment.id },
            data: { status: 'in_progress', actualArrival: segment.actualArrival ?? new Date() },
          });
          segment.status = 'in_progress';

          if (routeEventService && planContext) {
            await routeEventService.recordEvent({
              ...planContext,
              segmentId: segment.segmentId,
              eventType: 'SEGMENT_ARRIVED',
              source: 'monitoring',
              eventData: {
                segmentType: segment.segmentType,
                actionType: segment.actionType,
                distanceToStopMiles: Math.round(distToDestMiles * 10) / 10,
              },
              location: { lat: driverLat, lon: driverLon },
            });
          }
        }
        // If already in_progress, do nothing — waiting for driver confirmation
        return segment;
      } else {
        // Drive, rest, fuel segments: GPS auto-completes
        if (segment.status !== 'completed') {
          const wasPlanned = segment.status === 'planned';
          await this.prisma.routeSegment.update({
            where: { id: segment.id },
            data: {
              status: 'completed',
              actualArrival: segment.actualArrival ?? new Date(),
            },
          });
          segment.status = 'completed';

          if (routeEventService && planContext) {
            await routeEventService.recordEvent({
              ...planContext,
              segmentId: segment.segmentId,
              eventType: wasPlanned ? 'SEGMENT_ARRIVED' : 'SEGMENT_DEPARTED',
              source: 'monitoring',
              eventData: {
                segmentType: segment.segmentType,
                newStatus: 'completed',
                distanceToStopMiles: Math.round(distToDestMiles * 10) / 10,
              },
              location: { lat: driverLat, lon: driverLon },
            });
          }
        }
        // Continue to check next segment
      }
    } else if (segment.status === 'planned') {
      await this.prisma.routeSegment.update({
        where: { id: segment.id },
        data: {
          status: 'in_progress',
          actualDeparture: segment.actualDeparture ?? new Date(),
        },
      });
      segment.status = 'in_progress';
      return segment;
    } else {
      return segment;
    }
  }

  return null;
}
```

Also make `haversineDistance` public (remove `private` keyword on line 60) since other services may need it.

**Step 2: Update route-monitoring.service.ts to pass event service + plan context**

In `route-monitoring.service.ts`, update the call in `monitorSingleRoute` (lines 83-85):

```typescript
// OLD:
const currentSegment = gpsData
  ? await this.progressTracker.updateSegmentStatuses(plan.segments, gpsData)
  : this.progressTracker.determineCurrentSegment(plan.segments);

// NEW:
const currentSegment = gpsData
  ? await this.progressTracker.updateSegmentStatuses(
      plan.segments,
      gpsData,
      this.routeEventService,
      { planId: plan.id, planStringId: plan.planId, tenantId: plan.tenantId },
    )
  : this.progressTracker.determineCurrentSegment(plan.segments);
```

**Step 3: Verify compilation**

Run: `cd apps/backend && npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 4: Update tests**

Update `__tests__/route-progress-tracker.service.spec.ts`:
- Add test: "should NOT auto-complete dock segments (requires driver confirmation)"
- Add test: "should auto-complete drive segments when GPS < 1 mile"
- Add test: "should start dock segments (planned → in_progress) when GPS < 1 mile"
- Update existing tests to pass null for the new optional params

**Step 5: Run tests**

Run: `cd apps/backend && npx jest --testPathPattern route-progress-tracker --passWithNoTests 2>&1 | tail -20`

**Step 6: Commit**
```bash
git add -A
git commit -m "refactor: GPS auto-transitions drive/rest/fuel segments, dock segments require driver confirmation"
```

---

### Task 4: Add Driver Event DTOs

**Files:**
- Create: `apps/backend/src/domains/operations/monitoring/dto/driver-event.dto.ts`

**Step 1: Create DTO file with Zod schemas**

Follow the pattern of existing DTOs (`report-dock-time.dto.ts`):

```typescript
import { z } from 'zod';

// Driver taps "Start Route"
export const StartRouteSchema = z.object({
  notes: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});
export type StartRouteDto = z.infer<typeof StartRouteSchema>;

// Driver taps "Pickup Complete" at a dock
export const PickupCompleteSchema = z.object({
  segmentId: z.string().min(1),
  notes: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});
export type PickupCompleteDto = z.infer<typeof PickupCompleteSchema>;

// Driver taps "Delivery Complete" at a dock
export const DeliveryCompleteSchema = z.object({
  segmentId: z.string().min(1),
  notes: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});
export type DeliveryCompleteDto = z.infer<typeof DeliveryCompleteSchema>;

// Dispatcher overrides a segment status
export const DispatcherOverrideSchema = z.object({
  segmentId: z.string().min(1),
  newStatus: z.enum(['in_progress', 'completed', 'skipped']),
  reason: z.string().min(1).max(500),
  // For confirming business events on driver's behalf
  confirmPickup: z.boolean().optional(),
  confirmDelivery: z.boolean().optional(),
});
export type DispatcherOverrideDto = z.infer<typeof DispatcherOverrideSchema>;
```

Note: No `ArriveSchema` or `DepartSchema` — these are GPS-driven, not driver-initiated.

**Step 2: Verify file created**

Run: `ls -la apps/backend/src/domains/operations/monitoring/dto/driver-event.dto.ts`

**Step 3: Commit**
```bash
git add apps/backend/src/domains/operations/monitoring/dto/driver-event.dto.ts
git commit -m "feat: add driver event DTOs (start-route, pickup-complete, delivery-complete, dispatcher-override)"
```

---

### Task 5: Create DriverEventService (Core Business Logic)

**Files:**
- Create: `apps/backend/src/domains/operations/monitoring/services/driver-event.service.ts`

This is the core service handling driver-initiated events. Key design:
- Each method validates preconditions (plan is active, segment exists, correct status)
- Updates segment status via Prisma
- Updates load status when appropriate (pickup → in_transit, delivery → delivered)
- Records RouteEvent via RouteEventService
- Checks for plan completion after every segment change
- Returns a summary of what changed

**Step 1: Create the service**

```typescript
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { RouteEventService } from './route-event.service';
import { SseService } from '../../../../infrastructure/sse/sse.service';

@Injectable()
export class DriverEventService {
  private readonly logger = new Logger(DriverEventService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly routeEventService: RouteEventService,
    private readonly sse: SseService,
  ) {}

  /**
   * Driver taps "Start Route" — begins the first drive segment.
   */
  async handleStartRoute(
    plan: any,
    dto: { notes?: string; latitude?: number; longitude?: number },
    tenantId: number,
  ) {
    // Find first planned segment
    const firstSegment = plan.segments.find((s: any) => s.status === 'planned');
    if (!firstSegment) {
      throw new BadRequestException('No planned segments to start');
    }

    // Idempotent: if first segment already in_progress, return current state
    const inProgress = plan.segments.find((s: any) => s.status === 'in_progress');
    if (inProgress) {
      return { status: 'already_started', currentSegment: inProgress.segmentId };
    }

    // Transition first segment: planned → in_progress
    await this.prisma.routeSegment.update({
      where: { id: firstSegment.id },
      data: { status: 'in_progress', actualDeparture: new Date() },
    });

    // Record event
    await this.routeEventService.recordEvent({
      planId: plan.id,
      planStringId: plan.planId,
      tenantId,
      segmentId: firstSegment.segmentId,
      eventType: 'ROUTE_STARTED',
      source: 'driver',
      eventData: { notes: dto.notes },
      location: dto.latitude != null ? { lat: dto.latitude, lon: dto.longitude! } : undefined,
    });

    return {
      status: 'started',
      currentSegment: firstSegment.segmentId,
      segmentType: firstSegment.segmentType,
    };
  }

  /**
   * Driver taps "Pickup Complete" — completes dock segment, updates load to in_transit.
   */
  async handlePickupComplete(
    plan: any,
    dto: { segmentId: string; notes?: string; latitude?: number; longitude?: number },
    tenantId: number,
  ) {
    const segment = plan.segments.find((s: any) => s.segmentId === dto.segmentId);
    if (!segment) throw new BadRequestException(`Segment ${dto.segmentId} not found in plan`);
    if (segment.segmentType !== 'dock') throw new BadRequestException('Pickup can only be confirmed on dock segments');
    if (segment.actionType !== 'pickup') throw new BadRequestException('This is not a pickup segment');

    // Idempotent
    if (segment.status === 'completed') {
      return { status: 'already_completed', segmentId: dto.segmentId };
    }
    if (segment.status !== 'in_progress') {
      throw new BadRequestException(`Segment must be in_progress to confirm pickup. Current: ${segment.status}`);
    }

    // Complete the dock segment
    await this.prisma.routeSegment.update({
      where: { id: segment.id },
      data: { status: 'completed', actualDeparture: new Date() },
    });

    // Update load status: assigned → in_transit
    const loadUpdates = await this.updateLoadsForSegment(plan, segment, 'in_transit');

    // Start next drive segment if available
    const nextDrive = this.findNextPlannedSegment(plan.segments, segment.sequenceOrder);
    if (nextDrive) {
      await this.prisma.routeSegment.update({
        where: { id: nextDrive.id },
        data: { status: 'in_progress', actualDeparture: new Date() },
      });
    }

    // Record event
    await this.routeEventService.recordEvent({
      planId: plan.id,
      planStringId: plan.planId,
      tenantId,
      segmentId: dto.segmentId,
      eventType: 'PICKUP_CONFIRMED',
      source: 'driver',
      eventData: {
        actionType: 'pickup',
        loadsUpdated: loadUpdates,
        nextSegmentId: nextDrive?.segmentId,
        notes: dto.notes,
      },
      location: dto.latitude != null ? { lat: dto.latitude, lon: dto.longitude! } : undefined,
      impactSummary: { segmentsAffected: nextDrive ? 2 : 1, loadsAffected: loadUpdates.length },
    });

    // Check for plan completion
    await this.checkAndCompletePlan(plan, tenantId);

    return {
      status: 'pickup_confirmed',
      segmentId: dto.segmentId,
      loadsUpdated: loadUpdates,
      nextSegmentId: nextDrive?.segmentId ?? null,
    };
  }

  /**
   * Driver taps "Delivery Complete" — completes dock segment, updates load to delivered.
   */
  async handleDeliveryComplete(
    plan: any,
    dto: { segmentId: string; notes?: string; latitude?: number; longitude?: number },
    tenantId: number,
  ) {
    const segment = plan.segments.find((s: any) => s.segmentId === dto.segmentId);
    if (!segment) throw new BadRequestException(`Segment ${dto.segmentId} not found in plan`);
    if (segment.segmentType !== 'dock') throw new BadRequestException('Delivery can only be confirmed on dock segments');
    if (segment.actionType !== 'dropoff') throw new BadRequestException('This is not a delivery segment');

    // Idempotent
    if (segment.status === 'completed') {
      return { status: 'already_completed', segmentId: dto.segmentId };
    }
    if (segment.status !== 'in_progress') {
      throw new BadRequestException(`Segment must be in_progress to confirm delivery. Current: ${segment.status}`);
    }

    // Complete the dock segment
    await this.prisma.routeSegment.update({
      where: { id: segment.id },
      data: { status: 'completed', actualDeparture: new Date() },
    });

    // Update load status: in_transit → delivered
    const loadUpdates = await this.updateLoadsForSegment(plan, segment, 'delivered');

    // Start next segment if available
    const nextSegment = this.findNextPlannedSegment(plan.segments, segment.sequenceOrder);
    if (nextSegment) {
      await this.prisma.routeSegment.update({
        where: { id: nextSegment.id },
        data: { status: 'in_progress', actualDeparture: new Date() },
      });
    }

    // Record event
    await this.routeEventService.recordEvent({
      planId: plan.id,
      planStringId: plan.planId,
      tenantId,
      segmentId: dto.segmentId,
      eventType: 'DELIVERY_CONFIRMED',
      source: 'driver',
      eventData: {
        actionType: 'dropoff',
        loadsUpdated: loadUpdates,
        nextSegmentId: nextSegment?.segmentId,
        notes: dto.notes,
      },
      location: dto.latitude != null ? { lat: dto.latitude, lon: dto.longitude! } : undefined,
      impactSummary: { segmentsAffected: nextSegment ? 2 : 1, loadsAffected: loadUpdates.length },
    });

    // Check for plan completion
    await this.checkAndCompletePlan(plan, tenantId);

    return {
      status: 'delivery_confirmed',
      segmentId: dto.segmentId,
      loadsUpdated: loadUpdates,
      nextSegmentId: nextSegment?.segmentId ?? null,
    };
  }

  /**
   * Dispatcher overrides a segment status (e.g., driver forgot to confirm pickup).
   */
  async handleDispatcherOverride(
    plan: any,
    dto: {
      segmentId: string;
      newStatus: string;
      reason: string;
      confirmPickup?: boolean;
      confirmDelivery?: boolean;
    },
    tenantId: number,
    dispatcherUserId: string,
  ) {
    const segment = plan.segments.find((s: any) => s.segmentId === dto.segmentId);
    if (!segment) throw new BadRequestException(`Segment ${dto.segmentId} not found in plan`);

    const previousStatus = segment.status;

    // Update segment status
    const updateData: any = { status: dto.newStatus };
    if (dto.newStatus === 'completed' && !segment.actualDeparture) updateData.actualDeparture = new Date();
    if (dto.newStatus === 'in_progress' && !segment.actualArrival) updateData.actualArrival = new Date();

    await this.prisma.routeSegment.update({
      where: { id: segment.id },
      data: updateData,
    });

    // Handle business event confirmations
    let loadUpdates: { loadId: string; newStatus: string }[] = [];
    if (dto.confirmPickup && segment.segmentType === 'dock' && segment.actionType === 'pickup') {
      loadUpdates = await this.updateLoadsForSegment(plan, segment, 'in_transit');
    }
    if (dto.confirmDelivery && segment.segmentType === 'dock' && segment.actionType === 'dropoff') {
      loadUpdates = await this.updateLoadsForSegment(plan, segment, 'delivered');
    }

    // Start next segment if this one was completed
    let nextSegment = null;
    if (dto.newStatus === 'completed') {
      nextSegment = this.findNextPlannedSegment(plan.segments, segment.sequenceOrder);
      if (nextSegment) {
        await this.prisma.routeSegment.update({
          where: { id: nextSegment.id },
          data: { status: 'in_progress', actualDeparture: new Date() },
        });
      }
    }

    // Record event
    await this.routeEventService.recordEvent({
      planId: plan.id,
      planStringId: plan.planId,
      tenantId,
      segmentId: dto.segmentId,
      eventType: 'DISPATCHER_OVERRIDE',
      source: 'dispatcher',
      eventData: {
        previousStatus,
        newStatus: dto.newStatus,
        reason: dto.reason,
        dispatcherUserId,
        confirmPickup: dto.confirmPickup,
        confirmDelivery: dto.confirmDelivery,
        loadsUpdated: loadUpdates,
        nextSegmentId: nextSegment?.segmentId,
      },
    });

    // Check for plan completion
    await this.checkAndCompletePlan(plan, tenantId);

    return {
      status: 'overridden',
      segmentId: dto.segmentId,
      previousStatus,
      newStatus: dto.newStatus,
      loadsUpdated: loadUpdates,
      nextSegmentId: nextSegment?.segmentId ?? null,
    };
  }

  // --- Private helpers ---

  /**
   * Find loads connected to a dock segment via its stopId, and update their status.
   */
  private async updateLoadsForSegment(
    plan: any,
    segment: any,
    newLoadStatus: string,
  ): Promise<{ loadId: string; newStatus: string }[]> {
    if (!segment.stopId) return [];

    // Find loads on this plan that have a stop matching this segment's stop
    const routePlanLoads = await this.prisma.routePlanLoad.findMany({
      where: { planId: plan.id },
      include: {
        load: {
          include: { stops: { where: { stopId: segment.stopId } } },
        },
      },
    });

    const updates: { loadId: string; newStatus: string }[] = [];
    for (const rpl of routePlanLoads) {
      if (rpl.load.stops.length > 0) {
        await this.prisma.load.update({
          where: { id: rpl.load.id },
          data: { status: newLoadStatus },
        });
        updates.push({ loadId: rpl.load.loadId, newStatus: newLoadStatus });
        this.logger.log(`Load ${rpl.load.loadId} status → ${newLoadStatus}`);
      }
    }

    return updates;
  }

  /**
   * Find the next planned segment after the given sequence order.
   */
  private findNextPlannedSegment(segments: any[], afterSequenceOrder: number): any | null {
    return segments
      .filter((s: any) => s.sequenceOrder > afterSequenceOrder && s.status === 'planned')
      .sort((a: any, b: any) => a.sequenceOrder - b.sequenceOrder)[0] ?? null;
  }

  /**
   * Check if all segments are done → mark plan as completed.
   */
  async checkAndCompletePlan(plan: any, tenantId: number): Promise<boolean> {
    // Re-fetch fresh segment statuses
    const segments = await this.prisma.routeSegment.findMany({
      where: { planId: plan.id },
    });

    const allDone = segments.every((s) => s.status === 'completed' || s.status === 'skipped');
    if (!allDone) return false;

    // Mark plan as completed
    await this.prisma.routePlan.update({
      where: { id: plan.id },
      data: { status: 'completed', isActive: false, completedAt: new Date() },
    });

    // Record event
    await this.routeEventService.recordEvent({
      planId: plan.id,
      planStringId: plan.planId,
      tenantId,
      eventType: 'ROUTE_COMPLETED',
      source: 'system',
      eventData: {
        totalSegments: segments.length,
        completedSegments: segments.filter((s) => s.status === 'completed').length,
        skippedSegments: segments.filter((s) => s.status === 'skipped').length,
      },
    });

    this.logger.log(`Route ${plan.planId} completed — all segments done`);
    return true;
  }
}
```

**Step 2: Verify compilation**

Run: `cd apps/backend && npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 3: Commit**
```bash
git add apps/backend/src/domains/operations/monitoring/services/driver-event.service.ts
git commit -m "feat: add DriverEventService for driver-initiated events and plan completion"
```

---

### Task 6: Add Driver Event Endpoints to MonitoringController

**Files:**
- Modify: `apps/backend/src/domains/operations/monitoring/monitoring.controller.ts`

**Step 1: Add imports and inject DriverEventService**

Add to imports at top of file:
```typescript
import { DriverEventService } from './services/driver-event.service';
import { StartRouteSchema, PickupCompleteSchema, DeliveryCompleteSchema, DispatcherOverrideSchema } from './dto/driver-event.dto';
import { BadRequestException } from '@nestjs/common';
```

Add `BadRequestException` to the existing `@nestjs/common` import if not there already.

Add to constructor: `private readonly driverEventService: DriverEventService,`

Also add CurrentUser decorator import if not present:
```typescript
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
```

**Step 2: Add helper method to fetch and validate active plan**

```typescript
private async getActivePlan(planId: string, tenantId: number) {
  const plan = await this.prisma.routePlan.findFirst({
    where: { planId, tenantId },
    include: {
      segments: { orderBy: { sequenceOrder: 'asc' } },
      driver: true,
      vehicle: true,
      loads: { include: { load: true } },
    },
  });
  if (!plan) throw new BadRequestException(`Route plan ${planId} not found`);
  if (plan.status !== 'active') throw new BadRequestException(`Route plan ${planId} is not active (status: ${plan.status})`);
  return plan;
}
```

**Step 3: Add 4 new endpoints**

```typescript
@Post(':planId/events/start-route')
async startRoute(
  @Param('planId') planId: string,
  @Body() body: any,
  @TenantDbId() tenantId: number,
) {
  const dto = StartRouteSchema.parse(body);
  const plan = await this.getActivePlan(planId, tenantId);
  return this.driverEventService.handleStartRoute(plan, dto, tenantId);
}

@Post(':planId/events/pickup-complete')
async pickupComplete(
  @Param('planId') planId: string,
  @Body() body: any,
  @TenantDbId() tenantId: number,
) {
  const dto = PickupCompleteSchema.parse(body);
  const plan = await this.getActivePlan(planId, tenantId);
  return this.driverEventService.handlePickupComplete(plan, dto, tenantId);
}

@Post(':planId/events/delivery-complete')
async deliveryComplete(
  @Param('planId') planId: string,
  @Body() body: any,
  @TenantDbId() tenantId: number,
) {
  const dto = DeliveryCompleteSchema.parse(body);
  const plan = await this.getActivePlan(planId, tenantId);
  return this.driverEventService.handleDeliveryComplete(plan, dto, tenantId);
}

@Post(':planId/events/dispatcher-override')
async dispatcherOverride(
  @Param('planId') planId: string,
  @Body() body: any,
  @TenantDbId() tenantId: number,
  @CurrentUser() user: any,
) {
  const dto = DispatcherOverrideSchema.parse(body);
  const plan = await this.getActivePlan(planId, tenantId);
  return this.driverEventService.handleDispatcherOverride(plan, dto, tenantId, user.userId);
}
```

**Step 4: Verify compilation**

Run: `cd apps/backend && npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 5: Commit**
```bash
git add apps/backend/src/domains/operations/monitoring/monitoring.controller.ts
git commit -m "feat: add driver event endpoints (start-route, pickup-complete, delivery-complete, dispatcher-override)"
```

---

### Task 7: Wire Everything into MonitoringModule

**Files:**
- Modify: `apps/backend/src/domains/operations/monitoring/monitoring.module.ts`

**Step 1: Add DriverEventService to providers**

```typescript
import { DriverEventService } from './services/driver-event.service';

@Module({
  imports: [AlertsModule, IntegrationsModule],
  controllers: [MonitoringController],
  providers: [
    RouteMonitoringService,
    MonitoringChecksService,
    RouteProgressTrackerService,
    RouteEventService,      // was RouteUpdateHandlerService
    DriverEventService,     // new
  ],
  exports: [RouteMonitoringService, RouteEventService],
})
```

**Step 2: Verify backend compiles**

Run: `cd apps/backend && npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 3: Commit**
```bash
git add apps/backend/src/domains/operations/monitoring/monitoring.module.ts
git commit -m "feat: register DriverEventService and RouteEventService in MonitoringModule"
```

---

### Task 8: Update Plan Activation — Load Status + Double-Booking Validation

**Files:**
- Modify: `apps/backend/src/domains/routing/route-planning/services/route-plan-persistence.service.ts:275-326`

**Step 1: Add double-booking validation and load status updates to activatePlan**

In the `activatePlan` method, after checking `existingPlan` exists, add double-booking validation and load status update inside the transaction:

```typescript
async activatePlan(planId: string) {
  const existingPlan = await this.prisma.routePlan.findUnique({
    where: { planId },
    include: { loads: { include: { load: true } } },
  });

  if (!existingPlan) {
    throw new NotFoundException(`Route plan not found: ${planId}`);
  }

  // Double-booking validation: check if any loads are already assigned to another active plan
  for (const rpl of existingPlan.loads) {
    if (rpl.load.status !== 'pending') {
      // Check if assigned to a DIFFERENT active plan
      const otherAssignment = await this.prisma.routePlanLoad.findFirst({
        where: {
          loadId: rpl.load.id,
          plan: { isActive: true, status: 'active' },
          planId: { not: existingPlan.id },
        },
        include: { plan: { select: { planId: true } } },
      });
      if (otherAssignment) {
        throw new BadRequestException(
          `Load ${rpl.load.loadId} is already assigned to active route ${otherAssignment.plan.planId}`,
        );
      }
    }
  }

  const result = await this.prisma.$transaction(async (tx) => {
    // 1. Deactivate any existing active plan for the same driver
    // and revert their loads to pending
    const previousActivePlans = await tx.routePlan.findMany({
      where: { driverId: existingPlan.driverId, isActive: true },
      include: { loads: { include: { load: true } } },
    });

    for (const prevPlan of previousActivePlans) {
      await tx.routePlan.update({
        where: { id: prevPlan.id },
        data: { isActive: false, status: 'superseded' },
      });
      // Revert assigned loads to pending (but NOT in_transit loads)
      for (const rpl of prevPlan.loads) {
        if (rpl.load.status === 'assigned') {
          await tx.load.update({
            where: { id: rpl.load.id },
            data: { status: 'pending' },
          });
        } else if (rpl.load.status === 'in_transit') {
          // in_transit load on superseded plan — needs dispatcher attention
          // We'll create an alert after the transaction
        }
      }
    }

    // 2. Activate the target plan
    const activated = await tx.routePlan.update({
      where: { planId },
      data: {
        isActive: true,
        status: 'active',
        activatedAt: new Date(),
      },
      include: {
        segments: { orderBy: { sequenceOrder: 'asc' } },
        loads: { include: { load: true } },
        driver: true,
        vehicle: true,
      },
    });

    // 3. Update load statuses: pending → assigned
    for (const rpl of activated.loads) {
      if (rpl.load.status === 'pending') {
        await tx.load.update({
          where: { id: rpl.load.id },
          data: { status: 'assigned' },
        });
      }
    }

    return activated;
  });

  this.logger.log(`Route plan activated: ${planId} for driver ${existingPlan.driverId}`);

  return result;
}
```

Add `BadRequestException` to the import at top of file.

**Step 2: Update cancelPlan to revert load statuses**

In the `cancelPlan` method, add load status reversion:

```typescript
async cancelPlan(planId: string) {
  const existingPlan = await this.prisma.routePlan.findUnique({
    where: { planId },
    include: { loads: { include: { load: true } } },
  });

  if (!existingPlan) {
    throw new NotFoundException(`Route plan not found: ${planId}`);
  }

  const cancelled = await this.prisma.$transaction(async (tx) => {
    // Cancel the plan
    const plan = await tx.routePlan.update({
      where: { planId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        isActive: false,
      },
      include: {
        segments: { orderBy: { sequenceOrder: 'asc' } },
        loads: { include: { load: true } },
      },
    });

    // Revert assigned loads to pending (NOT in_transit loads)
    for (const rpl of existingPlan.loads) {
      if (rpl.load.status === 'assigned') {
        await tx.load.update({
          where: { id: rpl.load.id },
          data: { status: 'pending' },
        });
      }
    }

    return plan;
  });

  this.logger.log(`Route plan cancelled: ${planId}`);

  return cancelled;
}
```

**Step 3: Verify compilation**

Run: `cd apps/backend && npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 4: Commit**
```bash
git add apps/backend/src/domains/routing/route-planning/services/route-plan-persistence.service.ts
git commit -m "feat: add load status management on activation/cancellation with double-booking validation"
```

---

### Task 9: Add Unconfirmed Pickup/Delivery Monitoring Check

**Files:**
- Modify: `apps/backend/src/domains/operations/monitoring/services/monitoring-checks.service.ts`
- Modify: `apps/backend/src/domains/operations/alerts/alert-types.ts`

**Step 1: Add new alert types in alert-types.ts**

Add before the closing `};` of `ALERT_TYPES` (after SYSTEM_ERROR):

```typescript
  // Lifecycle (2 types)
  UNCONFIRMED_PICKUP: {
    type: 'UNCONFIRMED_PICKUP',
    category: 'route',
    defaultPriority: 'high',
    title: (p) => `Unconfirmed Pickup — ${p.driverName || p.driverId}`,
    message: (p) => `Driver departed ${p.stopName || 'dock'} without confirming pickup. Load may be on truck without confirmation.`,
    recommendedAction: (p) => `Contact driver to confirm pickup, or confirm on their behalf for ${p.stopName || 'this stop'}.`,
  },
  UNCONFIRMED_DELIVERY: {
    type: 'UNCONFIRMED_DELIVERY',
    category: 'route',
    defaultPriority: 'high',
    title: (p) => `Unconfirmed Delivery — ${p.driverName || p.driverId}`,
    message: (p) => `Driver departed ${p.stopName || 'dock'} without confirming delivery. Load status not updated.`,
    recommendedAction: (p) => `Contact driver to confirm delivery, or confirm on their behalf for ${p.stopName || 'this stop'}.`,
  },
```

**Step 2: Add monitoring check in monitoring-checks.service.ts**

Add a new check method and call it from `runAllChecks`:

In `runAllChecks` (after line 26, before `return triggers`):

```typescript
    // Lifecycle (1 check)
    this.checkUnconfirmedDockEvent(ctx, triggers);
```

Add the new method:

```typescript
  /**
   * Detect when driver has departed a dock without confirming pickup/delivery.
   * Conditions: dock segment is in_progress (GPS arrived), but driver GPS shows
   * they've moved away (current segment is a drive segment AFTER the dock).
   */
  private checkUnconfirmedDockEvent(ctx: MonitoringContext, triggers: MonitoringTrigger[]) {
    if (!ctx.currentSegment) return;

    // Look for dock segments that are still in_progress but have a later segment also in_progress or further
    for (const segment of ctx.segments) {
      if (segment.segmentType !== 'dock') continue;
      if (segment.status !== 'in_progress') continue;
      if (!segment.actionType) continue;

      // Check if current segment (from GPS) is AFTER this dock segment
      if (ctx.currentSegment.sequenceOrder > segment.sequenceOrder) {
        const alertType = segment.actionType === 'pickup' ? 'UNCONFIRMED_PICKUP' : 'UNCONFIRMED_DELIVERY';
        triggers.push({
          type: alertType,
          severity: 'high',
          requiresReplan: false,
          etaImpactMinutes: 0,
          params: {
            segmentId: segment.segmentId,
            stopName: segment.toLocation || segment.customerName,
            actionType: segment.actionType,
            driverName: ctx.driverName,
          },
        });
      }
    }
  }
```

**Step 3: Verify compilation**

Run: `cd apps/backend && npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 4: Commit**
```bash
git add apps/backend/src/domains/operations/monitoring/services/monitoring-checks.service.ts apps/backend/src/domains/operations/alerts/alert-types.ts
git commit -m "feat: add UNCONFIRMED_PICKUP/DELIVERY monitoring check and alert types"
```

---

### Task 10: Write Tests for DriverEventService

**Files:**
- Create: `apps/backend/src/domains/operations/monitoring/__tests__/driver-event.service.spec.ts`

**Step 1: Write tests covering the core flows**

Follow the existing test pattern from `route-progress-tracker.service.spec.ts`:

Tests to write:
1. `handleStartRoute` — starts first planned segment, returns segment ID
2. `handleStartRoute` — idempotent if already started
3. `handleStartRoute` — throws if no planned segments
4. `handlePickupComplete` — completes dock, updates load to in_transit, starts next drive
5. `handlePickupComplete` — throws if segment is not a pickup dock
6. `handlePickupComplete` — idempotent if already completed
7. `handleDeliveryComplete` — completes dock, updates load to delivered
8. `handleDeliveryComplete` — triggers plan completion when all segments done
9. `handleDispatcherOverride` — changes segment status, records reason
10. `handleDispatcherOverride` — confirms pickup on driver's behalf with confirmPickup flag
11. `checkAndCompletePlan` — marks plan completed when all segments done
12. `checkAndCompletePlan` — does NOT complete plan if segments remain

Use mocked PrismaService, RouteEventService, and SseService.

**Step 2: Run tests**

Run: `cd apps/backend && npx jest --testPathPattern driver-event --passWithNoTests 2>&1 | tail -20`

**Step 3: Commit**
```bash
git add apps/backend/src/domains/operations/monitoring/__tests__/driver-event.service.spec.ts
git commit -m "test: add DriverEventService unit tests for lifecycle flows"
```

---

### Task 11: End-to-End Verification via curl

**No files to modify — verification only.**

**Step 1: Start the backend**

Run: `cd apps/backend && npm run start:dev`

**Step 2: Get auth token**
```bash
curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user_hwssxb2bpk"}' | jq -r '.accessToken'
```

**Step 3: Create a route plan**
```bash
curl -s -X POST http://localhost:8000/api/v1/routes/plan \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "driverId": "DRV-001",
    "vehicleId": "VEH-101",
    "loadIds": ["LOAD-CAT-56789"],
    "departureTime": "2026-02-12T08:00:00Z",
    "optimizationPriority": "balance"
  }' | jq '.planId, .status'
# Expected: planId string, "draft"
```

**Step 4: Activate — verify load becomes "assigned"**
```bash
curl -s -X POST http://localhost:8000/api/v1/routes/$PLAN_ID/activate \
  -H "Authorization: Bearer $TOKEN" | jq '.status'
# Expected: "active"

# Verify load status
curl -s http://localhost:8000/api/v1/loads/LOAD-CAT-56789 \
  -H "Authorization: Bearer $TOKEN" | jq '.status'
# Expected: "assigned"
```

**Step 5: Start route**
```bash
curl -s -X POST http://localhost:8000/api/v1/routes/$PLAN_ID/events/start-route \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.'
# Expected: { status: "started", currentSegment: "seg-1", segmentType: "drive" }
```

**Step 6: Pickup complete (find dock segment ID first)**
```bash
# Get segments
curl -s http://localhost:8000/api/v1/routes/$PLAN_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.segments[] | {segmentId, segmentType, actionType, status}'

# Complete pickup on the dock segment
curl -s -X POST http://localhost:8000/api/v1/routes/$PLAN_ID/events/pickup-complete \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"segmentId": "<pickup-dock-segment-id>"}' | jq '.'
# Expected: loadsUpdated with in_transit
```

**Step 7: Delivery complete**
```bash
curl -s -X POST http://localhost:8000/api/v1/routes/$PLAN_ID/events/delivery-complete \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"segmentId": "<delivery-dock-segment-id>"}' | jq '.'
# Expected: loadsUpdated with delivered
```

**Step 8: Verify final state**
```bash
# Plan status
curl -s http://localhost:8000/api/v1/routes/$PLAN_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.status, .completedAt'
# Expected: "completed" (if all segments done), non-null timestamp

# Load status
curl -s http://localhost:8000/api/v1/loads/LOAD-CAT-56789 \
  -H "Authorization: Bearer $TOKEN" | jq '.status'
# Expected: "delivered"

# Route events
curl -s http://localhost:8000/api/v1/routes/$PLAN_ID/updates \
  -H "Authorization: Bearer $TOKEN" | jq '.[].eventType'
# Expected: ROUTE_STARTED, PICKUP_CONFIRMED, DELIVERY_CONFIRMED, ROUTE_COMPLETED
```

---

### Task 12: Write Post-Route-Lifecycle Documentation

**Files:**
- Create: `.docs/technical/post-route-lifecycle.md`

Document covering:
1. **Route Plan Statuses** — draft → active → completed/cancelled/superseded
2. **Segment Statuses** — planned → in_progress → completed/skipped
3. **Load Statuses** — pending → assigned → in_transit → delivered
4. **Hybrid Transition Model** — what GPS handles vs what driver confirms vs dispatcher override
5. **Driver Event Endpoints** — all 4 with request/response examples
6. **RouteEvent Table** — schema, event types, sample records
7. **Monitoring Loop** — what the cron checks every 60s, including unconfirmed pickup/delivery
8. **SSE vs Alerts** — when each fires, what they're for
9. **Typical Journey Timeline** — step-by-step example with a 2-stop route
10. **Edge Cases** — forgotten driver events, double-booking, in-transit loads on cancelled plans

---

## File Summary

**New files (3):**
1. `apps/backend/src/domains/operations/monitoring/dto/driver-event.dto.ts`
2. `apps/backend/src/domains/operations/monitoring/services/driver-event.service.ts`
3. `apps/backend/src/domains/operations/monitoring/services/route-event.service.ts` (replaces route-update-handler)

**Modified files (6):**
4. `apps/backend/prisma/schema.prisma` — RouteEvent replaces RoutePlanUpdate
5. `apps/backend/src/domains/operations/monitoring/monitoring.controller.ts` — 4 new endpoints + updated queries
6. `apps/backend/src/domains/operations/monitoring/monitoring.module.ts` — register new services
7. `apps/backend/src/domains/operations/monitoring/services/route-progress-tracker.service.ts` — hybrid GPS model
8. `apps/backend/src/domains/operations/monitoring/services/route-monitoring.service.ts` — use RouteEventService
9. `apps/backend/src/domains/routing/route-planning/services/route-plan-persistence.service.ts` — load status + double-booking
10. `apps/backend/src/domains/operations/monitoring/services/monitoring-checks.service.ts` — unconfirmed pickup/delivery check
11. `apps/backend/src/domains/operations/alerts/alert-types.ts` — 2 new alert types

**Deleted files (1):**
12. `apps/backend/src/domains/operations/monitoring/services/route-update-handler.service.ts` — replaced by route-event.service.ts

**Test files (1):**
13. `apps/backend/src/domains/operations/monitoring/__tests__/driver-event.service.spec.ts`

**New migration (1):**
14. `apps/backend/prisma/migrations/<timestamp>_replace_route_plan_updates_with_route_events/`

**Doc (1):**
15. `.docs/technical/post-route-lifecycle.md`

**Database migration required:** Yes — drops `route_plan_updates`, creates `route_events`. No production data at risk (POC).
