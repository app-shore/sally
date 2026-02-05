# Phase 2 Implementation Guide: Backend Integration Services

**Start Date:** TBD
**Prerequisite:** Phase 1 complete (UI foundation implemented)
**Estimated Effort:** 1-2 weeks

---

## Quick Start

Phase 1 built the UI. Phase 2 makes it functional by implementing backend services.

**Goal:** Make the "Test Connection" button in Settings > Connections actually connect to Samsara.

---

## Step 1: Run Database Migration

The Prisma schema was updated in Phase 1 but migration was not run.

```bash
cd apps/backend

# Generate migration
npx prisma migrate dev --name add_integration_models

# Verify migration applied
npx prisma studio
# Check for: integration_configs, integration_sync_logs tables
# Verify drivers table has new fields: external_driver_id, hos_data, etc.

# Generate Prisma Client with new types
npx prisma generate
```

**Expected Output:**
- ✅ New tables created
- ✅ Driver table altered with sync fields
- ✅ Enums created (IntegrationType, IntegrationVendor, IntegrationStatus)

---

## Step 2: Backend Directory Structure

Create the following services:

```
apps/backend/src/
├── services/
│   ├── integration-manager/
│   │   ├── integration-manager.service.ts  (Core orchestrator)
│   │   ├── integration-scheduler.service.ts (Cron jobs)
│   │   └── integration-manager.module.ts
│   │
│   ├── adapters/
│   │   ├── base-adapter.interface.ts       (Contract for all adapters)
│   │   ├── hos/
│   │   │   ├── hos-adapter.interface.ts
│   │   │   ├── samsara-hos.adapter.ts      (PRIORITY: Implement first)
│   │   │   └── mock-hos.adapter.ts         (For testing)
│   │   │
│   │   ├── tms/
│   │   │   ├── tms-adapter.interface.ts
│   │   │   └── mcleod-tms.adapter.ts       (Phase 3)
│   │   │
│   │   └── fuel/
│   │       ├── fuel-adapter.interface.ts
│   │       └── gasbuddy-fuel.adapter.ts    (Phase 3)
│   │
│   └── credentials/
│       └── credentials.service.ts          (Encrypt/decrypt credentials)
│
└── api/
    └── integrations/
        ├── integrations.controller.ts      (REST endpoints)
        ├── integrations.service.ts         (Business logic)
        ├── integrations.module.ts
        └── dto/
            ├── create-integration.dto.ts
            ├── update-integration.dto.ts
            └── test-connection.dto.ts
```

---

## Step 3: Implement Core Services (Priority Order)

### 3.1 Credentials Service (Security First)

**File:** `apps/backend/src/services/credentials/credentials.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CredentialsService {
  private readonly encryptionKey: Buffer;

  constructor() {
    const key = process.env.CREDENTIALS_ENCRYPTION_KEY;
    if (!key) {
      throw new Error('CREDENTIALS_ENCRYPTION_KEY not set in environment');
    }
    this.encryptionKey = Buffer.from(key, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  decrypt(ciphertext: string): string {
    const [ivHex, encryptedHex] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
```

**Environment Setup:**
```bash
# Generate encryption key (run once)
openssl rand -hex 32

# Add to .env
CREDENTIALS_ENCRYPTION_KEY="<generated-key>"
```

---

### 3.2 Samsara HOS Adapter

**File:** `apps/backend/src/services/adapters/hos/samsara-hos.adapter.ts`

```typescript
import { Injectable } from '@nestjs/common';

export interface HOSData {
  driver_id: string;
  hours_driven: number;
  on_duty_time: number;
  hours_since_break: number;
  duty_status: 'OFF_DUTY' | 'SLEEPER_BERTH' | 'DRIVING' | 'ON_DUTY_NOT_DRIVING';
  last_updated: string;
  data_source: string;
}

@Injectable()
export class SamsaraHOSAdapter {
  private readonly baseUrl = 'https://api.samsara.com';

  async getDriverHOS(apiKey: string, driverId: string): Promise<HOSData> {
    const response = await fetch(
      `${this.baseUrl}/v1/fleet/drivers/${driverId}/hos_logs`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Samsara API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Transform Samsara format → SALLY standard format
    return {
      driver_id: driverId,
      hours_driven: data.driveMilliseconds / (1000 * 60 * 60),
      on_duty_time: data.onDutyMilliseconds / (1000 * 60 * 60),
      hours_since_break: data.timeSinceLastBreakMilliseconds / (1000 * 60 * 60),
      duty_status: this.mapDutyStatus(data.dutyStatus),
      last_updated: data.lastUpdatedTime,
      data_source: 'samsara_eld',
    };
  }

  async testConnection(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/fleet/drivers`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private mapDutyStatus(samsaraStatus: string): HOSData['duty_status'] {
    const mapping: Record<string, HOSData['duty_status']> = {
      off_duty: 'OFF_DUTY',
      sleeper_berth: 'SLEEPER_BERTH',
      driving: 'DRIVING',
      on_duty_not_driving: 'ON_DUTY_NOT_DRIVING',
    };
    return mapping[samsaraStatus] || 'OFF_DUTY';
  }
}
```

---

### 3.3 Integration Manager Service

**File:** `apps/backend/src/services/integration-manager/integration-manager.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CredentialsService } from '../credentials/credentials.service';
import { SamsaraHOSAdapter, HOSData } from '../adapters/hos/samsara-hos.adapter';

