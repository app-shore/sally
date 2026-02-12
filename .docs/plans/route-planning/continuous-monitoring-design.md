# Continuous Monitoring Service + Dynamic Update Handler -- Design Specification

> **Status:** Designed, not yet fully validated | **Last Validated:** 2026-02-12 | **Source Plans:** `_archive/2026-02-09-continuous-monitoring-design.md`

**Note:** The monitoring module directory structure and core services exist in code (`apps/backend/src/domains/operations/monitoring/`), but the full 14-check monitoring daemon and dynamic update handler have not been independently validated in this review. The design described here represents the target architecture.

---

## Summary

A background daemon that runs every 60 seconds, checks all active routes against real-time Samsara ELD data (HOS clocks + GPS location), fires alerts when conditions deviate, and triggers re-planning when major deviations occur. Includes a minimal monitoring page for dispatcher visibility.

---

## Data Source: Samsara Only

No simulation fallback. Monitoring requires real Samsara credentials.

### Samsara APIs Used

**1. HOS Clocks** -- `GET /fleet/hos/clocks`
- Current duty status (driving, on_duty, off_duty, sleeper_berth)
- Driving time remaining, shift time remaining, cycle time remaining
- Time until break required

**2. Vehicle GPS** -- `GET /fleet/vehicles/stats?types=gps`
- Latitude, longitude, speed (mph), heading (degrees)
- Timestamp, pollable every 5-30 seconds

### Required Adapter Methods

The existing `IELDAdapter` needs these methods:

```typescript
getHOSClocks(apiToken: string): Promise<HOSClockData[]>;
getVehicleLocations(apiToken: string): Promise<VehicleLocationData[]>;
```

### Data Shapes

```typescript
interface HOSClockData {
  driverId: string;
  driverName: string;
  currentDutyStatus: 'driving' | 'onDuty' | 'offDuty' | 'sleeperBerth';
  driveTimeRemainingMs: number;
  shiftTimeRemainingMs: number;
  cycleTimeRemainingMs: number;
  timeUntilBreakMs: number;
  lastUpdated: string;
}

interface VehicleLocationData {
  vehicleId: string;
  gps: {
    latitude: number;
    longitude: number;
    speedMilesPerHour: number;
    headingDegrees: number;
    time: string;
  };
}
```

---

## Architecture

### Where It Lives

```
apps/backend/src/domains/operations/monitoring/
```

In the `operations` domain, alongside `alerts/`, `command-center/`, `notifications/`.

### No Schema Migration Required

Everything needed already exists in the schema:
- `RouteSegment.status` (planned/in_progress/completed/skipped)
- `RouteSegment.actualArrival` / `actualDeparture`
- `RouteSegment.hosStateAfter` (JSON)
- `RouteSegment.appointmentWindow` (JSON)
- `RouteSegment.fuelStateAfter` (JSON)
- `RoutePlanUpdate` model -- fully defined (still in schema as of 2026-02-12, not yet replaced by `RouteEvent`)
- `RoutePlan.isActive` + `status='active'` for querying

### File Structure

```
apps/backend/src/domains/operations/monitoring/
├── monitoring.module.ts
├── monitoring.controller.ts
├── dto/
│   ├── report-dock-time.dto.ts
│   ├── report-delay.dto.ts
│   ├── report-driver-status.dto.ts
│   └── report-location.dto.ts
└── services/
    ├── route-monitoring.service.ts          # Cron daemon (orchestrator)
    ├── monitoring-checks.service.ts         # 14 trigger check implementations
    ├── route-progress-tracker.service.ts    # Segment status management
    └── route-update-handler.service.ts      # Re-plan vs ETA update (Layer 3)
```

---

## Monitoring Daemon (Layer 2)

### Flow (Every 60 Seconds)

