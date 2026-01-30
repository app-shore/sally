# Integration Strategy for SALLY: Apple-Style Simple & Scalable

**Plan Created:** 2026-01-29
**Product Context:** SALLY is a dispatch & driver coordination platform, not just a route planner
**Design Philosophy:** Apple-level simplicity - make complex integrations feel effortless

---

## Executive Summary

Design a **configuration-driven integration architecture** that allows SALLY to connect with multiple external systems (TMS, ELD, Fuel APIs, Weather, Telematics) while maintaining:

1. **Apple-style UX simplicity** - Complex integrations hidden behind clean, intuitive UI
2. **Multi-tenant isolation** - Each customer configures their own vendor stack
3. **Sync & Cache pattern** - Fast route planning, graceful degradation when APIs fail
4. **Progressive disclosure** - Advanced settings tucked away, common flows obvious
5. **Future extensibility** - Easy to add new integrations without architectural changes

**Key Insight:** SALLY users don't care about "integration architecture" - they care about "does my driver HOS data show up automatically?" The architecture must be sophisticated, but the UX must be dead simple.

---

## Part 1: Recommended Architecture Pattern

### **Hub-and-Spoke with Sync & Cache (The Right Way)**

```
┌────────────────────────────────────────────────────────────┐
│                  SALLY Integration Hub                      │
│                                                             │
│  Background Sync Jobs (every 5-15min)                      │
│  ├─ Fetch driver HOS from Samsara                          │
│  ├─ Fetch vehicle list from TMS                            │
│  ├─ Fetch fuel prices from GasBuddy                        │
│  └─ Store in local cache (with TTL + data provenance)      │
│                                                             │
│  Route Planning Engine (reads from cache)                  │
│  └─ No blocking API calls = sub-second response            │
│                                                             │
│  Manual Refresh (on-demand)                                │
│  └─ Dispatcher clicks "Refresh HOS" → immediate fetch      │
└────────────────────────────────────────────────────────────┘
           ↓ Background sync                 ↑ On-demand
    External APIs (Samsara, McLeod, etc.)
```

**Why This Pattern?**
- **Performance:** Route planning takes <2s (no waiting for 5 API calls)
- **Reliability:** Works offline if APIs are down (uses cached data)
- **Cost:** Minimize API calls to rate-limited services
- **Transparency:** Always show data source + freshness ("Samsara ELD, 2min ago")
- **Flexibility:** Dispatcher can override incorrect data from external systems

**What We DON'T Do (Anti-Patterns):**
- ❌ Pass-through: Every route plan = 5+ external API calls (too slow, fragile)
- ❌ Manual-only: No sync, dispatcher types everything (defeats automation)
- ❌ Sync & lock: Can't override bad TMS data (too rigid)

---

## Part 2: Apple-Style UX Design

### **Settings Page Redesign: 3 Tabs**

**BEFORE (Current - Wrong):**
```
Settings
├─ Drivers Tab (CRUD for drivers)
├─ Vehicles Tab (CRUD for vehicles)
└─ Loads Tab (coming soon)
```
*Problem: Where do I configure Samsara? Where do I test connections?*

**AFTER (Apple Way - Right):**
```
Settings
├─ 🔗 Connections Tab ⭐ NEW - THE STAR
│   (Manage external system integrations)
│
├─ 👥 Fleet Tab ⭐ RENAMED
│   ├─ Drivers (view synced data, manual add/override)
│   ├─ Vehicles (view synced data, manual add/override)
│   └─ Loads (view synced loads)
│
└─ ⚙️ Preferences Tab ⭐ NEW
    (HOS rules, optimization defaults, alerts)
```

### **Connections Tab: The Apple Card Experience**

**Design Inspiration: Apple Wallet, iPhone Settings > Accounts**

```
┌──────────────────────────────────────────────────────────────┐
│  Connections                                  [+ Add New]     │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ 📋 Hours of Service (ELD)                             ┃  │
│  ┃                                                         ┃  │
│  ┃ ● Samsara                          [Configure] [Test] ┃  │
│  ┃ Last synced 2 minutes ago                             ┃  │
│  ┃ ✓ 8 drivers synced                                    ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                               │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ 🚛 Transportation Management System                   ┃  │
│  ┃                                                         ┃  │
│  ┃ ⚪ Not Connected                    [Connect]          ┃  │
│  ┃ Connect McLeod to sync loads and assignments          ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                               │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ ⛽ Fuel Prices                                         ┃  │
│  ┃                                                         ┃  │
│  ┃ ⚠️ Error                           [Fix] [Details]    ┃  │
│  ┃ API key expired. Tap Fix to reconnect.                ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                               │
│  [View All →]                                                 │
└──────────────────────────────────────────────────────────────┘
```

