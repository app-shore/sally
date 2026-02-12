# Post-Route-Creation: Complete Lifecycle Design and Implementation

> **Status:** Designed, not yet built | **Last Validated:** 2026-02-12 | **Source Plans:** `_archive/2026-02-11-post-route-lifecycle.md`

**Note on validation:** The `RoutePlanUpdate` model still exists in the Prisma schema (lines 540-559). The `RouteEvent` model proposed by this plan does NOT exist yet. No driver event endpoints or `DriverEventService` have been created. The post-route lifecycle is entirely a future implementation.

---

## Summary

This plan makes the post-activation lifecycle work end-to-end. After a route is activated, driver events drive business state, GPS handles physical transitions, monitoring observes and alerts, and the plan completes automatically.

**Architecture:** Hybrid event model.
- GPS auto-transitions arrive/depart for drive/rest/fuel segments (monitoring cron detects via geofence)
- Driver must manually confirm business events (pickup complete, delivery complete)
- Dispatcher can override anything
- All events stored in a unified `RouteEvent` table
- SSE for live UI, Alerts only for dispatcher-actionable issues

---

## Design Decisions

| Decision | Choice |
|----------|--------|
| Segment transitions | Hybrid: GPS auto for arrive/depart, driver confirms pickup/delivery, dispatcher overrides anything |
| Event storage | New `RouteEvent` table (replaces `RoutePlanUpdate`) |
| Event sources | `driver`, `dispatcher`, `monitoring`, `system` |
| Replan field | `replanRecommended` (advisory, not automatic) |
| Forgotten driver events | Monitoring alerts dispatcher, NO auto-inference for business events |
| Plan completion | Auto when all segments completed/skipped |
| Load status flow | `pending` -> `assigned` -> `in_transit` -> `delivered` |
| When loads become assigned | On plan **activation** only. Double-booking validation. |
| Cancelled plan + assigned loads | `assigned` -> `pending` (auto). `in_transit` -> stays + alert. |
| Driver visibility | Drivers see nothing until activation. Notification only on activation. |

---

## Complete Flow

```
PLAN CREATED (draft) -> ACTIVATED (active)
    -> Loads: pending -> assigned
    -> SSE to dispatcher: route:activated
    -> Driver notification: "New route assigned"

Driver taps: "Start Route"
    -> POST /routes/:planId/events/start-route
    -> First drive segment: planned -> in_progress
    -> RouteEvent: ROUTE_STARTED (source: driver)
    -> SSE: segment:status_changed

Driver drives... GPS tracked every 60s by monitoring cron
    -> Monitoring detects driver < 1 mile from stop
    -> Drive segment: in_progress -> completed
    -> Next stop segment: planned -> in_progress
    -> RouteEvent: SEGMENT_ARRIVED (source: monitoring)
    -> SSE: segment:status_changed

At dock (pickup)... driver loads freight
    -> If dock time exceeds plan + 60min: Alert (DOCK_TIME_EXCEEDED)

Driver taps: "Pickup Complete"
    -> POST /routes/:planId/events/pickup-complete
    -> Dock segment: in_progress -> completed
    -> Load: assigned -> in_transit
    -> Next drive segment: planned -> in_progress
    -> RouteEvent: PICKUP_CONFIRMED (source: driver)
    -> SSE: segment:status_changed + load:status_changed

Driver drives to delivery... monitoring continues

Driver taps: "Delivery Complete"
    -> POST /routes/:planId/events/delivery-complete
    -> Dock segment: in_progress -> completed
    -> Load: in_transit -> delivered
    -> All segments done? -> Plan: active -> completed
    -> RouteEvent: DELIVERY_CONFIRMED + ROUTE_COMPLETED
    -> SSE: route:completed
```

### Edge Case: Driver Forgets to Confirm Pickup/Delivery

```
GPS detects arrival at dock
    -> Drive segment completed, dock segment in_progress (automatic)
GPS detects departure from dock
    -> Dock segment is still in_progress (no driver confirmation!)
    -> Monitoring cron detects: dock segment in_progress + driver moving away
    -> Alert to dispatcher: UNCONFIRMED_PICKUP / UNCONFIRMED_DELIVERY
    -> Dispatcher confirms on driver's behalf OR contacts driver
```

### SSE vs Alerts Distinction

| Concern | SSE Events | Alerts |
|---------|-----------|--------|
| Purpose | Live UI updates | Dispatcher action needed |
| Persistence | None (ephemeral) | DB record, acknowledge/resolve |
| Examples | segment changed, load status, route completed | HOS violation, missed appointment, unconfirmed pickup |
| Volume | High (every state change) | Low (only actionable issues) |

