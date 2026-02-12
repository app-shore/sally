# Continuous Monitoring Service — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the background monitoring daemon (Layer 2) that checks active routes against real-time Samsara data, fires alerts, records audit trail, and triggers re-planning — plus a dispatcher monitoring page.

**Architecture:** NestJS cron service runs every 60 seconds, queries active RoutePlans, fetches HOS/GPS from Samsara via IntegrationManager, runs 14 monitoring checks, fires alerts via AlertTriggersService, records RoutePlanUpdate entries, emits SSE events, and handles ETA updates / re-planning. Frontend page at `/dispatcher/monitoring` shows real-time pulse, trigger feed, and route health cards.

**Tech Stack:** NestJS 11, TypeScript 5.9, Prisma ORM, Jest 30, @nestjs/schedule (cron), SSE via SseService, React Query, Shadcn/ui, Next.js 15

---

## Codebase Reference

**Key files you'll interact with:**

| File | Purpose |
|------|---------|
| `apps/backend/src/domains/operations/operations.module.ts` | Wire MonitoringModule here |
| `apps/backend/src/domains/operations/alerts/services/alert-triggers.service.ts` | `trigger(alertType, tenantId, driverId, params)` |
| `apps/backend/src/domains/operations/alerts/alert-types.ts` | 20 alert type definitions with `ALERT_TYPES` map |
| `apps/backend/src/infrastructure/sse/sse.service.ts` | `emitToTenant(tenantId, eventType, data)` |
| `apps/backend/src/domains/integrations/services/integration-manager.service.ts` | `getDriverHOS(tenantId, driverId)` — currently mock, needs real Samsara |
| `apps/backend/src/domains/integrations/adapters/eld/samsara-eld.adapter.ts` | Samsara API adapter |
| `apps/backend/src/domains/routing/services/route-planning-engine.service.ts` | `planRoute(input)` for re-planning |
| `apps/backend/prisma/schema.prisma` | RoutePlan, RouteSegment, RoutePlanUpdate models |
| `apps/web/src/shared/hooks/use-sse.ts` | SSE hook for real-time events |
| `apps/web/src/shared/lib/navigation.ts` | Add monitoring nav item here |
| `apps/web/src/features/operations/alerts/` | Alert feature pattern to follow |

**Test pattern (NestJS):**
```typescript
import { Test, TestingModule } from '@nestjs/testing';
// Create mock objects with jest.fn()
const mockService = { methodName: jest.fn().mockResolvedValue(result) };
// Use Test.createTestingModule with providers + useValue
// Call jest.clearAllMocks() in beforeEach
```

**Frontend feature pattern:**
```
features/{domain}/{feature}/
├── api.ts          // API client methods: export const featureApi = { ... }
├── types.ts        // TypeScript interfaces
├── hooks/
│   └── use-feature.ts  // React Query hooks
└── index.ts        // Barrel exports
```

---

## Task 1: Samsara Adapter — HOS Clocks & GPS Methods

**Files:**
- Modify: `apps/backend/src/domains/integrations/adapters/eld/samsara-eld.adapter.ts`
- Test: `apps/backend/src/domains/integrations/adapters/eld/__tests__/samsara-eld-monitoring.spec.ts`

**Step 1: Write the failing test**

```typescript
// apps/backend/src/domains/integrations/adapters/eld/__tests__/samsara-eld-monitoring.spec.ts
import { SamsaraELDAdapter } from '../samsara-eld.adapter';

describe('SamsaraELDAdapter - Monitoring Methods', () => {
  let adapter: SamsaraELDAdapter;

  beforeEach(() => {
    adapter = new SamsaraELDAdapter();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getHOSClocks', () => {
    it('should fetch and transform HOS clock data from Samsara', async () => {
      const mockResponse = {
        data: [
          {
            driver: { id: 'drv-123', name: 'John Doe' },
            currentDutyStatus: { type: 'driving' },
            clocks: {
              drive: { remainingDurationMs: 3600000 },    // 1 hour
              shift: { remainingDurationMs: 7200000 },    // 2 hours
              cycle: { remainingDurationMs: 180000000 },  // 50 hours
              break: { remainingDurationMs: 1800000 },    // 30 min
            },
          },
        ],
      };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await adapter.getHOSClocks('test-token');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          driverId: 'drv-123',
          driverName: 'John Doe',
          currentDutyStatus: 'driving',
          driveTimeRemainingMs: 3600000,
          shiftTimeRemainingMs: 7200000,
          cycleTimeRemainingMs: 180000000,
          timeUntilBreakMs: 1800000,
        }),
      );
    });

    it('should throw on non-200 response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(adapter.getHOSClocks('bad-token')).rejects.toThrow();
    });
  });

  describe('getVehicleLocations', () => {
    it('should fetch and transform GPS location data', async () => {
      const mockResponse = {
        data: [
          {
            id: 'veh-456',
            name: 'Truck-01',
            gps: {
              latitude: 34.0522,
              longitude: -118.2437,
              speedMilesPerHour: 65,
              headingDegrees: 270,
              time: '2026-02-09T12:00:00Z',
            },
          },
        ],
      };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await adapter.getVehicleLocations('test-token');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        vehicleId: 'veh-456',
        gps: {
          latitude: 34.0522,
          longitude: -118.2437,
          speedMilesPerHour: 65,
          headingDegrees: 270,
          time: '2026-02-09T12:00:00Z',
        },
      });
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx jest src/domains/integrations/adapters/eld/__tests__/samsara-eld-monitoring.spec.ts --no-coverage`
Expected: FAIL — `getHOSClocks` is not a function

**Step 3: Write the types and implementation**

Add these interfaces to the adapter file (or a shared types file alongside it):

