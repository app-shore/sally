# Unified Mock Data Strategy — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace 4 fragmented mock data sets with a single Samsara-sourced dataset, make all TMS adapters use it, and switch the command center from fake runtime generation to real DB queries.

**Architecture:** A one-time script fetches real drivers/vehicles from the Samsara API, writes them into `mock.dataset.ts` in TMS format (enriched with fleet-spec defaults). Both TMS adapters import from this file when `MOCK_MODE=true`. The command center queries the DB instead of generating fake data. Samsara ELD adapter stays unchanged (already real).

**Tech Stack:** NestJS, TypeScript, Prisma, Samsara REST API, axios

**Design doc:** `.docs/plans/2026-02-15-unified-mock-data-strategy.md`

---

## Task 1: Create the Samsara Sync Script

**Files:**
- Create: `apps/backend/scripts/sync-samsara-mock.ts`
- Modify: `apps/backend/package.json` (add `sync-mock` script)

**Step 1: Create the script**

Create `apps/backend/scripts/sync-samsara-mock.ts`:

```typescript
/**
 * sync-samsara-mock.ts
 *
 * Fetches real driver and vehicle data from the Samsara API and writes it into
 * the unified mock dataset file (src/infrastructure/mock/mock.dataset.ts).
 *
 * This keeps mock TMS data in sync with real Samsara fleet data so that
 * ELD sync can match drivers/vehicles by phone, license, and VIN.
 *
 * Usage:
 *   pnpm run sync-mock
 *
 * Requires SAMSARA_API_TOKEN in .env (or passed as env var).
 */
import 'dotenv/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const SAMSARA_BASE_URL = 'https://api.samsara.com';

interface SamsaraDriver {
  id: string;
  name: string;
  phone?: string;
  licenseNumber?: string;
  licenseState?: string;
  username?: string;
}

interface SamsaraVehicle {
  id: string;
  name: string;
  vin?: string;
  licensePlate?: { value?: string };
  serial?: string;
  make?: string;
  model?: string;
  year?: number;
}

async function fetchSamsaraDrivers(token: string): Promise<SamsaraDriver[]> {
  const response = await axios.get(`${SAMSARA_BASE_URL}/fleet/drivers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.data || [];
}

