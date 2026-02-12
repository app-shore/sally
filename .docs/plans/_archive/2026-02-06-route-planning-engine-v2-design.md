# Route Planning Engine v2 - Complete Design Document

**Created:** February 6, 2026
**Status:** Design Complete - Ready for Implementation
**Scope:** Backend APIs only (UX deferred to separate phase)

---

## Executive Summary

Rebuild the route planning engine from scratch with production-grade architecture. The engine takes a driver, vehicle, and load(s) from the database and generates an optimized, HOS-compliant, multi-day truck route with intelligent rest stop insertion, fuel optimization, weather awareness, and dock-to-rest conversion.

**Key decisions made during brainstorming:**
- Keep engine in **NestJS** (single backend, no Python microservice)
- Use **OSRM** (free, self-hosted) + **HERE API** (paid, truck-specific) via provider pattern
- Use **OpenWeatherMap** (free tier) for weather along route corridor
- **Mock fuel data** with real structure (swap to GasBuddy/OPIS later)
- **Seed real US truck stop data** (~7,000 locations) into Stops table
- **Persist to PostgreSQL** from day one (no in-memory cache)
- **Dispatcher sends IDs** (driverId, vehicleId, loadIds) - engine resolves from DB
- Include **70-hour/8-day rule**, **sleeper berth splits**, **time zones**, **appointment windows**, **multi-day planning**
- **Remove existing route planning backend APIs** and start fresh

---

## Architecture Overview

```
+------------------------------------------------------------------+
|                    NestJS Backend (Single Service)                 |
|                                                                    |
|  +--------------------------------------------------------------+ |
|  |              Route Planning API Layer                          | |
|  |  POST /api/v1/routes/plan                                     | |
|  |  GET  /api/v1/routes/:planId                                  | |
|  |  POST /api/v1/routes/:planId/activate                         | |
|  |  POST /api/v1/routes/:planId/update                           | |
|  |  GET  /api/v1/routes/driver/:driverId/active                  | |
|  |  GET  /api/v1/routes?status=active                            | |
|  +----------------------------+----------------------------------+ |
|                               |                                    |
|  +----------------------------v----------------------------------+ |
|  |           Route Planning Engine (Orchestrator)                 | |
|  |                                                                | |
|  |  1. Resolve inputs (Driver HOS, Vehicle, Load stops)          | |
|  |  2. Get road distances via RoutingProvider                     | |
|  |  3. Optimize stop sequence (TSP with time windows)            | |
|  |  4. Simulate segment-by-segment:                               | |
|  |     - HOS tracking (daily + 70h/8day cycle)                   | |
|  |     - Rest insertion (full 10h, 8/2, 7/3, 30min break)        | |
|  |     - Dock-to-rest conversion (look-ahead analysis)            | |
|  |     - Fuel insertion (based on tank + price data)              | |
|  |     - Weather check along corridor                              | |
|  |  5. Validate compliance                                        | |
|  |  6. Persist to PostgreSQL                                      | |
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
         |              |
    +----v-----+  +-----v-------+
    |  OSRM    |  |  HERE API   |
    | (Docker) |  | (Optional)  |
    +----------+  +-------------+
```

### Provider Pattern

All external services use a provider interface. The engine calls the interface; the implementation can be swapped without changing engine logic.

```typescript
// Routing Provider
interface RoutingProvider {
  getDistanceMatrix(stops: LatLon[]): Promise<DistanceMatrix>;
  getRoute(origin: LatLon, destination: LatLon, waypoints?: LatLon[]): Promise<RouteResult>;
}

// Implementations:
class OSRMRoutingProvider implements RoutingProvider { ... }
class HERERoutingProvider implements RoutingProvider { ... }

// Weather Provider
interface WeatherProvider {
  getWeatherAlongRoute(waypoints: LatLon[], departureTime: Date): Promise<WeatherAlert[]>;
}

// Implementations:
class OpenWeatherMapProvider implements WeatherProvider { ... }
class MockWeatherProvider implements WeatherProvider { ... }

// Fuel Data Provider
interface FuelDataProvider {
  findFuelStopsAlongRoute(routeCorridor: LatLon[], maxDetourMiles: number): Promise<FuelStop[]>;
}

// Implementations:
class DatabaseFuelProvider implements FuelDataProvider { ... }  // Reads from seeded Stops table
class GasBuddyFuelProvider implements FuelDataProvider { ... }  // Future
```

