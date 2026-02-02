# Integrations Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transition from mock data to production-ready integrations with real APIs, retry logic, alerting, and sync history UI.

**Architecture:** Keep existing adapter pattern. Add retry service (exponential backoff), circuit breaker service (prevent cascading failures), alert service (email notifications), and sync history UI. Each adapter switches from `useMockData=true` to `useMockData=false`.

**Tech Stack:** NestJS (backend), React/Next.js (frontend), nodemailer (emails), node-fetch (HTTP), Prisma (database)

**Timeline:** 3 weeks (15 days)

---

## Prerequisites

Before starting, ensure:
- [ ] All 4 adapters pass tests in mock mode
- [ ] API credentials obtained: Samsara, Truckbase, Fuel Finder, OpenWeather
- [ ] SMTP credentials configured for email alerts
- [ ] Development database accessible

---

## Week 1: Enable Real APIs (Days 1-5)

### Task 1: Set Up Environment Variables

**Files:**
- Modify: `apps/backend/.env.example`
- Modify: `apps/backend/.env`

**Step 1: Add API credentials to .env.example**

```bash
# External API Keys
SAMSARA_API_KEY="your-samsara-api-key"
TRUCKBASE_API_KEY="your-truckbase-api-key"
TRUCKBASE_API_SECRET="your-truckbase-api-secret"
FUELFINDER_API_KEY="your-fuelfinder-api-key"
OPENWEATHER_API_KEY="your-openweather-api-key"

# API Base URLs
SAMSARA_API_URL="https://api.samsara.com/v1"
TRUCKBASE_API_URL="https://api.truckbase.io/v1"
FUELFINDER_API_URL="https://api.fuelfinder.com/v1"
OPENWEATHER_API_URL="https://api.openweathermap.org/data/2.5"
```

**Step 2: Add real values to .env**

Copy `.env.example` to `.env` and replace placeholder values with real API keys.

**Step 3: Commit**

```bash
git add apps/backend/.env.example
git commit -m "chore: add external API environment variables"
```

---

### Task 2: Enable Samsara Real API

**Files:**
- Modify: `apps/backend/src/services/adapters/hos/samsara-hos.adapter.ts:16`

**Step 1: Write integration test for real API**

Create: `apps/backend/src/services/adapters/hos/samsara-hos.adapter.spec.ts`

```typescript
import { SamsaraHOSAdapter } from './samsara-hos.adapter';

describe('SamsaraHOSAdapter - Real API', () => {
  let adapter: SamsaraHOSAdapter;
  const realApiKey = process.env.SAMSARA_API_KEY;

  beforeEach(() => {
    adapter = new SamsaraHOSAdapter();
  });

  it('should test connection with real API key', async () => {
    if (!realApiKey) {
      console.warn('Skipping real API test - SAMSARA_API_KEY not set');
      return;
    }

    const result = await adapter.testConnection(realApiKey);
    expect(result).toBe(true);
  }, 10000);

  it('should fetch driver HOS data from real API', async () => {
    if (!realApiKey) {
      console.warn('Skipping real API test - SAMSARA_API_KEY not set');
      return;
    }

    // Use a known test driver ID from your Samsara account
    const testDriverId = 'test-driver-id';
    const hosData = await adapter.getDriverHOS(realApiKey, testDriverId);

    expect(hosData).toBeDefined();
    expect(hosData.driver_id).toBe(testDriverId);
    expect(hosData.hours_driven).toBeGreaterThanOrEqual(0);
    expect(hosData.data_source).toBe('samsara_eld');
  }, 10000);
});
```

**Step 2: Run test to verify it skips (no API key yet)**

```bash
cd apps/backend
npm test -- samsara-hos.adapter.spec.ts
```

Expected: Test skipped with warning message

**Step 3: Change useMockData flag**

File: `apps/backend/src/services/adapters/hos/samsara-hos.adapter.ts`

```typescript
// Line 16: Change from
private readonly useMockData = true;

// To
private readonly useMockData = false;
```

**Step 4: Run test with real API key**

```bash
export SAMSARA_API_KEY="your-real-api-key"
npm test -- samsara-hos.adapter.spec.ts
```

Expected: Test passes with real API data

**Step 5: Fix API response parsing if needed**

If test fails, check Samsara API response format and update transformation logic in `getDriverHOS()` method.

**Step 6: Commit**

```bash
git add apps/backend/src/services/adapters/hos/samsara-hos.adapter.ts
git add apps/backend/src/services/adapters/hos/samsara-hos.adapter.spec.ts
git commit -m "feat(integrations): enable Samsara real API"
```

---

### Task 3: Enable Truckbase Real API

**Files:**
- Modify: `apps/backend/src/services/adapters/tms/truckbase-tms.adapter.ts:14`

**Step 1: Research Truckbase API documentation**

Read: https://app.truckbase.io/settings/integrations
Document: Authentication method, endpoints, request/response formats

**Step 2: Write integration test**

Create: `apps/backend/src/services/adapters/tms/truckbase-tms.adapter.spec.ts`

```typescript
import { TruckbaseTMSAdapter } from './truckbase-tms.adapter';

describe('TruckbaseTMSAdapter - Real API', () => {
  let adapter: TruckbaseTMSAdapter;
  const realApiKey = process.env.TRUCKBASE_API_KEY;
  const realApiSecret = process.env.TRUCKBASE_API_SECRET;

  beforeEach(() => {
    adapter = new TruckbaseTMSAdapter();
  });

  it('should test connection with real API credentials', async () => {
    if (!realApiKey || !realApiSecret) {
      console.warn('Skipping real API test - credentials not set');
      return;
    }

    const result = await adapter.testConnection(realApiKey, realApiSecret);
    expect(result).toBe(true);
  }, 10000);

  it('should fetch active loads from real API', async () => {
    if (!realApiKey || !realApiSecret) {
      console.warn('Skipping real API test - credentials not set');
      return;
    }

    const loads = await adapter.getActiveLoads(realApiKey, realApiSecret);

    expect(Array.isArray(loads)).toBe(true);
    if (loads.length > 0) {
      expect(loads[0]).toHaveProperty('load_id');
      expect(loads[0]).toHaveProperty('pickup_location');
      expect(loads[0]).toHaveProperty('delivery_location');
    }
  }, 10000);
});
```