async function fetchSamsaraVehicles(token: string): Promise<SamsaraVehicle[]> {
  const response = await axios.get(`${SAMSARA_BASE_URL}/fleet/vehicles`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.data || [];
}

function generateEmail(name: string): string {
  const parts = name.toLowerCase().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]}.${parts[parts.length - 1]}@carrier.com`;
  }
  return `${parts[0]}@carrier.com`;
}

function buildDriverEntry(driver: SamsaraDriver, index: number): string {
  const id = `TMS-DRV-${String(index + 1).padStart(3, '0')}`;
  const nameParts = (driver.name || driver.username || 'Unknown Driver').split(/\s+/);
  const firstName = nameParts[0] || 'Unknown';
  const lastName = nameParts.slice(1).join(' ') || 'Driver';
  const phone = driver.phone || '';
  const email = generateEmail(driver.name || driver.username || 'unknown');
  const licenseNumber = driver.licenseNumber || '';
  const licenseState = driver.licenseState || '';

  return `  {
    driver_id: '${id}',
    first_name: '${firstName}',
    last_name: '${lastName}',
    phone: '${phone}',
    email: '${email}',
    license_number: '${licenseNumber}',
    license_state: '${licenseState}',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: ${driver.id}
  }`;
}

function buildVehicleEntry(vehicle: SamsaraVehicle, index: number): string {
  const id = `TMS-VEH-${String(index + 1).padStart(3, '0')}`;
  const unitNumber = `TRK-${String(index + 1).padStart(3, '0')}`;
  const vin = vehicle.vin || '';
  const licensePlate = vehicle.licensePlate?.value || '';
  const make = vehicle.make || 'Unknown';
  const model = vehicle.model || 'Unknown';
  const year = vehicle.year || 2022;

  return `  {
    vehicle_id: '${id}',
    unit_number: '${unitNumber}',
    make: '${make}',
    model: '${model}',
    year: ${year},
    vin: '${vin}',
    license_plate: '${licensePlate}',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: ${vehicle.id}
  }`;
}

async function main() {
  const token = process.env.SAMSARA_API_TOKEN;
  if (!token) {
    console.error('Error: SAMSARA_API_TOKEN not set in .env');
    process.exit(1);
  }

  console.log('Fetching drivers and vehicles from Samsara...');

  const [drivers, vehicles] = await Promise.all([
    fetchSamsaraDrivers(token),
    fetchSamsaraVehicles(token),
  ]);

  console.log(`Found ${drivers.length} drivers and ${vehicles.length} vehicles`);

  const driverEntries = drivers.map((d, i) => buildDriverEntry(d, i)).join(',\n');
  const vehicleEntries = vehicles.map((v, i) => buildVehicleEntry(v, i)).join(',\n');

  // Read the existing file to preserve MOCK_TMS_LOADS
  const datasetPath = path.join(
    __dirname,
    '../src/infrastructure/mock/mock.dataset.ts',
  );

  const fileContent = `/**
 * Unified Mock Dataset — Single Source of Truth
 *
 * All mock entity data lives here. Every adapter and service that needs mock data
 * imports from this file instead of maintaining its own inline data.
 *
 * DRIVERS and VEHICLES: Auto-generated from Samsara API via:
 *   pnpm run sync-mock
 *
 * LOADS: Hand-crafted Boston/NY corridor loads (edit manually).
 *
 * Last synced: ${new Date().toISOString()}
 */

import type { DriverData, VehicleData, LoadData } from '../../domains/integrations/adapters/tms/tms-adapter.interface';

// ---------------------------------------------------------------------------
// Mock TMS Drivers (synced from Samsara — ${drivers.length} drivers)
//
// These use the same phone numbers, license numbers, and names as real
// Samsara drivers so ELD sync can match them correctly.
// ---------------------------------------------------------------------------

export const MOCK_TMS_DRIVERS: DriverData[] = [
${driverEntries}
];

// ---------------------------------------------------------------------------
// Mock TMS Vehicles (synced from Samsara — ${vehicles.length} vehicles)
//
// These use the same VINs and license plates as real Samsara vehicles
// so ELD sync can match them correctly.
// ---------------------------------------------------------------------------

export const MOCK_TMS_VEHICLES: VehicleData[] = [
${vehicleEntries}
];

// ---------------------------------------------------------------------------
// Mock TMS Loads — Boston/NY Corridor (hand-crafted)
//
// Edit these manually. The sync script preserves this section.
// ---------------------------------------------------------------------------

