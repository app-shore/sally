# Phase 2 Implementation Plan - Integrations Feature

**Timeline:** 2-3 Weeks
**Goal:** Transition from MVP to Production-Grade with Real APIs
**Status:** Ready to Start
**Last Updated:** January 30, 2026

---

## Executive Summary

Phase 2 focuses on **production hardening** and **enabling real API integrations**. This phase will:
- ✅ Switch from mock data to real API calls
- ✅ Add production-grade error handling (retry logic, circuit breakers)
- ✅ Implement alerting for integration failures
- ✅ Build sync history UI for transparency

**Timeline Breakdown:**
- **Week 1:** Enable real APIs + Testing (5 days)
- **Week 2:** Retry logic + Alerting (5 days)
- **Week 3:** Sync history UI + Final QA (5 days)

**What We're NOT Doing (Deferred to Phase 3):**
- ❌ Additional vendors (KeepTruckin, McLeod) - Current 4 vendors sufficient for MVP
- ❌ Webhook support - Polling works fine for now
- ❌ Field mapping UI - Not needed yet
- ❌ OAuth flows - API key auth sufficient

---

## Week 1: Enable Real APIs (5 days)

### Goal
Switch from mock data to real API calls for production vendors.

### Tasks

#### 1.1 Obtain Real API Credentials (Day 1)
**Owner:** Product/Business Team
**Estimated Time:** 2-4 hours

**Actions:**
- [ ] **Samsara API Key**
  - Sign up for Samsara developer account: https://developers.samsara.com
  - Create API token from Samsara Dashboard → Settings → API Tokens
  - Copy token to secure location (1Password, AWS Secrets Manager)
  - Document: API key format, rate limits, test vs production keys

- [ ] **Truckbase API Key**
  - Contact Truckbase support for API access
  - Get API key + secret from Truckbase dashboard
  - Store credentials securely
  - Document: Authentication method, endpoints, rate limits

- [ ] **Fuel Finder API Key**
  - Sign up at fuelfinder.com/api
  - Get API key from dashboard
  - Store securely
  - Document: API limits, pricing tier

- [ ] **OpenWeather API Key**
  - Sign up at openweathermap.org/api
  - Get free tier API key (60 calls/min limit)
  - Store securely
  - Document: Rate limits, upgrade path

**Deliverable:**
- Credentials document with all API keys
- Stored in AWS Secrets Manager (recommended) or secure env vars
- API documentation summary for each vendor

---

#### 1.2 Update Environment Variables (Day 1)
**Owner:** DevOps/Backend Developer
**Estimated Time:** 30 minutes

**Actions:**
```bash
# .env (backend)
# Credentials Encryption Key (already exists)
CREDENTIALS_ENCRYPTION_KEY="your-64-char-hex-key"

# External API Keys (for testing adapters)
SAMSARA_API_KEY="samsara_api_..."
TRUCKBASE_API_KEY="truckbase_..."
TRUCKBASE_API_SECRET="truckbase_secret_..."
FUELFINDER_API_KEY="fuelfinder_..."
OPENWEATHER_API_KEY="openweather_..."

# API Base URLs
SAMSARA_API_URL="https://api.samsara.com/v1"
TRUCKBASE_API_URL="https://api.truckbase.io/v1"
FUELFINDER_API_URL="https://api.fuelfinder.com/v1"
OPENWEATHER_API_URL="https://api.openweathermap.org/data/2.5"
```

**Deliverable:**
- Updated .env file
- .env.example with descriptions
- Documentation in .docs/SETUP.md

---

#### 1.3 Enable Samsara Real API (Day 2)
**Owner:** Backend Developer
**Estimated Time:** 4 hours

**File:** `apps/backend/src/services/adapters/hos/samsara-hos.adapter.ts`

**Changes:**
```typescript
// BEFORE
private readonly useMockData = true;

// AFTER
private readonly useMockData = false; // Enable real API

// Update API calls
async getDriverHOS(apiKey: string, driverId: string): Promise<HOSData> {
  if (this.useMockData) {
    return this.getMockDriverHOS(driverId);
  }

  // Real API call
  const response = await fetch(
    `${this.baseUrl}/fleet/drivers/${driverId}/hos_logs`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Samsara API error: ${response.status} ${response.statusText} - ${errorBody}`
    );
  }

  const data = await response.json();

  // Transform Samsara format → SALLY format
  return this.transformHOSData(data);
}