---

## Engine Flow (Detailed)

### Step 1: Resolve Inputs

```
INPUT from API:
  - driverId: string
  - vehicleId: string
  - loadIds: string[]
  - departureTime: ISO 8601 with timezone
  - optimizationPriority: "minimize_time" | "minimize_cost" | "balance"
  - dispatcherParams: {
      dockRestStops: [{ stopId, truckParkedHours, convertToRest }]
      preferredRestType: "auto" | "full" | "split_8_2" | "split_7_3"
      avoidTollRoads: boolean
      maxDetourMilesForFuel: number (default 15)
    }

RESOLVED from DB:
  Driver:
    - Current HOS state (hoursDriven, onDutyTime, hoursSinceBreak)
    - Cycle hours used (70h/8day tracking)
    - Home terminal timezone
    - Has sleeper berth (from vehicle)

  Vehicle:
    - Fuel capacity, current fuel, MPG
    - Has sleeper berth
    - Gross weight (affects routing)

  Loads + Stops:
    - All stops with lat/lon, time windows
    - Sequence order per load
    - Estimated dock hours
    - Action type (pickup/delivery)
    - Customer name
```

### Step 2: Get Real Road Data

```
Call RoutingProvider.getDistanceMatrix(allStops):
  Returns NxN matrix:
    {
      "stopA:stopB": { distanceMiles: 120.5, driveTimeHours: 2.1 },
      "stopA:stopC": { distanceMiles: 340.2, driveTimeHours: 5.8 },
      ...
    }

Notes:
  - OSRM uses car profile (multiply by 1.1 for truck approximation)
  - HERE uses truck profile with weight/height constraints (more accurate)
  - Matrix is cached for the planning session
```

### Step 3: Optimize Stop Sequence (TSP)

```
Algorithm: Nearest-neighbor + 2-opt improvement

Constraints:
  - Origin stop is FIXED first
  - Destination stop is FIXED last
  - Time windows respected (can't arrive before earliest)
  - Pickup before delivery for same load

Output: Ordered list of stops
```

### Step 4: Segment-by-Segment Simulation

This is the heart of the engine. For each pair of consecutive stops:

```
STATE tracked throughout simulation:
  - currentTime: DateTime (with timezone awareness)
  - hosClocks: {
      hoursDriven: number        // Resets after 10h rest (max 11)
      onDutyTime: number         // Resets after 10h rest (max 14)
      hoursSinceBreak: number    // Resets after 30min break (max 8)
      cycleHoursUsed: number     // Rolling 8-day total (max 70)
      cycleDaysData: Array<{date, hoursWorked}>  // Last 8 days
    }
  - fuelState: {
      currentGallons: number
      capacityGallons: number
      mpg: number
    }
  - segments: RouteSegment[]     // Built up as we go

FOR each consecutive pair (fromStop, toStop):

  4a. CHECK APPOINTMENT WINDOW
      If toStop has earliest_arrival and we'd arrive too early:
        - Calculate wait time
        - If wait > 2h AND driver needs rest anyway: insert rest
        - If wait > 0 but < 2h: driver waits (add to on-duty time)
        - Adjust departure time if this is the first segment

  4b. CHECK 30-MINUTE BREAK REQUIREMENT
      If hoursSinceBreak + segmentDriveTime > 8.0:
        - Insert 30-minute break BEFORE this segment
        - Can combine with dock time or fuel stop
        - Resets hoursSinceBreak to 0

  4c. CHECK HOS DAILY CLOCKS
      If hoursDriven + segmentDriveTime > 11.0 OR
         onDutyTime + segmentDriveTime > 14.0:
        - MUST insert rest before this segment
        - Determine rest type (see Rest Decision Logic below)
        - Find nearest truck stop along route corridor
        - Insert rest segment, reset clocks

  4d. CHECK 70-HOUR CYCLE
      If cycleHoursUsed + segmentDriveTime > 70.0:
        - Need 34-hour restart
        - Insert 34h rest at nearest truck stop
        - Reset cycle counter

  4e. CHECK DOCK-TO-REST OPPORTUNITY
      If toStop has dispatcherFlag "convertToRest: true":
        - LOOK AHEAD at entire remaining journey
        - Run Rest Decision Logic (see below)
        - May convert dock time to full rest or split rest

  4f. CHECK FUEL
      fuelNeeded = segmentDistanceMiles / mpg
      If currentGallons < fuelNeeded * 1.3:   // 30% buffer
        - Query FuelDataProvider for stations along corridor
        - Pick cheapest within maxDetourMiles
        - Insert fuel segment (15min stop)
        - Update fuel state

  4g. CHECK WEATHER
      Call WeatherProvider for this segment's corridor
      If severe weather alerts:
        - Add weather warning to segment
        - Adjust drive time estimate (+10-30% depending on severity)
        - Flag in compliance report

  4h. BUILD DRIVE SEGMENT
      Create RouteSegment:
        - type: "drive"
        - from/to with lat/lon
        - distance, drive time (from routing provider)
        - HOS state after segment
        - fuel state after segment
        - estimated arrival/departure (timezone-aware)
        - route geometry (polyline for map)

  4i. BUILD DOCK SEGMENT (if toStop is pickup/delivery)
      Create RouteSegment:
        - type: "dock"
        - dock duration hours
        - action type (pickup/delivery)
        - appointment window
        - customer name
        - HOS state after (dock time adds to on-duty, NOT drive)
        - Check if dock-to-rest conversion applies

  UPDATE all clocks and state
  ADVANCE to next stop pair
```

### Rest Decision Logic (Look-Ahead Algorithm)

```
WHEN engine needs to insert rest (HOS limit reached) OR
     dispatcher flagged dock-to-rest:

  1. SIMULATE remaining journey WITHOUT resting here
     - Will driver run out of hours? When? Where?
     - Can they complete all remaining stops?

  2. IF rest is mandatory (HOS limit hit):
     Determine best rest type:

     a. FULL REST (10h) - if:
        - No sleeper berth available, OR
        - Cycle hours near 70 (need full reset), OR
        - Remaining journey needs > 11h driving, OR
        - Dispatcher preference is "full"

     b. 8/2 SLEEPER BERTH SPLIT - if:
        - Vehicle has sleeper berth, AND
        - 8h portion fits naturally (dock time >= 8h, or rest stop), AND
        - Remaining journey needs 6-11h driving (split provides enough)

     c. 7/3 SLEEPER BERTH SPLIT - if:
        - Vehicle has sleeper berth, AND
        - 7h portion fits naturally, AND
        - Remaining journey needs 4-8h driving

  3. IF dock-to-rest (dispatcher flagged):
     Look ahead at remaining journey:

     a. Driver has plenty of hours remaining (margin > 4h):
        - Don't convert to rest (waste of time)
        - Dock time counts as on-duty only

     b. Driver will need rest within 2-3 segments:
        - Convert dock to rest NOW (saves a separate rest stop later)
        - Choose: extend dock to full 10h if dock >= 7h
                  use as 8h portion of 8/2 split if dock >= 8h
                  use as 7h portion of 7/3 split if dock >= 7h
                  just take what you can get if dock < 7h

     c. Another better dock-to-rest opportunity is coming:
        - Don't rest here, wait for the better opportunity
        - "Better" = longer dock time, or closer to when rest is actually needed

  4. FIND REST LOCATION
     If at dock (dock-to-rest): rest at dock location
     If dedicated rest stop: query Stops table for nearest truck stop
       - Search within 30-mile corridor of route
       - Prefer: larger truck stops, ones with amenities
       - Calculate drive time to rest stop, add to plan
```