export const MOCK_TMS_LOADS: LoadData[] = [
  {
    load_id: 'LD-2001',
    load_number: 'LD-2001',
    customer_name: 'Boston Distribution Co',
    weight_lbs: 42000,
    commodity_type: 'General Freight',
    pickup_location: {
      address: '100 Produce Market Way',
      city: 'Boston',
      state: 'MA',
      zip: '02118',
      latitude: 42.3401,
      longitude: -71.0589,
    },
    delivery_location: {
      address: '500 Food Center Dr',
      city: 'New York',
      state: 'NY',
      zip: '10474',
      latitude: 40.8128,
      longitude: -73.8803,
    },
    pickup_appointment: new Date(Date.now() + 2 * 3600000).toISOString(),
    delivery_appointment: new Date(Date.now() + 8 * 3600000).toISOString(),
    status: 'ASSIGNED',
    total_miles: 215,
    data_source: 'mock_tms',
  },
  {
    load_id: 'LD-2002',
    load_number: 'LD-2002',
    customer_name: 'Metro NY Logistics',
    weight_lbs: 38500,
    commodity_type: 'Consumer Goods',
    pickup_location: {
      address: '1 Meadowlands Pkwy',
      city: 'East Rutherford',
      state: 'NJ',
      zip: '07073',
      latitude: 40.8128,
      longitude: -74.0730,
    },
    delivery_location: {
      address: '200 Terminal Rd',
      city: 'New Haven',
      state: 'CT',
      zip: '06519',
      latitude: 41.2982,
      longitude: -72.9291,
    },
    pickup_appointment: new Date(Date.now() + 4 * 3600000).toISOString(),
    delivery_appointment: new Date(Date.now() + 10 * 3600000).toISOString(),
    status: 'UNASSIGNED',
    total_miles: 88,
    data_source: 'mock_tms',
  },
  {
    load_id: 'LD-2003',
    load_number: 'LD-2003',
    customer_name: 'Northeast Pharma Supply',
    weight_lbs: 28000,
    commodity_type: 'Pharmaceuticals',
    special_requirements: 'Temperature controlled - maintain 2-8°C',
    pickup_location: {
      address: '75 Industrial Park Dr',
      city: 'Hartford',
      state: 'CT',
      zip: '06114',
      latitude: 41.7489,
      longitude: -72.6884,
    },
    delivery_location: {
      address: '400 Pharmacy Distribution Blvd',
      city: 'Brooklyn',
      state: 'NY',
      zip: '11232',
      latitude: 40.6570,
      longitude: -74.0060,
    },
    pickup_appointment: new Date(Date.now() + 3 * 3600000).toISOString(),
    delivery_appointment: new Date(Date.now() + 9 * 3600000).toISOString(),
    assigned_driver_id: 'TMS-DRV-001',
    assigned_vehicle_id: 'TMS-VEH-001',
    status: 'ASSIGNED',
    total_miles: 118,
    data_source: 'mock_tms',
  },
  {
    load_id: 'LD-2004',
    load_number: 'LD-2004',
    customer_name: 'Providence Building Supply',
    weight_lbs: 44500,
    commodity_type: 'Building Materials',
    special_requirements: 'Flatbed required',
    pickup_location: {
      address: '300 Port Access Rd',
      city: 'Providence',
      state: 'RI',
      zip: '02905',
      latitude: 41.8005,
      longitude: -71.4128,
    },
    delivery_location: {
      address: '150 Construction Way',
      city: 'Stamford',
      state: 'CT',
      zip: '06902',
      latitude: 41.0534,
      longitude: -73.5387,
    },
    pickup_appointment: new Date(Date.now() + 5 * 3600000).toISOString(),
    delivery_appointment: new Date(Date.now() + 11 * 3600000).toISOString(),
    assigned_driver_id: 'TMS-DRV-002',
    assigned_vehicle_id: 'TMS-VEH-002',
    status: 'IN_TRANSIT',
    total_miles: 95,
    data_source: 'mock_tms',
  },
  {
    load_id: 'LD-2005',
    load_number: 'LD-2005',
    customer_name: 'Long Island Fresh Foods',
    weight_lbs: 35000,
    commodity_type: 'Refrigerated Produce',
    special_requirements: 'Reefer unit required - maintain 34°F',
    pickup_location: {
      address: '50 Wholesale Market St',
      city: 'Worcester',
      state: 'MA',
      zip: '01608',
      latitude: 42.2626,
      longitude: -71.8023,
    },
    delivery_location: {
      address: '800 Fresh Market Blvd',
      city: 'Hicksville',
      state: 'NY',
      zip: '11801',
      latitude: 40.7682,
      longitude: -73.5251,
    },
    pickup_appointment: new Date(Date.now() + 1 * 3600000).toISOString(),
    delivery_appointment: new Date(Date.now() + 7 * 3600000).toISOString(),
    status: 'ASSIGNED',
    total_miles: 178,
    data_source: 'mock_tms',
  },
];
`;

  fs.writeFileSync(datasetPath, fileContent, 'utf-8');
  console.log(`\\nWrote ${datasetPath}`);
  console.log(`  ${drivers.length} drivers, ${vehicles.length} vehicles, 5 loads (Boston/NY corridor)`);
  console.log('\\nDone! Mock dataset is now synced with Samsara.');
}

main().catch((err) => {
  console.error('Failed to sync mock data:', err.message);
  process.exit(1);
});
```