private transformHOSData(samsaraData: any): HOSData {
  // Map Samsara fields to SALLY format
  return {
    driver_id: samsaraData.driverId,
    hours_driven: samsaraData.driveMilliseconds / (1000 * 60 * 60),
    on_duty_time: samsaraData.onDutyMilliseconds / (1000 * 60 * 60),
    hours_since_break: samsaraData.timeSinceLastBreakMilliseconds / (1000 * 60 * 60),
    duty_status: this.mapDutyStatus(samsaraData.dutyStatus),
    last_updated: samsaraData.lastUpdatedTime,
    data_source: 'Samsara ELD',
  };
}

private mapDutyStatus(status: string): string {
  const mapping: Record<string, string> = {
    'on_duty_driving': 'on_duty_driving',
    'on_duty_not_driving': 'on_duty_not_driving',
    'off_duty': 'off_duty',
    'sleeper_berth': 'sleeper_berth',
  };
  return mapping[status] || 'off_duty';
}
```

**Testing:**
```bash
# Test Samsara adapter directly
npm run test:adapter:samsara

# Test via integration endpoint
curl -X POST http://localhost:8000/api/v1/integrations/{id}/test \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Deliverable:**
- Samsara adapter with real API calls
- Passing test results
- Documentation of API response format

---

#### 1.4 Enable Truckbase Real API (Day 2)
**Owner:** Backend Developer
**Estimated Time:** 4 hours

**File:** `apps/backend/src/services/adapters/tms/truckbase-tms.adapter.ts`

**Changes:**
```typescript
private readonly useMockData = false; // Enable real API

async testConnection(apiKey: string, apiSecret?: string): Promise<boolean> {
  try {
    const response = await fetch(`${this.baseUrl}/company`, {
      headers: {
        'X-API-Key': apiKey,
        'X-API-Secret': apiSecret || '',
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch (error) {
    console.error('Truckbase connection test failed:', error);
    return false;
  }
}

async getLoad(apiKey: string, apiSecret: string, loadId: string): Promise<LoadData> {
  const response = await fetch(
    `${this.baseUrl}/loads/${loadId}`,
    {
      headers: {
        'X-API-Key': apiKey,
        'X-API-Secret': apiSecret,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Truckbase API error: ${response.statusText}`);
  }

  const data = await response.json();
  return this.transformLoadData(data);
}

async getActiveLoads(apiKey: string, apiSecret: string): Promise<LoadData[]> {
  const response = await fetch(
    `${this.baseUrl}/loads?status=active`,
    {
      headers: {
        'X-API-Key': apiKey,
        'X-API-Secret': apiSecret,
      },
    }
  );

  const data = await response.json();
  return data.loads.map((load: any) => this.transformLoadData(load));
}

private transformLoadData(tbData: any): LoadData {
  return {
    load_id: tbData.id,
    origin: {
      location: tbData.pickup_location,
      scheduled_time: tbData.pickup_time,
    },
    destination: {
      location: tbData.delivery_location,
      scheduled_time: tbData.delivery_time,
    },
    status: this.mapLoadStatus(tbData.status),
    data_source: 'Truckbase TMS',
  };
}
```

**Deliverable:**
- Truckbase adapter with real API calls
- Passing test results

---

#### 1.5 Enable Fuel Finder & OpenWeather (Day 3)
**Owner:** Backend Developer
**Estimated Time:** 3 hours each (6 hours total)

**Fuel Finder Adapter:**
**File:** `apps/backend/src/services/adapters/fuel/fuelfinder-fuel.adapter.ts`

```typescript
private readonly useMockData = false;

