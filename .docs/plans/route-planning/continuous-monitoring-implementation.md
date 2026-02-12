# Continuous Monitoring Service -- Implementation Reference

> **Status:** Partially implemented | **Last Validated:** 2026-02-12 | **Source Plans:** `_archive/2026-02-09-continuous-monitoring-implementation.md`

**Note:** The monitoring module structure and some core services exist in `apps/backend/src/domains/operations/monitoring/`. The implementation plan below reflects the target tasks. Services were created but have not been independently re-validated line-by-line in this consolidation.

---

## Summary

The implementation plan covers 7 major tasks to build the continuous monitoring daemon (Layer 2) and dynamic update handler (Layer 3). This creates a background service that monitors active routes every 60 seconds using real-time Samsara ELD data.

---

## Implementation Tasks

### Task 1: Samsara Adapter -- HOS and GPS Methods

**Objective:** Add `getHOSClocks()` and `getVehicleLocations()` to the existing Samsara ELD adapter.

**Files:**
- Modify: `apps/backend/src/domains/integrations/adapters/eld/samsara.adapter.ts`
- Modify: `apps/backend/src/domains/integrations/adapters/eld/eld-adapter.interface.ts`

**Changes:**
- Add `getHOSClocks(apiToken)` -- calls Samsara `GET /fleet/hos/clocks`
- Add `getVehicleLocations(apiToken)` -- calls Samsara `GET /fleet/vehicles/stats?types=gps`
- Return normalized `HOSClockData[]` and `VehicleLocationData[]` shapes

### Task 2: IntegrationManager Wiring

**Objective:** Wire `getDriverHOS()` and `getVehicleLocation()` through IntegrationManager to call real Samsara endpoints (instead of current mock data).

**Files:**
- Modify: `apps/backend/src/domains/integrations/services/integration-manager.service.ts`

**Changes:**
- `getDriverHOS(tenantId, driverExternalId)` -- looks up tenant's ELD integration, calls adapter's `getHOSClocks()`, finds matching driver, returns `HOSClockData`
- `getVehicleLocation(tenantId, vehicleExternalId)` -- same pattern, calls `getVehicleLocations()`, returns GPS data

### Task 3: MonitoringChecksService (14 Checks)

**Objective:** Implement all 14 monitoring check functions.

**File:** `apps/backend/src/domains/operations/monitoring/services/monitoring-checks.service.ts`

**Each check returns:**
```typescript
interface MonitoringTrigger {
  type: string;           // e.g., 'HOS_APPROACHING_LIMIT'
  severity: 'critical' | 'high' | 'medium' | 'low';
  requiresReplan: boolean;
  etaImpactMinutes: number;
  params: Record<string, any>;
}
```

**Check implementations:**
1. `checkDriveLimitApproaching()` -- driveTimeRemainingMs < threshold
2. `checkDutyLimitApproaching()` -- shiftTimeRemainingMs < threshold
3. `checkBreakRequired()` -- timeUntilBreakMs <= 0
4. `checkCycleApproaching()` -- cycleTimeRemainingMs < threshold
5. `checkHOSViolation()` -- any remaining value negative
6. `checkAppointmentAtRisk()` -- ETA vs appointment window
7. `checkMissedAppointment()` -- current time past window end
8. `checkDockTimeExceeded()` -- actual duration vs planned + threshold
9. `checkRouteDelay()` -- ETA slip vs planned arrival
10. `checkDriverNotMoving()` -- speed = 0 for extended period
11. `checkFuelLow()` -- fuel level below threshold percentage
12. `checkWeatherAlert()` -- placeholder
13. `checkRoadClosure()` -- placeholder
14. Auto-resolve conditions (checked in bulk)

### Task 4: RouteProgressTrackerService

**Objective:** Manage segment status transitions based on GPS data.

**File:** `apps/backend/src/domains/operations/monitoring/services/route-progress-tracker.service.ts`

**Core method:** `updateSegmentStatuses(segments, gpsData)`
- Matches driver GPS position to planned segment coordinates
- Uses haversine distance (< 1 mile threshold) for proximity detection
- Transitions segments: `planned` -> `in_progress` -> `completed`
- Auto-completes drive/rest/fuel segments on GPS proximity
- Dock segments: GPS transitions to `in_progress` only (completion requires driver confirmation per hybrid GPS model -- see post-route-lifecycle design)

### Task 5: RouteUpdateHandlerService (Layer 3)

**Objective:** Decide between alert-only, ETA update, and full re-plan.

**File:** `apps/backend/src/domains/operations/monitoring/services/route-update-handler.service.ts`

**Note:** The post-route-lifecycle plan proposes replacing this with `RouteEventService`. As of 2026-02-12, `RouteUpdateHandlerService` is still referenced in the monitoring module. See `post-route-lifecycle.md` for the planned replacement.

**Decision logic:**
- `requiresReplan && etaImpactMinutes > 30` -> Full re-plan via `RoutePlanningEngineService.planRoute()`
- `etaImpactMinutes > 0 && < 30` -> ETA shift (update remaining segment times)
- No ETA impact -> Alert only

### Task 6: MonitoringModule + Controller

**Objective:** Wire all services together and expose HTTP endpoints.

**Files:**
- `apps/backend/src/domains/operations/monitoring/monitoring.module.ts`
- `apps/backend/src/domains/operations/monitoring/monitoring.controller.ts`

**Endpoints:**
- `GET /routes/:planId/monitoring` -- Live monitoring status
- `GET /routes/:planId/updates` -- Audit trail of RoutePlanUpdate records
- `POST /routes/:planId/events/dock-time` -- Manual dock time report
- `POST /routes/:planId/events/delay` -- Manual delay report
- `POST /routes/:planId/events/driver-status` -- Manual driver status change

### Task 7: Frontend Monitoring Page

**Objective:** Build the `/dispatcher/monitoring` page.

**Status:** Designed, not yet built.

**Components planned:**
- MonitoringPulseStrip -- daemon heartbeat, route count, Samsara health
- RecentTriggersFeed -- SSE-driven live feed of monitoring events
- RouteHealthCards -- one card per active route

---

## Dependencies

| Service | Used For |
|---------|----------|
| `IntegrationManagerService` | Samsara HOS + GPS data |
| `AlertTriggersService` | Creating dispatcher alerts |
| `SseService` | Real-time UI updates |
| `RoutePlanningEngineService` | Re-planning when triggers require it |
| `PrismaService` | Database queries + audit trail |

---

## Testing Strategy

Each service has its own spec file:
- `monitoring-checks.service.spec.ts` -- unit tests for each check function
- `route-progress-tracker.service.spec.ts` -- GPS proximity and segment transitions
- `route-update-handler.service.spec.ts` (or `route-event.service.spec.ts` post-migration) -- trigger handling decisions
- `route-monitoring.service.spec.ts` -- integration test of the full cron cycle
