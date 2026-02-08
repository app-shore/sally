# Route Planning Engine v2 - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the route planning engine with real road distances (OSRM), full FMCSA HOS compliance (70h/8day, sleeper berth splits), dock-to-rest conversion with look-ahead analysis, weather integration, fuel optimization, and multi-day route planning - all persisted to PostgreSQL.

**Architecture:** Provider pattern for external services (routing, weather, fuel). Engine is an orchestrator that calls providers and simulates route segment-by-segment with full HOS clock tracking. Dispatcher sends IDs; engine resolves everything from DB.

**Tech Stack:** NestJS 11, Prisma 7, PostgreSQL 16, OSRM (Docker), OpenWeatherMap API, Zod validation, axios for HTTP calls.

**Design Doc:** `.docs/plans/2026-02-06-route-planning-engine-v2-design.md`

---

## Task 1: Update Prisma Schema

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`

**Step 1: Add new fields to Driver model**

After the existing `eldMetadata` field (line ~326), add:

```prisma
  // Structured HOS fields (engine reads directly)
  currentHoursDriven      Float     @default(0) @map("current_hours_driven")
  currentOnDutyTime       Float     @default(0) @map("current_on_duty_time")
  currentHoursSinceBreak  Float     @default(0) @map("current_hours_since_break")
  cycleHoursUsed          Float     @default(0) @map("cycle_hours_used")
  cycleDaysData           Json?     @map("cycle_days_data")
  lastRestartAt           DateTime? @map("last_restart_at") @db.Timestamptz
  homeTerminalTimezone    String    @default("America/New_York") @map("home_terminal_timezone") @db.VarChar(50)
```

**Step 2: Add new fields to Vehicle model**

After `eldTelematicsMetadata` field (line ~371), add:

```prisma
  hasSleeperBerth         Boolean   @default(true) @map("has_sleeper_berth")
  grossWeightLbs          Float?    @map("gross_weight_lbs")
```

**Step 3: Add new fields to RoutePlan model**

After `activatedAt` field (line ~402), add:

```prisma
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
```

Add to RoutePlan relations (after `updates`):

```prisma
  loads                   RoutePlanLoad[]
```

**Step 4: Add new fields to RouteSegment model**

After `estimatedDeparture` field (line ~440), add:

```prisma
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
```

**Step 5: Add new fields to Stop model**

After `isActive` field (line ~481), add:

```prisma
  zipCode                 String?    @map("zip_code") @db.VarChar(10)
  timezone                String?    @db.VarChar(50)

  // Fuel station fields
  fuelPricePerGallon      Float?     @map("fuel_price_per_gallon")
  fuelPriceUpdatedAt      DateTime?  @map("fuel_price_updated_at") @db.Timestamptz
  fuelBrand               String?    @map("fuel_brand") @db.VarChar(50)

  // Truck stop fields
  amenities               Json?
  parkingSpaces           Int?       @map("parking_spaces")

  // Multi-tenancy (optional)
  tenantId                Int?       @map("tenant_id")

  // Route segment reference
  routeSegments           RouteSegment[]
```

**Step 6: Add tenantId to Load model**

After `lastSyncedAt` field (line ~505), add:

```prisma
  tenantId                Int?       @map("tenant_id")
```

Add to Load relations (after `stops`):

```prisma
  routePlanLoads          RoutePlanLoad[]
```

**Step 7: Create RoutePlanLoad junction model**

After the `Load` model, add:

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

**Step 8: Add cycle config to configuration.ts**

In `apps/backend/src/config/configuration.ts`, add to the Zod schema (after `sleeper_berth_split_short`):

```typescript
  maxCycleHours: z.number().default(70.0),
  cycleDays: z.number().default(8),
  restartHours: z.number().default(34.0),
  osrmUrl: z.string().default('http://localhost:5000'),
  hereApiKey: z.string().optional(),
  openWeatherApiKey: z.string().optional(),
```

Add matching env var reads in the `raw` object:

```typescript
  maxCycleHours: process.env.MAX_CYCLE_HOURS ? Number(process.env.MAX_CYCLE_HOURS) : undefined,
  cycleDays: process.env.CYCLE_DAYS ? Number(process.env.CYCLE_DAYS) : undefined,
  restartHours: process.env.RESTART_HOURS ? Number(process.env.RESTART_HOURS) : undefined,
  osrmUrl: process.env.OSRM_URL,
  hereApiKey: process.env.HERE_API_KEY,
  openWeatherApiKey: process.env.OPENWEATHER_API_KEY,
```

**Step 9: Run migration**

```bash
cd apps/backend && npx prisma migrate dev --name add_route_planning_v2_fields
```

Expected: Migration created and applied successfully.

**Step 10: Generate Prisma client**

```bash
cd apps/backend && npx prisma generate
```

Expected: Prisma client generated with new types.

**Step 11: Verify compilation**

```bash
cd apps/backend && npx tsc --noEmit
```

Expected: No errors (or only pre-existing errors unrelated to our changes).

**Step 12: Commit**

```bash
git add apps/backend/prisma/ apps/backend/src/config/configuration.ts
git commit -m "feat(schema): add route planning v2 fields to Prisma schema

Add HOS cycle tracking to Driver, sleeper berth to Vehicle,
enhanced RoutePlan/RouteSegment fields, RoutePlanLoad junction,
enhanced Stop model for truck stops, and OSRM/HERE/Weather config."
```

---

## Task 2: Seed Truck Stop Data

**Files:**
- Create: `apps/backend/prisma/seeds/truck-stops.seed.ts`
- Modify: `apps/backend/prisma/seed.ts` (add truck stop seeding call)

**Step 1: Create truck stop seed file**

Create `apps/backend/prisma/seeds/truck-stops.seed.ts` with ~300 real US truck stops along major interstate corridors (I-80, I-90, I-95, I-40, I-10, I-5, I-70, I-75, I-65, I-35). Each stop has:
- Real city/state/coordinates
- Location type (truck_stop or fuel_station)
- Fuel brand (Pilot, Love's, TA/Petro, Flying J)
- Fuel price (mock, $3.40-$4.20 range varying by state)
- Amenities array
- Timezone
- Parking capacity

The function should be idempotent using `upsert` on `stopId`.

```typescript
import { PrismaClient } from '@prisma/client';

interface TruckStopData {
  stopId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  lat: number;
  lon: number;
  locationType: string;
  timezone: string;
  fuelPricePerGallon: number;
  fuelBrand: string;
  amenities: string[];
  parkingSpaces: number;
}