### Step 5: Validate & Persist

```
VALIDATION:
  - Zero HOS violations across entire plan
  - All appointment windows met (or flagged as infeasible)
  - Fuel never reaches 0 (or flagged)
  - Route is geometrically valid (no impossible segments)

FEASIBILITY REPORT:
  If ANY appointment window can't be met:
    - isFeasible: false
    - issues: ["Cannot reach Stop C by 10:00 AM - earliest arrival 11:30 AM"]
    - Alternative: suggest adjusting departure time

PERSIST:
  - Create RoutePlan record with all summary fields
  - Create RouteSegment records (one per segment)
  - Create RoutePlanLoad junction records
  - Status: "draft" (until dispatcher activates)

RESPONSE:
  Return full plan with:
    - Summary (distance, time, days, cost)
    - All segments with details
    - Daily breakdown
    - Compliance report
    - Weather warnings
    - Feasibility status
```

---

## API Contract

### POST /api/v1/routes/plan

**Request:**
```json
{
  "driverId": "drv_abc123",
  "vehicleId": "veh_xyz789",
  "loadIds": ["load_001", "load_002"],
  "departureTime": "2026-02-07T06:00:00-06:00",
  "optimizationPriority": "minimize_time",
  "dispatcherParams": {
    "dockRestStops": [
      {
        "stopId": "stop_456",
        "truckParkedHours": 4.0,
        "convertToRest": true
      }
    ],
    "preferredRestType": "auto",
    "avoidTollRoads": false,
    "maxDetourMilesForFuel": 15
  }
}
```