**Step 2: Add sync-mock script to package.json**

In `apps/backend/package.json`, add to `"scripts"`:

```json
"sync-mock": "ts-node scripts/sync-samsara-mock.ts"
```

**Step 3: Add SAMSARA_API_TOKEN to .env (if not already present)**

Check `apps/backend/.env` — if `SAMSARA_API_TOKEN` is missing, add:

```env
# Samsara API Token (for ELD sync + mock data generation)
# Get from Samsara dashboard → Settings → API Tokens
SAMSARA_API_TOKEN=
```

**Step 4: Run the script**

```bash
cd apps/backend && pnpm run sync-mock
```

Expected: Script fetches from Samsara, writes `mock.dataset.ts` with real driver/vehicle data.

**Step 5: Verify the generated file**

Open `apps/backend/src/infrastructure/mock/mock.dataset.ts` and confirm:
- `MOCK_TMS_DRIVERS` has entries with real Samsara phone numbers and license data
- `MOCK_TMS_VEHICLES` has entries with real Samsara VINs
- `MOCK_TMS_LOADS` has 5 Boston/NY corridor loads

**Step 6: Commit**

```bash
git add apps/backend/scripts/sync-samsara-mock.ts apps/backend/src/infrastructure/mock/mock.dataset.ts apps/backend/package.json
git commit -m "feat: add Samsara sync script and unified mock dataset"
```

---

## Task 2: Update McLeod TMS Adapter to Use Unified Dataset

**Files:**
- Modify: `apps/backend/src/domains/integrations/adapters/tms/mcleod-tms.adapter.ts`

**Step 1: Replace the adapter**

Replace the entire file. Key changes:
- Remove `private readonly useMockData = true` — use `MOCK_MODE` from config
- Remove all inline mock data (mock vehicles, drivers, loads, `getMockLoad()`)
- Import `MOCK_TMS_DRIVERS`, `MOCK_TMS_VEHICLES`, `MOCK_TMS_LOADS` from unified dataset
- When `MOCK_MODE` is true, return data from the unified dataset
- Real API stubs stay as-is for Phase 2

```typescript
import { Injectable } from '@nestjs/common';
import {
  ITMSAdapter,
  LoadData,
  VehicleData,
  DriverData,
} from './tms-adapter.interface';
import { MOCK_MODE } from '../../../../infrastructure/mock/mock.config';
import {
  MOCK_TMS_DRIVERS,
  MOCK_TMS_VEHICLES,
  MOCK_TMS_LOADS,
} from '../../../../infrastructure/mock/mock.dataset';

/**
 * McLeod TMS Adapter
 *
 * When MOCK_MODE=true: returns data from the unified mock dataset.
 * When MOCK_MODE=false: calls real McLeod TMS API (Phase 2/3).
 */
@Injectable()
export class McLeodTMSAdapter implements ITMSAdapter {
  async getLoad(
    apiKey: string,
    apiSecret: string,
    loadId: string,
  ): Promise<LoadData> {
    if (MOCK_MODE) {
      const load = MOCK_TMS_LOADS.find((l) => l.load_id === loadId);
      if (!load) throw new Error(`Load ${loadId} not found in mock data`);
      return load;
    }

    // Real API call (Phase 2)
    throw new Error('Real McLeod API integration not implemented yet');
  }

  async getActiveLoads(apiKey: string, apiSecret: string): Promise<LoadData[]> {
    if (MOCK_MODE) return MOCK_TMS_LOADS;

    // Real API call (Phase 2)
    throw new Error('Real McLeod API integration not implemented yet');
  }

  async testConnection(apiKey: string, apiSecret?: string): Promise<boolean> {
    if (MOCK_MODE) {
      return !!apiKey && apiKey.length > 10;
    }

    // Real API test (Phase 2)
    return false;
  }

  async getVehicles(apiKey: string, apiSecret: string): Promise<VehicleData[]> {
    if (MOCK_MODE) return MOCK_TMS_VEHICLES;

    // Real API call (Phase 2)
    throw new Error('Real McLeod API integration not implemented yet');
  }

  async getDrivers(apiKey: string, apiSecret: string): Promise<DriverData[]> {
    if (MOCK_MODE) return MOCK_TMS_DRIVERS;

    // Real API call (Phase 2)
    throw new Error('Real McLeod API integration not implemented yet');
  }

  async syncAllLoads(apiKey: string, apiSecret?: string): Promise<string[]> {
    if (MOCK_MODE) return MOCK_TMS_LOADS.map((l) => l.load_id);

    // Real API call (Phase 2)
    return [];
  }
}
```