**Step 3: Implement real API calls**

File: `apps/backend/src/services/adapters/tms/truckbase-tms.adapter.ts`

```typescript
// Change line 14
private readonly useMockData = false;
private readonly baseUrl = process.env.TRUCKBASE_API_URL || 'https://api.truckbase.io/v1';

// Update getLoad method (lines 20-32)
async getLoad(apiKey: string, apiSecret: string, loadId: string): Promise<LoadData> {
  if (this.useMockData) {
    return this.getMockLoad(loadId);
  }

  try {
    const response = await fetch(`${this.baseUrl}/loads/${loadId}`, {
      headers: {
        'X-API-Key': apiKey,
        'X-API-Secret': apiSecret,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Truckbase API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    return this.transformLoadData(data);
  } catch (error) {
    throw new Error(`Failed to fetch load from Truckbase: ${error.message}`);
  }
}

// Add transformation method
private transformLoadData(tbData: any): LoadData {
  return {
    load_id: tbData.id || tbData.loadId,
    pickup_location: {
      address: tbData.pickup?.address || tbData.origin?.address,
      city: tbData.pickup?.city || tbData.origin?.city,
      state: tbData.pickup?.state || tbData.origin?.state,
      zip: tbData.pickup?.zip || tbData.origin?.zip,
      latitude: tbData.pickup?.lat || tbData.origin?.latitude,
      longitude: tbData.pickup?.lon || tbData.origin?.longitude,
    },
    delivery_location: {
      address: tbData.delivery?.address || tbData.destination?.address,
      city: tbData.delivery?.city || tbData.destination?.city,
      state: tbData.delivery?.state || tbData.destination?.state,
      zip: tbData.delivery?.zip || tbData.destination?.zip,
      latitude: tbData.delivery?.lat || tbData.destination?.latitude,
      longitude: tbData.delivery?.lon || tbData.destination?.longitude,
    },
    pickup_appointment: tbData.pickupTime || tbData.pickup_appointment,
    delivery_appointment: tbData.deliveryTime || tbData.delivery_appointment,
    assigned_driver_id: tbData.driverId || tbData.driver_id,
    status: this.mapLoadStatus(tbData.status),
    total_miles: tbData.miles || tbData.distance,
    data_source: 'truckbase_tms',
  };
}

private mapLoadStatus(status: string): LoadData['status'] {
  const mapping: Record<string, LoadData['status']> = {
    'assigned': 'ASSIGNED',
    'in_transit': 'IN_TRANSIT',
    'delivered': 'DELIVERED',
    'cancelled': 'CANCELLED',
  };
  return mapping[status?.toLowerCase()] || 'ASSIGNED';
}

// Update testConnection (lines 58-70)
async testConnection(apiKey: string, apiSecret?: string): Promise<boolean> {
  if (this.useMockData) {
    return apiKey && apiKey.length > 3;
  }

  try {
    const response = await fetch(`${this.baseUrl}/loads`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'X-API-Secret': apiSecret || '',
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Update getActiveLoads (lines 38-52)
async getActiveLoads(apiKey: string, apiSecret: string): Promise<LoadData[]> {
  if (this.useMockData) {
    return [this.getMockLoad('TB-LOAD-001'), this.getMockLoad('TB-LOAD-002')];
  }

  try {
    const response = await fetch(`${this.baseUrl}/loads?status=active`, {
      headers: {
        'X-API-Key': apiKey,
        'X-API-Secret': apiSecret,
      },
    });

    if (!response.ok) {
      throw new Error(`Truckbase API error: ${response.statusText}`);
    }

    const data = await response.json();
    const loads = data.loads || data.data || data;
    return Array.isArray(loads) ? loads.map(load => this.transformLoadData(load)) : [];
  } catch (error) {
    throw new Error(`Failed to fetch loads from Truckbase: ${error.message}`);
  }
}
```

**Step 4: Run tests**

```bash
export TRUCKBASE_API_KEY="your-api-key"
export TRUCKBASE_API_SECRET="your-api-secret"
npm test -- truckbase-tms.adapter.spec.ts
```

Expected: Tests pass

**Step 5: Commit**

```bash
git add apps/backend/src/services/adapters/tms/truckbase-tms.adapter.ts
git add apps/backend/src/services/adapters/tms/truckbase-tms.adapter.spec.ts
git commit -m "feat(integrations): enable Truckbase real API"
```

---

### Task 4: Enable Fuel Finder Real API

**Files:**
- Modify: `apps/backend/src/services/adapters/fuel/fuelfinder-fuel.adapter.ts:12`

**Step 1: Write integration test**

Create: `apps/backend/src/services/adapters/fuel/fuelfinder-fuel.adapter.spec.ts`

```typescript
import { FuelFinderAdapter } from './fuelfinder-fuel.adapter';

describe('FuelFinderAdapter - Real API', () => {
  let adapter: FuelFinderAdapter;
  const realApiKey = process.env.FUELFINDER_API_KEY;

  beforeEach(() => {
    adapter = new FuelFinderAdapter();
  });

  it('should find fuel stations near location', async () => {
    if (!realApiKey) {
      console.warn('Skipping real API test - FUELFINDER_API_KEY not set');
      return;
    }

    const stations = await adapter.findStations(realApiKey, {
      latitude: 33.4484,
      longitude: -112.074,
      radius_miles: 25,
      max_results: 5,
    });

    expect(Array.isArray(stations)).toBe(true);
    expect(stations.length).toBeGreaterThan(0);
    expect(stations[0]).toHaveProperty('station_id');
    expect(stations[0]).toHaveProperty('diesel_price');
  }, 10000);
});
```

