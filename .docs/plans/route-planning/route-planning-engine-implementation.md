# Route Planning Engine v2 -- Implementation Reference

> **Status:** Implemented | **Last Validated:** 2026-02-12 | **Source Plans:** `_archive/2026-02-06-route-planning-engine-v2-implementation.md`

---

## Summary

This document records the implementation details of the v2 route planning engine. All tasks described here have been completed and the code is in production on the `main` branch.

---

## Implementation Phases (Completed)

### Phase 1: Foundation (Schema + Providers)

**Schema migration** -- All new fields added to Prisma schema:
- Driver: `currentHoursDriven`, `currentOnDutyTime`, `currentHoursSinceBreak`, `cycleHoursUsed`, `cycleDaysData`, `lastRestartAt`, `homeTerminalTimezone`
- Vehicle: `hasSleeperBerth`, `grossWeightLbs`
- RoutePlan: `departureTime`, `estimatedArrival`, `completedAt`, `cancelledAt`, `totalTripTimeHours`, `totalDrivingDays`, `dispatcherParams`, `dailyBreakdown`, `loads` (RoutePlanLoad[])
- RouteSegment: `fromLat/Lon`, `toLat/Lon`, `timezone`, `actionType`, `appointmentWindow`, `fuelPricePerGallon`, `detourMiles`, `isDocktimeConverted`, `weatherAlerts`, `routeGeometry`, `actualArrival/Departure`, `fuelStateAfter`, `stopId`
- Stop: `zipCode`, `timezone`, `fuelPricePerGallon`, `fuelPriceUpdatedAt`, `fuelBrand`, `amenities`, `parkingSpaces`, `tenantId`
- New model: `RoutePlanLoad` (junction table for multi-load planning)

**Provider implementations:**

| Provider | File | Description |
|----------|------|-------------|
| `RoutingProvider` interface | `providers/routing/routing-provider.interface.ts` | Defines `getDistanceMatrix()`, `getRoute()` |
| `OSRMRoutingProvider` | `providers/routing/osrm-routing.provider.ts` | OSRM HTTP client implementation |
| `HERERoutingProvider` | `providers/routing/here-routing.provider.ts` | HERE Maps API implementation |
| `WeatherProvider` interface | `providers/weather/weather-provider.interface.ts` | Defines `getWeatherAlongRoute()` |
| `OpenWeatherMapProvider` | `providers/weather/openweathermap.provider.ts` | OpenWeatherMap free tier integration |
| `FuelDataProvider` interface | `providers/fuel/fuel-data-provider.interface.ts` | Defines `findFuelStopsAlongCorridor()` |
| `DatabaseFuelProvider` | `providers/fuel/database-fuel.provider.ts` | Reads from seeded Stops table |

Each provider has its own NestJS module with injection token:
- `ROUTING_PROVIDER` (routing-provider.module.ts)
- `WEATHER_PROVIDER` (weather-provider.module.ts)
- `FUEL_DATA_PROVIDER` (fuel-provider.module.ts)

