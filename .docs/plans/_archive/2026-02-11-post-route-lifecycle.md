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

**Step 1: Replace RoutePlanUpdate relation on RoutePlan model**

In `apps/backend/prisma/schema.prisma`, change line 450:

```prisma
// OLD (line 450):
  updates               RoutePlanUpdate[]

// NEW:
  events                RouteEvent[]
```

**Step 2: Replace the RoutePlanUpdate model with RouteEvent**

In `apps/backend/prisma/schema.prisma`, replace the entire `RoutePlanUpdate` model (lines 527-546) with:

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

**Step 3: Generate and apply migration**

Run: `cd apps/backend && npx prisma migrate dev --name replace_route_plan_updates_with_route_events`

This will:
- Drop the `route_plan_updates` table (it has no production data — POC only)
- Create the `route_events` table with proper indexes

Expected: Migration applied successfully, Prisma client regenerated.

**Step 4: Verify Prisma client generates correctly**

Run: `cd apps/backend && npx prisma generate`

Expected: "Generated Prisma Client" with no errors.

**Step 5: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/
git commit -m "feat: replace RoutePlanUpdate with RouteEvent table for unified activity log"
```

---

### Task 2: Create RouteEventService (replaces RouteUpdateHandlerService)

**Files:**
- Create: `apps/backend/src/domains/operations/monitoring/services/route-event.service.ts`
- Delete: `apps/backend/src/domains/operations/monitoring/services/route-update-handler.service.ts`
- Modify: `apps/backend/src/domains/operations/monitoring/monitoring.module.ts` (lines 6, 17, 19)
- Modify: `apps/backend/src/domains/operations/monitoring/monitoring.controller.ts` (lines 6, 16, 30, 81, 96-100, 116, 138)
- Modify: `apps/backend/src/domains/operations/monitoring/services/route-monitoring.service.ts` (lines 7, 20, 100)
- Rename: `apps/backend/src/domains/operations/monitoring/__tests__/route-update-handler.service.spec.ts` → `route-event.service.spec.ts`

**Step 1: Write the failing test**

Create `apps/backend/src/domains/operations/monitoring/__tests__/route-event.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { RouteEventService } from '../services/route-event.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AlertTriggersService } from '../../alerts/services/alert-triggers.service';
import { SseService } from '../../../../infrastructure/sse/sse.service';