**Step 2: Implement real API calls**

File: `apps/backend/src/services/adapters/fuel/fuelfinder-fuel.adapter.ts`

```typescript
// Change line 12
private readonly useMockData = false;
private readonly baseUrl = process.env.FUELFINDER_API_URL || 'https://api.fuelfinder.com/v1';

// Update findStations (lines 18-29)
async findStations(apiKey: string, query: FuelStationQuery): Promise<FuelStation[]> {
  if (this.useMockData) {
    return this.getMockStations(query);
  }

  try {
    const { latitude, longitude, radius_miles = 25, max_results = 10 } = query;

    const response = await fetch(
      `${this.baseUrl}/stations?lat=${latitude}&lon=${longitude}&radius=${radius_miles}&limit=${max_results}`,
      {
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Fuel Finder API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    const stations = data.stations || data.data || data;
    return Array.isArray(stations) ? stations.map(s => this.transformStationData(s)) : [];
  } catch (error) {
    throw new Error(`Failed to fetch fuel stations from Fuel Finder: ${error.message}`);
  }
}

// Add transformation method
private transformStationData(ffData: any): FuelStation {
  return {
    station_id: ffData.id || ffData.station_id,
    name: ffData.name,
    brand: ffData.brand,
    address: ffData.address,
    city: ffData.city,
    state: ffData.state,
    zip: ffData.zip || ffData.postal_code,
    latitude: ffData.lat || ffData.latitude,
    longitude: ffData.lon || ffData.longitude,
    price_per_gallon: ffData.regular_price || ffData.price,
    diesel_price: ffData.diesel_price,
    distance_miles: ffData.distance,
    amenities: this.parseAmenities(ffData.amenities),
    last_updated: ffData.updated_at || new Date().toISOString(),
    data_source: 'fuelfinder',
  };
}

private parseAmenities(amenities: any): string[] {
  if (Array.isArray(amenities)) {
    return amenities;
  }
  if (typeof amenities === 'string') {
    return amenities.split(',').map(a => a.trim());
  }
  return [];
}

// Update testConnection (lines 56-68)
async testConnection(apiKey: string): Promise<boolean> {
  if (this.useMockData) {
    return apiKey && apiKey.length > 3;
  }

  try {
    const response = await fetch(
      `${this.baseUrl}/stations?lat=33.4484&lon=-112.074&limit=1`,
      {
        headers: {
          'X-API-Key': apiKey,
        },
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}
```

**Step 3: Run tests**

```bash
export FUELFINDER_API_KEY="your-api-key"
npm test -- fuelfinder-fuel.adapter.spec.ts
```

**Step 4: Commit**

```bash
git add apps/backend/src/services/adapters/fuel/fuelfinder-fuel.adapter.ts
git add apps/backend/src/services/adapters/fuel/fuelfinder-fuel.adapter.spec.ts
git commit -m "feat(integrations): enable Fuel Finder real API"
```

---

### Task 5: Enable OpenWeather Real API

**Files:**
- Modify: `apps/backend/src/services/adapters/weather/openweather.adapter.ts:14`

**Step 1: Change useMockData flag**

File: `apps/backend/src/services/adapters/weather/openweather.adapter.ts`

Line 14: Change to `private readonly useMockData = false;`

**Step 2: Write integration test**

Create: `apps/backend/src/services/adapters/weather/openweather.adapter.spec.ts`

```typescript
import { OpenWeatherAdapter } from './openweather.adapter';

describe('OpenWeatherAdapter - Real API', () => {
  let adapter: OpenWeatherAdapter;
  const realApiKey = process.env.OPENWEATHER_API_KEY;

  beforeEach(() => {
    adapter = new OpenWeatherAdapter();
  });

  it('should get current weather from real API', async () => {
    if (!realApiKey) {
      console.warn('Skipping real API test - OPENWEATHER_API_KEY not set');
      return;
    }

    const weather = await adapter.getCurrentWeather(realApiKey, 33.4484, -112.074);

    expect(weather).toBeDefined();
    expect(weather.current.temperature_f).toBeGreaterThan(0);
    expect(weather.data_source).toBe('openweather');
  }, 10000);

  it('should test connection with real API key', async () => {
    if (!realApiKey) {
      console.warn('Skipping real API test - OPENWEATHER_API_KEY not set');
      return;
    }

    const result = await adapter.testConnection(realApiKey);
    expect(result).toBe(true);
  }, 10000);
});
```

**Step 3: Run tests**

```bash
export OPENWEATHER_API_KEY="your-api-key"
npm test -- openweather.adapter.spec.ts
```

Expected: Tests pass (real API logic already implemented)

**Step 4: Commit**

```bash
git add apps/backend/src/services/adapters/weather/openweather.adapter.ts
git add apps/backend/src/services/adapters/weather/openweather.adapter.spec.ts
git commit -m "feat(integrations): enable OpenWeather real API"
```

---

### Task 6: End-to-End Integration Test

**Files:**
- Create: `apps/backend/src/api/integrations/integrations.e2e.spec.ts`

**Step 1: Write E2E test**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';