```
@Cron(EVERY_MINUTE)
monitorActiveRoutes()
|
+-- 1. Query all active route plans (isActive=true, status='active')
|      Include: segments, driver, vehicle
|
+-- 2. For each plan (error-isolated via try/catch):
|     |
|     +-- a. Fetch real-time HOS from Samsara (via IntegrationManager)
|     |      getDriverHOS(tenantId, driverId)
|     |
|     +-- b. Fetch real-time GPS from Samsara (via IntegrationManager)
|     |      getVehicleLocation(tenantId, vehicleId)
|     |
|     +-- c. Determine current segment from GPS position
|     |      Match driver location to planned segment coordinates
|     |      Update segment statuses (planned -> in_progress -> completed)
|     |
|     +-- d. Run all 14 monitoring checks
|     |      Pass: plan, segments, HOS data, GPS data, thresholds
|     |      Returns: MonitoringTrigger[]
|     |
|     +-- e. Handle triggers (if any)
|     |      Fire alerts via AlertTriggersService (dedup handles duplicates)
|     |      Decide: alert-only vs ETA update vs re-plan
|     |      Record RoutePlanUpdate for audit trail
|     |      Emit SSE events to tenant
|     |
|     +-- f. Check auto-resolve conditions
|           Driver moving again? Resolve DRIVER_NOT_MOVING
|           ETA recovered? Resolve APPOINTMENT_AT_RISK
|           Fuel refilled? Resolve FUEL_LOW
|
+-- 3. Log: "Monitored N routes, M triggers fired"
```

### 14 Monitoring Checks

**HOS Compliance (5 checks)**

| Check | Condition | Alert Type | Re-plan? |
|-------|-----------|------------|----------|
| Drive limit approaching | < 60 min remaining | HOS_APPROACHING_LIMIT | No |
| Duty limit approaching | < 60 min remaining | HOS_APPROACHING_LIMIT | No |
| Break required | > 8h since break | BREAK_REQUIRED | No |
| Cycle approaching | < 5h remaining | CYCLE_APPROACHING_LIMIT | No |
| HOS violation | Any limit exceeded | HOS_VIOLATION | Yes |

**Route Progress (4 checks)**

| Check | Condition | Alert Type | Re-plan? |
|-------|-----------|------------|----------|
| Appointment at risk | ETA > window start - 30 min | APPOINTMENT_AT_RISK | No |
| Missed appointment | Past window end | MISSED_APPOINTMENT | Yes |
| Dock time exceeded | Actual > planned + 60 min | DOCK_TIME_EXCEEDED | Yes |
| Route delay | ETA slip > 30 min | ROUTE_DELAY | Conditional |

**Driver Behavior (1 check)**

| Check | Condition | Alert Type | Re-plan? |
|-------|-----------|------------|----------|
| Not moving | Speed = 0 for > 120 min during drive segment | DRIVER_NOT_MOVING | No |

**Vehicle State (1 check)**

| Check | Condition | Alert Type | Re-plan? |
|-------|-----------|------------|----------|
| Fuel low | < 20% capacity | FUEL_LOW | No |

**External (2 checks) -- Placeholder**

| Check | Condition | Alert Type | Re-plan? |
|-------|-----------|------------|----------|
| Weather alert | Severe weather on remaining route | WEATHER_ALERT | Conditional |
| Road closure | Closure on planned route | ROAD_CLOSURE | Yes |

Weather and road closure checks are placeholders -- they require additional external API integration beyond Samsara.

### Configurable Thresholds (Per-Tenant)

```typescript
interface MonitoringThresholds {
  hosApproachingMinutes: number;     // Default: 60
  breakRequiredHours: number;        // Default: 8
  cycleApproachingHours: number;     // Default: 5
  appointmentAtRiskMinutes: number;  // Default: 30
  dockTimeExceededMinutes: number;   // Default: 60
  driverNotMovingMinutes: number;    // Default: 120
  routeDelayMinutes: number;         // Default: 30
  fuelLowPercent: number;            // Default: 20
}
```

---

## Dynamic Update Handler (Layer 3)

### Decision Logic

```
Triggers received from monitoring checks
|
+-- Any trigger has requiresReplan = true AND etaImpactMinutes > 30?
|   YES -> Full re-plan
|          1. Call RoutePlanningEngineService.planRoute() with remaining stops
|          2. Increment planVersion
|          3. Record RoutePlanUpdate (previousPlanVersion -> newPlanVersion)
|          4. Emit SSE: route:replanned
|
+-- ETA deviation > 0 but < 30 min?
|   YES -> ETA update only
|          1. Shift estimatedArrival/estimatedDeparture on remaining segments
|          2. Update plan.estimatedArrival
|          3. Record RoutePlanUpdate
|          4. Emit SSE: route:updated
|
+-- No ETA impact?
    Alert only
         1. Fire alerts via AlertTriggersService
         2. Record RoutePlanUpdate
```