**Key UX Principles:**
1. **Status at a glance** - Color-coded dots (● = connected, ⚪ = not configured, ⚠️ = error)
2. **Progressive actions** - [Connect] → [Configure] → [Test] → [Details]
3. **Human-readable status** - "2 minutes ago", not "2026-01-29T10:35:22Z"
4. **Contextual help** - "Connect McLeod to sync loads..." explains WHY
5. **No jargon** - "Hours of Service" not "ELD Integration Config"

### **Configure Connection Modal: Wizard Style**

**Step 1: Choose Vendor**
```
┌────────────────────────────────────────────────────────┐
│  Choose Your ELD Provider                              │
├────────────────────────────────────────────────────────┤
│                                                         │
│  Popular:                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │  [Samsara]   │  │ [KeepTruckin]│  │  [Motive]    ││
│  │   Logo       │  │    Logo      │  │    Logo      ││
│  └──────────────┘  └──────────────┘  └──────────────┘│
│                                                         │
│  Other:                                                │
│  [See all providers ▼]                                │
│                                                         │
│  Don't see yours? [Request integration →]             │
└────────────────────────────────────────────────────────┘
```

**Step 2: Authenticate (OAuth Flow)**
```
┌────────────────────────────────────────────────────────┐
│  Connect to Samsara                                    │
├────────────────────────────────────────────────────────┤
│                                                         │
│  SALLY needs permission to read:                       │
│  ✓ Driver hours of service data                       │
│  ✓ Vehicle location and fuel levels                   │
│                                                         │
│  [Continue with Samsara →]                            │
│                                                         │
│  ────────────────────────────────────────────────────  │
│                                                         │
│  Advanced: Use API Key Instead                         │
│  [Enter API Key Manually ↓]                           │
└────────────────────────────────────────────────────────┘
```

**Step 3: Configure Sync Settings**
```
┌────────────────────────────────────────────────────────┐
│  Sync Settings                                         │
├────────────────────────────────────────────────────────┤
│                                                         │
│  How often should SALLY check for updates?            │
│                                                         │
│  Driver HOS Data:                                      │
│  ⦿ Every 5 minutes (Recommended)                      │
│  ◯ Every 15 minutes                                    │
│  ◯ Manual only                                         │
│                                                         │
│  Vehicle List:                                         │
│  ◯ Every 15 minutes                                    │
│  ⦿ Every hour (Recommended)                           │
│  ◯ Daily                                               │
│                                                         │
│  [Advanced Settings ↓]                                │
│                                                         │
│              [Cancel]  [Test Connection]  [Save]      │
└────────────────────────────────────────────────────────┘
```

**Step 4: Test & Confirm**
```
┌────────────────────────────────────────────────────────┐
│  Testing Connection...                                 │
├────────────────────────────────────────────────────────┤
│                                                         │
│  ✓ Connected to Samsara successfully                  │
│  ✓ Found 8 active drivers                             │
│  ✓ Retrieved HOS data for all drivers                 │
│                                                         │
│  [View Details →]                                     │
│                                                         │
│              [Back]           [Finish Setup]          │
└────────────────────────────────────────────────────────┘
```

**Apple Principles Applied:**
- ✅ **No "Submit" buttons** - Actions are verbs ("Continue", "Test Connection", "Finish Setup")
- ✅ **Progress breadcrumbs** - User always knows where they are
- ✅ **Smart defaults** - Pre-select recommended options
- ✅ **Progressive disclosure** - "Advanced Settings" collapsed by default
- ✅ **Instant validation** - Test connection before saving
- ✅ **Celebration** - Green checkmarks when successful

### **Fleet Tab: Data Provenance Badges**