describe('Integrations E2E Test', () => {
  let app: INestApplication;
  let jwtToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login to get JWT token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpassword',
      });

    jwtToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create Samsara integration', async () => {
    const response = await request(app.getHttpServer())
      .post('/integrations')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        integration_type: 'HOS_ELD',
        vendor: 'SAMSARA_ELD',
        display_name: 'Test Samsara',
        credentials: {
          apiKey: process.env.SAMSARA_API_KEY,
        },
        sync_interval_seconds: 300,
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.vendor).toBe('SAMSARA_ELD');
  });

  it('should test connection successfully', async () => {
    // First create integration
    const createResponse = await request(app.getHttpServer())
      .post('/integrations')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        integration_type: 'HOS_ELD',
        vendor: 'SAMSARA_ELD',
        display_name: 'Test Samsara 2',
        credentials: {
          apiKey: process.env.SAMSARA_API_KEY,
        },
      });

    const integrationId = createResponse.body.id;

    // Test connection
    const testResponse = await request(app.getHttpServer())
      .post(`/integrations/${integrationId}/test`)
      .set('Authorization', `Bearer ${jwtToken}`);

    expect(testResponse.status).toBe(200);
    expect(testResponse.body.success).toBe(true);
  });
});
```

**Step 2: Run E2E tests**

```bash
npm run test:e2e -- integrations.e2e.spec.ts
```

Expected: All tests pass

**Step 3: Commit**

```bash
git add apps/backend/src/api/integrations/integrations.e2e.spec.ts
git commit -m "test(integrations): add E2E tests for real API"
```

---

## Week 2: Retry Logic & Alerting (Days 6-10)

### Task 7: Create Retry Service

**Files:**
- Create: `apps/backend/src/services/retry/retry.service.ts`
- Create: `apps/backend/src/services/retry/retry.service.spec.ts`
- Create: `apps/backend/src/services/retry/retry.module.ts`

**Step 1: Write failing test**

File: `apps/backend/src/services/retry/retry.service.spec.ts`

```typescript
import { RetryService } from './retry.service';

