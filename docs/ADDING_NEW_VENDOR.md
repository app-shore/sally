# Adding a New Integration Vendor

This guide explains how to add support for a new TMS or ELD vendor to SALLY.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    VENDOR REGISTRY                           │
│  Single Source of Truth for All Vendor Metadata             │
│  - Vendor ID, display name, description                     │
│  - Integration type (TMS, HOS_ELD, FUEL_PRICE, etc.)       │
│  - Credential fields (names, types, validation)             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  ADAPTER FACTORY                             │
│  Maps Vendor ID → Adapter Instance                          │
│  - getTMSAdapter(vendor) → ITMSAdapter                      │
│  - getELDAdapter(vendor) → IELDAdapter                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  SYNC SERVICES                               │
│  Uses Factory to Get Adapters Dynamically                   │
│  - TmsSyncService: Fetches vehicles/drivers (source)        │
│  - EldSyncService: Enriches existing data (enrichment)      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     ADAPTERS                                 │
│  Vendor-Specific API Integration Logic                      │
│  - Implements ITMSAdapter or IELDAdapter                    │
│  - Handles authentication, API calls, data transformation   │
│  - Supports mock data for development                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step: Adding a New TMS Vendor

### Example: Adding "Truckbase TMS"

#### Step 1: Add to Vendor Registry

**File:** `apps/backend/src/api/integrations/vendor-registry.ts`

```typescript
export const VENDOR_REGISTRY: Record<string, VendorMetadata> = {
  // ... existing vendors ...

  TRUCKBASE_TMS: {
    id: 'TRUCKBASE_TMS',
    displayName: 'Truckbase',
    description: 'Truckbase TMS integration',
    integrationType: IntegrationType.TMS,
    credentialFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        helpText: 'Your Truckbase API key',
      },
      {
        name: 'apiSecret',
        label: 'API Secret',
        type: 'password',
        required: true,
        helpText: 'Your Truckbase API secret',
      },
    ],
    helpUrl: 'https://docs.truckbase.io/',
  },
};
```

**That's it for the frontend!** The UI will automatically:
- Show Truckbase in the TMS category
- Render input fields for apiKey and apiSecret
- Validate required fields
- Display help text and links

#### Step 2: Create the Adapter

**File:** `apps/backend/src/services/adapters/tms/truckbase-tms.adapter.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ITMSAdapter, LoadData, VehicleData, DriverData } from './tms-adapter.interface';
import axios from 'axios';

@Injectable()
export class TruckbaseTMSAdapter implements ITMSAdapter {
  private readonly baseUrl = 'https://api.truckbase.io/v1';
  private useMockData = true; // Set to false for production

  async testConnection(apiKey: string, apiSecret: string): Promise<boolean> {
    if (this.useMockData) {
      return !!apiKey && !!apiSecret;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/vehicles`, {
        headers: {
          'X-API-Key': apiKey,
          'X-API-Secret': apiSecret,
        },
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async getVehicles(apiKey: string, apiSecret: string): Promise<VehicleData[]> {
    if (this.useMockData) {
      // Mock data matching your fleet
      return [
        {
          vehicle_id: 'TB001',
          unit_number: 'TRUCK-001',
          make: 'Freightliner',
          model: 'Cascadia',
          year: 2023,
          vin: '1FUJGBDV2KLBP7528',
          license_plate: 'CA-ABC123',
          status: 'ACTIVE',
          data_source: 'truckbase_tms',
        },
      ];
    }

    // Real API call
    const response = await axios.get(`${this.baseUrl}/vehicles`, {
      headers: {
        'X-API-Key': apiKey,
        'X-API-Secret': apiSecret,
      },
    });

    // Transform Truckbase format → SALLY standard format
    return response.data.map((v: any) => ({
      vehicle_id: v.id,
      unit_number: v.unit_number,
      make: v.make,
      model: v.model,
      year: v.year,
      vin: v.vin,
      license_plate: v.license_plate,
      status: this.mapStatus(v.status),
      data_source: 'truckbase_tms',
    }));
  }

  async getDrivers(apiKey: string, apiSecret: string): Promise<DriverData[]> {
    if (this.useMockData) {
      return [
        {
          driver_id: 'TB_DRV_001',
          first_name: 'John',
          last_name: 'Smith',
          phone: '+15551234567',
          email: 'john@example.com',
          license_number: 'D1234567',
          license_state: 'CA',
          status: 'ACTIVE',
          data_source: 'truckbase_tms',
        },
      ];
    }

    const response = await axios.get(`${this.baseUrl}/drivers`, {
      headers: {
        'X-API-Key': apiKey,
        'X-API-Secret': apiSecret,
      },
    });

    return response.data.map((d: any) => ({
      driver_id: d.id,
      first_name: d.first_name,
      last_name: d.last_name,
      phone: d.phone,
      email: d.email,
      license_number: d.license_number,
      license_state: d.license_state,
      status: this.mapStatus(d.status),
      data_source: 'truckbase_tms',
    }));
  }

  async getLoad(apiKey: string, apiSecret: string, loadId: string): Promise<LoadData> {
    // Implement if needed for load management features
    throw new Error('Not implemented');
  }

  async getActiveLoads(apiKey: string, apiSecret: string): Promise<LoadData[]> {
    // Implement if needed for load management features
    throw new Error('Not implemented');
  }

  private mapStatus(vendorStatus: string): 'ACTIVE' | 'INACTIVE' | 'IN_SERVICE' | 'OUT_OF_SERVICE' {
    // Map vendor-specific status to SALLY standard
    const statusMap: Record<string, any> = {
      active: 'ACTIVE',
      inactive: 'INACTIVE',
      available: 'ACTIVE',
      unavailable: 'INACTIVE',
    };
    return statusMap[vendorStatus?.toLowerCase()] || 'INACTIVE';
  }
}
```

#### Step 3: Register in Adapter Factory

**File:** `apps/backend/src/services/adapters/adapter-factory.service.ts`

```typescript
constructor(
  // TMS Adapters
  private project44Adapter: Project44TMSAdapter,
  private mcleodAdapter: McLeodTMSAdapter,
  private truckbaseAdapter: TruckbaseTMSAdapter, // ADD THIS
  // ... ELD adapters ...
) {}