async findStations(
  apiKey: string,
  query: FuelStationQuery
): Promise<FuelStation[]> {
  const { lat, lon, radius = 25 } = query;

  const response = await fetch(
    `${this.baseUrl}/stations?lat=${lat}&lon=${lon}&radius=${radius}`,
    {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Fuel Finder API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.stations.map(this.transformStationData);
}
```

**OpenWeather Adapter:**
**File:** `apps/backend/src/services/adapters/weather/openweather.adapter.ts`

```typescript
private readonly useMockData = false;

async getCurrentWeather(
  apiKey: string,
  lat: number,
  lon: number
): Promise<WeatherData> {
  const response = await fetch(
    `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`OpenWeather API error: ${response.statusText}`);
  }

  const data = await response.json();
  return this.transformWeatherData(data);
}
```

**Deliverable:**
- Both adapters using real APIs
- Integration tests passing

---

#### 1.6 End-to-End Testing (Day 4-5)
**Owner:** QA + Backend Developer
**Estimated Time:** 2 days

**Test Scenarios:**

**Scenario 1: Add Samsara Integration**
1. Login as DISPATCHER
2. Navigate to Settings → Integrations
3. Click "Hours of Service" category
4. Select "Samsara"
5. Enter real API key
6. Click "Test Connection" → Should succeed
7. Click "Save"
8. Wait 5 minutes for background sync
9. Verify driver HOS data updated

**Scenario 2: Manual Sync**
1. Open existing Samsara integration
2. Click "Sync Now"
3. Verify HOS data refreshed
4. Check sync log created in database

**Scenario 3: Invalid API Key**
1. Create new integration
2. Enter invalid API key
3. Click "Test Connection" → Should fail with clear error
4. Verify status set to "ERROR"

**Scenario 4: API Rate Limit**
1. Trigger multiple rapid syncs
2. Verify graceful handling of 429 errors
3. Check fallback to cached data

**Scenario 5: Cross-Integration Test**
1. Configure all 4 integrations (Samsara, Truckbase, Fuel Finder, OpenWeather)
2. Create a route plan
3. Verify HOS data from Samsara used
4. Verify fuel stops from Fuel Finder inserted
5. Verify weather warnings displayed

**Performance Benchmarks:**
- API response time < 2s (p95)
- Test connection < 3s
- Manual sync (10 drivers) < 5s
- Background sync completes within 1 minute

**Deliverable:**
- Test report with pass/fail for each scenario
- Bug list (if any)
- Performance metrics document

---

## Week 2: Retry Logic & Alerting (5 days)

### Goal
Add production-grade error handling and alerting.

### Tasks

#### 2.1 Implement Retry Logic with Exponential Backoff (Day 6-7)
**Owner:** Backend Developer
**Estimated Time:** 1.5 days

**Create Retry Service:**

**File:** `apps/backend/src/services/retry/retry.service.ts` (NEW)

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

        // Don't retry non-retryable errors (e.g., 401 Unauthorized)
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
        const jitter = Math.random() * 0.3 * baseDelay; // ±30% jitter
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

**Register Retry Service:**

**File:** `apps/backend/src/services/retry/retry.module.ts` (NEW)

```typescript
import { Module } from '@nestjs/common';
import { RetryService } from './retry.service';

@Module({
  providers: [RetryService],
  exports: [RetryService],
})
export class RetryModule {}
```

**Update Integration Manager to Use Retry:**

**File:** `apps/backend/src/services/integration-manager/integration-manager.service.ts`

```typescript
import { RetryService } from '../retry/retry.service';

@Injectable()
export class IntegrationManagerService {
  constructor(
    // ... existing dependencies
    private retry: RetryService,
  ) {}

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
    const isCacheFresh = cacheAge < 5 * 60 * 1000; // 5 minutes

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
}
```

**Unit Tests:**

**File:** `apps/backend/src/services/retry/retry.service.spec.ts` (NEW)

```typescript
describe('RetryService', () => {
  it('should succeed on first attempt', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    const result = await retryService.withRetry(operation, options, 'test');
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on network error', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValue('success');
    const result = await retryService.withRetry(operation, options, 'test');
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should not retry on 401 error', async () => {
    const error = { response: { status: 401 } };
    const operation = jest.fn().mockRejectedValue(error);
    await expect(retryService.withRetry(operation, options, 'test')).rejects.toEqual(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
```

**Deliverable:**
- RetryService with exponential backoff + jitter
- Integration with IntegrationManager
- Unit tests passing (>80% coverage)
- Integration tests demonstrating retry behavior

---

#### 2.2 Implement Circuit Breaker (Day 8)
**Owner:** Backend Developer
**Estimated Time:** 1 day

**Create Circuit Breaker Service:**

**File:** `apps/backend/src/services/circuit-breaker/circuit-breaker.service.ts` (NEW)

```typescript
import { Injectable, Logger } from '@nestjs/common';

enum CircuitState {
  CLOSED = 'CLOSED',       // Normal operation
  OPEN = 'OPEN',           // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

interface CircuitConfig {
  failureThreshold: number;    // Open circuit after N failures
  successThreshold: number;    // Close circuit after N successes
  timeout: number;             // Try half-open after N ms
}

interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastStateChange: number;
  totalRequests: number;
  totalFailures: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private circuits = new Map<string, CircuitStats & { config: CircuitConfig }>();

  async execute<T>(
    key: string,
    operation: () => Promise<T>,
    config: CircuitConfig = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
    },
  ): Promise<T> {
    const circuit = this.getOrCreateCircuit(key, config);
    circuit.totalRequests++;

    // Circuit is OPEN, reject immediately
    if (circuit.state === CircuitState.OPEN) {
      const timeSinceFailure = Date.now() - circuit.lastFailureTime;

      if (timeSinceFailure < config.timeout) {
        this.logger.warn(`Circuit ${key} is OPEN, rejecting request`);
        throw new Error(`Circuit breaker ${key} is OPEN`);
      }

      // Try transitioning to HALF_OPEN
      circuit.state = CircuitState.HALF_OPEN;
      circuit.successes = 0;
      circuit.lastStateChange = Date.now();
      this.logger.log(`Circuit ${key} transitioning to HALF_OPEN`);
    }

    // Try operation
    try {
      const result = await operation();
      this.onSuccess(key);
      return result;
    } catch (error) {
      this.onFailure(key);
      throw error;
    }
  }

  private onSuccess(key: string): void {
    const circuit = this.circuits.get(key);
    if (!circuit) return;

    circuit.failures = 0;
    circuit.successes++;

    if (circuit.state === CircuitState.HALF_OPEN) {
      if (circuit.successes >= circuit.config.successThreshold) {
        circuit.state = CircuitState.CLOSED;
        circuit.lastStateChange = Date.now();
        this.logger.log(`Circuit ${key} closed after successful recovery`);
      }
    }
  }

  private onFailure(key: string): void {
    const circuit = this.circuits.get(key);
    if (!circuit) return;

    circuit.failures++;
    circuit.successes = 0;
    circuit.lastFailureTime = Date.now();
    circuit.totalFailures++;

    if (circuit.failures >= circuit.config.failureThreshold) {
      circuit.state = CircuitState.OPEN;
      circuit.lastStateChange = Date.now();
      this.logger.error(
        `Circuit ${key} opened after ${circuit.failures} failures`,
      );
    }
  }

  private getOrCreateCircuit(key: string, config: CircuitConfig) {
    if (!this.circuits.has(key)) {
      this.circuits.set(key, {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        lastFailureTime: 0,
        lastStateChange: Date.now(),
        totalRequests: 0,
        totalFailures: 0,
        config,
      });
    }
    return this.circuits.get(key)!;
  }

  // Get stats for monitoring
  getStats(key: string): CircuitStats | null {
    const circuit = this.circuits.get(key);
    if (!circuit) return null;

    return {
      state: circuit.state,
      failures: circuit.failures,
      successes: circuit.successes,
      lastFailureTime: circuit.lastFailureTime,
      lastStateChange: circuit.lastStateChange,
      totalRequests: circuit.totalRequests,
      totalFailures: circuit.totalFailures,
    };
  }
}
```

**Integrate with Adapters:**

```typescript
async getDriverHOS(apiKey: string, driverId: string): Promise<HOSData> {
  return this.circuitBreaker.execute(
    `samsara-hos-${driverId}`,
    async () => {
      // Actual API call
      const response = await fetch(...);
      return this.transformHOSData(response);
    },
    {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000, // 1 minute
    },
  );
}
```

**Deliverable:**
- Circuit breaker service
- Integration with all adapters
- Tests for all circuit states (CLOSED, OPEN, HALF_OPEN)
- Monitoring endpoint for circuit stats

---

#### 2.3 Add Email Alerting (Day 9)
**Owner:** Backend Developer
**Estimated Time:** 1 day

**Install Email Service:**
```bash
npm install nodemailer @types/nodemailer
```

**Create Alert Service:**

**File:** `apps/backend/src/services/alerts/alert.service.ts` (NEW)

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
    // Get admin emails if not provided
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
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="background: ${color}; color: white; padding: 24px;">
            <h2 style="margin: 0; font-size: 24px;">${alert.title}</h2>
            <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">Severity: ${alert.severity}</p>
          </div>
          <div style="padding: 24px;">
            <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.5;">
              ${alert.message}
            </p>
            <div style="background: #f9fafb; padding: 16px; border-radius: 6px; border: 1px solid #e5e7eb;">
              <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Context</h3>
              <pre style="margin: 0; font-size: 13px; overflow: auto; color: #1f2937; white-space: pre-wrap; word-wrap: break-word;">${JSON.stringify(alert.context, null, 2)}</pre>
            </div>
            <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <a href="${process.env.APP_URL}/settings/integrations" style="display: inline-block; background: ${color}; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
                View Integrations
              </a>
            </div>
          </div>
          <div style="padding: 16px 24px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
            <p style="margin: 0;">
              This is an automated alert from SALLY Integration Monitor.
              <br>
              Time: ${new Date().toISOString()}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
```

**Add Alert Triggers in Integration Manager:**

```typescript
async syncDriverHOS(tenantId: number, driverId: string): Promise<void> {
  try {
    await this.getDriverHOS(tenantId, driverId);
  } catch (error) {
    // Track failure
    await this.recordSyncFailure(tenantId, 'HOS_SYNC', error);

    // Send alert on repeated failures
    const recentFailures = await this.getRecentFailureCount(tenantId, 'HOS_SYNC', 60); // Last hour

    if (recentFailures >= 3) {
      await this.alertService.sendAlert(
        {
          title: 'Integration Sync Failing',
          message: `HOS sync has failed ${recentFailures} times in the last hour. Please check your integration configuration and API credentials.`,
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
  // Store in database for tracking
  await this.prisma.integrationSyncLog.create({
    data: {
      logId: `log_${randomUUID()}`,
      integrationId: 0, // Will be updated with actual integration
      syncType,
      startedAt: new Date(),
      completedAt: new Date(),
      status: 'failed',
      recordsProcessed: 0,
      errorDetails: {
        message: error.message,
        stack: error.stack,
      },
    },
  });
}

private async getRecentFailureCount(
  tenantId: number,
  syncType: string,
  minutes: number,
): Promise<number> {
  const since = new Date(Date.now() - minutes * 60 * 1000);

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

**Environment Variables:**
```bash
# .env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
ALERT_FROM_EMAIL="alerts@sally.app"
APP_URL="https://sally.app"  # For alert links
```

**Testing:**
```bash
# Test email delivery
npm run test:email

# Manually trigger alert
curl -X POST http://localhost:8000/api/v1/test/trigger-alert \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Deliverable:**
- Alert service with email notifications
- Alert triggers for integration failures
- Test email delivery working
- Documentation on alert configuration

---

#### 2.4 Add Slack Alerting (Optional) (Day 10)
**Owner:** Backend Developer
**Estimated Time:** 0.5 day

**Install Slack SDK:**
```bash
npm install @slack/webhook
```

**Extend Alert Service:**

```typescript
import { IncomingWebhook } from '@slack/webhook';

@Injectable()
export class AlertService {
  private slackWebhook: IncomingWebhook | null = null;

  constructor(private prisma: PrismaService) {
    // ... email setup ...

    if (process.env.SLACK_WEBHOOK_URL) {
      this.slackWebhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);
      this.logger.log('Slack alerting enabled');
    }
  }

  async sendAlert(alert: Alert, tenantId: number, recipients?: string[]): Promise<void> {
    // Send email
    await this.sendEmailAlert(alert, tenantId, recipients);

    // Send Slack notification (skip INFO alerts)
    if (this.slackWebhook && alert.severity !== AlertSeverity.INFO) {
      await this.sendSlackAlert(alert, tenantId);
    }
  }

  private async sendSlackAlert(alert: Alert, tenantId: number): Promise<void> {
    if (!this.slackWebhook) return;

    const color = {
      WARNING: '#f59e0b',
      ERROR: '#ef4444',
      CRITICAL: '#dc2626',
    }[alert.severity] || '#3b82f6';

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { companyName: true },
    });

    try {
      await this.slackWebhook.send({
        username: 'SALLY Integration Monitor',
        icon_emoji: ':rotating_light:',
        attachments: [
          {
            color,
            title: alert.title,
            text: alert.message,
            fields: [
              { title: 'Tenant', value: tenant?.companyName || 'Unknown', short: true },
              { title: 'Severity', value: alert.severity, short: true },
              ...Object.entries(alert.context).map(([key, value]) => ({
                title: key,
                value: String(value),
                short: true,
              })),
            ],
            footer: 'SALLY Integration Monitor',
            ts: Math.floor(Date.now() / 1000).toString(),
          },
        ],
      });

      this.logger.log('Slack alert sent successfully');
    } catch (error) {
      this.logger.error(`Failed to send Slack alert: ${error.message}`);
    }
  }
}
```

**Environment Variables:**
```bash
# .env
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

**Setup Instructions:**
1. Create Slack app: https://api.slack.com/apps
2. Enable Incoming Webhooks
3. Add webhook to workspace
4. Copy webhook URL to .env

**Deliverable:**
- Slack integration for alerts
- Test Slack notifications
- Documentation on Slack setup

---

## Week 3: Sync History UI + Final QA (5 days)

### Goal
Build user-facing sync history viewer and complete end-to-end QA.

### Tasks

#### 3.1 Add Sync History API Endpoint (Day 11 Morning)
**Owner:** Backend Developer
**Estimated Time:** 3 hours

**File:** `apps/backend/src/api/integrations/integrations.controller.ts`

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

**File:** `apps/backend/src/api/integrations/integrations.service.ts`

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

  const [total, successful, failed, avgDuration] = await Promise.all([
    this.prisma.integrationSyncLog.count({
      where: { integrationId: integration.id },
    }),
    this.prisma.integrationSyncLog.count({
      where: { integrationId: integration.id, status: 'success' },
    }),
    this.prisma.integrationSyncLog.count({
      where: { integrationId: integration.id, status: 'failed' },
    }),
    this.prisma.integrationSyncLog.aggregate({
      where: {
        integrationId: integration.id,
        status: 'success',
        completedAt: { not: null },
      },
      _avg: {
        recordsProcessed: true,
      },
    }),
  ]);

  return {
    total_syncs: total,
    successful_syncs: successful,
    failed_syncs: failed,
    success_rate: total > 0 ? (successful / total) * 100 : 0,
    avg_records_per_sync: avgDuration._avg.recordsProcessed || 0,
  };
}
```

**Deliverable:**
- Sync history API endpoint
- Sync stats API endpoint
- API tests
- Swagger/OpenAPI documentation

---

#### 3.2 Create Sync History Component (Day 11-12)
**Owner:** Frontend Developer
**Estimated Time:** 1.5 days

**File:** `apps/web/src/components/settings/IntegrationSyncHistory.tsx` (NEW)

```tsx
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
import { CheckCircle2, XCircle, Clock, Loader2, TrendingUp } from 'lucide-react';
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
        <span className="ml-3 text-muted-foreground">Loading sync history...</span>
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
      <div className="text-center py-12">
        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          No sync history yet. Syncs will appear here after the first sync.
        </p>
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
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Syncs</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total_syncs}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold text-foreground">
                    {stats.success_rate.toFixed(1)}%
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Successful</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.successful_syncs}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {stats.failed_syncs}
                  </p>
                </div>
              </div>
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
                    <div className="flex flex-col gap-1">
                      <span className="text-foreground">{log.records_processed} processed</span>
                      {log.records_created > 0 && (
                        <span className="text-xs text-green-600 dark:text-green-400">
                          +{log.records_created} created
                        </span>
                      )}
                      {log.records_updated > 0 && (
                        <span className="text-xs text-blue-600 dark:text-blue-400">
                          ~{log.records_updated} updated
                        </span>
                      )}
                    </div>
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
      className:
        'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800',
    },
    failed: {
      icon: XCircle,
      label: 'Failed',
      className:
        'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800',
    },
    partial: {
      icon: Clock,
      label: 'Partial',
      className:
        'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800',
    },
  }[status] || {
    icon: Clock,
    label: status,
    className: 'bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-200',
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

**Deliverable:**
- Sync history component with stats
- Integrated into settings page
- Dark theme compatible
- Mobile responsive

---

#### 3.3 Add to Integration Details Dialog (Day 13 Morning)
**Owner:** Frontend Developer
**Estimated Time:** 2 hours

**Update ConnectionsTab:**

```tsx
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

**Deliverable:**
- Sync history accessible from integration details
- Tabs navigation working
- Testing on all screen sizes

---

#### 3.4 Add API Client Methods (Day 13 Afternoon)
**Owner:** Frontend Developer
**Estimated Time:** 1 hour

**File:** `apps/web/src/lib/api/integrations.ts`

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
  avg_records_per_sync: number;
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

**Deliverable:**
- Type-safe API client methods
- Unit tests

---

#### 3.5 Full Regression Testing (Day 14-15)
**Owner:** QA + Team
**Estimated Time:** 2 days

**Test Matrix:**

| Category | Feature | Test Scenario | Priority | Status |
|----------|---------|---------------|----------|--------|
| **Real APIs** | Samsara | Create integration, test connection, sync data | P0 | ⬜ |
| | Truckbase | Create integration with secret, sync loads | P0 | ⬜ |
| | Fuel Finder | Query fuel stations by location | P1 | ⬜ |
| | OpenWeather | Query weather by coordinates | P1 | ⬜ |
| **Retry Logic** | Network failures | Simulate network error, verify 3 retries | P0 | ⬜ |
| | Rate limits | Simulate 429, verify backoff | P0 | ⬜ |
| | Non-retryable | Simulate 401, verify no retry | P1 | ⬜ |
| **Circuit Breaker** | Open circuit | 5 failures → circuit opens | P1 | ⬜ |
| | Half-open | After timeout, allows test request | P1 | ⬜ |
| | Close circuit | 2 successes → circuit closes | P1 | ⬜ |
| **Alerting** | Email | 3 failures → email sent | P0 | ⬜ |
| | Slack (optional) | Alert posted to Slack | P2 | ⬜ |
| | Recipients | Only admins receive alerts | P1 | ⬜ |
| **Sync History** | Display logs | Shows last 50 syncs | P0 | ⬜ |
| | Stats | Success rate calculated correctly | P1 | ⬜ |
| | Pagination | Load more button works | P2 | ⬜ |
| **Performance** | API response | < 2s (p95) | P0 | ⬜ |
| | Sync time | 10 drivers < 5s | P0 | ⬜ |
| | UI load | < 1s | P1 | ⬜ |
| **Security** | Encryption | API keys encrypted in DB | P0 | ⬜ |
| | Tenant isolation | Can't access other tenant's integrations | P0 | ⬜ |
| | RBAC | Drivers can't access integrations page | P0 | ⬜ |
| **UX** | Dark theme | All components work in dark mode | P1 | ⬜ |
| | Mobile | Responsive on 375px width | P1 | ⬜ |
| | Error messages | Clear, actionable errors | P1 | ⬜ |

**Load Testing:**
```bash
# Install k6
brew install k6

# Run load test
k6 run tests/load/integrations.js
```

**Load Test Script:**
```javascript
// tests/load/integrations.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 10 },  // Ramp up to 10 users
    { duration: '3m', target: 10 },  // Stay at 10 users
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests < 2s
  },
};