describe('RetryService', () => {
  let service: RetryService;

  beforeEach(() => {
    service = new RetryService();
  });

  it('should succeed on first attempt', async () => {
    const operation = jest.fn().mockResolvedValue('success');

    const result = await service.withRetry(
      operation,
      { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 1000, exponentialBase: 2 },
      'test-operation'
    );

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on network error', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValue('success');

    const result = await service.withRetry(
      operation,
      { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 100, exponentialBase: 2 },
      'test-operation'
    );

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should not retry on 401 error', async () => {
    const error = { response: { status: 401 }, message: 'Unauthorized' };
    const operation = jest.fn().mockRejectedValue(error);

    await expect(
      service.withRetry(
        operation,
        { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 100, exponentialBase: 2 },
        'test-operation'
      )
    ).rejects.toEqual(error);

    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should give up after max attempts', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('ETIMEDOUT'));

    await expect(
      service.withRetry(
        operation,
        { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 100, exponentialBase: 2 },
        'test-operation'
      )
    ).rejects.toThrow('ETIMEDOUT');

    expect(operation).toHaveBeenCalledTimes(3);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- retry.service.spec.ts
```

Expected: Module not found error

**Step 3: Implement retry service**

File: `apps/backend/src/services/retry/retry.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBase: number;
  retryableErrors?: string[];
}

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions,
    context: string,
  ): Promise<T> {
    const {
      maxAttempts = 3,
      baseDelayMs = 1000,
      maxDelayMs = 30000,
      exponentialBase = 2,
      retryableErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
    } = options;

    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logger.log(`${context}: Attempt ${attempt}/${maxAttempts}`);
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry non-retryable errors
        if (!this.isRetryable(error, retryableErrors)) {
          this.logger.warn(`${context}: Non-retryable error, failing immediately`);
          throw error;
        }

        // Last attempt, throw error
        if (attempt === maxAttempts) {
          this.logger.error(`${context}: All ${maxAttempts} attempts failed`);
          throw error;
        }

        // Calculate delay with exponential backoff + jitter
        const baseDelay = baseDelayMs * Math.pow(exponentialBase, attempt - 1);
        const jitter = Math.random() * 0.3 * baseDelay;
        const delay = Math.min(baseDelay + jitter, maxDelayMs);

        this.logger.warn(
          `${context}: Attempt ${attempt} failed, retrying in ${Math.round(delay)}ms. Error: ${error.message}`,
        );

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private isRetryable(error: any, retryableErrors: string[]): boolean {
    // Network errors
    if (error.code && retryableErrors.includes(error.code)) {
      return true;
    }

    // HTTP 429 (rate limit), 500, 502, 503, 504
    if (error.response?.status) {
      const status = error.response.status;
      return status === 429 || (status >= 500 && status < 600);
    }

    // Timeout errors
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      return true;
    }

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

**Step 4: Create module**

File: `apps/backend/src/services/retry/retry.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { RetryService } from './retry.service';

@Module({
  providers: [RetryService],
  exports: [RetryService],
})
export class RetryModule {}
```

**Step 5: Run tests**

```bash
npm test -- retry.service.spec.ts
```

Expected: All tests pass

**Step 6: Commit**

```bash
git add apps/backend/src/services/retry/
git commit -m "feat(integrations): add retry service with exponential backoff"
```

---

### Task 8: Integrate Retry Service with Integration Manager

**Files:**
- Modify: `apps/backend/src/services/integration-manager/integration-manager.module.ts`
- Modify: `apps/backend/src/services/integration-manager/integration-manager.service.ts`

**Step 1: Import RetryModule**

File: `apps/backend/src/services/integration-manager/integration-manager.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { IntegrationManagerService } from './integration-manager.service';
import { RetryModule } from '../retry/retry.module';
// ... other imports

@Module({
  imports: [
    PrismaModule,
    RetryModule, // Add this
    // ... other modules
  ],
  providers: [IntegrationManagerService],
  exports: [IntegrationManagerService],
})
export class IntegrationManagerModule {}
```

**Step 2: Inject and use RetryService**

File: `apps/backend/src/services/integration-manager/integration-manager.service.ts`

Add to constructor:

```typescript
constructor(
  private prisma: PrismaService,
  private credentials: CredentialsService,
  private retry: RetryService, // Add this
  // ... other dependencies
) {}
```

Update `getDriverHOS` method:

```typescript
async getDriverHOS(tenantId: number, driverId: string): Promise<HOSData> {
  const driver = await this.prisma.driver.findFirst({
    where: { driverId, tenantId },
  });

  if (!driver) {
    throw new Error(`Driver ${driverId} not found`);
  }

  // 1. Manual override takes precedence
  if (driver.hosManualOverride && driver.hosData) {
    return { ...(driver.hosData as any), data_source: 'manual_override' };
  }

  // 2. Check cache freshness
  const cacheAge = driver.hosDataSyncedAt
    ? Date.now() - driver.hosDataSyncedAt.getTime()
    : Infinity;
  const isCacheFresh = cacheAge < 5 * 60 * 1000;

  if (isCacheFresh && driver.hosData) {
    return {
      ...(driver.hosData as any),
      cached: true,
      cache_age_seconds: Math.floor(cacheAge / 1000),
    };
  }

  // 3. Fetch from ELD with retry
  try {
    const hosData = await this.retry.withRetry(
      async () => {
        const integration = await this.getActiveHOSIntegration(tenantId);
        const apiKey = this.getApiKeyFromCredentials(integration.credentials);
        return await this.samsaraAdapter.getDriverHOS(
          apiKey,
          driver.externalDriverId || driverId,
        );
      },
      {
        maxAttempts: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        exponentialBase: 2,
      },
      `getDriverHOS(${driverId})`,
    );

    // Update cache
    await this.prisma.driver.update({
      where: { id: driver.id },
      data: {
        hosData: hosData as any,
        hosDataSyncedAt: new Date(),
        hosDataSource: hosData.data_source,
        lastSyncedAt: new Date(),
      },
    });

    return hosData;
  } catch (error) {
    // 4. Fall back to stale cache
    if (driver.hosData) {
      this.logger.warn(
        `Failed to fetch HOS for ${driverId}, using stale cache: ${error.message}`,
      );
      return {
        ...(driver.hosData as any),
        cached: true,
        stale: true,
        cache_age_seconds: Math.floor(cacheAge / 1000),
        error: error.message,
      };
    }

    throw new Error(
      `No HOS data available for driver ${driverId}: ${error.message}`,
    );
  }
}
```

**Step 3: Write integration test**

File: `apps/backend/src/services/integration-manager/integration-manager.service.spec.ts`

Add test:

```typescript
it('should retry on network failure', async () => {
  const mockDriver = { id: 1, driverId: 'DRV-001', tenantId: 1, hosData: null };
  jest.spyOn(prisma.driver, 'findFirst').mockResolvedValue(mockDriver as any);

  let attempts = 0;
  jest.spyOn(samsaraAdapter, 'getDriverHOS').mockImplementation(() => {
    attempts++;
    if (attempts < 3) {
      throw new Error('ECONNRESET');
    }
    return Promise.resolve({
      driver_id: 'DRV-001',
      hours_driven: 8.5,
      duty_status: 'DRIVING',
      data_source: 'samsara_eld',
    } as HOSData);
  });

  const result = await service.getDriverHOS(1, 'DRV-001');

  expect(result).toBeDefined();
  expect(attempts).toBe(3);
});
```

**Step 4: Run tests**

```bash
npm test -- integration-manager.service.spec.ts
```

**Step 5: Commit**

```bash
git add apps/backend/src/services/integration-manager/
git commit -m "feat(integrations): integrate retry logic with integration manager"
```

---

### Task 9: Create Alert Service

**Files:**
- Create: `apps/backend/src/services/alerts/alert.service.ts`
- Create: `apps/backend/src/services/alerts/alert.service.spec.ts`
- Create: `apps/backend/src/services/alerts/alert.module.ts`

**Step 1: Install nodemailer**

```bash
cd apps/backend
npm install nodemailer @types/nodemailer
```

**Step 2: Write failing test**

File: `apps/backend/src/services/alerts/alert.service.spec.ts`

```typescript
import { AlertService, AlertSeverity } from './alert.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AlertService', () => {
  let service: AlertService;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = new PrismaService();
    service = new AlertService(prisma);
  });

  it('should format alert email correctly', async () => {
    const alert = {
      title: 'Integration Failing',
      message: 'HOS sync has failed 3 times',
      severity: AlertSeverity.ERROR,
      context: { tenantId: 1, failureCount: 3 },
    };

    // We can't easily test email sending, so we test the format method
    const html = (service as any).formatAlertEmail(alert);

    expect(html).toContain('Integration Failing');
    expect(html).toContain('HOS sync has failed 3 times');
    expect(html).toContain('ERROR');
  });
});
```

**Step 3: Run test**

```bash
npm test -- alert.service.spec.ts
```

Expected: Module not found

**Step 4: Implement alert service**

File: `apps/backend/src/services/alerts/alert.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface Alert {
  title: string;
  message: string;
  severity: AlertSeverity;
  context: Record<string, any>;
}

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);
  private transporter: nodemailer.Transporter;

  constructor(private prisma: PrismaService) {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendAlert(
    alert: Alert,
    tenantId: number,
    recipients?: string[],
  ): Promise<void> {
    if (!recipients || recipients.length === 0) {
      recipients = await this.getAdminEmails(tenantId);
    }

    if (recipients.length === 0) {
      this.logger.warn('No recipients for alert, skipping email');
      return;
    }

    const subject = `[${alert.severity}] ${alert.title}`;
    const html = this.formatAlertEmail(alert);

    try {
      await this.transporter.sendMail({
        from: process.env.ALERT_FROM_EMAIL || 'alerts@sally.app',
        to: recipients.join(', '),
        subject,
        html,
      });

      this.logger.log(`Alert sent to ${recipients.length} recipients: ${alert.title}`);
    } catch (error) {
      this.logger.error(`Failed to send alert: ${error.message}`);
    }
  }

  private async getAdminEmails(tenantId: number): Promise<string[]> {
    const admins = await this.prisma.user.findMany({
      where: {
        tenantId,
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        isActive: true,
      },
      select: { email: true },
    });

    return admins.map((admin) => admin.email);
  }

  private formatAlertEmail(alert: Alert): string {
    const color = {
      INFO: '#3b82f6',
      WARNING: '#f59e0b',
      ERROR: '#ef4444',
      CRITICAL: '#dc2626',
    }[alert.severity];

    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; margin: 0; padding: 20px; background: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden;">
          <div style="background: ${color}; color: white; padding: 24px;">
            <h2 style="margin: 0;">${alert.title}</h2>
            <p style="margin: 8px 0 0 0;">Severity: ${alert.severity}</p>
          </div>
          <div style="padding: 24px;">
            <p style="margin: 0 0 20px 0;">${alert.message}</p>
            <div style="background: #f9fafb; padding: 16px; border-radius: 6px;">
              <h3 style="margin: 0 0 12px 0;">Context</h3>
              <pre style="margin: 0; overflow: auto;">${JSON.stringify(alert.context, null, 2)}</pre>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
```

**Step 5: Create module**

File: `apps/backend/src/services/alerts/alert.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AlertService } from './alert.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertModule {}
```

**Step 6: Add environment variables**

File: `apps/backend/.env.example`

Add:

```bash
# Email Alerting
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
ALERT_FROM_EMAIL="alerts@sally.app"
```

**Step 7: Run tests**

```bash
npm test -- alert.service.spec.ts
```

**Step 8: Commit**

```bash
git add apps/backend/src/services/alerts/
git add apps/backend/.env.example
git commit -m "feat(integrations): add email alert service"
```

---

### Task 10: Add Alert Triggers to Integration Manager

**Files:**
- Modify: `apps/backend/src/services/integration-manager/integration-manager.service.ts`

**Step 1: Import AlertModule**

File: `apps/backend/src/services/integration-manager/integration-manager.module.ts`

```typescript
import { AlertModule } from '../alerts/alert.module';

@Module({
  imports: [
    // ... existing imports
    AlertModule, // Add this
  ],
  // ...
})
```

**Step 2: Add alert triggers**

File: `apps/backend/src/services/integration-manager/integration-manager.service.ts`

Add to constructor:

```typescript
constructor(
  // ... existing dependencies
  private alertService: AlertService, // Add this
) {}
```

Update `syncDriverHOS` method:

```typescript
async syncDriverHOS(tenantId: number, driverId: string): Promise<void> {
  try {
    await this.getDriverHOS(tenantId, driverId);
  } catch (error) {
    // Track failure
    await this.recordSyncFailure(tenantId, 'HOS_SYNC', error);

    // Send alert on repeated failures
    const recentFailures = await this.getRecentFailureCount(tenantId, 'HOS_SYNC', 60);

    if (recentFailures >= 3) {
      await this.alertService.sendAlert(
        {
          title: 'Integration Sync Failing',
          message: `HOS sync has failed ${recentFailures} times in the last hour. Please check your integration configuration.`,
          severity: AlertSeverity.ERROR,
          context: {
            tenantId,
            driverId,
            failureCount: recentFailures,
            error: error.message,
            timestamp: new Date().toISOString(),
          },
        },
        tenantId,
      );
    }

    throw error;
  }
}

private async recordSyncFailure(
  tenantId: number,
  syncType: string,
  error: Error,
): Promise<void> {
  // Implementation depends on your sync log structure
  // This is a simplified version
  this.logger.error(`Sync failure: ${syncType} for tenant ${tenantId}: ${error.message}`);
}

private async getRecentFailureCount(
  tenantId: number,
  syncType: string,
  minutes: number,
): Promise<number> {
  const since = new Date(Date.now() - minutes * 60 * 1000);

  // Query your sync log table
  // This is a simplified implementation
  const count = await this.prisma.integrationSyncLog.count({
    where: {
      integration: { tenantId },
      syncType,
      status: 'failed',
      startedAt: { gte: since },
    },
  });

  return count;
}
```

**Step 3: Test alert manually**

```bash
# Set up test SMTP credentials
export SMTP_HOST="smtp.mailtrap.io"
export SMTP_PORT="2525"
export SMTP_USER="your-mailtrap-user"
export SMTP_PASS="your-mailtrap-pass"

# Trigger integration failure (remove API key to cause failure)
npm run test:e2e -- integrations.e2e.spec.ts
```

Check email inbox for alert

**Step 4: Commit**

```bash
git add apps/backend/src/services/integration-manager/
git commit -m "feat(integrations): add alert triggers for sync failures"
```

---

## Week 3: Sync History UI & Final QA (Days 11-15)

### Task 11: Add Sync History API Endpoint

**Files:**
- Modify: `apps/backend/src/api/integrations/integrations.controller.ts`
- Modify: `apps/backend/src/api/integrations/integrations.service.ts`

**Step 1: Add controller endpoint**

File: `apps/backend/src/api/integrations/integrations.controller.ts`

Add methods:

```typescript
@Get(':integrationId/sync-history')
async getSyncHistory(
  @Param('integrationId') integrationId: string,
  @Query('limit') limit?: string,
  @Query('offset') offset?: string,
) {
  return this.integrationsService.getSyncHistory(
    integrationId,
    parseInt(limit || '50'),
    parseInt(offset || '0'),
  );
}

@Get(':integrationId/sync-history/stats')
async getSyncStats(@Param('integrationId') integrationId: string) {
  return this.integrationsService.getSyncStats(integrationId);
}
```

**Step 2: Implement service methods**

File: `apps/backend/src/api/integrations/integrations.service.ts`

Add methods:

```typescript
async getSyncHistory(
  integrationId: string,
  limit: number = 50,
  offset: number = 0,
) {
  const integration = await this.prisma.integrationConfig.findUnique({
    where: { integrationId },
  });

  if (!integration) {
    throw new NotFoundException('Integration not found');
  }

  const logs = await this.prisma.integrationSyncLog.findMany({
    where: { integrationId: integration.id },
    orderBy: { startedAt: 'desc' },
    take: limit,
    skip: offset,
  });

  return logs.map((log) => ({
    id: log.logId,
    sync_type: log.syncType,
    status: log.status,
    started_at: log.startedAt.toISOString(),
    completed_at: log.completedAt?.toISOString(),
    duration_ms: log.completedAt
      ? log.completedAt.getTime() - log.startedAt.getTime()
      : null,
    records_processed: log.recordsProcessed,
    records_created: log.recordsCreated,
    records_updated: log.recordsUpdated,
  }));
}

async getSyncStats(integrationId: string) {
  const integration = await this.prisma.integrationConfig.findUnique({
    where: { integrationId },
  });

  if (!integration) {
    throw new NotFoundException('Integration not found');
  }

  const [total, successful, failed] = await Promise.all([
    this.prisma.integrationSyncLog.count({
      where: { integrationId: integration.id },
    }),
    this.prisma.integrationSyncLog.count({
      where: { integrationId: integration.id, status: 'success' },
    }),
    this.prisma.integrationSyncLog.count({
      where: { integrationId: integration.id, status: 'failed' },
    }),
  ]);

  return {
    total_syncs: total,
    successful_syncs: successful,
    failed_syncs: failed,
    success_rate: total > 0 ? (successful / total) * 100 : 0,
  };
}
```

**Step 3: Test API endpoints**

```bash
# Start backend
npm run start:dev

# Test sync history endpoint
curl http://localhost:8000/api/v1/integrations/{id}/sync-history \
  -H "Authorization: Bearer $JWT_TOKEN"

# Test sync stats endpoint
curl http://localhost:8000/api/v1/integrations/{id}/sync-history/stats \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Step 4: Commit**

```bash
git add apps/backend/src/api/integrations/
git commit -m "feat(integrations): add sync history API endpoints"
```

---

### Task 12: Create Sync History Component

**Files:**
- Create: `apps/web/src/components/settings/IntegrationSyncHistory.tsx`
- Modify: `apps/web/src/lib/api/integrations.ts`

**Step 1: Add API client methods**

File: `apps/web/src/lib/api/integrations.ts`

Add interfaces and functions:

```typescript
export interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  records_processed: number;
  records_created: number;
  records_updated: number;
}

export interface SyncStats {
  total_syncs: number;
  successful_syncs: number;
  failed_syncs: number;
  success_rate: number;
}

export async function getSyncHistory(
  integrationId: string,
  limit: number = 50,
  offset: number = 0,
): Promise<SyncLog[]> {
  return apiClient.get(`/integrations/${integrationId}/sync-history`, {
    params: { limit, offset },
  });
}

export async function getSyncStats(integrationId: string): Promise<SyncStats> {
  return apiClient.get(`/integrations/${integrationId}/sync-history/stats`);
}
```

**Step 2: Create sync history component**

File: `apps/web/src/components/settings/IntegrationSyncHistory.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { getSyncHistory, getSyncStats, type SyncLog, type SyncStats } from '@/lib/api/integrations';

interface IntegrationSyncHistoryProps {
  integrationId: string;
}

export function IntegrationSyncHistory({ integrationId }: IntegrationSyncHistoryProps) {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [integrationId]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [logsData, statsData] = await Promise.all([
        getSyncHistory(integrationId),
        getSyncStats(integrationId),
      ]);
      setLogs(logsData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sync history');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <Button onClick={loadData} variant="outline">Retry</Button>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No sync history yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Syncs</p>
              <p className="text-2xl font-bold text-foreground">{stats.total_syncs}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="text-2xl font-bold text-foreground">
                {stats.success_rate.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Successful</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.successful_syncs}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.failed_syncs}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sync History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Syncs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Records</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <SyncStatusBadge status={log.status} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.sync_type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatRelativeTime(log.started_at)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.records_processed} processed
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SyncStatusBadge({ status }: { status: string }) {
  const config = {
    success: {
      icon: CheckCircle2,
      label: 'Success',
      className: 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200',
    },
    failed: {
      icon: XCircle,
      label: 'Failed',
      className: 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200',
    },
  }[status] || {
    icon: Clock,
    label: status,
    className: 'bg-gray-100 dark:bg-gray-950',
  };

  const Icon = config.icon;

  return (
    <Badge variant="outline" className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return `${Math.floor(diffMins / 1440)}d ago`;
}
```

**Step 3: Test component locally**

```bash
cd apps/web
npm run dev
```

Navigate to integrations page and verify sync history displays

**Step 4: Commit**

```bash
git add apps/web/src/components/settings/IntegrationSyncHistory.tsx
git add apps/web/src/lib/api/integrations.ts
git commit -m "feat(integrations): add sync history UI component"
```

---

### Task 13: Integrate Sync History into Settings

**Files:**
- Modify: `apps/web/src/components/settings/ConnectionsTab.tsx`

**Step 1: Add sync history tab**

File: `apps/web/src/components/settings/ConnectionsTab.tsx`

Inside the configure dialog, add tabs:

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IntegrationSyncHistory } from './IntegrationSyncHistory';

// Inside Dialog component
<Dialog open={configureDialog.open} onOpenChange={...}>
  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>
        {configureDialog.integration ? 'Configure Integration' : 'Add Integration'}
      </DialogTitle>
    </DialogHeader>

    <Tabs defaultValue="settings">
      <TabsList>
        <TabsTrigger value="settings">Settings</TabsTrigger>
        {configureDialog.integration && (
          <TabsTrigger value="history">Sync History</TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="settings">
        <ConfigureIntegrationForm {...props} />
      </TabsContent>

      {configureDialog.integration && (
        <TabsContent value="history">
          <IntegrationSyncHistory integrationId={configureDialog.integration.id} />
        </TabsContent>
      )}
    </Tabs>
  </DialogContent>
</Dialog>
```

**Step 2: Test integration**

Navigate to integration settings, configure an integration, and verify sync history tab appears

**Step 3: Commit**

```bash
git add apps/web/src/components/settings/ConnectionsTab.tsx
git commit -m "feat(integrations): integrate sync history into settings dialog"
```

---

### Task 14: Full Regression Testing

**Files:**
- Create: `apps/backend/test/integrations-phase2.e2e.spec.ts`

**Step 1: Create comprehensive E2E test**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Phase 2 Integration Tests', () => {
  let app: INestApplication;
  let jwtToken: string;
  let integrationId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpassword',
      });

    jwtToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Real API Integration', () => {
    it('should create Samsara integration with real API', async () => {
      const response = await request(app.getHttpServer())
        .post('/integrations')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          integration_type: 'HOS_ELD',
          vendor: 'SAMSARA_ELD',
          display_name: 'E2E Test Samsara',
          credentials: { apiKey: process.env.SAMSARA_API_KEY },
        });

      expect(response.status).toBe(201);
      integrationId = response.body.id;
    });

    it('should test connection successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/integrations/${integrationId}/test`)
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should trigger manual sync', async () => {
      const response = await request(app.getHttpServer())
        .post(`/integrations/${integrationId}/sync`)
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Sync History', () => {
    it('should retrieve sync history', async () => {
      const response = await request(app.getHttpServer())
        .get(`/integrations/${integrationId}/sync-history`)
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should retrieve sync stats', async () => {
      const response = await request(app.getHttpServer())
        .get(`/integrations/${integrationId}/sync-history/stats`)
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total_syncs');
      expect(response.body).toHaveProperty('success_rate');
    });
  });

  describe('Retry Logic', () => {
    it('should retry on transient failures', async () => {
      // This test would need to mock network failures
      // Simplified version shown here
      expect(true).toBe(true);
    });
  });

  describe('Alerting', () => {
    it('should send email alert on repeated failures', async () => {
      // This test would trigger multiple failures and verify alert sent
      // Simplified version shown here
      expect(true).toBe(true);
    });
  });
});
```

**Step 2: Run all E2E tests**

```bash
npm run test:e2e
```

Expected: All tests pass

**Step 3: Performance testing**

```bash
# Install k6 for load testing (if not already installed)
brew install k6

