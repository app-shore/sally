# Reference Data Service — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a database-backed reference data service under `platform/` that replaces all hardcoded lookup arrays (equipment types, vehicle statuses, US states) in the UI with API-driven data.

**Architecture:** Prisma `ReferenceData` model with `(category, code)` unique key. NestJS service with in-memory cache, single GET endpoint. Frontend React Query hook consumed by fleet and loads pages. Prisma enums remain for DB constraint — reference data adds display metadata.

**Tech Stack:** Prisma 7.3, NestJS 11, React Query, Shadcn/ui

**Design doc:** `.docs/plans/2026-02-13-reference-data-service-design.md`

---

## Task 1: Add ReferenceData Prisma Model and Migration

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`

**Step 1: Add the ReferenceData model**

Add this model after the existing enums, before the `Vehicle` model block (around line 375):

```prisma
model ReferenceData {
  id        Int      @id @default(autoincrement())
  category  String   @db.VarChar(50)
  code      String   @db.VarChar(50)
  label     String   @db.VarChar(100)
  sortOrder Int      @default(0) @map("sort_order")
  isActive  Boolean  @default(true) @map("is_active")
  metadata  Json?
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([category, code])
  @@index([category, isActive])
  @@map("reference_data")
}
```

**Step 2: Create migration**

Create directory and SQL file:

```bash
mkdir -p apps/backend/prisma/migrations/20260213140000_add_reference_data_table
```

Write the migration SQL:

```sql
-- CreateTable
CREATE TABLE "reference_data" (
  "id" SERIAL NOT NULL,
  "category" VARCHAR(50) NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "label" VARCHAR(100) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reference_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reference_data_category_code_key" ON "reference_data"("category", "code");

-- CreateIndex
CREATE INDEX "reference_data_category_is_active_idx" ON "reference_data"("category", "is_active");
```

**Step 3: Generate Prisma client**

```bash
cd apps/backend && npx prisma generate
```

**Step 4: Commit**

```bash
git add apps/backend/prisma/
git commit -m "feat(schema): add ReferenceData model for lookup data"
```

---

## Task 2: Create Reference Data Seed File

**Files:**
- Create: `apps/backend/prisma/seeds/05-reference-data.seed.ts`

**Step 1: Write the seed file**

Follow the existing seed pattern from `01-super-admin.seed.ts`. The seed should upsert (not fail on re-run) all reference data entries for 4 categories: `equipment_type`, `vehicle_status`, `us_state`, `driver_status`.

```typescript
import { PrismaClient } from '@prisma/client';

const REFERENCE_DATA = [
  // Equipment Types
  { category: 'equipment_type', code: 'DRY_VAN', label: 'Dry Van', sortOrder: 1, metadata: {} },
  { category: 'equipment_type', code: 'FLATBED', label: 'Flatbed', sortOrder: 2, metadata: {} },
  { category: 'equipment_type', code: 'REEFER', label: 'Reefer', sortOrder: 3, metadata: {} },
  { category: 'equipment_type', code: 'STEP_DECK', label: 'Step Deck', sortOrder: 4, metadata: {} },
  { category: 'equipment_type', code: 'POWER_ONLY', label: 'Power Only', sortOrder: 5, metadata: {} },
  { category: 'equipment_type', code: 'OTHER', label: 'Other', sortOrder: 6, metadata: {} },

  // Vehicle Statuses
  { category: 'vehicle_status', code: 'AVAILABLE', label: 'Available', sortOrder: 1, metadata: { color: 'green', badgeVariant: 'outline' } },
  { category: 'vehicle_status', code: 'ASSIGNED', label: 'Assigned', sortOrder: 2, metadata: { color: 'blue', badgeVariant: 'filled' } },
  { category: 'vehicle_status', code: 'IN_SHOP', label: 'In Shop', sortOrder: 3, metadata: { color: 'amber', badgeVariant: 'outline' } },
  { category: 'vehicle_status', code: 'OUT_OF_SERVICE', label: 'Out of Service', sortOrder: 4, metadata: { color: 'red', badgeVariant: 'outline' } },

  // Driver Statuses
  { category: 'driver_status', code: 'PENDING_ACTIVATION', label: 'Pending Activation', sortOrder: 1, metadata: { color: 'amber' } },
  { category: 'driver_status', code: 'ACTIVE', label: 'Active', sortOrder: 2, metadata: { color: 'green' } },
  { category: 'driver_status', code: 'INACTIVE', label: 'Inactive', sortOrder: 3, metadata: { color: 'gray' } },
  { category: 'driver_status', code: 'SUSPENDED', label: 'Suspended', sortOrder: 4, metadata: { color: 'red' } },

  // US States
  { category: 'us_state', code: 'AL', label: 'Alabama', sortOrder: 1, metadata: {} },
  { category: 'us_state', code: 'AK', label: 'Alaska', sortOrder: 2, metadata: {} },
  { category: 'us_state', code: 'AZ', label: 'Arizona', sortOrder: 3, metadata: {} },
  { category: 'us_state', code: 'AR', label: 'Arkansas', sortOrder: 4, metadata: {} },
  { category: 'us_state', code: 'CA', label: 'California', sortOrder: 5, metadata: {} },
  { category: 'us_state', code: 'CO', label: 'Colorado', sortOrder: 6, metadata: {} },
  { category: 'us_state', code: 'CT', label: 'Connecticut', sortOrder: 7, metadata: {} },
  { category: 'us_state', code: 'DE', label: 'Delaware', sortOrder: 8, metadata: {} },
  { category: 'us_state', code: 'FL', label: 'Florida', sortOrder: 9, metadata: {} },
  { category: 'us_state', code: 'GA', label: 'Georgia', sortOrder: 10, metadata: {} },
  { category: 'us_state', code: 'HI', label: 'Hawaii', sortOrder: 11, metadata: {} },
  { category: 'us_state', code: 'ID', label: 'Idaho', sortOrder: 12, metadata: {} },
  { category: 'us_state', code: 'IL', label: 'Illinois', sortOrder: 13, metadata: {} },
  { category: 'us_state', code: 'IN', label: 'Indiana', sortOrder: 14, metadata: {} },
  { category: 'us_state', code: 'IA', label: 'Iowa', sortOrder: 15, metadata: {} },
  { category: 'us_state', code: 'KS', label: 'Kansas', sortOrder: 16, metadata: {} },
  { category: 'us_state', code: 'KY', label: 'Kentucky', sortOrder: 17, metadata: {} },
  { category: 'us_state', code: 'LA', label: 'Louisiana', sortOrder: 18, metadata: {} },
  { category: 'us_state', code: 'ME', label: 'Maine', sortOrder: 19, metadata: {} },
  { category: 'us_state', code: 'MD', label: 'Maryland', sortOrder: 20, metadata: {} },
  { category: 'us_state', code: 'MA', label: 'Massachusetts', sortOrder: 21, metadata: {} },
  { category: 'us_state', code: 'MI', label: 'Michigan', sortOrder: 22, metadata: {} },
  { category: 'us_state', code: 'MN', label: 'Minnesota', sortOrder: 23, metadata: {} },
  { category: 'us_state', code: 'MS', label: 'Mississippi', sortOrder: 24, metadata: {} },
  { category: 'us_state', code: 'MO', label: 'Missouri', sortOrder: 25, metadata: {} },
  { category: 'us_state', code: 'MT', label: 'Montana', sortOrder: 26, metadata: {} },
  { category: 'us_state', code: 'NE', label: 'Nebraska', sortOrder: 27, metadata: {} },
  { category: 'us_state', code: 'NV', label: 'Nevada', sortOrder: 28, metadata: {} },
  { category: 'us_state', code: 'NH', label: 'New Hampshire', sortOrder: 29, metadata: {} },
  { category: 'us_state', code: 'NJ', label: 'New Jersey', sortOrder: 30, metadata: {} },
  { category: 'us_state', code: 'NM', label: 'New Mexico', sortOrder: 31, metadata: {} },
  { category: 'us_state', code: 'NY', label: 'New York', sortOrder: 32, metadata: {} },
  { category: 'us_state', code: 'NC', label: 'North Carolina', sortOrder: 33, metadata: {} },
  { category: 'us_state', code: 'ND', label: 'North Dakota', sortOrder: 34, metadata: {} },
  { category: 'us_state', code: 'OH', label: 'Ohio', sortOrder: 35, metadata: {} },
  { category: 'us_state', code: 'OK', label: 'Oklahoma', sortOrder: 36, metadata: {} },
  { category: 'us_state', code: 'OR', label: 'Oregon', sortOrder: 37, metadata: {} },
  { category: 'us_state', code: 'PA', label: 'Pennsylvania', sortOrder: 38, metadata: {} },
  { category: 'us_state', code: 'RI', label: 'Rhode Island', sortOrder: 39, metadata: {} },
  { category: 'us_state', code: 'SC', label: 'South Carolina', sortOrder: 40, metadata: {} },
  { category: 'us_state', code: 'SD', label: 'South Dakota', sortOrder: 41, metadata: {} },
  { category: 'us_state', code: 'TN', label: 'Tennessee', sortOrder: 42, metadata: {} },
  { category: 'us_state', code: 'TX', label: 'Texas', sortOrder: 43, metadata: {} },
  { category: 'us_state', code: 'UT', label: 'Utah', sortOrder: 44, metadata: {} },
  { category: 'us_state', code: 'VT', label: 'Vermont', sortOrder: 45, metadata: {} },
  { category: 'us_state', code: 'VA', label: 'Virginia', sortOrder: 46, metadata: {} },
  { category: 'us_state', code: 'WA', label: 'Washington', sortOrder: 47, metadata: {} },
  { category: 'us_state', code: 'WV', label: 'West Virginia', sortOrder: 48, metadata: {} },
  { category: 'us_state', code: 'WI', label: 'Wisconsin', sortOrder: 49, metadata: {} },
  { category: 'us_state', code: 'WY', label: 'Wyoming', sortOrder: 50, metadata: {} },
];

export const seed = {
  name: 'Reference Data',
  description: 'Seeds reference data lookup values (equipment types, statuses, US states)',

  async run(prisma: PrismaClient): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const item of REFERENCE_DATA) {
      const existing = await prisma.referenceData.findUnique({
        where: {
          category_code: {
            category: item.category,
            code: item.code,
          },
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.referenceData.create({
        data: {
          category: item.category,
          code: item.code,
          label: item.label,
          sortOrder: item.sortOrder,
          metadata: item.metadata,
        },
      });
      created++;
    }

    return { created, skipped };
  },
};
```

**Step 2: Register seed in seed runner**

Check the seed runner file (likely `apps/backend/prisma/seed.ts`) and add `05-reference-data.seed.ts` to the imports/execution list. Follow the same pattern as existing seeds.

**Step 3: Commit**

```bash
git add apps/backend/prisma/seeds/05-reference-data.seed.ts apps/backend/prisma/seed.ts
git commit -m "feat(reference-data): add seed file for equipment types, statuses, US states"
```

---

## Task 3: Create Backend Reference Data Module

**Files:**
- Create: `apps/backend/src/domains/platform/reference-data/reference-data.module.ts`
- Create: `apps/backend/src/domains/platform/reference-data/reference-data.service.ts`
- Create: `apps/backend/src/domains/platform/reference-data/reference-data.controller.ts`
- Create: `apps/backend/src/domains/platform/reference-data/dto/query-reference-data.dto.ts`
- Modify: `apps/backend/src/domains/platform/platform.module.ts`

**Step 1: Create the DTO**

```typescript
// apps/backend/src/domains/platform/reference-data/dto/query-reference-data.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class QueryReferenceDataDto {
  @ApiProperty({
    example: 'equipment_type,vehicle_status',
    description: 'Comma-separated list of categories to retrieve. Omit for all categories.',
    required: false,
  })
  @IsString()
  @IsOptional()
  category?: string;
}
```

**Step 2: Create the service**

```typescript
// apps/backend/src/domains/platform/reference-data/reference-data.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

interface ReferenceItem {
  code: string;
  label: string;
  sort_order: number;
  metadata: any;
}

type ReferenceDataMap = Record<string, ReferenceItem[]>;

@Injectable()
export class ReferenceDataService {
  private readonly logger = new Logger(ReferenceDataService.name);
  private cache: ReferenceDataMap | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  async getByCategories(categories?: string[]): Promise<ReferenceDataMap> {
    const allData = await this.getAllCached();

    if (!categories || categories.length === 0) {
      return allData;
    }

    const filtered: ReferenceDataMap = {};
    for (const cat of categories) {
      if (allData[cat]) {
        filtered[cat] = allData[cat];
      }
    }
    return filtered;
  }

  private async getAllCached(): Promise<ReferenceDataMap> {
    if (this.cache && Date.now() < this.cacheExpiry) {
      return this.cache;
    }

    this.logger.log('Refreshing reference data cache');

    const rows = await this.prisma.referenceData.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });

    const grouped: ReferenceDataMap = {};
    for (const row of rows) {
      if (!grouped[row.category]) {
        grouped[row.category] = [];
      }
      grouped[row.category].push({
        code: row.code,
        label: row.label,
        sort_order: row.sortOrder,
        metadata: row.metadata || {},
      });
    }

    this.cache = grouped;
    this.cacheExpiry = Date.now() + this.CACHE_TTL_MS;

    return grouped;
  }
}
```

**Step 3: Create the controller**

```typescript
// apps/backend/src/domains/platform/reference-data/reference-data.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../../auth/decorators/public.decorator';
import { ReferenceDataService } from './reference-data.service';
import { QueryReferenceDataDto } from './dto/query-reference-data.dto';

