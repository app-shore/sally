# Backend-Driven Vendor Registry Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move integration vendor metadata from hardcoded frontend enums to backend-driven registry with single source of truth.

**Architecture:** Backend registry in TypeScript (`vendor-registry.ts`), exposed via `GET /integrations/vendors` endpoint. Frontend fetches vendor metadata dynamically and renders credential fields based on backend response. No database changes, backward compatible.

**Tech Stack:** NestJS, TypeScript, Prisma, Next.js 15, Shadcn UI, React Query

---

## Task 1: Create Backend Vendor Registry Module

**Files:**
- Create: `apps/backend/src/api/integrations/vendor-registry.ts`
- Reference: `apps/backend/src/api/integrations/dto/create-integration.dto.ts` (for IntegrationType enum)

**Step 1: Create vendor registry interfaces and data**

Create: `apps/backend/src/api/integrations/vendor-registry.ts`

```typescript
import { IntegrationType } from './dto/create-integration.dto';

export interface CredentialField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'number';
  required: boolean;
  helpText?: string;
  placeholder?: string;
}

export interface VendorMetadata {
  id: string;
  displayName: string;
  description: string;
  integrationType: IntegrationType;
  credentialFields: CredentialField[];
  helpUrl?: string;
  logoUrl?: string;
}

export const VENDOR_REGISTRY: Record<string, VendorMetadata> = {
  PROJECT44_TMS: {
    id: 'PROJECT44_TMS',
    displayName: 'project44',
    description: 'project44 TMS integration',
    integrationType: IntegrationType.TMS,
    credentialFields: [
      {
        name: 'clientId',
        label: 'Client ID',
        type: 'text',
        required: true,
        helpText: 'OAuth 2.0 Client ID from developers.project44.com',
      },
      {
        name: 'clientSecret',
        label: 'Client Secret',
        type: 'password',
        required: true,
        helpText: 'OAuth 2.0 Client Secret from developers.project44.com',
      },
    ],
    helpUrl: 'https://developers.project44.com/docs/authentication',
  },

  SAMSARA_ELD: {
    id: 'SAMSARA_ELD',
    displayName: 'Samsara',
    description: 'Samsara ELD integration for HOS data',
    integrationType: IntegrationType.HOS_ELD,
    credentialFields: [
      {
        name: 'apiToken',
        label: 'API Token',
        type: 'password',
        required: true,
        helpText: 'Get your API token from Samsara Dashboard → Settings → API Tokens',
        placeholder: 'samsara_api_xxxxxxxxxxxxx',
      },
    ],
    helpUrl: 'https://developers.samsara.com/docs/authentication',
  },

  MCLEOD_TMS: {
    id: 'MCLEOD_TMS',
    displayName: 'McLeod',
    description: 'McLeod Software TMS integration',
    integrationType: IntegrationType.TMS,
    credentialFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        helpText: 'Contact your McLeod administrator for API credentials',
      },
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'url',
        required: true,
        helpText: 'Your McLeod API endpoint URL',
        placeholder: 'https://api.mcleodsoft.com',
      },
    ],
  },

  TMW_TMS: {
    id: 'TMW_TMS',
    displayName: 'TMW Systems',
    description: 'TMW Systems TMS integration',
    integrationType: IntegrationType.TMS,
    credentialFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        helpText: 'API key from TMW Systems',
      },
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'url',
        required: true,
        helpText: 'Your TMW API endpoint URL',
        placeholder: 'https://api.tmwsystems.com',
      },
    ],
  },

  KEEPTRUCKIN_ELD: {
    id: 'KEEPTRUCKIN_ELD',
    displayName: 'KeepTruckin',
    description: 'KeepTruckin ELD integration for HOS data',
    integrationType: IntegrationType.HOS_ELD,
    credentialFields: [
      {
        name: 'apiToken',
        label: 'API Token',
        type: 'password',
        required: true,
        helpText: 'Get your API token from KeepTruckin Dashboard',
      },
    ],
  },

  MOTIVE_ELD: {
    id: 'MOTIVE_ELD',
    displayName: 'Motive',
    description: 'Motive ELD integration for HOS data',
    integrationType: IntegrationType.HOS_ELD,
    credentialFields: [
      {
        name: 'apiToken',
        label: 'API Token',
        type: 'password',
        required: true,
        helpText: 'Get your API token from Motive Dashboard',
      },
    ],
  },

  GASBUDDY_FUEL: {
    id: 'GASBUDDY_FUEL',
    displayName: 'GasBuddy',
    description: 'GasBuddy fuel price integration',
    integrationType: IntegrationType.FUEL_PRICE,
    credentialFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        helpText: 'API key from GasBuddy',
      },
    ],
    helpUrl: 'https://www.gasbuddy.com/developer',
  },

  FUELFINDER_FUEL: {
    id: 'FUELFINDER_FUEL',
    displayName: 'Fuel Finder',
    description: 'Fuel Finder price integration',
    integrationType: IntegrationType.FUEL_PRICE,
    credentialFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        helpText: 'API key from Fuel Finder',
      },
    ],
  },

  OPENWEATHER: {
    id: 'OPENWEATHER',
    displayName: 'OpenWeather',
    description: 'OpenWeather weather data integration',
    integrationType: IntegrationType.WEATHER,
    credentialFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        helpText: 'Get your API key from OpenWeatherMap',
        placeholder: 'abc123def456...',
      },
    ],
    helpUrl: 'https://openweathermap.org/api',
  },
};
```