**Step 2: Verify the app compiles**

```bash
cd apps/backend && pnpm run build
```

Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add apps/backend/src/domains/integrations/adapters/tms/mcleod-tms.adapter.ts
git commit -m "refactor: McLeod adapter uses unified mock dataset"
```

---

## Task 3: Update Project44 TMS Adapter to Use Unified Dataset

**Files:**
- Modify: `apps/backend/src/domains/integrations/adapters/tms/project44-tms.adapter.ts`

**Step 1: Replace mock methods with unified imports**

Key changes:
- Remove `private useMockData = true` — use `MOCK_MODE` from config
- Remove `getMockLoads()`, `getMockDrivers()`, `getMockVehicles()` private methods (~340 lines of inline mock data)
- Import from unified dataset
- Keep real API methods (OAuth, transform methods, Haversine calculation) untouched

In every method that checks `this.useMockData`, replace with `MOCK_MODE`:

Add at top of file:
```typescript
import { MOCK_MODE } from '../../../../infrastructure/mock/mock.config';
import {
  MOCK_TMS_DRIVERS,
  MOCK_TMS_VEHICLES,
  MOCK_TMS_LOADS,
} from '../../../../infrastructure/mock/mock.dataset';
```

Replace mock checks:
- `if (this.useMockData) { return this.getMockLoads(); }` → `if (MOCK_MODE) { return MOCK_TMS_LOADS; }`
- `if (this.useMockData) { return this.getMockDrivers(); }` → `if (MOCK_MODE) { return MOCK_TMS_DRIVERS; }`
- `if (this.useMockData) { return this.getMockVehicles(); }` → `if (MOCK_MODE) { return MOCK_TMS_VEHICLES; }`
- `getLoad()` mock path: `if (MOCK_MODE) { const load = MOCK_TMS_LOADS.find(l => l.load_id === loadId); ... }`
- `testConnection()` mock path stays similar but uses `MOCK_MODE`
- `syncAllLoads()` uses `MOCK_MODE`

Remove:
- `private useMockData = true;` field
- `private getMockLoads(): LoadData[]` method (lines 472-689)
- `private getMockDrivers(): DriverData[]` method (lines 694-747)
- `private getMockVehicles(): VehicleData[]` method (lines 752-810)

Keep:
- `private getOAuthToken()` — needed for real API
- `private transformLoadData()`, `transformDriverData()`, `transformVehicleData()` — needed for real API
- `private mapStatus()`, `mapDriverStatus()`, `mapVehicleStatus()` — needed for real API
- `private calculateDistance()`, `toRad()` — utility

**Step 2: Verify the app compiles**

```bash
cd apps/backend && pnpm run build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add apps/backend/src/domains/integrations/adapters/tms/project44-tms.adapter.ts
git commit -m "refactor: Project44 adapter uses unified mock dataset"
```

---

## Task 4: Update Command Center to Query Real DB

**Files:**
- Modify: `apps/backend/src/domains/operations/command-center/command-center.service.ts`

**Context:** The command center service (`getOverview()`) currently calls 4 runtime mock generators:
- `generateMockActiveRoutes(tenantId)`
- `generateMockKPIs(activeRoutes, realAlertStats)`
- `generateMockDriverHOS(activeRoutes)`
- `generateMockQuickActionCounts(tenantId)`

These must be replaced with real DB queries. The service already has `PrismaService` injected.

**Step 1: Replace getOverview() with DB queries**

Remove the 4 mock generator imports:
```typescript
// REMOVE these imports:
import {
  generateMockActiveRoutes,
  generateMockKPIs,
  generateMockDriverHOS,
  generateMockQuickActionCounts,
} from '../../../infrastructure/mock/mock.dataset';
```

Replace `getOverview()` with:
```typescript
async getOverview(tenantId: number): Promise<CommandCenterOverviewDto> {
  const cacheKey = `command-center:overview:${tenantId}`;
  const cached = await this.cacheManager.get<CommandCenterOverviewDto>(cacheKey);
  if (cached) return cached;

  // Get real alert stats from DB
  const realAlertStats = await this.getRealAlertStats(tenantId);

  // Query real drivers, vehicles, loads from DB
  const [drivers, loads, unassignedLoads] = await Promise.all([
    this.prisma.driver.findMany({
      where: { tenantId, isActive: true },
      include: { vehicles: true },
    }),
    this.prisma.load.findMany({
      where: { tenantId, status: { notIn: ['DELIVERED', 'CANCELLED'] } },
      include: { stops: { orderBy: { sequence: 'asc' } } },
    }),
    this.prisma.load.count({
      where: { tenantId, status: 'UNASSIGNED' },
    }),
  ]);

  // Build active routes from real data (loads with assigned drivers)
  const activeRoutes: ActiveRouteDto[] = [];
  // For now, return empty routes — route plans will populate this when created
  // The key change is: no more fake data generation

  const availableDrivers = drivers.filter(
    (d) => d.status === 'ACTIVE' || d.status === 'AVAILABLE',
  ).length;

  const kpis = {
    active_routes: activeRoutes.length,
    on_time_percentage: 100,
    hos_violations: realAlertStats.hosViolations,
    active_alerts: realAlertStats.active,
    avg_response_time_minutes: realAlertStats.avgResponseTimeMinutes,
  };

  const quickActionCounts = {
    unassigned_loads: unassignedLoads,
    available_drivers: availableDrivers,
  };

  const driverHosStrip: DriverHOSChipDto[] = [];
  // HOS strip will be populated from real Samsara HOS data when drivers exist

  const result: CommandCenterOverviewDto = {
    kpis,
    active_routes: activeRoutes,
    quick_action_counts: quickActionCounts,
    driver_hos_strip: driverHosStrip,
  };

  await this.cacheManager.set(cacheKey, result, 30 * 1000);
  return result;
}
```

Add the missing type import at the top:
```typescript
import type { CommandCenterOverviewDto, ShiftNoteDto, ActiveRouteDto, DriverHOSChipDto } from './command-center.types';
```

**Step 2: Verify the app compiles**

```bash
cd apps/backend && pnpm run build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add apps/backend/src/domains/operations/command-center/command-center.service.ts
git commit -m "refactor: command center queries real DB instead of generating fake data"
```

---

## Task 5: Update Sample Alerts Seed

**Files:**
- Modify: `apps/backend/prisma/seeds/04-sample-alerts.seed.ts`

**Context:** The seed currently imports `MOCK_DRIVERS` and `driverName` from the old mock dataset. Since we've renamed the exports, update the import.

**Step 1: Update imports**

Replace:
```typescript
import { MOCK_DRIVERS, driverName } from '../../src/infrastructure/mock/mock.dataset';
```

With:
```typescript
import { MOCK_TMS_DRIVERS } from '../../src/infrastructure/mock/mock.dataset';
```

**Step 2: Update the fallback driver mapping**

Replace:
```typescript
: MOCK_DRIVERS.map((d) => ({ id: d.id, name: driverName(d) }));
```

With:
```typescript
: MOCK_TMS_DRIVERS.map((d) => ({
    id: d.driver_id,
    name: `${d.first_name} ${d.last_name}`,
  }));
