# Integration Vendor Registry - Backend-Driven Architecture

**Date:** 2026-02-04
**Status:** Approved
**Goal:** Move integration vendor metadata from hardcoded frontend enums to backend-driven registry

---

## Problem Statement

**Current State:**
- Integration vendor metadata duplicated across frontend and backend
- Vendor labels, descriptions, credential fields hardcoded in multiple places
- Recent TRUCKBASE_TMS → PROJECT44_TMS migration caused frontend/backend sync issues
- Adding new vendor requires changes in 5+ locations

**Root Cause:**
No single source of truth for vendor metadata.

---

## Solution: Backend-Driven Vendor Registry

### Design Principles

1. **Backend as Source of Truth** - Vendor metadata lives in backend, frontend renders dynamically
2. **Curated Marketplace Model** - SALLY team maintains official integrations only (no custom extensions)
3. **Speed to Ship** - Simple TypeScript objects, no complex schemas or databases
4. **Zero Breaking Changes** - Existing integrations continue working, backward compatible rollout

---

## Architecture Overview

### Component 1: Backend Vendor Registry

**File:** `apps/backend/src/api/integrations/vendor-registry.ts`

```typescript
export interface VendorMetadata {
  id: string;                    // 'PROJECT44_TMS'
  displayName: string;           // 'project44'
  description: string;           // 'project44 TMS integration'
  integrationType: IntegrationType;
  credentialFields: CredentialField[];
  helpUrl?: string;              // Link to vendor docs
  logoUrl?: string;              // For UI (future)
}

export interface CredentialField {
  name: string;                  // 'clientId'
  label: string;                 // 'Client ID' (matches vendor's dashboard terminology)
  type: 'text' | 'password' | 'url' | 'number';
  required: boolean;
  helpText?: string;             // Inline help for users
  placeholder?: string;
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
        helpText: 'OAuth 2.0 Client ID from developers.project44.com'
      },
      {
        name: 'clientSecret',
        label: 'Client Secret',
        type: 'password',
        required: true
      }
    ],
    helpUrl: 'https://developers.project44.com/docs/authentication'
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
        placeholder: 'samsara_api_xxxxxxxxxxxxx'
      }
    ],
    helpUrl: 'https://developers.samsara.com/docs/authentication'
  },

  // MCLEOD_TMS, TMW_TMS, KEEPTRUCKIN_ELD, MOTIVE_ELD,
  // GASBUDDY_FUEL, FUELFINDER_FUEL, OPENWEATHER
};
```

**Credential Label Convention:**
- Use vendor's exact terminology from their dashboard
- OAuth vendors: `Client ID`, `Client Secret` (industry standard)
- API key vendors: Match what vendor calls it (`API Token`, `API Key`, etc.)

### Component 2: API Endpoint

**New Endpoint:** `GET /api/v1/integrations/vendors`

```typescript
// apps/backend/src/api/integrations/integrations.controller.ts

@Get('vendors')
async getVendorRegistry(): Promise<VendorMetadata[]> {
  return Object.values(VENDOR_REGISTRY);
}
```

**Response Example:**
```json
[
  {
    "id": "PROJECT44_TMS",
    "displayName": "project44",
    "description": "project44 TMS integration",
    "integrationType": "TMS",
    "credentialFields": [
      {
        "name": "clientId",
        "label": "Client ID",
        "type": "text",
        "required": true,
        "helpText": "OAuth 2.0 Client ID from developers.project44.com"
      },
      {
        "name": "clientSecret",
        "label": "Client Secret",
        "type": "password",
        "required": true
      }
    ],
    "helpUrl": "https://developers.project44.com/docs/authentication"
  }
]
```

### Component 3: Backend Validation

```typescript
// In CreateIntegrationDto validation
async create(dto: CreateIntegrationDto) {
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

  // Continue with creation...
}
```

**Keep Prisma Enum:**
- YES - keep `enum IntegrationVendor` in Prisma schema for database constraint
- Update enum when adding new vendors (rare operation)
- Registry provides rich metadata, enum provides DB-level validation

---

## Frontend Changes

### Change 1: Simplify Type Definition

```typescript
// apps/web/src/lib/api/integrations.ts

// BEFORE: Hardcoded union type
export type IntegrationVendor =
  | 'MCLEOD_TMS'
  | 'TMW_TMS'
  | 'PROJECT44_TMS'
  | ...;

// AFTER: Simple string (backend validates)
export type IntegrationVendor = string;
```

### Change 2: Add Vendor Metadata Types

```typescript
// Match backend structure
export interface VendorMetadata {
  id: string;
  displayName: string;
  description: string;
  integrationType: IntegrationType;
  credentialFields: CredentialField[];
  helpUrl?: string;
  logoUrl?: string;
}

export interface CredentialField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'number';
  required: boolean;
  helpText?: string;
  placeholder?: string;
}

export async function getVendorRegistry(): Promise<VendorMetadata[]> {
  return apiClient<VendorMetadata[]>('/integrations/vendors', { method: 'GET' });
}
```

### Change 3: Remove Hardcoded Mappings

**DELETE these functions entirely:**
- `getVendorLabel()`
- `getVendorDescription()`
- All `Record<IntegrationVendor, string>` objects in `ConfigureIntegrationForm`

### Change 4: Dynamic UI Rendering

**ConfigureIntegrationForm.tsx:**