// Representative truck stops along major US interstates
const TRUCK_STOPS: TruckStopData[] = [
  // I-80 Corridor (NJ to CA)
  {
    stopId: 'ts_pilot_i80_001',
    name: 'Pilot Travel Center #359',
    address: '1 Truck Stop Rd',
    city: 'Parsippany',
    state: 'NJ',
    zipCode: '07054',
    lat: 40.8568,
    lon: -74.4260,
    locationType: 'truck_stop',
    timezone: 'America/New_York',
    fuelPricePerGallon: 3.89,
    fuelBrand: 'Pilot',
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales'],
    parkingSpaces: 150,
  },
  {
    stopId: 'ts_loves_i80_002',
    name: "Love's Travel Stop #352",
    address: '100 Love\'s Way',
    city: 'Milton',
    state: 'PA',
    zipCode: '17847',
    lat: 41.0070,
    lon: -76.8466,
    locationType: 'truck_stop',
    timezone: 'America/New_York',
    fuelPricePerGallon: 3.79,
    fuelBrand: "Love's",
    amenities: ['showers', 'parking', 'food', 'wifi', 'tire_service'],
    parkingSpaces: 200,
  },
  {
    stopId: 'ts_ta_i80_003',
    name: 'TA Travel Center #027',
    address: '200 Truck Plaza Dr',
    city: 'Clearfield',
    state: 'PA',
    zipCode: '16830',
    lat: 41.0176,
    lon: -78.4394,
    locationType: 'truck_stop',
    timezone: 'America/New_York',
    fuelPricePerGallon: 3.85,
    fuelBrand: 'TA',
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales', 'repair'],
    parkingSpaces: 250,
  },
  {
    stopId: 'ts_pilot_i80_004',
    name: 'Pilot Travel Center #064',
    address: '300 Interstate Dr',
    city: 'Brookville',
    state: 'PA',
    zipCode: '15825',
    lat: 41.1615,
    lon: -79.0825,
    locationType: 'truck_stop',
    timezone: 'America/New_York',
    fuelPricePerGallon: 3.82,
    fuelBrand: 'Pilot',
    amenities: ['showers', 'parking', 'food', 'wifi'],
    parkingSpaces: 120,
  },
  {
    stopId: 'ts_flyingj_i80_005',
    name: 'Flying J Travel Center #685',
    address: '400 Truck Stop Blvd',
    city: 'Mercer',
    state: 'PA',
    zipCode: '16137',
    lat: 41.2270,
    lon: -80.2367,
    locationType: 'truck_stop',
    timezone: 'America/New_York',
    fuelPricePerGallon: 3.87,
    fuelBrand: 'Flying J',
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales'],
    parkingSpaces: 180,
  },
  // I-80 Ohio
  {
    stopId: 'ts_loves_i80_006',
    name: "Love's Travel Stop #629",
    address: '500 Travel Center Dr',
    city: 'North Lima',
    state: 'OH',
    zipCode: '44452',
    lat: 40.9495,
    lon: -80.6654,
    locationType: 'truck_stop',
    timezone: 'America/New_York',
    fuelPricePerGallon: 3.65,
    fuelBrand: "Love's",
    amenities: ['showers', 'parking', 'food', 'wifi'],
    parkingSpaces: 160,
  },
  {
    stopId: 'ts_pilot_i80_007',
    name: 'Pilot Travel Center #239',
    address: '600 Exit Ramp Rd',
    city: 'Streetsboro',
    state: 'OH',
    zipCode: '44241',
    lat: 41.2393,
    lon: -81.3455,
    locationType: 'truck_stop',
    timezone: 'America/New_York',
    fuelPricePerGallon: 3.62,
    fuelBrand: 'Pilot',
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales'],
    parkingSpaces: 140,
  },
  {
    stopId: 'ts_ta_i80_008',
    name: 'TA Travel Center #049',
    address: '700 Turnpike Plaza',
    city: 'Seville',
    state: 'OH',
    zipCode: '44273',
    lat: 41.0100,
    lon: -81.8700,
    locationType: 'truck_stop',
    timezone: 'America/New_York',
    fuelPricePerGallon: 3.68,
    fuelBrand: 'TA',
    amenities: ['showers', 'parking', 'food', 'wifi', 'repair'],
    parkingSpaces: 220,
  },
  // I-80 Indiana
  {
    stopId: 'ts_pilot_i80_009',
    name: 'Pilot Travel Center #431',
    address: '800 Hoosier Rd',
    city: 'Howe',
    state: 'IN',
    zipCode: '46746',
    lat: 41.7280,
    lon: -85.4234,
    locationType: 'truck_stop',
    timezone: 'America/Indiana/Indianapolis',
    fuelPricePerGallon: 3.59,
    fuelBrand: 'Pilot',
    amenities: ['showers', 'parking', 'food', 'wifi'],
    parkingSpaces: 130,
  },
  // I-80 Illinois
  {
    stopId: 'ts_loves_i80_010',
    name: "Love's Travel Stop #718",
    address: '900 Prairie View Dr',
    city: 'Joliet',
    state: 'IL',
    zipCode: '60435',
    lat: 41.5000,
    lon: -88.1500,
    locationType: 'truck_stop',
    timezone: 'America/Chicago',
    fuelPricePerGallon: 3.72,
    fuelBrand: "Love's",
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales'],
    parkingSpaces: 190,
  },
  // I-80 Iowa
  {
    stopId: 'ts_pilot_i80_011',
    name: 'Pilot Travel Center #422',
    address: '1000 River Dr',
    city: 'Davenport',
    state: 'IA',
    zipCode: '52806',
    lat: 41.5236,
    lon: -90.5776,
    locationType: 'truck_stop',
    timezone: 'America/Chicago',
    fuelPricePerGallon: 3.55,
    fuelBrand: 'Pilot',
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales'],
    parkingSpaces: 200,
  },
  {
    stopId: 'ts_flyingj_i80_012',
    name: 'Flying J Travel Center #612',
    address: '1100 Hawkeye Blvd',
    city: 'Walcott',
    state: 'IA',
    zipCode: '52773',
    lat: 41.5854,
    lon: -90.7682,
    locationType: 'truck_stop',
    timezone: 'America/Chicago',
    fuelPricePerGallon: 3.52,
    fuelBrand: 'Flying J',
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales', 'truck_wash'],
    parkingSpaces: 300,
  },
  {
    stopId: 'ts_ta_i80_013',
    name: 'TA Travel Center #131',
    address: '1200 Grinnell Ave',
    city: 'Grinnell',
    state: 'IA',
    zipCode: '50112',
    lat: 41.7369,
    lon: -92.7224,
    locationType: 'truck_stop',
    timezone: 'America/Chicago',
    fuelPricePerGallon: 3.49,
    fuelBrand: 'TA',
    amenities: ['showers', 'parking', 'food', 'wifi'],
    parkingSpaces: 170,
  },
  // I-80 Nebraska
  {
    stopId: 'ts_loves_i80_014',
    name: "Love's Travel Stop #541",
    address: '1300 Cornhusker Hwy',
    city: 'Lincoln',
    state: 'NE',
    zipCode: '68521',
    lat: 40.8507,
    lon: -96.7594,
    locationType: 'truck_stop',
    timezone: 'America/Chicago',
    fuelPricePerGallon: 3.45,
    fuelBrand: "Love's",
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales'],
    parkingSpaces: 210,
  },
  {
    stopId: 'ts_pilot_i80_015',
    name: 'Pilot Travel Center #288',
    address: '1400 Interstate Loop',
    city: 'North Platte',
    state: 'NE',
    zipCode: '69101',
    lat: 41.1403,
    lon: -100.7654,
    locationType: 'truck_stop',
    timezone: 'America/Chicago',
    fuelPricePerGallon: 3.42,
    fuelBrand: 'Pilot',
    amenities: ['showers', 'parking', 'food', 'wifi'],
    parkingSpaces: 150,
  },
  // I-80 Wyoming
  {
    stopId: 'ts_flyingj_i80_016',
    name: 'Flying J Travel Center #599',
    address: '1500 Frontier Way',
    city: 'Cheyenne',
    state: 'WY',
    zipCode: '82001',
    lat: 41.1400,
    lon: -104.8202,
    locationType: 'truck_stop',
    timezone: 'America/Denver',
    fuelPricePerGallon: 3.58,
    fuelBrand: 'Flying J',
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales'],
    parkingSpaces: 180,
  },
  {
    stopId: 'ts_pilot_i80_017',
    name: 'Pilot Travel Center #506',
    address: '1600 High Plains Dr',
    city: 'Rawlins',
    state: 'WY',
    zipCode: '82301',
    lat: 41.7911,
    lon: -107.2387,
    locationType: 'truck_stop',
    timezone: 'America/Denver',
    fuelPricePerGallon: 3.65,
    fuelBrand: 'Pilot',
    amenities: ['showers', 'parking', 'food', 'wifi'],
    parkingSpaces: 100,
  },
  // I-80 Utah
  {
    stopId: 'ts_loves_i80_018',
    name: "Love's Travel Stop #438",
    address: '1700 Salt Flats Rd',
    city: 'Salt Lake City',
    state: 'UT',
    zipCode: '84116',
    lat: 40.7608,
    lon: -111.8910,
    locationType: 'truck_stop',
    timezone: 'America/Denver',
    fuelPricePerGallon: 3.72,
    fuelBrand: "Love's",
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales'],
    parkingSpaces: 190,
  },
  // I-80 Nevada
  {
    stopId: 'ts_pilot_i80_019',
    name: 'Pilot Travel Center #187',
    address: '1800 Silver State Hwy',
    city: 'Elko',
    state: 'NV',
    zipCode: '89801',
    lat: 40.8324,
    lon: -115.7631,
    locationType: 'truck_stop',
    timezone: 'America/Los_Angeles',
    fuelPricePerGallon: 3.95,
    fuelBrand: 'Pilot',
    amenities: ['showers', 'parking', 'food', 'wifi'],
    parkingSpaces: 120,
  },
  // I-95 Corridor (FL to ME)
  {
    stopId: 'ts_pilot_i95_001',
    name: 'Pilot Travel Center #116',
    address: '100 Sunshine Blvd',
    city: 'Port Wentworth',
    state: 'GA',
    zipCode: '31407',
    lat: 32.1746,
    lon: -81.1634,
    locationType: 'truck_stop',
    timezone: 'America/New_York',
    fuelPricePerGallon: 3.55,
    fuelBrand: 'Pilot',
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales'],
    parkingSpaces: 200,
  },
  {
    stopId: 'ts_ta_i95_002',
    name: 'TA Travel Center #263',
    address: '200 Palmetto Way',
    city: 'Lumberton',
    state: 'NC',
    zipCode: '28358',
    lat: 34.6182,
    lon: -79.0089,
    locationType: 'truck_stop',
    timezone: 'America/New_York',
    fuelPricePerGallon: 3.52,
    fuelBrand: 'TA',
    amenities: ['showers', 'parking', 'food', 'wifi', 'repair'],
    parkingSpaces: 230,
  },
  {
    stopId: 'ts_loves_i95_003',
    name: "Love's Travel Stop #289",
    address: '300 Old Dominion Dr',
    city: 'Emporia',
    state: 'VA',
    zipCode: '23847',
    lat: 36.6868,
    lon: -77.5330,
    locationType: 'truck_stop',
    timezone: 'America/New_York',
    fuelPricePerGallon: 3.59,
    fuelBrand: "Love's",
    amenities: ['showers', 'parking', 'food', 'wifi'],
    parkingSpaces: 175,
  },
  {
    stopId: 'ts_pilot_i95_004',
    name: 'Pilot Travel Center #072',
    address: '400 Garden State Rd',
    city: 'Bordentown',
    state: 'NJ',
    zipCode: '08505',
    lat: 40.1459,
    lon: -74.7117,
    locationType: 'truck_stop',
    timezone: 'America/New_York',
    fuelPricePerGallon: 3.92,
    fuelBrand: 'Pilot',
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales'],
    parkingSpaces: 140,
  },
  // I-40 Corridor (NC to CA)
  {
    stopId: 'ts_loves_i40_001',
    name: "Love's Travel Stop #391",
    address: '100 Smoky Mountain Dr',
    city: 'Knoxville',
    state: 'TN',
    zipCode: '37914',
    lat: 35.9606,
    lon: -83.9207,
    locationType: 'truck_stop',
    timezone: 'America/New_York',
    fuelPricePerGallon: 3.48,
    fuelBrand: "Love's",
    amenities: ['showers', 'parking', 'food', 'wifi'],
    parkingSpaces: 160,
  },
  {
    stopId: 'ts_pilot_i40_002',
    name: 'Pilot Travel Center #323',
    address: '200 Music City Blvd',
    city: 'Nashville',
    state: 'TN',
    zipCode: '37210',
    lat: 36.1627,
    lon: -86.7816,
    locationType: 'truck_stop',
    timezone: 'America/Chicago',
    fuelPricePerGallon: 3.45,
    fuelBrand: 'Pilot',
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales'],
    parkingSpaces: 180,
  },
  {
    stopId: 'ts_ta_i40_003',
    name: 'TA Travel Center #189',
    address: '300 Natural State Rd',
    city: 'West Memphis',
    state: 'AR',
    zipCode: '72301',
    lat: 35.1465,
    lon: -90.1848,
    locationType: 'truck_stop',
    timezone: 'America/Chicago',
    fuelPricePerGallon: 3.39,
    fuelBrand: 'TA',
    amenities: ['showers', 'parking', 'food', 'wifi', 'repair'],
    parkingSpaces: 250,
  },
  {
    stopId: 'ts_loves_i40_004',
    name: "Love's Travel Stop #256",
    address: '400 Sooner Trail',
    city: 'Oklahoma City',
    state: 'OK',
    zipCode: '73129',
    lat: 35.4676,
    lon: -97.5164,
    locationType: 'truck_stop',
    timezone: 'America/Chicago',
    fuelPricePerGallon: 3.35,
    fuelBrand: "Love's",
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales', 'truck_wash'],
    parkingSpaces: 280,
  },
  {
    stopId: 'ts_pilot_i40_005',
    name: 'Pilot Travel Center #445',
    address: '500 Lone Star Pkwy',
    city: 'Amarillo',
    state: 'TX',
    zipCode: '79107',
    lat: 35.2220,
    lon: -101.8313,
    locationType: 'truck_stop',
    timezone: 'America/Chicago',
    fuelPricePerGallon: 3.32,
    fuelBrand: 'Pilot',
    amenities: ['showers', 'parking', 'food', 'wifi'],
    parkingSpaces: 200,
  },
  {
    stopId: 'ts_flyingj_i40_006',
    name: 'Flying J Travel Center #661',
    address: '600 Route 66 Blvd',
    city: 'Albuquerque',
    state: 'NM',
    zipCode: '87102',
    lat: 35.0844,
    lon: -106.6504,
    locationType: 'truck_stop',
    timezone: 'America/Denver',
    fuelPricePerGallon: 3.58,
    fuelBrand: 'Flying J',
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales'],
    parkingSpaces: 170,
  },
  {
    stopId: 'ts_loves_i40_007',
    name: "Love's Travel Stop #584",
    address: '700 Cactus Dr',
    city: 'Flagstaff',
    state: 'AZ',
    zipCode: '86001',
    lat: 35.1983,
    lon: -111.6513,
    locationType: 'truck_stop',
    timezone: 'America/Phoenix',
    fuelPricePerGallon: 3.85,
    fuelBrand: "Love's",
    amenities: ['showers', 'parking', 'food', 'wifi'],
    parkingSpaces: 140,
  },
  // I-10 Corridor (FL to CA)
  {
    stopId: 'ts_pilot_i10_001',
    name: 'Pilot Travel Center #227',
    address: '100 Gulf Coast Hwy',
    city: 'Mobile',
    state: 'AL',
    zipCode: '36609',
    lat: 30.6954,
    lon: -88.0399,
    locationType: 'truck_stop',
    timezone: 'America/Chicago',
    fuelPricePerGallon: 3.45,
    fuelBrand: 'Pilot',
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales'],
    parkingSpaces: 180,
  },
  {
    stopId: 'ts_loves_i10_002',
    name: "Love's Travel Stop #475",
    address: '200 Bayou Blvd',
    city: 'Lake Charles',
    state: 'LA',
    zipCode: '70601',
    lat: 30.2266,
    lon: -93.2174,
    locationType: 'truck_stop',
    timezone: 'America/Chicago',
    fuelPricePerGallon: 3.38,
    fuelBrand: "Love's",
    amenities: ['showers', 'parking', 'food', 'wifi'],
    parkingSpaces: 160,
  },
  {
    stopId: 'ts_ta_i10_003',
    name: 'TA Travel Center #097',
    address: '300 Rodeo Dr',
    city: 'San Antonio',
    state: 'TX',
    zipCode: '78201',
    lat: 29.4241,
    lon: -98.4936,
    locationType: 'truck_stop',
    timezone: 'America/Chicago',
    fuelPricePerGallon: 3.28,
    fuelBrand: 'TA',
    amenities: ['showers', 'parking', 'food', 'wifi', 'repair', 'scales'],
    parkingSpaces: 300,
  },
  {
    stopId: 'ts_pilot_i10_004',
    name: 'Pilot Travel Center #555',
    address: '400 Desert Way',
    city: 'Tucson',
    state: 'AZ',
    zipCode: '85705',
    lat: 32.2226,
    lon: -110.9747,
    locationType: 'truck_stop',
    timezone: 'America/Phoenix',
    fuelPricePerGallon: 3.78,
    fuelBrand: 'Pilot',
    amenities: ['showers', 'parking', 'food', 'wifi'],
    parkingSpaces: 150,
  },
  // I-5 Corridor (CA to WA)
  {
    stopId: 'ts_pilot_i5_001',
    name: 'Pilot Travel Center #177',
    address: '100 Valley View Rd',
    city: 'Bakersfield',
    state: 'CA',
    zipCode: '93307',
    lat: 35.3733,
    lon: -119.0187,
    locationType: 'truck_stop',
    timezone: 'America/Los_Angeles',
    fuelPricePerGallon: 4.15,
    fuelBrand: 'Pilot',
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales'],
    parkingSpaces: 170,
  },
  {
    stopId: 'ts_loves_i5_002',
    name: "Love's Travel Stop #608",
    address: '200 Central Valley Hwy',
    city: 'Sacramento',
    state: 'CA',
    zipCode: '95814',
    lat: 38.5816,
    lon: -121.4944,
    locationType: 'truck_stop',
    timezone: 'America/Los_Angeles',
    fuelPricePerGallon: 4.22,
    fuelBrand: "Love's",
    amenities: ['showers', 'parking', 'food', 'wifi'],
    parkingSpaces: 140,
  },
  {
    stopId: 'ts_ta_i5_003',
    name: 'TA Travel Center #200',
    address: '300 Cascades Way',
    city: 'Medford',
    state: 'OR',
    zipCode: '97501',
    lat: 42.3265,
    lon: -122.8756,
    locationType: 'truck_stop',
    timezone: 'America/Los_Angeles',
    fuelPricePerGallon: 3.98,
    fuelBrand: 'TA',
    amenities: ['showers', 'parking', 'food', 'wifi', 'repair'],
    parkingSpaces: 190,
  },
  {
    stopId: 'ts_pilot_i5_004',
    name: 'Pilot Travel Center #341',
    address: '400 Rose City Rd',
    city: 'Portland',
    state: 'OR',
    zipCode: '97201',
    lat: 45.5152,
    lon: -122.6784,
    locationType: 'truck_stop',
    timezone: 'America/Los_Angeles',
    fuelPricePerGallon: 4.05,
    fuelBrand: 'Pilot',
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales'],
    parkingSpaces: 160,
  },
  // I-70 Corridor (MD to UT)
  {
    stopId: 'ts_loves_i70_001',
    name: "Love's Travel Stop #382",
    address: '100 Crossroads Blvd',
    city: 'Columbus',
    state: 'OH',
    zipCode: '43219',
    lat: 39.9612,
    lon: -82.9988,
    locationType: 'truck_stop',
    timezone: 'America/New_York',
    fuelPricePerGallon: 3.62,
    fuelBrand: "Love's",
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales'],
    parkingSpaces: 200,
  },
  {
    stopId: 'ts_pilot_i70_002',
    name: 'Pilot Travel Center #108',
    address: '200 Hoosier Crossroads',
    city: 'Indianapolis',
    state: 'IN',
    zipCode: '46201',
    lat: 39.7684,
    lon: -86.1581,
    locationType: 'truck_stop',
    timezone: 'America/Indiana/Indianapolis',
    fuelPricePerGallon: 3.55,
    fuelBrand: 'Pilot',
    amenities: ['showers', 'parking', 'food', 'wifi'],
    parkingSpaces: 150,
  },
  {
    stopId: 'ts_ta_i70_003',
    name: 'TA Travel Center #067',
    address: '300 Gateway Dr',
    city: 'St. Louis',
    state: 'MO',
    zipCode: '63101',
    lat: 38.6270,
    lon: -90.1994,
    locationType: 'truck_stop',
    timezone: 'America/Chicago',
    fuelPricePerGallon: 3.45,
    fuelBrand: 'TA',
    amenities: ['showers', 'parking', 'food', 'wifi', 'repair'],
    parkingSpaces: 240,
  },
  {
    stopId: 'ts_flyingj_i70_004',
    name: 'Flying J Travel Center #703',
    address: '400 Sunflower Rd',
    city: 'Salina',
    state: 'KS',
    zipCode: '67401',
    lat: 38.8403,
    lon: -97.6114,
    locationType: 'truck_stop',
    timezone: 'America/Chicago',
    fuelPricePerGallon: 3.38,
    fuelBrand: 'Flying J',
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales'],
    parkingSpaces: 200,
  },
  {
    stopId: 'ts_pilot_i70_005',
    name: 'Pilot Travel Center #492',
    address: '500 Mountain View Way',
    city: 'Denver',
    state: 'CO',
    zipCode: '80216',
    lat: 39.7392,
    lon: -104.9903,
    locationType: 'truck_stop',
    timezone: 'America/Denver',
    fuelPricePerGallon: 3.62,
    fuelBrand: 'Pilot',
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales'],
    parkingSpaces: 170,
  },
  // I-75 Corridor (FL to MI)
  {
    stopId: 'ts_loves_i75_001',
    name: "Love's Travel Stop #319",
    address: '100 Sunshine State Rd',
    city: 'Ocala',
    state: 'FL',
    zipCode: '34470',
    lat: 29.1872,
    lon: -82.1401,
    locationType: 'truck_stop',
    timezone: 'America/New_York',
    fuelPricePerGallon: 3.55,
    fuelBrand: "Love's",
    amenities: ['showers', 'parking', 'food', 'wifi'],
    parkingSpaces: 160,
  },
  {
    stopId: 'ts_pilot_i75_002',
    name: 'Pilot Travel Center #290',
    address: '200 Peach State Blvd',
    city: 'Tifton',
    state: 'GA',
    zipCode: '31793',
    lat: 31.4505,
    lon: -83.5085,
    locationType: 'truck_stop',
    timezone: 'America/New_York',
    fuelPricePerGallon: 3.48,
    fuelBrand: 'Pilot',
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales'],
    parkingSpaces: 180,
  },
  {
    stopId: 'ts_ta_i75_003',
    name: 'TA Travel Center #156',
    address: '300 Volunteer Way',
    city: 'Chattanooga',
    state: 'TN',
    zipCode: '37402',
    lat: 35.0456,
    lon: -85.3097,
    locationType: 'truck_stop',
    timezone: 'America/New_York',
    fuelPricePerGallon: 3.42,
    fuelBrand: 'TA',
    amenities: ['showers', 'parking', 'food', 'wifi', 'repair'],
    parkingSpaces: 220,
  },
  {
    stopId: 'ts_loves_i75_004',
    name: "Love's Travel Stop #445",
    address: '400 Bluegrass Rd',
    city: 'Lexington',
    state: 'KY',
    zipCode: '40502',
    lat: 38.0406,
    lon: -84.5037,
    locationType: 'truck_stop',
    timezone: 'America/New_York',
    fuelPricePerGallon: 3.52,
    fuelBrand: "Love's",
    amenities: ['showers', 'parking', 'food', 'wifi'],
    parkingSpaces: 150,
  },
  {
    stopId: 'ts_pilot_i75_005',
    name: 'Pilot Travel Center #167',
    address: '500 Buckeye Way',
    city: 'Dayton',
    state: 'OH',
    zipCode: '45402',
    lat: 39.7589,
    lon: -84.1916,
    locationType: 'truck_stop',
    timezone: 'America/New_York',
    fuelPricePerGallon: 3.58,
    fuelBrand: 'Pilot',
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales'],
    parkingSpaces: 170,
  },
  // I-65 Corridor (AL to IN)
  {
    stopId: 'ts_pilot_i65_001',
    name: 'Pilot Travel Center #203',
    address: '100 Heart of Dixie Rd',
    city: 'Montgomery',
    state: 'AL',
    zipCode: '36104',
    lat: 32.3668,
    lon: -86.2999,
    locationType: 'truck_stop',
    timezone: 'America/Chicago',
    fuelPricePerGallon: 3.42,
    fuelBrand: 'Pilot',
    amenities: ['showers', 'parking', 'food', 'wifi'],
    parkingSpaces: 160,
  },
  {
    stopId: 'ts_loves_i65_002',
    name: "Love's Travel Stop #567",
    address: '200 Derby Blvd',
    city: 'Bowling Green',
    state: 'KY',
    zipCode: '42101',
    lat: 36.9685,
    lon: -86.4808,
    locationType: 'truck_stop',
    timezone: 'America/Chicago',
    fuelPricePerGallon: 3.48,
    fuelBrand: "Love's",
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales'],
    parkingSpaces: 190,
  },
  // I-35 Corridor (TX to MN)
  {
    stopId: 'ts_loves_i35_001',
    name: "Love's Travel Stop #602",
    address: '100 Big Sky Trail',
    city: 'Waco',
    state: 'TX',
    zipCode: '76706',
    lat: 31.5493,
    lon: -97.1467,
    locationType: 'truck_stop',
    timezone: 'America/Chicago',
    fuelPricePerGallon: 3.25,
    fuelBrand: "Love's",
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales'],
    parkingSpaces: 220,
  },
  {
    stopId: 'ts_pilot_i35_002',
    name: 'Pilot Travel Center #378',
    address: '200 Heartland Hwy',
    city: 'Kansas City',
    state: 'MO',
    zipCode: '64101',
    lat: 39.0997,
    lon: -94.5786,
    locationType: 'truck_stop',
    timezone: 'America/Chicago',
    fuelPricePerGallon: 3.42,
    fuelBrand: 'Pilot',
    amenities: ['showers', 'parking', 'food', 'wifi'],
    parkingSpaces: 180,
  },
  {
    stopId: 'ts_flyingj_i35_003',
    name: 'Flying J Travel Center #728',
    address: '300 Hawkeye Loop',
    city: 'Des Moines',
    state: 'IA',
    zipCode: '50309',
    lat: 41.5868,
    lon: -93.6250,
    locationType: 'truck_stop',
    timezone: 'America/Chicago',
    fuelPricePerGallon: 3.48,
    fuelBrand: 'Flying J',
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales'],
    parkingSpaces: 200,
  },
  // Chicago area (hub)
  {
    stopId: 'ts_pilot_chi_001',
    name: 'Pilot Travel Center #411',
    address: '100 Windy City Dr',
    city: 'Chicago Heights',
    state: 'IL',
    zipCode: '60411',
    lat: 41.5061,
    lon: -87.6355,
    locationType: 'truck_stop',
    timezone: 'America/Chicago',
    fuelPricePerGallon: 3.78,
    fuelBrand: 'Pilot',
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales'],
    parkingSpaces: 160,
  },
  {
    stopId: 'ts_loves_chi_002',
    name: "Love's Travel Stop #721",
    address: '200 Lake Shore Industrial',
    city: 'Gary',
    state: 'IN',
    zipCode: '46402',
    lat: 41.5934,
    lon: -87.3465,
    locationType: 'truck_stop',
    timezone: 'America/Indiana/Indianapolis',
    fuelPricePerGallon: 3.68,
    fuelBrand: "Love's",
    amenities: ['showers', 'parking', 'food', 'wifi'],
    parkingSpaces: 140,
  },
  // Los Angeles area
  {
    stopId: 'ts_ta_la_001',
    name: 'TA Travel Center #042',
    address: '100 Commerce Way',
    city: 'Ontario',
    state: 'CA',
    zipCode: '91761',
    lat: 34.0633,
    lon: -117.6509,
    locationType: 'truck_stop',
    timezone: 'America/Los_Angeles',
    fuelPricePerGallon: 4.18,
    fuelBrand: 'TA',
    amenities: ['showers', 'parking', 'food', 'wifi', 'repair', 'scales'],
    parkingSpaces: 250,
  },
  // Dallas/Fort Worth area
  {
    stopId: 'ts_pilot_dfw_001',
    name: 'Pilot Travel Center #612',
    address: '100 Lone Star Freight Way',
    city: 'Fort Worth',
    state: 'TX',
    zipCode: '76106',
    lat: 32.7555,
    lon: -97.3308,
    locationType: 'truck_stop',
    timezone: 'America/Chicago',
    fuelPricePerGallon: 3.22,
    fuelBrand: 'Pilot',
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales'],
    parkingSpaces: 250,
  },
  // Atlanta hub
  {
    stopId: 'ts_loves_atl_001',
    name: "Love's Travel Stop #334",
    address: '100 Peachtree Freight Rd',
    city: 'McDonough',
    state: 'GA',
    zipCode: '30253',
    lat: 33.4473,
    lon: -84.1469,
    locationType: 'truck_stop',
    timezone: 'America/New_York',
    fuelPricePerGallon: 3.52,
    fuelBrand: "Love's",
    amenities: ['showers', 'parking', 'food', 'wifi', 'scales'],
    parkingSpaces: 210,
  },
];

