# Continuous Monitoring Service + Dynamic Update Handler — Design

**Date:** February 9, 2026
**Status:** Design (brainstormed)
**Scope:** Layer 2 (Continuous Monitoring) + Layer 3 (Dynamic Updates) + Monitoring UX

---

## What We're Building

A background daemon that runs every 60 seconds, checks all active routes against real-time Samsara ELD data (HOS clocks + GPS location), fires alerts when conditions deviate, and triggers re-planning when major deviations occur. Plus a minimal monitoring page for admin/owner visibility.

---

## Data Source Decision: Samsara Only

**No simulation fallback.** Monitoring requires real Samsara credentials.

### Samsara APIs Used

**1. HOS Clocks** — `GET /fleet/hos/clocks`
- Current duty status (driving, on_duty, off_duty, sleeper_berth)
- Driving time remaining
- Shift time remaining
- Cycle time remaining
- Time until break required

**2. Vehicle GPS** — `GET /fleet/vehicles/stats?types=gps`
- Latitude, longitude
- Speed (mph), heading (degrees)
- Timestamp
- Pollable every 5-30 seconds

### What Needs to Be Added to Samsara Adapter

The existing `IELDAdapter` interface only has `getVehicles()`, `getDrivers()`, `testConnection()`. We need to add:

```typescript
// New methods on IELDAdapter
getHOSClocks(apiToken: string): Promise<HOSClockData[]>;
getVehicleLocations(apiToken: string): Promise<VehicleLocationData[]>;
```

The existing `IntegrationManager.getDriverHOS()` currently returns mock data — it needs to call the real Samsara HOS Clocks endpoint.

### HOSClockData Shape (from Samsara)

```typescript
interface HOSClockData {
  driverId: string;
  driverName: string;
  currentDutyStatus: 'driving' | 'onDuty' | 'offDuty' | 'sleeperBerth';
  driveTimeRemainingMs: number;
  shiftTimeRemainingMs: number;
  cycleTimeRemainingMs: number;
  timeUntilBreakMs: number;
  lastUpdated: string; // ISO 8601
}
```

### VehicleLocationData Shape (from Samsara)

```typescript
interface VehicleLocationData {
  vehicleId: string;
  gps: {
    latitude: number;
    longitude: number;
    speedMilesPerHour: number;
    headingDegrees: number;
    time: string; // ISO 8601
  };
}
```

---

## Architecture

### Where It Lives

```
apps/backend/src/domains/operations/monitoring/
```

In the `operations` domain, alongside `alerts/`, `command-center/`, `notifications/`. Monitoring is about execution oversight, not route planning.

### No Schema Migration Required

Everything needed already exists:
- `RouteSegment.status` (planned/in_progress/completed/skipped)
- `RouteSegment.actualArrival` / `actualDeparture`
- `RouteSegment.hosStateAfter` (JSON)
- `RouteSegment.appointmentWindow` (JSON)
- `RouteSegment.fuelStateAfter` (JSON)
- `RoutePlanUpdate` model — fully defined, completely unused (this design wires it up)
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

Note: No `RoutePositionSimulatorService` — we use real Samsara GPS data instead.

---

## Monitoring Daemon (Layer 2)

### Flow (Every 60 Seconds)

```
@Cron(EVERY_MINUTE)
monitorActiveRoutes()
│
├─ 1. Query all active route plans (isActive=true, status='active')
│     Include: segments, driver, vehicle
│
├─ 2. For each plan (error-isolated via try/catch):
│     │
│     ├─ a. Fetch real-time HOS from Samsara (via IntegrationManager)
│     │     → getDriverHOS(tenantId, driverId)
│     │     → Returns: drive time remaining, duty remaining, break timer, status
│     │
│     ├─ b. Fetch real-time GPS from Samsara (via IntegrationManager)
│     │     → getVehicleLocation(tenantId, vehicleId)
│     │     → Returns: lat, lon, speed, heading
│     │
│     ├─ c. Determine current segment from GPS position
│     │     → Match driver location to planned segment coordinates
│     │     → Update segment statuses (planned → in_progress → completed)
│     │
│     ├─ d. Run all 14 monitoring checks
│     │     → Pass: plan, segments, HOS data, GPS data, thresholds
│     │     → Returns: MonitoringTrigger[]
│     │
│     ├─ e. Handle triggers (if any)
│     │     → Fire alerts via AlertTriggersService (dedup handles duplicates)
│     │     → Decide: alert-only vs ETA update vs re-plan
│     │     → Record RoutePlanUpdate for audit trail
│     │     → Emit SSE events to tenant
│     │
│     └─ f. Check auto-resolve conditions
│           → Driver moving again? Resolve DRIVER_NOT_MOVING
│           → ETA recovered? Resolve APPOINTMENT_AT_RISK
│           → Fuel refilled? Resolve FUEL_LOW
│
└─ 3. Log: "Monitored N routes, M triggers fired"
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

**External (2 checks)**
| Check | Condition | Alert Type | Re-plan? |
|-------|-----------|------------|----------|
| Weather alert | Severe weather on remaining route | WEATHER_ALERT | Conditional |
| Road closure | Closure on planned route | ROAD_CLOSURE | Yes |

Note: Weather and road closure checks are placeholders for now — they require additional external API integration beyond Samsara.

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
│
├─ Any trigger has requiresReplan = true AND etaImpactMinutes > 30?
│   └─ YES → Full re-plan
│            1. Call RoutePlanningEngineService.planRoute() with remaining stops
│            2. Increment planVersion
│            3. Record RoutePlanUpdate (previousPlanVersion → newPlanVersion)
│            4. Emit SSE: route:replanned
│
├─ ETA deviation > 0 but < 30 min?
│   └─ YES → ETA update only
│            1. Shift estimatedArrival/estimatedDeparture on remaining segments
│            2. Update plan.estimatedArrival
│            3. Record RoutePlanUpdate
│            4. Emit SSE: route:updated
│
└─ No ETA impact?
    └─ Alert only
         1. Fire alerts via AlertTriggersService
         2. Record RoutePlanUpdate
```