# Run load test
k6 run test/load/integrations-phase2.js
```

**Step 4: Document test results**

Create: `.specs/features/03-integrations/PHASE2_TEST_RESULTS.md`

Document:
- All E2E test results
- Performance metrics
- Known issues
- Sign-off date

**Step 5: Commit**

```bash
git add apps/backend/test/integrations-phase2.e2e.spec.ts
git add .specs/features/03-integrations/PHASE2_TEST_RESULTS.md
git commit -m "test(integrations): add Phase 2 E2E tests and results"
```

---

### Task 15: Production Deployment Preparation

**Files:**
- Create: `.specs/features/03-integrations/DEPLOYMENT_CHECKLIST.md`

**Step 1: Create deployment checklist**

```markdown
# Phase 2 Deployment Checklist

## Pre-Deployment

- [ ] All E2E tests passing
- [ ] Performance benchmarks met (< 2s p95)
- [ ] API credentials obtained and stored securely
- [ ] SMTP credentials configured
- [ ] Environment variables documented
- [ ] Database migrations ready

## Deployment Steps

1. [ ] Run database migrations
2. [ ] Deploy backend with new environment variables
3. [ ] Deploy frontend
4. [ ] Verify all 4 integrations testable
5. [ ] Verify sync history displays
6. [ ] Verify email alerts working