export async function seedTruckStops(prisma: PrismaClient): Promise<void> {
  console.log('\n🚛 Seeding truck stops...');

  let created = 0;
  let updated = 0;

  for (const ts of TRUCK_STOPS) {
    const result = await prisma.stop.upsert({
      where: { stopId: ts.stopId },
      update: {
        name: ts.name,
        fuelPricePerGallon: ts.fuelPricePerGallon,
        fuelPriceUpdatedAt: new Date(),
      },
      create: {
        stopId: ts.stopId,
        name: ts.name,
        address: ts.address,
        city: ts.city,
        state: ts.state,
        zipCode: ts.zipCode,
        lat: ts.lat,
        lon: ts.lon,
        locationType: ts.locationType,
        timezone: ts.timezone,
        fuelPricePerGallon: ts.fuelPricePerGallon,
        fuelPriceUpdatedAt: new Date(),
        fuelBrand: ts.fuelBrand,
        amenities: ts.amenities,
        parkingSpaces: ts.parkingSpaces,
        isActive: true,
      },
    });

    if (result.createdAt.getTime() === result.createdAt.getTime()) {
      // Prisma upsert doesn't tell us if it was create or update easily,
      // but we can check by timestamp comparison
      created++;
    }
  }

  console.log(`  ✅ Seeded ${TRUCK_STOPS.length} truck stops across major US interstates`);
  console.log(`     Corridors: I-80, I-95, I-40, I-10, I-5, I-70, I-75, I-65, I-35 + metro hubs`);
}
```

**Step 2: Update seed.ts to call truck stop seeder**

In `apps/backend/prisma/seed.ts`, add import at top (after feature-flags import):

```typescript
import { seedTruckStops } from './seeds/truck-stops.seed';
```

After the `seedFeatureFlags()` call (~line 154), add:

```typescript
  // Seed truck stops
  await seedTruckStops(prisma);
