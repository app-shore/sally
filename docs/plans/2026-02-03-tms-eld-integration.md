# TMS/ELD Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement hybrid TMS/ELD integration architecture where TMS (Project44) is source of truth for operational data and ELD (Samsara) enriches with HOS/telematics data.

**Architecture:** Pull-based enrichment model with separate TMS and ELD sync services that merge data in database. Auto-sync as primary mechanism (TMS: 1hr, ELD: 5min) with manual sync fallback in Settings → Integrations.

**Tech Stack:** NestJS, Prisma ORM, PostgreSQL, JSONB, @nestjs/schedule (cron), Zustand, React Query

---

## Task 1: Database Schema Enhancement

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/YYYYMMDDHHMMSS_add_tms_eld_fields/migration.sql`

**Step 1: Write the failing test**

Create: `apps/backend/src/models/__tests__/vehicle.schema.test.ts`

```typescript
import { PrismaClient } from '@prisma/client';

describe('Vehicle Schema', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should store TMS vehicle fields', async () => {
    const vehicle = await prisma.vehicle.create({
      data: {
        externalId: 'TMS-001',
        make: 'FREIGHTLINER',
        model: 'CASCADIA',
        year: 2018,
        vin: '1FUJGHDV9JLJY8062',
        licensePlate: 'TX R70-1836',
        status: 'ACTIVE',
        tenantId: 'test-tenant',
      },
    });

    expect(vehicle.make).toBe('FREIGHTLINER');
    expect(vehicle.model).toBe('CASCADIA');
    expect(vehicle.year).toBe(2018);
    expect(vehicle.vin).toBe('1FUJGHDV9JLJY8062');
    expect(vehicle.licensePlate).toBe('TX R70-1836');
  });

  it('should store ELD telematics metadata in JSONB', async () => {
    const vehicle = await prisma.vehicle.create({
      data: {
        externalId: 'TMS-002',
        vin: '3AKJHPDV2KSKA4482',
        tenantId: 'test-tenant',
        eldTelematicsMetadata: {
          eldVendor: 'SAMSARA_ELD',
          eldId: '281474996387575',
          serial: 'G9NP7UVUFS',
          gateway: {
            serial: 'G9NP-7UV-UFS',
            model: 'VG55NA',
          },
          esn: '471928S0565797',
          lastSyncAt: new Date().toISOString(),
        },
      },
    });

    expect(vehicle.eldTelematicsMetadata).toHaveProperty('eldVendor', 'SAMSARA_ELD');
    expect(vehicle.eldTelematicsMetadata).toHaveProperty('eldId');
    expect(vehicle.eldTelematicsMetadata).toHaveProperty('serial');
  });
});
```

Create: `apps/backend/src/models/__tests__/driver.schema.test.ts`

```typescript
import { PrismaClient } from '@prisma/client';