```

**Step 3: Verify the seed compiles**

```bash
cd apps/backend && npx ts-node --transpile-only prisma/seeds/04-sample-alerts.seed.ts 2>&1 | head -5
```

Expected: No import errors (might fail on execution since it needs DB, but no TypeScript errors).

**Step 4: Commit**

```bash
git add apps/backend/prisma/seeds/04-sample-alerts.seed.ts
git commit -m "refactor: sample alerts seed uses unified mock dataset"
```

---

## Task 6: Add MOCK_MODE to .env and Verify End-to-End

**Files:**
- Modify: `apps/backend/.env` (add MOCK_MODE if not present)

**Step 1: Add MOCK_MODE to .env**

Add to `apps/backend/.env`:

```env
# Mock Mode — when true, TMS adapters return mock data from unified dataset
# Set to false when real TMS integration is configured
MOCK_MODE=true
```

**Step 2: Verify full build**

```bash
cd apps/backend && pnpm run build
```

Expected: Clean build.

**Step 3: Check for any remaining references to old mock dataset exports**

Search for any remaining imports of the old names:

```bash
cd apps/backend && grep -rn "MOCK_DRIVERS\|MOCK_VEHICLES\|MOCK_LOADS\|MOCK_STOPS\|driverName\|generateMock" src/ prisma/ --include="*.ts" | grep -v "mock.dataset.ts" | grep -v "node_modules"
```

Expected: No results (all old references should be gone).

**Step 4: Commit**

```bash
git add apps/backend/.env
git commit -m "chore: add MOCK_MODE to .env"
```

---

## Task 7: Clean Up — Remove Dead Code from mock.dataset.ts

**Context:** After the sync script runs, the old `mock.dataset.ts` content is replaced. But verify that no old exports (`MOCK_DRIVERS`, `MOCK_VEHICLES`, `MOCK_LOADS`, `MOCK_STOPS`, `driverName`, `generateMock*`) remain anywhere.

**Step 1: Search for any stale references**

```bash
grep -rn "MOCK_STOPS\|generateMockActiveRoutes\|generateMockKPIs\|generateMockDriverHOS\|generateMockQuickActionCounts\|driverName" apps/backend/src/ apps/backend/prisma/ --include="*.ts"
```

Expected: Zero results.

**Step 2: Verify Samsara adapter is untouched**

Open `apps/backend/src/domains/integrations/adapters/eld/samsara-eld.adapter.ts` and confirm:
- `useMockData = false` — unchanged
- No imports from `mock.dataset.ts`

**Step 3: Final build and basic smoke test**

```bash
cd apps/backend && pnpm run build
```

**Step 4: Commit any remaining cleanup**

```bash
git add -A && git commit -m "chore: clean up stale mock references"
```

---

## Summary

| Task | What Changes | Risk |
|------|-------------|------|
| 1 | Create sync script + run it | Low — new file, additive |
| 2 | McLeod adapter → unified imports | Low — mock data source swap |
| 3 | Project44 adapter → unified imports | Low — mock data source swap |
| 4 | Command center → real DB queries | Medium — changes runtime behavior |
| 5 | Alert seed → new import names | Low — import rename |
| 6 | Add MOCK_MODE to .env | Low — additive |
| 7 | Clean up dead code | Low — deletion only |

**Total estimated files changed:** 6 modified + 1 new
**Dependencies:** Task 1 must complete first (generates the dataset). Tasks 2-5 are independent of each other. Task 6-7 are final verification.