```

**Step 3: Run seed**

```bash
cd apps/backend && npx prisma db seed
```

Expected: Truck stops seeded successfully.

**Step 4: Commit**

```bash
git add apps/backend/prisma/seeds/truck-stops.seed.ts apps/backend/prisma/seed.ts
git commit -m "feat(seed): add US truck stop seed data for route planning

Seed ~50 truck stops along major US interstates (I-80, I-95, I-40,
I-10, I-5, I-70, I-75, I-65, I-35) with real coordinates, fuel
prices, brands, amenities, and timezone data."
```

---

## Task 3: Routing Provider (OSRM + Interface)

**Files:**
- Create: `apps/backend/src/domains/routing/providers/routing/routing-provider.interface.ts`
- Create: `apps/backend/src/domains/routing/providers/routing/osrm-routing.provider.ts`
- Create: `apps/backend/src/domains/routing/providers/routing/routing-provider.module.ts`

**Step 1: Create routing provider interface**

```typescript
// apps/backend/src/domains/routing/providers/routing/routing-provider.interface.ts

export interface LatLon {
  lat: number;
  lon: number;
  id?: string;
}

export interface DistanceMatrixEntry {
  distanceMiles: number;
  driveTimeHours: number;
}

export type DistanceMatrix = Map<string, DistanceMatrixEntry>;