describe('Driver Schema', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should store TMS driver fields', async () => {
    const driver = await prisma.driver.create({
      data: {
        externalId: 'TMS-D001',
        firstName: 'John',
        lastName: 'Smith',
        phone: '+19788856169',
        licenseNumber: 'NHL14227039',
        licenseState: 'NH',
        status: 'ACTIVE',
        tenantId: 'test-tenant',
      },
    });

    expect(driver.licenseState).toBe('NH');
  });

  it('should store ELD metadata in JSONB', async () => {
    const driver = await prisma.driver.create({
      data: {
        externalId: 'TMS-D002',
        firstName: 'Oscar',
        lastName: 'Toribo',
        phone: '+19788856169',
        tenantId: 'test-tenant',
        eldMetadata: {
          eldVendor: 'SAMSARA_ELD',
          eldId: '53207939',
          username: 'Oscar',
          eldSettings: {
            rulesets: [
              {
                cycle: 'USA 70 hour / 8 day',
                shift: 'US Interstate Property',
                restart: '34-hour Restart',
                break: 'Property (off-duty/sleeper)',
              },
            ],
          },
          timezone: 'America/New_York',
          lastSyncAt: new Date().toISOString(),
        },
      },
    });

    expect(driver.eldMetadata).toHaveProperty('eldVendor', 'SAMSARA_ELD');
    expect(driver.eldMetadata).toHaveProperty('eldSettings');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && npm test -- vehicle.schema.test.ts driver.schema.test.ts`
Expected: FAIL with "column does not exist" errors

**Step 3: Write schema migration**

Modify: `apps/backend/prisma/schema.prisma`

```prisma
model Vehicle {
  id                      String    @id @default(cuid())
  externalId              String    @unique // TMS vehicle ID
  tenantId                String

  // TMS Fields (source of truth for operational data)
  make                    String?   // NEW: e.g., "FREIGHTLINER"
  model                   String?   // NEW: e.g., "CASCADIA"
  year                    Int?      // NEW: e.g., 2018
  vin                     String?   // NEW: Vehicle Identification Number
  licensePlate            String?   // NEW: e.g., "TX R70-1836"
  status                  String    // ACTIVE, INACTIVE, MAINTENANCE
  capacity                Float?

  // ELD Telematics Metadata (JSONB - vendor agnostic)
  eldTelematicsMetadata   Json?     // NEW: { eldVendor, eldId, serial, gateway, esn, lastSyncAt }

  // Timestamps
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt

  // Relations
  tenant                  Tenant    @relation(fields: [tenantId], references: [id])
  loads                   Load[]

  // Indexes
  @@index([tenantId])
  @@index([vin])          // NEW: For matching across systems
  @@index([licensePlate]) // NEW: For quick lookup
  @@index([status])
}

model Driver {
  id                      String    @id @default(cuid())
  externalId              String    @unique // TMS driver ID
  tenantId                String

  // TMS Fields (source of truth for operational data)
  firstName               String
  lastName                String
  phone                   String?
  email                   String?
  licenseNumber           String?
  licenseState            String?   // NEW: e.g., "NH", "MA"
  status                  String    // ACTIVE, INACTIVE, ON_LEAVE

  // ELD HOS Metadata (JSONB - vendor agnostic)
  eldMetadata             Json?     // NEW: { eldVendor, eldId, username, eldSettings, timezone, lastSyncAt }

  // Timestamps
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt

  // Relations
  tenant                  Tenant    @relation(fields: [tenantId], references: [id])
  loads                   Load[]
  hosData                 HosData[]

  // Indexes
  @@index([tenantId])
  @@index([phone])        // NEW: For matching across systems
  @@index([licenseNumber, licenseState]) // NEW: Composite for matching
  @@index([status])
}
```

**Step 4: Generate and run migration**

Run: `cd apps/backend && npx prisma migrate dev --name add_tms_eld_fields`
Expected: Migration created and applied successfully

**Step 5: Run tests to verify they pass**

Run: `cd apps/backend && npm test -- vehicle.schema.test.ts driver.schema.test.ts`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations apps/backend/src/models/__tests__
git commit -m "feat(schema): add TMS/ELD fields for hybrid integration

- Add vehicle fields: make, model, year, vin, licensePlate
- Add driver field: licenseState
- Add JSONB fields: eldTelematicsMetadata (vehicles), eldMetadata (drivers)
- Add indexes for VIN, license plate, phone, license+state matching
- Tests verify TMS and ELD data storage"
```

---

## Task 2: Matching Service - Vehicle Matcher

**Files:**
- Create: `apps/backend/src/services/sync/matching/vehicle-matcher.ts`
- Create: `apps/backend/src/services/sync/matching/__tests__/vehicle-matcher.test.ts`

**Step 1: Write the failing test**

Create: `apps/backend/src/services/sync/matching/__tests__/vehicle-matcher.test.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { VehicleMatcher } from '../vehicle-matcher';

describe('VehicleMatcher', () => {
  let matcher: VehicleMatcher;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleMatcher,
        {
          provide: PrismaService,
          useValue: {
            vehicle: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    matcher = module.get<VehicleMatcher>(VehicleMatcher);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('matchByVin', () => {
    it('should find vehicle by VIN', async () => {
      const mockVehicle = {
        id: 'vehicle-1',
        vin: '1FUJGHDV9JLJY8062',
        tenantId: 'tenant-1',
      };

      jest.spyOn(prisma.vehicle, 'findFirst').mockResolvedValue(mockVehicle as any);

      const result = await matcher.matchByVin('tenant-1', '1FUJGHDV9JLJY8062');

      expect(result).toEqual(mockVehicle);
      expect(prisma.vehicle.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          vin: '1FUJGHDV9JLJY8062',
        },
      });
    });

    it('should return null if no vehicle found', async () => {
      jest.spyOn(prisma.vehicle, 'findFirst').mockResolvedValue(null);

      const result = await matcher.matchByVin('tenant-1', 'UNKNOWN-VIN');

      expect(result).toBeNull();
    });
  });

  describe('matchByLicensePlate', () => {
    it('should find vehicle by license plate', async () => {
      const mockVehicle = {
        id: 'vehicle-2',
        licensePlate: 'TX R70-1836',
        tenantId: 'tenant-1',
      };

      jest.spyOn(prisma.vehicle, 'findFirst').mockResolvedValue(mockVehicle as any);

      const result = await matcher.matchByLicensePlate('tenant-1', 'TX R70-1836');

      expect(result).toEqual(mockVehicle);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && npm test -- vehicle-matcher.test.ts`
Expected: FAIL with "VehicleMatcher is not defined"

**Step 3: Write minimal implementation**

Create: `apps/backend/src/services/sync/matching/vehicle-matcher.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Vehicle } from '@prisma/client';

@Injectable()
export class VehicleMatcher {
  constructor(private prisma: PrismaService) {}

  /**
   * Match vehicle by VIN (primary matching strategy)
   */
  async matchByVin(tenantId: string, vin: string): Promise<Vehicle | null> {
    if (!vin) return null;

    return this.prisma.vehicle.findFirst({
      where: {
        tenantId,
        vin,
      },
    });
  }

  /**
   * Match vehicle by license plate (fallback)
   */
  async matchByLicensePlate(tenantId: string, licensePlate: string): Promise<Vehicle | null> {
    if (!licensePlate) return null;

    return this.prisma.vehicle.findFirst({
      where: {
        tenantId,
        licensePlate,
      },
    });
  }

  /**
   * Match vehicle with fallback strategy: VIN → License Plate
   */
  async match(tenantId: string, data: { vin?: string; licensePlate?: string }): Promise<Vehicle | null> {
    // Try VIN first (most reliable)
    if (data.vin) {
      const match = await this.matchByVin(tenantId, data.vin);
      if (match) return match;
    }

    // Fallback to license plate
    if (data.licensePlate) {
      return this.matchByLicensePlate(tenantId, data.licensePlate);
    }

    return null;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd apps/backend && npm test -- vehicle-matcher.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add apps/backend/src/services/sync/matching
git commit -m "feat(sync): add vehicle matcher service

- Match vehicles by VIN (primary strategy)
- Fallback to license plate matching
- Tests verify matching logic"
```

---

## Task 3: Matching Service - Driver Matcher

**Files:**
- Create: `apps/backend/src/services/sync/matching/driver-matcher.ts`
- Create: `apps/backend/src/services/sync/matching/__tests__/driver-matcher.test.ts`

**Step 1: Write the failing test**

Create: `apps/backend/src/services/sync/matching/__tests__/driver-matcher.test.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { DriverMatcher } from '../driver-matcher';

describe('DriverMatcher', () => {
  let matcher: DriverMatcher;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriverMatcher,
        {
          provide: PrismaService,
          useValue: {
            driver: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    matcher = module.get<DriverMatcher>(DriverMatcher);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('matchByPhone', () => {
    it('should find driver by phone', async () => {
      const mockDriver = {
        id: 'driver-1',
        phone: '+19788856169',
        tenantId: 'tenant-1',
      };

      jest.spyOn(prisma.driver, 'findFirst').mockResolvedValue(mockDriver as any);

      const result = await matcher.matchByPhone('tenant-1', '+19788856169');

      expect(result).toEqual(mockDriver);
      expect(prisma.driver.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          phone: '+19788856169',
        },
      });
    });
  });

  describe('matchByLicense', () => {
    it('should find driver by license number and state', async () => {
      const mockDriver = {
        id: 'driver-2',
        licenseNumber: 'NHL14227039',
        licenseState: 'NH',
        tenantId: 'tenant-1',
      };

      jest.spyOn(prisma.driver, 'findFirst').mockResolvedValue(mockDriver as any);

      const result = await matcher.matchByLicense('tenant-1', 'NHL14227039', 'NH');

      expect(result).toEqual(mockDriver);
      expect(prisma.driver.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          licenseNumber: 'NHL14227039',
          licenseState: 'NH',
        },
      });
    });
  });

  describe('match', () => {
    it('should prioritize phone matching over license', async () => {
      const mockDriver = {
        id: 'driver-1',
        phone: '+19788856169',
        tenantId: 'tenant-1',
      };

      jest.spyOn(prisma.driver, 'findFirst').mockResolvedValue(mockDriver as any);

      const result = await matcher.match('tenant-1', {
        phone: '+19788856169',
        licenseNumber: 'NHL14227039',
        licenseState: 'NH',
      });

      expect(result).toEqual(mockDriver);
      // Should only call phone match, not license
      expect(prisma.driver.findFirst).toHaveBeenCalledTimes(1);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && npm test -- driver-matcher.test.ts`
Expected: FAIL with "DriverMatcher is not defined"

**Step 3: Write minimal implementation**

Create: `apps/backend/src/services/sync/matching/driver-matcher.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Driver } from '@prisma/client';

@Injectable()
export class DriverMatcher {
  constructor(private prisma: PrismaService) {}

  /**
   * Match driver by phone (primary matching strategy)
   */
  async matchByPhone(tenantId: string, phone: string): Promise<Driver | null> {
    if (!phone) return null;

    return this.prisma.driver.findFirst({
      where: {
        tenantId,
        phone,
      },
    });
  }

  /**
   * Match driver by license number + state (fallback)
   */
  async matchByLicense(tenantId: string, licenseNumber: string, licenseState: string): Promise<Driver | null> {
    if (!licenseNumber || !licenseState) return null;

    return this.prisma.driver.findFirst({
      where: {
        tenantId,
        licenseNumber,
        licenseState,
      },
    });
  }

  /**
   * Match driver with fallback strategy: Phone → License+State
   */
  async match(
    tenantId: string,
    data: { phone?: string; licenseNumber?: string; licenseState?: string }
  ): Promise<Driver | null> {
    // Try phone first (most reliable)
    if (data.phone) {
      const match = await this.matchByPhone(tenantId, data.phone);
      if (match) return match;
    }

    // Fallback to license number + state
    if (data.licenseNumber && data.licenseState) {
      return this.matchByLicense(tenantId, data.licenseNumber, data.licenseState);
    }

    return null;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd apps/backend && npm test -- driver-matcher.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add apps/backend/src/services/sync/matching/driver-matcher.ts apps/backend/src/services/sync/matching/__tests__/driver-matcher.test.ts
git commit -m "feat(sync): add driver matcher service

- Match drivers by phone (primary strategy)
- Fallback to license number + state matching
- Tests verify matching logic with fallback"
```

---

## Task 4: Merging Service - Vehicle Merger

**Files:**
- Create: `apps/backend/src/services/sync/merging/vehicle-merger.ts`
- Create: `apps/backend/src/services/sync/merging/__tests__/vehicle-merger.test.ts`

**Step 1: Write the failing test**

Create: `apps/backend/src/services/sync/merging/__tests__/vehicle-merger.test.ts`

```typescript
import { VehicleMerger } from '../vehicle-merger';

describe('VehicleMerger', () => {
  let merger: VehicleMerger;

  beforeEach(() => {
    merger = new VehicleMerger();
  });

  it('should prioritize TMS operational data over ELD', () => {
    const tmsData = {
      make: 'FREIGHTLINER',
      model: 'CASCADIA',
      year: 2018,
      vin: '1FUJGHDV9JLJY8062',
      licensePlate: 'TX R70-1836',
      status: 'ACTIVE',
    };

    const eldData = {
      make: 'FREIGHTLINER_WRONG', // Should be ignored
      model: 'CASCADIA_WRONG',
      eldId: '281474996387574',
      serial: 'G97TEAX5GM',
    };

    const merged = merger.merge(tmsData, eldData);

    expect(merged.make).toBe('FREIGHTLINER'); // TMS wins
    expect(merged.model).toBe('CASCADIA'); // TMS wins
    expect(merged.eldTelematicsMetadata).toMatchObject({
      eldId: '281474996387574',
      serial: 'G97TEAX5GM',
    });
  });

  it('should use ELD data when TMS data is missing', () => {
    const tmsData = {
      vin: '1FUJGHDV9JLJY8062',
      status: 'ACTIVE',
      // No make/model from TMS
    };

    const eldData = {
      make: 'FREIGHTLINER',
      model: 'CASCADIA',
      eldId: '281474996387574',
    };

    const merged = merger.merge(tmsData, eldData);

    expect(merged.make).toBe('FREIGHTLINER'); // ELD fills gap
    expect(merged.model).toBe('CASCADIA'); // ELD fills gap
  });

  it('should package ELD data into eldTelematicsMetadata JSONB', () => {
    const tmsData = {
      vin: '1FUJGHDV9JLJY8062',
    };

    const eldData = {
      eldVendor: 'SAMSARA_ELD',
      eldId: '281474996387574',
      serial: 'G97TEAX5GM',
      gateway: { serial: 'G97T-EAX-5GM', model: 'VG55NA' },
      esn: '471928S0529795',
    };

    const merged = merger.merge(tmsData, eldData);

    expect(merged.eldTelematicsMetadata).toEqual({
      eldVendor: 'SAMSARA_ELD',
      eldId: '281474996387574',
      serial: 'G97TEAX5GM',
      gateway: { serial: 'G97T-EAX-5GM', model: 'VG55NA' },
      esn: '471928S0529795',
      lastSyncAt: expect.any(String),
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && npm test -- vehicle-merger.test.ts`
Expected: FAIL with "VehicleMerger is not defined"

**Step 3: Write minimal implementation**

Create: `apps/backend/src/services/sync/merging/vehicle-merger.ts`

```typescript
import { Injectable } from '@nestjs/common';

interface TmsVehicleData {
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  licensePlate?: string;
  status?: string;
  capacity?: number;
}

interface EldVehicleData {
  eldVendor?: string;
  eldId?: string;
  serial?: string;
  gateway?: { serial: string; model: string };
  esn?: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  licensePlate?: string;
}

interface MergedVehicleData extends TmsVehicleData {
  eldTelematicsMetadata?: any;
}

@Injectable()
export class VehicleMerger {
  /**
   * Merge TMS and ELD vehicle data with priority rules:
   * - TMS wins: operational data (make, model, year, vin, licensePlate, status)
   * - ELD wins: telematics data (serial, gateway, esn)
   * - ELD fills gaps when TMS data is missing
   */
  merge(tmsData: TmsVehicleData = {}, eldData: EldVehicleData = {}): MergedVehicleData {
    const merged: MergedVehicleData = {
      // Operational data: TMS wins, ELD fills gaps
      make: tmsData.make || eldData.make,
      model: tmsData.model || eldData.model,
      year: tmsData.year || eldData.year,
      vin: tmsData.vin || eldData.vin,
      licensePlate: tmsData.licensePlate || eldData.licensePlate,
      status: tmsData.status,
      capacity: tmsData.capacity,
    };

    // Package ELD telematics data into JSONB
    if (eldData.eldId) {
      merged.eldTelematicsMetadata = {
        eldVendor: eldData.eldVendor,
        eldId: eldData.eldId,
        serial: eldData.serial,
        gateway: eldData.gateway,
        esn: eldData.esn,
        lastSyncAt: new Date().toISOString(),
      };
    }

    return merged;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd apps/backend && npm test -- vehicle-merger.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add apps/backend/src/services/sync/merging
git commit -m "feat(sync): add vehicle merger service

- TMS wins operational data (make, model, status)
- ELD wins telematics data (serial, gateway, esn)
- ELD fills gaps when TMS data missing
- Package ELD data into eldTelematicsMetadata JSONB
- Tests verify merge priority rules"
```

---

## Task 5: Merging Service - Driver Merger

**Files:**
- Create: `apps/backend/src/services/sync/merging/driver-merger.ts`
- Create: `apps/backend/src/services/sync/merging/__tests__/driver-merger.test.ts`

**Step 1: Write the failing test**

Create: `apps/backend/src/services/sync/merging/__tests__/driver-merger.test.ts`

```typescript
import { DriverMerger } from '../driver-merger';

describe('DriverMerger', () => {
  let merger: DriverMerger;

  beforeEach(() => {
    merger = new DriverMerger();
  });

  it('should prioritize TMS operational data over ELD', () => {
    const tmsData = {
      firstName: 'John',
      lastName: 'Smith',
      phone: '+19788856169',
      licenseNumber: 'NHL14227039',
      licenseState: 'NH',
      status: 'ACTIVE',
    };

    const eldData = {
      name: 'Oscar Toribo', // Should be ignored
      phone: '+1-978-885-6169', // Wrong format
      eldId: '53207939',
      username: 'Oscar',
    };

    const merged = merger.merge(tmsData, eldData);

    expect(merged.firstName).toBe('John'); // TMS wins
    expect(merged.lastName).toBe('Smith'); // TMS wins
    expect(merged.phone).toBe('+19788856169'); // TMS wins
    expect(merged.eldMetadata).toMatchObject({
      eldId: '53207939',
      username: 'Oscar',
    });
  });

  it('should use ELD data when TMS data is missing', () => {
    const tmsData = {
      firstName: 'John',
      // No phone or license from TMS
    };

    const eldData = {
      phone: '+19788856169',
      licenseNumber: 'NHL14227039',
      licenseState: 'NH',
      eldId: '53207939',
    };

    const merged = merger.merge(tmsData, eldData);

    expect(merged.phone).toBe('+19788856169'); // ELD fills gap
    expect(merged.licenseNumber).toBe('NHL14227039'); // ELD fills gap
    expect(merged.licenseState).toBe('NH'); // ELD fills gap
  });

  it('should package ELD HOS data into eldMetadata JSONB', () => {
    const tmsData = {
      firstName: 'Oscar',
      phone: '+19788856169',
    };

    const eldData = {
      eldVendor: 'SAMSARA_ELD',
      eldId: '53207939',
      username: 'Oscar',
      eldSettings: {
        rulesets: [
          {
            cycle: 'USA 70 hour / 8 day',
            shift: 'US Interstate Property',
            restart: '34-hour Restart',
            break: 'Property (off-duty/sleeper)',
          },
        ],
      },
      timezone: 'America/New_York',
    };

    const merged = merger.merge(tmsData, eldData);

    expect(merged.eldMetadata).toEqual({
      eldVendor: 'SAMSARA_ELD',
      eldId: '53207939',
      username: 'Oscar',
      eldSettings: {
        rulesets: [
          {
            cycle: 'USA 70 hour / 8 day',
            shift: 'US Interstate Property',
            restart: '34-hour Restart',
            break: 'Property (off-duty/sleeper)',
          },
        ],
      },
      timezone: 'America/New_York',
      lastSyncAt: expect.any(String),
    });
  });

  it('should preserve admin-controlled status over ELD status', () => {
    const tmsData = {
      firstName: 'John',
      status: 'INACTIVE', // Admin set to inactive
    };

    const eldData = {
      driverActivationStatus: 'active', // ELD says active
      eldId: '53207939',
    };

    const merged = merger.merge(tmsData, eldData);

    expect(merged.status).toBe('INACTIVE'); // TMS/Admin wins
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && npm test -- driver-merger.test.ts`
Expected: FAIL with "DriverMerger is not defined"

**Step 3: Write minimal implementation**

Create: `apps/backend/src/services/sync/merging/driver-merger.ts`

```typescript
import { Injectable } from '@nestjs/common';

interface TmsDriverData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  licenseNumber?: string;
  licenseState?: string;
  status?: string;
}

interface EldDriverData {
  eldVendor?: string;
  eldId?: string;
  name?: string;
  username?: string;
  phone?: string;
  licenseNumber?: string;
  licenseState?: string;
  eldSettings?: any;
  timezone?: string;
  driverActivationStatus?: string;
}

interface MergedDriverData extends TmsDriverData {
  eldMetadata?: any;
}

@Injectable()
export class DriverMerger {
  /**
   * Merge TMS and ELD driver data with priority rules:
   * - TMS wins: operational data (name, phone, license, status)
   * - ELD wins: HOS data (eldSettings, timezone)
   * - Admin wins: activation status (override both TMS and ELD)
   * - ELD fills gaps when TMS data is missing
   */
  merge(tmsData: TmsDriverData = {}, eldData: EldDriverData = {}): MergedDriverData {
    const merged: MergedDriverData = {
      // Operational data: TMS wins, ELD fills gaps
      firstName: tmsData.firstName,
      lastName: tmsData.lastName,
      phone: tmsData.phone || eldData.phone,
      email: tmsData.email,
      licenseNumber: tmsData.licenseNumber || eldData.licenseNumber,
      licenseState: tmsData.licenseState || eldData.licenseState,
      status: tmsData.status, // Admin/TMS always wins on status
    };

    // Package ELD HOS data into JSONB
    if (eldData.eldId) {
      merged.eldMetadata = {
        eldVendor: eldData.eldVendor,
        eldId: eldData.eldId,
        username: eldData.username,
        eldSettings: eldData.eldSettings,
        timezone: eldData.timezone,
        lastSyncAt: new Date().toISOString(),
      };
    }

    return merged;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd apps/backend && npm test -- driver-merger.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add apps/backend/src/services/sync/merging/driver-merger.ts apps/backend/src/services/sync/merging/__tests__/driver-merger.test.ts
git commit -m "feat(sync): add driver merger service

- TMS wins operational data (name, phone, license)
- ELD wins HOS data (eldSettings, timezone)
- Admin wins activation status
- ELD fills gaps when TMS data missing
- Package ELD data into eldMetadata JSONB
- Tests verify merge priority rules"
```

---

## Task 6: TMS Sync Service

**Files:**
- Create: `apps/backend/src/services/sync/tms-sync.service.ts`
- Create: `apps/backend/src/services/sync/__tests__/tms-sync.service.test.ts`

**Step 1: Write the failing test**

Create: `apps/backend/src/services/sync/__tests__/tms-sync.service.test.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TmsSyncService } from '../tms-sync.service';
import { PrismaService } from '@/prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';

describe('TmsSyncService', () => {
  let service: TmsSyncService;
  let prisma: PrismaService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TmsSyncService,
        {
          provide: PrismaService,
          useValue: {
            vehicle: {
              upsert: jest.fn(),
            },
            driver: {
              upsert: jest.fn(),
            },
            integrationConfig: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TmsSyncService>(TmsSyncService);
    prisma = module.get<PrismaService>(PrismaService);
    httpService = module.get<HttpService>(HttpService);
  });

  describe('syncVehicles', () => {
    it('should fetch and upsert vehicles from TMS', async () => {
      const mockTmsVehicles = [
        {
          id: 'TMS-V001',
          make: 'FREIGHTLINER',
          model: 'CASCADIA',
          year: 2018,
          vin: '1FUJGHDV9JLJY8062',
          licensePlate: 'TX R70-1836',
          status: 'ACTIVE',
        },
      ];

      const mockIntegration = {
        id: 'integration-1',
        tenantId: 'tenant-1',
        credentials: { apiKey: 'test-key', baseUrl: 'https://tms.example.com' },
      };

      jest.spyOn(prisma.integrationConfig, 'findUnique').mockResolvedValue(mockIntegration as any);
      jest.spyOn(httpService, 'get').mockReturnValue(of({ data: mockTmsVehicles }) as any);
      jest.spyOn(prisma.vehicle, 'upsert').mockResolvedValue({} as any);

      await service.syncVehicles('integration-1');

      expect(httpService.get).toHaveBeenCalledWith(
        'https://tms.example.com/api/vehicles',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-key' },
        })
      );

      expect(prisma.vehicle.upsert).toHaveBeenCalledWith({
        where: { externalId: 'TMS-V001' },
        update: expect.objectContaining({
          make: 'FREIGHTLINER',
          model: 'CASCADIA',
        }),
        create: expect.objectContaining({
          externalId: 'TMS-V001',
          make: 'FREIGHTLINER',
        }),
      });
    });
  });

  describe('syncDrivers', () => {
    it('should fetch and upsert drivers from TMS', async () => {
      const mockTmsDrivers = [
        {
          id: 'TMS-D001',
          firstName: 'John',
          lastName: 'Smith',
          phone: '+19788856169',
          licenseNumber: 'NHL14227039',
          licenseState: 'NH',
          status: 'ACTIVE',
        },
      ];

      const mockIntegration = {
        id: 'integration-1',
        tenantId: 'tenant-1',
        credentials: { apiKey: 'test-key', baseUrl: 'https://tms.example.com' },
      };

      jest.spyOn(prisma.integrationConfig, 'findUnique').mockResolvedValue(mockIntegration as any);
      jest.spyOn(httpService, 'get').mockReturnValue(of({ data: mockTmsDrivers }) as any);
      jest.spyOn(prisma.driver, 'upsert').mockResolvedValue({} as any);

      await service.syncDrivers('integration-1');

      expect(prisma.driver.upsert).toHaveBeenCalledWith({
        where: { externalId: 'TMS-D001' },
        update: expect.objectContaining({
          firstName: 'John',
          lastName: 'Smith',
        }),
        create: expect.objectContaining({
          externalId: 'TMS-D001',
          firstName: 'John',
        }),
      });
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && npm test -- tms-sync.service.test.ts`
Expected: FAIL with "TmsSyncService is not defined"

**Step 3: Write minimal implementation**

Create: `apps/backend/src/services/sync/tms-sync.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TmsSyncService {
  private readonly logger = new Logger(TmsSyncService.name);

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  /**
   * Sync vehicles from TMS API
   */
  async syncVehicles(integrationId: string): Promise<void> {
    this.logger.log(`Starting TMS vehicle sync for integration: ${integrationId}`);

    // Get integration config
    const integration = await this.prisma.integrationConfig.findUnique({
      where: { id: integrationId },
    });

    if (!integration || integration.vendor !== 'PROJECT44_TMS') {
      throw new Error('Invalid TMS integration');
    }

    const { apiKey, baseUrl } = integration.credentials as any;
    const { tenantId } = integration;

    // Fetch vehicles from TMS
    const response = await firstValueFrom(
      this.httpService.get(`${baseUrl}/api/vehicles`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
    );

    const tmsVehicles = response.data;

    // Upsert each vehicle
    for (const tmsVehicle of tmsVehicles) {
      await this.prisma.vehicle.upsert({
        where: { externalId: tmsVehicle.id },
        update: {
          make: tmsVehicle.make,
          model: tmsVehicle.model,
          year: tmsVehicle.year,
          vin: tmsVehicle.vin,
          licensePlate: tmsVehicle.licensePlate,
          status: tmsVehicle.status,
          capacity: tmsVehicle.capacity,
        },
        create: {
          externalId: tmsVehicle.id,
          tenantId,
          make: tmsVehicle.make,
          model: tmsVehicle.model,
          year: tmsVehicle.year,
          vin: tmsVehicle.vin,
          licensePlate: tmsVehicle.licensePlate,
          status: tmsVehicle.status,
          capacity: tmsVehicle.capacity,
        },
      });
    }

    // Update last sync timestamp
    await this.prisma.integrationConfig.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() },
    });

    this.logger.log(`Synced ${tmsVehicles.length} vehicles from TMS`);
  }

  /**
   * Sync drivers from TMS API
   */
  async syncDrivers(integrationId: string): Promise<void> {
    this.logger.log(`Starting TMS driver sync for integration: ${integrationId}`);

    const integration = await this.prisma.integrationConfig.findUnique({
      where: { id: integrationId },
    });

    if (!integration || integration.vendor !== 'PROJECT44_TMS') {
      throw new Error('Invalid TMS integration');
    }

    const { apiKey, baseUrl } = integration.credentials as any;
    const { tenantId } = integration;

    // Fetch drivers from TMS
    const response = await firstValueFrom(
      this.httpService.get(`${baseUrl}/api/drivers`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
    );

    const tmsDrivers = response.data;

    // Upsert each driver
    for (const tmsDriver of tmsDrivers) {
      await this.prisma.driver.upsert({
        where: { externalId: tmsDriver.id },
        update: {
          firstName: tmsDriver.firstName,
          lastName: tmsDriver.lastName,
          phone: tmsDriver.phone,
          email: tmsDriver.email,
          licenseNumber: tmsDriver.licenseNumber,
          licenseState: tmsDriver.licenseState,
          status: tmsDriver.status,
        },
        create: {
          externalId: tmsDriver.id,
          tenantId,
          firstName: tmsDriver.firstName,
          lastName: tmsDriver.lastName,
          phone: tmsDriver.phone,
          email: tmsDriver.email,
          licenseNumber: tmsDriver.licenseNumber,
          licenseState: tmsDriver.licenseState,
          status: tmsDriver.status,
        },
      });
    }

    await this.prisma.integrationConfig.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() },
    });

    this.logger.log(`Synced ${tmsDrivers.length} drivers from TMS`);
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd apps/backend && npm test -- tms-sync.service.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add apps/backend/src/services/sync/tms-sync.service.ts apps/backend/src/services/sync/__tests__/tms-sync.service.test.ts
git commit -m "feat(sync): add TMS sync service

- Fetch vehicles from TMS API
- Fetch drivers from TMS API
- Upsert records to database
- Update lastSyncAt timestamp
- Tests verify API calls and upserts"
```

---

## Task 7: ELD Sync Service

**Files:**
- Create: `apps/backend/src/services/sync/eld-sync.service.ts`
- Create: `apps/backend/src/services/sync/__tests__/eld-sync.service.test.ts`

**Step 1: Write the failing test**

Create: `apps/backend/src/services/sync/__tests__/eld-sync.service.test.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { EldSyncService } from '../eld-sync.service';
import { PrismaService } from '@/prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { VehicleMatcher } from '../matching/vehicle-matcher';
import { DriverMatcher } from '../matching/driver-matcher';
import { VehicleMerger } from '../merging/vehicle-merger';
import { DriverMerger } from '../merging/driver-merger';
import { of } from 'rxjs';

describe('EldSyncService', () => {
  let service: EldSyncService;
  let prisma: PrismaService;
  let vehicleMatcher: VehicleMatcher;
  let vehicleMerger: VehicleMerger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EldSyncService,
        {
          provide: PrismaService,
          useValue: {
            vehicle: { update: jest.fn() },
            driver: { update: jest.fn() },
            integrationConfig: { findUnique: jest.fn(), update: jest.fn() },
          },
        },
        {
          provide: HttpService,
          useValue: { get: jest.fn() },
        },
        {
          provide: VehicleMatcher,
          useValue: { match: jest.fn() },
        },
        {
          provide: DriverMatcher,
          useValue: { match: jest.fn() },
        },
        {
          provide: VehicleMerger,
          useValue: { merge: jest.fn() },
        },
        {
          provide: DriverMerger,
          useValue: { merge: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<EldSyncService>(EldSyncService);
    prisma = module.get<PrismaService>(PrismaService);
    vehicleMatcher = module.get<VehicleMatcher>(VehicleMatcher);
    vehicleMerger = module.get<VehicleMerger>(VehicleMerger);
  });

  describe('syncVehicles', () => {
    it('should match ELD vehicles to existing DB vehicles and merge data', async () => {
      const mockEldVehicles = [
        {
          id: '281474996387574',
          vin: '1FUJGHDV9JLJY8062',
          make: 'FREIGHTLINER',
          serial: 'G97TEAX5GM',
        },
      ];

      const mockDbVehicle = {
        id: 'vehicle-1',
        externalId: 'TMS-V001',
        vin: '1FUJGHDV9JLJY8062',
        make: 'FREIGHTLINER',
      };

      const mockMergedData = {
        make: 'FREIGHTLINER',
        eldTelematicsMetadata: { eldId: '281474996387574', serial: 'G97TEAX5GM' },
      };

      const mockIntegration = {
        id: 'integration-1',
        tenantId: 'tenant-1',
        credentials: { apiKey: 'test-key' },
      };

      jest.spyOn(prisma.integrationConfig, 'findUnique').mockResolvedValue(mockIntegration as any);
      jest.spyOn(service as any, 'fetchEldVehicles').mockResolvedValue(mockEldVehicles);
      jest.spyOn(vehicleMatcher, 'match').mockResolvedValue(mockDbVehicle as any);
      jest.spyOn(vehicleMerger, 'merge').mockReturnValue(mockMergedData as any);
      jest.spyOn(prisma.vehicle, 'update').mockResolvedValue({} as any);

      await service.syncVehicles('integration-1');

      expect(vehicleMatcher.match).toHaveBeenCalledWith('tenant-1', {
        vin: '1FUJGHDV9JLJY8062',
      });

      expect(vehicleMerger.merge).toHaveBeenCalledWith(
        mockDbVehicle,
        expect.objectContaining({ eldId: '281474996387574' })
      );

      expect(prisma.vehicle.update).toHaveBeenCalledWith({
        where: { id: 'vehicle-1' },
        data: mockMergedData,
      });
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && npm test -- eld-sync.service.test.ts`
Expected: FAIL with "EldSyncService is not defined"

**Step 3: Write minimal implementation**

Create: `apps/backend/src/services/sync/eld-sync.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { VehicleMatcher } from './matching/vehicle-matcher';
import { DriverMatcher } from './matching/driver-matcher';
import { VehicleMerger } from './merging/vehicle-merger';
import { DriverMerger } from './merging/driver-merger';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EldSyncService {
  private readonly logger = new Logger(EldSyncService.name);

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private vehicleMatcher: VehicleMatcher,
    private driverMatcher: DriverMatcher,
    private vehicleMerger: VehicleMerger,
    private driverMerger: DriverMerger,
  ) {}

  /**
   * Sync vehicles from ELD API (enrichment only)
   */
  async syncVehicles(integrationId: string): Promise<void> {
    this.logger.log(`Starting ELD vehicle sync for integration: ${integrationId}`);

    const integration = await this.prisma.integrationConfig.findUnique({
      where: { id: integrationId },
    });

    if (!integration || integration.vendor !== 'SAMSARA_ELD') {
      throw new Error('Invalid ELD integration');
    }

    const { tenantId } = integration;

    // Fetch vehicles from ELD
    const eldVehicles = await this.fetchEldVehicles(integrationId);

    let matchedCount = 0;
    let unmatchedCount = 0;

    // Match and merge each ELD vehicle
    for (const eldVehicle of eldVehicles) {
      // Try to match to existing DB vehicle
      const dbVehicle = await this.vehicleMatcher.match(tenantId, {
        vin: eldVehicle.vin,
        licensePlate: eldVehicle.licensePlate,
      });

      if (dbVehicle) {
        // Merge TMS data (from DB) with ELD data
        const mergedData = this.vehicleMerger.merge(dbVehicle, {
          eldVendor: integration.vendor,
          eldId: eldVehicle.id,
          serial: eldVehicle.serial,
          gateway: eldVehicle.gateway,
          esn: eldVehicle.esn,
        });

        // Update vehicle with merged data
        await this.prisma.vehicle.update({
          where: { id: dbVehicle.id },
          data: mergedData,
        });

        matchedCount++;
      } else {
        this.logger.warn(`No matching vehicle found for ELD vehicle: ${eldVehicle.vin}`);
        unmatchedCount++;
      }
    }

    await this.prisma.integrationConfig.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() },
    });

    this.logger.log(
      `ELD vehicle sync complete: ${matchedCount} matched, ${unmatchedCount} unmatched`
    );
  }

  /**
   * Sync drivers from ELD API (enrichment only)
   */
  async syncDrivers(integrationId: string): Promise<void> {
    this.logger.log(`Starting ELD driver sync for integration: ${integrationId}`);

    const integration = await this.prisma.integrationConfig.findUnique({
      where: { id: integrationId },
    });

    if (!integration || integration.vendor !== 'SAMSARA_ELD') {
      throw new Error('Invalid ELD integration');
    }

    const { tenantId } = integration;

    // Fetch drivers from ELD
    const eldDrivers = await this.fetchEldDrivers(integrationId);

    let matchedCount = 0;
    let unmatchedCount = 0;

    for (const eldDriver of eldDrivers) {
      // Try to match to existing DB driver
      const dbDriver = await this.driverMatcher.match(tenantId, {
        phone: eldDriver.phone,
        licenseNumber: eldDriver.licenseNumber,
        licenseState: eldDriver.licenseState,
      });

      if (dbDriver) {
        // Merge TMS data (from DB) with ELD data
        const mergedData = this.driverMerger.merge(dbDriver, {
          eldVendor: integration.vendor,
          eldId: eldDriver.id,
          username: eldDriver.username,
          eldSettings: eldDriver.eldSettings,
          timezone: eldDriver.timezone,
        });

        // Update driver with merged data
        await this.prisma.driver.update({
          where: { id: dbDriver.id },
          data: mergedData,
        });

        matchedCount++;
      } else {
        this.logger.warn(`No matching driver found for ELD driver: ${eldDriver.phone}`);
        unmatchedCount++;
      }
    }

    await this.prisma.integrationConfig.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() },
    });

    this.logger.log(
      `ELD driver sync complete: ${matchedCount} matched, ${unmatchedCount} unmatched`
    );
  }

  /**
   * Fetch vehicles from ELD API
   */
  private async fetchEldVehicles(integrationId: string): Promise<any[]> {
    const integration = await this.prisma.integrationConfig.findUnique({
      where: { id: integrationId },
    });

    const { apiKey } = integration.credentials as any;

    const response = await firstValueFrom(
      this.httpService.get('https://api.samsara.com/fleet/vehicles', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
    );

    return response.data.data;
  }

  /**
   * Fetch drivers from ELD API
   */
  private async fetchEldDrivers(integrationId: string): Promise<any[]> {
    const integration = await this.prisma.integrationConfig.findUnique({
      where: { id: integrationId },
    });

    const { apiKey } = integration.credentials as any;

    const response = await firstValueFrom(
      this.httpService.get('https://api.samsara.com/fleet/drivers', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
    );

    return response.data.data;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd apps/backend && npm test -- eld-sync.service.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add apps/backend/src/services/sync/eld-sync.service.ts apps/backend/src/services/sync/__tests__/eld-sync.service.test.ts
git commit -m "feat(sync): add ELD sync service

- Fetch vehicles/drivers from Samsara ELD API
- Match ELD records to existing DB records (VIN, phone)
- Merge ELD data into DB records (enrichment only)
- Log matched vs unmatched counts
- Tests verify matching and merging flow"
```

---

## Task 8: Main Sync Orchestrator Service

**Files:**
- Create: `apps/backend/src/services/sync/sync.service.ts`
- Create: `apps/backend/src/services/sync/__tests__/sync.service.test.ts`

**Step 1: Write the failing test**

Create: `apps/backend/src/services/sync/__tests__/sync.service.test.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from '../sync.service';
import { TmsSyncService } from '../tms-sync.service';
import { EldSyncService } from '../eld-sync.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('SyncService', () => {
  let service: SyncService;
  let tmsSyncService: TmsSyncService;
  let eldSyncService: EldSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: TmsSyncService,
          useValue: {
            syncVehicles: jest.fn(),
            syncDrivers: jest.fn(),
          },
        },
        {
          provide: EldSyncService,
          useValue: {
            syncVehicles: jest.fn(),
            syncDrivers: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            integrationConfig: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    tmsSyncService = module.get<TmsSyncService>(TmsSyncService);
    eldSyncService = module.get<EldSyncService>(EldSyncService);
  });

  describe('syncIntegration', () => {
    it('should sync TMS integration', async () => {
      jest.spyOn(service as any, 'getIntegrationVendor').mockResolvedValue('PROJECT44_TMS');

      await service.syncIntegration('integration-1');

      expect(tmsSyncService.syncVehicles).toHaveBeenCalledWith('integration-1');
      expect(tmsSyncService.syncDrivers).toHaveBeenCalledWith('integration-1');
    });

    it('should sync ELD integration', async () => {
      jest.spyOn(service as any, 'getIntegrationVendor').mockResolvedValue('SAMSARA_ELD');

      await service.syncIntegration('integration-2');

      expect(eldSyncService.syncVehicles).toHaveBeenCalledWith('integration-2');
      expect(eldSyncService.syncDrivers).toHaveBeenCalledWith('integration-2');
    });
  });

  describe('syncFleet', () => {
    it('should sync both TMS and ELD in sequence', async () => {
      const mockPrisma = {
        integrationConfig: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'tms-1', vendor: 'PROJECT44_TMS' },
            { id: 'eld-1', vendor: 'SAMSARA_ELD' },
          ]),
        },
      };

      jest.spyOn(service as any, 'prisma', 'get').mockReturnValue(mockPrisma);
      jest.spyOn(service, 'syncIntegration').mockResolvedValue();

      await service.syncFleet('tenant-1');

      expect(service.syncIntegration).toHaveBeenCalledWith('tms-1');
      expect(service.syncIntegration).toHaveBeenCalledWith('eld-1');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && npm test -- sync.service.test.ts`
Expected: FAIL with "SyncService is not defined"

**Step 3: Write minimal implementation**

Create: `apps/backend/src/services/sync/sync.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { TmsSyncService } from './tms-sync.service';
import { EldSyncService } from './eld-sync.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private prisma: PrismaService,
    private tmsSyncService: TmsSyncService,
    private eldSyncService: EldSyncService,
  ) {}

  /**
   * Sync a single integration (TMS or ELD)
   */
  async syncIntegration(integrationId: string): Promise<void> {
    this.logger.log(`Starting sync for integration: ${integrationId}`);

    const vendor = await this.getIntegrationVendor(integrationId);

    if (vendor === 'PROJECT44_TMS') {
      await this.tmsSyncService.syncVehicles(integrationId);
      await this.tmsSyncService.syncDrivers(integrationId);
    } else if (vendor === 'SAMSARA_ELD' || vendor === 'KEEPTRUCKIN_ELD' || vendor === 'MOTIVE_ELD') {
      await this.eldSyncService.syncVehicles(integrationId);
      await this.eldSyncService.syncDrivers(integrationId);
    } else {
      throw new Error(`Unsupported vendor: ${vendor}`);
    }

    this.logger.log(`Sync complete for integration: ${integrationId}`);
  }

  /**
   * Sync all fleet data for a tenant (TMS first, then ELD)
   */
  async syncFleet(tenantId: string): Promise<void> {
    this.logger.log(`Starting fleet sync for tenant: ${tenantId}`);

    // Get all integrations for tenant
    const integrations = await this.prisma.integrationConfig.findMany({
      where: { tenantId, isActive: true },
      orderBy: { vendor: 'asc' }, // TMS before ELD alphabetically
    });

    // Sync TMS first (source of truth)
    const tmsIntegrations = integrations.filter(i => i.vendor === 'PROJECT44_TMS');
    for (const integration of tmsIntegrations) {
      await this.syncIntegration(integration.id);
    }

    // Then sync ELD (enrichment)
    const eldIntegrations = integrations.filter(i =>
      i.vendor === 'SAMSARA_ELD' || i.vendor === 'KEEPTRUCKIN_ELD' || i.vendor === 'MOTIVE_ELD'
    );
    for (const integration of eldIntegrations) {
      await this.syncIntegration(integration.id);
    }

    this.logger.log(`Fleet sync complete for tenant: ${tenantId}`);
  }

  /**
   * Get vendor type for an integration
   */
  private async getIntegrationVendor(integrationId: string): Promise<string> {
    const integration = await this.prisma.integrationConfig.findUnique({
      where: { id: integrationId },
      select: { vendor: true },
    });

    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    return integration.vendor;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd apps/backend && npm test -- sync.service.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add apps/backend/src/services/sync/sync.service.ts apps/backend/src/services/sync/__tests__/sync.service.test.ts
git commit -m "feat(sync): add main sync orchestrator service

- Route sync to TMS or ELD service based on vendor
- Sync entire fleet (TMS first, then ELD)
- Support multiple ELD vendors (Samsara, KeepTruckin, Motive)
- Tests verify orchestration logic"
```

---

## Task 9: Auto-Sync Cron Job

**Files:**
- Create: `apps/backend/src/jobs/auto-sync.job.ts`
- Create: `apps/backend/src/jobs/__tests__/auto-sync.job.test.ts`

**Step 1: Write the failing test**

Create: `apps/backend/src/jobs/__tests__/auto-sync.job.test.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AutoSyncJob } from '../auto-sync.job';
import { SyncService } from '@/services/sync/sync.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('AutoSyncJob', () => {
  let job: AutoSyncJob;
  let syncService: SyncService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoSyncJob,
        {
          provide: SyncService,
          useValue: {
            syncIntegration: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            integrationConfig: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    job = module.get<AutoSyncJob>(AutoSyncJob);
    syncService = module.get<SyncService>(SyncService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('handleAutoSync', () => {
    it('should sync integrations that are due', async () => {
      const now = new Date();
      const tmsLastSync = new Date(now.getTime() - 61 * 60 * 1000); // 61 minutes ago
      const eldLastSync = new Date(now.getTime() - 6 * 60 * 1000); // 6 minutes ago

      const mockIntegrations = [
        {
          id: 'tms-1',
          vendor: 'PROJECT44_TMS',
          syncIntervalSeconds: 3600, // 1 hour
          lastSyncAt: tmsLastSync,
        },
        {
          id: 'eld-1',
          vendor: 'SAMSARA_ELD',
          syncIntervalSeconds: 300, // 5 minutes
          lastSyncAt: eldLastSync,
        },
      ];

      jest.spyOn(prisma.integrationConfig, 'findMany').mockResolvedValue(mockIntegrations as any);
      jest.spyOn(syncService, 'syncIntegration').mockResolvedValue();

      await job.handleAutoSync();

      // Both should be synced (61 min > 60 min, 6 min > 5 min)
      expect(syncService.syncIntegration).toHaveBeenCalledWith('tms-1');
      expect(syncService.syncIntegration).toHaveBeenCalledWith('eld-1');
    });

    it('should skip integrations that are not due', async () => {
      const now = new Date();
      const recentSync = new Date(now.getTime() - 2 * 60 * 1000); // 2 minutes ago

      const mockIntegrations = [
        {
          id: 'eld-1',
          vendor: 'SAMSARA_ELD',
          syncIntervalSeconds: 300, // 5 minutes
          lastSyncAt: recentSync,
        },
      ];

      jest.spyOn(prisma.integrationConfig, 'findMany').mockResolvedValue(mockIntegrations as any);
      jest.spyOn(syncService, 'syncIntegration').mockResolvedValue();

      await job.handleAutoSync();

      // Should not sync (2 min < 5 min)
      expect(syncService.syncIntegration).not.toHaveBeenCalled();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && npm test -- auto-sync.job.test.ts`
Expected: FAIL with "AutoSyncJob is not defined"

**Step 3: Write minimal implementation**

Create: `apps/backend/src/jobs/auto-sync.job.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { SyncService } from '@/services/sync/sync.service';

@Injectable()
export class AutoSyncJob {
  private readonly logger = new Logger(AutoSyncJob.name);

  constructor(
    private prisma: PrismaService,
    private syncService: SyncService,
  ) {}

  /**
   * Auto-sync job runs every minute
   * Checks which integrations are due for sync based on their interval
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleAutoSync() {
    this.logger.debug('Running auto-sync check');

    const now = new Date();

    // Get all active integrations
    const integrations = await this.prisma.integrationConfig.findMany({
      where: { isActive: true },
      select: {
        id: true,
        vendor: true,
        syncIntervalSeconds: true,
        lastSyncAt: true,
      },
    });

    for (const integration of integrations) {
      const isDue = this.isIntegrationDueForSync(integration, now);

      if (isDue) {
        this.logger.log(`Auto-syncing integration: ${integration.id} (${integration.vendor})`);

        try {
          await this.syncService.syncIntegration(integration.id);
        } catch (error) {
          this.logger.error(`Auto-sync failed for ${integration.id}:`, error);
        }
      }
    }
  }

  /**
   * Check if integration is due for sync
   */
  private isIntegrationDueForSync(
    integration: { syncIntervalSeconds: number; lastSyncAt: Date | null },
    now: Date,
  ): boolean {
    if (!integration.lastSyncAt) {
      return true; // Never synced before
    }

    const secondsSinceLastSync = (now.getTime() - integration.lastSyncAt.getTime()) / 1000;
    return secondsSinceLastSync >= integration.syncIntervalSeconds;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd apps/backend && npm test -- auto-sync.job.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add apps/backend/src/jobs
git commit -m "feat(sync): add auto-sync cron job

- Run every minute to check integrations
- Sync integrations due based on syncIntervalSeconds
- Handle sync errors gracefully
- Tests verify due/not-due logic"
```

---

## Task 10: Integrations API Endpoints

**Files:**
- Create: `apps/backend/src/api/integrations/integrations.controller.ts`
- Create: `apps/backend/src/api/integrations/__tests__/integrations.controller.test.ts`

**Step 1: Write the failing test**

Create: `apps/backend/src/api/integrations/__tests__/integrations.controller.test.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationsController } from '../integrations.controller';
import { SyncService } from '@/services/sync/sync.service';

describe('IntegrationsController', () => {
  let controller: IntegrationsController;
  let syncService: SyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntegrationsController],
      providers: [
        {
          provide: SyncService,
          useValue: {
            syncIntegration: jest.fn(),
            syncFleet: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<IntegrationsController>(IntegrationsController);
    syncService = module.get<SyncService>(SyncService);
  });

  describe('POST /api/v1/integrations/:id/sync', () => {
    it('should trigger manual sync for integration', async () => {
      jest.spyOn(syncService, 'syncIntegration').mockResolvedValue();

      const result = await controller.syncIntegration('integration-1');

      expect(syncService.syncIntegration).toHaveBeenCalledWith('integration-1');
      expect(result).toEqual({ message: 'Sync completed successfully' });
    });

    it('should return error if sync fails', async () => {
      jest.spyOn(syncService, 'syncIntegration').mockRejectedValue(new Error('Sync failed'));

      await expect(controller.syncIntegration('integration-1')).rejects.toThrow('Sync failed');
    });
  });

  describe('POST /api/v1/fleet/sync', () => {
    it('should trigger fleet-wide sync', async () => {
      jest.spyOn(syncService, 'syncFleet').mockResolvedValue();

      const mockRequest = { user: { tenantId: 'tenant-1' } };

      const result = await controller.syncFleet(mockRequest as any);

      expect(syncService.syncFleet).toHaveBeenCalledWith('tenant-1');
      expect(result).toEqual({ message: 'Fleet sync completed successfully' });
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && npm test -- integrations.controller.test.ts`
Expected: FAIL with "IntegrationsController is not defined"

**Step 3: Write minimal implementation**

Create: `apps/backend/src/api/integrations/integrations.controller.ts`

```typescript
import { Controller, Post, Param, Req, UseGuards } from '@nestjs/common';
import { SyncService } from '@/services/sync/sync.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@Controller('api/v1')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(private syncService: SyncService) {}

  /**
   * POST /api/v1/integrations/:id/sync
   * Manually trigger sync for a specific integration
   */
  @Post('integrations/:id/sync')
  async syncIntegration(@Param('id') integrationId: string) {
    await this.syncService.syncIntegration(integrationId);
    return { message: 'Sync completed successfully' };
  }

  /**
   * POST /api/v1/fleet/sync
   * Manually trigger fleet-wide sync (all integrations)
   */
  @Post('fleet/sync')
  async syncFleet(@Req() req: any) {
    const tenantId = req.user.tenantId;
    await this.syncService.syncFleet(tenantId);
    return { message: 'Fleet sync completed successfully' };
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd apps/backend && npm test -- integrations.controller.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add apps/backend/src/api/integrations
git commit -m "feat(api): add manual sync endpoints

- POST /api/v1/integrations/:id/sync - sync single integration
- POST /api/v1/fleet/sync - sync entire fleet
- Tests verify endpoint behavior"
```

---

## Task 11: Update Mock TMS Data

**Files:**
- Modify: `apps/backend/src/api/external/__tests__/mock-tms.data.ts`

**Step 1: Write updated mock data**

Modify: `apps/backend/src/api/external/__tests__/mock-tms.data.ts`

```typescript
export const MOCK_TMS_VEHICLES = [
  {
    id: 'TMS-V001',
    make: 'FREIGHTLINER',
    model: 'CASCADIA',
    year: 2018,
    vin: '1FUJGHDV9JLJY8062',
    licensePlate: 'TX R70-1836',
    status: 'ACTIVE',
    capacity: 45000,
  },
  {
    id: 'TMS-V002',
    make: 'FREIGHTLINER',
    model: 'CASCADIA',
    year: 2019,
    vin: '3AKJHPDV2KSKA4482',
    licensePlate: '',
    status: 'ACTIVE',
    capacity: 45000,
  },
  {
    id: 'TMS-V003',
    make: 'VOLVO TRUCK',
    model: 'VNL',
    year: 2017,
    vin: '4V4NC9EH0HN979036',
    licensePlate: '',
    status: 'ACTIVE',
    capacity: 45000,
  },
];

export const MOCK_TMS_DRIVERS = [
  {
    id: 'TMS-D001',
    firstName: 'Heideckel',
    lastName: 'Toribo',
    phone: '+19788856169',
    email: 'oscar@example.com',
    licenseNumber: 'NHL14227039',
    licenseState: 'NH',
    status: 'ACTIVE',
  },
  {
    id: 'TMS-D002',
    firstName: 'Deepak',
    lastName: 'NFN',
    phone: '+13477654208',
    email: 'deepak@example.com',
    licenseNumber: '149147333',
    licenseState: 'NY',
    status: 'ACTIVE',
  },
  {
    id: 'TMS-D003',
    firstName: 'James',
    lastName: 'Austin',
    phone: '+13393644162',
    email: 'james@example.com',
    licenseNumber: 'S62067934',
    licenseState: 'MA',
    status: 'ACTIVE',
  },
  {
    id: 'TMS-D004',
    firstName: 'Brinder',
    lastName: 'Singh',
    phone: '+19296230454',
    email: 'brinder@example.com',
    licenseNumber: '440586911',
    licenseState: 'NY',
    status: 'ACTIVE',
  },
];
```

**Step 2: Commit**

```bash
git add apps/backend/src/api/external/__tests__/mock-tms.data.ts
git commit -m "feat(mock): update TMS mock data to match Samsara structure

- Add VINs matching Samsara vehicles
- Add license numbers/states matching Samsara drivers
- Align phone numbers for matching
- Supports integration testing with real Samsara data"
```

---

## Task 12: Frontend Integration - API Client

**Files:**
- Create: `apps/web/src/lib/api/integrations.ts`
- Create: `apps/web/src/lib/api/__tests__/integrations.test.ts`

**Step 1: Write the failing test**

Create: `apps/web/src/lib/api/__tests__/integrations.test.ts`

```typescript
import { integrationsApi } from '../integrations';

global.fetch = jest.fn();

describe('integrationsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('syncIntegration', () => {
    it('should call POST /api/v1/integrations/:id/sync', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Sync completed successfully' }),
      });

      const result = await integrationsApi.syncIntegration('integration-1');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/integrations/integration-1/sync',
        expect.objectContaining({
          method: 'POST',
        })
      );

      expect(result).toEqual({ message: 'Sync completed successfully' });
    });
  });

  describe('syncFleet', () => {
    it('should call POST /api/v1/fleet/sync', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Fleet sync completed successfully' }),
      });

      const result = await integrationsApi.syncFleet();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/fleet/sync',
        expect.objectContaining({
          method: 'POST',
        })
      );

      expect(result).toEqual({ message: 'Fleet sync completed successfully' });
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && npm test -- integrations.test.ts`
Expected: FAIL with "Cannot find module '../integrations'"

**Step 3: Write minimal implementation**

Create: `apps/web/src/lib/api/integrations.ts`

```typescript
import { getAuthToken } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export const integrationsApi = {
  /**
   * Manually trigger sync for a specific integration
   */
  async syncIntegration(integrationId: string) {
    const token = await getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/v1/integrations/${integrationId}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to sync integration');
    }

    return response.json();
  },

  /**
   * Manually trigger fleet-wide sync (all integrations)
   */
  async syncFleet() {
    const token = await getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/v1/fleet/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to sync fleet');
    }

    return response.json();
  },
};
```

**Step 4: Run tests to verify they pass**

Run: `cd apps/web && npm test -- integrations.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add apps/web/src/lib/api/integrations.ts apps/web/src/lib/api/__tests__/integrations.test.ts
git commit -m "feat(web): add integrations API client

- syncIntegration() - manual sync single integration
- syncFleet() - manual sync entire fleet
- Tests verify API calls"
```

---

## Task 13: Module Registration (Backend)

**Files:**
- Modify: `apps/backend/src/app.module.ts`
- Create: `apps/backend/src/services/sync/sync.module.ts`

**Step 1: Create sync module**

Create: `apps/backend/src/services/sync/sync.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '@/prisma/prisma.module';
import { SyncService } from './sync.service';
import { TmsSyncService } from './tms-sync.service';
import { EldSyncService } from './eld-sync.service';
import { VehicleMatcher } from './matching/vehicle-matcher';
import { DriverMatcher } from './matching/driver-matcher';
import { VehicleMerger } from './merging/vehicle-merger';
import { DriverMerger } from './merging/driver-merger';
import { AutoSyncJob } from '@/jobs/auto-sync.job';

@Module({
  imports: [PrismaModule, HttpModule],
  providers: [
    SyncService,
    TmsSyncService,
    EldSyncService,
    VehicleMatcher,
    DriverMatcher,
    VehicleMerger,
    DriverMerger,
    AutoSyncJob,
  ],
  exports: [SyncService],
})
export class SyncModule {}
```

**Step 2: Register in app module**

Modify: `apps/backend/src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule'; // NEW
import { SyncModule } from './services/sync/sync.module'; // NEW
import { IntegrationsController } from './api/integrations/integrations.controller'; // NEW
// ... other imports

@Module({
  imports: [
    ScheduleModule.forRoot(), // NEW: Enable cron jobs
    SyncModule, // NEW
    // ... other modules
  ],
  controllers: [
    IntegrationsController, // NEW
    // ... other controllers
  ],
})
export class AppModule {}
```

**Step 3: Install dependencies**

Run: `cd apps/backend && npm install @nestjs/schedule @nestjs/axios`

**Step 4: Commit**

```bash
git add apps/backend/src/app.module.ts apps/backend/src/services/sync/sync.module.ts apps/backend/package.json
git commit -m "feat(backend): register sync module and cron jobs

- Create SyncModule with all sync services
- Register ScheduleModule for cron jobs
- Add IntegrationsController to routes
- Install @nestjs/schedule and @nestjs/axios"
```

---

## Task 14: E2E Integration Test

**Files:**
- Create: `apps/backend/test/integration/tms-eld-sync.e2e-spec.ts`

**Step 1: Write E2E test**

Create: `apps/backend/test/integration/tms-eld-sync.e2e-spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';

describe('TMS/ELD Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'password' });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('TMS → ELD Sync Flow', () => {
    it('should sync TMS data, then enrich with ELD data', async () => {
      // Step 1: Sync TMS (creates vehicles/drivers)
      await request(app.getHttpServer())
        .post('/api/v1/integrations/tms-integration-1/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      // Verify TMS data in DB
      const vehicle = await prisma.vehicle.findFirst({
        where: { vin: '1FUJGHDV9JLJY8062' },
      });

      expect(vehicle).toBeDefined();
      expect(vehicle.make).toBe('FREIGHTLINER');
      expect(vehicle.model).toBe('CASCADIA');
      expect(vehicle.eldTelematicsMetadata).toBeNull(); // No ELD data yet

      // Step 2: Sync ELD (enriches existing records)
      await request(app.getHttpServer())
        .post('/api/v1/integrations/eld-integration-1/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      // Verify ELD data merged
      const enrichedVehicle = await prisma.vehicle.findFirst({
        where: { vin: '1FUJGHDV9JLJY8062' },
      });

      expect(enrichedVehicle.make).toBe('FREIGHTLINER'); // TMS data preserved
      expect(enrichedVehicle.eldTelematicsMetadata).toBeDefined(); // ELD data added
      expect(enrichedVehicle.eldTelematicsMetadata.eldId).toBe('281474996387574');
    });
  });

  describe('Fleet Sync Endpoint', () => {
    it('should sync all integrations in correct order (TMS first, ELD second)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/fleet/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.message).toBe('Fleet sync completed successfully');

      // Verify merged data
      const vehicles = await prisma.vehicle.findMany({
        where: { eldTelematicsMetadata: { not: null } },
      });

      expect(vehicles.length).toBeGreaterThan(0);
    });
  });
});
```

**Step 2: Run E2E test**

Run: `cd apps/backend && npm run test:e2e -- tms-eld-sync.e2e-spec.ts`
Expected: All E2E tests PASS

**Step 3: Commit**

```bash
git add apps/backend/test/integration/tms-eld-sync.e2e-spec.ts
git commit -m "test(e2e): add TMS/ELD integration E2E tests

- Verify TMS sync creates vehicles/drivers
- Verify ELD sync enriches existing records
- Verify fleet sync orchestrates both in order
- Validate merge logic preserves TMS data"
```

---

## Task 15: Documentation Update

**Files:**
- Create: `docs/INTEGRATION_SYNC_ARCHITECTURE.md`
- Modify: `.specs/README.md`

**Step 1: Write architecture documentation**

Create: `docs/INTEGRATION_SYNC_ARCHITECTURE.md`

```markdown
# TMS/ELD Integration & Sync Architecture

**Date:** February 3, 2026
**Status:** Implemented
**Reading Time:** 15 minutes

---

## Overview

SALLY integrates with **TMS (Transportation Management System)** and **ELD (Electronic Logging Device)** providers to maintain a unified fleet database. TMS is the source of truth for operational data, while ELD enriches with HOS/telematics data.

**Key Principle:** TMS wins for operational data, ELD wins for HOS/telematics data.

---

## Architecture Diagram

```
┌─────────────────────┐          ┌─────────────────────┐
│   TMS (Project44)   │          │  ELD (Samsara, etc) │
│                     │          │                     │
│ - Vehicles          │          │ - HOS Data          │
│ - Drivers           │          │ - Telematics        │
│ - Loads             │          │ - GPS Location      │
└──────────┬──────────┘          └──────────┬──────────┘
           │                                │
           │ Pull (1hr interval)            │ Pull (5min interval)
           │                                │
           ▼                                ▼
    ┌─────────────┐                 ┌─────────────┐
    │ TMS Sync    │                 │ ELD Sync    │
    │ Service     │                 │ Service     │
    └──────┬──────┘                 └──────┬──────┘
           │                                │
           │ Upsert                         │ Match + Merge
           ▼                                ▼
      ┌────────────────────────────────────────┐
      │        PostgreSQL Database             │
      │                                        │
      │  Vehicle: { make, vin, ...            │
      │            eldTelematicsMetadata }     │
      │  Driver:  { firstName, phone, ...     │
      │            eldMetadata }               │
      └────────────────────────────────────────┘
```

---

## Data Flow

### 1. TMS Sync (Source of Truth)

**Interval:** 1 hour
**Flow:**
1. Fetch vehicles/drivers from TMS API
2. Upsert to database (create or update by `externalId`)
3. Store operational data: make, model, year, VIN, license plate, status

**Priority:** TMS data always wins for operational fields.

### 2. ELD Sync (Enrichment)

**Interval:** 5 minutes
**Flow:**
1. Fetch vehicles/drivers from ELD API
2. Match to existing DB records:
   - Vehicles: Match by VIN → License Plate (fallback)
   - Drivers: Match by Phone → License+State (fallback)
3. Merge ELD data into matched records:
   - Vehicles: Store telematics in `eldTelematicsMetadata` JSONB
   - Drivers: Store HOS settings in `eldMetadata` JSONB
4. If no match found, log warning (do NOT create orphan records)

**Priority:** ELD data fills gaps and adds telematics/HOS data.

---

## Database Schema

### Vehicle Table

```prisma
model Vehicle {
  id                      String    @id @default(cuid())
  externalId              String    @unique  // TMS vehicle ID
  tenantId                String

  // TMS Fields (source of truth)
  make                    String?
  model                   String?
  year                    Int?
  vin                     String?
  licensePlate            String?
  status                  String

  // ELD Telematics (JSONB - vendor agnostic)
  eldTelematicsMetadata   Json?
  // { eldVendor, eldId, serial, gateway, esn, lastSyncAt }

  @@index([vin])
  @@index([licensePlate])
}
```

### Driver Table

```prisma
model Driver {
  id                      String    @id @default(cuid())
  externalId              String    @unique  // TMS driver ID
  tenantId                String

  // TMS Fields (source of truth)
  firstName               String
  lastName                String
  phone                   String?
  licenseNumber           String?
  licenseState            String?
  status                  String

  // ELD HOS Metadata (JSONB - vendor agnostic)
  eldMetadata             Json?
  // { eldVendor, eldId, username, eldSettings, timezone, lastSyncAt }

  @@index([phone])
  @@index([licenseNumber, licenseState])
}
```

---

## Merge Rules

### Vehicle Merge Priority

| Field | TMS | ELD | Winner |
|-------|-----|-----|--------|
| make, model, year | ✅ | ✅ | TMS (unless missing) |
| vin | ✅ | ✅ | TMS (unless missing) |
| licensePlate | ✅ | ✅ | TMS (unless missing) |
| status | ✅ | ❌ | TMS always |
| serial, gateway, esn | ❌ | ✅ | ELD (stored in JSONB) |

### Driver Merge Priority

| Field | TMS | ELD | Winner |
|-------|-----|-----|--------|
| firstName, lastName | ✅ | ✅ | TMS always |
| phone | ✅ | ✅ | TMS (unless missing) |
| licenseNumber, licenseState | ✅ | ✅ | TMS (unless missing) |
| status | ✅ | ✅ | Admin/TMS always |
| eldSettings, timezone | ❌ | ✅ | ELD (stored in JSONB) |

---

## API Endpoints

### Manual Sync

```http
POST /api/v1/integrations/:id/sync
Authorization: Bearer <token>
```

Response:
```json
{ "message": "Sync completed successfully" }
```

### Fleet-Wide Sync

```http
POST /api/v1/fleet/sync
Authorization: Bearer <token>
```

Response:
```json
{ "message": "Fleet sync completed successfully" }
```

---

## Auto-Sync Cron Job

**Schedule:** Every 1 minute
**Logic:**
1. Check all active integrations
2. Calculate time since last sync
3. If `now - lastSyncAt >= syncIntervalSeconds`, trigger sync
4. Update `lastSyncAt` after successful sync

**Default Intervals:**
- TMS: 3600 seconds (1 hour)
- ELD: 300 seconds (5 minutes)

---

## Frontend Integration

### Settings → Integrations

**Path:** `/settings/integrations`

**Features:**
1. List all integrations (TMS, ELD, Fuel, Weather)
2. Manual sync button per integration
3. Auto-sync status indicator (green = synced recently)
4. Last sync timestamp display

**No duplicate sync buttons in Fleet pages** - all sync actions centralized in Settings.

---

## Testing Strategy

### Unit Tests
- Matcher services (VIN, phone, license matching)
- Merger services (merge priority rules)
- Sync services (TMS, ELD, orchestrator)

### E2E Tests
- TMS sync creates records
- ELD sync enriches existing records
- Fleet sync orchestrates both in order
- Merge logic preserves TMS data

---

## Security & Best Practices

1. **API Keys:** Stored encrypted in `integrationConfig.credentials` JSONB
2. **Rate Limits:** Respect vendor API rate limits (TMS: 1hr, ELD: 5min)
3. **Error Handling:** Log warnings for unmatched records, don't crash
4. **Idempotency:** Upsert operations safe to re-run
5. **Tenant Isolation:** All queries scoped by `tenantId`

---

## Future Enhancements

1. **Multi-ELD Support:** Already vendor-agnostic (Samsara, KeepTruckin, Motive)
2. **Conflict Resolution UI:** Show admin when TMS/ELD data conflicts
3. **Sync History:** Track sync results, errors, match rates
4. **Webhook Support:** Real-time updates instead of polling

---

## Related Documents

- `.specs/features/03-integrations/SAMSARA_SETUP_GUIDE.md` - ELD setup guide
- `.specs/features/03-integrations/PHASE2_PLAN.md` - Integration roadmap
- `apps/backend/src/services/sync/README.md` - Sync service code docs

---

**Last Updated:** February 3, 2026
```

**Step 2: Update specs README**

Modify: `.specs/README.md`

Add to index:

```markdown
### Integration Architecture
- [TMS/ELD Sync Architecture](../docs/INTEGRATION_SYNC_ARCHITECTURE.md) - Database merge strategy, auto-sync
```

**Step 3: Commit**

```bash
git add docs/INTEGRATION_SYNC_ARCHITECTURE.md .specs/README.md
git commit -m "docs: add TMS/ELD integration architecture documentation

- Explain pull-based enrichment model
- Document merge priority rules
- Diagram data flow (TMS → ELD → Database)
- API endpoints and auto-sync cron job
- Testing strategy and security practices"
```

---

## Execution Options

**Plan complete and saved to `docs/plans/2026-02-03-tms-eld-integration.md`.**

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