**Drivers View (Enhanced with Sync Info)**
```
┌──────────────────────────────────────────────────────────┐
│  Drivers                        [🔄 Sync All]  [+ Add]   │
├──────────────────────────────────────────────────────────┤
│  Name           License    Source        Last Synced     │
│  ────────────────────────────────────────────────────────│
│  John Smith     CA123456   🔗 Samsara    2m ago  [→]    │
│  Jane Doe       TX987654   🔗 Samsara    2m ago  [→]    │
│  Mike Wilson    FL555444   ✋ Manual     Never    [→]    │
│                           (not in Samsara)               │
└──────────────────────────────────────────────────────────┘

Click row → Slide-in panel (iPhone-style):

┌────────────────────────────────────────────────────────┐
│  John Smith                                    [✕]     │
├────────────────────────────────────────────────────────┤
│                                                         │
│  Driver Details                                        │
│  Name: John Smith                                      │
│  License: CA123456                                     │
│  Phone: 555-0100                                       │
│                                                         │
│  ──────────────────────────────────────────────────────│
│                                                         │
│  Hours of Service (Live)        🔗 Samsara • 2m ago   │
│                                             [Refresh]  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Drive:  ████████████░░░░░░░░ 8.5h / 11h     🟡      │
│  Duty:   ███████████████░░░░░ 11.2h / 14h    🟡      │
│  Break:  ███████████████████░ 7.8h / 8h      🟥      │
│  Status: On Duty - Driving                            │
│                                                         │
│  ⚠️ Manual Override Active                            │
│  Overridden by dispatcher_john at 10:15 AM            │
│  Reason: Driver reported incorrect ELD reading         │
│                                             [Clear]    │
│                                                         │
│              [Edit Details]              [Close]      │
└────────────────────────────────────────────────────────┘
```

**Apple Principles:**
- ✅ **Slide-in panels** - No jarring modal popups
- ✅ **Visual status** - Progress bars + color indicators
- ✅ **Contextual actions** - [Refresh] button right next to stale data
- ✅ **Clear warnings** - Override status is obvious but not alarming
- ✅ **One-tap actions** - [Clear] to remove override

---

## Part 3: Database Schema Changes

### **New Models for Integration Configuration**

```prisma
// Integration Configuration
model IntegrationConfig {
  id                    Int                  @id @default(autoincrement())
  integrationId         String               @unique @map("integration_id")

  tenant                Tenant               @relation(fields: [tenantId], references: [id])
  tenantId              Int                  @map("tenant_id")

  integrationType       IntegrationType      @map("integration_type")
  vendor                IntegrationVendor
  displayName           String               @map("display_name")
  isEnabled             Boolean              @default(false) @map("is_enabled")
  status                IntegrationStatus    @default(NOT_CONFIGURED)

  // Encrypted credentials
  credentials           Json?                // AES-256 encrypted

  // Sync settings
  syncIntervalSeconds   Int?                 @map("sync_interval_seconds")

  // Health monitoring
  lastSyncAt            DateTime?            @map("last_sync_at")
  lastSuccessAt         DateTime?            @map("last_success_at")
  lastErrorAt           DateTime?            @map("last_error_at")
  lastErrorMessage      String?              @map("last_error_message")

  createdAt             DateTime             @default(now()) @map("created_at")
  updatedAt             DateTime             @updatedAt @map("updated_at")

  syncLogs              IntegrationSyncLog[]

  @@unique([tenantId, integrationType, vendor])
  @@map("integration_configs")
}

enum IntegrationType {
  TMS
  HOS_ELD
  FUEL_PRICE
  WEATHER
  TELEMATICS
}

enum IntegrationVendor {
  MCLEOD_TMS
  TMW_TMS
  SAMSARA_ELD
  KEEPTRUCKIN_ELD
  GASBUDDY_FUEL
  OPENWEATHER
}

enum IntegrationStatus {
  NOT_CONFIGURED
  CONFIGURED
  ACTIVE
  ERROR
  DISABLED
}

// Sync logs for troubleshooting
model IntegrationSyncLog {
  id                    Int                  @id @default(autoincrement())
  logId                 String               @unique @map("log_id")

  integration           IntegrationConfig    @relation(fields: [integrationId], references: [id])
  integrationId         Int                  @map("integration_id")

  syncType              String               @map("sync_type")  // 'scheduled', 'manual'
  startedAt             DateTime             @map("started_at")
  completedAt           DateTime?            @map("completed_at")

  status                String               // 'success', 'partial', 'failed'
  recordsProcessed      Int                  @default(0) @map("records_processed")
  recordsCreated        Int                  @default(0) @map("records_created")
  recordsUpdated        Int                  @default(0) @map("records_updated")

  errorDetails          Json?                @map("error_details")

  createdAt             DateTime             @default(now()) @map("created_at")

  @@index([integrationId, startedAt])
  @@map("integration_sync_logs")
}
```