getTMSAdapter(vendor: string): ITMSAdapter | null {
  const adapterMap: Record<string, ITMSAdapter> = {
    PROJECT44_TMS: this.project44Adapter,
    MCLEOD_TMS: this.mcleodAdapter,
    TMW_TMS: this.mcleodAdapter,
    TRUCKBASE_TMS: this.truckbaseAdapter, // ADD THIS
  };

  return adapterMap[vendor] || null;
}
```

#### Step 4: Add to Module Providers

**File:** `apps/backend/src/services/sync/sync.module.ts`

```typescript
import { TruckbaseTMSAdapter } from '../adapters/tms/truckbase-tms.adapter'; // ADD THIS

@Module({
  imports: [PrismaModule],
  providers: [
    // ... existing providers ...
    // TMS Adapters
    Project44TMSAdapter,
    McLeodTMSAdapter,
    TruckbaseTMSAdapter, // ADD THIS
    // ... rest ...
  ],
  exports: [SyncService],
})
export class SyncModule {}
```

#### That's It!

The new vendor is now fully integrated:
- ✅ Shows up in UI automatically
- ✅ Credential fields render dynamically
- ✅ Test connection works
- ✅ Sync works
- ✅ No changes needed to TmsSyncService or SyncService

---

## Step-by-Step: Adding a New ELD Vendor

### Example: Adding "Geotab ELD"

#### Step 1: Add to Vendor Registry

**File:** `apps/backend/src/api/integrations/vendor-registry.ts`

```typescript
GEOTAB_ELD: {
  id: 'GEOTAB_ELD',
  displayName: 'Geotab',
  description: 'Geotab ELD integration for HOS data',
  integrationType: IntegrationType.HOS_ELD,
  credentialFields: [
    {
      name: 'apiToken',
      label: 'API Token',
      type: 'password',
      required: true,
      helpText: 'Your Geotab API token',
    },
  ],
  helpUrl: 'https://developers.geotab.com/',
},
```

#### Step 2: Create the Adapter

**File:** `apps/backend/src/services/adapters/eld/geotab-eld.adapter.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { IELDAdapter, ELDVehicleData, ELDDriverData } from './eld-adapter.interface';
import axios from 'axios';

@Injectable()
export class GeotabELDAdapter implements IELDAdapter {
  private readonly baseUrl = 'https://api.geotab.com';
  private useMockData = true;