### RoutePlanUpdate Record Format

```typescript
{
  updateId: "UPD-a1b2c3",
  planId: 42,
  updateType: "HOS_APPROACHING_LIMIT",
  triggeredAt: new Date(),
  triggeredBy: "monitoring_daemon",
  triggerData: { remainingMinutes: 38, hoursType: "driving" },
  replanTriggered: false,
  replanReason: null,
  previousPlanVersion: null,
  newPlanVersion: null,
  impactSummary: { etaChangeMinutes: 0, alertsFired: 1 }
}
```

**Schema note:** The `RoutePlanUpdate` model is still in the current schema (as of 2026-02-12). The post-route-lifecycle plan proposes replacing it with a `RouteEvent` model, but that migration has not been applied yet.

---

## Manual Event Injection Endpoints

For dispatchers to report real-world events that monitoring cannot detect from Samsara alone:

| Method | Path | Use Case |
|--------|------|----------|
| `POST` | `/routes/:planId/events/dock-time` | Driver reports actual dock time |
| `POST` | `/routes/:planId/events/delay` | Dispatcher reports delay |
| `POST` | `/routes/:planId/events/driver-status` | Driver status change |
| `GET` | `/routes/:planId/monitoring` | Get live monitoring status for a route |
| `GET` | `/routes/:planId/updates` | Get RoutePlanUpdate audit trail |

### GET /routes/:planId/monitoring Response

```typescript
{
  planId: string;
  currentSegment: {
    segmentId: string;
    sequenceOrder: number;
    segmentType: string;
    status: string;
  };
  driverPosition: {
    lat: number;
    lon: number;
    speed: number;
    heading: number;
    lastUpdated: string;
  };
  hosState: {
    currentDutyStatus: string;
    driveTimeRemainingMinutes: number;
    shiftTimeRemainingMinutes: number;
    cycleTimeRemainingMinutes: number;
    timeUntilBreakMinutes: number;
  };
  etaDeviation: {
    minutes: number;
    status: 'on_time' | 'at_risk' | 'late';
  };
  completedSegments: number;
  totalSegments: number;
  activeAlerts: number;
  lastChecked: string;
  recentUpdates: RoutePlanUpdate[];
}
```

---

## Integration Points

| What | Service | Method |
|------|---------|--------|
| Fire alerts | `AlertTriggersService` | `.trigger(type, tenantId, driverId, params)` |
| Real-time HOS | `IntegrationManager` | `.getDriverHOS(tenantId, driverId)` via Samsara |
| Real-time GPS | `IntegrationManager` | `.getVehicleLocation(tenantId, vehicleId)` via Samsara |
| Re-plan routes | `RoutePlanningEngineService` | `.planRoute(input)` |
| Push events | `SseService` | `.emitToTenant(tenantId, event, data)` |
| Audit trail | `PrismaService` | `routePlanUpdate.create()` |
| Auto-resolve | `AutoResolutionService` | `.autoResolveByCondition()` |
| Segment updates | `PrismaService` | `routeSegment.update()` |

---

## Monitoring UX (Frontend)

### Page: `/dispatcher/monitoring`

**Status:** Designed, not yet built

Three sections:

**Section 1: Monitoring Pulse Strip** -- Shows daemon heartbeat, route count, check count, last scan timestamp, Samsara connection status.

**Section 2: Recent Triggers Feed** -- Live feed of monitoring output via SSE. New entries at top. Color-coded by severity.

**Section 3: Route Health Cards** -- One card per active route showing driver, current segment, HOS remaining, ETA status, active alert count.

### SSE Events

- `monitoring:cycle_complete` -- Daemon completed a scan cycle
- `monitoring:trigger_fired` -- A check triggered
- `route:updated` -- ETA or segment change
- `route:replanned` -- Full re-plan occurred

---

## What This Design Does NOT Include

- Position simulation -- Samsara only, no fallback
- Fleet health trends/analytics -- Deferred
- Vehicle maintenance tracking -- Deferred (Phase 2)
- Weather/road closure live data -- Placeholder checks, no external API yet
- Driver mobile app -- Deferred
- Map visualization -- Deferred