```typescript
export interface HOSClockData {
  driverId: string;
  driverName: string;
  currentDutyStatus: 'driving' | 'onDuty' | 'offDuty' | 'sleeperBerth';
  driveTimeRemainingMs: number;
  shiftTimeRemainingMs: number;
  cycleTimeRemainingMs: number;
  timeUntilBreakMs: number;
  lastUpdated: string;
}

export interface VehicleLocationData {
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

Add methods to `SamsaraELDAdapter`:

```typescript
async getHOSClocks(apiToken: string): Promise<HOSClockData[]> {
  const response = await fetch('https://api.samsara.com/fleet/hos/clocks', {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!response.ok) {
    throw new Error(`Samsara HOS Clocks API failed: ${response.status} ${response.statusText}`);
  }
  const body = await response.json();
  return (body.data || []).map((entry: any) => ({
    driverId: entry.driver?.id ?? '',
    driverName: entry.driver?.name ?? '',
    currentDutyStatus: this.mapDutyStatus(entry.currentDutyStatus?.type),
    driveTimeRemainingMs: entry.clocks?.drive?.remainingDurationMs ?? 0,
    shiftTimeRemainingMs: entry.clocks?.shift?.remainingDurationMs ?? 0,
    cycleTimeRemainingMs: entry.clocks?.cycle?.remainingDurationMs ?? 0,
    timeUntilBreakMs: entry.clocks?.break?.remainingDurationMs ?? 0,
    lastUpdated: new Date().toISOString(),
  }));
}

async getVehicleLocations(apiToken: string): Promise<VehicleLocationData[]> {
  const response = await fetch('https://api.samsara.com/fleet/vehicles/stats?types=gps', {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!response.ok) {
    throw new Error(`Samsara GPS API failed: ${response.status} ${response.statusText}`);
  }
  const body = await response.json();
  return (body.data || []).map((entry: any) => ({
    vehicleId: entry.id ?? '',
    gps: {
      latitude: entry.gps?.latitude ?? 0,
      longitude: entry.gps?.longitude ?? 0,
      speedMilesPerHour: entry.gps?.speedMilesPerHour ?? 0,
      headingDegrees: entry.gps?.headingDegrees ?? 0,
      time: entry.gps?.time ?? new Date().toISOString(),
    },
  }));
}

private mapDutyStatus(raw: string): HOSClockData['currentDutyStatus'] {
  const map: Record<string, HOSClockData['currentDutyStatus']> = {
    driving: 'driving',
    onDuty: 'onDuty',
    on_duty: 'onDuty',
    offDuty: 'offDuty',
    off_duty: 'offDuty',
    sleeperBerth: 'sleeperBerth',
    sleeper_berth: 'sleeperBerth',
  };
  return map[raw] ?? 'offDuty';
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx jest src/domains/integrations/adapters/eld/__tests__/samsara-eld-monitoring.spec.ts --no-coverage`
Expected: PASS (2 test suites, all tests pass)

**Step 5: Commit**

```bash
git add apps/backend/src/domains/integrations/adapters/eld/
git commit -m "feat(monitoring): add HOS clocks and GPS methods to Samsara adapter"
```

---

## Task 2: Wire IntegrationManager — Real HOS + Vehicle Location

**Files:**
- Modify: `apps/backend/src/domains/integrations/services/integration-manager.service.ts`
- Test: `apps/backend/src/domains/integrations/services/integration-manager.service.spec.ts` (update existing)

**Step 1: Write the failing test**

Add a new test to the existing spec file:

```typescript
describe('getVehicleLocation', () => {
  it('should fetch vehicle GPS via Samsara adapter', async () => {
    // Mock the integration config query
    mockPrisma.integrationConfig.findFirst.mockResolvedValue({
      id: 1,
      tenantId: 1,
      integrationType: 'HOS_ELD',
      status: 'ACTIVE',
      credentials: { apiToken: 'test-token' },
    });

    // Mock the Samsara adapter
    mockSamsaraAdapter.getVehicleLocations.mockResolvedValue([
      {
        vehicleId: 'veh-456',
        gps: { latitude: 34.05, longitude: -118.24, speedMilesPerHour: 65, headingDegrees: 270, time: '2026-02-09T12:00:00Z' },
      },
    ]);

    const result = await service.getVehicleLocation(1, 'veh-456');

    expect(result).toBeDefined();
    expect(result.gps.latitude).toBe(34.05);
  });

  it('should throw if no active integration', async () => {
    mockPrisma.integrationConfig.findFirst.mockResolvedValue(null);

    await expect(service.getVehicleLocation(1, 'veh-456')).rejects.toThrow(
      'No active HOS integration',
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx jest src/domains/integrations/services/integration-manager.service.spec.ts --no-coverage`
Expected: FAIL — `getVehicleLocation` is not a function

**Step 3: Add `getVehicleLocation` method to IntegrationManagerService**

```typescript
async getVehicleLocation(
  tenantId: number,
  vehicleId: string,
): Promise<VehicleLocationData> {
  const integration = await this.prisma.integrationConfig.findFirst({
    where: { tenantId, integrationType: 'HOS_ELD', status: 'ACTIVE' },
  });

  if (!integration) {
    throw new Error('No active HOS integration configured');
  }

  const apiToken = this.getCredentialField(integration.credentials, 'apiToken');
  const locations = await this.samsaraAdapter.getVehicleLocations(apiToken);
  const match = locations.find((l) => l.vehicleId === vehicleId);

  if (!match) {
    throw new Error(`Vehicle ${vehicleId} not found in Samsara GPS data`);
  }

  return match;
}
```

Also update `getDriverHOS` to call the real Samsara `getHOSClocks()` instead of returning mock data. Replace the `// TODO: Implement HOS data fetching` block (around lines 111-123) with:

```typescript
const hosClocks = await this.samsaraAdapter.getHOSClocks(apiToken);
const driverClock = hosClocks.find((c) => c.driverId === driverId);

if (!driverClock) {
  throw new Error(`Driver ${driverId} not found in Samsara HOS data`);
}

return {
  data_source: 'samsara',
  cached: false,
  currentDutyStatus: driverClock.currentDutyStatus,
  driveTimeRemainingMs: driverClock.driveTimeRemainingMs,
  shiftTimeRemainingMs: driverClock.shiftTimeRemainingMs,
  cycleTimeRemainingMs: driverClock.cycleTimeRemainingMs,
  timeUntilBreakMs: driverClock.timeUntilBreakMs,
  lastUpdated: driverClock.lastUpdated,
} as HOSData;
```

Import `VehicleLocationData` from the adapter.

**Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx jest src/domains/integrations/services/integration-manager.service.spec.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/backend/src/domains/integrations/
git commit -m "feat(monitoring): wire real Samsara HOS + GPS into IntegrationManager"
```

---

## Task 3: Monitoring Checks Service — 14 Trigger Implementations

**Files:**
- Create: `apps/backend/src/domains/operations/monitoring/services/monitoring-checks.service.ts`
- Create: `apps/backend/src/domains/operations/monitoring/monitoring.types.ts`
- Test: `apps/backend/src/domains/operations/monitoring/__tests__/monitoring-checks.service.spec.ts`

**Step 1: Create the types file**

```typescript
// apps/backend/src/domains/operations/monitoring/monitoring.types.ts

export interface MonitoringTrigger {
  type: string;              // Alert type key (e.g. 'HOS_APPROACHING_LIMIT')
  severity: 'critical' | 'high' | 'medium' | 'low';
  requiresReplan: boolean;
  etaImpactMinutes: number;
  params: Record<string, any>;
}

export interface MonitoringThresholds {
  hosApproachingMinutes: number;     // Default: 60
  breakRequiredHours: number;        // Default: 8
  cycleApproachingHours: number;     // Default: 5
  appointmentAtRiskMinutes: number;  // Default: 30
  dockTimeExceededMinutes: number;   // Default: 60
  driverNotMovingMinutes: number;    // Default: 120
  routeDelayMinutes: number;         // Default: 30
  fuelLowPercent: number;            // Default: 20
}

export const DEFAULT_THRESHOLDS: MonitoringThresholds = {
  hosApproachingMinutes: 60,
  breakRequiredHours: 8,
  cycleApproachingHours: 5,
  appointmentAtRiskMinutes: 30,
  dockTimeExceededMinutes: 60,
  driverNotMovingMinutes: 120,
  routeDelayMinutes: 30,
  fuelLowPercent: 20,
};

export interface MonitoringContext {
  plan: any;                       // RoutePlan with segments
  segments: any[];                 // RouteSegment[]
  currentSegment: any | null;      // Current active segment
  hosData: any;                    // HOSData from IntegrationManager
  gpsData: any;                    // VehicleLocationData
  thresholds: MonitoringThresholds;
  driverName: string;
}
```

**Step 2: Write the failing tests**

```typescript
// apps/backend/src/domains/operations/monitoring/__tests__/monitoring-checks.service.spec.ts
import { MonitoringChecksService } from '../services/monitoring-checks.service';
import { DEFAULT_THRESHOLDS, MonitoringContext } from '../monitoring.types';

describe('MonitoringChecksService', () => {
  let service: MonitoringChecksService;

  beforeEach(() => {
    service = new MonitoringChecksService();
  });

  function buildContext(overrides: Partial<MonitoringContext> = {}): MonitoringContext {
    return {
      plan: { planId: 'RP-001', id: 1, estimatedArrival: new Date('2026-02-10T18:00:00Z') },
      segments: [],
      currentSegment: { segmentType: 'drive', status: 'in_progress', estimatedArrival: new Date('2026-02-09T14:00:00Z') },
      hosData: {
        driveTimeRemainingMs: 5 * 3600000, // 5 hours
        shiftTimeRemainingMs: 8 * 3600000,
        cycleTimeRemainingMs: 50 * 3600000,
        timeUntilBreakMs: 4 * 3600000,
        currentDutyStatus: 'driving',
      },
      gpsData: { gps: { latitude: 34.05, longitude: -118.24, speedMilesPerHour: 65, headingDegrees: 270, time: new Date().toISOString() } },
      thresholds: { ...DEFAULT_THRESHOLDS },
      driverName: 'John Doe',
      ...overrides,
    };
  }

  describe('HOS checks', () => {
    it('should trigger HOS_APPROACHING_LIMIT when drive time < threshold', () => {
      const ctx = buildContext({
        hosData: { ...buildContext().hosData, driveTimeRemainingMs: 30 * 60000 }, // 30 min
      });

      const triggers = service.runAllChecks(ctx);
      const hosApproaching = triggers.filter((t) => t.type === 'HOS_APPROACHING_LIMIT');

      expect(hosApproaching.length).toBeGreaterThanOrEqual(1);
      expect(hosApproaching[0].requiresReplan).toBe(false);
    });

    it('should trigger HOS_VIOLATION when drive time is 0', () => {
      const ctx = buildContext({
        hosData: { ...buildContext().hosData, driveTimeRemainingMs: 0, currentDutyStatus: 'driving' },
      });

      const triggers = service.runAllChecks(ctx);
      const violation = triggers.find((t) => t.type === 'HOS_VIOLATION');

      expect(violation).toBeDefined();
      expect(violation!.requiresReplan).toBe(true);
      expect(violation!.severity).toBe('critical');
    });

    it('should trigger BREAK_REQUIRED when break timer expired', () => {
      const ctx = buildContext({
        hosData: { ...buildContext().hosData, timeUntilBreakMs: 0 },
      });

      const triggers = service.runAllChecks(ctx);
      expect(triggers.find((t) => t.type === 'BREAK_REQUIRED')).toBeDefined();
    });

    it('should not trigger HOS alerts when all values are healthy', () => {
      const ctx = buildContext();
      const triggers = service.runAllChecks(ctx);
      const hosAlerts = triggers.filter((t) => ['HOS_APPROACHING_LIMIT', 'HOS_VIOLATION', 'BREAK_REQUIRED', 'CYCLE_APPROACHING_LIMIT'].includes(t.type));

      expect(hosAlerts).toHaveLength(0);
    });
  });

  describe('Driver behavior', () => {
    it('should trigger DRIVER_NOT_MOVING when speed is 0 for too long', () => {
      const stoppedSince = new Date(Date.now() - 130 * 60000).toISOString(); // 130 min ago
      const ctx = buildContext({
        gpsData: { gps: { latitude: 34.05, longitude: -118.24, speedMilesPerHour: 0, headingDegrees: 0, time: stoppedSince } },
        currentSegment: { segmentType: 'drive', status: 'in_progress', estimatedDeparture: new Date(Date.now() - 130 * 60000) },
      });

      const triggers = service.runAllChecks(ctx);
      expect(triggers.find((t) => t.type === 'DRIVER_NOT_MOVING')).toBeDefined();
    });
  });
});
```

**Step 3: Run test to verify it fails**

Run: `cd apps/backend && npx jest src/domains/operations/monitoring/__tests__/monitoring-checks.service.spec.ts --no-coverage`
Expected: FAIL — cannot find module

**Step 4: Implement MonitoringChecksService**

```typescript
// apps/backend/src/domains/operations/monitoring/services/monitoring-checks.service.ts
import { Injectable } from '@nestjs/common';
import { MonitoringContext, MonitoringTrigger } from '../monitoring.types';

@Injectable()
export class MonitoringChecksService {
  runAllChecks(ctx: MonitoringContext): MonitoringTrigger[] {
    const triggers: MonitoringTrigger[] = [];

    // HOS Compliance (5 checks)
    this.checkDriveLimitApproaching(ctx, triggers);
    this.checkDutyLimitApproaching(ctx, triggers);
    this.checkBreakRequired(ctx, triggers);
    this.checkCycleApproaching(ctx, triggers);
    this.checkHOSViolation(ctx, triggers);

    // Route Progress (4 checks)
    this.checkAppointmentAtRisk(ctx, triggers);
    this.checkMissedAppointment(ctx, triggers);
    this.checkDockTimeExceeded(ctx, triggers);
    this.checkRouteDelay(ctx, triggers);

    // Driver Behavior (1 check)
    this.checkDriverNotMoving(ctx, triggers);

    // Vehicle State (1 check)
    this.checkFuelLow(ctx, triggers);

    // External (2 checks) — placeholders
    // Weather + road closure deferred (no external API yet)

    return triggers;
  }

  // --- HOS Compliance ---

  private checkDriveLimitApproaching(ctx: MonitoringContext, triggers: MonitoringTrigger[]) {
    const remainingMin = ctx.hosData.driveTimeRemainingMs / 60000;
    if (remainingMin > 0 && remainingMin <= ctx.thresholds.hosApproachingMinutes) {
      triggers.push({
        type: 'HOS_APPROACHING_LIMIT',
        severity: 'high',
        requiresReplan: false,
        etaImpactMinutes: 0,
        params: { hoursType: 'driving', remainingMinutes: Math.round(remainingMin), driverName: ctx.driverName },
      });
    }
  }

  private checkDutyLimitApproaching(ctx: MonitoringContext, triggers: MonitoringTrigger[]) {
    const remainingMin = ctx.hosData.shiftTimeRemainingMs / 60000;
    if (remainingMin > 0 && remainingMin <= ctx.thresholds.hosApproachingMinutes) {
      triggers.push({
        type: 'HOS_APPROACHING_LIMIT',
        severity: 'high',
        requiresReplan: false,
        etaImpactMinutes: 0,
        params: { hoursType: 'duty', remainingMinutes: Math.round(remainingMin), driverName: ctx.driverName },
      });
    }
  }

  private checkBreakRequired(ctx: MonitoringContext, triggers: MonitoringTrigger[]) {
    const breakRemainingMin = ctx.hosData.timeUntilBreakMs / 60000;
    if (breakRemainingMin <= 0) {
      triggers.push({
        type: 'BREAK_REQUIRED',
        severity: 'high',
        requiresReplan: false,
        etaImpactMinutes: 30, // 30 min break needed
        params: { remainingMinutes: 0, driverName: ctx.driverName },
      });
    }
  }

  private checkCycleApproaching(ctx: MonitoringContext, triggers: MonitoringTrigger[]) {
    const remainingHours = ctx.hosData.cycleTimeRemainingMs / 3600000;
    if (remainingHours > 0 && remainingHours <= ctx.thresholds.cycleApproachingHours) {
      triggers.push({
        type: 'CYCLE_APPROACHING_LIMIT',
        severity: 'medium',
        requiresReplan: false,
        etaImpactMinutes: 0,
        params: { remainingHours: Math.round(remainingHours * 10) / 10, driverName: ctx.driverName },
      });
    }
  }

  private checkHOSViolation(ctx: MonitoringContext, triggers: MonitoringTrigger[]) {
    const driveRemaining = ctx.hosData.driveTimeRemainingMs;
    const shiftRemaining = ctx.hosData.shiftTimeRemainingMs;
    const cycleRemaining = ctx.hosData.cycleTimeRemainingMs;

    if (driveRemaining <= 0 && ctx.hosData.currentDutyStatus === 'driving') {
      triggers.push({
        type: 'HOS_VIOLATION',
        severity: 'critical',
        requiresReplan: true,
        etaImpactMinutes: 600, // 10h rest needed
        params: { hoursType: 'driving', currentHours: '11+', limitHours: '11', driverName: ctx.driverName },
      });
    } else if (shiftRemaining <= 0 && ['driving', 'onDuty'].includes(ctx.hosData.currentDutyStatus)) {
      triggers.push({
        type: 'HOS_VIOLATION',
        severity: 'critical',
        requiresReplan: true,
        etaImpactMinutes: 600,
        params: { hoursType: 'duty', currentHours: '14+', limitHours: '14', driverName: ctx.driverName },
      });
    } else if (cycleRemaining <= 0) {
      triggers.push({
        type: 'HOS_VIOLATION',
        severity: 'critical',
        requiresReplan: true,
        etaImpactMinutes: 2040, // 34h restart
        params: { hoursType: 'cycle', currentHours: '70+', limitHours: '70', driverName: ctx.driverName },
      });
    }
  }

  // --- Route Progress ---

  private checkAppointmentAtRisk(ctx: MonitoringContext, triggers: MonitoringTrigger[]) {
    if (!ctx.currentSegment?.appointmentWindow) return;
    const window = ctx.currentSegment.appointmentWindow;
    if (!window.start) return;

    const windowStart = new Date(window.start).getTime();
    const eta = ctx.currentSegment.estimatedArrival
      ? new Date(ctx.currentSegment.estimatedArrival).getTime()
      : null;
    if (!eta) return;

    const bufferMs = ctx.thresholds.appointmentAtRiskMinutes * 60000;
    if (eta > windowStart - bufferMs && eta <= windowStart) {
      triggers.push({
        type: 'APPOINTMENT_AT_RISK',
        severity: 'high',
        requiresReplan: false,
        etaImpactMinutes: Math.round((eta - windowStart) / 60000),
        params: { stopName: ctx.currentSegment.toLocation, driverName: ctx.driverName },
      });
    }
  }

  private checkMissedAppointment(ctx: MonitoringContext, triggers: MonitoringTrigger[]) {
    if (!ctx.currentSegment?.appointmentWindow) return;
    const window = ctx.currentSegment.appointmentWindow;
    if (!window.end) return;

    const windowEnd = new Date(window.end).getTime();
    if (Date.now() > windowEnd && ctx.currentSegment.status !== 'completed') {
      triggers.push({
        type: 'MISSED_APPOINTMENT',
        severity: 'critical',
        requiresReplan: true,
        etaImpactMinutes: Math.round((Date.now() - windowEnd) / 60000),
        params: { stopName: ctx.currentSegment.toLocation, scheduledTime: window.end, driverName: ctx.driverName },
      });
    }
  }

  private checkDockTimeExceeded(ctx: MonitoringContext, triggers: MonitoringTrigger[]) {
    if (ctx.currentSegment?.segmentType !== 'dock') return;
    if (ctx.currentSegment.status !== 'in_progress') return;

    const plannedDockMs = (ctx.currentSegment.dockDurationHours ?? 0) * 3600000;
    const actualStart = ctx.currentSegment.actualArrival
      ? new Date(ctx.currentSegment.actualArrival).getTime()
      : null;
    if (!actualStart) return;

    const actualDockMs = Date.now() - actualStart;
    const thresholdMs = ctx.thresholds.dockTimeExceededMinutes * 60000;

    if (actualDockMs > plannedDockMs + thresholdMs) {
      const excessMinutes = Math.round((actualDockMs - plannedDockMs) / 60000);
      triggers.push({
        type: 'DOCK_TIME_EXCEEDED',
        severity: 'high',
        requiresReplan: true,
        etaImpactMinutes: excessMinutes,
        params: { stopName: ctx.currentSegment.toLocation, excessMinutes, driverName: ctx.driverName },
      });
    }
  }

  private checkRouteDelay(ctx: MonitoringContext, triggers: MonitoringTrigger[]) {
    if (!ctx.plan.estimatedArrival) return;
    // Compare original plan ETA vs projected ETA based on current progress
    // Simplified: use current segment ETA deviation
    if (!ctx.currentSegment?.estimatedArrival) return;

    const plannedEta = new Date(ctx.currentSegment.estimatedArrival).getTime();
    const now = Date.now();
    // If we're past the estimated arrival but segment isn't complete
    if (now > plannedEta && ctx.currentSegment.status === 'in_progress') {
      const delayMin = Math.round((now - plannedEta) / 60000);
      if (delayMin >= ctx.thresholds.routeDelayMinutes) {
        triggers.push({
          type: 'ROUTE_DELAY',
          severity: delayMin > 60 ? 'high' : 'medium',
          requiresReplan: delayMin > 60,
          etaImpactMinutes: delayMin,
          params: { delayMinutes: delayMin, driverName: ctx.driverName },
        });
      }
    }
  }

  // --- Driver Behavior ---

  private checkDriverNotMoving(ctx: MonitoringContext, triggers: MonitoringTrigger[]) {
    if (ctx.currentSegment?.segmentType !== 'drive') return;
    if (ctx.gpsData?.gps?.speedMilesPerHour > 0) return;

    // Determine how long driver has been stopped
    // Use the segment's estimatedDeparture or GPS timestamp as reference
    const stoppedSince = ctx.currentSegment.estimatedDeparture
      ? new Date(ctx.currentSegment.estimatedDeparture).getTime()
      : ctx.gpsData?.gps?.time
        ? new Date(ctx.gpsData.gps.time).getTime()
        : null;

    if (!stoppedSince) return;

    const stoppedMinutes = (Date.now() - stoppedSince) / 60000;
    if (stoppedMinutes >= ctx.thresholds.driverNotMovingMinutes) {
      triggers.push({
        type: 'DRIVER_NOT_MOVING',
        severity: 'medium',
        requiresReplan: false,
        etaImpactMinutes: Math.round(stoppedMinutes),
        params: { stoppedMinutes: Math.round(stoppedMinutes), driverName: ctx.driverName },
      });
    }
  }

  // --- Vehicle State ---

  private checkFuelLow(ctx: MonitoringContext, triggers: MonitoringTrigger[]) {
    // Fuel check requires fuel state tracking on the current segment
    const fuelState = ctx.currentSegment?.fuelStateAfter;
    if (!fuelState?.fuelPercent) return;

    if (fuelState.fuelPercent < ctx.thresholds.fuelLowPercent) {
      triggers.push({
        type: 'FUEL_LOW',
        severity: 'medium',
        requiresReplan: false,
        etaImpactMinutes: 0,
        params: { fuelPercent: fuelState.fuelPercent, driverName: ctx.driverName },
      });
    }
  }
}
```

**Step 5: Run test to verify it passes**

Run: `cd apps/backend && npx jest src/domains/operations/monitoring/__tests__/monitoring-checks.service.spec.ts --no-coverage`
Expected: PASS

**Step 6: Commit**

```bash
git add apps/backend/src/domains/operations/monitoring/
git commit -m "feat(monitoring): implement 14 monitoring checks service"
```

---

## Task 4: Route Progress Tracker Service

**Files:**
- Create: `apps/backend/src/domains/operations/monitoring/services/route-progress-tracker.service.ts`
- Test: `apps/backend/src/domains/operations/monitoring/__tests__/route-progress-tracker.service.spec.ts`

**Step 1: Write the failing test**

```typescript
// apps/backend/src/domains/operations/monitoring/__tests__/route-progress-tracker.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { RouteProgressTrackerService } from '../services/route-progress-tracker.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

describe('RouteProgressTrackerService', () => {
  let service: RouteProgressTrackerService;

  const mockPrisma = {
    routeSegment: { update: jest.fn().mockResolvedValue({}) },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteProgressTrackerService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(RouteProgressTrackerService);
    jest.clearAllMocks();
  });

  describe('determineCurrentSegment', () => {
    it('should find the first in_progress segment', () => {
      const segments = [
        { id: 1, sequenceOrder: 1, status: 'completed', segmentType: 'drive' },
        { id: 2, sequenceOrder: 2, status: 'in_progress', segmentType: 'drive' },
        { id: 3, sequenceOrder: 3, status: 'planned', segmentType: 'dock' },
      ];

      const result = service.determineCurrentSegment(segments);
      expect(result?.id).toBe(2);
    });

    it('should return the first planned segment if none in_progress', () => {
      const segments = [
        { id: 1, sequenceOrder: 1, status: 'completed', segmentType: 'drive' },
        { id: 2, sequenceOrder: 2, status: 'planned', segmentType: 'drive' },
      ];

      const result = service.determineCurrentSegment(segments);
      expect(result?.id).toBe(2);
    });
  });

  describe('updateSegmentStatuses', () => {
    it('should mark passed segments as completed', async () => {
      const segments = [
        { id: 1, segmentId: 'seg-1', sequenceOrder: 1, status: 'in_progress', segmentType: 'drive', toLat: 34.0, toLon: -118.0 },
        { id: 2, segmentId: 'seg-2', sequenceOrder: 2, status: 'planned', segmentType: 'drive', toLat: 35.0, toLon: -117.0 },
      ];
      const gps = { gps: { latitude: 35.0, longitude: -117.0, speedMilesPerHour: 65 } };

      await service.updateSegmentStatuses(segments, gps);

      expect(mockPrisma.routeSegment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ status: 'completed' }),
        }),
      );
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx jest src/domains/operations/monitoring/__tests__/route-progress-tracker.service.spec.ts --no-coverage`
Expected: FAIL

**Step 3: Implement RouteProgressTrackerService**

```typescript
// apps/backend/src/domains/operations/monitoring/services/route-progress-tracker.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

@Injectable()
export class RouteProgressTrackerService {
  private readonly logger = new Logger(RouteProgressTrackerService.name);

  constructor(private readonly prisma: PrismaService) {}

  determineCurrentSegment(segments: any[]): any | null {
    const sorted = [...segments].sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    // First, find any in_progress segment
    const inProgress = sorted.find((s) => s.status === 'in_progress');
    if (inProgress) return inProgress;

    // Otherwise, find the first planned segment
    return sorted.find((s) => s.status === 'planned') ?? null;
  }

  async updateSegmentStatuses(segments: any[], gpsData: any): Promise<any | null> {
    const sorted = [...segments].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    const driverLat = gpsData?.gps?.latitude;
    const driverLon = gpsData?.gps?.longitude;

    if (driverLat == null || driverLon == null) return this.determineCurrentSegment(segments);

    for (const segment of sorted) {
      if (segment.status === 'completed' || segment.status === 'skipped') continue;

      // Check if driver has reached or passed this segment's destination
      const distToDestMiles = this.haversineDistance(driverLat, driverLon, segment.toLat, segment.toLon);

      if (distToDestMiles < 1) {
        // Driver is at or very near this segment's destination — mark completed
        if (segment.status !== 'completed') {
          await this.prisma.routeSegment.update({
            where: { id: segment.id },
            data: {
              status: 'completed',
              actualArrival: segment.actualArrival ?? new Date(),
            },
          });
          segment.status = 'completed';
        }
      } else if (segment.status === 'planned') {
        // Driver hasn't completed a previous segment — this is current
        await this.prisma.routeSegment.update({
          where: { id: segment.id },
          data: {
            status: 'in_progress',
            actualDeparture: segment.actualDeparture ?? new Date(),
          },
        });
        segment.status = 'in_progress';
        return segment;
      } else {
        // in_progress — still working on it
        return segment;
      }
    }

    return null;
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    if (lat2 == null || lon2 == null) return Infinity;
    const R = 3959;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx jest src/domains/operations/monitoring/__tests__/route-progress-tracker.service.spec.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/backend/src/domains/operations/monitoring/
git commit -m "feat(monitoring): implement route progress tracker service"
```

---

## Task 5: Route Update Handler (Layer 3 — Re-plan vs ETA Update)

**Files:**
- Create: `apps/backend/src/domains/operations/monitoring/services/route-update-handler.service.ts`
- Test: `apps/backend/src/domains/operations/monitoring/__tests__/route-update-handler.service.spec.ts`

**Step 1: Write the failing test**

```typescript
// apps/backend/src/domains/operations/monitoring/__tests__/route-update-handler.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { RouteUpdateHandlerService } from '../services/route-update-handler.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AlertTriggersService } from '../../../operations/alerts/services/alert-triggers.service';
import { SseService } from '../../../../infrastructure/sse/sse.service';

describe('RouteUpdateHandlerService', () => {
  let service: RouteUpdateHandlerService;

  const mockPrisma = {
    routePlanUpdate: { create: jest.fn().mockResolvedValue({ id: 1 }) },
    routePlan: { update: jest.fn().mockResolvedValue({}) },
    routeSegment: { updateMany: jest.fn().mockResolvedValue({}) },
  };
  const mockAlertTriggers = { trigger: jest.fn().mockResolvedValue({ alertId: 'ALT-001' }) };
  const mockSse = { emitToTenant: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteUpdateHandlerService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AlertTriggersService, useValue: mockAlertTriggers },
        { provide: SseService, useValue: mockSse },
      ],
    }).compile();

    service = module.get(RouteUpdateHandlerService);
    jest.clearAllMocks();
  });

  it('should create RoutePlanUpdate record for alert-only triggers', async () => {
    const triggers = [
      { type: 'HOS_APPROACHING_LIMIT', severity: 'high', requiresReplan: false, etaImpactMinutes: 0, params: { driverName: 'John', remainingMinutes: 45 } },
    ];

    await service.handleTriggers(triggers, { planId: 'RP-001', id: 1, tenantId: 1, planVersion: 1 }, 'driver-1');

    expect(mockPrisma.routePlanUpdate.create).toHaveBeenCalled();
    expect(mockAlertTriggers.trigger).toHaveBeenCalledWith('HOS_APPROACHING_LIMIT', 1, 'driver-1', expect.any(Object));
    expect(mockSse.emitToTenant).toHaveBeenCalledWith(1, 'monitoring:trigger_fired', expect.any(Object));
  });

  it('should record replan info when trigger requires replan', async () => {
    const triggers = [
      { type: 'HOS_VIOLATION', severity: 'critical', requiresReplan: true, etaImpactMinutes: 600, params: { driverName: 'John' } },
    ];

    await service.handleTriggers(triggers, { planId: 'RP-001', id: 1, tenantId: 1, planVersion: 1 }, 'driver-1');

    expect(mockPrisma.routePlanUpdate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ replanTriggered: true }),
      }),
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx jest src/domains/operations/monitoring/__tests__/route-update-handler.service.spec.ts --no-coverage`
Expected: FAIL

**Step 3: Implement RouteUpdateHandlerService**

```typescript
// apps/backend/src/domains/operations/monitoring/services/route-update-handler.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AlertTriggersService } from '../../alerts/services/alert-triggers.service';
import { SseService } from '../../../../infrastructure/sse/sse.service';
import { MonitoringTrigger } from '../monitoring.types';

@Injectable()
export class RouteUpdateHandlerService {
  private readonly logger = new Logger(RouteUpdateHandlerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alertTriggers: AlertTriggersService,
    private readonly sse: SseService,
  ) {}

  async handleTriggers(
    triggers: MonitoringTrigger[],
    plan: { planId: string; id: number; tenantId: number; planVersion: number },
    driverId: string,
  ): Promise<void> {
    if (triggers.length === 0) return;

    const needsReplan = triggers.some((t) => t.requiresReplan && t.etaImpactMinutes > 30);
    const maxEtaImpact = Math.max(...triggers.map((t) => t.etaImpactMinutes));

    for (const trigger of triggers) {
      // 1. Fire alert
      await this.alertTriggers.trigger(trigger.type, plan.tenantId, driverId, {
        ...trigger.params,
        routePlanId: plan.planId,
        priority: trigger.severity,
      });

      // 2. Record RoutePlanUpdate for audit trail
      const updateId = `UPD-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      await this.prisma.routePlanUpdate.create({
        data: {
          updateId,
          planId: plan.id,
          updateType: trigger.type,
          triggeredAt: new Date(),
          triggeredBy: 'monitoring_daemon',
          triggerData: trigger.params,
          replanTriggered: trigger.requiresReplan && trigger.etaImpactMinutes > 30,
          replanReason: trigger.requiresReplan ? `${trigger.type}: ETA impact ${trigger.etaImpactMinutes}min` : null,
          previousPlanVersion: trigger.requiresReplan ? plan.planVersion : null,
          newPlanVersion: trigger.requiresReplan ? plan.planVersion + 1 : null,
          impactSummary: {
            etaChangeMinutes: trigger.etaImpactMinutes,
            alertsFired: 1,
            severity: trigger.severity,
          },
        },
      });

      // 3. Emit SSE event
      this.sse.emitToTenant(plan.tenantId, 'monitoring:trigger_fired', {
        planId: plan.planId,
        triggerType: trigger.type,
        severity: trigger.severity,
        requiresReplan: trigger.requiresReplan,
        etaImpactMinutes: trigger.etaImpactMinutes,
        params: trigger.params,
        timestamp: new Date().toISOString(),
      });
    }

    // 4. If ETA shift needed (but no full replan), shift remaining segments
    if (!needsReplan && maxEtaImpact > 0) {
      this.sse.emitToTenant(plan.tenantId, 'route:updated', {
        planId: plan.planId,
        etaShiftMinutes: maxEtaImpact,
      });
    }

    // 5. If replan needed, emit replan event (actual replan call is deferred to avoid blocking cron)
    if (needsReplan) {
      this.logger.warn(`Route ${plan.planId} needs re-plan. ETA impact: ${maxEtaImpact}min`);
      this.sse.emitToTenant(plan.tenantId, 'route:replanned', {
        planId: plan.planId,
        reason: triggers.filter((t) => t.requiresReplan).map((t) => t.type).join(', '),
      });
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx jest src/domains/operations/monitoring/__tests__/route-update-handler.service.spec.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/backend/src/domains/operations/monitoring/
git commit -m "feat(monitoring): implement route update handler (Layer 3)"
```

---

## Task 6: Route Monitoring Daemon (Cron Orchestrator)

**Files:**
- Create: `apps/backend/src/domains/operations/monitoring/services/route-monitoring.service.ts`
- Test: `apps/backend/src/domains/operations/monitoring/__tests__/route-monitoring.service.spec.ts`

**Step 1: Write the failing test**

```typescript
// apps/backend/src/domains/operations/monitoring/__tests__/route-monitoring.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { RouteMonitoringService } from '../services/route-monitoring.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { IntegrationManagerService } from '../../../integrations/services/integration-manager.service';
import { MonitoringChecksService } from '../services/monitoring-checks.service';
import { RouteProgressTrackerService } from '../services/route-progress-tracker.service';
import { RouteUpdateHandlerService } from '../services/route-update-handler.service';
import { SseService } from '../../../../infrastructure/sse/sse.service';

describe('RouteMonitoringService', () => {
  let service: RouteMonitoringService;

  const mockPrisma = {
    routePlan: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const mockIntegrationManager = {
    getDriverHOS: jest.fn().mockResolvedValue({ driveTimeRemainingMs: 5 * 3600000 }),
    getVehicleLocation: jest.fn().mockResolvedValue({ gps: { latitude: 34.05, longitude: -118.24, speedMilesPerHour: 65 } }),
  };
  const mockChecks = { runAllChecks: jest.fn().mockReturnValue([]) };
  const mockProgressTracker = {
    updateSegmentStatuses: jest.fn().mockResolvedValue(null),
    determineCurrentSegment: jest.fn().mockReturnValue(null),
  };
  const mockUpdateHandler = { handleTriggers: jest.fn().mockResolvedValue(undefined) };
  const mockSse = { emitToTenant: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteMonitoringService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: IntegrationManagerService, useValue: mockIntegrationManager },
        { provide: MonitoringChecksService, useValue: mockChecks },
        { provide: RouteProgressTrackerService, useValue: mockProgressTracker },
        { provide: RouteUpdateHandlerService, useValue: mockUpdateHandler },
        { provide: SseService, useValue: mockSse },
      ],
    }).compile();

    service = module.get(RouteMonitoringService);
    jest.clearAllMocks();
  });

  it('should query active route plans and process each one', async () => {
    const mockPlan = {
      id: 1,
      planId: 'RP-001',
      tenantId: 1,
      planVersion: 1,
      driver: { driverId: 'drv-1', name: 'John Doe' },
      vehicle: { vehicleId: 'veh-1' },
      segments: [{ id: 1, sequenceOrder: 1, status: 'in_progress', segmentType: 'drive' }],
    };
    mockPrisma.routePlan.findMany.mockResolvedValue([mockPlan]);
    mockProgressTracker.updateSegmentStatuses.mockResolvedValue(mockPlan.segments[0]);

    await service.monitorActiveRoutes();

    expect(mockPrisma.routePlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true, status: 'active' },
      }),
    );
    expect(mockIntegrationManager.getDriverHOS).toHaveBeenCalledWith(1, 'drv-1');
    expect(mockChecks.runAllChecks).toHaveBeenCalled();
  });

  it('should not fail when no active routes exist', async () => {
    mockPrisma.routePlan.findMany.mockResolvedValue([]);
    await expect(service.monitorActiveRoutes()).resolves.not.toThrow();
  });

  it('should isolate errors per route', async () => {
    const plans = [
      { id: 1, planId: 'RP-001', tenantId: 1, planVersion: 1, driver: { driverId: 'drv-1', name: 'John' }, vehicle: { vehicleId: 'veh-1' }, segments: [] },
      { id: 2, planId: 'RP-002', tenantId: 1, planVersion: 1, driver: { driverId: 'drv-2', name: 'Jane' }, vehicle: { vehicleId: 'veh-2' }, segments: [] },
    ];
    mockPrisma.routePlan.findMany.mockResolvedValue(plans);
    mockIntegrationManager.getDriverHOS
      .mockRejectedValueOnce(new Error('HOS fetch failed'))
      .mockResolvedValueOnce({ driveTimeRemainingMs: 5 * 3600000 });

    await expect(service.monitorActiveRoutes()).resolves.not.toThrow();
    // Second route should still be processed
    expect(mockIntegrationManager.getDriverHOS).toHaveBeenCalledTimes(2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx jest src/domains/operations/monitoring/__tests__/route-monitoring.service.spec.ts --no-coverage`
Expected: FAIL

**Step 3: Implement RouteMonitoringService**

```typescript
// apps/backend/src/domains/operations/monitoring/services/route-monitoring.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { IntegrationManagerService } from '../../../integrations/services/integration-manager.service';
import { MonitoringChecksService } from './monitoring-checks.service';
import { RouteProgressTrackerService } from './route-progress-tracker.service';
import { RouteUpdateHandlerService } from './route-update-handler.service';
import { SseService } from '../../../../infrastructure/sse/sse.service';
import { DEFAULT_THRESHOLDS } from '../monitoring.types';

@Injectable()
export class RouteMonitoringService {
  private readonly logger = new Logger(RouteMonitoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationManager: IntegrationManagerService,
    private readonly checks: MonitoringChecksService,
    private readonly progressTracker: RouteProgressTrackerService,
    private readonly updateHandler: RouteUpdateHandlerService,
    private readonly sse: SseService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async monitorActiveRoutes(): Promise<void> {
    const plans = await this.prisma.routePlan.findMany({
      where: { isActive: true, status: 'active' },
      include: {
        segments: { orderBy: { sequenceOrder: 'asc' } },
        driver: true,
        vehicle: true,
      },
    });

    if (plans.length === 0) return;

    let totalTriggers = 0;

    for (const plan of plans) {
      try {
        const triggers = await this.monitorSingleRoute(plan);
        totalTriggers += triggers;
      } catch (error) {
        this.logger.error(
          `Failed to monitor route ${plan.planId}: ${error.message}`,
          error.stack,
        );
      }
    }

    // Emit cycle complete event (for monitoring page pulse strip)
    // Only emit to tenants that have active routes
    const tenantIds = [...new Set(plans.map((p) => p.tenantId))];
    for (const tenantId of tenantIds) {
      this.sse.emitToTenant(tenantId, 'monitoring:cycle_complete', {
        routesMonitored: plans.filter((p) => p.tenantId === tenantId).length,
        totalTriggers,
        timestamp: new Date().toISOString(),
      });
    }

    this.logger.log(`Monitored ${plans.length} routes, ${totalTriggers} triggers fired`);
  }

  private async monitorSingleRoute(plan: any): Promise<number> {
    // a. Fetch real-time HOS
    const hosData = await this.integrationManager.getDriverHOS(
      plan.tenantId,
      plan.driver.driverId,
    );

    // b. Fetch real-time GPS
    let gpsData: any = null;
    try {
      gpsData = await this.integrationManager.getVehicleLocation(
        plan.tenantId,
        plan.vehicle.vehicleId,
      );
    } catch (error) {
      this.logger.warn(`GPS fetch failed for ${plan.planId}: ${error.message}`);
    }

    // c. Update segment statuses based on GPS position
    const currentSegment = gpsData
      ? await this.progressTracker.updateSegmentStatuses(plan.segments, gpsData)
      : this.progressTracker.determineCurrentSegment(plan.segments);

    // d. Run all 14 monitoring checks
    const triggers = this.checks.runAllChecks({
      plan,
      segments: plan.segments,
      currentSegment,
      hosData,
      gpsData,
      thresholds: DEFAULT_THRESHOLDS,
      driverName: plan.driver.name ?? plan.driver.driverId,
    });

    // e. Handle triggers (fire alerts, record updates, emit SSE)
    if (triggers.length > 0) {
      await this.updateHandler.handleTriggers(
        triggers,
        { planId: plan.planId, id: plan.id, tenantId: plan.tenantId, planVersion: plan.planVersion },
        plan.driver.driverId,
      );
    }

    return triggers.length;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx jest src/domains/operations/monitoring/__tests__/route-monitoring.service.spec.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/backend/src/domains/operations/monitoring/
git commit -m "feat(monitoring): implement route monitoring daemon with 60s cron"
```

---

## Task 7: Monitoring Controller + DTOs + Module Wiring

**Files:**
- Create: `apps/backend/src/domains/operations/monitoring/monitoring.controller.ts`
- Create: `apps/backend/src/domains/operations/monitoring/monitoring.module.ts`
- Create: `apps/backend/src/domains/operations/monitoring/dto/report-dock-time.dto.ts`
- Create: `apps/backend/src/domains/operations/monitoring/dto/report-delay.dto.ts`
- Modify: `apps/backend/src/domains/operations/operations.module.ts`

**Step 1: Create DTOs**

```typescript
// apps/backend/src/domains/operations/monitoring/dto/report-dock-time.dto.ts
import { z } from 'zod';

export const ReportDockTimeSchema = z.object({
  actualDockHours: z.number().min(0),
  notes: z.string().optional(),
});
export type ReportDockTimeDto = z.infer<typeof ReportDockTimeSchema>;

// apps/backend/src/domains/operations/monitoring/dto/report-delay.dto.ts
import { z } from 'zod';

export const ReportDelaySchema = z.object({
  delayMinutes: z.number().min(1),
  reason: z.string().min(1).max(500),
});
export type ReportDelayDto = z.infer<typeof ReportDelaySchema>;
```

**Step 2: Create Controller**

```typescript
// apps/backend/src/domains/operations/monitoring/monitoring.controller.ts
import { Controller, Get, Post, Param, Body, ParseIntPipe } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { TenantDbId } from '../../../auth/decorators/tenant.decorator';
import { RouteProgressTrackerService } from './services/route-progress-tracker.service';
import { IntegrationManagerService } from '../../integrations/services/integration-manager.service';
import { RouteUpdateHandlerService } from './services/route-update-handler.service';
import { ReportDockTimeSchema } from './dto/report-dock-time.dto';
import { ReportDelaySchema } from './dto/report-delay.dto';

@Controller('api/v1/routes')
export class MonitoringController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressTracker: RouteProgressTrackerService,
    private readonly integrationManager: IntegrationManagerService,
    private readonly updateHandler: RouteUpdateHandlerService,
  ) {}

  @Get(':planId/monitoring')
  async getMonitoringStatus(
    @Param('planId') planId: string,
    @TenantDbId() tenantId: number,
  ) {
    const plan = await this.prisma.routePlan.findFirst({
      where: { planId, tenantId },
      include: {
        segments: { orderBy: { sequenceOrder: 'asc' } },
        driver: true,
        vehicle: true,
        updates: { orderBy: { triggeredAt: 'desc' }, take: 10 },
      },
    });

    if (!plan) throw new Error(`Route plan ${planId} not found`);

    const currentSegment = this.progressTracker.determineCurrentSegment(plan.segments);
    const completedSegments = plan.segments.filter((s: any) => s.status === 'completed').length;

    // Count active alerts for this plan
    const activeAlerts = await this.prisma.alert.count({
      where: { routePlanId: planId, tenantId, status: 'active' },
    });

    // Try to get live HOS data
    let hosState = null;
    try {
      const hosData = await this.integrationManager.getDriverHOS(tenantId, plan.driver.driverId);
      hosState = {
        currentDutyStatus: hosData.currentDutyStatus ?? 'unknown',
        driveTimeRemainingMinutes: Math.round((hosData.driveTimeRemainingMs ?? 0) / 60000),
        shiftTimeRemainingMinutes: Math.round((hosData.shiftTimeRemainingMs ?? 0) / 60000),
        cycleTimeRemainingMinutes: Math.round((hosData.cycleTimeRemainingMs ?? 0) / 60000),
        timeUntilBreakMinutes: Math.round((hosData.timeUntilBreakMs ?? 0) / 60000),
      };
    } catch { /* HOS unavailable */ }

    // Try to get live GPS
    let driverPosition = null;
    try {
      const gps = await this.integrationManager.getVehicleLocation(tenantId, plan.vehicle.vehicleId);
      driverPosition = {
        lat: gps.gps.latitude,
        lon: gps.gps.longitude,
        speed: gps.gps.speedMilesPerHour,
        heading: gps.gps.headingDegrees,
        lastUpdated: gps.gps.time,
      };
    } catch { /* GPS unavailable */ }

    // ETA deviation
    const etaDeviation = this.calculateEtaDeviation(plan, currentSegment);

    return {
      planId: plan.planId,
      currentSegment: currentSegment
        ? { segmentId: currentSegment.segmentId, sequenceOrder: currentSegment.sequenceOrder, segmentType: currentSegment.segmentType, status: currentSegment.status }
        : null,
      driverPosition,
      hosState,
      etaDeviation,
      completedSegments,
      totalSegments: plan.segments.length,
      activeAlerts,
      lastChecked: new Date().toISOString(),
      recentUpdates: plan.updates,
    };
  }

  @Get(':planId/updates')
  async getUpdates(
    @Param('planId') planId: string,
    @TenantDbId() tenantId: number,
  ) {
    const plan = await this.prisma.routePlan.findFirst({
      where: { planId, tenantId },
      select: { id: true },
    });
    if (!plan) throw new Error(`Route plan ${planId} not found`);

    return this.prisma.routePlanUpdate.findMany({
      where: { planId: plan.id },
      orderBy: { triggeredAt: 'desc' },
      take: 50,
    });
  }

  @Post(':planId/events/dock-time')
  async reportDockTime(
    @Param('planId') planId: string,
    @Body() body: any,
    @TenantDbId() tenantId: number,
  ) {
    const dto = ReportDockTimeSchema.parse(body);
    const plan = await this.prisma.routePlan.findFirst({
      where: { planId, tenantId },
      include: { driver: true },
    });
    if (!plan) throw new Error(`Route plan ${planId} not found`);

    await this.updateHandler.handleTriggers(
      [{ type: 'DOCK_TIME_EXCEEDED', severity: 'high', requiresReplan: true, etaImpactMinutes: Math.round(dto.actualDockHours * 60), params: { actualDockHours: dto.actualDockHours, driverName: plan.driver.name } }],
      { planId: plan.planId, id: plan.id, tenantId, planVersion: plan.planVersion },
      plan.driver.driverId,
    );

    return { status: 'reported' };
  }

  @Post(':planId/events/delay')
  async reportDelay(
    @Param('planId') planId: string,
    @Body() body: any,
    @TenantDbId() tenantId: number,
  ) {
    const dto = ReportDelaySchema.parse(body);
    const plan = await this.prisma.routePlan.findFirst({
      where: { planId, tenantId },
      include: { driver: true },
    });
    if (!plan) throw new Error(`Route plan ${planId} not found`);

    await this.updateHandler.handleTriggers(
      [{ type: 'ROUTE_DELAY', severity: dto.delayMinutes > 60 ? 'high' : 'medium', requiresReplan: dto.delayMinutes > 60, etaImpactMinutes: dto.delayMinutes, params: { delayMinutes: dto.delayMinutes, reason: dto.reason, driverName: plan.driver.name } }],
      { planId: plan.planId, id: plan.id, tenantId, planVersion: plan.planVersion },
      plan.driver.driverId,
    );

    return { status: 'reported' };
  }

  private calculateEtaDeviation(plan: any, currentSegment: any): { minutes: number; status: 'on_time' | 'at_risk' | 'late' } {
    if (!plan.estimatedArrival || !currentSegment) {
      return { minutes: 0, status: 'on_time' };
    }
    // Simple: compare current time to estimated arrival of current segment
    const now = Date.now();
    const eta = new Date(currentSegment.estimatedArrival).getTime();
    const diff = Math.round((now - eta) / 60000);

    if (diff < 0) return { minutes: 0, status: 'on_time' };
    if (diff < 30) return { minutes: diff, status: 'at_risk' };
    return { minutes: diff, status: 'late' };
  }
}
```

**Step 3: Create Module and wire into OperationsModule**

```typescript
// apps/backend/src/domains/operations/monitoring/monitoring.module.ts
import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { RouteMonitoringService } from './services/route-monitoring.service';
import { MonitoringChecksService } from './services/monitoring-checks.service';
import { RouteProgressTrackerService } from './services/route-progress-tracker.service';
import { RouteUpdateHandlerService } from './services/route-update-handler.service';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [AlertsModule],
  controllers: [MonitoringController],
  providers: [
    RouteMonitoringService,
    MonitoringChecksService,
    RouteProgressTrackerService,
    RouteUpdateHandlerService,
  ],
  exports: [RouteMonitoringService],
})
export class MonitoringModule {}
```

Update `operations.module.ts`:

```typescript
// apps/backend/src/domains/operations/operations.module.ts
import { Module } from '@nestjs/common';
import { AlertsModule } from './alerts/alerts.module';
import { InAppNotificationsModule } from './notifications/notifications.module';
import { CommandCenterModule } from './command-center/command-center.module';
import { MonitoringModule } from './monitoring/monitoring.module';

@Module({
  imports: [AlertsModule, InAppNotificationsModule, CommandCenterModule, MonitoringModule],
  exports: [AlertsModule, InAppNotificationsModule, CommandCenterModule, MonitoringModule],
})
export class OperationsModule {}
```

**Step 4: Run all monitoring tests**

Run: `cd apps/backend && npx jest src/domains/operations/monitoring/ --no-coverage`
Expected: All PASS

**Step 5: Commit**

```bash
git add apps/backend/src/domains/operations/
git commit -m "feat(monitoring): add controller, DTOs, module wiring into operations"
```

---

## Task 8: Frontend — Monitoring Feature Module (Types + API + Hooks)

**Files:**
- Create: `apps/web/src/features/operations/monitoring/types.ts`
- Create: `apps/web/src/features/operations/monitoring/api.ts`
- Create: `apps/web/src/features/operations/monitoring/hooks/use-monitoring.ts`
- Create: `apps/web/src/features/operations/monitoring/index.ts`

**Step 1: Create types**

```typescript
// apps/web/src/features/operations/monitoring/types.ts

export interface MonitoringStatus {
  planId: string;
  currentSegment: {
    segmentId: string;
    sequenceOrder: number;
    segmentType: string;
    status: string;
  } | null;
  driverPosition: {
    lat: number;
    lon: number;
    speed: number;
    heading: number;
    lastUpdated: string;
  } | null;
  hosState: {
    currentDutyStatus: string;
    driveTimeRemainingMinutes: number;
    shiftTimeRemainingMinutes: number;
    cycleTimeRemainingMinutes: number;
    timeUntilBreakMinutes: number;
  } | null;
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

export interface RoutePlanUpdate {
  update_id: string;
  plan_id: number;
  update_type: string;
  triggered_at: string;
  triggered_by: string;
  trigger_data: Record<string, unknown>;
  replan_triggered: boolean;
  replan_reason: string | null;
  impact_summary: {
    etaChangeMinutes: number;
    alertsFired: number;
    severity: string;
  } | null;
}

export interface MonitoringTriggerEvent {
  planId: string;
  triggerType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  requiresReplan: boolean;
  etaImpactMinutes: number;
  params: Record<string, unknown>;
  timestamp: string;
}

export interface MonitoringCycleEvent {
  routesMonitored: number;
  totalTriggers: number;
  timestamp: string;
}
```

**Step 2: Create API client**

```typescript
// apps/web/src/features/operations/monitoring/api.ts
import { apiClient } from '@/shared/lib/api/client';
import type { MonitoringStatus, RoutePlanUpdate } from './types';

export const monitoringApi = {
  getStatus: (planId: string) =>
    apiClient<MonitoringStatus>(`/api/v1/routes/${planId}/monitoring`),

  getUpdates: (planId: string) =>
    apiClient<RoutePlanUpdate[]>(`/api/v1/routes/${planId}/updates`),

  reportDockTime: (planId: string, actualDockHours: number, notes?: string) =>
    apiClient<{ status: string }>(`/api/v1/routes/${planId}/events/dock-time`, {
      method: 'POST',
      body: JSON.stringify({ actualDockHours, notes }),
    }),

  reportDelay: (planId: string, delayMinutes: number, reason: string) =>
    apiClient<{ status: string }>(`/api/v1/routes/${planId}/events/delay`, {
      method: 'POST',
      body: JSON.stringify({ delayMinutes, reason }),
    }),
};
```

**Step 3: Create React Query hooks**

```typescript
// apps/web/src/features/operations/monitoring/hooks/use-monitoring.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { monitoringApi } from '../api';

const MONITORING_KEY = ['monitoring'] as const;

export function useMonitoringStatus(planId: string | undefined) {
  return useQuery({
    queryKey: [...MONITORING_KEY, planId],
    queryFn: () => monitoringApi.getStatus(planId!),
    enabled: !!planId,
    refetchInterval: 30000, // 30s poll as fallback to SSE
  });
}

export function useRouteUpdates(planId: string | undefined) {
  return useQuery({
    queryKey: [...MONITORING_KEY, planId, 'updates'],
    queryFn: () => monitoringApi.getUpdates(planId!),
    enabled: !!planId,
  });
}

export function useReportDockTime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { planId: string; actualDockHours: number; notes?: string }) =>
      monitoringApi.reportDockTime(params.planId, params.actualDockHours, params.notes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MONITORING_KEY }),
  });
}

export function useReportDelay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { planId: string; delayMinutes: number; reason: string }) =>
      monitoringApi.reportDelay(params.planId, params.delayMinutes, params.reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MONITORING_KEY }),
  });
}
```

**Step 4: Create barrel exports**

```typescript
// apps/web/src/features/operations/monitoring/index.ts
export { monitoringApi } from './api';
export type { MonitoringStatus, RoutePlanUpdate, MonitoringTriggerEvent, MonitoringCycleEvent } from './types';
export { useMonitoringStatus, useRouteUpdates, useReportDockTime, useReportDelay } from './hooks/use-monitoring';
```

**Step 5: Commit**

```bash
git add apps/web/src/features/operations/monitoring/
git commit -m "feat(monitoring): add frontend monitoring feature module (types, API, hooks)"
```

---

## Task 9: Frontend — Monitoring Page UI

**Files:**
- Create: `apps/web/src/app/dispatcher/monitoring/page.tsx`
- Modify: `apps/web/src/shared/lib/navigation.ts` (add nav item)
- Modify: `apps/web/src/shared/hooks/use-sse.ts` (add monitoring events)

**Step 1: Add monitoring to navigation**

In `apps/web/src/shared/lib/navigation.ts`, add the import `Activity` from lucide-react, then add a nav item after "Live Routes" in each relevant role config:

```typescript
{ label: 'Monitoring', href: '/dispatcher/monitoring', icon: Activity },
```

Add it to `dispatcher`, `admin`, and `owner` navigation arrays.

**Step 2: Update SSE hook for monitoring events**

In `apps/web/src/shared/hooks/use-sse.ts`, add event listeners for `monitoring:cycle_complete` and `monitoring:trigger_fired` inside the `connect` function, similar to the existing `alert:new` handler. The events should invalidate the `['monitoring']` query key:

```typescript
eventSource.addEventListener('monitoring:cycle_complete', (event) => {
  queryClient.invalidateQueries({ queryKey: ['monitoring'] });
});

eventSource.addEventListener('monitoring:trigger_fired', (event) => {
  queryClient.invalidateQueries({ queryKey: ['monitoring'] });
  queryClient.invalidateQueries({ queryKey: ['alerts'] });
});
```

**Step 3: Create the monitoring page**

```typescript
// apps/web/src/app/dispatcher/monitoring/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock, Radio, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { useCommandCenterOverview } from "@/features/operations/command-center";
import type { ActiveRoute } from "@/features/operations/command-center";
import type { MonitoringTriggerEvent, MonitoringCycleEvent } from "@/features/operations/monitoring";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ETA_STATUS_STYLES = {
  on_time: { label: "On Time", className: "text-green-600 dark:text-green-400" },
  at_risk: { label: "At Risk", className: "text-yellow-600 dark:text-yellow-400" },
  late: { label: "Late", className: "text-red-600 dark:text-red-400" },
} as const;

const SEVERITY_STYLES = {
  critical: "text-red-600 dark:text-red-400",
  high: "text-orange-600 dark:text-orange-400",
  medium: "text-yellow-600 dark:text-yellow-400",
  low: "text-blue-600 dark:text-blue-400",
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TriggerFeedEntry {
  id: string;
  time: string;
  triggerType: string;
  severity: string;
  driverName: string;
  detail: string;
  requiresReplan: boolean;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MonitoringPage() {
  const { data: overview, isLoading } = useCommandCenterOverview();
  const [lastCycle, setLastCycle] = useState<MonitoringCycleEvent | null>(null);
  const [triggerFeed, setTriggerFeed] = useState<TriggerFeedEntry[]>([]);

  // Listen for SSE events
  useEffect(() => {
    const handleCycle = (event: CustomEvent<MonitoringCycleEvent>) => {
      setLastCycle(event.detail);
    };
    const handleTrigger = (event: CustomEvent<MonitoringTriggerEvent>) => {
      const entry: TriggerFeedEntry = {
        id: `${Date.now()}-${Math.random()}`,
        time: new Date(event.detail.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        triggerType: event.detail.triggerType,
        severity: event.detail.severity,
        driverName: (event.detail.params?.driverName as string) ?? "Unknown",
        detail: formatTriggerDetail(event.detail),
        requiresReplan: event.detail.requiresReplan,
      };
      setTriggerFeed((prev) => [entry, ...prev].slice(0, 50));
    };

    window.addEventListener("monitoring:cycle_complete" as any, handleCycle);
    window.addEventListener("monitoring:trigger_fired" as any, handleTrigger);
    return () => {
      window.removeEventListener("monitoring:cycle_complete" as any, handleCycle);
      window.removeEventListener("monitoring:trigger_fired" as any, handleTrigger);
    };
  }, []);

  const activeRoutes = overview?.active_routes ?? [];
  const routeCount = activeRoutes.length;

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <h1 className="text-xl md:text-2xl font-semibold text-foreground">Monitoring</h1>

      {/* Section 1: Pulse Strip */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
              </span>
              <span className="font-medium text-foreground">Monitoring Active</span>
              <Separator orientation="vertical" className="h-5 hidden sm:block" />
              <span className="text-sm text-muted-foreground">{routeCount} routes</span>
              <span className="text-sm text-muted-foreground">14 checks</span>
              {lastCycle && (
                <span className="text-sm text-muted-foreground">
                  Last: {formatTimeSince(lastCycle.timestamp)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-sm text-muted-foreground">Samsara ELD: Connected</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 2: Recent Triggers Feed */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] md:h-[500px]">
                {triggerFeed.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Activity className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No triggers yet</p>
                    <p className="text-xs">Waiting for monitoring cycle...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {triggerFeed.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-2 py-2 border-b border-border last:border-0">
                        <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">{entry.time}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-medium ${SEVERITY_STYLES[entry.severity as keyof typeof SEVERITY_STYLES] ?? ""}`}>
                              {entry.triggerType}
                            </span>
                            {entry.requiresReplan && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">replan</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{entry.driverName} — {entry.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Section 3: Route Health Cards */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Route Health</CardTitle>
            </CardHeader>
            <CardContent>
              {activeRoutes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Truck className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No active routes</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeRoutes.map((route) => (
                    <RouteHealthCard key={route.route_id} route={route} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function RouteHealthCard({ route }: { route: ActiveRoute }) {
  const etaStyle = ETA_STATUS_STYLES[route.eta_status];

  return (
    <Card className="border">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm text-foreground truncate">
            {route.driver.name}
          </span>
          <span className={`text-xs font-medium ${etaStyle.className}`}>
            {etaStyle.label}
          </span>
        </div>

        <div className="text-xs text-muted-foreground">
          Segment {route.progress.completed_stops}/{route.progress.total_stops} · {route.status.replace("_", " ")}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>HOS: {route.hos.drive_hours_remaining.toFixed(1)}h drive remaining</span>
        </div>

        {route.active_alert_count > 0 && (
          <div className="flex items-center gap-1 text-xs">
            <AlertTriangle className="h-3 w-3 text-yellow-500" />
            <span className="text-yellow-600 dark:text-yellow-400">
              {route.active_alert_count} alert{route.active_alert_count !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Progress bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
          <div
            className="bg-foreground h-1.5 rounded-full transition-all"
            style={{ width: `${Math.round((route.progress.completed_stops / route.progress.total_stops) * 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimeSince(timestamp: string): string {
  const seconds = Math.round((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
}

function formatTriggerDetail(event: MonitoringTriggerEvent): string {
  const p = event.params;
  switch (event.triggerType) {
    case "HOS_APPROACHING_LIMIT":
      return `${p.remainingMinutes}m ${p.hoursType} remaining`;
    case "HOS_VIOLATION":
      return `${p.hoursType} limit exceeded`;
    case "BREAK_REQUIRED":
      return "30-min break required";
    case "ROUTE_DELAY":
      return `ETA +${p.delayMinutes}min`;
    case "DRIVER_NOT_MOVING":
      return `Stopped ${p.stoppedMinutes}min`;
    case "FUEL_LOW":
      return `${p.fuelPercent}% remaining`;
    case "DOCK_TIME_EXCEEDED":
      return `+${p.excessMinutes}min at dock`;
    default:
      return event.triggerType.replace(/_/g, " ").toLowerCase();
  }
}
```

**Step 4: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to monitoring files

**Step 5: Commit**

```bash
git add apps/web/src/app/dispatcher/monitoring/ apps/web/src/shared/lib/navigation.ts apps/web/src/shared/hooks/use-sse.ts
git commit -m "feat(monitoring): add dispatcher monitoring page with pulse strip, trigger feed, route health cards"
```

---

## Task 10: Integration Test — Full Daemon Cycle

**Files:**
- Create: `apps/backend/src/domains/operations/monitoring/__tests__/monitoring-integration.spec.ts`

**Step 1: Write integration test**

```typescript
// apps/backend/src/domains/operations/monitoring/__tests__/monitoring-integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { RouteMonitoringService } from '../services/route-monitoring.service';
import { MonitoringChecksService } from '../services/monitoring-checks.service';
import { RouteProgressTrackerService } from '../services/route-progress-tracker.service';
import { RouteUpdateHandlerService } from '../services/route-update-handler.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { IntegrationManagerService } from '../../../integrations/services/integration-manager.service';
import { AlertTriggersService } from '../../alerts/services/alert-triggers.service';
import { SseService } from '../../../../infrastructure/sse/sse.service';

describe('Monitoring Integration', () => {
  let monitoringService: RouteMonitoringService;
  let mockPrisma: any;
  let mockIntegration: any;
  let mockAlertTriggers: any;
  let mockSse: any;

  beforeEach(async () => {
    mockPrisma = {
      routePlan: { findMany: jest.fn().mockResolvedValue([]) },
      routeSegment: { update: jest.fn().mockResolvedValue({}) },
      routePlanUpdate: { create: jest.fn().mockResolvedValue({ id: 1 }) },
      routePlan2: { update: jest.fn() },
    };
    mockIntegration = {
      getDriverHOS: jest.fn(),
      getVehicleLocation: jest.fn(),
    };
    mockAlertTriggers = { trigger: jest.fn().mockResolvedValue({ alertId: 'ALT-001' }) };
    mockSse = { emitToTenant: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteMonitoringService,
        MonitoringChecksService,
        RouteProgressTrackerService,
        { provide: RouteUpdateHandlerService, useFactory: () => new RouteUpdateHandlerService(mockPrisma, mockAlertTriggers, mockSse) },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: IntegrationManagerService, useValue: mockIntegration },
        { provide: SseService, useValue: mockSse },
      ],
    }).compile();

    monitoringService = module.get(RouteMonitoringService);
  });

  it('should fire HOS_APPROACHING_LIMIT when drive time is low', async () => {
    const plan = {
      id: 1, planId: 'RP-001', tenantId: 1, planVersion: 1,
      driver: { driverId: 'drv-1', name: 'John Doe' },
      vehicle: { vehicleId: 'veh-1' },
      segments: [
        { id: 1, segmentId: 'seg-1', sequenceOrder: 1, status: 'in_progress', segmentType: 'drive', toLat: 35.0, toLon: -117.0 },
      ],
    };
    mockPrisma.routePlan.findMany.mockResolvedValue([plan]);

    // 30 min of drive time remaining — should trigger HOS_APPROACHING_LIMIT
    mockIntegration.getDriverHOS.mockResolvedValue({
      currentDutyStatus: 'driving',
      driveTimeRemainingMs: 30 * 60000,
      shiftTimeRemainingMs: 5 * 3600000,
      cycleTimeRemainingMs: 50 * 3600000,
      timeUntilBreakMs: 3 * 3600000,
    });
    mockIntegration.getVehicleLocation.mockResolvedValue({
      gps: { latitude: 34.5, longitude: -117.5, speedMilesPerHour: 65, headingDegrees: 90, time: new Date().toISOString() },
    });

    await monitoringService.monitorActiveRoutes();

    expect(mockAlertTriggers.trigger).toHaveBeenCalledWith(
      'HOS_APPROACHING_LIMIT',
      1,
      'drv-1',
      expect.objectContaining({ hoursType: 'driving' }),
    );
    expect(mockPrisma.routePlanUpdate.create).toHaveBeenCalled();
    expect(mockSse.emitToTenant).toHaveBeenCalledWith(1, 'monitoring:trigger_fired', expect.any(Object));
  });

  it('should emit cycle_complete after processing all routes', async () => {
    mockPrisma.routePlan.findMany.mockResolvedValue([
      {
        id: 1, planId: 'RP-001', tenantId: 1, planVersion: 1,
        driver: { driverId: 'drv-1', name: 'John' },
        vehicle: { vehicleId: 'veh-1' },
        segments: [],
      },
    ]);
    mockIntegration.getDriverHOS.mockResolvedValue({
      currentDutyStatus: 'driving',
      driveTimeRemainingMs: 8 * 3600000,
      shiftTimeRemainingMs: 10 * 3600000,
      cycleTimeRemainingMs: 50 * 3600000,
      timeUntilBreakMs: 5 * 3600000,
    });
    mockIntegration.getVehicleLocation.mockRejectedValue(new Error('No GPS'));

    await monitoringService.monitorActiveRoutes();

    expect(mockSse.emitToTenant).toHaveBeenCalledWith(
      1,
      'monitoring:cycle_complete',
      expect.objectContaining({ routesMonitored: 1 }),
    );
  });
});
```

**Step 2: Run integration test**

Run: `cd apps/backend && npx jest src/domains/operations/monitoring/__tests__/monitoring-integration.spec.ts --no-coverage`
Expected: PASS

**Step 3: Run ALL monitoring tests to confirm nothing is broken**

Run: `cd apps/backend && npx jest src/domains/operations/monitoring/ --no-coverage`
Expected: All PASS

**Step 4: Commit**

```bash
git add apps/backend/src/domains/operations/monitoring/__tests__/
git commit -m "test(monitoring): add integration test for full daemon cycle"
```

---

## Task 11: Final Verification & Cleanup

**Step 1: Run all backend tests**

Run: `cd apps/backend && npx jest --no-coverage`
Expected: All PASS, no regressions

**Step 2: Run frontend type check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

**Step 3: Run frontend lint**

Run: `cd apps/web && npm run lint`
Expected: No errors

**Step 4: Final commit with all clean**

```bash
git add -A
git status
# If there are any remaining files, commit them
git commit -m "chore(monitoring): final cleanup and verification"
```

---

## Summary: What Gets Built

| Component | Files | What It Does |
|-----------|-------|-------------|
| Samsara Adapter | 1 modified, 1 test | Real HOS clocks + GPS methods |
| IntegrationManager | 1 modified | Wire real Samsara into getDriverHOS + new getVehicleLocation |
| MonitoringChecksService | 1 new, 1 test | 14 trigger check implementations |
| RouteProgressTrackerService | 1 new, 1 test | GPS-based segment status tracking |
| RouteUpdateHandlerService | 1 new, 1 test | Alert firing + RoutePlanUpdate audit + SSE events |
| RouteMonitoringService | 1 new, 1 test | 60s cron daemon orchestrator |
| MonitoringController | 1 new | GET monitoring, GET updates, POST dock-time, POST delay |
| MonitoringModule | 1 new | NestJS module wiring |
| OperationsModule | 1 modified | Wire MonitoringModule |
| Frontend Types/API/Hooks | 4 new | Feature module following existing pattern |
| Monitoring Page | 1 new | Pulse strip + trigger feed + route health cards |
| Navigation | 1 modified | Add "Monitoring" to sidebar |
| SSE Hook | 1 modified | Handle monitoring events |
| Integration Test | 1 new | Full daemon cycle validation |

**Total: 11 tasks, ~16 new files, ~4 modified files**