### RoutePlanUpdate (Finally Wired Up)

Every trigger event creates a record:

```typescript
{
  updateId: "UPD-a1b2c3",
  planId: 42,
  updateType: "HOS_APPROACHING_LIMIT",  // or "DOCK_TIME_EXCEEDED", etc.
  triggeredAt: new Date(),
  triggeredBy: "monitoring_daemon",      // or "manual:user_123"
  triggerData: { remainingMinutes: 38, hoursType: "driving" },
  replanTriggered: false,
  replanReason: null,
  previousPlanVersion: null,
  newPlanVersion: null,
  impactSummary: { etaChangeMinutes: 0, alertsFired: 1 }
}
```

---

## Manual Event Injection (Controller Endpoints)

For dispatchers to report real-world events that monitoring can't detect from Samsara alone:

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
  recentUpdates: RoutePlanUpdate[];  // last 10
}
```

---

## Monitoring UX (Frontend)

### Page: `/dispatcher/monitoring`

Minimal. Three sections. No charts.

#### Section 1: Monitoring Pulse Strip

A single row showing the daemon's heartbeat + integration health:

```
┌─────────────────────────────────────────────────────────────────┐
│ ● Monitoring Active   12 routes   14 checks   Last: 12s ago   │
│ ● Samsara ELD: Connected                      Synced: 3m ago  │
└─────────────────────────────────────────────────────────────────┘
```

- Green pulsing dot when active
- Red dot + "Disconnected" if Samsara sync has failed
- Route count, check count, last scan timestamp
- Samsara connection status + last successful sync time

#### Section 2: Recent Triggers Feed

Live feed of monitoring output via SSE. New entries at top.

```
┌─────────────────────────────────────────────────────────────────┐
│ Recent Activity                                                  │
├─────────────────────────────────────────────────────────────────┤
│ 2:34 PM  HOS_APPROACHING_LIMIT  Driver #45   38m remaining  ⚠  │
│ 2:34 PM  DOCK_TIME_EXCEEDED     Driver #12   Walmart DC     ⚠  │
│ 2:33 PM  ROUTE_DELAY            Driver #78   ETA +42min     🔄 │
│ 2:33 PM  All checks passed      Driver #22                  ✓  │
│ 2:32 PM  All checks passed      Driver #45                  ✓  │
│ 2:32 PM  FUEL_LOW               Driver #33   18% remaining  ⚠  │
└─────────────────────────────────────────────────────────────────┘
```

- Color-coded by severity (red = critical, orange = high, yellow = medium)
- Shows whether alert was fired, re-plan triggered, or all clear
- Scrollable, last ~50 entries

#### Section 3: Route Health Cards

One card per active route:

```
┌────────────────────────────────────────┐
│ Driver #45 — LA → Phoenix              │
│ Segment 4/9 · Driving                  │
│ HOS: 6h 22m drive remaining            │
│ ETA: On Time                     ● 12s │
│ Alerts: 1                              │
└────────────────────────────────────────┘
```

- Driver + route summary
- Current segment type and progress
- HOS remaining (from Samsara)
- ETA status badge (On Time / At Risk / Late)
- Active alert count
- "Last checked" indicator

### SSE Events (New)

- `monitoring:cycle_complete` — Daemon completed a scan cycle (for pulse strip)
- `monitoring:trigger_fired` — A check triggered (for feed)
- `route:updated` — ETA or segment change
- `route:replanned` — Full re-plan occurred

Frontend `useSSE` hook listens for these and updates the monitoring page in real-time.

---

## Integration Points

| What | Service | Method |
|------|---------|--------|
| Fire alerts | `AlertTriggersService` | `.trigger(type, tenantId, driverId, params)` |
| Real-time HOS | `IntegrationManager` | `.getDriverHOS(tenantId, driverId)` → Samsara |
| Real-time GPS | `IntegrationManager` | `.getVehicleLocation(tenantId, vehicleId)` → Samsara |
| Re-plan routes | `RoutePlanningEngineService` | `.planRoute(input)` |
| Push events | `SseService` | `.emitToTenant(tenantId, event, data)` |
| Audit trail | `PrismaService` | `routePlanUpdate.create()` |
| Auto-resolve | `AutoResolutionService` | `.autoResolveByCondition()` |
| Segment updates | `PrismaService` | `routeSegment.update()` |

---

## What This Design Does NOT Include

- **Position simulation** — Samsara only, no fallback
- **Fleet health trends/analytics** — Deferred
- **Vehicle maintenance tracking** — Deferred (Phase 2)
- **Weather/road closure live data** — Placeholder checks, no external API yet
- **Driver mobile app** — Deferred
- **Map visualization** — Deferred (would be nice but not in scope)