---

## RouteEvent Table (Proposed Schema Change)

**Current state:** `RoutePlanUpdate` model exists in schema (lines 540-559).
**Proposed:** Replace with `RouteEvent` model.

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

**Migration:** `npx prisma migrate dev --name replace_route_plan_updates_with_route_events`

This drops the `route_plan_updates` table (no production data) and creates `route_events`.

---

## Implementation Tasks

### Task 1: Database Migration -- RouteEvent Table

Replace `RoutePlanUpdate` with `RouteEvent` in schema. Update `RoutePlan` relation from `updates RoutePlanUpdate[]` to `events RouteEvent[]`.

### Task 2: Create RouteEventService

Replace `RouteUpdateHandlerService` with `RouteEventService`:
- `recordEvent(params)` -- Creates RouteEvent record, emits SSE
- `handleMonitoringTriggers(triggers, plan, driverId)` -- Creates alerts + route events from monitoring checks
- Emit SSE events: `route:event`, `route:replan_recommended`, `route:eta_shifted`

### Task 3: Refactor RouteProgressTrackerService (Hybrid GPS Model)

Update `updateSegmentStatuses()`:
- Drive/rest/fuel segments: GPS auto-completes (< 1 mile proximity)
- Dock segments: GPS can START them (`planned` -> `in_progress`) but NOT complete them
- Dock completion requires driver confirmation via Task 5 endpoints

### Task 4: Add Driver Event DTOs

Zod schemas for driver event endpoints:
- `StartRouteSchema` -- notes, optional lat/lon
- `PickupCompleteSchema` -- segmentId, notes, optional lat/lon
- `DeliveryCompleteSchema` -- segmentId, notes, optional lat/lon
- `DispatcherOverrideSchema` -- segmentId, newStatus, reason, optional confirmPickup/confirmDelivery

### Task 5: Create DriverEventService

Core business logic for driver events:

**`handleStartRoute(plan, dto, tenantId)`**
- Starts first planned segment (`planned` -> `in_progress`)
- Records ROUTE_STARTED event
- Idempotent: returns `already_started` if route already in progress

**`handlePickupComplete(plan, dto, tenantId)`**
- Completes dock segment (`in_progress` -> `completed`)
- Updates load status (`assigned` -> `in_transit`)
- Starts next drive segment
- Records PICKUP_CONFIRMED event

**`handleDeliveryComplete(plan, dto, tenantId)`**
- Completes dock segment
- Updates load status (`in_transit` -> `delivered`)
- Starts next segment (if any)
- Checks for route completion (all segments done = plan completed)
- Records DELIVERY_CONFIRMED event (and ROUTE_COMPLETED if applicable)

**`handleDispatcherOverride(plan, dto, tenantId)`**
- Overrides any segment status
- Optionally confirms pickup/delivery on driver's behalf
- Records DISPATCHER_OVERRIDE event

### Task 6: Add Load Status Management on Activation/Cancellation

Modify `RoutePlanPersistenceService`:
- `activatePlan()`: Validate no double-booking, update all loads `pending` -> `assigned`
- `cancelPlan()`: Update loads `assigned` -> `pending`, alert if any loads are `in_transit`

### Task 7: Add UNCONFIRMED_PICKUP/DELIVERY Monitoring Checks

Add 2 new monitoring checks to `MonitoringChecksService`:
- `checkUnconfirmedPickup()`: dock segment `in_progress` (pickup) + driver moving away from dock
- `checkUnconfirmedDelivery()`: dock segment `in_progress` (delivery) + driver moving away from dock

Both fire alerts to dispatcher to manually confirm.

### Task 8: Add Driver Event Endpoints to Controller

New controller endpoints for driver-facing events:

| Method | Path | Handler |
|--------|------|---------|
| `POST` | `/routes/:planId/events/start-route` | `handleStartRoute()` |
| `POST` | `/routes/:planId/events/pickup-complete` | `handlePickupComplete()` |
| `POST` | `/routes/:planId/events/delivery-complete` | `handleDeliveryComplete()` |
| `POST` | `/routes/:planId/events/dispatcher-override` | `handleDispatcherOverride()` |

---

## Testing Strategy

- `route-event.service.spec.ts` -- 5 tests covering event recording, SSE emission, monitoring trigger handling
- `driver-event.service.spec.ts` -- Tests for start route, pickup complete, delivery complete, dispatcher override, idempotency, edge cases
- `route-progress-tracker.service.spec.ts` -- 3 new tests for hybrid GPS model (dock segments not auto-completed)
- Integration tests for load status transitions through the full lifecycle