@ApiTags('Reference Data')
@Controller('reference-data')
export class ReferenceDataController {
  constructor(private readonly referenceDataService: ReferenceDataService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get reference data by category' })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Comma-separated categories (e.g. equipment_type,vehicle_status)',
  })
  async getReferenceData(@Query() query: QueryReferenceDataDto) {
    const categories = query.category
      ? query.category.split(',').map((c) => c.trim())
      : undefined;
    return this.referenceDataService.getByCategories(categories);
  }
}
```

**Step 4: Create the module**

```typescript
// apps/backend/src/domains/platform/reference-data/reference-data.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { ReferenceDataController } from './reference-data.controller';
import { ReferenceDataService } from './reference-data.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReferenceDataController],
  providers: [ReferenceDataService],
  exports: [ReferenceDataService],
})
export class ReferenceDataModule {}
```

**Step 5: Register in PlatformModule**

In `apps/backend/src/domains/platform/platform.module.ts`, add `ReferenceDataModule` to both `imports` and `exports` arrays:

```typescript
import { ReferenceDataModule } from './reference-data/reference-data.module';

// In @Module decorator:
imports: [
  // ... existing modules
  ReferenceDataModule,
],
exports: [
  // ... existing modules
  ReferenceDataModule,
],
```

**Step 6: Verify backend compiles**

```bash
cd apps/backend && npx tsc --noEmit
```

**Step 7: Commit**

```bash
git add apps/backend/src/domains/platform/reference-data/ apps/backend/src/domains/platform/platform.module.ts
git commit -m "feat(reference-data): add backend module with service, controller, in-memory cache"
```

---

## Task 4: Create Frontend Reference Data Feature

**Files:**
- Create: `apps/web/src/features/platform/reference-data/types.ts`
- Create: `apps/web/src/features/platform/reference-data/api.ts`
- Create: `apps/web/src/features/platform/reference-data/hooks/use-reference-data.ts`
- Create: `apps/web/src/features/platform/reference-data/index.ts`

**Step 1: Create types**

```typescript
// apps/web/src/features/platform/reference-data/types.ts
export interface ReferenceItem {
  code: string;
  label: string;
  sort_order: number;
  metadata: Record<string, any>;
}