  async testConnection(apiToken: string): Promise<boolean> {
    if (this.useMockData) {
      return !!apiToken;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/fleet/devices`, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async getVehicles(apiToken: string): Promise<ELDVehicleData[]> {
    if (this.useMockData) {
      return [
        {
          id: 'GEOTAB_001',
          vin: '1FUJGBDV2KLBP7528',
          licensePlate: 'CA-ABC123',
          serial: 'GT123456',
          gateway: { serial: 'GW-123', model: 'GO9' },
          esn: 'ESN123456',
        },
      ];
    }

    const response = await axios.get(`${this.baseUrl}/fleet/devices`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    return response.data.map((v: any) => ({
      id: v.id,
      vin: v.vehicle?.vin,
      licensePlate: v.vehicle?.licensePlate,
      serial: v.serialNumber,
      gateway: v.gateway,
      esn: v.esn,
    }));
  }

  async getDrivers(apiToken: string): Promise<ELDDriverData[]> {
    if (this.useMockData) {
      return [
        {
          id: 'GEOTAB_DRV_001',
          username: 'John Smith',
          phone: '+15551234567',
          licenseNumber: 'D1234567',
          licenseState: 'CA',
          eldSettings: {},
          timezone: 'America/Los_Angeles',
        },
      ];
    }

    const response = await axios.get(`${this.baseUrl}/fleet/drivers`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    return response.data.map((d: any) => ({
      id: d.id,
      username: d.name,
      phone: d.phone,
      licenseNumber: d.licenseNumber,
      licenseState: d.licenseState,
      eldSettings: d.settings,
      timezone: d.timezone,
    }));
  }
}
```

#### Step 3: Register in Adapter Factory

**File:** `apps/backend/src/services/adapters/adapter-factory.service.ts`

```typescript
constructor(
  // ... TMS adapters ...
  // ELD Adapters
  private samsaraELDAdapter: SamsaraELDAdapter,
  private geotabELDAdapter: GeotabELDAdapter, // ADD THIS
) {}

getELDAdapter(vendor: string): IELDAdapter | null {
  const adapterMap: Record<string, IELDAdapter> = {
    SAMSARA_ELD: this.samsaraELDAdapter,
    KEEPTRUCKIN_ELD: this.samsaraELDAdapter,
    MOTIVE_ELD: this.samsaraELDAdapter,
    GEOTAB_ELD: this.geotabELDAdapter, // ADD THIS
  };

  return adapterMap[vendor] || null;
}
```

#### Step 4: Add to Module Providers

**File:** `apps/backend/src/services/sync/sync.module.ts`

```typescript
import { GeotabELDAdapter } from '../adapters/eld/geotab-eld.adapter'; // ADD THIS

@Module({
  providers: [
    // ... existing providers ...
    // ELD Adapters
    SamsaraELDAdapter,
    GeotabELDAdapter, // ADD THIS
  ],
})
export class SyncModule {}
```

---

## Summary: What You Need to Do

### To Add Any New Vendor:

1. **Update Vendor Registry** (1 place)
   - Define vendor metadata, credential fields
   - Frontend automatically updates

2. **Create Adapter** (1 new file)
   - Implement interface (ITMSAdapter or IELDAdapter)
   - Handle API authentication and data transformation
   - Support mock data for development

3. **Register in Factory** (2 lines)
   - Add to constructor
   - Add to adapter map

4. **Add to Module** (2 lines)
   - Import adapter
   - Add to providers array

### What You DON'T Need to Change:

- ❌ **SyncService** - Uses vendor registry dynamically
- ❌ **TmsSyncService** - Uses adapter factory
- ❌ **EldSyncService** - Uses adapter factory
- ❌ **IntegrationsService** - Uses vendor registry
- ❌ **Frontend Components** - Render from vendor registry
- ❌ **API Routes** - Already generic

---

## Design Principles

1. **Single Source of Truth**: Vendor registry contains all metadata
2. **Factory Pattern**: Centralized adapter selection
3. **Interface Contracts**: All adapters implement standard interfaces
4. **Dynamic Everything**: No hardcoded vendor checks
5. **Mock Data Support**: Easy development/testing
6. **Separation of Concerns**: Each layer has a single responsibility

---

## Testing Your New Vendor

1. **Test Connection**: Configure in UI → Click "Test Connection"
2. **Mock Data Sync**: Set `useMockData = true` → Click "Sync"
3. **Verify Database**: Check vehicles/drivers created with correct `externalSource`
4. **Production API**: Set `useMockData = false` → Test with real credentials
5. **ELD Enrichment**: Sync TMS first, then ELD → Verify matching works

---

## Common Patterns

### Vendor Uses Single API Key
```typescript
credentialFields: [
  {
    name: 'apiKey',
    label: 'API Key',
    type: 'password',
    required: true,
  },
]
```

### Vendor Uses OAuth (Client ID + Secret)
```typescript
credentialFields: [
  {
    name: 'clientId',
    label: 'Client ID',
    type: 'text',
    required: true,
  },
  {
    name: 'clientSecret',
    label: 'Client Secret',
    type: 'password',
    required: true,
  },
]
```

### Vendor Uses Custom Base URL
```typescript
credentialFields: [
  {
    name: 'apiKey',
    label: 'API Key',
    type: 'password',
    required: true,
  },
  {
    name: 'baseUrl',
    label: 'API Base URL',
    type: 'url',
    required: true,
    placeholder: 'https://api.vendor.com',
  },
]
```

---

**Last Updated:** February 4, 2026