### **Enhanced Driver Model (with External Sync Fields)**

```prisma
model Driver {
  id                    Int          @id @default(autoincrement())
  driverId              String       @unique @map("driver_id")
  name                  String
  licenseNumber         String?      @map("license_number")
  phone                 String?
  email                 String?
  isActive              Boolean      @default(true) @map("is_active")

  // External system linkage
  externalDriverId      String?      @map("external_driver_id")  // TMS/ELD driver ID
  externalSource        String?      @map("external_source")      // 'samsara_eld', 'mcleod_tms'

  // Cached HOS data (from ELD)
  hosData               Json?        @map("hos_data")
  hosDataSyncedAt       DateTime?    @map("hos_data_synced_at")
  hosDataSource         String?      @map("hos_data_source")      // 'samsara_eld'

  // Manual override tracking
  hosManualOverride     Boolean      @default(false) @map("hos_manual_override")
  hosOverrideBy         String?      @map("hos_override_by")      // user_id
  hosOverrideAt         DateTime?    @map("hos_override_at")
  hosOverrideReason     String?      @map("hos_override_reason")

  lastSyncedAt          DateTime?    @map("last_synced_at")
  createdAt             DateTime     @default(now()) @map("created_at")
  updatedAt             DateTime     @updatedAt @map("updated_at")

  tenant                Tenant       @relation(fields: [tenantId], references: [id])
  tenantId              Int          @map("tenant_id")

  @@unique([externalDriverId, tenantId])
  @@map("drivers")
}
```

**Why These Fields?**
- `externalDriverId` - Links to Samsara driver ID (different from SALLY driver ID)
- `hosData` - Cached HOS state from last sync (JSON for vendor flexibility)
- `hosManualOverride` - Stops auto-sync when dispatcher overrides incorrect data
- `hosDataSource` - Shows "Samsara ELD" badge in UI

---

## Part 4: Backend Service Architecture

### **Integration Manager Service (Core Orchestrator)**

**File:** `apps/backend/src/services/integration-manager/integration-manager.service.ts`

**Key Methods:**

```typescript
class IntegrationManagerService {
  /**
   * Fetch driver HOS (with cache fallback)
   * 1. Check manual override → return override
   * 2. Check cache age → return if fresh (<5min)
   * 3. Fetch from ELD → update cache
   * 4. Handle errors → fall back to stale cache
   */
  async getDriverHOS(tenantId: number, driverId: string): Promise<HOSData>

  /**
   * Sync driver list from TMS
   * Background job runs every 15 minutes
   */
  async syncDrivers(tenantId: number): Promise<SyncResult>

  /**
   * Sync HOS data for all drivers
   * Background job runs every 5 minutes
   */
  async syncAllDriverHOS(tenantId: number): Promise<SyncResult>

  /**
   * Test connection to external system
   * Called when dispatcher clicks [Test Connection]
   */
  async testConnection(integrationId: string): Promise<boolean>
}
```

### **Adapter Pattern (Vendor-Specific Implementations)**

**File Structure:**
```
apps/backend/src/services/adapters/
├── base-adapter.interface.ts
├── hos/
│   ├── hos-adapter.interface.ts
│   ├── samsara-hos.adapter.ts
│   ├── keeptruckin-hos.adapter.ts
│   └── motive-hos.adapter.ts
├── tms/
│   ├── tms-adapter.interface.ts
│   ├── mcleod-tms.adapter.ts
│   └── tmw-tms.adapter.ts
└── fuel/
    ├── fuel-adapter.interface.ts
    └── gasbuddy-fuel.adapter.ts
```