**Truck stop seed data** -- Representative dataset of 200-500 truck stops along major interstate corridors seeded into the `stops` table. Data includes major chain locations (Pilot/Flying J, Love's, TA/Petro) with fuel prices, amenities, and parking data.

### Phase 2: HOS Engine Enhancement

**File:** `apps/backend/src/domains/routing/hos-compliance/services/hos-rule-engine.service.ts`

The HOS rule engine provides these methods (used by the route planning engine):

| Method | Purpose |
|--------|---------|
| `hoursUntilRestRequired(hosState)` | Returns minimum hours until any HOS limit is hit |
| `validateCompliance(hosState)` | Returns full compliance report (needsRestart, hoursAvailableToDrive, hoursUntilBreakRequired) |
| `simulateAfterDriving(hosState, driveHours, onDutyHours)` | Updates HOS state after a drive/on-duty segment |
| `simulateAfterFullRest(hosState)` | Resets daily clocks after 10h rest |
| `simulateAfterSplitRest(hosState, splitType, portion)` | Handles sleeper berth split rest (7/3 or 8/2) |
| `simulateAfter34hRestart(hosState)` | Resets all clocks including 70h cycle |

**HOSState interface:**
```typescript
interface HOSState {
  hoursDriven: number;        // Resets after 10h rest (max 11)
  onDutyTime: number;         // Resets after 10h rest (max 14)
  hoursSinceBreak: number;    // Resets after 30min break (max 8)
  cycleHoursUsed: number;     // Rolling 8-day total (max 70)
  cycleDaysData: Array<{ date: string; hoursWorked: number }>;
  splitRestState?: {
    firstPortionCompleted: boolean;
    firstPortionType: 'sleeper_7' | 'sleeper_8';
  };
}
```

### Phase 3: Core Route Engine

**File:** `apps/backend/src/domains/routing/route-planning/services/route-planning-engine.service.ts` (1296 lines)

The engine orchestrates the entire planning flow:

1. `resolveDriver()` -- Finds driver by string ID + tenant
2. `resolveVehicle()` -- Finds vehicle by string ID + tenant
3. `resolveLoadStops()` -- Loads all stops for given load IDs, builds `ResolvedStop[]` with appointment windows
4. `optimizeStopSequence()` -- Nearest-neighbor TSP with pickup-before-delivery constraints
5. `simulateRoute()` -- Segment-by-segment simulation (core loop)
6. `decideRest()` / `lookAheadRestDecision()` -- Rest strategy selection
7. `applyRestDecision()` -- Inserts rest/break/restart segments
8. `insertFuelStop()` -- Finds cheapest fuel along corridor
9. `checkWeatherForLeg()` -- Weather alerts via provider
10. `persistPlan()` -- Writes RoutePlan + RouteSegments + RoutePlanLoad records
11. `buildResponse()` -- Constructs API response with compliance report

**Segment types produced:** `drive`, `rest`, `fuel`, `dock`, `break`

**Rest types produced:** `full_rest`, `split_8_2_first`, `split_8_2_second`, `split_7_3_first`, `split_7_3_second`, `restart_34h`, `mandatory_break`

### Phase 4: API + Persistence

**Controller:** `apps/backend/src/domains/routing/route-planning/controllers/route-planning.controller.ts`

Extends `BaseTenantController` for multi-tenant access control. Uses `@CurrentUser()` decorator for authentication.

**Persistence service:** `apps/backend/src/domains/routing/route-planning/services/route-plan-persistence.service.ts`

Methods: `createPlan()`, `getPlanById()`, `getActivePlanForDriver()`, `listPlans()`, `activatePlan()`, `cancelPlan()`

**DTO validation:** `apps/backend/src/domains/routing/route-planning/dto/create-route-plan.dto.ts` -- Zod schema for request validation

### Phase 5: Testing

**Test file:** `apps/backend/src/domains/routing/__tests__/route-planning-engine.spec.ts`

Test coverage includes:
- Single-day route (no rest needed)
- Multi-day route (rest insertion)
- Dock-to-rest conversion scenarios
- Fuel stop insertion
- Appointment window constraints
- Weather advisory handling
- 70h cycle limit + 34h restart
- Sleeper berth split scenarios

---

## Key Implementation Details

### Plan ID Format

Generated as: `RP-{YYYYMMDD}-{6-char-random}`
Example: `RP-20260211-A3B4C5`

### Compliance Report Structure

Built from simulation results:
```typescript
interface ComplianceReport {
  isFullyCompliant: boolean;
  totalRestStops: number;
  totalBreaks: number;
  total34hRestarts: number;
  totalSplitRests: number;
  dockTimeConversions: number;
  rules: Array<{ rule: string; status: 'pass' | 'addressed' }>;
}
```

Rules checked:
1. 11-hour driving limit
2. 14-hour duty window
3. 30-minute break requirement
4. 10-hour off-duty rest
5. 70-hour/8-day cycle

### Daily Breakdown Structure

```typescript
interface DayBreakdown {
  day: number;
  date: string;
  driveHours: number;
  onDutyHours: number;
  segments: number;
  restStops: number;
}
```

---

## Dependencies

| Service | Injected As | Used For |
|---------|-------------|----------|
| `PrismaService` | Direct | Database queries |
| `RoutingProvider` | `@Inject(ROUTING_PROVIDER)` | Distance matrix + route geometry |
| `WeatherProvider` | `@Inject(WEATHER_PROVIDER)` | Weather alerts along route |
| `FuelDataProvider` | `@Inject(FUEL_DATA_PROVIDER)` | Fuel stop corridor search |
| `HOSRuleEngineService` | Direct | HOS calculations and simulation |
| `RoutePlanPersistenceService` | Direct | Plan CRUD operations |
| `ConfigService` | Direct | `minRestHours` configuration |