export default function () {
  const token = 'your-jwt-token';

  // List integrations
  let res = http.get('http://localhost:8000/api/v1/integrations', {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(1);
}
```

**Deliverable:**
- Test report with all scenarios
- Performance benchmark results
- Bug list (if any)
- Load test results
- Sign-off from QA lead

---

## Deliverables & Success Criteria

### Week 1 Deliverables
- ✅ Real API credentials obtained and documented
- ✅ All 4 adapters using real APIs (Samsara, Truckbase, Fuel Finder, OpenWeather)
- ✅ End-to-end testing passed (5 scenarios)
- ✅ Performance benchmarks met
- ✅ Documentation updated

### Week 2 Deliverables
- ✅ Retry service with exponential backoff + jitter
- ✅ Circuit breaker service
- ✅ Email alerting working
- ✅ Slack alerting (optional)
- ✅ Integration tests passing (>80% coverage)
- ✅ Alert configuration documented

### Week 3 Deliverables
- ✅ Sync history API endpoint
- ✅ Sync stats API endpoint
- ✅ Sync history UI component
- ✅ Integrated into settings page
- ✅ Full regression testing complete
- ✅ QA sign-off

---

## Success Metrics

### Technical Metrics (Week 3 Testing)
- **API Success Rate:** > 99.5%
- **Average Response Time:** < 2 seconds (p95)
- **Cache Hit Rate:** > 80%
- **Retry Success Rate:** > 50% of retries succeed
- **Circuit Breaker Uptime:** > 99%
- **Sync Completion:** < 5 seconds for 10 drivers

### User Experience Metrics
- **Test Connection Success:** > 95% on first try
- **UI Load Time:** < 1 second
- **Mobile Usability:** Zero critical UX issues
- **Dark Theme:** Zero visual bugs

### Business Metrics (Track Post-Launch)
- **Integrations Created:** Track # per tenant
- **Active Syncs:** Track # of active background syncs
- **Manual Override Rate:** < 5% (means APIs are reliable)
- **Support Tickets:** < 10% related to integrations

---

## Risk Management

### Risk 1: API Credentials Delayed
**Probability:** Medium
**Impact:** High (blocks Week 1)
**Mitigation:**
- Start credential acquisition on Day 1
- Use sandbox accounts if production delayed
- Keep mock mode as fallback for testing

### Risk 2: API Rate Limits Hit During Testing
**Probability:** Medium
**Impact:** Medium
**Mitigation:**
- Monitor API usage closely during testing
- Use circuit breakers to prevent cascading calls
- Implement rate limiting in code

### Risk 3: Adapter Bugs with Real APIs
**Probability:** High
**Impact:** Medium
**Mitigation:**
- Thorough testing in dev environment
- Enable 1 adapter at a time
- Keep circuit breakers active
- Have rollback plan (revert to mock mode)

### Risk 4: Timeline Slippage
**Probability:** Medium
**Impact:** Low
**Mitigation:**
- Daily standups to track progress
- Focus on P0 features first (drop P2 if needed)
- Slack alerting is optional (can be deferred)

---

## Team Allocation

### Backend Developer (Full-time, 3 weeks)
- **Week 1:** Enable real APIs (5 days)
- **Week 2:** Retry logic + circuit breaker + alerting (5 days)
- **Week 3:** Sync history API + support QA (5 days)

### Frontend Developer (Part-time, Week 3)
- **Week 3:** Sync history UI (3 days)

### QA Engineer (Part-time)
- **Week 1 (Day 4-5):** E2E testing (2 days)
- **Week 3 (Day 14-15):** Full regression (2 days)

### DevOps Engineer (As needed)
- **Week 1 (Day 1):** Environment setup (0.5 day)
- **Week 2 (Day 9):** Email/Slack setup (0.5 day)
- **Week 3 (Day 15):** Production deployment prep (0.5 day)

---

## Post-Phase 2 Roadmap

### Phase 3 (Month 2-3) - Future Enhancements
- Webhook support for real-time updates
- Rate limiting service
- Connection health dashboard
- Enable additional vendors (KeepTruckin, McLeod)

### Phase 4 (Month 4+) - Advanced Features
- Field mapping UI
- OAuth2 flows
- Redis caching (replace database cache)
- Advanced analytics

---

## Day 1 Action Items

### Morning (9:00 AM - 12:00 PM)

**1. Team Kickoff Meeting (30 min)**
- Review this plan with entire team
- Assign owners for each task
- Set up daily standup time (suggest 9:30 AM)
- Create team Slack channel (#integrations-phase2)

**2. Start Credential Acquisition (2 hours)**
- Backend developer signs up for all 4 vendor accounts
- Document API key formats and rate limits
- Store credentials in secure location
- Create credentials tracking doc

**3. Environment Setup (1 hour)**
- DevOps adds environment variables to .env
- Test email delivery (send test email)
- Document setup steps

### Afternoon (1:00 PM - 5:00 PM)

**4. Create Project Board (1 hour)**
- Create Jira/Linear project
- Add all tasks from this plan as tickets
- Set up Week 1 sprint
- Assign tickets to team members

**5. Begin Week 1, Day 1 Tasks (3 hours)**
- Backend developer starts on Task 1.3 (Enable Samsara)
- Read Samsara API documentation
- Test API calls in Postman
- Begin code changes

**6. End of Day Standup (30 min)**
- Share progress
- Identify any blockers
- Plan for Day 2

---

## Getting Started

**Ready to begin?** Here's your checklist:

- [ ] Review this plan with team
- [ ] Assign task owners
- [ ] Schedule daily standups
- [ ] Create Slack channel
- [ ] Set up project board (Jira/Linear)
- [ ] Start credential acquisition
- [ ] Set up environment variables
- [ ] Begin Day 1 tasks

**Questions before starting?**
- Review with tech lead
- Adjust timeline if needed
- Get buy-in from stakeholders

---

## Contact & Support

**Plan Owner:** [Your Name]
**Last Updated:** January 30, 2026
**Next Review:** End of Week 1

For questions or issues during implementation, contact the project lead.

**Let's ship Phase 2!** 🚀