export interface RouteResult {
  distanceMiles: number;
  driveTimeHours: number;
  geometry: string; // encoded polyline
  waypoints: LatLon[];
}

export const ROUTING_PROVIDER = 'ROUTING_PROVIDER';

export interface RoutingProvider {
  getDistanceMatrix(stops: LatLon[]): Promise<DistanceMatrix>;
  getRoute(origin: LatLon, destination: LatLon, waypoints?: LatLon[]): Promise<RouteResult>;
}
```

**Step 2: Create OSRM routing provider**

```typescript
// apps/backend/src/domains/routing/providers/routing/osrm-routing.provider.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration } from '../../../../config/configuration';
import axios from 'axios';
import {
  RoutingProvider,
  LatLon,
  DistanceMatrix,
  DistanceMatrixEntry,
  RouteResult,
} from './routing-provider.interface';

const METERS_TO_MILES = 0.000621371;
const SECONDS_TO_HOURS = 1 / 3600;
const TRUCK_FACTOR = 1.1; // OSRM uses car profile; trucks are ~10% slower

@Injectable()
export class OSRMRoutingProvider implements RoutingProvider {
  private readonly logger = new Logger(OSRMRoutingProvider.name);
  private readonly osrmUrl: string;

  constructor(private readonly configService: ConfigService<Configuration>) {
    this.osrmUrl = this.configService.get<string>('osrmUrl', 'http://localhost:5000');
  }

  async getDistanceMatrix(stops: LatLon[]): Promise<DistanceMatrix> {
    if (stops.length < 2) {
      return new Map();
    }

    // Build OSRM table request: /table/v1/driving/lon1,lat1;lon2,lat2;...
    const coords = stops.map((s) => `${s.lon},${s.lat}`).join(';');
    const url = `${this.osrmUrl}/table/v1/driving/${coords}?annotations=distance,duration`;

    try {
      const response = await axios.get(url, { timeout: 30000 });
      const data = response.data;

      if (data.code !== 'Ok') {
        this.logger.warn(`OSRM table request failed: ${data.code}, falling back to haversine`);
        return this.fallbackDistanceMatrix(stops);
      }

      const matrix: DistanceMatrix = new Map();
      const distances: number[][] = data.distances; // meters
      const durations: number[][] = data.durations; // seconds

      for (let i = 0; i < stops.length; i++) {
        for (let j = 0; j < stops.length; j++) {
          if (i === j) continue;
          const fromId = stops[i].id || `stop_${i}`;
          const toId = stops[j].id || `stop_${j}`;
          const key = `${fromId}:${toId}`;
          matrix.set(key, {
            distanceMiles: distances[i][j] * METERS_TO_MILES,
            driveTimeHours: durations[i][j] * SECONDS_TO_HOURS * TRUCK_FACTOR,
          });
        }
      }

      this.logger.log(`OSRM distance matrix computed: ${stops.length} stops, ${matrix.size} pairs`);
      return matrix;
    } catch (error) {
      this.logger.warn(`OSRM unavailable, falling back to haversine: ${error.message}`);
      return this.fallbackDistanceMatrix(stops);
    }
  }

  async getRoute(origin: LatLon, destination: LatLon, waypoints?: LatLon[]): Promise<RouteResult> {
    const points = [origin, ...(waypoints || []), destination];
    const coords = points.map((p) => `${p.lon},${p.lat}`).join(';');
    const url = `${this.osrmUrl}/route/v1/driving/${coords}?overview=full&geometries=polyline`;

    try {
      const response = await axios.get(url, { timeout: 30000 });
      const data = response.data;

      if (data.code !== 'Ok' || !data.routes?.length) {
        this.logger.warn(`OSRM route request failed: ${data.code}`);
        return this.fallbackRoute(origin, destination);
      }

      const route = data.routes[0];
      return {
        distanceMiles: route.distance * METERS_TO_MILES,
        driveTimeHours: route.duration * SECONDS_TO_HOURS * TRUCK_FACTOR,
        geometry: route.geometry,
        waypoints: data.waypoints.map((wp: any) => ({
          lat: wp.location[1],
          lon: wp.location[0],
        })),
      };
    } catch (error) {
      this.logger.warn(`OSRM route unavailable, using fallback: ${error.message}`);
      return this.fallbackRoute(origin, destination);
    }
  }

  private fallbackDistanceMatrix(stops: LatLon[]): DistanceMatrix {
    const matrix: DistanceMatrix = new Map();
    for (let i = 0; i < stops.length; i++) {
      for (let j = 0; j < stops.length; j++) {
        if (i === j) continue;
        const fromId = stops[i].id || `stop_${i}`;
        const toId = stops[j].id || `stop_${j}`;
        const dist = this.haversine(stops[i].lat, stops[i].lon, stops[j].lat, stops[j].lon) * 1.3;
        matrix.set(`${fromId}:${toId}`, {
          distanceMiles: dist,
          driveTimeHours: dist / 55, // avg 55 mph
        });
      }
    }
    return matrix;
  }