**Response:**
```json
{
  "planId": "plan_abc123",
  "planVersion": 1,
  "status": "draft",

  "summary": {
    "totalDistanceMiles": 847.3,
    "totalDriveTimeHours": 14.2,
    "totalTripTimeHours": 38.5,
    "totalDrivingDays": 2,
    "totalCostEstimate": 412.50,
    "departureTime": "2026-02-07T06:00:00-06:00",
    "estimatedArrival": "2026-02-08T20:30:00-05:00",
    "restStopsCount": 1,
    "fuelStopsCount": 2,
    "dockStopsCount": 3
  },

  "compliance": {
    "isFeasible": true,
    "hosCompliant": true,
    "allWindowsMet": true,
    "issues": [],
    "warnings": [
      "Weather advisory: Snow expected on I-80 near Cheyenne (segment 4)"
    ]
  },

  "segments": [
    {
      "sequenceOrder": 1,
      "segmentType": "drive",
      "fromLocation": {
        "name": "ABC Warehouse",
        "lat": 41.88,
        "lon": -87.63,
        "city": "Chicago",
        "state": "IL",
        "timezone": "America/Chicago"
      },
      "toLocation": {
        "name": "Customer X",
        "lat": 41.50,
        "lon": -88.15,
        "city": "Joliet",
        "state": "IL",
        "timezone": "America/Chicago"
      },
      "distanceMiles": 48.2,
      "driveTimeHours": 0.85,
      "estimatedDeparture": "2026-02-07T06:00:00-06:00",
      "estimatedArrival": "2026-02-07T06:51:00-06:00",
      "hosStateAfter": {
        "hoursDriven": 0.85,
        "onDutyTime": 0.85,
        "hoursSinceBreak": 0.85,
        "cycleHoursUsed": 45.85,
        "driveRemaining": 10.15,
        "dutyRemaining": 13.15,
        "cycleRemaining": 24.15
      },
      "fuelStateAfter": {
        "gallonsRemaining": 142.3
      },
      "weatherAlerts": [],
      "routeGeometry": "encoded_polyline_string"
    },
    {
      "sequenceOrder": 2,
      "segmentType": "dock",
      "location": {
        "name": "Customer X",
        "lat": 41.50,
        "lon": -88.15,
        "city": "Joliet",
        "state": "IL",
        "timezone": "America/Chicago"
      },
      "dockDurationHours": 2.0,
      "actionType": "pickup",
      "customerName": "Customer X",
      "appointmentWindow": {
        "earliest": "06:00",
        "latest": "10:00"
      },
      "estimatedArrival": "2026-02-07T06:51:00-06:00",
      "estimatedDeparture": "2026-02-07T08:51:00-06:00",
      "isDocktimeConverted": false,
      "hosStateAfter": {
        "hoursDriven": 0.85,
        "onDutyTime": 2.85,
        "hoursSinceBreak": 2.85,
        "cycleHoursUsed": 47.85
      }
    },
    {
      "sequenceOrder": 5,
      "segmentType": "rest",
      "location": {
        "name": "Pilot Travel Center #422",
        "lat": 41.12,
        "lon": -90.33,
        "city": "Davenport",
        "state": "IA",
        "timezone": "America/Chicago"
      },
      "restType": "full_rest",
      "restDurationHours": 10.0,
      "restReason": "HOS: 10.5h driven, approaching 11h limit. Full rest resets all clocks.",
      "isDocktimeConverted": false,
      "estimatedArrival": "2026-02-07T17:30:00-06:00",
      "estimatedDeparture": "2026-02-08T03:30:00-06:00",
      "hosStateAfter": {
        "hoursDriven": 0,
        "onDutyTime": 0,
        "hoursSinceBreak": 0,
        "cycleHoursUsed": 47.85
      }
    },
    {
      "sequenceOrder": 7,
      "segmentType": "fuel",
      "location": {
        "name": "Love's Travel Stop #503",
        "lat": 40.8,
        "lon": -91.1,
        "city": "Burlington",
        "state": "IA",
        "timezone": "America/Chicago"
      },
      "fuelGallons": 120.0,
      "fuelPricePerGallon": 3.45,
      "fuelCostEstimate": 414.00,
      "fuelStopDurationHours": 0.25,
      "detourMiles": 1.2,
      "estimatedArrival": "2026-02-08T05:45:00-06:00",
      "estimatedDeparture": "2026-02-08T06:00:00-06:00"
    }
  ],

  "dailyBreakdown": [
    {
      "day": 1,
      "date": "2026-02-07",
      "driveHours": 10.5,
      "onDutyHours": 13.2,
      "restHours": 10.0,
      "milesDriven": 520,
      "stopsCompleted": ["Stop A (pickup)", "Stop B (delivery)"],
      "restAt": "Pilot Travel Center #422"
    },
    {
      "day": 2,
      "date": "2026-02-08",
      "driveHours": 3.7,
      "onDutyHours": 6.5,
      "milesDriven": 327,
      "stopsCompleted": ["Stop C (delivery)", "Final Destination"]
    }
  ]
}
```

### Other Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/routes/:planId` | GET | Get full plan with all segments |
| `/api/v1/routes/:planId/activate` | POST | Start monitoring this route |
| `/api/v1/routes/:planId/update` | POST | Dynamic update (trigger-based) |
| `/api/v1/routes/driver/:driverId/active` | GET | Get driver's active route |
| `/api/v1/routes` | GET | List routes (filtered by status, driver, date) |

---

## Database Schema Changes

### Driver Model - Add Fields

```prisma
model Driver {
  // ... existing fields ...

  // Structured HOS fields (engine reads these directly)
  currentHoursDriven      Float     @default(0) @map("current_hours_driven")
  currentOnDutyTime       Float     @default(0) @map("current_on_duty_time")
  currentHoursSinceBreak  Float     @default(0) @map("current_hours_since_break")
  cycleHoursUsed          Float     @default(0) @map("cycle_hours_used")
  cycleDaysData           Json?     @map("cycle_days_data")  // [{date, hoursWorked}] last 8 days
  lastRestartAt           DateTime? @map("last_restart_at") @db.Timestamptz
  homeTerminalTimezone    String    @default("America/New_York") @map("home_terminal_timezone") @db.VarChar(50)
}
```