**Example: Samsara HOS Adapter**
```typescript
export class SamsaraHOSAdapter implements HOSAdapter {
  async getDriverHOS(driverId: string): Promise<HOSData> {
    const response = await fetch(
      `${this.baseUrl}/v1/fleet/drivers/${driverId}/hos_logs`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } }
    );

    const data = await response.json();

    // Transform Samsara format → SALLY standard format
    return {
      driver_id: driverId,
      hours_driven: data.driveMilliseconds / (1000 * 60 * 60),
      on_duty_time: data.onDutyMilliseconds / (1000 * 60 * 60),
      hours_since_break: data.timeSinceLastBreakMilliseconds / (1000 * 60 * 60),
      duty_status: this.mapDutyStatus(data.dutyStatus),
      last_updated: data.lastUpdatedTime,
    };
  }
}
```

### **Background Sync Scheduler (Cron Jobs)**

**File:** `apps/backend/src/services/integration-manager/integration-scheduler.service.ts`

```typescript
@Injectable()
export class IntegrationSchedulerService {
  /**
   * Sync HOS data every 5 minutes for all active drivers
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncHOSData() {
    const tenants = await this.prisma.tenant.findMany({ where: { isActive: true } });

    for (const tenant of tenants) {
      await this.integrationManager.syncAllDriverHOS(tenant.id);
    }
  }

  /**
   * Sync driver list every 15 minutes
   */
  @Cron('0 */15 * * * *')  // Every 15 minutes
  async syncDriverLists() {
    const tenants = await this.prisma.tenant.findMany({ where: { isActive: true } });

    for (const tenant of tenants) {
      await this.integrationManager.syncDrivers(tenant.id);
    }
  }
}
```

---

## Part 5: Frontend Implementation

### **New API Client Module**

**File:** `apps/web/src/lib/api/integrations.ts`

```typescript
export interface IntegrationConfig {
  id: string;
  integration_type: 'TMS' | 'HOS_ELD' | 'FUEL_PRICE' | 'WEATHER';
  vendor: string;
  display_name: string;
  is_enabled: boolean;
  status: 'NOT_CONFIGURED' | 'CONFIGURED' | 'ACTIVE' | 'ERROR';
  last_sync_at?: string;
  last_error_message?: string;
}

export async function listIntegrations(): Promise<IntegrationConfig[]> {
  return apiClient.get('/integrations');
}

export async function createIntegration(data: CreateIntegrationRequest): Promise<IntegrationConfig> {
  return apiClient.post('/integrations', data);
}

export async function testConnection(integrationId: string): Promise<{ success: boolean; message: string }> {
  return apiClient.post(`/integrations/${integrationId}/test`);
}

export async function triggerSync(integrationId: string): Promise<{ success: boolean }> {
  return apiClient.post(`/integrations/${integrationId}/sync`);
}

export async function getSyncHistory(integrationId: string): Promise<SyncLog[]> {
  return apiClient.get(`/integrations/${integrationId}/sync-history`);
}
```

### **Settings Page Restructure**

**File:** `apps/web/src/app/settings/page.tsx`

**New Structure:**
```tsx
<Tabs defaultValue="connections">
  <TabsList>
    <TabsTrigger value="connections">🔗 Connections</TabsTrigger>
    <TabsTrigger value="fleet">👥 Fleet</TabsTrigger>
    <TabsTrigger value="preferences">⚙️ Preferences</TabsTrigger>
  </TabsList>

  <TabsContent value="connections">
    <ConnectionsTab />  {/* NEW - Integration cards */}
  </TabsContent>

  <TabsContent value="fleet">
    <FleetTabs>
      <DriversTab />  {/* EXISTING - Enhanced with sync badges */}
      <VehiclesTab /> {/* EXISTING - Enhanced with sync badges */}
      <LoadsTab />    {/* EXISTING - Coming soon */}
    </FleetTabs>
  </TabsContent>

  <TabsContent value="preferences">
    <PreferencesTab />  {/* NEW - HOS rules, optimization defaults */}
  </TabsContent>
</Tabs>
```

### **New Component: ConnectionsTab**

**File:** `apps/web/src/components/settings/ConnectionsTab.tsx`

```tsx
export function ConnectionsTab() {
  const { data: integrations, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: listIntegrations,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Connections</h2>
        <Button onClick={() => setShowAddDialog(true)}>
          + Add New
        </Button>
      </div>

      <div className="grid gap-4">
        {integrations?.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
          />
        ))}
      </div>
    </div>
  );
}
```

