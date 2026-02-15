# Unified Mock Data Strategy

**Date:** 2026-02-15
**Status:** Approved
**Author:** AI-assisted design

---

## Problem

SALLY has 4 separate mock data sets that don't reference each other:

1. **`mock.dataset.ts`** — 10 fake drivers (Mike Johnson, etc.) used by command center runtime generation
2. **McLeod TMS adapter** — 2 inline fake drivers/vehicles/loads
3. **Project44 TMS adapter** — 5 inline fake drivers, 7 fake loads
4. **Samsara ELD adapter** — 2 inline fake drivers/vehicles (but `useMockData=false`, unused)

None match real Samsara fleet data, so HOS and telematics can't map to drivers/vehicles properly. The command center generates completely fake routes at runtime instead of reading from the database.

## Design Decisions

| Decision | Choice |
|----------|--------|
| Data source for mock drivers/vehicles | Fetch from real Samsara API via script |
| Mock loads | Hand-crafted Boston/NY corridor (4-5 loads) |
| Command center data source | Real DB queries (no more runtime fake generation) |
| Env configuration | Single `MOCK_MODE=true\|false` flag |
| TMS as source of truth | Preserved — TMS adapter mock output populated with Samsara-sourced data |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Samsara API (real)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │ one-time script (sync-samsara-mock)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  infrastructure/mock/mock.dataset.ts  (SINGLE SOURCE)       │
│                                                             │
│  MOCK_TMS_DRIVERS[]  ← Samsara roster + enriched fields     │
│  MOCK_TMS_VEHICLES[] ← Samsara roster + enriched fields     │
│  MOCK_TMS_LOADS[]    ← hand-crafted Boston/NY corridor      │
└────────┬───────────┬────────────────────────────────────────┘
         │           │
         ▼           ▼
   McLeod Adapter  P44 Adapter    (when MOCK_MODE=true)
         │           │
         └─────┬─────┘
               ▼
        TMS Sync Service → PostgreSQL DB
                                │
                                ▼
                         ELD Sync Service ← Samsara (real API)
                         (enriches by matching phone/license/VIN)
                                │
                                ▼
                      Command Center Service
                      (queries DB — no fake generation)
```

### Why This Works

TMS sync inserts drivers/vehicles into DB using mock data that has the same phone numbers, license numbers, and VINs as real Samsara drivers/vehicles. When ELD sync runs, it matches on these fields and enriches the DB records with Samsara ELD IDs. HOS and telematics then map correctly because the `eldMetadata.samsaraId` links to the right Samsara driver/vehicle.

## Mock Dataset Structure

### TMS-Format Drivers

```typescript
export const MOCK_TMS_DRIVERS: DriverData[] = [
  {
    id: 'TMS-DRV-001',              // TMS external ID
    name: 'John Smith',              // ← from Samsara
    phone: '+19788856169',           // ← from Samsara (match key)
    email: 'john.smith@carrier.com', // enriched default
    licenseNumber: 'NHL14227039',    // ← from Samsara (match key)
    licenseState: 'NH',              // ← from Samsara
  },
];
```

### TMS-Format Vehicles

```typescript
export const MOCK_TMS_VEHICLES: VehicleData[] = [
  {
    id: 'TMS-VEH-001',
    unitNumber: 'TRK-001',           // generated sequential
    vin: '1FUJGHDV9JLJY8062',        // ← from Samsara (match key)
    licensePlate: 'TX R70-1836',      // ← from Samsara
    make: 'Freightliner',            // enriched default
    model: 'Cascadia',
    year: 2022,
  },
];
```

### Mock Loads (Boston/NY Corridor)

```typescript
export const MOCK_TMS_LOADS: LoadData[] = [
  {
    id: 'LD-2001',
    loadNumber: 'LD-2001',
    customerName: 'Boston Distribution Co',
    // pickup: Boston, MA → delivery: New York, NY
    // ~215 miles, general freight
  },
  // 3-4 more loads along Boston/NYC/NJ/CT corridor
];
```

### Removed

- `MOCK_STOPS[]` — replaced by load pickup/delivery locations
- `generateMockActiveRoutes()` — command center reads DB
- `generateMockKPIs()` — computed from real DB data
- `generateMockDriverHOS()` — fetched from real Samsara
- `generateMockQuickActionCounts()` — computed from real DB data

## Environment Configuration

```env
# Single flag controls all mock behavior
# true = TMS adapters return mock data from unified dataset
# false = TMS adapters call real TMS APIs (requires credentials)
MOCK_MODE=true

# Samsara API token — used for:
# 1. Real-time HOS/telematics (always)
# 2. sync-samsara-mock script (one-time)
SAMSARA_API_TOKEN=samsara_api_xxxxx
```

## Samsara Sync Script

**Location:** `scripts/sync-samsara-mock.ts`
**Run:** `pnpm run sync-mock`

What it does:
1. Reads `SAMSARA_API_TOKEN` from `.env`
2. Calls `GET /fleet/drivers` → gets real driver roster
3. Calls `GET /fleet/vehicles` → gets real vehicle roster
4. Maps into TMS-format with enriched fleet-spec fields
5. Preserves existing `MOCK_TMS_LOADS[]` (hand-crafted)
6. Writes updated `mock.dataset.ts`

## Field Gap Analysis

### Drivers — Samsara provides vs DB needs

| Field | From Samsara | Enriched Default |
|-------|-------------|-----------------|
| name | ✅ | — |
| phone | ✅ | — |
| licenseNumber | ✅ | — |
| licenseState | ✅ | — |
| email | ❌ | Generated (firstname.lastname@carrier.com) |
| cdlClass | ❌ | Default: 'A' |
| endorsements | ❌ | Default: [] |

### Vehicles — Samsara provides vs DB needs

| Field | From Samsara | Enriched Default |
|-------|-------------|-----------------|
| vin | ✅ | — |
| licensePlate | ✅ | — |
| unitNumber | ❌ | Generated: TRK-001, TRK-002, etc. |
| make | ❌ | Default based on VIN prefix or 'Unknown' |
| model | ❌ | Default based on VIN or 'Unknown' |
| year | ❌ | Default: 2022 |
| fuelCapacityGallons | ❌ | Default: 300 (Class 8 standard) |
| mpg | ❌ | Default: 6.5 |
| hasSleeperBerth | ❌ | Default: true |
| licensePlateState | ❌ | Parsed from plate or default |

## Files Changed

| File | Change |
|------|--------|
| `infrastructure/mock/mock.config.ts` | No change (already reads MOCK_MODE from env) |
| `infrastructure/mock/mock.dataset.ts` | Rewrite: TMS-format data, Samsara-sourced, Boston/NY loads |
| `adapters/tms/mcleod-tms.adapter.ts` | Remove inline mock data, import from unified dataset, use MOCK_MODE |
| `adapters/tms/project44-tms.adapter.ts` | Same as McLeod |
| `adapters/eld/samsara-eld.adapter.ts` | No change (already real API) |
| `command-center.service.ts` | Remove mock generation, query DB |
| `scripts/sync-samsara-mock.ts` | New: Samsara fetch → mock.dataset.ts |
| `package.json` | Add `sync-mock` script |
| `prisma/seeds/04-sample-alerts.seed.ts` | Update to use new mock driver references |