### Vehicle Model - Add Fields

```prisma
model Vehicle {
  // ... existing fields ...

  hasSleeperBerth         Boolean   @default(true) @map("has_sleeper_berth")
  grossWeightLbs          Float?    @map("gross_weight_lbs")
}
```

### RoutePlan Model - Enhanced

```prisma
model RoutePlan {
  // ... existing fields ...

  // Timing
  departureTime           DateTime?  @map("departure_time") @db.Timestamptz
  estimatedArrival        DateTime?  @map("estimated_arrival") @db.Timestamptz
  completedAt             DateTime?  @map("completed_at") @db.Timestamptz
  cancelledAt             DateTime?  @map("cancelled_at") @db.Timestamptz

  // Enhanced summary
  totalTripTimeHours      Float      @default(0) @map("total_trip_time_hours")
  totalDrivingDays        Int        @default(1) @map("total_driving_days")

  // Dispatcher input
  dispatcherParams        Json?      @map("dispatcher_params")

  // Daily breakdown
  dailyBreakdown          Json?      @map("daily_breakdown")

  // Load relationship (new)
  loads                   RoutePlanLoad[]
}
```

### RouteSegment Model - Enhanced

```prisma
model RouteSegment {
  // ... existing fields ...

  // Geo coordinates
  fromLat                 Float?     @map("from_lat")
  fromLon                 Float?     @map("from_lon")
  toLat                   Float?     @map("to_lat")
  toLon                   Float?     @map("to_lon")

  // Timezone
  timezone                String?    @db.VarChar(50)

  // Dock segment details
  actionType              String?    @map("action_type") @db.VarChar(20)
  appointmentWindow       Json?      @map("appointment_window")

  // Fuel segment details
  fuelPricePerGallon      Float?     @map("fuel_price_per_gallon")
  detourMiles             Float?     @map("detour_miles")

  // Rest segment details
  isDocktimeConverted     Boolean    @default(false) @map("is_docktime_converted")

  // Weather
  weatherAlerts           Json?      @map("weather_alerts")

  // Map display
  routeGeometry           String?    @map("route_geometry") @db.Text

  // Actual tracking
  actualArrival           DateTime?  @map("actual_arrival") @db.Timestamptz
  actualDeparture         DateTime?  @map("actual_departure") @db.Timestamptz

  // Fuel state tracking
  fuelStateAfter          Json?      @map("fuel_state_after")

  // Stop reference
  stopId                  Int?       @map("stop_id")
  stop                    Stop?      @relation(fields: [stopId], references: [id])
}
```

### New: RoutePlanLoad Junction

```prisma
model RoutePlanLoad {
  id          Int       @id @default(autoincrement())
  planId      Int       @map("plan_id")
  loadId      Int       @map("load_id")
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz

  plan        RoutePlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  load        Load      @relation(fields: [loadId], references: [id])

  @@unique([planId, loadId])
  @@index([planId])
  @@index([loadId])
  @@map("route_plan_loads")
}
```

### Stop Model - Enhanced

```prisma
model Stop {
  // ... existing fields ...

  zipCode                 String?    @map("zip_code") @db.VarChar(10)
  timezone                String?    @db.VarChar(50)

  // Fuel station fields
  fuelPricePerGallon      Float?     @map("fuel_price_per_gallon")
  fuelPriceUpdatedAt      DateTime?  @map("fuel_price_updated_at") @db.Timestamptz
  fuelBrand               String?    @map("fuel_brand") @db.VarChar(50)  // Pilot, Love's, TA

  // Truck stop fields
  amenities               Json?      // ["showers", "parking", "food", "wifi"]
  parkingSpaces           Int?       @map("parking_spaces")

  // Multi-tenancy (optional - for custom stops)
  tenantId                Int?       @map("tenant_id")

  // Route segment reference
  routeSegments           RouteSegment[]
}
```

### Load Model - Add tenantId