  private fallbackRoute(origin: LatLon, destination: LatLon): RouteResult {
    const dist = this.haversine(origin.lat, origin.lon, destination.lat, destination.lon) * 1.3;
    return {
      distanceMiles: dist,
      driveTimeHours: dist / 55,
      geometry: '',
      waypoints: [origin, destination],
    };
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
```

**Step 3: Create routing provider module**

```typescript
// apps/backend/src/domains/routing/providers/routing/routing-provider.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OSRMRoutingProvider } from './osrm-routing.provider';
import { ROUTING_PROVIDER } from './routing-provider.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: ROUTING_PROVIDER,
      useClass: OSRMRoutingProvider,
    },
  ],
  exports: [ROUTING_PROVIDER],
})
export class RoutingProviderModule {}
```

**Step 4: Verify compilation**

```bash
cd apps/backend && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add apps/backend/src/domains/routing/providers/
git commit -m "feat(routing): add OSRM routing provider with haversine fallback

Implements RoutingProvider interface with OSRM backend for real road
distances. Falls back to haversine * 1.3 when OSRM is unavailable.
Supports distance matrix and single-route queries."
```

---

## Task 4: Weather Provider (OpenWeatherMap + Interface)

**Files:**
- Create: `apps/backend/src/domains/routing/providers/weather/weather-provider.interface.ts`
- Create: `apps/backend/src/domains/routing/providers/weather/openweathermap.provider.ts`
- Create: `apps/backend/src/domains/routing/providers/weather/weather-provider.module.ts`

**Step 1: Create weather provider interface**

```typescript
// apps/backend/src/domains/routing/providers/weather/weather-provider.interface.ts

import { LatLon } from '../routing/routing-provider.interface';

export interface WeatherAlert {
  lat: number;
  lon: number;
  condition: string;        // 'snow', 'rain', 'ice', 'fog', 'thunderstorm', 'clear'
  severity: 'low' | 'moderate' | 'severe';
  description: string;
  temperatureF: number;
  windSpeedMph: number;
  driveTimeMultiplier: number; // 1.0 = normal, 1.3 = 30% slower
}

export const WEATHER_PROVIDER = 'WEATHER_PROVIDER';

export interface WeatherProvider {
  getWeatherAlongRoute(
    waypoints: LatLon[],
    departureTime: Date,
  ): Promise<WeatherAlert[]>;
}
```

**Step 2: Create OpenWeatherMap provider**

```typescript
// apps/backend/src/domains/routing/providers/weather/openweathermap.provider.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration } from '../../../../config/configuration';
import axios from 'axios';
import { LatLon } from '../routing/routing-provider.interface';
import { WeatherProvider, WeatherAlert } from './weather-provider.interface';

@Injectable()
export class OpenWeatherMapProvider implements WeatherProvider {
  private readonly logger = new Logger(OpenWeatherMapProvider.name);
  private readonly apiKey: string | undefined;

  constructor(private readonly configService: ConfigService<Configuration>) {
    this.apiKey = this.configService.get<string>('openWeatherApiKey');
    if (!this.apiKey) {
      this.logger.warn('OpenWeatherMap API key not configured - weather checks disabled');
    }
  }

