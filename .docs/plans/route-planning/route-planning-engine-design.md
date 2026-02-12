# Route Planning Engine v2 -- Design Specification

> **Status:** Implemented | **Last Validated:** 2026-02-12 | **Source Plans:** `_archive/2026-02-06-route-planning-engine-v2-design.md`

---

## Summary

The route planning engine is SALLY's core Layer 1 component. It takes a driver, vehicle, and one or more loads from the database and generates an optimized, HOS-compliant, multi-day truck route with intelligent rest stop insertion, fuel optimization, weather awareness, and dock-to-rest conversion.

All features described in this document are **implemented and validated against the codebase**.

---

## Architecture

```
+------------------------------------------------------------------+
|                    NestJS Backend (Single Service)                 |
|                                                                    |
|  +--------------------------------------------------------------+ |
|  |              Route Planning API Layer                          | |
|  |  POST /routes/plan                                             | |
|  |  GET  /routes                                                  | |
|  |  GET  /routes/:planId                                          | |
|  |  POST /routes/:planId/activate                                 | |
|  |  POST /routes/:planId/cancel                                   | |
|  |  GET  /routes/driver/:driverId/active                          | |
|  +----------------------------+----------------------------------+ |
|                               |                                    |
|  +----------------------------v----------------------------------+ |
|  |           Route Planning Engine (Orchestrator)                 | |
|  |                                                                | |
|  |  1. Resolve inputs (Driver HOS, Vehicle, Load stops)          | |
|  |  2. Get road distances via RoutingProvider                     | |
|  |  3. Optimize stop sequence (TSP with time windows)            | |
|  |  4. Simulate segment-by-segment                                | |
|  |  5. Validate compliance                                        | |
|  |  6. Persist to PostgreSQL                                      | |
|  |  7. Build response                                             | |
|  +--------+----------+----------+----------+--------------------+ |
|           |          |          |          |                       |
|  +--------v---+ +----v-----+ +-v------+ +-v---------+            |
|  | Routing    | | HOS      | | Fuel   | | Weather   |            |
|  | Provider   | | Engine   | | Finder | | Service   |            |
|  | (OSRM/HERE)| |          | |        | | (OpenWx)  |            |
|  +------------+ +----------+ +--------+ +-----------+            |
|                                                                    |
|  +--------------------------------------------------------------+ |
|  |                    PostgreSQL                                  | |
|  |  RoutePlan -> RouteSegments -> Stops (seeded truck stops)      | |
|  |  Driver (HOS state) -> Vehicle -> Load -> LoadStop             | |
|  +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

### Provider Pattern

All external services use a provider interface. The engine calls the interface; the implementation can be swapped without changing engine logic. This is **implemented** with NestJS injection tokens.

**Implemented providers:**

| Provider | Interface | Implementation | Injection Token |
|----------|-----------|----------------|-----------------|
| Routing | `RoutingProvider` | `OSRMRoutingProvider`, `HERERoutingProvider` | `ROUTING_PROVIDER` |
| Weather | `WeatherProvider` | `OpenWeatherMapProvider` | `WEATHER_PROVIDER` |
| Fuel Data | `FuelDataProvider` | `DatabaseFuelProvider` | `FUEL_DATA_PROVIDER` |

**Code location:** `apps/backend/src/domains/routing/providers/`

```
providers/
├── routing/
│   ├── routing-provider.interface.ts
│   ├── osrm-routing.provider.ts
│   ├── here-routing.provider.ts
│   └── routing-provider.module.ts
├── weather/
│   ├── weather-provider.interface.ts
│   ├── openweathermap.provider.ts
│   └── weather-provider.module.ts
└── fuel/
    ├── fuel-data-provider.interface.ts
    ├── database-fuel.provider.ts
    └── fuel-provider.module.ts