@Injectable()
export class IntegrationManagerService {
  constructor(
    private prisma: PrismaService,
    private credentials: CredentialsService,
    private samsaraAdapter: SamsaraHOSAdapter
  ) {}

  /**
   * Fetch driver HOS (with cache fallback)
   * 1. Check manual override → return override
   * 2. Check cache age → return if fresh (<5min)
   * 3. Fetch from ELD → update cache
   * 4. Handle errors → fall back to stale cache
   */
  async getDriverHOS(tenantId: number, driverId: string): Promise<HOSData> {
    const driver = await this.prisma.driver.findFirst({
      where: { driverId, tenantId },
    });

    if (!driver) {
      throw new Error(`Driver ${driverId} not found`);
    }

    // 1. Manual override takes precedence
    if (driver.hosManualOverride && driver.hosData) {
      return {
        ...(driver.hosData as any),
        data_source: 'manual_override',
      };
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

    // 3. Fetch from ELD
    try {
      const integration = await this.prisma.integrationConfig.findFirst({
        where: {
          tenantId,
          integrationType: 'HOS_ELD',
          status: 'ACTIVE',
        },
      });

      if (!integration) {
        throw new Error('No active HOS integration configured');
      }

      const apiKey = this.credentials.decrypt(
        (integration.credentials as any).apiKey
      );

      const hosData = await this.samsaraAdapter.getDriverHOS(
        apiKey,
        driver.externalDriverId || driverId
      );

      // Update cache
      await this.prisma.driver.update({
        where: { id: driver.id },
        data: {
          hosData: hosData as any,
          hosDataSyncedAt: new Date(),
          hosDataSource: 'samsara_eld',
        },
      });

      return hosData;
    } catch (error) {
      // 4. Fall back to stale cache
      if (driver.hosData) {
        return {
          ...(driver.hosData as any),
          cached: true,
          stale: true,
          error: error.message,
        };
      }
      throw error;
    }
  }

  /**
   * Test connection to external system
   */
  async testConnection(integrationId: string): Promise<boolean> {
    const integration = await this.prisma.integrationConfig.findUnique({
      where: { integrationId },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    if (integration.vendor === 'SAMSARA_ELD' || integration.vendor === 'MOCK_SAMSARA') {
      const apiKey = this.credentials.decrypt(
        (integration.credentials as any).apiKey
      );
      return await this.samsaraAdapter.testConnection(apiKey);
    }

    return false;
  }
}
```

---

### 3.4 Integrations Controller (REST API)

**File:** `apps/backend/src/api/integrations/integrations.controller.ts`

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IntegrationsService } from './integrations.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';

@Controller('api/v1/integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(private integrationsService: IntegrationsService) {}

  @Get()
  async listIntegrations(@Req() req) {
    return this.integrationsService.listIntegrations(req.user.tenantId);
  }

  @Get(':integrationId')
  async getIntegration(@Param('integrationId') integrationId: string) {
    return this.integrationsService.getIntegration(integrationId);
  }

  @Post()
  async createIntegration(@Body() dto: CreateIntegrationDto, @Req() req) {
    return this.integrationsService.createIntegration(req.user.tenantId, dto);
  }

  @Post(':integrationId/test')
  async testConnection(@Param('integrationId') integrationId: string) {
    const success = await this.integrationsService.testConnection(integrationId);
    return {
      success,
      message: success
        ? 'Connection successful'
        : 'Connection failed - check credentials',
    };
  }

  @Post(':integrationId/sync')
  async triggerSync(@Param('integrationId') integrationId: string) {
    return this.integrationsService.triggerSync(integrationId);
  }

  @Delete(':integrationId')
  async deleteIntegration(@Param('integrationId') integrationId: string) {
    return this.integrationsService.deleteIntegration(integrationId);
  }
}
```

---

### 3.5 Background Sync Scheduler

**File:** `apps/backend/src/services/integration-manager/integration-scheduler.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationManagerService } from './integration-manager.service';

@Injectable()
export class IntegrationSchedulerService {
  constructor(
    private prisma: PrismaService,
    private integrationManager: IntegrationManagerService
  ) {}

  /**
   * Sync HOS data every 5 minutes for all active drivers
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncHOSData() {
    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
    });

    for (const tenant of tenants) {
      try {
        await this.syncTenantHOS(tenant.id);
      } catch (error) {
        console.error(`Failed to sync HOS for tenant ${tenant.id}:`, error);
      }
    }
  }

  private async syncTenantHOS(tenantId: number) {
    const drivers = await this.prisma.driver.findMany({
      where: {
        tenantId,
        isActive: true,
        hosManualOverride: false, // Skip manually overridden drivers
      },
    });

    for (const driver of drivers) {
      try {
        await this.integrationManager.getDriverHOS(tenantId, driver.driverId);
      } catch (error) {
        console.error(`Failed to sync HOS for driver ${driver.driverId}:`, error);
      }
    }
  }
}
```

---

## Step 4: Frontend Changes

### 4.1 Remove Mock Data from ConnectionsTab

**File:** `apps/web/src/components/settings/ConnectionsTab.tsx`

Replace this:
```typescript
const mockIntegrations = getMockIntegrations();
setIntegrations(mockIntegrations);
```

With this:
```typescript
const data = await listIntegrations();
setIntegrations(data);
```

### 4.2 Auto-Fetch HOS in Route Planning

**File:** `apps/web/src/app/dispatcher/create-plan/page.tsx`

Add this when driver is selected:
```typescript
const handleDriverSelect = async (driverId: string) => {
  setSelectedDriver(driverId);

  try {
    // Auto-fetch live HOS data
    const hosData = await getDriverHOS(driverId);
    setDriverState({
      hours_driven: hosData.hours_driven,
      on_duty_time: hosData.on_duty_time,
      hours_since_break: hosData.hours_since_break,
    });

    // Show data source badge
    setHosDataSource({
      source: hosData.data_source,
      synced_at: hosData.last_updated,
    });
  } catch (error) {
    // Fall back to manual entry
    console.warn('Could not fetch HOS, using manual entry:', error);
  }
};
```

---

## Step 5: Testing Phase 2

### 5.1 Samsara Sandbox Setup

1. Sign up for Samsara developer account: https://developers.samsara.com
2. Create sandbox organization
3. Generate API key
4. Add test driver to sandbox

### 5.2 Integration Test Flow

**Test 1: Configure Integration**
```bash
POST /api/v1/integrations
{
  "integration_type": "HOS_ELD",
  "vendor": "SAMSARA_ELD",
  "display_name": "Samsara ELD",
  "credentials": {
    "apiKey": "samsara_api_key_here"
  },
  "sync_interval_seconds": 300
}

Expected: 201 Created, integration_id returned
```

**Test 2: Test Connection**
```bash
POST /api/v1/integrations/{integration_id}/test

Expected: { "success": true, "message": "Connection successful" }
```

**Test 3: Auto-Sync Verification**
```bash
# Wait 5 minutes for cron job
GET /api/v1/drivers

Expected: drivers have hos_data_synced_at updated
```

**Test 4: Route Planning Auto-Fetch**
```bash
# In UI: Create new route plan
# Select driver from dropdown
# Verify HOS fields auto-populate
# Verify badge shows "Samsara ELD • Just now"
```

---

## Step 6: Error Handling & Edge Cases

### Circuit Breaker Pattern
Add retry logic with exponential backoff:
```typescript
async fetchWithRetry(fn: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * Math.pow(2, i)); // 1s, 2s, 4s
    }
  }
}
```

### Graceful Degradation
- API down → Use cached data (show warning)
- Cache stale (>10min) → Show warning, allow manual override
- No integration configured → Prompt user to set up

---

## Success Criteria (Phase 2)

- [ ] Can configure real Samsara integration via UI
- [ ] Test connection button validates API key
- [ ] Background sync runs every 5 minutes
- [ ] Driver HOS auto-populates in route planning
- [ ] System works offline using cached data
- [ ] Manual override prevents auto-sync
- [ ] Sync history shows in integration details
- [ ] Error messages are actionable ("API key expired. Reconnect.")

---

## Production Deployment Checklist

- [ ] Generate new encryption key for production
- [ ] Store encryption key in AWS Secrets Manager (not .env)
- [ ] Enable HTTPS for all API calls
- [ ] Rate limit integration endpoints (10 req/min per tenant)
- [ ] Set up monitoring for sync failures
- [ ] Add alerts for stale cache (>1 hour)
- [ ] Backup encrypted credentials separately
- [ ] Document credential rotation procedure

---

## Estimated Timeline

**Week 1:**
- Day 1-2: Database migration, credentials service, Samsara adapter
- Day 3-4: IntegrationManager service, API endpoints
- Day 5: Frontend integration (remove mocks, auto-fetch HOS)

**Week 2:**
- Day 1-2: Background scheduler, sync jobs
- Day 3-4: Testing with Samsara sandbox
- Day 5: Error handling, circuit breakers, edge cases

**Total:** 8-10 developer days (1.5-2 weeks)

---

## Support & Questions

Refer to:
- `.specs/INTEGRATION_STRATEGY.md` - Original strategy document
- `.specs/INTEGRATION_IMPLEMENTATION_SUMMARY.md` - Phase 1 summary
- Samsara API docs: https://developers.samsara.com/docs

For architecture questions, review "Part 4: Backend Service Architecture" in the strategy doc.