```prisma
model Load {
  // ... existing fields ...

  tenantId                Int?       @map("tenant_id")

  // Route plan relationship
  routePlanLoads          RoutePlanLoad[]
}
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

volumes:
  osrm-data:
```

OSRM data preparation (one-time setup script):
```bash
# Download US road data from OpenStreetMap
wget https://download.geofabrik.de/north-america/us-latest.osm.pbf

# Extract, partition, customize for OSRM
docker run -v osrm-data:/data osrm/osrm-backend osrm-extract -p /opt/car.lua /data/us-latest.osm.pbf
docker run -v osrm-data:/data osrm/osrm-backend osrm-partition /data/us-latest.osrm
docker run -v osrm-data:/data osrm/osrm-backend osrm-customize /data/us-latest.osrm
```

OSRM API usage:
```
GET http://localhost:5000/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=polyline
GET http://localhost:5000/table/v1/driving/{lon1},{lat1};{lon2},{lat2};...?annotations=distance,duration
```

---

## Truck Stop Seed Data

Seed ~7,000 major US truck stops into the `stops` table:

**Data Sources:**
- OpenStreetMap (amenity=fuel, truck=yes)
- FMCSA truck parking data
- Major chain locations (Pilot/Flying J: ~750, Love's: ~600, TA/Petro: ~280)

**Seed format:**
```json
{
  "name": "Pilot Travel Center #422",
  "address": "1234 Interstate Dr",
  "city": "Davenport",
  "state": "IA",
  "zipCode": "52806",
  "lat": 41.5236,
  "lon": -90.5776,
  "locationType": "truck_stop",
  "timezone": "America/Chicago",
  "fuelPricePerGallon": 3.45,
  "fuelBrand": "Pilot",
  "amenities": ["showers", "parking", "food", "wifi", "scales"],
  "parkingSpaces": 200,
  "isActive": true
}
```

For the MVP, we'll create a representative seed dataset of ~200-500 truck stops along major interstate corridors. This provides realistic demo data while keeping seed time fast.

---

## HOS Rules Reference (FMCSA)

### Daily Limits
| Rule | Limit | Resets After |
|---|---|---|
| Drive time | 11 hours max | 10 consecutive hours off-duty/sleeper |
| Duty window | 14 hours max | 10 consecutive hours off-duty/sleeper |
| Break requirement | 30 min after 8h driving | 30min off-duty/sleeper break |

### Weekly Limit
| Rule | Limit | Resets After |
|---|---|---|
| Cycle limit (Property) | 70 hours in 8 consecutive days | 34 consecutive hours off-duty |

### Sleeper Berth Split Rules
| Split Type | Long Portion | Short Portion | Notes |
|---|---|---|---|
| 8/2 split | 8h in sleeper berth | 2h off-duty or sleeper | Neither alone resets 14h window |
| 7/3 split | 7h in sleeper berth | 3h off-duty or sleeper | Neither alone resets 14h window |

**Key nuance:** During split rest, the 14-hour duty window pauses during each portion but doesn't fully reset. The engine must track this correctly.

### How Dock Time Interacts with HOS
- Dock time where driver is **waiting** = on-duty (NOT driving) time
- Dock time where driver goes **off-duty** = off-duty time (doesn't count toward 14h)
- If dispatcher marks "truck parked" = driver can go off-duty or sleeper
- Off-duty at dock CAN count as short portion (2h or 3h) of split rest
- Sleeper berth at dock CAN count as long portion (7h or 8h) IF vehicle has sleeper

---

## File Structure (New/Modified)

### New Files

```
apps/backend/src/domains/routing/
├── providers/
│   ├── routing/
│   │   ├── routing-provider.interface.ts     # Interface
│   │   ├── osrm-routing.provider.ts          # OSRM implementation
│   │   ├── here-routing.provider.ts          # HERE implementation
│   │   └── routing-provider.module.ts
│   ├── weather/
│   │   ├── weather-provider.interface.ts     # Interface
│   │   ├── openweathermap.provider.ts        # OpenWeatherMap implementation
│   │   ├── mock-weather.provider.ts          # Mock for testing
│   │   └── weather-provider.module.ts
│   └── fuel/
│       ├── fuel-data-provider.interface.ts   # Interface
│       ├── database-fuel.provider.ts         # Reads from Stops table
│       └── fuel-provider.module.ts
├── route-planning/
│   ├── services/
│   │   ├── route-planning-engine.service.ts  # REWRITE - main orchestrator
│   │   └── route-plan-persistence.service.ts # NEW - DB persistence
│   ├── controllers/
│   │   └── route-planning.controller.ts      # REWRITE - new API contract
│   ├── dto/
│   │   ├── create-route-plan.dto.ts          # Request validation
│   │   └── route-plan-response.dto.ts        # Response shaping
│   └── route-planning.module.ts              # UPDATED
├── hos-compliance/
│   └── services/
│       └── hos-rule-engine.service.ts        # ENHANCE - add cycle tracking, split rest
├── optimization/
│   └── services/
│       ├── tsp-optimizer.service.ts          # ENHANCE - time window support
│       ├── rest-optimization.service.ts      # ENHANCE - look-ahead algorithm
│       ├── rest-stop-finder.service.ts       # REWRITE - use DB + providers
│       └── fuel-stop-optimizer.service.ts    # REWRITE - use providers
└── routing.module.ts                         # UPDATED

prisma/
├── schema.prisma                             # UPDATED with new fields
└── seeds/
    └── truck-stops.ts                        # NEW - seed truck stop data
```

### Files to Remove (Starting Fresh)

The existing route planning controller and engine service files will be **rewritten in place**, not deleted. The interfaces and logic will change entirely but the file locations stay the same.

---

## Implementation Order

### Phase 1: Foundation (Schema + Providers)
1. Update Prisma schema with all new fields
2. Run migration
3. Set up OSRM in Docker
4. Implement RoutingProvider interface + OSRM provider
5. Seed truck stop data
6. Implement WeatherProvider interface + OpenWeatherMap
7. Implement FuelDataProvider interface + database provider

### Phase 2: HOS Engine Enhancement
8. Enhance HOS rule engine (70h/8day, split rest tracking)
9. Add cycle hours tracking
10. Add sleeper berth split logic

### Phase 3: Core Route Engine
11. Rewrite route planning engine (orchestrator)
12. Implement segment-by-segment simulation
13. Implement look-ahead rest decision logic
14. Implement dock-to-rest conversion
15. Implement time zone handling

### Phase 4: API + Persistence
16. Rewrite route planning controller (new API contract)
17. Implement route plan persistence service
18. Implement route retrieval endpoints
19. Implement route activation endpoint

### Phase 5: Integration Testing
20. Test: single-day route (no rest needed)
21. Test: multi-day route (rest insertion)
22. Test: dock-to-rest conversion scenarios
23. Test: fuel stop insertion
24. Test: appointment window constraints
25. Test: weather advisory handling
26. Test: 70h cycle limit + 34h restart
27. Test: sleeper berth split scenarios

---

## Success Criteria

- [ ] POST /api/v1/routes/plan returns complete multi-day route
- [ ] Engine uses real road distances (OSRM) not haversine
- [ ] HOS compliance: zero violations on 100 test routes
- [ ] Rest stops are real truck stop locations from DB
- [ ] Dock-to-rest conversion works with look-ahead analysis
- [ ] 70-hour/8-day cycle tracked correctly
- [ ] Sleeper berth 8/2 and 7/3 splits handled correctly
- [ ] Time zones handled across cross-country routes
- [ ] Appointment windows respected (or flagged infeasible)
- [ ] Weather alerts included in route segments
- [ ] Fuel stops inserted with price data
- [ ] Daily breakdown shows per-day plan
- [ ] Routes persisted to PostgreSQL with full detail
- [ ] Provider pattern: can swap OSRM for HERE without engine changes
- [ ] API response time < 5 seconds for 10-stop route