```

---

## Engine Flow (7 Steps)

All 7 steps are implemented in `RoutePlanningEngineService.planRoute()`.

### Step 1: Resolve Inputs

The engine accepts string IDs from the API and resolves all entities from the database:

```typescript
// Input (from API request)
interface RoutePlanRequest {
  driverId: string;       // Driver.driverId (string identifier)
  vehicleId: string;      // Vehicle.vehicleId (string identifier)
  loadIds: string[];      // Load.loadId[] (string identifiers)
  departureTime: Date;
  tenantId: number;
  optimizationPriority?: 'minimize_time' | 'minimize_cost' | 'balance';
  dispatcherParams?: {
    dockRestStops?: Array<{
      stopId: string;
      truckParkedHours: number;
      convertToRest: boolean;
    }>;
    preferredRestType?: 'auto' | 'full' | 'split_8_2' | 'split_7_3';
    avoidTollRoads?: boolean;
    maxDetourMilesForFuel?: number;
  };
}
```

**Resolved from DB:**
- **Driver**: HOS state (hoursDriven, onDutyTime, hoursSinceBreak, cycleHoursUsed, cycleDaysData), homeTerminalTimezone
- **Vehicle**: fuelCapacityGallons, currentFuelGallons, mpg, hasSleeperBerth, grossWeightLbs
- **Loads + Stops**: All stops with lat/lon, time windows, sequence order, estimated dock hours, action type (pickup/delivery), customer name

### Step 2: Get Road Distances

Calls `RoutingProvider.getDistanceMatrix()` for all stop pairs. Returns NxN matrix:

```typescript
Map<string, { distanceMiles: number; driveTimeHours: number }>
// Key format: "stopA:stopB"
```

Falls back to haversine distance (with 1.3x road factor) if matrix entry is missing.

### Step 3: TSP Optimization

Implemented as nearest-neighbor heuristic with pickup-before-delivery constraints:
- Origin stop is fixed first
- For each remaining stop, select the nearest unvisited stop
- Deliveries are skipped until their corresponding pickup is visited
- For routes with 3 or fewer stops, only pickup-before-delivery ordering is applied

### Step 4: Segment-by-Segment Simulation

The heart of the engine. For each consecutive pair of stops:

1. **Check weather** along the leg corridor via `WeatherProvider`
2. **Adjust drive time** with weather multiplier (1.0 = clear, up to 1.5 = severe)
3. **Check fuel** -- if remaining fuel minus leg fuel need falls below reserve (50 gallons), insert a fuel stop
4. **Check HOS** -- if available hours are less than adjusted drive time, decide on rest type
5. **Check 30-minute break** -- if hoursSinceBreak >= 7.5 and drive time > 0.5h, insert break
6. **Build drive segment** with route geometry from routing provider
7. **Handle dock activity** at destination (pickup/delivery) with dock-to-rest conversion

**Simulation state tracked:**
```typescript
interface SimulationState {
  currentTime: Date;
  hosState: HOSState;
  fuelRemainingGallons: number;
  currentLat: number;
  currentLon: number;
  currentLocation: string;
  segments: SegmentResult[];
  segmentCounter: number;
  dayCounter: number;
  dailyBreakdown: DayBreakdown[];
  weatherAlerts: WeatherAlert[];
  feasibilityIssues: string[];
  totalDistanceMiles: number;
  totalDriveTimeHours: number;
  totalCostEstimate: number;
}
```

### Step 5: Rest Decision Logic

The engine implements a look-ahead algorithm to determine the best rest strategy:

```
RestDecision = none | break_30min | full_rest | split_first | split_second | restart_34h
```

**Decision tree:**
1. If cycle hours exhausted (70h/8day) -> 34h restart
2. If only break needed (8h trigger) -> 30-min break
3. If preferred rest is "full" or no sleeper berth -> full rest (10h)
4. If preferred is "split_8_2" -> 8h first portion, 2h second portion
5. If preferred is "split_7_3" -> 7h first portion, 3h second portion
6. If "auto" mode -> look-ahead analysis:
   - If already in a split, complete it
   - If remaining journey <= 16h driving or no sleeper berth -> full rest
   - Otherwise -> split 8/2 for flexibility

### Step 6: Persist to PostgreSQL

Creates `RoutePlan` with all summary fields, `RouteSegment` records for each segment, and `RoutePlanLoad` junction records.

### Step 7: Build Response

```typescript
interface RoutePlanResult {
  planId: string;
  status: string;
  isFeasible: boolean;
  feasibilityIssues: string[];
  totalDistanceMiles: number;
  totalDriveTimeHours: number;
  totalTripTimeHours: number;
  totalDrivingDays: number;
  totalCostEstimate: number;
  departureTime: Date;
  estimatedArrival: Date;
  segments: SegmentResult[];
  complianceReport: ComplianceReport;
  weatherAlerts: WeatherAlert[];
  dailyBreakdown: DayBreakdown[];
}
```

---

## API Contract

### POST /routes/plan

**Validated against:** `route-planning.controller.ts` line 43

**Request body:** Validated with Zod (`CreateRoutePlanSchema`)
```json
{
  "driverId": "drv_abc123",
  "vehicleId": "veh_xyz789",
  "loadIds": ["load_001", "load_002"],
  "departureTime": "2026-02-07T06:00:00-06:00",
  "optimizationPriority": "minimize_time",
  "dispatcherParams": {
    "dockRestStops": [{ "stopId": "stop_456", "truckParkedHours": 4.0, "convertToRest": true }],
    "preferredRestType": "auto",
    "avoidTollRoads": false,
    "maxDetourMilesForFuel": 15
  }
}
```

### GET /routes

**Validated against:** `route-planning.controller.ts` line 83

Query params: `status`, `limit` (max 200), `offset`

### GET /routes/:planId

**Validated against:** `route-planning.controller.ts` line 140

Returns full plan with tenant access validation.

### POST /routes/:planId/activate

**Validated against:** `route-planning.controller.ts` line 154

Activates a draft plan. Sets `isActive=true`, `status='active'`.

### POST /routes/:planId/cancel

**Validated against:** `route-planning.controller.ts` line 173

Cancels a plan. Sets `cancelledAt` timestamp.

### GET /routes/driver/:driverId/active

**Validated against:** `route-planning.controller.ts` line 112

Returns the driver's currently active route plan.

---

## Data Model (from actual Prisma schema)

### RoutePlan

```prisma
model RoutePlan {
  id                    Int              @id @default(autoincrement())
  planId                String           @unique @map("plan_id") @db.VarChar(50)
  driverId              Int              @map("driver_id")
  vehicleId             Int              @map("vehicle_id")
  planVersion           Int              @default(1) @map("plan_version")
  isActive              Boolean          @default(false) @map("is_active")
  status                String           @default("draft") @db.VarChar(50)
  optimizationPriority  String           @default("minimize_time") @map("optimization_priority") @db.VarChar(50)
  totalDistanceMiles    Float            @default(0.0) @map("total_distance_miles")
  totalDriveTimeHours   Float            @default(0.0) @map("total_drive_time_hours")
  totalOnDutyTimeHours  Float            @default(0.0) @map("total_on_duty_time_hours")
  totalCostEstimate     Float            @default(0.0) @map("total_cost_estimate")
  isFeasible            Boolean          @default(true) @map("is_feasible")
  feasibilityIssues     Json?            @map("feasibility_issues")
  complianceReport      Json?            @map("compliance_report")
  activatedAt           DateTime?        @map("activated_at") @db.Timestamptz
  departureTime         DateTime?        @map("departure_time") @db.Timestamptz
  estimatedArrival      DateTime?        @map("estimated_arrival") @db.Timestamptz
  completedAt           DateTime?        @map("completed_at") @db.Timestamptz
  cancelledAt           DateTime?        @map("cancelled_at") @db.Timestamptz
  totalTripTimeHours    Float            @default(0) @map("total_trip_time_hours")
  totalDrivingDays      Int              @default(1) @map("total_driving_days")
  dispatcherParams      Json?            @map("dispatcher_params")
  dailyBreakdown        Json?            @map("daily_breakdown")

  tenant                Tenant           @relation(...)
  tenantId              Int              @map("tenant_id")
  driver                Driver           @relation(...)
  vehicle               Vehicle          @relation(...)
  segments              RouteSegment[]
  updates               RoutePlanUpdate[]
  loads                 RoutePlanLoad[]

  @@index([driverId])
  @@index([isActive])
  @@index([tenantId])
  @@map("route_plans")
}
```

### RouteSegment

```prisma
model RouteSegment {
  id                    Int          @id @default(autoincrement())
  segmentId             String       @unique @map("segment_id") @db.VarChar(50)
  planId                Int          @map("plan_id")
  sequenceOrder         Int          @map("sequence_order")
  fromLocation          String?      @map("from_location") @db.VarChar(200)
  toLocation            String?      @map("to_location") @db.VarChar(200)
  segmentType           String       @map("segment_type") @db.VarChar(20)
  distanceMiles         Float?       @map("distance_miles")
  driveTimeHours        Float?       @map("drive_time_hours")
  restType              String?      @map("rest_type") @db.VarChar(30)
  restDurationHours     Float?       @map("rest_duration_hours")
  restReason            String?      @map("rest_reason") @db.Text
  fuelGallons           Float?       @map("fuel_gallons")
  fuelCostEstimate      Float?       @map("fuel_cost_estimate")
  fuelStationName       String?      @map("fuel_station_name") @db.VarChar(200)
  dockDurationHours     Float?       @map("dock_duration_hours")
  customerName          String?      @map("customer_name") @db.VarChar(200)
  hosStateAfter         Json?        @map("hos_state_after")
  estimatedArrival      DateTime?    @map("estimated_arrival") @db.Timestamptz
  estimatedDeparture    DateTime?    @map("estimated_departure") @db.Timestamptz
  fromLat               Float?       @map("from_lat")
  fromLon               Float?       @map("from_lon")
  toLat                 Float?       @map("to_lat")
  toLon                 Float?       @map("to_lon")
  timezone              String?      @db.VarChar(50)
  actionType            String?      @map("action_type") @db.VarChar(20)
  appointmentWindow     Json?        @map("appointment_window")
  fuelPricePerGallon    Float?       @map("fuel_price_per_gallon")
  detourMiles           Float?       @map("detour_miles")
  isDocktimeConverted   Boolean      @default(false) @map("is_docktime_converted")
  weatherAlerts         Json?        @map("weather_alerts")
  routeGeometry         String?      @map("route_geometry") @db.Text
  actualArrival         DateTime?    @map("actual_arrival") @db.Timestamptz
  actualDeparture       DateTime?    @map("actual_departure") @db.Timestamptz
  fuelStateAfter        Json?        @map("fuel_state_after")
  stopId                Int?         @map("stop_id")
  stop                  Stop?        @relation(...)
  status                String       @default("planned") @db.VarChar(20)

  plan                  RoutePlan    @relation(...)

  @@index([planId, sequenceOrder])
  @@map("route_segments")
}
```

### Driver (HOS-relevant fields)

```prisma
model Driver {
  // ... identity and tenant fields ...

  // Structured HOS fields (engine reads directly)
  currentHoursDriven      Float     @default(0) @map("current_hours_driven")
  currentOnDutyTime       Float     @default(0) @map("current_on_duty_time")
  currentHoursSinceBreak  Float     @default(0) @map("current_hours_since_break")
  cycleHoursUsed          Float     @default(0) @map("cycle_hours_used")
  cycleDaysData           Json?     @map("cycle_days_data")
  lastRestartAt           DateTime? @map("last_restart_at") @db.Timestamptz
  homeTerminalTimezone    String    @default("America/New_York") @map("home_terminal_timezone") @db.VarChar(50)
}
```

### Vehicle (Engine-relevant fields)

```prisma
model Vehicle {
  // ... identity and tenant fields ...

  fuelCapacityGallons   Float?       @map("fuel_capacity_gallons")
  currentFuelGallons    Float?       @map("current_fuel_gallons")
  mpg                   Float?
  hasSleeperBerth       Boolean      @default(true) @map("has_sleeper_berth")
  grossWeightLbs        Float?       @map("gross_weight_lbs")
}
```

### RoutePlanLoad (Junction)

```prisma
model RoutePlanLoad {
  id          Int       @id @default(autoincrement())
  planId      Int       @map("plan_id")
  loadId      Int       @map("load_id")
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz

  plan        RoutePlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  load        Load      @relation(fields: [loadId], references: [id])

  @@unique([planId, loadId])
  @@map("route_plan_loads")
}
```

### Stop (Truck stop fields)

```prisma
model Stop {
  // ... identity fields ...

  zipCode               String?    @map("zip_code") @db.VarChar(10)
  timezone              String?    @db.VarChar(50)
  fuelPricePerGallon    Float?     @map("fuel_price_per_gallon")
  fuelPriceUpdatedAt    DateTime?  @map("fuel_price_updated_at") @db.Timestamptz
  fuelBrand             String?    @map("fuel_brand") @db.VarChar(50)
  amenities             Json?
  parkingSpaces         Int?       @map("parking_spaces")
  tenantId              Int?       @map("tenant_id")

  routeSegments         RouteSegment[]

  @@map("stops")
}
```

---

## HOS Rules Reference (FMCSA)

### Daily Limits

| Rule | Limit | Resets After |
|------|-------|-------------|
| Drive time | 11 hours max | 10 consecutive hours off-duty/sleeper |
| Duty window | 14 hours max | 10 consecutive hours off-duty/sleeper |
| Break requirement | 30 min after 8h on-duty | 30min off-duty/sleeper break |

### Weekly Limit

| Rule | Limit | Resets After |
|------|-------|-------------|
| Cycle limit (Property) | 70 hours in 8 consecutive days | 34 consecutive hours off-duty |

### Sleeper Berth Split Rules

| Split Type | Long Portion | Short Portion | Notes |
|-----------|-------------|---------------|-------|
| 8/2 split | 8h in sleeper berth | 2h off-duty or sleeper | Neither alone resets 14h window |
| 7/3 split | 7h in sleeper berth | 3h off-duty or sleeper | Neither alone resets 14h window |

### Dock Time and HOS Interaction

- Dock time where driver is waiting = on-duty (NOT driving) time
- Dock time where driver goes off-duty = off-duty time (does not count toward 14h)
- If dispatcher marks "truck parked" and `convertToRest: true`, dock time can count as rest
- Full HOS reset requires dock time >= `minRestHours` (configurable, defaults from env)

---

## Engine Constants (from code)

```typescript
const DEFAULT_FUEL_TANK_GALLONS = 300;  // typical class 8 truck dual tanks
const DEFAULT_MPG = 6.5;
const FUEL_RESERVE_GALLONS = 50;        // don't run below this
const DEFAULT_FUEL_COST_PER_GALLON = 3.8;
const FUELING_TIME_HOURS = 0.5;         // 30 min to fuel
const BREAK_DURATION_HOURS = 0.5;       // 30-min mandatory break
const DOCK_DEFAULT_HOURS = 2;           // default dock time if not specified
const MAX_SIMULATION_SEGMENTS = 200;    // safety limit
```

---

## OSRM Setup (Docker)

Add to `docker-compose.yml`:

```yaml
osrm:
  image: osrm/osrm-backend:latest
  container_name: sally-osrm
  ports:
    - "5000:5000"
  volumes:
    - osrm-data:/data
  command: osrm-routed --algorithm mld /data/us-latest.osrm
  restart: unless-stopped