describe('RouteEventService', () => {
  let service: RouteEventService;

  const mockPrisma = {
    routeEvent: { create: jest.fn().mockResolvedValue({ id: 1 }) },
  };
  const mockAlertTriggers = { trigger: jest.fn().mockResolvedValue({ alertId: 'ALT-001' }) };
  const mockSse = { emitToTenant: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteEventService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AlertTriggersService, useValue: mockAlertTriggers },
        { provide: SseService, useValue: mockSse },
      ],
    }).compile();

    service = module.get(RouteEventService);
    jest.clearAllMocks();
  });

  describe('recordEvent', () => {
    it('should create a RouteEvent record and emit SSE', async () => {
      const result = await service.recordEvent({
        planId: 1,
        planStringId: 'RP-001',
        tenantId: 1,
        segmentId: 'seg-1',
        eventType: 'ROUTE_STARTED',
        source: 'driver',
        eventData: { notes: 'Starting route' },
      });

      expect(result.eventId).toBeDefined();
      expect(result.eventId).toMatch(/^EVT-/);
      expect(mockPrisma.routeEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          planId: 1,
          segmentId: 'seg-1',
          eventType: 'ROUTE_STARTED',
          source: 'driver',
        }),
      });
      expect(mockSse.emitToTenant).toHaveBeenCalledWith(1, 'route:event', expect.objectContaining({
        planId: 'RP-001',
        eventType: 'ROUTE_STARTED',
      }));
    });

    it('should handle optional fields as null/undefined', async () => {
      await service.recordEvent({
        planId: 1,
        planStringId: 'RP-001',
        tenantId: 1,
        eventType: 'ROUTE_COMPLETED',
        source: 'system',
      });

      expect(mockPrisma.routeEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          segmentId: null,
          replanRecommended: false,
          replanReason: null,
        }),
      });
    });
  });

  describe('handleMonitoringTriggers', () => {
    it('should fire alerts and record events for each trigger', async () => {
      const triggers = [
        { type: 'HOS_APPROACHING_LIMIT', severity: 'high' as const, requiresReplan: false, etaImpactMinutes: 0, params: { driverName: 'John', remainingMinutes: 45 } },
      ];

      await service.handleMonitoringTriggers(
        triggers,
        { planId: 'RP-001', id: 1, tenantId: 1, planVersion: 1 },
        'driver-1',
      );

      expect(mockAlertTriggers.trigger).toHaveBeenCalledWith('HOS_APPROACHING_LIMIT', 1, 'driver-1', expect.any(Object));
      expect(mockPrisma.routeEvent.create).toHaveBeenCalled();
    });

    it('should emit replan_recommended SSE when trigger requires replan with >30min impact', async () => {
      const triggers = [
        { type: 'HOS_VIOLATION', severity: 'critical' as const, requiresReplan: true, etaImpactMinutes: 600, params: { driverName: 'John' } },
      ];

      await service.handleMonitoringTriggers(
        triggers,
        { planId: 'RP-001', id: 1, tenantId: 1, planVersion: 1 },
        'driver-1',
      );

      expect(mockSse.emitToTenant).toHaveBeenCalledWith(1, 'route:replan_recommended', expect.objectContaining({
        planId: 'RP-001',
      }));
    });

    it('should not process empty triggers array', async () => {
      await service.handleMonitoringTriggers(
        [],
        { planId: 'RP-001', id: 1, tenantId: 1, planVersion: 1 },
        'driver-1',
      );

      expect(mockAlertTriggers.trigger).not.toHaveBeenCalled();
      expect(mockPrisma.routeEvent.create).not.toHaveBeenCalled();
    });

    it('should emit eta_shifted SSE for non-replan triggers with ETA impact', async () => {
      const triggers = [
        { type: 'ROUTE_DELAY', severity: 'medium' as const, requiresReplan: false, etaImpactMinutes: 15, params: { delayMinutes: 15 } },
      ];

      await service.handleMonitoringTriggers(
        triggers,
        { planId: 'RP-001', id: 1, tenantId: 1, planVersion: 1 },
        'driver-1',
      );

      expect(mockSse.emitToTenant).toHaveBeenCalledWith(1, 'route:eta_shifted', expect.objectContaining({
        planId: 'RP-001',
        etaShiftMinutes: 15,
      }));
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx jest --testPathPattern route-event.service.spec --passWithNoTests 2>&1 | tail -20`

Expected: FAIL — `Cannot find module '../services/route-event.service'`

**Step 3: Create route-event.service.ts**

Create `apps/backend/src/domains/operations/monitoring/services/route-event.service.ts`:

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
    this.sse.emitToTenant(params.tenantId, 'route:event', {
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

**Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx jest --testPathPattern route-event.service.spec --passWithNoTests 2>&1 | tail -20`

Expected: All 5 tests PASS.

**Step 5: Delete the old service and old test file**

Delete `apps/backend/src/domains/operations/monitoring/services/route-update-handler.service.ts`
Delete `apps/backend/src/domains/operations/monitoring/__tests__/route-update-handler.service.spec.ts`

**Step 6: Update all imports that reference RouteUpdateHandlerService**

In `apps/backend/src/domains/operations/monitoring/monitoring.module.ts` (lines 6, 17, 19):

```typescript
// OLD line 6:
import { RouteUpdateHandlerService } from './services/route-update-handler.service';
// NEW:
import { RouteEventService } from './services/route-event.service';

// OLD line 17 (in providers array):
    RouteUpdateHandlerService,
// NEW:
    RouteEventService,

// OLD line 19 (in exports array):
  exports: [RouteMonitoringService],
// NEW:
  exports: [RouteMonitoringService, RouteEventService],
```

In `apps/backend/src/domains/operations/monitoring/monitoring.controller.ts`:

```typescript
// OLD line 6:
import { RouteUpdateHandlerService } from './services/route-update-handler.service';
// NEW:
import { RouteEventService } from './services/route-event.service';

// OLD line 16 (constructor):
    private readonly updateHandler: RouteUpdateHandlerService,
// NEW:
    private readonly routeEventService: RouteEventService,

// OLD line 30 (in getMonitoringStatus):
        updates: { orderBy: { triggeredAt: 'desc' }, take: 10 },
// NEW:
        events: { orderBy: { occurredAt: 'desc' }, take: 10 },

// OLD line 81 (in getMonitoringStatus return):
      recentUpdates: plan.updates,
// NEW:
      recentEvents: plan.events,

// OLD lines 96-100 (in getUpdates):
    return this.prisma.routePlanUpdate.findMany({
      where: { planId: plan.id },
      orderBy: { triggeredAt: 'desc' },
      take: 50,
    });
// NEW:
    return this.prisma.routeEvent.findMany({
      where: { planId: plan.id },
      orderBy: { occurredAt: 'desc' },
      take: 50,
    });

// OLD line 116 (in reportDockTime):
    await this.updateHandler.handleTriggers(
// NEW:
    await this.routeEventService.handleMonitoringTriggers(

// OLD line 138 (in reportDelay):
    await this.updateHandler.handleTriggers(
// NEW:
    await this.routeEventService.handleMonitoringTriggers(
```

In `apps/backend/src/domains/operations/monitoring/services/route-monitoring.service.ts`:

```typescript
// OLD line 7:
import { RouteUpdateHandlerService } from './route-update-handler.service';
// NEW:
import { RouteEventService } from './route-event.service';

// OLD line 20 (constructor):
    private readonly updateHandler: RouteUpdateHandlerService,
// NEW:
    private readonly routeEventService: RouteEventService,

// OLD line 100 (in monitorSingleRoute):
      await this.updateHandler.handleTriggers(
// NEW:
      await this.routeEventService.handleMonitoringTriggers(
```

**Step 7: Verify compilation**

Run: `cd apps/backend && npx tsc --noEmit --pretty 2>&1 | head -30`

Expected: No errors.

**Step 8: Run all monitoring tests**

Run: `cd apps/backend && npx jest --testPathPattern monitoring --passWithNoTests 2>&1 | tail -20`

Expected: Tests pass (some existing tests may need mock updates for `routeEvent` instead of `routePlanUpdate`). Fix any failures in the existing test files by:
- `route-monitoring.service.spec.ts`: Change `RouteUpdateHandlerService` → `RouteEventService`, `handleTriggers` → `handleMonitoringTriggers`
- `monitoring-integration.spec.ts`: Same changes

**Step 9: Commit**

```bash
git add -A
git commit -m "refactor: replace RouteUpdateHandlerService with RouteEventService for unified event logging"
```

---

### Task 3: Refactor RouteProgressTrackerService (Hybrid GPS Model)

**Files:**
- Modify: `apps/backend/src/domains/operations/monitoring/services/route-progress-tracker.service.ts` (lines 19-58, 60)
- Modify: `apps/backend/src/domains/operations/monitoring/services/route-monitoring.service.ts` (lines 83-85)
- Modify: `apps/backend/src/domains/operations/monitoring/__tests__/route-progress-tracker.service.spec.ts`

**Step 1: Write the failing tests**

Add these tests to `apps/backend/src/domains/operations/monitoring/__tests__/route-progress-tracker.service.spec.ts`, inside the `updateSegmentStatuses` describe block (after the existing test at line 73):

```typescript
    it('should NOT auto-complete dock segments — only transition to in_progress', async () => {
      const segments = [
        { id: 1, segmentId: 'seg-1', sequenceOrder: 1, status: 'in_progress', segmentType: 'drive', toLat: 34.0, toLon: -118.0 },
        { id: 2, segmentId: 'seg-2', sequenceOrder: 2, status: 'planned', segmentType: 'dock', actionType: 'pickup', toLat: 34.0, toLon: -118.0 },
      ];
      const gps = { latitude: 34.0, longitude: -118.0 };

      const result = await service.updateSegmentStatuses(segments, gps);

      // Drive segment should be completed
      expect(mockPrisma.routeSegment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ status: 'completed' }),
        }),
      );
      // Dock segment should transition to in_progress, NOT completed
      expect(mockPrisma.routeSegment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 2 },
          data: expect.objectContaining({ status: 'in_progress' }),
        }),
      );
      // Current segment should be the dock (waiting for driver confirmation)
      expect(result?.id).toBe(2);
      expect(result?.status).toBe('in_progress');
    });

    it('should auto-complete drive segments when GPS < 1 mile', async () => {
      const segments = [
        { id: 1, segmentId: 'seg-1', sequenceOrder: 1, status: 'in_progress', segmentType: 'drive', toLat: 34.0, toLon: -118.0 },
      ];
      const gps = { latitude: 34.0, longitude: -118.0 };

      await service.updateSegmentStatuses(segments, gps);

      expect(mockPrisma.routeSegment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ status: 'completed' }),
        }),
      );
    });

    it('should leave in_progress dock segment alone when GPS is still nearby', async () => {
      const segments = [
        { id: 1, segmentId: 'seg-1', sequenceOrder: 1, status: 'completed', segmentType: 'drive', toLat: 34.0, toLon: -118.0 },
        { id: 2, segmentId: 'seg-2', sequenceOrder: 2, status: 'in_progress', segmentType: 'dock', actionType: 'pickup', toLat: 34.0, toLon: -118.0 },
      ];
      const gps = { latitude: 34.0, longitude: -118.0 };

      const result = await service.updateSegmentStatuses(segments, gps);

      // Dock segment stays in_progress (no update call for it)
      expect(result?.id).toBe(2);
      expect(result?.status).toBe('in_progress');
    });
```

**Step 2: Run tests to verify they fail**

Run: `cd apps/backend && npx jest --testPathPattern route-progress-tracker --passWithNoTests 2>&1 | tail -20`

Expected: FAIL — dock segments get auto-completed (current behavior doesn't differentiate dock from drive).

**Step 3: Refactor updateSegmentStatuses for hybrid GPS model**

In `apps/backend/src/domains/operations/monitoring/services/route-progress-tracker.service.ts`, replace the `updateSegmentStatuses` method (lines 19-58) and make `haversineDistance` public (line 60):

```typescript
  async updateSegmentStatuses(
    segments: any[],
    gpsData: any,
    routeEventService?: any,
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

  haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
```

**Step 4: Update route-monitoring.service.ts to pass event service + plan context**

In `apps/backend/src/domains/operations/monitoring/services/route-monitoring.service.ts`, update lines 83-85 in `monitorSingleRoute`:

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

**Step 5: Run tests to verify they pass**

Run: `cd apps/backend && npx jest --testPathPattern route-progress-tracker --passWithNoTests 2>&1 | tail -20`

Expected: All tests PASS — including the 3 new tests.

**Step 6: Verify compilation**

Run: `cd apps/backend && npx tsc --noEmit --pretty 2>&1 | head -30`

Expected: No errors.

**Step 7: Commit**

```bash
git add -A
git commit -m "refactor: hybrid GPS model — dock segments require driver confirmation, drive/rest/fuel auto-complete"
```

---

### Task 4: Add Driver Event DTOs

**Files:**
- Create: `apps/backend/src/domains/operations/monitoring/dto/driver-event.dto.ts`

**Step 1: Create DTO file with Zod schemas**

Create `apps/backend/src/domains/operations/monitoring/dto/driver-event.dto.ts`:

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

**Step 2: Verify compilation**

Run: `cd apps/backend && npx tsc --noEmit --pretty 2>&1 | head -30`

Expected: No errors.

**Step 3: Commit**

```bash
git add apps/backend/src/domains/operations/monitoring/dto/driver-event.dto.ts
git commit -m "feat: add driver event DTOs (start-route, pickup-complete, delivery-complete, dispatcher-override)"
```

---

### Task 5: Create DriverEventService (Core Business Logic)

**Files:**
- Create: `apps/backend/src/domains/operations/monitoring/__tests__/driver-event.service.spec.ts`
- Create: `apps/backend/src/domains/operations/monitoring/services/driver-event.service.ts`

**Step 1: Write the failing tests**

Create `apps/backend/src/domains/operations/monitoring/__tests__/driver-event.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { DriverEventService } from '../services/driver-event.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { RouteEventService } from '../services/route-event.service';
import { SseService } from '../../../../infrastructure/sse/sse.service';

describe('DriverEventService', () => {
  let service: DriverEventService;
  let mockPrisma: any;
  let mockRouteEventService: any;
  let mockSse: any;

  beforeEach(async () => {
    mockPrisma = {
      routeSegment: {
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      routePlan: { update: jest.fn().mockResolvedValue({}) },
      routePlanLoad: { findMany: jest.fn().mockResolvedValue([]) },
      load: { update: jest.fn().mockResolvedValue({}) },
    };
    mockRouteEventService = {
      recordEvent: jest.fn().mockResolvedValue({ eventId: 'EVT-test' }),
    };
    mockSse = { emitToTenant: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriverEventService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RouteEventService, useValue: mockRouteEventService },
        { provide: SseService, useValue: mockSse },
      ],
    }).compile();

    service = module.get(DriverEventService);
    jest.clearAllMocks();
  });

  describe('handleStartRoute', () => {
    const makePlan = (segments: any[]) => ({
      id: 1, planId: 'RP-001', segments,
    });

    it('should start first planned segment', async () => {
      const plan = makePlan([
        { id: 1, segmentId: 'seg-1', sequenceOrder: 1, status: 'planned', segmentType: 'drive' },
        { id: 2, segmentId: 'seg-2', sequenceOrder: 2, status: 'planned', segmentType: 'dock' },
      ]);

      const result = await service.handleStartRoute(plan, {}, 1);

      expect(result.status).toBe('started');
      expect(result.currentSegment).toBe('seg-1');
      expect(mockPrisma.routeSegment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ status: 'in_progress' }),
        }),
      );
      expect(mockRouteEventService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'ROUTE_STARTED', source: 'driver' }),
      );
    });

    it('should be idempotent if already started', async () => {
      const plan = makePlan([
        { id: 1, segmentId: 'seg-1', sequenceOrder: 1, status: 'in_progress', segmentType: 'drive' },
      ]);

      const result = await service.handleStartRoute(plan, {}, 1);

      expect(result.status).toBe('already_started');
      expect(mockPrisma.routeSegment.update).not.toHaveBeenCalled();
    });

    it('should throw if no planned segments', async () => {
      const plan = makePlan([
        { id: 1, segmentId: 'seg-1', sequenceOrder: 1, status: 'completed', segmentType: 'drive' },
      ]);

      await expect(service.handleStartRoute(plan, {}, 1)).rejects.toThrow('No planned segments to start');
    });
  });

  describe('handlePickupComplete', () => {
    it('should complete dock segment and update load to in_transit', async () => {
      const plan = {
        id: 1, planId: 'RP-001',
        segments: [
          { id: 1, segmentId: 'seg-1', sequenceOrder: 1, status: 'completed', segmentType: 'drive' },
          { id: 2, segmentId: 'seg-2', sequenceOrder: 2, status: 'in_progress', segmentType: 'dock', actionType: 'pickup', stopId: 10 },
          { id: 3, segmentId: 'seg-3', sequenceOrder: 3, status: 'planned', segmentType: 'drive' },
        ],
      };

      mockPrisma.routePlanLoad.findMany.mockResolvedValue([
        { load: { id: 100, loadId: 'LOAD-001', stops: [{ stopId: 10 }] } },
      ]);
      // For checkAndCompletePlan: not all segments done
      mockPrisma.routeSegment.findMany.mockResolvedValue([
        { status: 'completed' }, { status: 'completed' }, { status: 'in_progress' },
      ]);

      const result = await service.handlePickupComplete(plan, { segmentId: 'seg-2' }, 1);

      expect(result.status).toBe('pickup_confirmed');
      // Dock segment completed
      expect(mockPrisma.routeSegment.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 2 }, data: expect.objectContaining({ status: 'completed' }) }),
      );
      // Next drive segment started
      expect(mockPrisma.routeSegment.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 3 }, data: expect.objectContaining({ status: 'in_progress' }) }),
      );
      // Load updated to in_transit
      expect(mockPrisma.load.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 100 }, data: { status: 'in_transit' } }),
      );
      // Event recorded
      expect(mockRouteEventService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'PICKUP_CONFIRMED', source: 'driver' }),
      );
    });

    it('should throw if segment is not a pickup dock', async () => {
      const plan = {
        id: 1, planId: 'RP-001',
        segments: [
          { id: 1, segmentId: 'seg-1', sequenceOrder: 1, status: 'in_progress', segmentType: 'drive' },
        ],
      };

      await expect(service.handlePickupComplete(plan, { segmentId: 'seg-1' }, 1))
        .rejects.toThrow('Pickup can only be confirmed on dock segments');
    });

    it('should be idempotent if already completed', async () => {
      const plan = {
        id: 1, planId: 'RP-001',
        segments: [
          { id: 2, segmentId: 'seg-2', sequenceOrder: 2, status: 'completed', segmentType: 'dock', actionType: 'pickup' },
        ],
      };

      const result = await service.handlePickupComplete(plan, { segmentId: 'seg-2' }, 1);
      expect(result.status).toBe('already_completed');
    });
  });

  describe('handleDeliveryComplete', () => {
    it('should complete dock segment, update load to delivered, and trigger plan completion', async () => {
      const plan = {
        id: 1, planId: 'RP-001',
        segments: [
          { id: 1, segmentId: 'seg-1', sequenceOrder: 1, status: 'completed', segmentType: 'drive' },
          { id: 2, segmentId: 'seg-2', sequenceOrder: 2, status: 'in_progress', segmentType: 'dock', actionType: 'dropoff', stopId: 20 },
        ],
      };

      mockPrisma.routePlanLoad.findMany.mockResolvedValue([
        { load: { id: 200, loadId: 'LOAD-002', stops: [{ stopId: 20 }] } },
      ]);
      // All segments completed after this one
      mockPrisma.routeSegment.findMany.mockResolvedValue([
        { status: 'completed' }, { status: 'completed' },
      ]);

      const result = await service.handleDeliveryComplete(plan, { segmentId: 'seg-2' }, 1);

      expect(result.status).toBe('delivery_confirmed');
      // Load updated to delivered
      expect(mockPrisma.load.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'delivered' } }),
      );
      // Plan should be marked completed (all segments done)
      expect(mockPrisma.routePlan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'completed', isActive: false }),
        }),
      );
    });
  });

  describe('handleDispatcherOverride', () => {
    it('should change segment status and record reason', async () => {
      const plan = {
        id: 1, planId: 'RP-001',
        segments: [
          { id: 2, segmentId: 'seg-2', sequenceOrder: 2, status: 'in_progress', segmentType: 'dock', actionType: 'pickup' },
        ],
      };
      mockPrisma.routeSegment.findMany.mockResolvedValue([{ status: 'completed' }]);

      const result = await service.handleDispatcherOverride(
        plan,
        { segmentId: 'seg-2', newStatus: 'completed', reason: 'Confirmed by phone' },
        1,
        'user-dispatch-1',
      );

      expect(result.status).toBe('overridden');
      expect(result.previousStatus).toBe('in_progress');
      expect(result.newStatus).toBe('completed');
      expect(mockRouteEventService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'DISPATCHER_OVERRIDE',
          source: 'dispatcher',
          eventData: expect.objectContaining({ reason: 'Confirmed by phone', dispatcherUserId: 'user-dispatch-1' }),
        }),
      );
    });

    it('should confirm pickup on driver behalf with confirmPickup flag', async () => {
      const plan = {
        id: 1, planId: 'RP-001',
        segments: [
          { id: 2, segmentId: 'seg-2', sequenceOrder: 2, status: 'in_progress', segmentType: 'dock', actionType: 'pickup', stopId: 10 },
        ],
      };
      mockPrisma.routePlanLoad.findMany.mockResolvedValue([
        { load: { id: 100, loadId: 'LOAD-001', stops: [{ stopId: 10 }] } },
      ]);
      mockPrisma.routeSegment.findMany.mockResolvedValue([{ status: 'completed' }]);

      await service.handleDispatcherOverride(
        plan,
        { segmentId: 'seg-2', newStatus: 'completed', reason: 'Driver forgot', confirmPickup: true },
        1,
        'user-dispatch-1',
      );

      expect(mockPrisma.load.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'in_transit' } }),
      );
    });
  });

  describe('checkAndCompletePlan', () => {
    it('should mark plan completed when all segments done', async () => {
      const plan = { id: 1, planId: 'RP-001' };
      mockPrisma.routeSegment.findMany.mockResolvedValue([
        { status: 'completed' }, { status: 'completed' }, { status: 'skipped' },
      ]);

      const completed = await service.checkAndCompletePlan(plan, 1);

      expect(completed).toBe(true);
      expect(mockPrisma.routePlan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'completed', isActive: false }),
        }),
      );
      expect(mockRouteEventService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'ROUTE_COMPLETED', source: 'system' }),
      );
    });

    it('should NOT complete plan if segments remain', async () => {
      const plan = { id: 1, planId: 'RP-001' };
      mockPrisma.routeSegment.findMany.mockResolvedValue([
        { status: 'completed' }, { status: 'in_progress' },
      ]);

      const completed = await service.checkAndCompletePlan(plan, 1);

      expect(completed).toBe(false);
      expect(mockPrisma.routePlan.update).not.toHaveBeenCalled();
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd apps/backend && npx jest --testPathPattern driver-event.service.spec --passWithNoTests 2>&1 | tail -20`

Expected: FAIL — `Cannot find module '../services/driver-event.service'`

**Step 3: Create driver-event.service.ts**

Create `apps/backend/src/domains/operations/monitoring/services/driver-event.service.ts`:

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

**Step 4: Run tests to verify they pass**

Run: `cd apps/backend && npx jest --testPathPattern driver-event.service.spec --passWithNoTests 2>&1 | tail -20`

Expected: All 12 tests PASS.

**Step 5: Commit**

```bash
git add apps/backend/src/domains/operations/monitoring/services/driver-event.service.ts apps/backend/src/domains/operations/monitoring/__tests__/driver-event.service.spec.ts
git commit -m "feat: add DriverEventService for driver-initiated events and plan completion"
```

---

### Task 6: Add Driver Event Endpoints + Wire into MonitoringModule

**Files:**
- Modify: `apps/backend/src/domains/operations/monitoring/monitoring.controller.ts`
- Modify: `apps/backend/src/domains/operations/monitoring/monitoring.module.ts`

**Step 1: Add DriverEventService to MonitoringModule**

In `apps/backend/src/domains/operations/monitoring/monitoring.module.ts`, add the import and provider:

```typescript
// Add import at top:
import { DriverEventService } from './services/driver-event.service';

// Add to providers array (after RouteEventService):
    DriverEventService,
```

Full module should look like:

```typescript
import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { RouteMonitoringService } from './services/route-monitoring.service';
import { MonitoringChecksService } from './services/monitoring-checks.service';
import { RouteProgressTrackerService } from './services/route-progress-tracker.service';
import { RouteEventService } from './services/route-event.service';
import { DriverEventService } from './services/driver-event.service';
import { AlertsModule } from '../alerts/alerts.module';
import { IntegrationsModule } from '../../integrations/integrations.module';

@Module({
  imports: [AlertsModule, IntegrationsModule],
  controllers: [MonitoringController],
  providers: [
    RouteMonitoringService,
    MonitoringChecksService,
    RouteProgressTrackerService,
    RouteEventService,
    DriverEventService,
  ],
  exports: [RouteMonitoringService, RouteEventService],
})
export class MonitoringModule {}
```

**Step 2: Add 4 new endpoints to MonitoringController**

In `apps/backend/src/domains/operations/monitoring/monitoring.controller.ts`:

Add imports at top:
```typescript
import { Controller, Get, Post, Param, Body, BadRequestException } from '@nestjs/common';
import { DriverEventService } from './services/driver-event.service';
import { StartRouteSchema, PickupCompleteSchema, DeliveryCompleteSchema, DispatcherOverrideSchema } from './dto/driver-event.dto';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
```

Add `DriverEventService` to constructor:
```typescript
    private readonly driverEventService: DriverEventService,
```

Add helper method and 4 new endpoints after existing endpoints:

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

**Step 3: Verify compilation**

Run: `cd apps/backend && npx tsc --noEmit --pretty 2>&1 | head -30`

Expected: No errors.

**Step 4: Run all monitoring tests**

Run: `cd apps/backend && npx jest --testPathPattern monitoring --passWithNoTests 2>&1 | tail -20`

Expected: All tests PASS.

**Step 5: Commit**

```bash
git add apps/backend/src/domains/operations/monitoring/monitoring.controller.ts apps/backend/src/domains/operations/monitoring/monitoring.module.ts
git commit -m "feat: add driver event endpoints (start-route, pickup-complete, delivery-complete, dispatcher-override)"
```

---

### Task 7: Update Plan Activation — Load Status + Double-Booking Validation

**Files:**
- Modify: `apps/backend/src/domains/routing/route-planning/services/route-plan-persistence.service.ts` (lines 275-326, 391-420)

**Step 1: Update activatePlan with load status management and double-booking validation**

In `apps/backend/src/domains/routing/route-planning/services/route-plan-persistence.service.ts`:

Add `BadRequestException` to the import on line 1:
```typescript
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
```

Replace the `activatePlan` method (lines 275-326) with:

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

**Step 2: Update cancelPlan to revert load statuses**

Replace the `cancelPlan` method (lines 391-420) with:

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

Expected: No errors.

**Step 4: Commit**

```bash
git add apps/backend/src/domains/routing/route-planning/services/route-plan-persistence.service.ts
git commit -m "feat: add load status management on activation/cancellation with double-booking validation"
```

---

### Task 8: Add Unconfirmed Pickup/Delivery Monitoring Check

**Files:**
- Modify: `apps/backend/src/domains/operations/alerts/alert-types.ts` (line 195, before closing `}`)
- Modify: `apps/backend/src/domains/operations/monitoring/services/monitoring-checks.service.ts` (line 31, new method)

**Step 1: Write the failing test**

Add to `apps/backend/src/domains/operations/monitoring/__tests__/monitoring-checks.service.spec.ts` (find the appropriate describe block):

```typescript
  describe('checkUnconfirmedDockEvent', () => {
    it('should trigger UNCONFIRMED_PICKUP when dock is in_progress but driver has moved past it', () => {
      const triggers = checksService.runAllChecks({
        plan: { estimatedArrival: null },
        segments: [
          { segmentId: 'seg-1', sequenceOrder: 1, status: 'completed', segmentType: 'drive' },
          { segmentId: 'seg-2', sequenceOrder: 2, status: 'in_progress', segmentType: 'dock', actionType: 'pickup', toLocation: 'Warehouse A' },
          { segmentId: 'seg-3', sequenceOrder: 3, status: 'in_progress', segmentType: 'drive' },
        ],
        currentSegment: { segmentId: 'seg-3', sequenceOrder: 3, segmentType: 'drive', status: 'in_progress' },
        hosData: { driveTimeRemainingMs: 36000000, shiftTimeRemainingMs: 36000000, cycleTimeRemainingMs: 180000000, timeUntilBreakMs: 36000000, currentDutyStatus: 'driving' },
        gpsData: { speed: 65 },
        thresholds: DEFAULT_THRESHOLDS,
        driverName: 'John',
      });

      const unconfirmed = triggers.find((t) => t.type === 'UNCONFIRMED_PICKUP');
      expect(unconfirmed).toBeDefined();
      expect(unconfirmed?.severity).toBe('high');
      expect(unconfirmed?.params.segmentId).toBe('seg-2');
    });
  });
```

Import `DEFAULT_THRESHOLDS` at top of test file:
```typescript
import { DEFAULT_THRESHOLDS } from '../monitoring.types';
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx jest --testPathPattern monitoring-checks --passWithNoTests 2>&1 | tail -20`

Expected: FAIL — no `UNCONFIRMED_PICKUP` trigger found.

**Step 3: Add new alert types**

In `apps/backend/src/domains/operations/alerts/alert-types.ts`, before the closing `};` on line 196, add:

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

**Step 4: Add monitoring check**

In `apps/backend/src/domains/operations/monitoring/services/monitoring-checks.service.ts`:

Add call in `runAllChecks` (after line 31, before `return triggers;`):

```typescript
    // Lifecycle (1 check)
    this.checkUnconfirmedDockEvent(ctx, triggers);
```

Add the new method at the end of the class (before the closing `}`):

```typescript
  /**
   * Detect when driver has departed a dock without confirming pickup/delivery.
   * Conditions: dock segment is in_progress (GPS arrived), but current segment
   * (from GPS tracking) is AFTER the dock in sequence order.
   */
  private checkUnconfirmedDockEvent(ctx: MonitoringContext, triggers: MonitoringTrigger[]) {
    if (!ctx.currentSegment) return;

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

**Step 5: Run test to verify it passes**

Run: `cd apps/backend && npx jest --testPathPattern monitoring-checks --passWithNoTests 2>&1 | tail -20`

Expected: All tests PASS.

**Step 6: Verify compilation**

Run: `cd apps/backend && npx tsc --noEmit --pretty 2>&1 | head -30`

Expected: No errors.

**Step 7: Commit**

```bash
git add apps/backend/src/domains/operations/monitoring/services/monitoring-checks.service.ts apps/backend/src/domains/operations/alerts/alert-types.ts apps/backend/src/domains/operations/monitoring/__tests__/monitoring-checks.service.spec.ts
git commit -m "feat: add UNCONFIRMED_PICKUP/DELIVERY monitoring check and alert types"
```

---

### Task 9: Run Full Test Suite

**No files to modify — verification only.**

**Step 1: Run all backend tests**

Run: `cd apps/backend && npx jest --passWithNoTests 2>&1 | tail -30`

Expected: All tests pass. Fix any broken tests that reference the old `RoutePlanUpdate` model or `RouteUpdateHandlerService`.

Common fixes needed:
- Any test importing `routePlanUpdate` → change to `routeEvent`
- Any test mocking `RouteUpdateHandlerService` → mock `RouteEventService`
- Any test calling `handleTriggers` → change to `handleMonitoringTriggers`

**Step 2: Verify compilation of entire backend**

Run: `cd apps/backend && npx tsc --noEmit --pretty 2>&1 | head -30`

Expected: No errors.

**Step 3: Commit any test fixes**

```bash
git add -A
git commit -m "fix: update test mocks for RouteEvent migration"
```

---

### Task 10: End-to-End Verification via curl

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
```

**Step 5: Start route**
```bash
curl -s -X POST http://localhost:8000/api/v1/routes/$PLAN_ID/events/start-route \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.'
# Expected: { status: "started", currentSegment: "seg-...", segmentType: "drive" }
```

**Step 6: Pickup complete (find dock segment ID first)**
```bash
curl -s http://localhost:8000/api/v1/routes/$PLAN_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.segments[] | {segmentId, segmentType, actionType, status}'

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
curl -s http://localhost:8000/api/v1/routes/$PLAN_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.status'
# Expected: "completed" (if all segments done) or "active" (if drive segments remain)

curl -s http://localhost:8000/api/v1/routes/$PLAN_ID/updates \
  -H "Authorization: Bearer $TOKEN" | jq '.[].eventType'
# Expected: ROUTE_STARTED, PICKUP_CONFIRMED, DELIVERY_CONFIRMED (and possibly ROUTE_COMPLETED)
```

---

## File Summary

**New files (4):**
1. `apps/backend/src/domains/operations/monitoring/dto/driver-event.dto.ts`
2. `apps/backend/src/domains/operations/monitoring/services/driver-event.service.ts`
3. `apps/backend/src/domains/operations/monitoring/services/route-event.service.ts`
4. `apps/backend/src/domains/operations/monitoring/__tests__/driver-event.service.spec.ts`

**Modified files (6):**
5. `apps/backend/prisma/schema.prisma` — RouteEvent replaces RoutePlanUpdate
6. `apps/backend/src/domains/operations/monitoring/monitoring.controller.ts` — 4 new endpoints + updated queries
7. `apps/backend/src/domains/operations/monitoring/monitoring.module.ts` — register new services
8. `apps/backend/src/domains/operations/monitoring/services/route-progress-tracker.service.ts` — hybrid GPS model
9. `apps/backend/src/domains/operations/monitoring/services/route-monitoring.service.ts` — use RouteEventService
10. `apps/backend/src/domains/routing/route-planning/services/route-plan-persistence.service.ts` — load status + double-booking

**Alert types added (2):**
11. `apps/backend/src/domains/operations/alerts/alert-types.ts` — UNCONFIRMED_PICKUP, UNCONFIRMED_DELIVERY

**Monitoring check added (1):**
12. `apps/backend/src/domains/operations/monitoring/services/monitoring-checks.service.ts` — checkUnconfirmedDockEvent

**Deleted files (2):**
13. `apps/backend/src/domains/operations/monitoring/services/route-update-handler.service.ts`
14. `apps/backend/src/domains/operations/monitoring/__tests__/route-update-handler.service.spec.ts`

**Test files updated (existing):**
15. `apps/backend/src/domains/operations/monitoring/__tests__/route-progress-tracker.service.spec.ts` — new hybrid GPS tests
16. `apps/backend/src/domains/operations/monitoring/__tests__/monitoring-checks.service.spec.ts` — unconfirmed dock test
17. `apps/backend/src/domains/operations/monitoring/__tests__/route-event.service.spec.ts` — replaces route-update-handler test

**New migration (1):**
18. `apps/backend/prisma/migrations/<timestamp>_replace_route_plan_updates_with_route_events/`

**Database migration required:** Yes — drops `route_plan_updates`, creates `route_events`. No production data at risk (POC).