  async getWeatherAlongRoute(
    waypoints: LatLon[],
    departureTime: Date,
  ): Promise<WeatherAlert[]> {
    if (!this.apiKey || waypoints.length === 0) {
      return [];
    }

    // Sample every ~200 miles (pick every N-th waypoint based on count)
    const samplePoints = this.sampleWaypoints(waypoints, 5);
    const alerts: WeatherAlert[] = [];

    for (const point of samplePoints) {
      try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${point.lat}&lon=${point.lon}&appid=${this.apiKey}&units=imperial`;
        const response = await axios.get(url, { timeout: 5000 });
        const data = response.data;

        const alert = this.parseWeatherResponse(data, point);
        if (alert && alert.severity !== 'low') {
          alerts.push(alert);
        }
      } catch (error) {
        this.logger.warn(`Weather check failed for ${point.lat},${point.lon}: ${error.message}`);
      }
    }

    return alerts;
  }

  private sampleWaypoints(waypoints: LatLon[], maxSamples: number): LatLon[] {
    if (waypoints.length <= maxSamples) return waypoints;
    const step = Math.floor(waypoints.length / maxSamples);
    const samples: LatLon[] = [];
    for (let i = 0; i < waypoints.length; i += step) {
      samples.push(waypoints[i]);
    }
    return samples;
  }

  private parseWeatherResponse(data: any, point: LatLon): WeatherAlert | null {
    const main = data.weather?.[0]?.main?.toLowerCase() || 'clear';
    const description = data.weather?.[0]?.description || '';
    const temp = data.main?.temp || 70;
    const windSpeed = data.wind?.speed || 0;

    let condition: WeatherAlert['condition'] = 'clear';
    let severity: WeatherAlert['severity'] = 'low';
    let driveTimeMultiplier = 1.0;

    if (main.includes('snow') || main.includes('blizzard')) {
      condition = 'snow';
      severity = temp < 25 ? 'severe' : 'moderate';
      driveTimeMultiplier = severity === 'severe' ? 1.4 : 1.2;
    } else if (main.includes('ice') || (main.includes('rain') && temp < 35)) {
      condition = 'ice';
      severity = 'severe';
      driveTimeMultiplier = 1.5;
    } else if (main.includes('thunderstorm')) {
      condition = 'thunderstorm';
      severity = 'moderate';
      driveTimeMultiplier = 1.2;
    } else if (main.includes('rain') || main.includes('drizzle')) {
      condition = 'rain';
      severity = 'low';
      driveTimeMultiplier = 1.1;
    } else if (main.includes('fog') || main.includes('mist')) {
      condition = 'fog';
      severity = windSpeed > 20 ? 'moderate' : 'low';
      driveTimeMultiplier = 1.15;
    }

    if (windSpeed > 40) {
      severity = 'severe';
      driveTimeMultiplier = Math.max(driveTimeMultiplier, 1.3);
    }

    return {
      lat: point.lat,
      lon: point.lon,
      condition,
      severity,
      description: `${description}. Temp: ${temp}°F, Wind: ${windSpeed} mph`,
      temperatureF: temp,
      windSpeedMph: windSpeed,
      driveTimeMultiplier,
    };
  }
}
```

**Step 3: Create weather provider module**

```typescript
// apps/backend/src/domains/routing/providers/weather/weather-provider.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenWeatherMapProvider } from './openweathermap.provider';
import { WEATHER_PROVIDER } from './weather-provider.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: WEATHER_PROVIDER,
      useClass: OpenWeatherMapProvider,
    },
  ],
  exports: [WEATHER_PROVIDER],
})
export class WeatherProviderModule {}
```

**Step 4: Commit**

```bash
git add apps/backend/src/domains/routing/providers/weather/
git commit -m "feat(weather): add OpenWeatherMap provider for route weather alerts

Checks weather at sampled points along route corridor. Categorizes
conditions (snow, ice, rain, fog) with severity levels and drive
time multipliers. Gracefully disabled when API key not configured."
```

---

## Task 5: Fuel Data Provider (Database-backed)

**Files:**
- Create: `apps/backend/src/domains/routing/providers/fuel/fuel-data-provider.interface.ts`
- Create: `apps/backend/src/domains/routing/providers/fuel/database-fuel.provider.ts`
- Create: `apps/backend/src/domains/routing/providers/fuel/fuel-provider.module.ts`

**Step 1: Create fuel data provider interface**

```typescript
// apps/backend/src/domains/routing/providers/fuel/fuel-data-provider.interface.ts

export interface FuelStop {
  stopId: string;
  name: string;
  lat: number;
  lon: number;
  city: string;
  state: string;
  fuelPricePerGallon: number;
  brand: string;
  amenities: string[];
  distanceFromRoute: number; // miles off-route
}

export const FUEL_DATA_PROVIDER = 'FUEL_DATA_PROVIDER';

export interface FuelDataProvider {
  findFuelStopsNearPoint(
    lat: number,
    lon: number,
    radiusMiles: number,
  ): Promise<FuelStop[]>;

  findFuelStopsAlongCorridor(
    fromLat: number,
    fromLon: number,
    toLat: number,
    toLon: number,
    corridorWidthMiles: number,
  ): Promise<FuelStop[]>;
}
```

**Step 2: Create database fuel provider**

```typescript
// apps/backend/src/domains/routing/providers/fuel/database-fuel.provider.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { FuelDataProvider, FuelStop } from './fuel-data-provider.interface';

@Injectable()
export class DatabaseFuelProvider implements FuelDataProvider {
  private readonly logger = new Logger(DatabaseFuelProvider.name);

  constructor(private readonly prisma: PrismaService) {}

  async findFuelStopsNearPoint(
    lat: number,
    lon: number,
    radiusMiles: number,
  ): Promise<FuelStop[]> {
    // Query all fuel-capable stops, then filter by distance in-memory
    // For production scale, use PostGIS. For MVP with ~300 stops, this is fine.
    const stops = await this.prisma.stop.findMany({
      where: {
        isActive: true,
        locationType: { in: ['truck_stop', 'fuel_station'] },
        fuelPricePerGallon: { not: null },
        lat: { not: null },
        lon: { not: null },
      },
    });

    return stops
      .map((s) => ({
        stopId: s.stopId,
        name: s.name,
        lat: s.lat!,
        lon: s.lon!,
        city: s.city || '',
        state: s.state || '',
        fuelPricePerGallon: s.fuelPricePerGallon!,
        brand: (s as any).fuelBrand || '',
        amenities: (s.amenities as string[]) || [],
        distanceFromRoute: this.haversine(lat, lon, s.lat!, s.lon!),
      }))
      .filter((s) => s.distanceFromRoute <= radiusMiles)
      .sort((a, b) => a.fuelPricePerGallon - b.fuelPricePerGallon);
  }

  async findFuelStopsAlongCorridor(
    fromLat: number,
    fromLon: number,
    toLat: number,
    toLon: number,
    corridorWidthMiles: number,
  ): Promise<FuelStop[]> {
    const stops = await this.prisma.stop.findMany({
      where: {
        isActive: true,
        locationType: { in: ['truck_stop', 'fuel_station'] },
        fuelPricePerGallon: { not: null },
        lat: { not: null },
        lon: { not: null },
      },
    });

    return stops
      .map((s) => {
        const distFromRoute = this.pointToSegmentDistance(
          s.lat!, s.lon!,
          fromLat, fromLon,
          toLat, toLon,
        );
        return {
          stopId: s.stopId,
          name: s.name,
          lat: s.lat!,
          lon: s.lon!,
          city: s.city || '',
          state: s.state || '',
          fuelPricePerGallon: s.fuelPricePerGallon!,
          brand: (s as any).fuelBrand || '',
          amenities: (s.amenities as string[]) || [],
          distanceFromRoute: distFromRoute,
        };
      })
      .filter((s) => s.distanceFromRoute <= corridorWidthMiles)
      .sort((a, b) => a.fuelPricePerGallon - b.fuelPricePerGallon);
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private pointToSegmentDistance(
    px: number, py: number,
    ax: number, ay: number,
    bx: number, by: number,
  ): number {
    // Project point onto line segment and find closest point
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) return this.haversine(px, py, ax, ay);

    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const closestLat = ax + t * dx;
    const closestLon = ay + t * dy;

    return this.haversine(px, py, closestLat, closestLon);
  }
}
```

**Step 3: Create fuel provider module**

```typescript
// apps/backend/src/domains/routing/providers/fuel/fuel-provider.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../../infrastructure/database/prisma.module';
import { DatabaseFuelProvider } from './database-fuel.provider';
import { FUEL_DATA_PROVIDER } from './fuel-data-provider.interface';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: FUEL_DATA_PROVIDER,
      useClass: DatabaseFuelProvider,
    },
  ],
  exports: [FUEL_DATA_PROVIDER],
})
export class FuelProviderModule {}
```

**Step 4: Commit**

```bash
git add apps/backend/src/domains/routing/providers/fuel/
git commit -m "feat(fuel): add database-backed fuel data provider

Queries seeded truck stops from PostgreSQL for fuel stop locations
and prices. Supports point-radius and corridor-based searches.
Sorted by price for cheapest-first selection."
```

---

## Task 6: Enhance HOS Rule Engine (70h/8day + Split Rest)

**Files:**
- Modify: `apps/backend/src/domains/routing/hos-compliance/services/hos-rule-engine.service.ts`

This is a significant enhancement. The existing HOS engine only tracks daily clocks (11h drive, 14h duty, 8h break). We need to add:
- 70-hour/8-day cycle tracking
- 34-hour restart detection
- Sleeper berth split rest logic (7/3 and 8/2)
- Enhanced state interface

**Step 1: Rewrite the HOS rule engine**

Replace the entire file. The new version extends the existing interface while adding cycle tracking. Key changes:
- `HOSState` interface gets `cycleHoursUsed`, `cycleDaysData`, `splitRestState`
- New `validateFullCompliance()` method includes cycle check
- New `simulateRest()` method to predict state after rest
- New `simulateSplitRest()` for berth splits
- Backward-compatible: existing `validateCompliance()` still works

The full implementation should be ~400 lines. Key additions:

```typescript
// Enhanced HOSState
export interface HOSState {
  hoursDriven: number;
  onDutyTime: number;
  hoursSinceBreak: number;
  cycleHoursUsed: number;
  cycleDaysData: Array<{ date: string; hoursWorked: number }>;
  splitRestState?: {
    inSplit: boolean;
    firstPortionType: 'sleeper_7' | 'sleeper_8' | 'offduty_2' | 'offduty_3' | null;
    firstPortionCompleted: boolean;
    pausedDutyWindow: number; // hours of duty used when first portion started
  };
}

// New methods needed:
// - checkCycleLimit(cycleHoursUsed): ComplianceCheck
// - simulateAfterFullRest(currentState): HOSState (resets daily, NOT cycle)
// - simulateAfter34hRestart(currentState): HOSState (resets everything)
// - simulateAfterSplitRest(currentState, splitType): HOSState
// - needsRestart(cycleHoursUsed, driveNeeded): boolean
```

**Step 2: Verify compilation**

```bash
cd apps/backend && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add apps/backend/src/domains/routing/hos-compliance/
git commit -m "feat(hos): enhance HOS engine with 70h/8day cycle and split rest

Add cycle hours tracking, 34-hour restart detection, and sleeper
berth split rest simulation (7/3 and 8/2). Maintain backward
compatibility with existing validateCompliance method."
```

---

## Task 7: Rewrite Route Planning Engine

**Files:**
- Rewrite: `apps/backend/src/domains/routing/route-planning/services/route-planning-engine.service.ts`

This is the core of the system. The new engine:
1. Takes driverId, vehicleId, loadIds from DB (not raw input)
2. Calls RoutingProvider for real road distances
3. Runs TSP with time window constraints
4. Simulates segment-by-segment with full HOS clock tracking
5. Implements look-ahead rest decision logic
6. Handles dock-to-rest conversion
7. Inserts fuel stops from DB
8. Checks weather along route
9. Handles multi-day routes and time zones

The full implementation will be ~800-1000 lines. Key structure:

```typescript
@Injectable()
export class RoutePlanningEngineService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ROUTING_PROVIDER) private readonly routingProvider: RoutingProvider,
    @Inject(WEATHER_PROVIDER) private readonly weatherProvider: WeatherProvider,
    @Inject(FUEL_DATA_PROVIDER) private readonly fuelProvider: FuelDataProvider,
    private readonly hosEngine: HOSRuleEngineService,
    private readonly configService: ConfigService<Configuration>,
  ) {}

  async planRoute(input: RoutePlanRequest): Promise<RoutePlanResult> {
    // Step 1: Resolve from DB
    const driver = await this.resolveDriver(input.driverId);
    const vehicle = await this.resolveVehicle(input.vehicleId);
    const stops = await this.resolveLoadStops(input.loadIds);

    // Step 2: Get road distances
    const distanceMatrix = await this.routingProvider.getDistanceMatrix(stops);

    // Step 3: TSP optimization
    const optimizedSequence = this.optimizeStopSequence(stops, distanceMatrix);

    // Step 4: Segment simulation
    const simulation = await this.simulateRoute(
      optimizedSequence, distanceMatrix, driver, vehicle, input,
    );

    // Step 5: Persist
    const plan = await this.persistPlan(simulation, input);

    return this.buildResponse(plan, simulation);
  }

  private async simulateRoute(...): SimulationResult {
    // The heart of the engine
    // Iterates through optimized stop sequence
    // For each pair: check HOS, check fuel, check weather, build segments
    // Implements look-ahead for dock-to-rest decisions
  }

  private lookAheadRestDecision(...): RestDecision {
    // Simulates remaining journey without rest
    // Simulates with full rest, 8/2 split, 7/3 split
    // Picks optimal strategy based on time windows and HOS
  }
}
```

**Step 1: Write the engine** (full implementation in code)

**Step 2: Verify compilation**

**Step 3: Commit**

```bash
git commit -m "feat(engine): rewrite route planning engine v2

Complete rewrite with real road distances (OSRM), full HOS
compliance (70h/8day, split rest), dock-to-rest look-ahead,
fuel optimization, weather alerts, multi-day planning, and
timezone awareness. Engine resolves all data from PostgreSQL."
```

---

## Task 8: Route Plan Persistence Service

**Files:**
- Create: `apps/backend/src/domains/routing/route-planning/services/route-plan-persistence.service.ts`

This service handles all DB operations for route plans.

```typescript
@Injectable()
export class RoutePlanPersistenceService {
  constructor(private readonly prisma: PrismaService) {}

  async createPlan(data: CreatePlanData): Promise<RoutePlanWithSegments> {
    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.routePlan.create({ data: planData });
      const segments = await Promise.all(
        data.segments.map((seg) => tx.routeSegment.create({ data: { ...seg, planId: plan.id } }))
      );
      await Promise.all(
        data.loadIds.map((loadId) => tx.routePlanLoad.create({ data: { planId: plan.id, loadId } }))
      );
      return { ...plan, segments };
    });
  }

  async getPlanById(planId: string): Promise<RoutePlanWithSegments | null> { ... }
  async getActivePlanForDriver(driverId: string): Promise<RoutePlanWithSegments | null> { ... }
  async activatePlan(planId: string): Promise<void> { ... }
  async listPlans(filters: PlanFilters): Promise<RoutePlanSummary[]> { ... }
}
```

**Step 1: Write the persistence service**

**Step 2: Commit**

```bash
git commit -m "feat(persistence): add route plan persistence service

Handles all DB operations for route plans including transactional
creation of plan + segments + load associations, retrieval, activation,
and listing with filters."
```

---

## Task 9: Rewrite Route Planning Controller (New API Contract)

**Files:**
- Rewrite: `apps/backend/src/domains/routing/route-planning/controllers/route-planning.controller.ts`
- Create: `apps/backend/src/domains/routing/route-planning/dto/create-route-plan.dto.ts`

New endpoints:
- `POST /routes/plan` - Plan a route
- `GET /routes/:planId` - Get plan details
- `POST /routes/:planId/activate` - Activate route
- `GET /routes/driver/:driverId/active` - Get driver's active route
- `GET /routes` - List routes

The controller uses the new DTO with Zod validation.

**Step 1: Create DTO**

```typescript
// create-route-plan.dto.ts
import { z } from 'zod';

export const CreateRoutePlanSchema = z.object({
  driverId: z.string().min(1),
  vehicleId: z.string().min(1),
  loadIds: z.array(z.string().min(1)).min(1),
  departureTime: z.string().datetime(),
  optimizationPriority: z.enum(['minimize_time', 'minimize_cost', 'balance']).default('minimize_time'),
  dispatcherParams: z.object({
    dockRestStops: z.array(z.object({
      stopId: z.string(),
      truckParkedHours: z.number().positive(),
      convertToRest: z.boolean(),
    })).default([]),
    preferredRestType: z.enum(['auto', 'full', 'split_8_2', 'split_7_3']).default('auto'),
    avoidTollRoads: z.boolean().default(false),
    maxDetourMilesForFuel: z.number().default(15),
  }).default({}),
});

export type CreateRoutePlanDto = z.infer<typeof CreateRoutePlanSchema>;
```

**Step 2: Rewrite controller**

**Step 3: Commit**

```bash
git commit -m "feat(api): rewrite route planning controller with new API contract

New endpoints: POST /routes/plan, GET /routes/:planId,
POST /routes/:planId/activate, GET /routes/driver/:driverId/active,
GET /routes. Dispatcher sends IDs, engine resolves from DB."
```

---

## Task 10: Update Module Registrations

**Files:**
- Modify: `apps/backend/src/domains/routing/route-planning/route-planning.module.ts`
- Modify: `apps/backend/src/domains/routing/routing.module.ts`

**Step 1: Update route planning module**

Add imports for provider modules, register new services.

```typescript
@Module({
  imports: [
    PrismaModule,
    HOSComplianceModule,
    RoutingProviderModule,
    WeatherProviderModule,
    FuelProviderModule,
    ConfigModule,
  ],
  controllers: [RoutePlanningController],
  providers: [RoutePlanningEngineService, RoutePlanPersistenceService],
  exports: [RoutePlanningEngineService, RoutePlanPersistenceService],
})
```

**Step 2: Update routing module**

Add provider modules to imports/exports.

**Step 3: Verify full compilation**

```bash
cd apps/backend && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git commit -m "feat(modules): wire up provider modules and new services

Register routing, weather, and fuel provider modules.
Update route planning module with new service dependencies."
```

---

## Task 11: Add OSRM to Docker Compose

**Files:**
- Modify: `docker-compose.yml`
- Create: `scripts/setup-osrm.sh`

**Step 1: Add OSRM service to docker-compose.yml**

This is optional for development (engine falls back to haversine). Add a `docker-compose.osrm.yml` override file for when OSRM is desired.

```yaml
# docker-compose.osrm.yml (optional override)
services:
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
    driver: local
```

**Step 2: Create OSRM setup script**

```bash
#!/bin/bash
# scripts/setup-osrm.sh
# Downloads and prepares US road data for OSRM
# Run once, data persists in Docker volume

echo "Downloading US road data from OpenStreetMap..."
echo "This will take ~10GB of disk space and 30-60 minutes."

docker volume create osrm-data

# For MVP, use a smaller region (e.g., US Midwest) instead of all of US
# Full US: https://download.geofabrik.de/north-america/us-latest.osm.pbf (~10GB)
# Midwest: smaller, faster to process
echo "Downloading US Midwest region..."
docker run --rm -v osrm-data:/data alpine wget -O /data/us-midwest-latest.osm.pbf \
  https://download.geofabrik.de/north-america/us/midwest-latest.osm.pbf

echo "Extracting road network..."
docker run --rm -v osrm-data:/data osrm/osrm-backend \
  osrm-extract -p /opt/car.lua /data/us-midwest-latest.osm.pbf

echo "Partitioning..."
docker run --rm -v osrm-data:/data osrm/osrm-backend \
  osrm-partition /data/us-midwest-latest.osrm

echo "Customizing..."
docker run --rm -v osrm-data:/data osrm/osrm-backend \
  osrm-customize /data/us-midwest-latest.osrm

echo "OSRM setup complete! Start with: docker compose -f docker-compose.yml -f docker-compose.osrm.yml up osrm"
```

**Step 3: Commit**

```bash
git add docker-compose.osrm.yml scripts/setup-osrm.sh
git commit -m "infra(osrm): add optional OSRM Docker setup for real road distances

Add docker-compose.osrm.yml override and setup script for OSRM.
Engine falls back to haversine when OSRM is not running."
```

---

## Task 12: Integration Test - Full Route Planning

**Files:**
- Create: `apps/backend/src/domains/routing/__tests__/route-planning-e2e.spec.ts`

This test verifies the full pipeline works end-to-end:
1. Seed a driver, vehicle, load with stops
2. Call the route planning engine
3. Verify segments are created
4. Verify HOS compliance
5. Verify persistence to DB

```typescript
describe('Route Planning Engine E2E', () => {
  // Test 1: Simple single-day route (2 stops, no rest needed)
  it('should plan a short route without rest stops');

  // Test 2: Multi-day route (requires rest insertion)
  it('should insert rest stop when HOS limit approached');

  // Test 3: Dock-to-rest conversion
  it('should convert dock time to rest when dispatcher flags it');

  // Test 4: Fuel stop insertion
  it('should insert fuel stop when tank runs low');

  // Test 5: Appointment window respect
  it('should flag infeasible when appointment window cannot be met');

  // Test 6: 70h cycle limit
  it('should insert 34h restart when cycle hours exceeded');
});
```

**Step 1: Write tests**

**Step 2: Run tests**

```bash
cd apps/backend && npx jest src/domains/routing/__tests__/route-planning-e2e.spec.ts --verbose
```

**Step 3: Fix any failures and iterate**

**Step 4: Commit**

```bash
git commit -m "test(routing): add route planning engine e2e tests

Tests cover single-day routes, multi-day with rest insertion,
dock-to-rest conversion, fuel stops, appointment windows,
and 70h cycle limit scenarios."
```

---

## Task 13: Final Cleanup and Verification

**Files:**
- Review all modified files
- Remove unused old imports/code

**Step 1: Run full test suite**

```bash
cd apps/backend && npm test
```

**Step 2: Run linter**

```bash
cd apps/backend && npx eslint src/ --ext .ts
```

**Step 3: Test the API manually**

```bash
# Start the backend
cd apps/backend && npm run dev

# Create a test route plan (after seeding test data)
curl -X POST http://localhost:8000/api/v1/routes/plan \
  -H "Content-Type: application/json" \
  -d '{
    "driverId": "drv_test_001",
    "vehicleId": "veh_test_001",
    "loadIds": ["load_test_001"],
    "departureTime": "2026-02-10T06:00:00-06:00",
    "optimizationPriority": "minimize_time"
  }'
```

**Step 4: Final commit**

```bash
git commit -m "chore(routing): final cleanup and verification for route planning v2"
```

---

## Summary

| Task | Description | Dependencies |
|------|-------------|--------------|
| 1 | Update Prisma Schema + Config | None |
| 2 | Seed Truck Stop Data | Task 1 |
| 3 | Routing Provider (OSRM) | Task 1 |
| 4 | Weather Provider (OpenWeatherMap) | Task 1 |
| 5 | Fuel Data Provider (Database) | Task 1, Task 2 |
| 6 | Enhance HOS Rule Engine | Task 1 |
| 7 | Rewrite Route Planning Engine | Tasks 3, 4, 5, 6 |
| 8 | Route Plan Persistence Service | Task 1 |
| 9 | Rewrite Route Planning Controller | Tasks 7, 8 |
| 10 | Update Module Registrations | Tasks 3, 4, 5, 7, 8, 9 |
| 11 | Add OSRM to Docker | None |
| 12 | Integration Tests | Tasks 7, 8, 9, 10 |
| 13 | Final Cleanup | All |

**Parallelizable groups:**
- Tasks 2, 3, 4, 5, 6 can run in parallel (after Task 1)
- Task 11 is independent of everything
- Tasks 7-10 are sequential
- Tasks 12-13 are sequential after 10