### **New Component: IntegrationCard (Apple-Style)**

**File:** `apps/web/src/components/settings/IntegrationCard.tsx`

```tsx
export function IntegrationCard({ integration }: { integration: IntegrationConfig }) {
  const statusIndicator = {
    ACTIVE: '● Connected',
    ERROR: '⚠️ Error',
    NOT_CONFIGURED: '⚪ Not Connected',
  }[integration.status];

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <IntegrationIcon type={integration.integration_type} />
              <div>
                <h3 className="font-semibold text-lg">
                  {getIntegrationTypeLabel(integration.integration_type)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {statusIndicator} {integration.vendor && `• ${integration.vendor}`}
                </p>
              </div>
            </div>

            {integration.status === 'ACTIVE' && (
              <div className="mt-3 text-sm text-muted-foreground">
                Last synced {formatRelativeTime(integration.last_sync_at)}
              </div>
            )}

            {integration.status === 'ERROR' && (
              <div className="mt-3 text-sm text-red-600">
                {integration.last_error_message}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleConfigure(integration)}
            >
              Configure
            </Button>
            {integration.status === 'ACTIVE' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleTest(integration)}
              >
                Test
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Part 6: Route Planning Integration

### **Auto-Fetch HOS During Route Planning**

**File:** `apps/backend/src/api/route-planning/route-planning.controller.ts`

**Enhancement:**
```typescript
@Post('optimize')
async optimizeRoute(@Body() body: RoutePlanningRequest) {
  // NEW: Auto-fetch driver HOS if not provided
  let driverState = body.driver_state;

  if (!driverState) {
    try {
      const hosData = await this.integrationManager.getDriverHOS(
        req.tenant.id,
        body.driver_id
      );

      driverState = {
        hours_driven: hosData.hours_driven,
        on_duty_time: hosData.on_duty_time,
        hours_since_break: hosData.hours_since_break,
      };

      this.logger.log(
        `Auto-fetched HOS for ${body.driver_id} from ${hosData.data_source} ` +
        `(cached: ${hosData.cached}, age: ${hosData.cache_age_seconds}s)`
      );
    } catch (error) {
      throw new HttpException(
        `Failed to fetch driver HOS: ${error.message}. ` +
        `Please check HOS integration or provide driver_state manually.`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // Proceed with route planning using fetched/provided HOS
  const result = await this.routePlanningEngine.planRoute({
    driver_state: driverState,
    vehicle_state: body.vehicle_state,
    stops: body.stops,
  });

  // Include data provenance in response
  return {
    ...result,
    data_sources: {
      hos: {
        source: hosData?.data_source || 'manual_input',
        synced_at: hosData?.synced_at,
        cached: hosData?.cached || false,
      },
    },
  };
}
```

**User Experience:**
```
BEFORE: Dispatcher manually enters HOS (error-prone, stale data)
AFTER: System auto-fetches live HOS from Samsara (fast, accurate, automatic)
```

---

## Part 7: Security & Compliance

### **Credential Encryption**

**File:** `apps/backend/src/services/credentials/credentials.service.ts`

```typescript
@Injectable()
export class CredentialsService {
  private readonly encryptionKey: string;

  constructor() {
    this.encryptionKey = process.env.CREDENTIALS_ENCRYPTION_KEY;

    if (!this.encryptionKey) {
      throw new Error('CREDENTIALS_ENCRYPTION_KEY not set');
    }
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(this.encryptionKey, 'hex'),
      iv
    );
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  decrypt(ciphertext: string): string {
    const [ivHex, encryptedHex] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(this.encryptionKey, 'hex'),
      iv
    );
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
```

**Environment Setup:**
```bash
# .env
CREDENTIALS_ENCRYPTION_KEY="64-char-hex-key-generated-using-openssl"

# Generate key:
openssl rand -hex 32
```

**Production: Use AWS Secrets Manager**
```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

async getCredentials(tenantId: number, integrationType: string) {
  const client = new SecretsManagerClient({ region: 'us-east-1' });
  const secretName = `sally/tenant-${tenantId}/${integrationType}/credentials`;

  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await client.send(command);

  return JSON.parse(response.SecretString);
}
```

---

## Part 8: MVP Scope & Implementation Order

### **Phase 1: Foundation (Week 1)**

**Backend:**
1. Add Prisma schema for `IntegrationConfig`, `IntegrationSyncLog`
2. Enhance `Driver` model with external sync fields
3. Create `IntegrationManagerService` (core methods)
4. Create mock Samsara HOS adapter (returns mock data)
5. Create integration CRUD endpoints (`POST /integrations`, `GET /integrations`, etc.)

**Frontend:**
6. Add new Settings tabs (Connections, Fleet, Preferences)
7. Build `ConnectionsTab` with integration cards
8. Build configure integration wizard (mock Samsara setup)
9. Enhance `DriversTab` with sync status badges

**Testing:**
- Can configure mock Samsara integration
- Can view sync status in Connections tab
- Drivers tab shows "Samsara ELD • 2m ago" badges

### **Phase 2: Real Integration (Week 2)**

**Backend:**
10. Implement real Samsara HOS adapter (OAuth flow)
11. Implement background sync scheduler (cron jobs)
12. Update route planning controller to auto-fetch HOS
13. Add circuit breaker + retry logic

**Frontend:**
14. Implement OAuth flow UI (redirect to Samsara)
15. Add refresh button in driver details panel
16. Show stale data warnings (HOS > 10min old)

**Testing:**
- Connect to real Samsara sandbox account
- Verify HOS syncs every 5 minutes
- Create route plan without manually entering HOS
- Test fallback to cached data when Samsara down

### **Phase 3: Expand Integrations (Week 3-4)**

**Backend:**
17. Implement McLeod TMS adapter (driver list, vehicle list)
18. Implement GasBuddy fuel adapter
19. Implement OpenWeather adapter

**Frontend:**
20. Add TMS, Fuel, Weather connection cards
21. Add combined sync history view
22. Add integration health dashboard

**Testing:**
- End-to-end: TMS syncs drivers → Samsara syncs HOS → Route plan uses both

---

## Part 9: Critical Files to Modify/Create

### **Backend (Priority Order)**

1. **`apps/backend/prisma/schema.prisma`**
   - Add `IntegrationConfig`, `IntegrationSyncLog` models
   - Enhance `Driver` model with sync fields

2. **`apps/backend/src/services/integration-manager/integration-manager.service.ts`** (NEW)
   - Core orchestration: fetch HOS, sync drivers, test connections

3. **`apps/backend/src/services/adapters/hos/samsara-hos.adapter.ts`** (NEW)
   - First real adapter implementation (establishes pattern)

4. **`apps/backend/src/api/integrations/integrations.controller.ts`** (NEW)
   - CRUD endpoints for integration configs

5. **`apps/backend/src/api/route-planning/route-planning.controller.ts`**
   - Enhance to auto-fetch HOS from IntegrationManager

### **Frontend (Priority Order)**

6. **`apps/web/src/app/settings/page.tsx`**
   - Restructure with 3 tabs (Connections, Fleet, Preferences)

7. **`apps/web/src/components/settings/ConnectionsTab.tsx`** (NEW)
   - Apple-style integration cards

8. **`apps/web/src/components/settings/IntegrationCard.tsx`** (NEW)
   - Individual connection card with status indicators

9. **`apps/web/src/lib/api/integrations.ts`** (NEW)
   - API client for integration endpoints

10. **`apps/web/src/app/dispatcher/create-plan/page.tsx`**
    - Show live HOS when driver selected (no manual entry)

---

## Part 10: Success Metrics

### **Phase 1 (Foundation) - Complete When:**
- ✅ Can configure mock Samsara integration in UI
- ✅ Integration cards show status (connected, error, not configured)
- ✅ Drivers tab shows "Synced from Samsara" badges
- ✅ Can test connection (returns mock success)

### **Phase 2 (Real Integration) - Complete When:**
- ✅ Connected to real Samsara sandbox account
- ✅ HOS data syncs automatically every 5 minutes
- ✅ Create Plan auto-fetches driver HOS (no manual entry)
- ✅ System works offline (uses cached data when API down)
- ✅ 100% of route plans use live HOS data (<5min old)

### **Phase 3 (Multi-Integration) - Complete When:**
- ✅ 3+ integrations configured (TMS, HOS, Fuel)
- ✅ Driver list auto-syncs from TMS
- ✅ Fuel stops use real GasBuddy prices
- ✅ Integration health dashboard shows uptime >99%
- ✅ Zero manual data entry for core entities

---

## Part 11: Apple Design Checklist

Before shipping, verify every screen passes Apple's design standards:

**Visual Design:**
- [ ] No visual clutter - every element has a purpose
- [ ] Generous whitespace - content breathes
- [ ] Consistent spacing - 4px, 8px, 16px, 24px, 32px scale
- [ ] Color hierarchy - dark text on light bg, muted secondary text
- [ ] Icons are simple, recognizable, consistent style

**Interaction Design:**
- [ ] Actions are verbs ("Connect", "Test", "Sync") not nouns ("Submit")
- [ ] Primary action is obvious (blue button, right-aligned)
- [ ] Destructive actions require confirmation
- [ ] Loading states are smooth (skeleton screens, not spinners)
- [ ] Success states are celebrated (green checkmarks, animations)

**Information Architecture:**
- [ ] No more than 3 tabs per section
- [ ] Progressive disclosure - advanced settings hidden by default
- [ ] Breadcrumbs show progress through multi-step flows
- [ ] Status indicators use color + icon + text (not just color)

**Copywriting:**
- [ ] No jargon - "Hours of Service" not "ELD Integration Config"
- [ ] Explain why - "Connect Samsara to sync driver hours automatically"
- [ ] Human-readable - "2 minutes ago" not "2026-01-29T10:35:22Z"
- [ ] Error messages are actionable - "API key expired. Tap Fix to reconnect."

---

## Verification Plan

### **How to Test End-to-End:**

1. **Configure Samsara Integration:**
   - Go to Settings > Connections
   - Click [Connect] on HOS card
   - Complete OAuth flow (or enter API key)
   - Click [Test Connection] → See green checkmark
   - Verify status shows "● Connected • Samsara"

2. **Verify Background Sync:**
   - Wait 5 minutes
   - Go to Settings > Fleet > Drivers
   - See "🔗 Samsara • Just now" badge
   - Click driver → See live HOS data with progress bars

3. **Create Route Plan:**
   - Go to Dispatcher > Create Plan
   - Select driver from dropdown
   - See HOS data auto-populate (no manual entry)
   - Verify data source badge: "Samsara ELD • 2m ago"
   - Generate route → Verify plan uses correct HOS state

4. **Test Offline Mode:**
   - Disconnect Samsara (invalidate API key)
   - Create new route plan
   - Verify system uses cached HOS data
   - See warning: "Using cached data (Samsara unavailable)"

5. **Test Manual Override:**
   - Go to driver details panel
   - Click [Override] on HOS data
   - Enter corrected hours + reason
   - Create route plan → Verify override used
   - Clear override → Verify sync resumes

---

## Final Recommendation: Ship in Phases

**Don't try to build everything at once.** Ship value incrementally:

### **Week 1: Ship Foundation**
- Settings UI with Connections tab
- Mock Samsara integration (for demo)
- Enhanced Drivers tab with sync badges

**Value:** Customers can see the vision, test the UX

### **Week 2: Ship First Real Integration**
- Real Samsara HOS integration
- Auto-fetch HOS in route planning
- Background sync every 5 minutes

**Value:** Zero manual HOS entry, always up-to-date data

### **Week 3-4: Ship Multi-Integration**
- TMS integration (driver list sync)
- Fuel price integration
- Weather integration

**Value:** Fully automated route planning, no manual data entry

### **Week 5+: Polish & Scale**
- Integration marketplace
- Webhook support
- Field mapping UI
- Advanced sync settings

**Value:** Enterprise-ready, self-service onboarding

---

## Conclusion

This integration strategy balances **Apple-level UX simplicity** with **enterprise-grade architecture robustness**:

- **For End Users:** Dead simple - just click [Connect], authenticate, done
- **For SALLY:** Scalable sync & cache pattern, graceful degradation, multi-tenant
- **For Developers:** Clean adapter pattern, easy to add new integrations

The key insight: **Complex integrations should feel effortless.** Users don't care about "polling intervals" or "field mappings" - they just want their driver's HOS data to show up automatically.

Build the sophisticated sync architecture, but hide it behind Apple-simple UI.

**That's how you win.**