export type ReferenceDataMap = Record<string, ReferenceItem[]>;
```

**Step 2: Create API**

```typescript
// apps/web/src/features/platform/reference-data/api.ts
import { apiClient } from '@/shared/lib/api';
import type { ReferenceDataMap } from './types';

export const referenceDataApi = {
  get: async (categories?: string[]): Promise<ReferenceDataMap> => {
    const params = categories?.length
      ? `?category=${categories.join(',')}`
      : '';
    return apiClient<ReferenceDataMap>(`/reference-data${params}`);
  },
};
```

**Step 3: Create React Query hook**

```typescript
// apps/web/src/features/platform/reference-data/hooks/use-reference-data.ts
import { useQuery } from '@tanstack/react-query';
import { referenceDataApi } from '../api';
import type { ReferenceDataMap } from '../types';

const REFERENCE_DATA_KEY = ['reference-data'] as const;

export function useReferenceData(categories?: string | string[]) {
  const categoryList = categories
    ? Array.isArray(categories)
      ? categories
      : [categories]
    : undefined;

  return useQuery<ReferenceDataMap>({
    queryKey: [...REFERENCE_DATA_KEY, categoryList?.sort().join(',') ?? 'all'],
    queryFn: () => referenceDataApi.get(categoryList),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

**Step 4: Create barrel export**

```typescript
// apps/web/src/features/platform/reference-data/index.ts
export { referenceDataApi } from './api';
export { useReferenceData } from './hooks/use-reference-data';
export type { ReferenceItem, ReferenceDataMap } from './types';
```

**Step 5: Verify frontend compiles**

```bash
cd apps/web && npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add apps/web/src/features/platform/reference-data/
git commit -m "feat(reference-data): add frontend API, types, and useReferenceData hook"
```

---

## Task 5: Update Fleet Page — Replace Hardcoded Data with Reference Data

**Files:**
- Modify: `apps/web/src/app/dispatcher/fleet/page.tsx`

**Step 1: Add import for useReferenceData**

Add at the top of the file with other imports:

```typescript
import { useReferenceData } from '@/features/platform/reference-data';
```

**Step 2: Load reference data in FleetPage component**

Inside the `FleetPage` component function (around line 59), add the hook call near the other state declarations:

```typescript
const { data: refData } = useReferenceData(['equipment_type', 'vehicle_status', 'us_state']);
```

**Step 3: Pass refData to VehicleForm**

Find where `<VehicleForm` is rendered (inside the Dialog). Add a `refData` prop:

```tsx
<VehicleForm
  vehicle={editVehicle}
  onSuccess={...}
  onCancel={...}
  refData={refData}
/>
```

**Step 4: Update VehicleForm to accept and use refData**

Update the VehicleForm props type:

```typescript
function VehicleForm({
  vehicle,
  onSuccess,
  onCancel,
  refData,
}: {
  vehicle: Vehicle | null;
  onSuccess: () => void;
  onCancel: () => void;
  refData?: Record<string, { code: string; label: string; sort_order: number; metadata: Record<string, any> }[]>;
}) {
```

Replace the hardcoded `equipmentTypes` array with:

```typescript
const equipmentTypes = refData?.equipment_type?.map((item) => ({
  value: item.code,
  label: item.label,
})) || [
  { value: 'DRY_VAN', label: 'Dry Van' },
  { value: 'FLATBED', label: 'Flatbed' },
  { value: 'REEFER', label: 'Reefer' },
  { value: 'STEP_DECK', label: 'Step Deck' },
  { value: 'POWER_ONLY', label: 'Power Only' },
  { value: 'OTHER', label: 'Other' },
];
```

Replace the hardcoded `usStates` array with:

```typescript
const usStates = refData?.us_state?.map((item) => item.code) || [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];
```

The hardcoded arrays serve as fallbacks if the API hasn't loaded yet.

**Step 5: Update VehicleStatusBadge to use refData**

Update the `VehicleStatusBadge` to accept and use reference data for labels. Find the function (around line 1222) and update its signature and lookup:

```typescript
function VehicleStatusBadge({ status, refData }: { status: string; refData?: Record<string, { code: string; label: string; sort_order: number; metadata: Record<string, any> }[]> }) {
  const statusItem = refData?.vehicle_status?.find((item) => item.code === status);
  const label = statusItem?.label || status;
  const color = (statusItem?.metadata as any)?.color;

  const colorClasses: Record<string, string> = {
    green: 'border-green-300 dark:border-green-700 text-green-700 dark:text-green-400',
    blue: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-transparent',
    amber: 'border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400',
    red: 'border-red-300 dark:border-red-700 text-red-700 dark:text-red-400',
  };

  if (color === 'blue') {
    return <Badge className={colorClasses[color]}>{label}</Badge>;
  }

  return (
    <Badge variant="outline" className={colorClasses[color] || ''}>
      {label}
    </Badge>
  );
}
```

Update all `<VehicleStatusBadge` usages in the table to pass `refData`:

```tsx
<VehicleStatusBadge status={vehicle.status} refData={refData} />
```

**Step 6: Update formatEquipmentType to use refData**

Replace the `formatEquipmentType` function (around line 1253) to accept refData:

```typescript
function formatEquipmentType(type: string, refData?: Record<string, { code: string; label: string; sort_order: number; metadata: Record<string, any> }[]>): string {
  const item = refData?.equipment_type?.find((item) => item.code === type);
  if (item) return item.label;
  const labels: Record<string, string> = {
    DRY_VAN: 'Dry Van',
    FLATBED: 'Flatbed',
    REEFER: 'Reefer',
    STEP_DECK: 'Step Deck',
    POWER_ONLY: 'Power Only',
    OTHER: 'Other',
  };
  return labels[type] || type;
}
```

Update all `{formatEquipmentType(vehicle.equipment_type)}` calls in the table to pass refData:

```tsx
{formatEquipmentType(vehicle.equipment_type, refData)}
```

**Step 7: Verify frontend compiles**

```bash
cd apps/web && npx tsc --noEmit
```

**Step 8: Commit**

```bash
git add apps/web/src/app/dispatcher/fleet/page.tsx
git commit -m "feat(vehicles): replace hardcoded lookups with reference data API in fleet page"
```

---

## Task 6: Update Loads Page — Replace Hardcoded Data

**Files:**
- Modify: `apps/web/src/app/dispatcher/loads/page.tsx`

**Step 1: Add import**

```typescript
import { useReferenceData } from '@/features/platform/reference-data';
```

**Step 2: Add hook in LoadsPage component**

Inside the main component, add:

```typescript
const { data: refData } = useReferenceData(['equipment_type', 'us_state']);
```

**Step 3: Replace hardcoded US_STATES**

Find the `US_STATES` constant (line 872) and replace with data from the hook. Pass `refData` into the `NewLoadForm` component as a prop, then inside the form replace:

```typescript
const usStates = refData?.us_state?.map((item) => item.code) || US_STATES;
```

Keep the `US_STATES` constant as a fallback but primary source becomes API.

**Step 4: Replace hardcoded equipment type `<SelectItem>` entries**

Find the equipment type `<SelectContent>` (around line 1089-1093) and replace with:

```tsx
<SelectContent>
  {(refData?.equipment_type || [
    { code: 'dry_van', label: 'Dry Van' },
    { code: 'reefer', label: 'Reefer' },
    { code: 'flatbed', label: 'Flatbed' },
    { code: 'step_deck', label: 'Step Deck' },
  ]).map((type) => (
    <SelectItem key={type.code} value={type.code.toLowerCase()}>
      {type.label}
    </SelectItem>
  ))}
</SelectContent>
```

Note: Loads page uses lowercase equipment type codes (`dry_van` vs `DRY_VAN`). The `.toLowerCase()` bridges this until load types are standardized.

**Step 5: Verify frontend compiles**

```bash
cd apps/web && npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add apps/web/src/app/dispatcher/loads/page.tsx
git commit -m "feat(loads): replace hardcoded US states and equipment types with reference data API"
```

---

## Task 7: Final Verification

**Step 1: Run full TypeScript compilation**

```bash
cd apps/web && npx tsc --noEmit
cd apps/backend && npx tsc --noEmit
```

Expected: No new errors (pre-existing integration test errors are acceptable).

**Step 2: Run backend tests**

```bash
cd apps/backend && npx jest --passWithNoTests
```

**Step 3: Commit any remaining fixes**

```bash
git add -A
git commit -m "feat(reference-data): complete reference data service integration"
```

**Step 4: Push and update PR**

```bash
git push
```