**Step 2: Verify file compiles**

Run: `cd apps/backend && npm run build`
Expected: No compilation errors

**Step 3: Commit**

```bash
git add apps/backend/src/api/integrations/vendor-registry.ts
git commit -m "feat(integrations): add backend vendor registry with all 9 vendors

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Add GET /integrations/vendors Endpoint

**Files:**
- Modify: `apps/backend/src/api/integrations/integrations.controller.ts`
- Reference: `apps/backend/src/api/integrations/vendor-registry.ts`

**Step 1: Write test for vendors endpoint**

Create: `apps/backend/src/api/integrations/__tests__/vendor-registry.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationsController } from '../integrations.controller';
import { IntegrationsService } from '../integrations.service';
import { VENDOR_REGISTRY } from '../vendor-registry';

describe('IntegrationsController - Vendor Registry', () => {
  let controller: IntegrationsController;

  const mockIntegrationsService = {
    // Mock other methods as needed
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntegrationsController],
      providers: [
        {
          provide: IntegrationsService,
          useValue: mockIntegrationsService,
        },
      ],
    }).compile();

    controller = module.get<IntegrationsController>(IntegrationsController);
  });

  describe('GET /vendors', () => {
    it('should return all vendors from registry', () => {
      const vendors = controller.getVendorRegistry();

      expect(vendors).toBeInstanceOf(Array);
      expect(vendors.length).toBe(9);

      // Verify PROJECT44_TMS is present
      const project44 = vendors.find(v => v.id === 'PROJECT44_TMS');
      expect(project44).toBeDefined();
      expect(project44?.displayName).toBe('project44');
      expect(project44?.integrationType).toBe('TMS');
      expect(project44?.credentialFields).toHaveLength(2);

      // Verify SAMSARA_ELD is present
      const samsara = vendors.find(v => v.id === 'SAMSARA_ELD');
      expect(samsara).toBeDefined();
      expect(samsara?.displayName).toBe('Samsara');
      expect(samsara?.credentialFields).toHaveLength(1);
      expect(samsara?.credentialFields[0].name).toBe('apiToken');
    });

    it('should include credential field metadata', () => {
      const vendors = controller.getVendorRegistry();
      const project44 = vendors.find(v => v.id === 'PROJECT44_TMS');

      const clientIdField = project44?.credentialFields.find(f => f.name === 'clientId');
      expect(clientIdField).toMatchObject({
        name: 'clientId',
        label: 'Client ID',
        type: 'text',
        required: true,
      });
      expect(clientIdField?.helpText).toContain('OAuth 2.0');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && npm test -- vendor-registry.spec.ts`
Expected: FAIL - "getVendorRegistry is not a function"

**Step 3: Add getVendorRegistry method to controller**

Modify: `apps/backend/src/api/integrations/integrations.controller.ts`

Add import at top:
```typescript
import { VENDOR_REGISTRY, VendorMetadata } from './vendor-registry';
```

Add new endpoint (after existing endpoints):
```typescript
  /**
   * GET /integrations/vendors
   * Returns vendor registry metadata
   */
  @Get('vendors')
  getVendorRegistry(): VendorMetadata[] {
    return Object.values(VENDOR_REGISTRY);
  }
```

**Step 4: Run test to verify it passes**

Run: `cd apps/backend && npm test -- vendor-registry.spec.ts`
Expected: PASS - all tests green

**Step 5: Test endpoint manually (optional)**

Run: `cd apps/backend && npm run start:dev`
Then: `curl http://localhost:3001/integrations/vendors | jq`
Expected: JSON array with 9 vendor objects

**Step 6: Commit**

```bash
git add apps/backend/src/api/integrations/__tests__/vendor-registry.spec.ts \
        apps/backend/src/api/integrations/integrations.controller.ts
git commit -m "feat(integrations): add GET /integrations/vendors endpoint

Returns all vendor metadata from registry for dynamic UI rendering.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Add Credential Validation in Service

**Files:**
- Modify: `apps/backend/src/api/integrations/integrations.service.ts`
- Reference: `apps/backend/src/api/integrations/vendor-registry.ts`

**Step 1: Write test for credential validation**

Modify: `apps/backend/src/api/integrations/__tests__/integrations.controller.spec.ts`

Add test case:
```typescript
describe('POST /integrations - Credential Validation', () => {
  it('should reject unsupported vendor', async () => {
    const dto = {
      integration_type: 'TMS',
      vendor: 'INVALID_VENDOR',
      display_name: 'Test',
      credentials: {},
    };

    await expect(service.createIntegration(dto, 'test-tenant')).rejects.toThrow(
      'Unsupported vendor: INVALID_VENDOR'
    );
  });

  it('should reject missing required credentials', async () => {
    const dto = {
      integration_type: 'HOS_ELD',
      vendor: 'SAMSARA_ELD',
      display_name: 'Test Samsara',
      credentials: {}, // Missing apiToken
    };

    await expect(service.createIntegration(dto, 'test-tenant')).rejects.toThrow(
      'Missing required credentials: apiToken'
    );
  });

  it('should accept valid credentials', async () => {
    const dto = {
      integration_type: 'HOS_ELD',
      vendor: 'SAMSARA_ELD',
      display_name: 'Test Samsara',
      credentials: {
        apiToken: 'test-token-123',
      },
    };

    // Mock Prisma and other services as needed
    const result = await service.createIntegration(dto, 'test-tenant');
    expect(result).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && npm test -- integrations.controller.spec.ts`
Expected: FAIL - validation not implemented

**Step 3: Add validation logic to service**

Modify: `apps/backend/src/api/integrations/integrations.service.ts`

Add import at top:
```typescript
import { VENDOR_REGISTRY } from './vendor-registry';
import { BadRequestException } from '@nestjs/common';
```

Find the `createIntegration` method and add validation at the beginning:
```typescript
  async createIntegration(dto: CreateIntegrationDto, tenantId: string) {
    // Validate vendor exists in registry
    const vendorMeta = VENDOR_REGISTRY[dto.vendor];
    if (!vendorMeta) {
      throw new BadRequestException(`Unsupported vendor: ${dto.vendor}`);
    }

    // Validate required credentials provided
    const missingFields = vendorMeta.credentialFields
      .filter(f => f.required && !dto.credentials?.[f.name]);
    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Missing required credentials: ${missingFields.map(f => f.name).join(', ')}`
      );
    }

    // Continue with existing creation logic...
```

**Step 4: Run tests to verify they pass**

Run: `cd apps/backend && npm test -- integrations.controller.spec.ts`
Expected: PASS - all tests green

**Step 5: Commit**

```bash
git add apps/backend/src/api/integrations/__tests__/integrations.controller.spec.ts \
        apps/backend/src/api/integrations/integrations.service.ts
git commit -m "feat(integrations): add vendor registry credential validation

Validate vendor exists and required credentials are provided when
creating integrations.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Add Frontend Vendor Metadata Types

**Files:**
- Modify: `apps/web/src/lib/api/integrations.ts`

**Step 1: Update IntegrationVendor type and add new interfaces**

Modify: `apps/web/src/lib/api/integrations.ts`

Change line 4-13 from:
```typescript
export type IntegrationVendor =
  | 'MCLEOD_TMS'
  | 'TMW_TMS'
  | 'PROJECT44_TMS'
  | 'SAMSARA_ELD'
  | 'KEEPTRUCKIN_ELD'
  | 'MOTIVE_ELD'
  | 'GASBUDDY_FUEL'
  | 'FUELFINDER_FUEL'
  | 'OPENWEATHER';
```

To:
```typescript
// Backend validates vendor, frontend treats as string
export type IntegrationVendor = string;
```

Add new interfaces after IntegrationConfig interface (around line 31):
```typescript
export interface CredentialField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'number';
  required: boolean;
  helpText?: string;
  placeholder?: string;
}

export interface VendorMetadata {
  id: string;
  displayName: string;
  description: string;
  integrationType: IntegrationType;
  credentialFields: CredentialField[];
  helpUrl?: string;
  logoUrl?: string;
}
```

**Step 2: Add getVendorRegistry API function**

Add after existing API functions (around line 174):
```typescript
/**
 * Get vendor registry metadata
 */
export async function getVendorRegistry(): Promise<VendorMetadata[]> {
  return apiClient<VendorMetadata[]>('/integrations/vendors', { method: 'GET' });
}
```

**Step 3: Verify TypeScript compiles**

Run: `cd apps/web && npm run build`
Expected: Compilation successful (may have warnings about unused exports)

**Step 4: Commit**

```bash
git add apps/web/src/lib/api/integrations.ts
git commit -m "feat(integrations): add vendor metadata types and API function

Add VendorMetadata and CredentialField interfaces, getVendorRegistry()
function. Change IntegrationVendor from union type to string.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Remove Hardcoded Vendor Mappings from Frontend

**Files:**
- Modify: `apps/web/src/lib/api/integrations.ts`

**Step 1: Remove getVendorLabel function**

Modify: `apps/web/src/lib/api/integrations.ts`

Find and DELETE the `getVendorLabel` function (around lines 193-206):
```typescript
export function getVendorLabel(vendor: IntegrationVendor): string {
  const labels: Record<IntegrationVendor, string> = {
    MCLEOD_TMS: 'McLeod',
    TMW_TMS: 'TMW Systems',
    PROJECT44_TMS: 'project44',
    SAMSARA_ELD: 'Samsara',
    KEEPTRUCKIN_ELD: 'KeepTruckin',
    MOTIVE_ELD: 'Motive',
    GASBUDDY_FUEL: 'GasBuddy',
    FUELFINDER_FUEL: 'Fuel Finder',
    OPENWEATHER: 'OpenWeather',
  };
  return labels[vendor];
}
```

**Step 2: Verify no other files reference getVendorLabel**

Run: `cd apps/web && grep -r "getVendorLabel" src/`
Expected: No matches (or only in files we'll update next)

**Step 3: Commit**

```bash
git add apps/web/src/lib/api/integrations.ts
git commit -m "refactor(integrations): remove hardcoded getVendorLabel function

Vendor labels now come from backend registry.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Update ConfigureIntegrationForm to Fetch Vendors

**Files:**
- Modify: `apps/web/src/components/settings/ConfigureIntegrationForm.tsx`

**Step 1: Add vendor fetching logic**

Modify: `apps/web/src/components/settings/ConfigureIntegrationForm.tsx`

Add imports at top:
```typescript
import { getVendorRegistry, VendorMetadata } from '@/lib/api/integrations';
```

Add state for vendors (after existing useState declarations):
```typescript
const [vendors, setVendors] = useState<VendorMetadata[]>([]);
const [isLoadingVendors, setIsLoadingVendors] = useState(true);
```

Add useEffect to fetch vendors (after existing useEffects):
```typescript
// Fetch vendor registry on mount
useEffect(() => {
  const fetchVendors = async () => {
    try {
      setIsLoadingVendors(true);
      const vendorList = await getVendorRegistry();
      setVendors(vendorList);
    } catch (error) {
      console.error('Failed to fetch vendor registry:', error);
    } finally {
      setIsLoadingVendors(false);
    }
  };

  fetchVendors();
}, []);
```

Add computed values (after state declarations):
```typescript
// Filter vendors by selected integration type
const availableVendors = vendors.filter(
  v => !integrationType || v.integrationType === integrationType
);

// Get selected vendor metadata
const selectedVendorMeta = vendors.find(v => v.id === vendor);
```

**Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npm run type-check`
Expected: No type errors

**Step 3: Commit**

```bash
git add apps/web/src/components/settings/ConfigureIntegrationForm.tsx
git commit -m "feat(integrations): fetch vendor registry in ConfigureIntegrationForm

Add state and useEffect to fetch vendors from backend on mount.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Update Vendor Dropdown to Use Dynamic Data

**Files:**
- Modify: `apps/web/src/components/settings/ConfigureIntegrationForm.tsx`

**Step 1: Find and update vendor dropdown rendering**

Modify: `apps/web/src/components/settings/ConfigureIntegrationForm.tsx`

Find the vendor selection dropdown (search for "Choose integration vendor" or similar).

Replace hardcoded vendor options with:
```typescript
<Select value={vendor} onValueChange={setVendor}>
  <SelectTrigger>
    <SelectValue placeholder="Choose integration vendor" />
  </SelectTrigger>
  <SelectContent>
    {isLoadingVendors ? (
      <SelectItem value="" disabled>Loading vendors...</SelectItem>
    ) : availableVendors.length === 0 ? (
      <SelectItem value="" disabled>No vendors available</SelectItem>
    ) : (
      availableVendors.map(v => (
        <SelectItem key={v.id} value={v.id}>
          {v.displayName}
        </SelectItem>
      ))
    )}
  </SelectContent>
</Select>
```

**Step 2: Update vendor description display**

Find where vendor description is displayed and replace with:
```typescript
{selectedVendorMeta && (
  <p className="text-sm text-muted-foreground">
    {selectedVendorMeta.description}
  </p>
)}
```

**Step 3: Add help URL link if available**

Add after vendor description:
```typescript
{selectedVendorMeta?.helpUrl && (
  <a
    href={selectedVendorMeta.helpUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
  >
    View {selectedVendorMeta.displayName} documentation →
  </a>
)}
```

**Step 4: Test in browser**

Run: `cd apps/web && npm run dev`
Navigate to: `http://localhost:3000/settings/integrations`
Expected: Vendor dropdown shows "project44", "Samsara", etc. from backend

**Step 5: Commit**

```bash
git add apps/web/src/components/settings/ConfigureIntegrationForm.tsx
git commit -m "feat(integrations): render vendor dropdown from backend data

Replace hardcoded vendor options with dynamic data from registry.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Remove Hardcoded Vendor Name/Description Mappings

**Files:**
- Modify: `apps/web/src/components/settings/ConfigureIntegrationForm.tsx`

**Step 1: Find and delete getDefaultDisplayName function**

Modify: `apps/web/src/components/settings/ConfigureIntegrationForm.tsx`

Find the `getDefaultDisplayName` function (around line 371-390) and DELETE it:
```typescript
function getDefaultDisplayName(
  type?: IntegrationType,
  vendor?: IntegrationVendor
): string {
  if (!type || !vendor) return '';

  const vendorNames: Record<IntegrationVendor, string> = {
    MCLEOD_TMS: 'McLeod TMS',
    // ... rest of the mapping
  };

  return vendorNames[vendor] || '';
}
```

Replace usages with:
```typescript
const defaultDisplayName = selectedVendorMeta?.displayName || '';
```

**Step 2: Find and delete getVendorDescription function**

Find the `getVendorDescription` function (around line 415-428) and DELETE it:
```typescript
function getVendorDescription(vendor?: IntegrationVendor): string {
  const descriptions: Record<IntegrationVendor, string> = {
    MCLEOD_TMS: 'McLeod Software',
    // ... rest of the mapping
  };
  return vendor ? descriptions[vendor] : 'Unknown';
}
```

Replace usages with:
```typescript
const vendorDescription = selectedVendorMeta?.description || 'Unknown vendor';
```

**Step 3: Verify no more Record<IntegrationVendor, string> mappings exist**

Run: `cd apps/web && grep -n "Record<IntegrationVendor" src/components/settings/ConfigureIntegrationForm.tsx`
Expected: No matches

**Step 4: Verify TypeScript compiles**

Run: `cd apps/web && npm run type-check`
Expected: No type errors

**Step 5: Commit**

```bash
git add apps/web/src/components/settings/ConfigureIntegrationForm.tsx
git commit -m "refactor(integrations): remove hardcoded vendor name/description mappings

All vendor metadata now comes from backend registry.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Implement Dynamic Credential Field Rendering

**Files:**
- Modify: `apps/web/src/components/settings/ConfigureIntegrationForm.tsx`

**Step 1: Find credential fields section and replace with dynamic rendering**

Modify: `apps/web/src/components/settings/ConfigureIntegrationForm.tsx`

Find the section where credential fields are rendered (likely has vendor-specific conditionals like `vendor === 'SAMSARA_ELD'`).

Replace the entire credential fields section with:
```typescript
{/* Dynamic Credential Fields */}
{selectedVendorMeta && selectedVendorMeta.credentialFields.length > 0 && (
  <div className="space-y-4">
    <div>
      <h4 className="text-sm font-medium mb-2">Credentials</h4>
      <p className="text-sm text-muted-foreground mb-4">
        Enter your {selectedVendorMeta.displayName} credentials
      </p>
    </div>

    {selectedVendorMeta.credentialFields.map(field => (
      <div key={field.name} className="space-y-2">
        <Label htmlFor={field.name}>
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Input
          id={field.name}
          name={field.name}
          type={field.type}
          placeholder={field.placeholder}
          required={field.required}
          value={credentials[field.name] || ''}
          onChange={(e) => setCredentials({
            ...credentials,
            [field.name]: e.target.value
          })}
          className="bg-background text-foreground border-border"
        />
        {field.helpText && (
          <p className="text-sm text-muted-foreground">
            {field.helpText}
          </p>
        )}
      </div>
    ))}
  </div>
)}
```

**Step 2: Ensure credentials state exists**

Check that `credentials` state exists:
```typescript
const [credentials, setCredentials] = useState<Record<string, string>>({});
```

If not, add it near other state declarations.

**Step 3: Test in browser**

Run: `cd apps/web && npm run dev`
Test:
1. Select "TMS" type → Select "project44" → Should show 2 fields (Client ID, Client Secret)
2. Select "HOS/ELD" type → Select "Samsara" → Should show 1 field (API Token)
3. Verify help text appears below each field
4. Verify required fields have red asterisk

Expected: All credential fields render dynamically with correct labels, types, help text

**Step 4: Commit**

```bash
git add apps/web/src/components/settings/ConfigureIntegrationForm.tsx
git commit -m "feat(integrations): implement dynamic credential field rendering

Replace hardcoded vendor-specific credential fields with dynamic
rendering based on backend registry metadata.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Update Integration List Page - Add Test Connection Button

**Files:**
- Modify: `apps/web/src/components/settings/ConnectionsTab.tsx` (or equivalent integrations list page)

**Step 1: Find the integration card component**

Locate where integrations are displayed in a list/grid (likely in ConnectionsTab or similar).

**Step 2: Add test connection state and handler**

Add state for tracking which integration is being tested:
```typescript
const [testingIntegrationId, setTestingIntegrationId] = useState<string | null>(null);
```

Add test connection handler:
```typescript
const handleTestConnection = async (integrationId: string, vendorName: string) => {
  setTestingIntegrationId(integrationId);

  try {
    const result = await testConnection(integrationId);

    if (result.success) {
      toast({
        title: "Connection successful",
        description: `✅ ${vendorName} connection is working`,
      });
    } else {
      toast({
        title: "Connection failed",
        description: `❌ ${result.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  } catch (error) {
    toast({
      title: "Connection failed",
      description: `❌ ${error instanceof Error ? error.message : 'Unknown error'}`,
      variant: "destructive",
    });
  } finally {
    setTestingIntegrationId(null);
  }
};
```

**Step 3: Add Test Connection button to integration card**

Modify the integration card rendering:
```typescript
<Card>
  <CardHeader className="flex flex-row items-center justify-between">
    <div>
      <CardTitle>{integration.display_name}</CardTitle>
      <p className="text-sm text-muted-foreground">
        Last sync: {formatRelativeTime(integration.last_sync_at)}
      </p>
    </div>
    <Badge variant={getStatusVariant(integration.status)}>
      {integration.status}
    </Badge>
  </CardHeader>
  <CardContent>
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleEdit(integration.id)}
      >
        Edit
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleTestConnection(integration.id, integration.display_name)}
        disabled={testingIntegrationId === integration.id}
      >
        {testingIntegrationId === integration.id ? 'Testing...' : 'Test Connection'}
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => handleDelete(integration.id)}
      >
        Delete
      </Button>
    </div>
  </CardContent>
</Card>
```

**Step 4: Add toast import if needed**

Add at top:
```typescript
import { useToast } from "@/components/ui/use-toast"

// Inside component
const { toast } = useToast();
```

**Step 5: Test in browser**

Run: `cd apps/web && npm run dev`
Test:
1. Navigate to integrations list
2. Click "Test Connection" on an integration
3. Button should show "Testing..." then show toast with result

**Step 6: Commit**

```bash
git add apps/web/src/components/settings/ConnectionsTab.tsx
git commit -m "feat(integrations): add Test Connection button to integration cards

Allow users to test connections directly from list without opening
configure dialog. Shows toast notifications with results.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: End-to-End Testing

**Files:**
- No file changes, just testing

**Step 1: Test backend endpoint directly**

Run: `cd apps/backend && npm run start:dev`

Test:
```bash
curl http://localhost:3001/integrations/vendors | jq
```

Expected: JSON array with 9 vendors, each with id, displayName, description, integrationType, credentialFields

**Step 2: Test creating Samsara integration**

```bash
curl -X POST http://localhost:3001/integrations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "integration_type": "HOS_ELD",
    "vendor": "SAMSARA_ELD",
    "display_name": "My Samsara",
    "credentials": {
      "apiToken": "test-token"
    }
  }'
```

Expected: 201 Created with integration object

**Step 3: Test missing credentials validation**

```bash
curl -X POST http://localhost:3001/integrations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "integration_type": "HOS_ELD",
    "vendor": "SAMSARA_ELD",
    "display_name": "My Samsara",
    "credentials": {}
  }'
```

Expected: 400 Bad Request with "Missing required credentials: apiToken"

**Step 4: Test frontend full flow**

Run: `cd apps/web && npm run dev`

Test:
1. Navigate to `/settings/integrations`
2. Click "Add Integration"
3. Select "HOS/ELD" type
4. Select "Samsara" vendor (should load from backend)
5. Verify "API Token" field appears with help text
6. Enter token and submit
7. Verify integration appears in list
8. Click "Test Connection" on new integration
9. Verify toast notification appears

**Step 5: Test project44 (OAuth-style credentials)**

Test:
1. Select "TMS" type
2. Select "project44" vendor
3. Verify 2 fields appear: "Client ID" and "Client Secret"
4. Verify help text mentions OAuth 2.0
5. Create integration with both credentials

**Step 6: Document test results**

Create: `docs/plans/2026-02-04-vendor-registry-test-results.md`

```markdown
# Vendor Registry Implementation - Test Results

**Date:** 2026-02-04
**Tested By:** [Your Name]

## Backend Tests

- [x] GET /integrations/vendors returns 9 vendors
- [x] Vendor metadata includes all required fields
- [x] Invalid vendor rejected with 400
- [x] Missing credentials rejected with 400
- [x] Valid credentials accepted

## Frontend Tests

- [x] Vendor dropdown loads dynamically from backend
- [x] Credential fields render based on vendor selection
- [x] Samsara shows 1 field (API Token)
- [x] project44 shows 2 fields (Client ID, Client Secret)
- [x] Help text displays correctly
- [x] Test Connection button works from list
- [x] Toast notifications show test results

## Integration Tests

- [x] Can create Samsara integration
- [x] Can create project44 integration
- [x] Existing integrations still work
- [x] No hardcoded vendor references remain in frontend

## Issues Found

None

## Success Criteria Met

All 10 success criteria from design doc verified ✅
```

**Step 7: Commit test results**

```bash
git add docs/plans/2026-02-04-vendor-registry-test-results.md
git commit -m "docs: add vendor registry implementation test results

All success criteria verified, no issues found.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Update Documentation

**Files:**
- Modify: `README.md` (if integration setup instructions exist)
- Modify: `.specs/features/03-integrations/STRATEGY.md` (mark vendor registry as implemented)

**Step 1: Update integration strategy doc**

Modify: `.specs/features/03-integrations/STRATEGY.md`

Add at top of document:
```markdown
## Implementation Status

- ✅ **Backend Vendor Registry** - Implemented 2026-02-04
  - `GET /integrations/vendors` endpoint
  - Dynamic credential validation
  - 9 vendors supported (PROJECT44_TMS, SAMSARA_ELD, MCLEOD_TMS, TMW_TMS, KEEPTRUCKIN_ELD, MOTIVE_ELD, GASBUDDY_FUEL, FUELFINDER_FUEL, OPENWEATHER)

- ✅ **Dynamic Frontend Rendering** - Implemented 2026-02-04
  - Vendor dropdowns from backend
  - Credential fields from backend
  - Test Connection button on list page
```

**Step 2: Add "Adding a New Vendor" guide**

Add new section to STRATEGY.md:
```markdown
## Adding a New Integration Vendor

To add a new vendor (e.g., "Omnitracs ELD"):

1. **Add to backend registry** - `apps/backend/src/api/integrations/vendor-registry.ts`
   ```typescript
   OMNITRACS_ELD: {
     id: 'OMNITRACS_ELD',
     displayName: 'Omnitracs',
     description: 'Omnitracs ELD integration',
     integrationType: IntegrationType.HOS_ELD,
     credentialFields: [
       {
         name: 'apiKey',
         label: 'API Key',
         type: 'password',
         required: true,
         helpText: 'API key from Omnitracs portal'
       }
     ],
     helpUrl: 'https://developers.omnitracs.com'
   }
   ```

2. **Add to Prisma enum** - `apps/backend/prisma/schema.prisma`
   ```prisma
   enum IntegrationVendor {
     // ... existing vendors
     OMNITRACS_ELD
   }
   ```

3. **Create migration**
   ```bash
   cd apps/backend
   npx prisma migrate dev --name add_omnitracs_vendor
   ```

4. **Create adapter** - `apps/backend/src/services/adapters/eld/omnitracs-eld.adapter.ts`
   (Implement IEldAdapter interface)

5. **Register adapter** - `apps/backend/src/services/integration-manager/integration-manager.service.ts`

6. **Test** - Frontend automatically picks up new vendor, no changes needed!
```

**Step 3: Commit documentation updates**

```bash
git add .specs/features/03-integrations/STRATEGY.md
git commit -m "docs: add vendor registry implementation status and guide

Document implementation status and add step-by-step guide for adding
new integration vendors.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 13: Final Verification and Cleanup

**Files:**
- None (verification only)

**Step 1: Run all backend tests**

Run: `cd apps/backend && npm test`
Expected: All tests pass

**Step 2: Run all frontend tests**

Run: `cd apps/web && npm test`
Expected: All tests pass (or skip if no tests configured)

**Step 3: Build both apps**

Run: `cd apps/backend && npm run build`
Run: `cd apps/web && npm run build`
Expected: Both build successfully

**Step 4: Check for remaining hardcoded vendor references**

Run: `grep -r "TRUCKBASE_TMS" apps/`
Expected: No matches (except in migration backup files)

Run: `grep -r "Record<IntegrationVendor" apps/web/src/`
Expected: No matches

**Step 5: Review all commits**

Run: `git log --oneline -13`
Expected: See all 13 commits from this implementation

**Step 6: Create final summary commit (optional)**

```bash
git commit --allow-empty -m "feat(integrations): backend-driven vendor registry complete

Summary of changes:
- Backend vendor registry with 9 vendors
- GET /integrations/vendors endpoint
- Credential validation in service
- Frontend dynamic vendor dropdown
- Frontend dynamic credential fields
- Test Connection button on list page
- All hardcoded vendor mappings removed

Closes #[issue-number-if-applicable]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Success Criteria Verification

Check all items from design doc:

1. ✅ Backend `/integrations/vendors` endpoint returns all 9 vendors
2. ✅ Frontend Settings page renders vendor dropdowns dynamically
3. ✅ Credential fields render based on backend response
4. ✅ Can create Samsara integration (1 field: API Token)
5. ✅ Can create project44 integration (2 fields: Client ID + Secret)
6. ✅ No hardcoded vendor labels/descriptions in frontend
7. ✅ Backend validates required credentials on create
8. ✅ All existing integrations continue working
9. ✅ "Test Connection" button works from integration list page
10. ✅ Toast notifications show test results

---

## Rollback Plan (if needed)

If issues found after deployment:

1. **Backend rollback:** Revert commits from Task 1-3 (vendor registry, endpoint, validation)
2. **Frontend rollback:** Revert commits from Task 4-10 (types, dynamic rendering)
3. **Database:** No migrations needed, safe to rollback

Frontend can run on old code with new backend (endpoint is additive).
Backend can run with old frontend (validation is additive).

---

## Related Documents

- `docs/plans/2026-02-04-vendor-registry-design.md` - Design document
- `.specs/features/03-integrations/STRATEGY.md` - Integration architecture strategy
- `CLAUDE.md` - UI development standards