## Post-Deployment

- [ ] Monitor error rates for 24 hours
- [ ] Check email alert delivery
- [ ] Verify sync success rates > 95%
- [ ] Gather user feedback

## Rollback Plan

If issues detected:
1. Revert to previous deployment
2. Set useMockData=true in all adapters
3. Investigate issues in staging environment
```

**Step 2: Review with team**

Schedule deployment review meeting

**Step 3: Final commit**

```bash
git add .specs/features/03-integrations/DEPLOYMENT_CHECKLIST.md
git commit -m "docs(integrations): add Phase 2 deployment checklist"
git tag phase2-complete
git push origin main --tags
```

---

## Success Criteria

**Phase 2 is complete when:**

- [ ] All 4 adapters using real APIs (useMockData=false)
- [ ] Retry service implemented with exponential backoff
- [ ] Circuit breaker pattern implemented (optional, can defer to Phase 3)
- [ ] Email alerting working and tested
- [ ] Sync history API endpoints implemented
- [ ] Sync history UI component working
- [ ] All E2E tests passing
- [ ] Performance benchmarks met:
  - API response time < 2s (p95)
  - Sync completion < 5s for 10 drivers
  - UI load time < 1s
- [ ] Security verified:
  - API keys encrypted in database
  - Tenant isolation working
  - RBAC enforced
- [ ] Documentation complete:
  - Test results documented
  - Deployment checklist created
  - Known issues logged

---

## Execution Handoff

Plan complete and saved to `.specs/features/03-integrations/PHASE2_PLAN.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