```typescript
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select"

function ConfigureIntegrationForm() {
  const [vendors, setVendors] = useState<VendorMetadata[]>([]);

  // Fetch vendors on mount
  useEffect(() => {
    getVendorRegistry().then(setVendors);
  }, []);

  // Filter by selected integration type
  const availableVendors = vendors.filter(
    v => !integrationType || v.integrationType === integrationType
  );

  // Get selected vendor metadata
  const selectedVendorMeta = vendors.find(v => v.id === vendor);

  return (
    <Card>
      <CardContent>
        {/* Vendor Selection */}
        <Select value={vendor} onValueChange={setVendor}>
          <SelectTrigger>
            <SelectValue placeholder="Choose integration vendor" />
          </SelectTrigger>
          <SelectContent>
            {availableVendors.map(v => (
              <SelectItem key={v.id} value={v.id}>
                {v.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Dynamic Credential Fields */}
        {selectedVendorMeta?.credentialFields.map(field => (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.name}
              name={field.name}
              type={field.type}
              placeholder={field.placeholder}
              required={field.required}
              className="bg-background text-foreground border-border"
            />
            {field.helpText && (
              <p className="text-sm text-muted-foreground">{field.helpText}</p>
            )}
          </div>
        ))}

        {selectedVendorMeta?.helpUrl && (
          <a
            href={selectedVendorMeta.helpUrl}
            target="_blank"
            className="text-sm text-primary hover:underline"
          >
            View {selectedVendorMeta.displayName} documentation →
          </a>
        )}
      </CardContent>
    </Card>
  );
}
```

**Shadcn UI Compliance:**
- ✅ Uses `<Input>`, `<Label>`, `<Button>`, `<Select>` from Shadcn
- ✅ Semantic color tokens (`text-muted-foreground`, `border-border`)
- ✅ Dark theme support (built into Shadcn components)

---

## Migration Strategy

### Phase 1: Backend Setup (Day 1)
1. Create `vendor-registry.ts` with all 9 vendors:
   - PROJECT44_TMS, SAMSARA_ELD, MCLEOD_TMS, TMW_TMS
   - KEEPTRUCKIN_ELD, MOTIVE_ELD
   - GASBUDDY_FUEL, FUELFINDER_FUEL, OPENWEATHER
2. Add `GET /integrations/vendors` endpoint
3. Add validation logic in `create()` method
4. Keep existing Prisma enum (no DB changes)
5. Deploy backend

**Backward Compatible:** Existing frontend continues working.

### Phase 2: Frontend Migration (Day 1-2)
1. Add vendor metadata types
2. Add `getVendorRegistry()` API function
3. Update `ConfigureIntegrationForm` to fetch + render dynamically
4. Remove hardcoded vendor mappings (`getVendorLabel`, etc.)
5. Test creating integrations with new UI
6. Deploy frontend

### Phase 3: Cleanup (Day 2)
1. Verify all hardcoded vendor references removed
2. Update documentation
3. Test end-to-end integration creation

**Rollback Safety:**
- Backend endpoint is additive (doesn't break old frontend)
- Can deploy backend first, test `/integrations/vendors` manually
- Frontend changes isolated to Settings page
- Existing integrations continue working (no data migration)

---

## Benefits

### Short-Term
✅ Fixes TRUCKBASE sync issue (can't happen again)
✅ Single source of truth for vendor metadata
✅ Add new vendor = edit one file
✅ No new dependencies
✅ Ships in 1-2 days

### Long-Term
✅ Frontend becomes dumb renderer
✅ Can add vendor logos, icons, additional metadata easily
✅ Foundation for future enhancements (vendor enable/disable per tenant)
✅ Consistent UX as more vendors added

---

## Future Enhancements (Not in Scope)

- Database-backed vendor registry (if need per-tenant vendor control)
- Complex credential validation (regex patterns, OAuth flows)
- Auto-generated forms from Zod/JSON schemas
- Vendor marketplace UI with logos/screenshots
- Customer-built custom integrations (extensibility platform)

---

## UX Enhancement: Quick Test from Integration List

**Requirement:** Users can test connection directly from integration list page without opening configure dialog.

**Implementation:**

```typescript
// Integration Card Component
<Card>
  <CardHeader className="flex flex-row items-center justify-between">
    <div>
      <CardTitle>{vendorMeta?.displayName || integration.vendor}</CardTitle>
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
      <Button variant="outline" size="sm" onClick={() => handleEdit(integration.id)}>
        Edit
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleTestConnection(integration.id)}
        disabled={isTestingConnection}
      >
        {isTestingConnection ? 'Testing...' : 'Test Connection'}
      </Button>
      <Button variant="destructive" size="sm" onClick={() => handleDelete(integration.id)}>
        Delete
      </Button>
    </div>
  </CardContent>
</Card>
```

**Test Connection Flow:**
1. User clicks "Test Connection" on integration card
2. Button shows loading state ("Testing...")
3. Calls existing `POST /integrations/{id}/test` endpoint
4. Shows toast notification with result:
   - Success: "✅ {VendorName} connection successful"
   - Error: "❌ Connection failed: {error message}"
5. Updates integration status badge if needed

**Benefits:**
- No need to open configure dialog for quick connection test
- Immediate feedback via toast notification
- Existing backend endpoint already supports this

---

## Success Criteria

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

## Related Documents

- `.specs/features/03-integrations/STRATEGY.md` - Original integration architecture strategy
- `docs/plans/2026-02-03-tms-eld-integration.md` - TMS/ELD integration implementation plan
- `CLAUDE.md` - UI development standards (Shadcn, dark theme, responsive)