```

OSRM API usage:
```
GET http://localhost:5000/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=polyline
GET http://localhost:5000/table/v1/driving/{lon1},{lat1};{lon2},{lat2};...?annotations=distance,duration
```

---

## File Structure (Validated)

```
apps/backend/src/domains/routing/
├── __tests__/
│   └── route-planning-engine.spec.ts
├── hos-compliance/
│   ├── hos-compliance.module.ts
│   └── services/
│       └── hos-rule-engine.service.ts
├── providers/
│   ├── fuel/
│   │   ├── database-fuel.provider.ts
│   │   ├── fuel-data-provider.interface.ts
│   │   └── fuel-provider.module.ts
│   ├── routing/
│   │   ├── here-routing.provider.ts
│   │   ├── osrm-routing.provider.ts
│   │   ├── routing-provider.interface.ts
│   │   └── routing-provider.module.ts
│   └── weather/
│       ├── openweathermap.provider.ts
│       ├── weather-provider.interface.ts
│       └── weather-provider.module.ts
├── route-planning/
│   ├── controllers/
│   │   └── route-planning.controller.ts
│   ├── dto/
│   │   ├── create-route-plan.dto.ts
│   │   └── index.ts
│   ├── route-planning.module.ts
│   └── services/
│       ├── route-plan-persistence.service.ts
│       └── route-planning-engine.service.ts
└── routing.module.ts
```
